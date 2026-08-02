/** Stewi's shared contract — kept free of React and of any network code, the
 *  same way parse.ts (which this replaces) worked, so the Worker can import it
 *  verbatim and it can be unit-tested here.
 *
 *  The Worker never touches the database and never executes a tool itself —
 *  it only makes one Claude call per turn and hands back whatever content
 *  blocks come out. All of Manna's data already lives in the browser (the
 *  store hooks), so tool *execution* happens client-side regardless of what
 *  Claude asks for:
 *
 *  - Read tools (`isReadTool` true) are answered immediately by `runReadTool`
 *    against data already loaded — no user interaction, nothing written.
 *  - Write tools ("propose_*") are never auto-executed. `sanitizeProposedAction`
 *    turns the model's raw arguments into a `ProposedAction` the UI can show
 *    and, only on a tap, actually carry out — the same "never trust the
 *    model's ids" discipline `sanitizeDraft` used to have, generalised to
 *    every action kind Stewi can propose.
 */
import type { AddDraft } from "./parse";
import {
  allotmentProgress,
  debtBalance,
  findCategory,
  monthLabel,
  monthKey as monthKeyOf,
  monthSummary,
  monthlyHistory,
  paceVsAverage,
  parentBreakdown,
  parentCategories,
  recurringForMonth,
  subcategoriesOf,
  totalBalance,
  UNCATEGORISED,
  walletBalances,
  type Allotment,
  type Category,
  type Debt,
  type Recurring,
  type RecurringSkip,
  type Txn,
  type TxnKind,
  type Wallet,
} from "./money";

export type { AddDraft };

/* ── Wire types ──────────────────────────────────────────────────────────────
   A small, hand-rolled subset of the Anthropic Messages API shape rather than
   importing the SDK's own types: this file is imported by the Vite client
   bundle as well as the Worker, and the SDK is a Worker-only dependency. The
   Worker maps its real `Anthropic.Messages.ContentBlock`s onto these at the
   boundary (see worker/index.ts). */

export interface StewiTextBlock {
  type: "text";
  text: string;
}

export interface StewiToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StewiToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type StewiContentBlock = StewiTextBlock | StewiToolUseBlock | StewiToolResultBlock;

export interface StewiMessage {
  role: "user" | "assistant";
  content: string | StewiContentBlock[];
  /** Client-side rendering hint only — never part of what the Worker/Claude
   *  sees (stripped before the API call). "note" is a small inline caption
   *  rather than a chat bubble, used for the synthetic message recording what
   *  happened to a proposal once it's resolved. */
  display?: "bubble" | "note";
}

export interface StewiRequest {
  messages: StewiMessage[];
  categories: Category[];
  wallets: Wallet[];
  recurring: Recurring[];
  debts: Debt[];
  today?: string;
}

export interface StewiResponse {
  content: StewiContentBlock[];
}

/* ── Tool-execution context ──────────────────────────────────────────────── */

export interface StewiContext {
  categories: Category[];
  wallets: Wallet[];
  txns: Txn[];
  allotments: Allotment[];
  recurring: Recurring[];
  skips: RecurringSkip[];
  debts: Debt[];
  now?: Date;
}

/* ── System prompt ───────────────────────────────────────────────────────── */

function taxonomyFor(categories: Category[], forKind: "expense" | "income"): string {
  return parentCategories(categories, forKind)
    .map((parent) => {
      const subs = subcategoriesOf(categories, parent.id)
        .map((s) => `    - ${s.name} [${s.id}]`)
        .join("\n");
      return `  - ${parent.name} [${parent.id}]${subs ? `\n${subs}` : ""}`;
    })
    .join("\n");
}

/** The system prompt: who Stewi is, the boundary of what it may do ("Plan
 *  shows status, Settings holds the rules" extended to Stewi itself), and the
 *  taxonomy/wallets it must choose ids from — stable per taxonomy, so it
 *  prompt-caches the same way the old single-shot prompt did. */
