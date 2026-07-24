import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@ui/Button";
import { Input } from "@ui/Input";
import { Select } from "@ui/Select";

import { CategoryDot } from "./Amount";
import { CategoryPicker } from "./CategoryPicker";
import {
  formatEntry,
  formatMoney,
  parseAmount,
  pressKey,
  topCategories,
  type Category,
  type Txn,
  type TxnKind,
  type Wallet,
} from "./money";
import { Numpad } from "./Numpad";
import { addTxn, lastWalletId } from "./store";

const kinds: { value: TxnKind; label: string }[] = [
  { value: "expense", label: "Spent" },
  { value: "income", label: "Received" },
  { value: "transfer", label: "Moved" },
];

/** Six fits two columns without scrolling on the shortest phone, and past six
 *  the list stops being "the ones I always use" and becomes browsing — which is
 *  what the full picker is for. */
const QUICK_PICKS = 6;

interface AddSheetProps {
  /** The kind to open on, or null when shut. Doubling as the open flag keeps the
   *  draft unmounted between uses, so every session starts blank with no reset
   *  logic to get wrong. */
  kind: TxnKind | null;
  categories: Category[];
  wallets: Wallet[];
  /** Read only, to rank the quick picks by what actually gets logged. */
  txns: Txn[];
  onClose: () => void;
  /** The id of what was just written, so Home can mark the new row. */
  onLogged: (id: string) => void;
}

export function AddSheet({ kind, categories, wallets, txns, onClose, onLogged }: AddSheetProps) {
  if (!kind) return null;
  return (
    <AddComposer
      initialKind={kind}
      categories={categories}
      wallets={wallets}
      txns={txns}
      onClose={onClose}
      onLogged={onLogged}
    />
  );
}

/** Logging, as a full screen rather than a panel.
 *
 *  Everything needed to file a transaction is visible at once — amount, note,
 *  wallet, categories — above a keypad that belongs to the sheet. Tapping a
 *  category *is* the save: there is no separate confirm step, because the whole
 *  target is a real expense logged in under five seconds. */
function AddComposer({
  initialKind,
  categories,
  wallets,
  txns,
  onClose,
  onLogged,
}: Omit<AddSheetProps, "kind"> & { initialKind: TxnKind }) {
  const [kind, setKind] = useState<TxnKind>(initialKind);
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState("");
  const [walletId, setWalletId] = useState(() => lastWalletId(wallets) ?? "");
  const [toWalletId, setToWalletId] = useState("");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  /* Shown when a category is tapped with no amount typed. Cleared by typing
     rather than a timer, so there's no stray timeout to tidy up on unmount. */
  const [needsAmount, setNeedsAmount] = useState(false);

  const amountCents = parseAmount(entry);
  const transfer = kind === "transfer";
  const sameWallet = Boolean(walletId && walletId === toWalletId);
  const canTransfer = amountCents !== null && Boolean(walletId) && Boolean(toWalletId) && !sameWallet;

  const type = (key: string) => setEntry((current) => pressKey(current, key));

  useEffect(() => {
    if (entry) setNeedsAmount(false);
  }, [entry]);

  /* A hardware keyboard should drive the same entry the keypad does — this is
     the desktop path, and without it the numpad would be the only way in. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picking) return; // the picker's own Escape handling takes over
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement) return;
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === ".") type(".");
      else if (e.key === "Backspace") type("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, onClose]);

  async function log(categoryId?: string) {
    if (amountCents === null) {
      setNeedsAmount(true);
      return;
    }
    if (busy || (transfer && !canTransfer)) return;
    setBusy(true);

    const base = {
      id: crypto.randomUUID(),
      amountCents,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      await addTxn(
        transfer
          ? { ...base, kind: "transfer", walletId, toWalletId }
          : { ...base, kind, walletId: walletId || undefined, categoryId },
      );
      onLogged(base.id);
      onClose();
    } catch (err: unknown) {
      // the sheet stays open with the draft intact rather than swallowing it
      console.error("manna: could not log transaction", err);
      setBusy(false);
    }
  }

  const picks = transfer ? [] : topCategories(txns, categories, kind, QUICK_PICKS);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log something"
      className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-clay-50"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
        >
          <X className="size-5" />
        </button>

        {/* for a transfer the two wallets live below, beside each other, so this
            single picker would be ambiguous */}
        {!transfer && (
          <div className="w-44">
            <Select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              aria-label="Wallet"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="px-6 pt-6 text-center">
        <p className="font-display font-semibold leading-none tabular-nums">
          <span className="mr-1 text-2xl text-umber-700">₱</span>
          <span className={`text-5xl ${entry ? "text-umber-900" : "text-umber-700/40"}`}>
            {formatEntry(entry)}
          </span>
        </p>
        {needsAmount && (
          <p role="status" className="pt-3 text-sm text-umber-700">
            Enter an amount first.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pt-5">
        <Input
          placeholder="Note — merchant, detail (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Note"
          maxLength={60}
          className="text-center"
        />

        <div className="flex rounded-control bg-clay-200 p-1">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={kind === k.value}
              className={`min-h-11 flex-1 rounded-control font-display text-sm font-semibold transition-colors duration-150 ${
                kind === k.value ? "bg-raised text-umber-900 shadow-soft" : "text-umber-700"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">
        {transfer ? (
          <div className="flex flex-col gap-2">
            <Label>Move between your wallets</Label>
            <Select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              aria-label="From wallet"
            >
              <option value="">From…</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            <Select
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              aria-label="To wallet"
            >
              <option value="">To…</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
            {sameWallet && (
              <p className="text-sm text-umber-700">A transfer needs two different wallets.</p>
            )}
            <p className="pt-1 text-sm text-umber-700">
              Moving money to savings is not spending — it stays out of your category
              totals.
            </p>
          </div>
        ) : (
          <>
            <Label>Tap what it was</Label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {picks.map((pick) => (
                <button
                  key={pick.categoryId}
                  type="button"
                  onClick={() => void log(pick.categoryId)}
                  disabled={busy}
                  className="flex min-h-12 items-center gap-2.5 rounded-tile bg-clay-100 px-3.5 text-left shadow-soft transition duration-150 hover:bg-clay-200 active:brightness-95 disabled:opacity-40"
                >
                  <CategoryDot accent={pick.accent} />
                  <span className="min-w-0 flex-1 truncate text-sm">{pick.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="col-span-2 min-h-12 rounded-tile border border-dashed border-sand-300 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-100 hover:text-umber-900"
              >
                All categories…
              </button>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-sand-300/50 bg-clay-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {transfer && (
          <Button
            onClick={() => void log()}
            disabled={!canTransfer || busy}
            className="mb-2 w-full tabular-nums"
          >
            {busy
              ? "Saving…"
              : `Move ${amountCents !== null ? formatMoney(amountCents) : ""}`.trim()}
          </Button>
        )}
        <Numpad onPress={type} />
      </div>

      <CategoryPicker
        open={picking}
        categories={categories}
        forKind={kind === "income" ? "income" : "expense"}
        amountLabel={amountCents !== null ? formatMoney(amountCents) : "₱0.00"}
        onPick={(categoryId) => {
          setPicking(false);
          void log(categoryId);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1 text-center font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
      {children}
    </p>
  );
}
