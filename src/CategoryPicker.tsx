import { useState } from "react";

import { Sheet } from "@ui/Sheet";

import { CategoryIcon } from "./Amount";
import { IconBack, IconForward } from "./icons";
import {
  parentCategories,
  subcategoriesOf,
  type Accent,
  type Category,
} from "./money";

interface CategoryPickerProps {
  open: boolean;
  categories: Category[];
  forKind: "expense" | "income";
  /** The amount being filed, shown in the header so you can see what you are
   *  about to commit without dismissing the picker. */
  amountLabel: string;
  onPick: (categoryId: string) => void;
  onClose: () => void;
}

/** Every category, two taps deep at most.
 *
 *  Level one is the parents — they fit one screen without scrolling, which is
 *  the reason CLAUDE.md caps them at twelve. Level two is one parent's
 *  subcategories, headed by the escape hatch that matters most: logging to the
 *  bare parent. "A hurried log that gets sorted later beats a log that never
 *  happened," so filing under Food with no subcategory is one tap, not a dead
 *  end you have to think your way out of. */
export function CategoryPicker({
  open,
  categories,
  forKind,
  amountLabel,
  onPick,
  onClose,
}: CategoryPickerProps) {
  const [parent, setParent] = useState<Category | null>(null);

  if (!open) return null;

  const close = () => {
    setParent(null);
    onClose();
  };

  /* Reset the drill-down on the way out as well as on dismiss: the sheet stays
     mounted between uses, so without this a failed save would leave the picker
     reopening halfway into whichever parent was last browsed. */
  const pick = (categoryId: string) => {
    setParent(null);
    onPick(categoryId);
  };

  const parents = parentCategories(categories, forKind);
  const subs = parent ? subcategoriesOf(categories, parent.id) : [];

  return (
    <Sheet open onClose={close} title={parent ? parent.name : "What was it for?"}>
      <div className="-mt-1 mb-2 flex items-center gap-2">
        {parent && (
          <button
            type="button"
            onClick={() => setParent(null)}
            className="-ml-2 flex size-9 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
            aria-label="Back to all categories"
          >
            <IconBack className="size-5" />
          </button>
        )}
        <span className="ml-auto font-display font-semibold tabular-nums text-umber-700">
          {amountLabel}
        </span>
      </div>

      {/* the sheet is capped so a long list scrolls inside it rather than
          pushing the panel past the top of the screen */}
      <div className="max-h-[55dvh] overflow-y-auto">
        {parent ? (
          <>
            <PickRow
              onClick={() => pick(parent.id)}
              accent={parent.accent}
              icon={parent.icon}
              glyphName={parent.name}
              label={`Log to ${parent.name} only`}
              hint="sort it out later"
            />
            {/* Subs show the shape their own name earns, falling back to the
                parent's — so "Dental" gets a tooth under Health rather than a
                column of identical family crests. */}
            {subs.map((sub) => (
              <PickRow
                key={sub.id}
                onClick={() => pick(sub.id)}
                accent={parent.accent}
                inherit={parent.icon}
                glyphName={sub.name}
                label={sub.name}
              />
            ))}
            {subs.length === 0 && (
              <p className="py-6 text-center text-sm text-umber-700">
                No subcategories yet — add them in Settings.
              </p>
            )}
          </>
        ) : (
          parents.map((p) => (
            <PickRow
              key={p.id}
              onClick={() => setParent(p)}
              accent={p.accent}
              icon={p.icon}
              glyphName={p.name}
              label={p.name}
              chevron
            />
          ))
        )}
      </div>
    </Sheet>
  );
}

function PickRow({
  onClick,
  accent,
  icon,
  inherit,
  glyphName,
  label,
  hint,
  chevron = false,
}: {
  onClick: () => void;
  accent: Accent | undefined;
  icon?: string;
  inherit?: string;
  /** The category's real name, which is what the glyph is matched against —
   *  separate from `label`, because the bare-parent row reads "Log to Food
   *  only" and matching on that sentence would find nothing. */
  glyphName?: string;
  label: string;
  hint?: string;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-sand-300/50 px-1 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-clay-200"
    >
      {accent && (
        <CategoryIcon accent={accent} name={glyphName} icon={icon} inherit={inherit} />
      )}
      <span className="min-w-0 flex-1 truncate">
        {label}
        {hint && <span className="text-umber-700"> — {hint}</span>}
      </span>
      {chevron && <IconForward aria-hidden className="size-4 shrink-0 text-umber-700" />}
    </button>
  );
}
