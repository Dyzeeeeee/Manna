import { useState } from "react";

import { CategoryEditor } from "./CategoryEditor";
import { glyph, IconBack, IconSettings, type Icon } from "./icons";
import { isSameDay, type Allotment, type Category, type Recurring, type Wallet } from "./money";
import { AllotmentEditor, RecurringEditor } from "./RuleEditors";

/* Categories, Recurring, Allotments, General — and deliberately not Considering.
   A to-buy is not a rule, it is a thing you are weighing this month, so it is
   added and dropped on Plan where you look at it. */
const TABS = [
  { value: "categories", label: "Categories", icon: glyph("tag").line },
  { value: "recurring", label: "Recurring", icon: glyph("calendar").line },
  { value: "allotments", label: "Allotments", icon: glyph("scales").line },
  { value: "general", label: "General", icon: IconSettings },
] as const;

type Tab = (typeof TABS)[number]["value"];

const IconCurrency = glyph("coins").line;
const IconApp = glyph("leaf").line;

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
        <IconBack aria-hidden className="size-4" />
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
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
              tab === t.value
                ? "bg-sage-500 text-clay-50"
                : "bg-clay-100 text-umber-700 hover:bg-clay-200 hover:text-umber-900"
            }`}
          >
            <t.icon aria-hidden className="size-4" />
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

/** When this build was made, in words rather than an ISO string — "today" and
 *  "yesterday" are what you actually want to read when the question is whether
 *  the app updated. */
function builtLabel(iso: string): string {
  const built = new Date(iso);
  if (Number.isNaN(built.getTime())) return "unknown";
  const time = built.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  const now = new Date();
  if (isSameDay(built, now)) return `today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(built, yesterday)) return `yesterday ${time}`;
  return built.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

/** Which build you are actually running.
 *
 *  Here because the service worker updates itself silently: a stale build looks
 *  exactly like a fresh one, so this is the only way to tell whether a change
 *  has reached the installed app. The version answers "which release"; the
 *  commit and build time answer "did it land", which is the question you are
 *  usually asking — a version number only moves when someone bumps it. */
function Build() {
  const built = builtLabel(__APP_BUILT_AT__);
  return (
    <Row
      icon={IconApp}
      title="Manna"
      sub={`Version ${__APP_VERSION__} · built ${built}`}
      value={__APP_COMMIT__ || undefined}
    />
  );
}

function General() {
  return (
    <div className="overflow-hidden rounded-tile bg-clay-100 shadow-soft">
      <Row icon={IconCurrency} title="Currency" sub="Philippine Peso" value="₱" />
      <Build />
    </div>
  );
}

function Row({
  icon: Glyph,
  title,
  sub,
  value,
}: {
  icon: Icon;
  title: string;
  sub: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-sand-300/50 px-5 py-4 last:border-b-0">
      <Glyph aria-hidden className="size-5 shrink-0 text-umber-700" />
      <div className="min-w-0 flex-1">
        <p className="truncate">{title}</p>
        <p className="truncate text-sm text-umber-700">{sub}</p>
      </div>
      {/* tabular figures because one of these values is a commit sha, where
          proportional digits make a 7-character string hard to compare */}
      {value && <span className="shrink-0 font-display font-semibold tabular-nums">{value}</span>}
    </div>
  );
}

