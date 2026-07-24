import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Amount } from "./Amount";

interface BalanceCardProps {
  label: string;
  cents: number;
  income?: number;
  expense?: number;
}

/** The one dark surface in the app, and the only place the eye is told to land
 *  first. Everything else on clay is deliberately quiet — without a single
 *  focal point, a screen of equal-weight cream cards has no hierarchy at all. */
export function BalanceCard({ label, cents, income, expense }: BalanceCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-tile bg-balance p-6 text-balance-ink shadow-soft">
      <p className="font-display text-sm font-semibold text-balance-ink/60">{label}</p>

      <Amount
        cents={cents}
        className="font-display text-4xl font-semibold leading-none sm:text-5xl"
      />

      {(income !== undefined || expense !== undefined) && (
        <div className="flex gap-5 text-sm">
          {income !== undefined && (
            <span className="flex items-center gap-1.5">
              <ArrowDownLeft aria-hidden className="size-4 text-sage-500" />
              <Amount cents={income} sign="none" className="text-balance-ink/80" />
            </span>
          )}
          {expense !== undefined && (
            <span className="flex items-center gap-1.5">
              <ArrowUpRight aria-hidden className="size-4 text-balance-ink/50" />
              <Amount cents={expense} sign="none" className="text-balance-ink/80" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
