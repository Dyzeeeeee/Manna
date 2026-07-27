/* Every amount in Manna is an integer count of centavos. Pesos as floats would
   drift a centavo at a time through the sums below, and a ledger that doesn't
   add up is worse than no ledger. */

interface BaseTxn {
  id: string; // crypto.randomUUID()
  amountCents: number; // integer centavos — never float pesos
  note: string;
  createdAt: string; // ISO
  /** Set when this transaction is a debt payment or collection rather than
   *  ordinary spending. Declared now (v1) although the Owed screen that reads it
   *  comes later, so adding debts needs no schema migration — CLAUDE.md's build
   *  order asks for exactly this. A debt payment carries a `debtId` and no
   *  category: "Payments are not new objects: they are transactions carrying a
   *  debt_id and no category." */
  debtId?: string;
  /** Set when this transaction came from approving a recurring template. It is
   *  what makes "already settled this month" a fact about the ledger rather
   *  than a flag that can drift from it — delete the transaction and the
   *  commitment goes back to waiting on its own. */
  recurringId?: string;
}

/** Transactions logged before categories and wallets existed have neither, so
 *  both fields are optional — that keeps this a purely additive change. */
interface Categorised {
  walletId?: string;
  categoryId?: string;
}

/** A transfer carries no category, and the union makes that unrepresentable
 *  rather than merely discouraged — moving money between your own wallets isn't
 *  spending, so there is nothing to categorise. `walletId` is the source in all
 *  three kinds; a transfer adds `toWalletId` as the destination.
 *
 *  Expense and income are spelled out separately rather than sharing a
 *  `kind: "expense" | "income"` member: TypeScript only narrows a discriminated
 *  union when each member's discriminant is a single literal. */
export type Txn =
  | (BaseTxn & Categorised & { kind: "expense" })
  | (BaseTxn & Categorised & { kind: "income" })
  | (BaseTxn & { kind: "transfer"; walletId?: string; toWalletId?: string });

export type TxnKind = Txn["kind"];

/** Categories are two levels, never three (CLAUDE.md's first category rule). A
 *  single record models both: a parent has no `parentId`; a subcategory points
 *  at one. Keeping them in one collection means the store's existing
 *  `saveCategory`/`removeCategory` cover the whole tree with no new namespace.
 *
 *  Colour lives on the parent — "Each parent owns a colour. Bars, ticks, and
 *  chips read from it." Subs resolve to their parent's accent rather than
 *  storing their own, so recolouring a parent moves its whole family at once. */
export interface Category {
  id: string;
  name: string;
  for: "expense" | "income";
  /** Absent → this is a parent; present → a subcategory of that parent. */
  parentId?: string;
  /** Parents only. Subs inherit it via `accentOf`. */
  accent?: Accent;
  /** Stable position within its list (parents) or within its parent (subs), so
   *  the order you arranged them in doesn't reshuffle as records sync. */
  order: number;
  /** Archived categories keep every past transaction intact — they just stop
   *  appearing when you log something new (rule 3). */
  archived?: boolean;
  createdAt: string; // ISO
}

export interface Wallet {
  id: string;
  name: string;
  /** What was in it when you added it — without this a balance means nothing
   *  until you've tracked every transaction since the beginning of time. */
  openingCents: number;
  createdAt: string; // ISO
}

/** A commitment that comes round every month: rent, a subscription, the tithe.
 *
 *  Only ever a template. It proposes itself and waits — approving is what
 *  writes a transaction, and the amount stays editable at that moment because
 *  bills vary. Silent monthly deductions are exactly the passivity this app
 *  exists to work against. */
export interface Recurring {
  id: string;
  name: string;
  categoryId?: string;
  walletId?: string;
  /** The usual amount, offered as the default at approval time. */
  amountCents: number;
  /** 1–31, clamped to the length of whatever month it lands in. */
  dayOfMonth: number;
  archived?: boolean;
  createdAt: string;
}

/** Deciding *not* to pay something this month is a real decision, and it has to
 *  survive a reload — otherwise a skipped item comes straight back as waiting.
 *  Keyed `${recurringId}:${monthKey}` so it is naturally one per month. */
