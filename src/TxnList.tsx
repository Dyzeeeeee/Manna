import { Amount, CategoryIcon } from "./Amount";
import {
  accentOf,
  findCategory,
  isSameDay,
  parentOf,
  type Category,
  type Txn,
  type Wallet,
} from "./money";

interface TxnListProps {
  txns: Txn[];
  categories: Category[];
  wallets: Wallet[];
  onSelect: (txn: Txn) => void;
  /** Day headings and running day totals — wanted when browsing a month,
   *  noise when the list is already just today. */
  groupByDay?: boolean;
  /** Briefly marked after being logged, so a save you didn't watch happen is
   *  still visible when the sheet closes. */
  highlightId?: string;
  empty?: string;
}

const nameOf = (items: { id: string; name: string }[], id: string | undefined) =>
  items.find((i) => i.id === id)?.name;

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" });
}

/** What a day did to the balance — transfers move money between your own
 *  wallets, so they leave it alone. */
function dayNet(txns: Txn[]): number {
  let net = 0;
  for (const t of txns) {
    if (t.kind === "income") net += t.amountCents;
    else if (t.kind === "expense") net -= t.amountCents;
  }
  return net;
}

/** One surface with dividers, rather than a card per row. A stack of
 *  individually-shadowed cards is what made the old list feel restless — the
 *  shadows competed and nothing grouped. */
export function TxnList({
  txns,
  categories,
  wallets,
  onSelect,
  groupByDay = false,
  highlightId,
  empty = "Nothing here yet.",
}: TxnListProps) {
  if (txns.length === 0) {
    return <p className="py-12 text-center text-umber-700">{empty}</p>;
  }

  if (!groupByDay) {
    return (
      <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
        {txns.map((t, i) => (
          <Row
            key={t.id}
            txn={t}
            categories={categories}
            wallets={wallets}
            onSelect={onSelect}
            first={i === 0}
            highlighted={t.id === highlightId}
          />
        ))}
      </div>
    );
  }

  const days: { key: string; items: Txn[] }[] = [];
  for (const t of txns) {
    const key = t.createdAt.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(t);
    else days.push({ key, items: [t] });
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => {
        const net = dayNet(day.items);
        return (
          <section key={day.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between px-1">
              <h3 className="font-display text-sm font-semibold text-umber-700">
                {dayLabel(day.items[0].createdAt)}
              </h3>
              <Amount cents={net} className="text-sm text-umber-700" />
            </div>
            <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
              {day.items.map((t, i) => (
                <Row
                  key={t.id}
                  txn={t}
                  categories={categories}
                  wallets={wallets}
                  onSelect={onSelect}
                  first={i === 0}
                  highlighted={t.id === highlightId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Row({
  txn,
  categories,
  wallets,
  onSelect,
  first,
  highlighted = false,
}: {
  txn: Txn;
  categories: Category[];
  wallets: Wallet[];
  onSelect: (txn: Txn) => void;
  first: boolean;
  highlighted?: boolean;
}) {
  const transfer = txn.kind === "transfer";
  const from = nameOf(wallets, txn.walletId);
  const categoryId = transfer ? undefined : txn.categoryId;

  const category = findCategory(categories, categoryId);
  const parent = parentOf(categories, categoryId);
  // only worth showing when it isn't the thing already in the title — a
  // transaction logged straight to a bare parent would otherwise say "Food · Food"
  const parentName = parent && parent.id !== category?.id ? parent.name : undefined;

  const title = transfer
    ? `${from ?? "—"} → ${nameOf(wallets, txn.toWalletId) ?? "—"}`
    : (category?.name ?? "Uncategorised");

  const detail = transfer
    ? txn.note || "Transfer"
    : [parentName, from, txn.note].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(txn)}
      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-300 ${
        highlighted ? "bg-sage-500/15" : "hover:bg-clay-200"
      } ${first ? "" : "border-t border-sand-300/50"}`}
    >
      <CategoryIcon
        accent={accentOf(categories, categoryId)}
        name={category?.name}
        transfer={transfer}
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {detail && <span className="block truncate text-sm text-umber-700">{detail}</span>}
      </span>

      <Amount
        cents={txn.amountCents}
        sign={txn.kind === "income" ? "+" : transfer ? "none" : "−"}
        className={`shrink-0 font-display font-semibold ${
          txn.kind === "income" ? "text-sage-500" : transfer ? "text-umber-700" : ""
        }`}
      />
    </button>
  );
}
