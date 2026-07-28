import { Sheet } from "@ui/Sheet";

import { WalletIcon } from "./Amount";
import { IconApprove } from "./icons";
import { formatMoney, walletBalances, type Txn, type Wallet } from "./money";

interface WalletPickerProps {
  open: boolean;
  title: string;
  wallets: Wallet[];
  /** Read only, to show each wallet's running balance the way Wallets does —
   *  the same number that matters when you're deciding which one to spend
   *  from or move into. */
  txns: Txn[];
  selectedId?: string;
  /** Greyed out and unpickable — the route panel's other leg, so the wallet
   *  already chosen on one side is never offered as a real choice on the
   *  other. Native `<select>` had no way to do this short of removing the
   *  option outright, which made the list reflow under your thumb. */
  excludeId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** A wallet picker in the add sheet's own shape, standing in for the browser's
 *  default `<select>` dropdown — which draws in the OS's own chrome, breaks
 *  the tap target size the rest of the sheet holds to, and cannot show a
 *  balance or greyed-out state next to a name.
 *
 *  Flat, not two-level like categories: wallets are meant to be six or fewer,
 *  so there's no parent tier to drill through. */
export function WalletPicker({
  open,
  title,
  wallets,
  txns,
  selectedId,
  excludeId,
  onPick,
  onClose,
}: WalletPickerProps) {
  if (!open) return null;
  const balances = walletBalances(txns, wallets);

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="-mt-1">
        {wallets.map((w) => {
          const disabled = w.id === excludeId;
          const selected = w.id === selectedId;
          return (
            <button
              key={w.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(w.id)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 border-b border-sand-300/50 px-1 py-3 text-left transition-colors duration-150 last:border-b-0 ${
                disabled
                  ? "cursor-not-allowed opacity-40"
                  : selected
                    ? "bg-sage-500/10"
                    : "hover:bg-clay-200"
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-clay-200 text-umber-700">
                <WalletIcon name={w.name} className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="shrink-0 font-display text-sm tabular-nums text-umber-700">
                {formatMoney(balances.get(w.id) ?? 0)}
              </span>
              {selected && (
                <IconApprove aria-hidden className="size-4 shrink-0 text-sage-500" />
              )}
            </button>
          );
        })}
        {wallets.length === 0 && (
          <p className="py-6 text-center text-sm text-umber-700">
            No wallets yet — add one in Settings.
          </p>
        )}
      </div>
    </Sheet>
  );
}
