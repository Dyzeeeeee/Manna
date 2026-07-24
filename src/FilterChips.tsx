import type { KindFilter } from "./money";

const options: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

/** Pills rather than the segmented track used for the tabs. Filtering what
 *  you're looking at and choosing what you're about to write are different
 *  acts, and giving them the same control made them read as one control. */
export function FilterChips({
  value,
  onChange,
  className = "",
}: {
  value: KindFilter;
  onChange: (next: KindFilter) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Filter transactions" className={`flex gap-2 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded-control px-4 font-display text-sm font-semibold transition-colors duration-150 ${
              selected
                ? "bg-sage-500 text-clay-50"
                : "bg-clay-100 text-umber-700 hover:bg-clay-200 hover:text-umber-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