export interface RecurringSkip {
  id: string;
  recurringId: string;
  monthKey: string;
  createdAt: string;
}

/** A cap on a category for the month. Giving is the one you set a floor for
 *  instead: at least this much, rather than at most. */
export interface Allotment {
  id: string;
  categoryId: string;
  limitCents: number;
  kind: "ceiling" | "floor";
  createdAt: string;
}

/** Something being weighed, not committed to. The longer it sits, the more
 *  considered the decision — which is the entire point of the list. */
export interface Considering {
  id: string;
  name: string;
  amountCents: number;
  categoryId?: string;
  createdAt: string;
}

/** Money borrowed or lent, in either direction.
 *
 *  There is no stored balance and no stored status: the balance is the
 *  principal minus every transaction carrying this debt's id, so a partial
 *  payment needs no extra code and deleting a payment un-pays it. Same
 *  discipline as recurring approvals — the ledger is the single source of
 *  truth, and nothing can drift out of step with it. */
export interface Debt {
  id: string;
  person: string;
  /** "owe" — you owe them. "owed" — they owe you. */
  direction: "owe" | "owed";
  principalCents: number;
  openedAt: string; // ISO
  dueAt?: string; // ISO, optional
  note: string;
  createdAt: string;
}

/** Where spending with no category lands in the breakdown, so it's visible
 *  rather than silently missing from the month's total. */
export const UNCATEGORISED = "uncategorised";

/* Twelve muted accents, held to the same mid-value family so a column of them
   reads as one palette rather than confetti. Eleven expense parents and four
   income parents each own one; the two lists never share a screen, so twelve is
   enough to give every parent a distinct colour with a little room to spare. */
export const ACCENTS = [
  "sage",
  "clay",
  "ochre",
  "moss",
  "indigo",
  "plum",
  "rust",
  "teal",
  "olive",
  "rose",
  "slate",
  "gold",
] as const;
export type Accent = (typeof ACCENTS)[number];

/** A fallback colour derived from an id, for the one category that has no stored
 *  accent: `UNCATEGORISED`, and any transaction still pointing at a deleted one.
 *  Being a pure function of the id keeps that colour stable with nothing to
 *  sync. Real categories carry their accent on the parent — see `accentOf`. */
export function categoryAccent(id: string): Accent {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

/** The category (parent or sub) with this id, or undefined. */
export function findCategory(
  categories: Category[],
  id: string | undefined,
): Category | undefined {
  return id === undefined ? undefined : categories.find((c) => c.id === id);
}

/** The parent a category belongs to: itself if it is already a parent, or the
 *  parent it points at. Undefined for an unknown or deleted id. */
export function parentOf(categories: Category[], id: string | undefined): Category | undefined {
  const cat = findCategory(categories, id);
  if (!cat) return undefined;
  return cat.parentId ? findCategory(categories, cat.parentId) : cat;
}

/** Any category id resolved to the colour it should show — its parent's stored
 *  accent, falling back to the id-hash for the uncategorised/deleted case. */
export function accentOf(categories: Category[], id: string | undefined): Accent {
  return parentOf(categories, id)?.accent ?? categoryAccent(id ?? UNCATEGORISED);
}

const byOrder = (a: Category, b: Category) =>
  a.order - b.order || a.createdAt.localeCompare(b.createdAt);

/** Live parent categories for one side of the ledger, in their arranged order.
 *  Archived parents drop out so they stop being offered when logging. */
export function parentCategories(
  categories: Category[],
  forKind: "expense" | "income",
): Category[] {
  return categories
    .filter((c) => c.for === forKind && !c.parentId && !c.archived)
    .sort(byOrder);
}

/** Live subcategories under a parent, in order. */
export function subcategoriesOf(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId && !c.archived).sort(byOrder);
}

