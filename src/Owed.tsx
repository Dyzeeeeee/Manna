import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Select } from "@ui/Select";

import { Amount } from "./Amount";
import {
  debtBalance,
  debtPayments,
  formatMoney,
  parseAmount,
  type Debt,
  type DebtBalance,
  type Txn,
  type Wallet,
} from "./money";
import { payDebt, removeDebt, saveDebt } from "./store";

interface OwedProps {
  debts: Debt[];
  txns: Txn[];
  wallets: Wallet[];
  onBack: () => void;
  onLogged: (id: string) => void;
}

const SECTIONS = [
  { direction: "owe" as const, heading: "You owe" },
  { direction: "owed" as const, heading: "Owed to you" },
];

/** Money borrowed and lent, both directions.
 *
 *  Paying these down is a transfer, not spending — your cash drops and your
 *  obligation drops by the same amount, so the category totals stay untouched
 *  and the month's report keeps telling the truth. */
export function Owed({ debts, txns, wallets, onBack, onLogged }: OwedProps) {
  const [adding, setAdding] = useState(false);
  const balances = debts.map((d) => debtBalance(d, txns));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start py-1 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:text-umber-900"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Back to wallets
      </button>

      <h1 className="font-display text-2xl font-semibold">Owed</h1>
      <p className="text-sm text-umber-700">
        Paying these down is a transfer, not spending — your priorities stay untouched.
      </p>

      {debts.length === 0 && !adding && (
        <div className="rounded-tile border border-dashed border-sand-300 p-6 text-center text-sm leading-relaxed text-umber-700">
          Nothing borrowed and nothing lent. Add a debt or a loan and its payments will track
          themselves — the balance is always the principal minus what has gone against it.
        </div>
      )}

      {SECTIONS.map(({ direction, heading }) => {
        const rows = balances.filter((b) => b.debt.direction === direction);
        if (rows.length === 0) return null;
        const total = rows.reduce((sum, r) => sum + r.balanceCents, 0);

        return (
          <section key={direction} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
                {heading}
              </h2>
              <Amount
                cents={total}
                sign="none"
                className={`font-display font-semibold ${
                  direction === "owe" ? "text-accent-rust" : "text-sage-500"
                }`}
              />
            </div>

            {rows.map((row) => (
              <DebtCard
                key={row.debt.id}
                row={row}
                txns={txns}
                wallets={wallets}
                onLogged={onLogged}
              />
            ))}
          </section>
        );
      })}

      {adding ? (
        <DebtForm onDone={() => setAdding(false)} />
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)} className="gap-2 self-center">
          <Plus className="size-4" />
          Add a debt or a loan
        </Button>
      )}
    </div>
  );
}

