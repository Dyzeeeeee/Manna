import {
  ArrowRightLeft,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { formatMoney, type Accent } from "./money";

/* Tailwind only emits classes it can see written out, so these have to be
   literal strings rather than `bg-accent-${accent}`. */
/** Accent → background class. Exported because bars and swatches elsewhere need
 *  the same colour a dot would use, and Tailwind can only see class names
 *  written out in full. */
export const accentBg: Record<Accent, string> = {
  sage: "bg-accent-sage",
  clay: "bg-accent-clay",
  ochre: "bg-accent-ochre",
  moss: "bg-accent-moss",
  indigo: "bg-accent-indigo",
  plum: "bg-accent-plum",
  rust: "bg-accent-rust",
  teal: "bg-accent-teal",
  olive: "bg-accent-olive",
  rose: "bg-accent-rose",
  slate: "bg-accent-slate",
  gold: "bg-accent-gold",
};

/* Same reason, and the tint is the accent at low opacity so a column of tiles
   still reads as one muted family rather than a dozen saturated blocks. */
const tile: Record<Accent, string> = {
  sage: "bg-accent-sage/15 text-accent-sage",
  clay: "bg-accent-clay/15 text-accent-clay",
  ochre: "bg-accent-ochre/15 text-accent-ochre",
  moss: "bg-accent-moss/15 text-accent-moss",
  indigo: "bg-accent-indigo/15 text-accent-indigo",
  plum: "bg-accent-plum/15 text-accent-plum",
  rust: "bg-accent-rust/15 text-accent-rust",
  teal: "bg-accent-teal/15 text-accent-teal",
  olive: "bg-accent-olive/15 text-accent-olive",
  rose: "bg-accent-rose/15 text-accent-rose",
  slate: "bg-accent-slate/15 text-accent-slate",
  gold: "bg-accent-gold/15 text-accent-gold",
};

/** The colour that tells one category from another down a list. */
export function CategoryDot({ accent, className = "" }: { accent: Accent; className?: string }) {
  return (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-control ${accentBg[accent]} ${className}`}
    />
  );
}

/* Matched on the category's name rather than stored against its id: categories
   are free text you can rename or invent, so there's no icon field to keep in
   sync and a brand-new "Groceries" gets the right glyph on sight. First hit
   wins, so order matters — "gift" must beat the broader money words. */
const glyphs: [RegExp, LucideIcon][] = [
  [/food|grocer|eat|meal|restaurant|coffee|snack|market|dining|delivery|water refill/i, UtensilsCrossed],
  [/transport|fare|bus|jeep|taxi|grab|fuel|gas|commut|parking|toll|registr|maintenance/i, Bus],
  [/rent|electric|water|lpg|household|housing|repair/i, House],
  [/bill|utilit|internet|wifi|cable/i, Receipt],
  [/phone|load|mobile|sim|subscription|software|domain|device|tech/i, Smartphone],
  [/health|medic|doctor|pharma|hospital|dental|clinic|fitness|consult/i, HeartPulse],
  [/cloth|shirt|wear|apparel/i, Shirt],
  [/groom|personal care|beauty|salon|barber/i, Sparkles],
  [/giving|tithe|church|donat|offering|charity|alm|sponsor|hospitality|family support/i, HandHeart],
  [/gift|present/i, Tag],
  [/book|read/i, BookOpen],
  [/school|tuition|educ|course|class|learn|material/i, GraduationCap],
  [/entertain|travel|outing|hobby|leisure|movie|game/i, Ticket],
  [/loan|installment|interest|fee|tax|insurance|financial|debt/i, Landmark],
  [/tool|equipment|license|work/i, Briefcase],
  [/saving|invest|fund|emergency|passive|dividend|rental/i, PiggyBank],
  [/shop|store|purchase/i, ShoppingBag],
  [/salary|pay|wage|income|bonus|allowance|earned|business|sales|commission|refund|resale/i, Banknote],
];

function glyphFor(name: string | undefined): LucideIcon {
  if (!name) return Tag;
  for (const [pattern, icon] of glyphs) if (pattern.test(name)) return icon;
  return Tag;
}

/** A category as a tinted tile, the way a transaction row reads in one glance:
 *  shape first, then the name. The bare dot it replaces carried the same colour
 *  information but gave the eye nothing to land on down a long list. */
export function CategoryIcon({
  accent,
  name,
  transfer = false,
  className = "",
}: {
  accent: Accent;
  name?: string;
  /** Transfers have no category, so they get the one fixed glyph instead. */
  transfer?: boolean;
  className?: string;
}) {
  const Glyph = transfer ? ArrowRightLeft : glyphFor(name);
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-tile ${
        transfer ? "bg-clay-200 text-umber-700" : tile[accent]
      } ${className}`}
    >
      <Glyph className="size-5" />
    </span>
  );
}

interface AmountProps {
  cents: number;
  /** "auto" prefixes − when negative; "+"/"−" force it regardless of value. */
  sign?: "auto" | "+" | "−" | "none";
  className?: string;
}

/** Money, always in tabular figures.
 *
 *  Proportional digits are the reason a column of amounts looks ragged — a 1 is
 *  narrower than a 0, so nothing lines up and the eye can't compare magnitudes
 *  down the list. `tabular-nums` is the whole fix. */
export function Amount({ cents, sign = "auto", className = "" }: AmountProps) {
  const prefix =
    sign === "auto" ? (cents < 0 ? "−" : "") : sign === "none" ? "" : sign;
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatMoney(Math.abs(cents))}
    </span>
  );
}
