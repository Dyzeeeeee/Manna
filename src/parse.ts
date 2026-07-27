/** The natural-language capture contract, kept free of React and of any network
 *  code so it can be unit-tested here and imported verbatim by the parse Worker.
 *
 *  The flow: a sentence like "200 on Jollibee today" plus the user's live
 *  category and wallet lists go to Claude; Claude returns a `ParsedDraft`
 *  constrained to the schema below; `sanitizeDraft` re-checks every id against
 *  the live lists and hands back an `AddDraft` the wizard opens on. Nothing is
 *  written until the user confirms on the review panel — see [[add-flow-stepper]].
 */
import {
  findCategory,
  parentCategories,
  subcategoriesOf,
  type Category,
  type TxnKind,
  type Wallet,
} from "./money";

/** A pre-filled transaction, e.g. from natural-language capture ("200 on
 *  Jollibee today"). Every field is optional: whatever is present seeds the add
 *  wizard, and if that's enough to file, the sheet opens straight on the review
 *  panel; whatever is missing (or doesn't resolve to a real category/wallet)
 *  lands you on the step that collects it. Nothing is ever written without your
 *  confirmation — the draft is a starting point, not a saved transaction.
 *
 *  Lives here rather than in the add sheet so this contract stays free of React,
 *  letting the parse Worker import it without pulling in the UI. */
export interface AddDraft {
  kind?: TxnKind;
  amountCents?: number;
  categoryId?: string;
  walletId?: string;
  toWalletId?: string;
  note?: string;
}

/** How sure the model is about the whole draft. Low confidence is a hint to the
 *  caller that the review panel deserves a second look, never a reason to skip
 *  it. */
export type Confidence = "high" | "medium" | "low";

/** Exactly what the model returns, before validation. The ids are ones the model
 *  picked out of the enums we gave it — plausible, but still re-checked in
 *  `sanitizeDraft` rather than trusted. */
export interface ParsedDraft {
  kind: TxnKind;
  amountCents: number | null;
  categoryId: string | null;
  walletId: string | null;
  toWalletId: string | null;
  note: string;
  confidence: Confidence;
}

/** The note field caps at 60 in the add sheet; mirror it here so a chatty parse
 *  can't produce a note the manual path would have refused. */
const NOTE_MAX = 60;

/** The JSON Schema handed to the Messages API as `output_config.format`.
 *
 *  Category and wallet ids are pinned to `enum`s built from the live lists, so
 *  the model can only return an id that exists — "Jollibee" can never come back
 *  as a category (Rule 4), it has to land in `note`. Nullable fields use `anyOf`
 *  rather than a `["string","null"]` type union, since `anyOf` and the `null`
 *  type are the constructs structured outputs documents as supported. */
export function buildDraftSchema(categories: Category[], wallets: Wallet[]) {
  const categoryIds = categories.filter((c) => !c.archived).map((c) => c.id);
  const walletIds = wallets.map((w) => w.id);
  const nullableEnum = (ids: string[]) => ({
    anyOf: [{ type: "string", enum: ids }, { type: "null" }],
  });
  return {
    type: "object",
    additionalProperties: false,
    required: ["kind", "amountCents", "categoryId", "walletId", "toWalletId", "note", "confidence"],
    properties: {
      kind: { type: "string", enum: ["expense", "income", "transfer"] },
      amountCents: { anyOf: [{ type: "integer" }, { type: "null" }] },
      categoryId: nullableEnum(categoryIds),
      walletId: nullableEnum(walletIds),
      toWalletId: nullableEnum(walletIds),
      note: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
  };
}

/** One kind's categories as an indented, id-tagged list for the prompt. */
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

/** The system prompt: the taxonomy the model must choose from, the wallets it may
 *  name, and the handful of rules that keep the taxonomy from rotting — the same
 *  ones enforced in the manual path (merchants are notes, transfers aren't
 *  spending, PHP only). Stable across calls for a given taxonomy, so it prompt-
 *  caches. `today` is passed in so relative dates ("today", "yesterday") resolve
 *  in the user's timezone. */
export function buildParsePrompt(
  categories: Category[],
  wallets: Wallet[],
  today: string,
): string {
  const walletList = wallets.map((w) => `  - ${w.name} [${w.id}]`).join("\n");
  return `You turn a single spoken or typed line into one Manna transaction draft. Manna is a personal stewardship log; the money is Philippine pesos only.

Return the amount in centavos as an integer: "200 pesos" is 20000, "1,250.50" is 125050. If no amount is stated, use null.

Choose exactly one kind:
- "expense" — money spent.
- "income" — money received.
- "transfer" — money moved between the user's own wallets, or a debt payment. A transfer is NOT spending; it takes no category.

Today is ${today}.

Expense categories:
${taxonomyFor(categories, "expense")}

Income categories:
${taxonomyFor(categories, "income")}

Wallets:
${walletList}

Rules:
- Pick a category id only from the list above, matching the kind (expense id for an expense, income id for income). Prefer a subcategory; fall back to its parent when unsure. Use null only if nothing fits.
- Merchants, shops, and brand names are NEVER categories. "Jollibee", "SM", "Grab" go in note; the category is the kind of spending (Jollibee -> Food).
- For a transfer, set walletId (from) and toWalletId (to) and leave categoryId null. For a spend or income, set walletId to the wallet used if named, else null.
- Keep note short: the merchant or a brief detail, at most ${NOTE_MAX} characters. Empty string if there is nothing to add.
- Set confidence to "low" when the amount, kind, or category is a guess.`;
}

/** Turn a raw model reply into a draft the wizard can trust: every id is
 *  re-verified against the live lists, the amount must be a positive integer, a
 *  transfer's two wallets must differ, and the note is trimmed to the field cap.
 *  Anything that fails is dropped rather than corrected, so a bad field lands the
 *  user on the step that collects it instead of filing something wrong. */
export function sanitizeDraft(
  raw: ParsedDraft,
  categories: Category[],
  wallets: Wallet[],
): AddDraft {
  const kind: TxnKind =
    raw.kind === "income" || raw.kind === "transfer" ? raw.kind : "expense";
  const walletExists = (id: string | null) => Boolean(id) && wallets.some((w) => w.id === id);

  const draft: AddDraft = { kind, note: (raw.note ?? "").trim().slice(0, NOTE_MAX) };

  if (raw.amountCents != null && Number.isInteger(raw.amountCents) && raw.amountCents > 0) {
    draft.amountCents = raw.amountCents;
  }
  if (walletExists(raw.walletId)) draft.walletId = raw.walletId ?? undefined;

  if (kind === "transfer") {
    if (walletExists(raw.toWalletId) && raw.toWalletId !== draft.walletId) {
      draft.toWalletId = raw.toWalletId ?? undefined;
    }
  } else if (raw.categoryId && findCategory(categories, raw.categoryId)) {
    draft.categoryId = raw.categoryId;
  }

  return draft;
}
