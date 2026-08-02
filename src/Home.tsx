import { Button } from "@ui/Button";

import { Amount, CategoryIcon } from "./Amount";
import {
  glyph,
  IconAdd,
  IconAssistant,
  IconForward,
  IconIn,
  IconOut,
  IconSettings,
  NAV_GLYPHS,
  type Icon,
} from "./icons";
import {
  accentOf,
  allotmentProgress,
  allotmentsRunningHot,
  findCategory,
  formatMoney,
  glyphOf,
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
import { stewiConfigured } from "./stewiClient";
import { TxnList } from "./TxnList";

const IconWallets = NAV_GLYPHS.wallets.line;
const IconMonth = NAV_GLYPHS.month.line;
const IconNet = glyph("scales").line;
const IconAlert = glyph("clock").line;
const IconToday = glyph("calendar").line;

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
  /** Falls back to the manual wizard when Stewi isn't configured. */
  onAdd: (kind: TxnKind) => void;
  /** Opens Stewi's overlay. */
  onOpenStewi: () => void;
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
  onOpenStewi,
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
            className="flex size-11 shrink-0 items-center justify-center rounded-control border border-white/10 bg-clay-200/40 text-umber-700 backdrop-blur-lg transition-colors duration-150 hover:bg-clay-200/70 hover:text-umber-900"
          >
            <IconSettings className="size-5" />
          </button>
        </header>

        <div className="relative flex flex-col gap-1 overflow-hidden rounded-tile bg-balance/92 p-6 text-balance-ink shadow-glass backdrop-blur-xl">
          {/* the sheen: a glass pane catching light along its top edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/10 to-transparent"
          />
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-balance-ink/60">
            <IconWallets aria-hidden className="size-4" />
            Spendable now
          </p>
          <Amount
            cents={spendable}
            className="font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl"
          />
          <p className="pt-2 text-sm text-balance-ink/70">
            Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"} · savings
            included
          </p>
        </div>

        {/* Stewi's launcher, when it's wired up: the fast path in is a
            conversation, not a kind picker. The centre + opens the same
            overlay from any tab; the numpad wizard stays reachable from
            Stewi's own empty state as the offline/manual way in. */}
        {stewiConfigured && <StewiLauncher onOpen={onOpenStewi} />}

        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 px-1 font-display text-sm font-semibold text-umber-700">
            <IconMonth aria-hidden className="size-4" />
            {now.toLocaleString("en", { month: "long" })} so far
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="In" cents={month.income} icon={IconIn} tone="in" />
            <Stat label="Out" cents={month.expense} icon={IconOut} />
            <Stat label="Net" cents={month.net} icon={IconNet} />
          </div>

          {pace.hasHistory && (
            <div className="flex items-center justify-between gap-3 rounded-tile border border-white/15 bg-raised/42 px-4 py-3 text-sm shadow-glass backdrop-blur-lg">
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
            <h2 className="flex items-center gap-1.5 px-1 font-display text-sm font-semibold text-umber-700">
              <IconAlert aria-hidden className="size-4" />
              Needs attention
            </h2>
            <div className="overflow-hidden rounded-tile border border-white/15 bg-raised/42 shadow-glass backdrop-blur-lg">
              {hot.map((p, i) => {
                const { own, inherited } = glyphOf(categories, p.allotment.categoryId);
                const category = findCategory(categories, p.allotment.categoryId);
                return (
                  <button
                    key={p.allotment.id}
                    type="button"
                    onClick={() => onNavigate("plan")}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-clay-200/40 ${
                      i === 0 ? "" : "border-t border-sand-300/40"
                    }`}
                  >
                    <CategoryIcon
                      accent={accentOf(categories, p.allotment.categoryId)}
                      name={category?.name}
                      icon={own}
                      inherit={inherited}
                      className="size-8"
                      glyphClassName="size-4"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {category?.name ?? "Deleted category"}
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
                );
              })}
            </div>
          </section>
        )}

        <Button onClick={() => onAdd("expense")} className="hidden gap-2 lg:inline-flex">
          <IconAdd className="size-4" />
          {stewiConfigured ? "Talk to Stewi" : "Log something"}
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 px-1 font-display text-sm font-semibold text-umber-700">
          <IconToday aria-hidden className="size-4" />
          Today
        </h2>

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
            className="flex min-h-12 items-center justify-center gap-1 rounded-tile border border-white/15 bg-raised/40 font-display text-sm font-semibold text-umber-700 backdrop-blur-lg transition-colors duration-150 hover:bg-raised/70 hover:text-umber-900"
          >
            See the whole month
            <IconForward aria-hidden className="size-4" />
          </button>
        )}
      </section>
    </div>
  );
}

/** The teaser that opens Stewi's overlay — styled like the chat bubble it
 *  leads into, so tapping it reads as starting a conversation rather than
 *  opening a form. */
function StewiLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 rounded-tile border border-sage-500/25 bg-sage-500/12 p-3 text-left shadow-glass backdrop-blur-lg transition duration-150 hover:bg-sage-500/18 active:brightness-95"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-500 text-clay-50"
      >
        <IconAssistant className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-sage-500">Ask Stewi</span>
        <span className="block truncate text-sm text-umber-700">
          Tell me what happened, or ask about your month
        </span>
      </span>
      <IconForward aria-hidden className="size-4 shrink-0 text-umber-700" />
    </button>
  );
}

function Stat({
  label,
  cents,
  icon: Glyph,
  tone,
}: {
  label: string;
  cents: number;
  icon: Icon;
  tone?: "in";
}) {
  return (
    <div className="rounded-tile border border-white/15 bg-raised/42 px-3 py-3 text-center shadow-glass backdrop-blur-lg">
      <p className="flex items-center justify-center gap-1 font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
        <Glyph aria-hidden className="size-3.5" />
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
