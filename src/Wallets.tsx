import { ChevronRight, Pencil, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Sheet } from "@ui/Sheet";

import { Amount } from "./Amount";
import { BalanceCard } from "./BalanceCard";
import {
  owedTotals,
  parseAmount,
  totalBalance,
  walletBalances,
  type Debt,
  type Txn,
  type Wallet,
} from "./money";
import { removeWallet, saveWallet } from "./store";

interface WalletsProps {
  txns: Txn[];
  wallets: Wallet[];
  debts: Debt[];
  onOwed: () => void;
}

export function Wallets({ txns, wallets, debts, onOwed }: WalletsProps) {
  const [editing, setEditing] = useState<Wallet | "new" | null>(null);
  const balances = walletBalances(txns, wallets);
  const { oweCents, owedCents } = owedTotals(debts, txns);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
        <BalanceCard label="All wallets" cents={totalBalance(balances)} />

        {/* Always rendered, including at zero: this panel is the only way into
            the Owed screen, and hiding it until a debt exists made the button
            for adding your first one unreachable.

            Deliberately its own panel and never folded into the total above:
            money lent out cannot be spent, and money owed is not yours to
            spend either. Rolling either in would turn the grand total into net
            worth, which answers a different question than "what can I spend
            today". */}
        <button
          type="button"
          onClick={onOwed}
          className="overflow-hidden rounded-tile border border-sand-300/60 text-left transition-colors duration-150 hover:bg-clay-100"
        >
          <div className="flex items-center justify-between gap-3 border-b border-sand-300/50 px-5 py-3">
            <span className="text-sm text-umber-700">You owe</span>
            <Amount cents={oweCents} sign="none" className="font-display font-semibold text-accent-rust" />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-sand-300/50 px-5 py-3">
            <span className="text-sm text-umber-700">Owed to you</span>
            <Amount cents={owedCents} sign="none" className="font-display font-semibold text-sage-500" />
          </div>
          <div className="flex items-center justify-between gap-3 bg-clay-100 px-5 py-2.5 text-sm text-umber-700">
            <span>Money borrowed and lent</span>
            <span className="flex items-center gap-0.5">
              Open
              <ChevronRight aria-hidden className="size-4" />
            </span>
          </div>
        </button>

        <p className="px-1 text-sm text-umber-700">
          Not part of the total above — that one answers what you can spend today.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
          {wallets.map((wallet, i) => (
            <div
              key={wallet.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                i === 0 ? "" : "border-t border-sand-300/50"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{wallet.name}</span>
              <Amount cents={balances.get(wallet.id) ?? 0} className="font-display font-semibold" />
              <button
                aria-label={`Edit ${wallet.name}`}
                onClick={() => setEditing(wallet)}
                className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setEditing("new")} className="gap-2">
            <Plus className="size-4" />
            Add wallet
          </Button>
        </div>
      </div>

      {editing && (
        <Sheet
          open
          onClose={() => setEditing(null)}
          title={editing === "new" ? "New wallet" : "Edit wallet"}
        >
          <WalletForm
            wallet={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        </Sheet>
      )}
    </div>
  );
}

function WalletForm({ wallet, onClose }: { wallet: Wallet | null; onClose: () => void }) {
  const [name, setName] = useState(wallet?.name ?? "");
  const [opening, setOpening] = useState(wallet ? String(wallet.openingCents / 100) : "");

  // an opening balance of zero is meaningful, so empty parses to 0 rather than
  // blocking the save the way a transaction amount would
  const openingCents = opening.trim() === "" ? 0 : parseAmount(opening);
  const valid = name.trim() !== "" && openingCents !== null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid || openingCents === null) return;
    await saveWallet({
      id: wallet?.id ?? crypto.randomUUID(),
      name: name.trim(),
      openingCents,
      createdAt: wallet?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  }

  async function destroy() {
    if (!wallet) return;
    await removeWallet(wallet.id);
    onClose();
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex flex-col gap-3">
      <Input
        placeholder="Name (Cash, GCash, BPI…)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Wallet name"
        autoFocus
      />
      <Input
        inputMode="decimal"
        placeholder="What's in it now (₱)"
        value={opening}
        onChange={(e) => setOpening(e.target.value)}
        aria-label="Opening balance in pesos"
        className="tabular-nums"
      />
      <p className="text-sm text-umber-700">
        The balance starts here and moves with everything you log against it.
      </p>

      <div className="flex items-center justify-between gap-3">
        {wallet ? (
          <Button variant="ghost" onClick={() => void destroy()} className="px-4">
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!valid}>
          Save
        </Button>
      </div>
    </form>
  );
}