function DebtCard({
  row,
  txns,
  wallets,
  onLogged,
}: {
  row: DebtBalance;
  txns: Txn[];
  wallets: Wallet[];
  onLogged: (id: string) => void;
}) {
  const { debt, paidCents, balanceCents, settled, pct } = row;
  const [paying, setPaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const payments = debtPayments(txns, debt.id);
  const owe = debt.direction === "owe";

  return (
    <div className={`flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft ${settled ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 truncate font-display font-semibold">{debt.person}</span>
        <Amount
          cents={balanceCents}
          sign="none"
          className={`shrink-0 font-display text-lg font-semibold ${
            settled ? "text-sage-500" : owe ? "text-accent-rust" : "text-sage-500"
          }`}
        />
      </div>

      <p className="text-sm text-umber-700">
        <span className="tabular-nums">{formatMoney(paidCents)}</span> of{" "}
        <span className="tabular-nums">{formatMoney(debt.principalCents)}</span>{" "}
        {owe ? "paid" : "collected"}
        {debt.note && ` · ${debt.note}`}
        {debt.dueAt && (
          <span className="text-accent-gold">
            {" "}
            · due {new Date(debt.dueAt).toLocaleDateString("en", { day: "numeric", month: "long" })}
          </span>
        )}
      </p>

      <div className="h-1.5 overflow-hidden rounded-control bg-clay-200">
        <div
          className="h-full rounded-control bg-sage-500 transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {settled ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-sage-500">Settled</p>
          <button
            type="button"
            onClick={() => void removeDebt(debt.id)}
            className="rounded-control px-3 py-1.5 font-display text-xs font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-accent-rust"
          >
            Remove
          </button>
        </div>
      ) : paying ? (
        <PaymentForm
          debt={debt}
          balanceCents={balanceCents}
          wallets={wallets}
          onDone={() => setPaying(false)}
          onLogged={onLogged}
        />
      ) : (
        <Button variant="ghost" onClick={() => setPaying(true)} className="border border-sand-300">
          {owe ? "Record a payment" : "Record a repayment"}
        </Button>
      )}

      {payments.length > 0 && (
        <div className="border-t border-sand-300/50 pt-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="font-display text-xs font-semibold text-umber-700"
          >
            {showHistory ? "Hide" : "Show"} {payments.length}{" "}
            {payments.length === 1 ? "payment" : "payments"}
          </button>

          {showHistory && (
            <ul className="flex flex-col gap-1 pt-2">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 text-sm text-umber-700">
                  <span>
                    {new Date(p.createdAt).toLocaleDateString("en", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <Amount cents={p.amountCents} sign="none" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentForm({
  debt,
  balanceCents,
  wallets,
  onDone,
  onLogged,
}: {
  debt: Debt;
  balanceCents: number;
  wallets: Wallet[];
  onDone: () => void;
  onLogged: (id: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  // an empty box means "settle the rest", which is the common case
  const amountCents = amount.trim() === "" ? balanceCents : parseAmount(amount);
  const valid = amountCents !== null && amountCents > 0 && walletId !== "";

  async function submit() {
    if (!valid || amountCents === null || busy) return;
    setBusy(true);
    try {
      onLogged(await payDebt(debt, amountCents, walletId));
      onDone();
    } catch (err: unknown) {
      console.error("manna: could not record a debt payment", err);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-umber-700">
          ₱
        </span>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={String(balanceCents / 100)}
          aria-label="Payment amount in pesos"
          className="tabular-nums"
          autoFocus
        />
      </div>

      <Select
        value={walletId}
        onChange={(e) => setWalletId(e.target.value)}
        aria-label={debt.direction === "owe" ? "Pay from wallet" : "Receive into wallet"}
      >
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {debt.direction === "owe" ? `From ${w.name}` : `Into ${w.name}`}
          </option>
        ))}
      </Select>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={!valid || busy} className="tabular-nums">
          {busy ? "Logging…" : `Log ${amountCents !== null ? formatMoney(amountCents) : ""}`.trim()}
        </Button>
      </div>
    </div>
  );
}

function DebtForm({ onDone }: { onDone: () => void }) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"owe" | "owed">("owe");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");

  const principalCents = parseAmount(amount);
  const valid = person.trim() !== "" && principalCents !== null;

  async function save() {
    if (!valid || principalCents === null) return;
    const now = new Date().toISOString();
    await saveDebt({
      id: crypto.randomUUID(),
      person: person.trim(),
      direction,
      principalCents,
      openedAt: now,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      note: note.trim(),
      createdAt: now,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
      <div className="flex rounded-control bg-clay-200 p-1">
        {(
          [
            { value: "owe", label: "I borrowed" },
            { value: "owed", label: "I lent" },
          ] as const
        ).map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDirection(d.value)}
            aria-pressed={direction === d.value}
            className={`min-h-11 flex-1 rounded-control font-display text-sm font-semibold transition-colors duration-150 ${
              direction === d.value ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <Input
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        placeholder="Who?"
        aria-label="Person"
        maxLength={40}
        autoFocus
      />
      <Input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="How much (₱)"
        aria-label="Principal in pesos"
        className="tabular-nums"
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What for? (optional)"
        aria-label="Note"
        maxLength={60}
      />
      <Input
        type="date"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        aria-label="Due date (optional)"
      />

      <p className="text-sm text-umber-700">
        This records the obligation only. Log the cash itself against a wallet if it moved.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} className="px-4">
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={!valid}>
          Save
        </Button>
      </div>
    </div>
  );
}