export function buildStewiSystemPrompt(
  categories: Category[],
  wallets: Wallet[],
  today: string,
): string {
  const walletList = wallets.map((w) => `  - ${w.name} [${w.id}]`).join("\n");
  return `You are Stewi, the assistant inside Manna — a personal stewardship log. The money is Philippine pesos only. Today is ${today}.

You help with everyday ledger actions: logging expenses, income, and transfers; editing or deleting an existing transaction; approving or skipping this month's recurring commitments; logging a payment against a debt; and answering questions about spending. You cannot create or edit categories, wallets, allotments, or recurring templates themselves — those are changed manually in Settings. If asked to do one of those, say plainly that it's a Settings change rather than attempting it.

Use the read tools freely and silently — to answer a question, or to find a transaction's id before proposing a change to it. The user never sees those calls, only your final answer. Every "propose_*" tool only stages an action for review: nothing is ever written until the user confirms it in the app, so propose confidently rather than asking permission first — but ask a short clarifying question instead of guessing when a request is genuinely ambiguous (which of several similar transactions, which wallet).

Expense categories:
${taxonomyFor(categories, "expense")}

Income categories:
${taxonomyFor(categories, "income")}

Wallets:
${walletList}

Rules:
- Merchants, shops, and brand names are NEVER categories — "Jollibee", "SM", "Grab" belong in a transaction's note; the category is the kind of spending.
- A transfer (including a debt payment) is never spending and takes no category.
- Amounts are integer centavos: "200 pesos" is 20000, "1,250.50" is 125050.`;
}

/* ── Tools ────────────────────────────────────────────────────────────────── */

interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const READ_TOOLS: ToolDef[] = [
  {
    name: "get_overview",
    description:
      "Spendable total across wallets, this month's income/expense/net, and pace vs the 5-month average. The right default for open-ended questions like \"how am I doing\".",
    input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] },
  },
  {
    name: "get_category_breakdown",
    description: "Spending by category (parent + subcategory) for one month.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        monthsAgo: {
          type: "integer",
          minimum: 0,
          description: "0 = this month, 1 = last month, etc. Defaults to 0.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_allotment_status",
    description: "Every allotment's progress this month — ceilings (spending caps) and floors (like Giving).",
    input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] },
  },
  {
    name: "get_recurring_status",
    description: "This month's recurring commitments and whether each is waiting, approved, or skipped.",
    input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] },
  },
  {
    name: "get_debts",
    description: "Every debt or loan, both directions, with balance paid/owed.",
    input_schema: { type: "object", additionalProperties: false, properties: {}, required: [] },
  },
  {
    name: "search_transactions",
    description:
      "Find transactions by free-text (matched against note, category, and wallet names), kind, and/or date range. Use this to look up a transaction before proposing an edit or delete, or to answer a question needing line-level detail.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string", description: "Free text to match against note/category/wallet." },
        kind: { type: "string", enum: ["expense", "income", "transfer"] },
        since: { type: "string", description: "ISO date, inclusive." },
        until: { type: "string", description: "ISO date, inclusive." },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "Defaults to 10." },
      },
      required: [],
    },
  },
];

const READ_TOOL_NAMES = new Set(READ_TOOLS.map((t) => t.name));

export function isReadTool(name: string): boolean {
  return READ_TOOL_NAMES.has(name);
}

/** Write tools, built fresh each call so category/wallet/recurring/debt ids
 *  are pinned to enums off the live lists — the same "the model can only
 *  return an id that exists" trick `buildDraftSchema` used, extended to every
 *  proposal type. */
