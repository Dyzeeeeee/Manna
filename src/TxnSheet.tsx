import { useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Select } from "@ui/Select";
import { Sheet } from "@ui/Sheet";

import {
  findCategory,
  formatMoney,
  parentCategories,
  parseAmount,
  subcategoriesOf,
  type Category,
  type Txn,
  type Wallet,
} from "./money";
import { removeTxn, updateTxn } from "./store";

interface TxnSheetProps {
  txn: Txn | null;
  categories: Category[];
  wallets: Wallet[];
  onClose: () => void;
}

/** The other half of amount-only logging: everything the add form skipped is
 *  editable here. Without this, fast logging would just mean bad data. */
export function TxnSheet({ txn, categories, wallets, onClose }: TxnSheetProps) {
  if (!txn) return null;
  // keyed on the transaction so switching rows resets the draft state
  return (
    <Sheet open onClose={onClose} title="Edit">
      <TxnForm key={txn.id} txn={txn} categories={categories} wallets={wallets} onClose={onClose} />
    </Sheet>
  );
}

function TxnForm({ txn, categories, wallets, onClose }: TxnSheetProps & { txn: Txn }) {
  const [amount, setAmount] = useState(String(txn.amountCents / 100));
  const [note, setNote] = useState(txn.note);
  const [categoryId, setCategoryId] = useState(
    txn.kind === "transfer" ? "" : (txn.categoryId ?? ""),
  );
  const [walletId, setWalletId] = useState(txn.walletId ?? "");
  const [toWalletId, setToWalletId] = useState(txn.kind === "transfer" ? (txn.toWalletId ?? "") : "");
  // <input type="date"> wants local YYYY-MM-DD, not the ISO string we store
  const [date, setDate] = useState(() => {
    const d = new Date(txn.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const amountCents = parseAmount(amount);
  const transfer = txn.kind === "transfer";
  const valid = amountCents !== null && (!transfer || (walletId && toWalletId && walletId !== toWalletId));

  const parents = parentCategories(categories, txn.kind === "income" ? "income" : "expense");
  /* A transaction filed under a category that has since been archived would
     otherwise find nothing selected here, and saving would quietly re-file it as
     uncategorised. Offering it back keeps an edit from losing history. */
  const listed = new Set(
    parents.flatMap((p) => [p.id, ...subcategoriesOf(categories, p.id).map((s) => s.id)]),
  );
  const archived = categoryId && !listed.has(categoryId) ? findCategory(categories, categoryId) : undefined;

  async function save() {
    if (amountCents === null || !valid) return;
    // keep the original time of day; only the calendar date is editable
    const original = new Date(txn.createdAt);
    const [y, m, d] = date.split("-").map(Number);
    const createdAt = new Date(
      y,
      m - 1,
      d,
      original.getHours(),
      original.getMinutes(),
      original.getSeconds(),
    ).toISOString();

    const base = { id: txn.id, amountCents, note: note.trim(), createdAt };
    await updateTxn(
      transfer
        ? { ...base, kind: "transfer", walletId, toWalletId }
        : { ...base, kind: txn.kind, walletId, categoryId: categoryId || undefined },
    );
    onClose();
  }

  async function destroy() {
    await removeTxn(txn.id);
    onClose();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-3"
    >
      <Input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Amount in pesos"
        className="tabular-nums"
      />

      {transfer ? (
        <div className="flex items-center gap-2">
          <Select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            aria-label="From wallet"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <span aria-hidden className="shrink-0 text-umber-700">
            →
          </span>
          <Select
            value={toWalletId}
            onChange={(e) => setToWalletId(e.target.value)}
            aria-label="To wallet"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Category"
          >
            <option value="">Uncategorised</option>
            {archived && (
              <option value={archived.id}>{archived.name} (archived)</option>
            )}
            {/* grouped, because the list is two levels and a flat run of sixty
                names would be unreadable in a native picker */}
            {parents.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name} — no subcategory</option>
                {subcategoriesOf(categories, parent.id).map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select value={walletId} onChange={(e) => setWalletId(e.target.value)} aria-label="Wallet">
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </>
      )}

      <Input
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note"
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Date"
      />

      {transfer && walletId && walletId === toWalletId && (
        <p className="text-sm text-umber-700">A transfer needs two different wallets.</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => void destroy()} className="px-4">
          Delete
        </Button>
        <Button type="submit" disabled={!valid} className="tabular-nums">
          Save {amountCents !== null && formatMoney(amountCents)}
        </Button>
      </div>
    </form>
  );
}
