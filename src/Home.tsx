import { ChevronRight, Plus, Settings as SettingsIcon } from "lucide-react";

import { Button } from "@ui/Button";

import { accentBg, Amount } from "./Amount";
import { captureConfigured } from "./capture";
import { CaptureBox } from "./CaptureBox";
import {
  accentOf,
  allotmentProgress,
  allotmentsRunningHot,
  findCategory,
  formatMoney,
  isSameDay,
  monthlyHistory,
  monthSummary,
  paceVsAverage,
  totalBalance,
  walletBalances,
  type Allotment,
  type Category,
  type Txn,
  type TxnKind,
  type Wallet,
} from "./money";
import { TxnList } from "./TxnList";

/** How far back the pace figure looks. Six points means this month measured
 *  against the five before it. */
const HISTORY_MONTHS = 6;

interface HomeProps {
  txns: Txn[];
  categories: Category[];
  wallets: Wallet[];
  allotments: Allotment[];
  onSelect: (txn: Txn) => void;
  onNavigate: (tab: "month" | "plan") => void;
  onAdd: (kind: TxnKind) => void;
  /** Send a spoken/typed sentence to the parse Worker; resolves once the add
   *  sheet has opened on the resulting draft, rejects if the parse failed. */
  onCapture: (sentence: string) => Promise<void>;
  onSettings: () => void;
  /** The transaction just logged, briefly marked so the save is visible. */
  highlightId?: string;
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The landing screen answers two questions and no others: what can I spend,
 *  and what have I logged today. Everything that needs a rule set up first —
 *  reminders, allotments running hot, the tithe strip — belongs to a later
 *  version and is deliberately absent rather than faked. */
export function Home({
  txns,
  categories,
  wallets,
  allotments,
  onSelect,
  onNavigate,
  onAdd,
  onCapture,
  onSettings,
  highlightId,
}: HomeProps) {
  const now = new Date();
  const month = monthSummary(txns);
  const spendable = totalBalance(walletBalances(txns, wallets));
  const pace = paceVsAverage(monthlyHistory(txns, HISTORY_MONTHS, now));
  const today = txns.filter((t) => isSameDay(t.createdAt, now));
  const hot = allotmentsRunningHot(
    allotments.map((a) => allotmentProgress(a, txns, categories, now)),
  );

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
              {now.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="pt-1 font-display text-2xl font-semibold">{greeting(now)}</h1>
          </div>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings"
            className="flex size-11 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
          >
            <SettingsIcon className="size-5" />
          </button>
        </header>

        <div className="flex flex-col gap-1 rounded-tile bg-balance p-6 text-balance-ink shadow-soft">
          <p className="font-display text-sm font-semibold text-balance-ink/60">Spendable now</p>
          <Amount
            cents={spendable}
            className="font-display text-4xl font-semibold leading-none sm:text-5xl"
          />
          <p className="pt-2 text-sm text-balance-ink/70">
            Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"} · savings
            included
          </p>
        </div>

        {/* The fast path, when it's wired up: say what you spent and confirm on
            the review panel. The centre + and the numpad wizard remain the
            manual and offline way in. */}
        {captureConfigured && <CaptureBox onCapture={onCapture} />}

        <section className="flex flex-col gap-2">
          <h2 className="px-1 font-display text-sm font-semibold text-umber-700">
            {now.toLocaleString("en", { month: "long" })} so far
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="In" cents={month.income} tone="in" />
            <Stat label="Out" cents={month.expense} />
            <Stat label="Net" cents={month.net} />
          </div>

          {pace.hasHistory && (
            <div className="flex items-center justify-between gap-3 rounded-tile bg-clay-100 px-4 py-3 text-sm shadow-soft">
              <span className="text-umber-700">Against your five-month average</span>
              <span
                className={`shrink-0 font-display font-semibold tabular-nums ${
                  pace.better ? "text-sage-500" : "text-accent-rust"
                }`}
              >
                {pace.better ? "↓" : "↑"} <Amount cents={Math.abs(pace.delta)} sign="none" />
              </span>
            </div>
          )}
        </section>

        {/* Only ceilings close to or past their cap reach this list — a Giving
            floor you haven't met yet is the normal state of the month, not an
            alarm, so it stays on Plan where it reads as progress. */}
        {hot.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-display text-sm font-semibold text-umber-700">
              Needs attention
            </h2>
            <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
              {hot.map((p, i) => (
                <button
                  key={p.allotment.id}
                  type="button"
                  onClick={() => onNavigate("plan")}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-clay-200 ${
                    i === 0 ? "" : "border-t border-sand-300/50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-6 w-1 shrink-0 rounded-control ${
                      accentBg[accentOf(categories, p.allotment.categoryId)]
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {findCategory(categories, p.allotment.categoryId)?.name ?? "Deleted category"}
                  </span>
                  <span
                    className={`shrink-0 text-sm tabular-nums ${
                      p.over ? "text-accent-rust" : "text-umber-700"
                    }`}
                  >
                    {p.over
                      ? `Over by ${formatMoney(-p.remainingCents)}`
                      : `${formatMoney(p.remainingCents)} left`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <Button onClick={() => onAdd("expense")} className="hidden gap-2 lg:inline-flex">
          <Plus className="size-4" />
          Log something
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 font-display text-sm font-semibold text-umber-700">Today</h2>

        <TxnList
          txns={today}
          categories={categories}
          wallets={wallets}
          onSelect={onSelect}
          highlightId={highlightId}
          empty="Nothing logged today. It is well."
        />

        {txns.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("month")}
            className="flex min-h-12 items-center justify-center gap-1 rounded-tile border border-sand-300/60 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:bg-clay-100 hover:text-umber-900"
          >
            See the whole month
            <ChevronRight aria-hidden className="size-4" />
          </button>
        )}
      </section>
    </div>
  );
}

function Stat({ label, cents, tone }: { label: string; cents: number; tone?: "in" }) {
  return (
    <div className="rounded-tile bg-clay-100 px-3 py-3 text-center shadow-soft">
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
        {label}
      </p>
      <Amount
        cents={cents}
        sign={tone === "in" ? "none" : "auto"}
        className={`block pt-1.5 font-display font-semibold ${tone === "in" ? "text-sage-500" : ""}`}
      />
    </div>
  );
}