function buildWriteTools(ctx: Pick<StewiContext, "categories" | "wallets" | "recurring" | "debts">): ToolDef[] {
  const categoryIds = ctx.categories.filter((c) => !c.archived).map((c) => c.id);
  const walletIds = ctx.wallets.map((w) => w.id);
  const recurringIds = ctx.recurring.filter((r) => !r.archived).map((r) => r.id);
  const debtIds = ctx.debts.map((d) => d.id);

  return [
    {
      name: "propose_transaction",
      description:
        "Propose logging a new expense, income, or transfer. Never executes by itself — the user reviews and confirms in a sheet before anything is written.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: ["expense", "income", "transfer"] },
          amountCents: { type: "integer", description: "Integer centavos, e.g. 20000 for ₱200." },
          categoryId: { type: "string", enum: categoryIds, description: "Required for expense/income; omit for transfer." },
          walletId: { type: "string", enum: walletIds },
          toWalletId: { type: "string", enum: walletIds, description: "Transfer destination wallet." },
          note: { type: "string" },
        },
        required: ["kind", "amountCents"],
      },
    },
    {
      name: "propose_transaction_edit",
      description:
        "Propose changing an existing transaction's amount, category, wallet, or note. Look it up with search_transactions first if you don't already know its id.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          txnId: { type: "string" },
          amountCents: { type: "integer" },
          categoryId: { type: "string", enum: categoryIds },
          walletId: { type: "string", enum: walletIds },
          toWalletId: { type: "string", enum: walletIds },
          note: { type: "string" },
        },
        required: ["txnId"],
      },
    },
    {
      name: "propose_transaction_delete",
      description:
        "Propose deleting an existing transaction. Look it up with search_transactions first if you don't already know its id.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: { txnId: { type: "string" } },
        required: ["txnId"],
      },
    },
    {
      name: "propose_recurring_approval",
      description:
        "Propose approving this month's occurrence of a recurring commitment, logging it as an expense. The amount can differ from the usual figure, since bills vary.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          recurringId: { type: "string", enum: recurringIds },
          amountCents: { type: "integer", description: "Omit to use the recurring item's usual amount." },
        },
        required: ["recurringId"],
      },
    },
    {
      name: "propose_recurring_skip",
      description: "Propose skipping this month's occurrence of a recurring commitment — nothing gets logged.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: { recurringId: { type: "string", enum: recurringIds } },
        required: ["recurringId"],
      },
    },
    {
      name: "propose_debt_payment",
      description:
        "Propose logging a payment against an existing debt (paying down what you owe, or collecting what you're owed). Omit amountCents to settle the full remaining balance.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          debtId: { type: "string", enum: debtIds },
          amountCents: { type: "integer" },
          walletId: { type: "string", enum: walletIds },
        },
        required: ["debtId", "walletId"],
      },
    },
  ];
}

export function buildStewiTools(
  ctx: Pick<StewiContext, "categories" | "wallets" | "recurring" | "debts">,
): ToolDef[] {
  return [...READ_TOOLS, ...buildWriteTools(ctx)];
}

/* ── Read-tool execution ─────────────────────────────────────────────────── */

/** Six points, same as Home's own pace figure — this month measured against
 *  the five before it. */
const HISTORY_MONTHS = 6;

