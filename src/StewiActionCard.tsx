import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";

import { Amount, WalletIcon } from "./Amount";
import type { ProposedAction } from "./assistant";
import { glyph, IconApprove, IconClose, IconForward, IconSkip } from "./icons";
import { findCategory, formatMoney, parseAmount, type Category, type Wallet } from "./money";
import { approveRecurring, payDebt, skipRecurring } from "./store";

const IconWallet = glyph("wallet").line;

interface StewiActionCardProps {
  action: ProposedAction;
  categories: Category[];
  wallets: Wallet[];
  /** create/edit/delete proposals have an existing sheet built for exactly
   *  this — reviewing and confirming there, not in a second card here, keeps
   *  one confirm surface per transaction instead of two. */
  onOpenSheet: (action: ProposedAction) => void;
  /** Fires once the card's own outcome is known: after approve/skip/payment
   *  actually writes, or after Cancel on any type. */
  onDone: (outcome: string) => void;
}

/** The confirm card for the three proposals with no existing sheet to open
 *  into (Plan's ExpectedCard and Owed's PaymentForm are both inline, not
 *  reusable) — built to the same shape: an editable amount where the figure
 *  can vary, an explicit action button, a busy state. Nothing here writes
 *  until that button is tapped. */
export function StewiActionCard({ action, categories, wallets, onOpenSheet, onDone }: StewiActionCardProps) {
  if (action.type === "create_transaction" || action.type === "edit_transaction" || action.type === "delete_transaction") {
    return <ReviewInSheetCard action={action} categories={categories} onOpenSheet={onOpenSheet} onDone={onDone} />;
  }
  if (action.type === "approve_recurring") return <RecurringApprovalCard action={action} onDone={onDone} />;
  if (action.type === "skip_recurring") return <RecurringSkipCard action={action} onDone={onDone} />;
  return <DebtPaymentCard action={action} wallets={wallets} onDone={onDone} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-tile border border-white/15 bg-raised/70 p-4 shadow-glass backdrop-blur-lg">
      {children}
    </div>
  );
}

function CardFoot({
  busy,
  confirmLabel,
  confirmIcon: ConfirmIcon = IconApprove,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  confirmLabel: string;
  confirmIcon?: typeof IconApprove;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button onClick={onConfirm} disabled={busy} className="flex-1 gap-2">
        <ConfirmIcon aria-hidden className="size-4" />
        {busy ? "Working…" : confirmLabel}
      </Button>
      <Button variant="ghost" onClick={onCancel} disabled={busy} className="gap-1.5 px-4">
        <IconClose aria-hidden className="size-4" />
        Cancel
      </Button>
    </div>
  );
}

/** create/edit/delete: a short summary plus a single "Review" tap that opens
 *  the exact sheet a manual log/edit already uses. That sheet's own Save (or
 *  Delete) button is the real confirm — this card is a preview, not a second
 *  gate. */