/** "1,250.50" → 125050 centavos; null when not a positive amount */
export function parseAmount(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/* ── Numpad entry ──────────────────────────────────────────────────────────
   The add sheet types amounts with its own keypad rather than the system
   keyboard, so the digits live here as a string being edited — not a number —
   until `parseAmount` turns it into centavos. Keeping the rules pure is what
   lets them be tested without rendering anything. */

/** How many digits an amount may carry, ignoring the decimal point. Nine is
 *  already ₱9,999,999.99 — past that it's a typo, not an expense. */
const MAX_DIGITS = 9;

/** The entry string after one key. `key` is a digit, "." or "del". Presses that
 *  would break a rule (a third decimal, a tenth digit, a second point) return
 *  the entry untouched, so the display simply doesn't move. */
export function pressKey(entry: string, key: string): string {
  if (key === "del") return entry.slice(0, -1);
  if (key === ".") {
    if (entry === "") return "0.";
    return entry.includes(".") ? entry : `${entry}.`;
  }
  const [, decimals] = entry.split(".");
  if (decimals !== undefined && decimals.length >= 2) return entry;
  // a leading zero is replaced rather than appended to, so "0" then 5 is "5"
  const next = entry === "0" ? key : entry + key;
  return next.replace(".", "").length > MAX_DIGITS ? entry : next;
}

/** The entry string as it should read on screen: thousands separated, the
 *  decimal point kept while it's being typed ("12." stays "12."). */
export function formatEntry(entry: string): string {
  if (entry === "") return "0";
  const [whole, decimals] = entry.split(".");
  const grouped = Number(whole || 0).toLocaleString("en-US");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

/** The inverse of `parseAmount`: centavos back to the keypad entry string —
 *  20050 → "200.50", 20000 → "200". Lets a pre-filled draft (e.g. from
 *  natural-language capture) seed the numpad so editing picks up exactly where
 *  the parsed figure left off. Non-positive input yields an empty entry. */
export function centsToEntry(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatMoney(cents: number): string {
  return php.format(cents / 100);
}

/** Year and month only — the key months are grouped and compared by. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    ? d.toLocaleString("en", { month: "long" })
    : d.toLocaleString("en", { month: "long", year: "numeric" });
}

/** Steps a month key by whole months. Built on a Date so year boundaries and
 *  month lengths are the platform's problem, not ours. */
export function shiftMonth(key: string, by: number): string {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + by, 1));
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  const x = typeof a === "string" ? new Date(a) : a;
  const y = typeof b === "string" ? new Date(b) : b;
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/** What the list is narrowed to. "all" keeps transfers; the other two don't,
 *  because a transfer is neither money in nor money out. */
export type KindFilter = "all" | "income" | "expense";

export function filterByKind(txns: Txn[], filter: KindFilter): Txn[] {
  return filter === "all" ? txns : txns.filter((t) => t.kind === filter);
}

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

/** Totals for one calendar month, in centavos.
 *
 *  Transfers are excluded on purpose: moving ₱2,000 from cash to a bank account
 *  is not ₱2,000 earned and ₱2,000 spent, and counting it as both would inflate
 *  every month you happened to move money. */
export function monthSummary(txns: Txn[], when: Date | string = new Date()): MonthSummary {
  const key = monthKey(when);
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (monthKey(t.createdAt) !== key) continue;
    if (t.kind === "income") income += t.amountCents;
    else if (t.kind === "expense") expense += t.amountCents;
  }
  return { income, expense, net: income - expense };
}

export interface CategoryTotal {
  categoryId: string;
  totalCents: number;
}

/** Spend per category for one month, largest first. Income and transfers are
 *  both left out — this answers "where did the money go". */
export function categoryBreakdown(
  txns: Txn[],
  when: Date | string = new Date(),
): CategoryTotal[] {
  const key = monthKey(when);
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.kind !== "expense" || monthKey(t.createdAt) !== key) continue;
    const id = t.categoryId ?? UNCATEGORISED;
    totals.set(id, (totals.get(id) ?? 0) + t.amountCents);
  }
  return [...totals.entries()]
    .map(([categoryId, totalCents]) => ({ categoryId, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents || a.categoryId.localeCompare(b.categoryId));
}

export interface ParentTotal {
  /** The parent category id, or `UNCATEGORISED` for spend with no category. */
  parentId: string;
  totalCents: number;
  /** The category rows that rolled up into this parent, largest first. A row
   *  logged straight to a bare parent has `categoryId === parentId`. */
  subs: CategoryTotal[];
}

/** Month spend rolled up to parents and ranked, each parent carrying its own
 *  subcategory breakdown — the shape the Month view draws. Built on
 *  `categoryBreakdown` so the "leave out income and transfers" rule lives in one
 *  place. A subcategory whose parent was deleted collapses into `UNCATEGORISED`
 *  rather than vanishing. */
export function parentBreakdown(
  txns: Txn[],
  categories: Category[],
  when: Date | string = new Date(),
): ParentTotal[] {
  const groups = new Map<string, { total: number; subs: CategoryTotal[] }>();
  for (const row of categoryBreakdown(txns, when)) {
    const parentId = parentOf(categories, row.categoryId)?.id ?? UNCATEGORISED;
    const group = groups.get(parentId) ?? { total: 0, subs: [] };
    group.total += row.totalCents;
    group.subs.push(row);
    groups.set(parentId, group);
  }
  return [...groups.entries()]
    .map(([parentId, group]) => ({
      parentId,
      totalCents: group.total,
      subs: group.subs.sort((a, b) => b.totalCents - a.totalCents),
    }))
    .sort((a, b) => b.totalCents - a.totalCents || a.parentId.localeCompare(b.parentId));
}

/** Current balance per wallet id: opening + income − expense, plus transfers in
 *  and out. A transfer touches two wallets and nets to zero across the whole
 *  ledger, which is what keeps the grand total honest. */
export function walletBalances(txns: Txn[], wallets: Wallet[]): Map<string, number> {
  const balances = new Map(wallets.map((w) => [w.id, w.openingCents]));

  const move = (id: string | undefined, delta: number) => {
    if (id === undefined || !balances.has(id)) return; // a deleted wallet's history stays out of the totals
    balances.set(id, balances.get(id)! + delta);
  };

  for (const t of txns) {
    if (t.kind === "income") move(t.walletId, t.amountCents);
    else if (t.kind === "expense") move(t.walletId, -t.amountCents);
    else {
      move(t.walletId, -t.amountCents);
      move(t.toWalletId, t.amountCents);
    }
  }
  return balances;
}

export function totalBalance(balances: Map<string, number>): number {
  let total = 0;
  for (const balance of balances.values()) total += balance;
  return total;
}

/** Month keys that actually hold transactions, newest first — used to stop the
 *  back arrow paging into empty years. Always includes the current month so a
 *  brand-new install has somewhere to stand. */
export function monthsWithActivity(txns: Txn[], now: Date = new Date()): string[] {
  const keys = new Set(txns.map((t) => monthKey(t.createdAt)));
  keys.add(monthKey(now));
  return [...keys].sort().reverse();
}

export interface MonthPoint {
  key: string;
  income: number;
  expense: number;
}

/** The last `n` months up to and including `now`, oldest first, each with its
 *  in and out totals. Months with nothing in them stay in the series as zeros
 *  so the chart keeps an even six-column stride instead of skipping gaps.
 *  Transfers are left out, same as everywhere else money is summed. */
export function monthlyHistory(txns: Txn[], n: number, now: Date = new Date()): MonthPoint[] {
  const nowKey = monthKey(now);
  const points: MonthPoint[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    points.push({ key: shiftMonth(nowKey, -i), income: 0, expense: 0 });
  }
  const index = new Map(points.map((p) => [p.key, p]));
  for (const t of txns) {
    const point = index.get(monthKey(t.createdAt));
    if (!point) continue;
    if (t.kind === "income") point.income += t.amountCents;
    else if (t.kind === "expense") point.expense += t.amountCents;
  }
  return points;
}

export interface Pace {
  /** Mean monthly spend across the earlier months of the series. */
  average: number;
  /** This month's spend minus that average — negative means below pace. */
  delta: number;
  /** True when at or under the average, for colouring the figure. */
  better: boolean;
  /** False on a fresh install with no earlier month to compare against, so the
   *  view can hold the line rather than show a meaningless "0 below average". */
  hasHistory: boolean;
}

/** This month's spend measured against the average of the months before it —
 *  the "pace" figure on Home and the foot of the Month chart. Takes the series
 *  from `monthlyHistory` so the current month is always the last point. */
export function paceVsAverage(history: MonthPoint[]): Pace {
  const prior = history.slice(0, -1);
  const hasHistory = prior.some((p) => p.expense > 0);
  if (!hasHistory) return { average: 0, delta: 0, better: true, hasHistory: false };
  const current = history[history.length - 1]?.expense ?? 0;
  const average = Math.round(prior.reduce((sum, p) => sum + p.expense, 0) / prior.length);
  const delta = current - average;
  return { average, delta, better: delta <= 0, hasHistory: true };
}

/* ── Plan ──────────────────────────────────────────────────────────────────
   Plan shows status; Settings holds the rules. Everything below derives that
   status from what is already in the ledger rather than storing it, so the two
   can never disagree. */

/** Spend against one category for a month. A parent counts everything filed
 *  under it, including its subcategories — an allotment on Food has to mean
 *  Food, not "the handful of transactions logged to the bare parent". */
export function categorySpend(
  txns: Txn[],
  categories: Category[],
  categoryId: string,
  when: Date | string = new Date(),
): number {
  const key = monthKey(when);
  const counted = new Set([categoryId, ...subcategoriesOf(categories, categoryId).map((c) => c.id)]);
  let total = 0;
  for (const t of txns) {
    if (t.kind !== "expense" || monthKey(t.createdAt) !== key) continue;
    if (t.categoryId && counted.has(t.categoryId)) total += t.amountCents;
  }
  return total;
}

export interface AllotmentProgress {
  allotment: Allotment;
  spentCents: number;
  /** Capped at 100 for bar widths; read `over` for the real overspend. */
  pct: number;
  /** A ceiling that has been exceeded. */
  over: boolean;
  /** A floor that has been reached. */
  met: boolean;
  /** limit − spent. Negative on a ceiling means overspent; on a floor it means
   *  the floor is cleared. */
  remainingCents: number;
}

export function allotmentProgress(
  allotment: Allotment,
  txns: Txn[],
  categories: Category[],
  when: Date | string = new Date(),
): AllotmentProgress {
  const spentCents = categorySpend(txns, categories, allotment.categoryId, when);
  const ratio = allotment.limitCents > 0 ? spentCents / allotment.limitCents : 0;
  return {
    allotment,
    spentCents,
    pct: Math.min(100, Math.round(ratio * 100)),
    over: allotment.kind === "ceiling" && spentCents > allotment.limitCents,
    met: allotment.kind === "floor" && spentCents >= allotment.limitCents,
    remainingCents: allotment.limitCents - spentCents,
  };
}

/** Allotments worth surfacing on Home: ceilings at or past `threshold` of their
 *  cap, worst first. Floors are left out — a floor you haven't reached yet is
 *  not an alarm, it's the normal state of the month until you give. */
export function allotmentsRunningHot(
  progress: AllotmentProgress[],
  threshold = 0.8,
): AllotmentProgress[] {
  return progress
    .filter(
      (p) =>
        p.allotment.kind === "ceiling" &&
        p.allotment.limitCents > 0 &&
        p.spentCents / p.allotment.limitCents >= threshold,
    )
    .sort((a, b) => a.remainingCents - b.remainingCents);
}

export type RecurringState = "waiting" | "approved" | "skipped";

export interface RecurringStatus {
  recurring: Recurring;
  state: RecurringState;
  /** The transaction that settled it, when approved. */
  txn?: Txn;
  /** This month's due date, with the day clamped to the month's length so a
   *  "day 31" commitment still lands in February. */
  due: Date;
}

/** What each commitment is doing this month. Approval is read from the ledger
 *  (a transaction carrying `recurringId`), so deleting that transaction puts
 *  the item back in the waiting list with no extra bookkeeping. */
export function recurringForMonth(
  recurring: Recurring[],
  txns: Txn[],
  skips: RecurringSkip[],
  when: Date | string = new Date(),
): RecurringStatus[] {
  const key = monthKey(when);
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  const settled = new Map<string, Txn>();
  for (const t of txns) {
    if (t.recurringId && monthKey(t.createdAt) === key) settled.set(t.recurringId, t);
  }
  const skipped = new Set(skips.filter((s) => s.monthKey === key).map((s) => s.recurringId));

  return recurring
    .filter((r) => !r.archived)
    .map((r) => {
      const txn = settled.get(r.id);
      const state: RecurringState = txn ? "approved" : skipped.has(r.id) ? "skipped" : "waiting";
      return {
        recurring: r,
        state,
        txn,
        due: new Date(year, month - 1, Math.min(r.dayOfMonth, lastDay)),
      };
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.recurring.name.localeCompare(b.recurring.name));
}

/* ── Owed ──────────────────────────────────────────────────────────────────
   A debt payment is a transfer with only one end attached. Paying ₱2,500 off a
   loan takes ₱2,500 out of GCash and knocks ₱2,500 off what you owe — your cash
   drops and your obligation drops by the same amount, so nothing was consumed.
   Modelling it as a transfer with no destination wallet makes `walletBalances`
   move the one wallet and nothing else, and keeps it out of `monthSummary` and
   `categoryBreakdown` for free: transfers are already excluded from both. That
   is exactly the behaviour CLAUDE.md asks for, with no special cases. */

/** Payments linked to a debt, newest first (inherited from the txn ordering). */
export function debtPayments(txns: Txn[], debtId: string): Txn[] {
  return txns.filter((t) => t.debtId === debtId);
}

export interface DebtBalance {
  debt: Debt;
  paidCents: number;
  /** What is still outstanding, floored at zero so an overpayment reads as
   *  settled rather than as a negative debt. */
  balanceCents: number;
  settled: boolean;
  /** Progress toward settled, capped at 100. */
  pct: number;
}

export function debtBalance(debt: Debt, txns: Txn[]): DebtBalance {
  let paidCents = 0;
  for (const t of debtPayments(txns, debt.id)) paidCents += t.amountCents;
  const ratio = debt.principalCents > 0 ? paidCents / debt.principalCents : 1;
  return {
    debt,
    paidCents,
    balanceCents: Math.max(0, debt.principalCents - paidCents),
    settled: paidCents >= debt.principalCents,
    pct: Math.min(100, Math.round(ratio * 100)),
  };
}

/** The two figures on the Wallets panel. Deliberately *not* folded into the
 *  spendable grand total: money lent out cannot be spent, and rolling it in
 *  would turn that number into net worth, which answers a different question. */
export function owedTotals(
  debts: Debt[],
  txns: Txn[],
): { oweCents: number; owedCents: number } {
  let oweCents = 0;
  let owedCents = 0;
  for (const debt of debts) {
    const { balanceCents } = debtBalance(debt, txns);
    if (debt.direction === "owe") oweCents += balanceCents;
    else owedCents += balanceCents;
  }
  return { oweCents, owedCents };
}

/** Whole days an item has been sitting on the Considering list. */
export function daysOnList(createdAt: string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export interface QuickPick {
  categoryId: string;
  parentId: string;
  name: string;
  accent: Accent;
}

/** The handful of subcategories to surface as one-tap chips on the add sheet,
 *  ranked by how often they've actually been logged for this kind. New installs
 *  fall back to the seeded order, so the chips are useful before any history
 *  exists and sharpen as you use them — no separate usage store to keep. */
export function topCategories(
  txns: Txn[],
  categories: Category[],
  forKind: "expense" | "income",
  n: number,
): QuickPick[] {
  const counts = new Map<string, number>();
  for (const t of txns) {
    if (t.kind !== forKind || !t.categoryId) continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  const leaves = parentCategories(categories, forKind).flatMap((p) =>
    subcategoriesOf(categories, p.id),
  );
  // stable sort keeps the seeded order among equally-used leaves
  return [...leaves]
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, n)
    .map((c) => ({
      categoryId: c.id,
      parentId: c.parentId ?? c.id,
      name: c.name,
      accent: accentOf(categories, c.id),
    }));
}
