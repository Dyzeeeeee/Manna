import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { accentBg, Amount, CategoryDot } from "./Amount";
import { FilterChips } from "./FilterChips";
import {
  accentOf,
  filterByKind,
  findCategory,
  formatMoney,
  monthKey,
  monthLabel,
  monthlyHistory,
  monthsWithActivity,
  monthSummary,
  paceVsAverage,
  parentBreakdown,
  shiftMonth,
  UNCATEGORISED,
  type Category,
  type KindFilter,
  type MonthPoint,
  type Txn,
  type Wallet,
} from "./money";
import { TxnList } from "./TxnList";

const HISTORY_MONTHS = 6;

interface MonthProps {
  txns: Txn[];
  categories: Category[];
  wallets: Wallet[];
  onSelect: (txn: Txn) => void;
}

export function Month({ txns, categories, wallets, onSelect }: MonthProps) {
  const [key, setKey] = useState(() => monthKey(new Date()));
  const [filter, setFilter] = useState<KindFilter>("all");

  /* Stepping is contiguous between the oldest month holding anything and this
     one — skipping empty months would make the arrows feel broken. */
  const active = monthsWithActivity(txns);
  const newest = active[0];
  const oldest = active[active.length - 1];

  const when = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1);
  const summary = monthSummary(txns, when);
  const breakdown = parentBreakdown(txns, categories, when);
  const inMonth = txns.filter((t) => monthKey(t.createdAt) === key);

  const history = monthlyHistory(txns, HISTORY_MONTHS, when);
  const pace = paceVsAverage(history);

  const out = breakdown.reduce((sum, row) => sum + row.totalCents, 0);
  const largest = breakdown[0]?.totalCents ?? 0;

  const nameOf = (id: string) =>
    id === UNCATEGORISED ? "Uncategorised" : (findCategory(categories, id)?.name ?? "Deleted");

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[24rem_1fr] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <ArrowButton
            label="Previous month"
            disabled={key <= oldest}
            onClick={() => setKey(shiftMonth(key, -1))}
          >
            <ChevronLeft className="size-5" />
          </ArrowButton>
          <h2 className="font-display text-lg font-semibold">{monthLabel(key)}</h2>
          <ArrowButton
            label="Next month"
            disabled={key >= newest}
            onClick={() => setKey(shiftMonth(key, 1))}
          >
            <ChevronRight className="size-5" />
          </ArrowButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Total label="In" cents={summary.income} tone="in" />
          <Total label="Out" cents={summary.expense} />
          <Total label="Net" cents={summary.net} wide />
        </div>

        <section className="flex flex-col gap-3 rounded-tile bg-clay-100 p-4 shadow-soft">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-umber-700">Last six months</h3>
            <div className="flex gap-3 text-xs text-umber-700">
              <Key swatch="bg-sage-500" label="In" />
              <Key swatch="bg-accent-gold" label="Out" />
            </div>
          </div>

          <HistoryChart history={history} />

          {pace.hasHistory && (
            <div className="flex items-center justify-between gap-3 border-t border-sand-300/50 pt-3 text-sm">
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

        {breakdown.length > 0 && (
          <section className="flex flex-col gap-1 rounded-tile bg-clay-100 p-5 shadow-soft">
            <h3 className="pb-1 font-display text-sm font-semibold text-umber-700">
              Where it went
            </h3>
            {breakdown.map((row) => (
              <div
                key={row.parentId}
                className="flex flex-col gap-2 border-b border-sand-300/50 py-3 last:border-b-0"
              >
                <div className="flex items-baseline gap-2">
                  <CategoryDot accent={accentOf(categories, row.parentId)} />
                  <span className="min-w-0 flex-1 truncate font-display font-semibold">
                    {nameOf(row.parentId)}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-umber-700">
                    {out > 0 ? Math.round((row.totalCents / out) * 100) : 0}%
                  </span>
                  <Amount cents={row.totalCents} sign="none" className="shrink-0 font-semibold" />
                </div>

                <div className="h-1.5 overflow-hidden rounded-control bg-clay-200">
                  <div
                    className={`h-full rounded-control transition-[width] duration-200 ease-out ${
                      accentBg[accentOf(categories, row.parentId)]
                    }`}
                    style={{ width: `${largest > 0 ? (row.totalCents / largest) * 100 : 0}%` }}
                  />
                </div>

                {/* the subcategory line — what the parent total is actually made
                    of, which is the question a ranked bar always provokes */}
                <p className="truncate text-xs text-umber-700">
                  {row.subs
                    .map((sub) => `${nameOf(sub.categoryId)} ${formatMoney(sub.totalCents)}`)
                    .join("  ·  ")}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <FilterChips value={filter} onChange={setFilter} className="px-1" />
        <TxnList
          txns={filterByKind(inMonth, filter)}
          categories={categories}
          wallets={wallets}
          onSelect={onSelect}
          groupByDay
          empty={filter === "all" ? "Nothing this month." : "Nothing of that kind this month."}
        />
      </section>
    </div>
  );
}

/* ── the chart ─────────────────────────────────────────────────────────────
   Hand-drawn SVG rather than a charting library: six pairs of bars is a few
   lines of arithmetic, and a dependency would cost more in bundle than the
   whole screen. Colours come through as CSS variables so the chart follows the
   light/dark theme with nothing to re-render. */

const W = 340;
const H = 150;
const LABELS = 22; // room under the plot for the month names
const SCALE = 0.92; // headroom so the tallest bar doesn't touch the ceiling

function HistoryChart({ history }: { history: MonthPoint[] }) {
  const plot = H - LABELS;
  const max = Math.max(...history.map((p) => Math.max(p.income, p.expense)), 1);
  const slot = W / history.length;
  const width = Math.min(15, slot / 3.2);
  const gap = 3;

  const height = (cents: number) => plot * (cents / max) * SCALE;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="Money in and out over the last six months"
    >
      {[0.5, 1].map((fraction) => (
        <line
          key={fraction}
          x1={0}
          x2={W}
          y1={plot - plot * fraction * SCALE}
          y2={plot - plot * fraction * SCALE}
          className="stroke-sand-300"
          strokeWidth={1}
        />
      ))}

      {history.map((point, i) => {
        const centre = slot * i + slot / 2;
        const current = i === history.length - 1;
        return (
          <g key={point.key}>
            <rect
              x={centre - width - gap / 2}
              y={plot - height(point.income)}
              width={width}
              height={height(point.income)}
              rx={2.5}
              className="fill-sage-500"
            />
            <rect
              x={centre + gap / 2}
              y={plot - height(point.expense)}
              width={width}
              height={height(point.expense)}
              rx={2.5}
              className="fill-accent-gold"
              opacity={current ? 1 : 0.72}
            />
            <text
              x={centre}
              y={H - 6}
              textAnchor="middle"
              fontSize={10}
              className={current ? "fill-umber-900" : "fill-umber-700"}
            >
              {new Date(Number(point.key.slice(0, 4)), Number(point.key.slice(5)) - 1).toLocaleString(
                "en",
                { month: "short" },
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Key({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2 rounded-control ${swatch}`} />
      {label}
    </span>
  );
}

function Total({
  label,
  cents,
  tone,
  wide = false,
}: {
  label: string;
  cents: number;
  tone?: "in";
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-tile bg-clay-100 px-4 py-3 shadow-soft ${
        wide ? "col-span-2 flex items-center justify-between" : ""
      }`}
    >
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-umber-700">
        {label}
      </p>
      <Amount
        cents={cents}
        sign={tone === "in" ? "none" : "auto"}
        className={`font-display text-lg font-semibold ${wide ? "" : "block pt-1"} ${
          tone === "in" ? "text-sage-500" : ""
        }`}
      />
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-100 hover:text-umber-900 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
