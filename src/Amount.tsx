import { glyph, iconFor, IconTransfer, walletIconName } from "./icons";
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

/** A category as a tinted tile, the way a transaction row reads in one glance:
 *  shape first, then the name. The bare dot it replaces carried the same colour
 *  information but gave the eye nothing to land on down a long list.
 *
 *  `icon` and `inherit` are the two halves of `CategoryGlyph` — a parent's own
 *  choice outranks the name match, a family's icon falls in behind it. */
export function CategoryIcon({
  accent,
  name,
  icon,
  inherit,
  transfer = false,
  className = "",
  glyphClassName = "size-5",
}: {
  accent: Accent;
  name?: string;
  /** The key stored on this exact category. Parents only, and authoritative. */
  icon?: string;
  /** The parent's key, for a subcategory. Used only if the name suggests
   *  nothing of its own. */
  inherit?: string;
  /** Transfers have no category, so they get the one fixed glyph instead. */
  transfer?: boolean;
  className?: string;
  /** Set alongside a smaller `className` — the tile and its glyph scale
   *  together, and Tailwind needs both sizes written out. */
  glyphClassName?: string;
}) {
  const Glyph = transfer ? IconTransfer : iconFor(icon, name, inherit);
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-tile ${
        transfer ? "bg-clay-200 text-umber-700" : tile[accent]
      } ${className}`}
    >
      <Glyph className={glyphClassName} />
    </span>
  );
}

/** A wallet's shape, guessed from its name — GCash and Cash are not the same
 *  thing, and a column of identical wallet outlines tells you nothing. Wallets
 *  carry no icon field of their own, so this is pure derivation: rename one and
 *  the glyph follows. */
export function WalletIcon({
  name,
  className = "size-5",
}: {
  name?: string;
  className?: string;
}) {
  const Glyph = glyph(walletIconName(name)).line;
  return <Glyph aria-hidden className={`shrink-0 ${className}`} />;
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