function monthOffset(now: Date, monthsAgo: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

function getOverview(ctx: StewiContext) {
  const now = ctx.now ?? new Date();
  const spendableCents = totalBalance(walletBalances(ctx.txns, ctx.wallets));
  const month = monthSummary(ctx.txns, now);
  const pace = paceVsAverage(monthlyHistory(ctx.txns, HISTORY_MONTHS, now));
  return {
    spendableCents,
    walletCount: ctx.wallets.length,
    monthIncomeCents: month.income,
    monthExpenseCents: month.expense,
    monthNetCents: month.net,
    pace: pace.hasHistory
      ? { averageCents: pace.average, deltaCents: pace.delta, betterThanAverage: pace.better }
      : null,
  };
}

function getCategoryBreakdown(ctx: StewiContext, args: Record<string, unknown>) {
  const now = ctx.now ?? new Date();
  const monthsAgo = typeof args.monthsAgo === "number" ? Math.max(0, Math.round(args.monthsAgo)) : 0;
  const when = monthOffset(now, monthsAgo);
  const rows = parentBreakdown(ctx.txns, ctx.categories, when);
  return {
    month: monthLabel(monthKeyOf(when)),
    categories: rows.map((r) => ({
      name:
        r.parentId === UNCATEGORISED
          ? "Uncategorised"
          : (findCategory(ctx.categories, r.parentId)?.name ?? "Deleted category"),
      totalCents: r.totalCents,
      subs: r.subs.map((s) => ({
        name: findCategory(ctx.categories, s.categoryId)?.name ?? "—",
        totalCents: s.totalCents,
      })),
    })),
  };
}

function getAllotmentStatus(ctx: StewiContext) {
  const now = ctx.now ?? new Date();
  return {
    allotments: ctx.allotments.map((a) => {
      const p = allotmentProgress(a, ctx.txns, ctx.categories, now);
      return {
        category: findCategory(ctx.categories, a.categoryId)?.name ?? "Deleted category",
        kind: a.kind,
        limitCents: a.limitCents,
        spentCents: p.spentCents,
        pct: p.pct,
        over: p.over,
        met: p.met,
        remainingCents: p.remainingCents,
      };
    }),
  };
}

function getRecurringStatus(ctx: StewiContext) {
  const now = ctx.now ?? new Date();
  const statuses = recurringForMonth(ctx.recurring, ctx.txns, ctx.skips, now);
  return {
    commitments: statuses.map((s) => ({
      name: s.recurring.name,
      amountCents: s.recurring.amountCents,
      state: s.state,
      due: s.due.toISOString().slice(0, 10),
    })),
  };
}

function getDebts(ctx: StewiContext) {
  return {
    debts: ctx.debts.map((d) => {
      const b = debtBalance(d, ctx.txns);
      return {
        person: d.person,
        direction: d.direction,
        principalCents: d.principalCents,
        paidCents: b.paidCents,
        balanceCents: b.balanceCents,
        settled: b.settled,
      };
    }),
  };
}

function searchTransactions(ctx: StewiContext, args: Record<string, unknown>) {
  const query = typeof args.query === "string" ? args.query.toLowerCase().trim() : "";
  const kind = args.kind === "expense" || args.kind === "income" || args.kind === "transfer" ? args.kind : undefined;
  const since = typeof args.since === "string" ? new Date(args.since) : undefined;
  const until = typeof args.until === "string" ? new Date(args.until) : undefined;
  const limit = typeof args.limit === "number" ? Math.min(20, Math.max(1, Math.round(args.limit))) : 10;

  const rows = ctx.txns
    .filter((t) => {
      if (kind && t.kind !== kind) return false;
      if (since && new Date(t.createdAt) < since) return false;
      if (until && new Date(t.createdAt) > until) return false;
      if (query) {
        const category = t.kind !== "transfer" ? (findCategory(ctx.categories, t.categoryId)?.name ?? "") : "";
        const wallet = ctx.wallets.find((w) => w.id === t.walletId)?.name ?? "";
        const haystack = `${t.note} ${category} ${wallet}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .slice(0, limit); // useTxns already sorts newest-first

  return {
    transactions: rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      amountCents: t.amountCents,
      date: t.createdAt.slice(0, 10),
      category: t.kind !== "transfer" ? (findCategory(ctx.categories, t.categoryId)?.name ?? "Uncategorised") : undefined,
      wallet: ctx.wallets.find((w) => w.id === t.walletId)?.name,
      toWallet: t.kind === "transfer" ? ctx.wallets.find((w) => w.id === t.toWalletId)?.name : undefined,
      note: t.note,
    })),
  };
}

/** Runs a read tool and returns its (JSON-serialisable) result, or `undefined`
 *  if `name` isn't a read tool at all. Pure and synchronous — no network,
 *  nothing written, safe to call without asking. */
export function runReadTool(name: string, args: Record<string, unknown>, ctx: StewiContext): unknown {
  switch (name) {
    case "get_overview":
      return getOverview(ctx);
    case "get_category_breakdown":
      return getCategoryBreakdown(ctx, args);
    case "get_allotment_status":
      return getAllotmentStatus(ctx);
    case "get_recurring_status":
      return getRecurringStatus(ctx);
    case "get_debts":
      return getDebts(ctx);
    case "search_transactions":
      return searchTransactions(ctx, args);
    default:
      return undefined;
  }
}

/* ── Proposed actions ─────────────────────────────────────────────────────── */

export type ProposedAction =
  | { type: "create_transaction"; draft: AddDraft }
  | { type: "edit_transaction"; original: Txn; next: Txn }
  | { type: "delete_transaction"; txn: Txn }
  | { type: "approve_recurring"; recurring: Recurring; amountCents: number }
  | { type: "skip_recurring"; recurring: Recurring }
  | { type: "log_debt_payment"; debt: Debt; amountCents: number; walletId: string };

const NOTE_MAX = 60;

function asPositiveInt(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

function asString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Turns one tool call's raw arguments into a `ProposedAction` the UI can show
 *  and act on — or an `error` string when the model's arguments don't resolve
 *  against the live lists (a stale/hallucinated id, a missing wallet), which
 *  becomes a `tool_result` telling Claude what went wrong rather than ever
 *  reaching the UI as something to confirm. Nothing here writes anything. */
export function sanitizeProposedAction(
  name: string,
  args: Record<string, unknown>,
  ctx: StewiContext,
): ProposedAction | { error: string } {
  switch (name) {
    case "propose_transaction": {
      const kind: TxnKind = args.kind === "income" || args.kind === "transfer" ? args.kind : "expense";
      const amountCents = asPositiveInt(args.amountCents);
      if (!amountCents) return { error: "amountCents must be a positive integer number of centavos." };

      const draft: AddDraft = { kind, amountCents };
      const note = asString(args.note);
      if (note) draft.note = note.slice(0, NOTE_MAX);

      const walletId = asString(args.walletId);
      if (walletId && ctx.wallets.some((w) => w.id === walletId)) draft.walletId = walletId;

      if (kind === "transfer") {
        const toWalletId = asString(args.toWalletId);
        if (toWalletId && ctx.wallets.some((w) => w.id === toWalletId) && toWalletId !== draft.walletId) {
          draft.toWalletId = toWalletId;
        }
      } else {
        const categoryId = asString(args.categoryId);
        if (categoryId && findCategory(ctx.categories, categoryId)) draft.categoryId = categoryId;
      }
      return { type: "create_transaction", draft };
    }

    case "propose_transaction_edit": {
      const txnId = asString(args.txnId);
      const original = txnId ? ctx.txns.find((t) => t.id === txnId) : undefined;
      if (!original) {
        return { error: `No transaction with id ${txnId ?? "(missing)"}. Use search_transactions to find it.` };
      }
      const next: Txn = { ...original };
      const amountCents = asPositiveInt(args.amountCents);
      if (amountCents) next.amountCents = amountCents;
      const note = asString(args.note) ?? (args.note === "" ? "" : undefined);
      if (note !== undefined) next.note = note.slice(0, NOTE_MAX);

      const walletId = asString(args.walletId);
      if (walletId && ctx.wallets.some((w) => w.id === walletId)) next.walletId = walletId;

      if (next.kind === "transfer") {
        const toWalletId = asString(args.toWalletId);
        if (toWalletId && ctx.wallets.some((w) => w.id === toWalletId)) next.toWalletId = toWalletId;
      } else {
        const categoryId = asString(args.categoryId);
        if (categoryId && findCategory(ctx.categories, categoryId)) next.categoryId = categoryId;
      }
      return { type: "edit_transaction", original, next };
    }

    case "propose_transaction_delete": {
      const txnId = asString(args.txnId);
      const txn = txnId ? ctx.txns.find((t) => t.id === txnId) : undefined;
      if (!txn) {
        return { error: `No transaction with id ${txnId ?? "(missing)"}. Use search_transactions to find it.` };
      }
      return { type: "delete_transaction", txn };
    }

    case "propose_recurring_approval": {
      const recurringId = asString(args.recurringId);
      const recurring = recurringId ? ctx.recurring.find((r) => r.id === recurringId) : undefined;
      if (!recurring) return { error: `No recurring item with id ${recurringId ?? "(missing)"}.` };
      const amountCents = asPositiveInt(args.amountCents) ?? recurring.amountCents;
      return { type: "approve_recurring", recurring, amountCents };
    }

    case "propose_recurring_skip": {
      const recurringId = asString(args.recurringId);
      const recurring = recurringId ? ctx.recurring.find((r) => r.id === recurringId) : undefined;
      if (!recurring) return { error: `No recurring item with id ${recurringId ?? "(missing)"}.` };
      return { type: "skip_recurring", recurring };
    }

    case "propose_debt_payment": {
      const debtId = asString(args.debtId);
      const debt = debtId ? ctx.debts.find((d) => d.id === debtId) : undefined;
      if (!debt) return { error: `No debt with id ${debtId ?? "(missing)"}.` };
      const walletId = asString(args.walletId);
      if (!walletId || !ctx.wallets.some((w) => w.id === walletId)) {
        return { error: "walletId must be a real wallet id." };
      }
      const balance = debtBalance(debt, ctx.txns).balanceCents;
      const amountCents = asPositiveInt(args.amountCents) ?? balance;
      return { type: "log_debt_payment", debt, amountCents, walletId };
    }

    default:
      return { error: `Unknown tool ${name}.` };
  }
}
