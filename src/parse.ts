/** The pre-filled-transaction shape the add wizard opens on — from Stewi
 *  proposing a new transaction (see assistant.ts), or from a stale link.
 *  Kept as its own tiny, framework-free file so AddSheet's import doesn't
 *  churn: every field is optional, and whatever is present seeds the wizard,
 *  skipping ahead to the first thing still missing. Nothing is ever written
 *  without confirming on the review panel. */
import type { TxnKind } from "./money";

export interface AddDraft {
  kind?: TxnKind;
  amountCents?: number;
  categoryId?: string;
  walletId?: string;
  toWalletId?: string;
  note?: string;
}
