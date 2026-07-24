import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

/** The add sheet's own keypad.
 *
 *  Not the system keyboard, and that is the whole point: on a phone the system
 *  keyboard slides up over the categories, so you type the amount blind and
 *  then have to dismiss it before you can say what the money was for. A keypad
 *  that is part of the sheet keeps the amount, the note, the wallet and the
 *  categories on screen together — which is what makes the five-second bar
 *  reachable at all.
 *
 *  Purely presentational: the rules for what a key does to the entry string
 *  live in `pressKey` in money.ts, where they can be tested. */
export function Numpad({
  onPress,
  className = "",
}: {
  onPress: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onPress(key)}
          aria-label={key === "del" ? "Delete last digit" : key}
          className={`flex min-h-14 items-center justify-center rounded-tile font-display text-xl font-semibold tabular-nums shadow-soft transition duration-100 active:brightness-95 ${
            key === "." || key === "del"
              ? "bg-clay-200 text-umber-700"
              : "bg-raised text-umber-900"
          }`}
        >
          {key === "del" ? <Delete aria-hidden className="size-5" /> : key}
        </button>
      ))}
    </div>
  );
}