function ReviewInSheetCard({
  action,
  categories,
  onOpenSheet,
  onDone,
}: {
  action: Extract<ProposedAction, { type: "create_transaction" | "edit_transaction" | "delete_transaction" }>;
  categories: Category[];
  onOpenSheet: (action: ProposedAction) => void;
  onDone: (outcome: string) => void;
}) {
  const summary =
    action.type === "create_transaction" ? (
      <>
        <p className="font-display font-semibold">
          {action.draft.kind === "income" ? "Log income" : action.draft.kind === "transfer" ? "Log a transfer" : "Log an expense"}
        </p>
        <p className="text-sm text-umber-700">
          {action.draft.amountCents != null && (
            <Amount cents={action.draft.amountCents} sign="none" className="tabular-nums" />
          )}
          {action.draft.categoryId && ` · ${findCategory(categories, action.draft.categoryId)?.name ?? ""}`}
          {action.draft.note && ` · ${action.draft.note}`}
        </p>
      </>
    ) : action.type === "edit_transaction" ? (
      <>
        <p className="font-display font-semibold">Edit transaction</p>
        <p className="text-sm text-umber-700">
          <Amount cents={action.original.amountCents} sign="none" className="tabular-nums line-through opacity-60" />
          {" → "}
          <Amount cents={action.next.amountCents} sign="none" className="tabular-nums" />
          {action.next.note && ` · ${action.next.note}`}
        </p>
      </>
    ) : (
      <>
        <p className="font-display font-semibold text-accent-rust">Delete transaction</p>
        <p className="text-sm text-umber-700">
          <Amount cents={action.txn.amountCents} sign="none" className="tabular-nums" />
          {action.txn.note && ` · ${action.txn.note}`}
        </p>
      </>
    );

  return (
    <Card>
      {summary}
      <div className="flex gap-2">
        <Button onClick={() => onOpenSheet(action)} className="flex-1 gap-2">
          <IconForward aria-hidden className="size-4" />
          Review
        </Button>
        <Button
          variant="ghost"
          onClick={() => onDone("You decided not to make that change.")}
          className="gap-1.5 px-4"
        >
          <IconClose aria-hidden className="size-4" />
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function RecurringApprovalCard({
  action,
  onDone,
}: {
  action: Extract<ProposedAction, { type: "approve_recurring" }>;
  onDone: (outcome: string) => void;
}) {
  const { recurring } = action;
  const [amount, setAmount] = useState(String(action.amountCents / 100));
  const [busy, setBusy] = useState(false);
  const amountCents = parseAmount(amount);

  async function approve() {
    if (amountCents === null || busy) return;
    setBusy(true);
    try {
      await approveRecurring(recurring, {
        id: crypto.randomUUID(),
        kind: "expense",
        amountCents,
        note: "",
        createdAt: new Date().toISOString(),
        categoryId: recurring.categoryId,
        walletId: recurring.walletId,
      });
      onDone(`Approved and logged ${formatMoney(amountCents)} for ${recurring.name}.`);
    } catch (err: unknown) {
      console.error("manna: stewi could not approve recurring item", err);
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">Approve {recurring.name}</p>
          <p className="text-sm text-umber-700">This month's occurrence</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span aria-hidden className="text-umber-700">₱</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={`Amount for ${recurring.name}`}
            className="w-24 px-3 py-2 text-right font-display font-semibold tabular-nums"
          />
        </div>
      </div>
      <CardFoot
        busy={busy}
        confirmLabel="Approve & log"
        onConfirm={() => void approve()}
        onCancel={() => onDone(`Left ${recurring.name} waiting for now.`)}
      />
    </Card>
  );
}

function RecurringSkipCard({
  action,
  onDone,
}: {
  action: Extract<ProposedAction, { type: "skip_recurring" }>;
  onDone: (outcome: string) => void;
}) {
  const { recurring } = action;
  const [busy, setBusy] = useState(false);

  async function skip() {
    if (busy) return;
    setBusy(true);
    try {
      await skipRecurring(recurring.id, new Date().toISOString().slice(0, 7));
      onDone(`Skipped ${recurring.name} for this month.`);
    } catch (err: unknown) {
      console.error("manna: stewi could not skip recurring item", err);
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="font-display font-semibold">Skip {recurring.name}?</p>
      <p className="text-sm text-umber-700">Nothing will be logged for this month.</p>
      <CardFoot
        busy={busy}
        confirmLabel="Skip"
        confirmIcon={IconSkip}
        onConfirm={() => void skip()}
        onCancel={() => onDone(`Left ${recurring.name} waiting for now.`)}
      />
    </Card>
  );
}

function DebtPaymentCard({
  action,
  wallets,
  onDone,
}: {
  action: Extract<ProposedAction, { type: "log_debt_payment" }>;
  wallets: Wallet[];
  onDone: (outcome: string) => void;
}) {
  const { debt } = action;
  const [amount, setAmount] = useState(String(action.amountCents / 100));
  const [busy, setBusy] = useState(false);
  const amountCents = parseAmount(amount);
  const wallet = wallets.find((w) => w.id === action.walletId);

  async function pay() {
    if (amountCents === null || busy) return;
    setBusy(true);
    try {
      await payDebt(debt, amountCents, action.walletId);
      onDone(
        `Logged ${formatMoney(amountCents)} ${debt.direction === "owe" ? "paid to" : "collected from"} ${debt.person}.`,
      );
    } catch (err: unknown) {
      console.error("manna: stewi could not log a debt payment", err);
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">
            {debt.direction === "owe" ? "Pay" : "Collect from"} {debt.person}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-umber-700">
            <IconWallet aria-hidden className="size-3.5" />
            <WalletIcon name={wallet?.name} className="size-4" />
            {wallet?.name ?? "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span aria-hidden className="text-umber-700">₱</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Payment amount"
            className="w-24 px-3 py-2 text-right font-display font-semibold tabular-nums"
          />
        </div>
      </div>
      <CardFoot
        busy={busy}
        confirmLabel="Log payment"
        onConfirm={() => void pay()}
        onCancel={() => onDone(`Left ${debt.person}'s balance as it was.`)}
      />
    </Card>
  );
}
