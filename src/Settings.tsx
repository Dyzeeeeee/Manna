import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { CategoryEditor } from "./CategoryEditor";
import type { Allotment, Category, Recurring, Wallet } from "./money";
import { AllotmentEditor, RecurringEditor } from "./RuleEditors";

/* Categories, Recurring, Allotments, General — and deliberately not Considering.
   A to-buy is not a rule, it is a thing you are weighing this month, so it is
   added and dropped on Plan where you look at it. */
const TABS = [
  { value: "categories", label: "Categories" },
  { value: "recurring", label: "Recurring" },
  { value: "allotments", label: "Allotments" },
  { value: "general", label: "General" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/** Settings holds the rules; Plan only shows their status.
 *
 *  That split is why every editor lives here and nothing on Plan writes a
 *  template or a cap — Plan approves, skips and lets go, and the rules behind
 *  those decisions are changed on this screen. */
export function Settings({
  categories,
  wallets,
  recurring,
  allotments,
  onBack,
}: {
  categories: Category[];
  wallets: Wallet[];
  recurring: Recurring[];
  allotments: Allotment[];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start py-1 font-display text-sm font-semibold text-umber-700 transition-colors duration-150 hover:text-umber-900"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Back
      </button>

      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={`min-h-9 shrink-0 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
              tab === t.value
                ? "bg-sage-500 text-clay-50"
                : "bg-clay-100 text-umber-700 hover:bg-clay-200 hover:text-umber-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoryEditor categories={categories} />}

      {tab === "recurring" && (
        <RecurringEditor recurring={recurring} categories={categories} wallets={wallets} />
      )}

      {tab === "allotments" && (
        <AllotmentEditor allotments={allotments} categories={categories} />
      )}

      {tab === "general" && <General />}
    </div>
  );
}

function General() {
  return (
    <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
      <Row title="Currency" sub="Philippine Peso" value="₱" />
      <Row title="Manna" sub="Version 0.1 · offline-first" />
    </div>
  );
}

function Row({ title, sub, value }: { title: string; sub: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-sand-300/50 px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate">{title}</p>
        <p className="truncate text-sm text-umber-700">{sub}</p>
      </div>
      {value && <span className="shrink-0 font-display font-semibold">{value}</span>}
    </div>
  );
}

