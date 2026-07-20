export interface Txn {
  id: string; // crypto.randomUUID()
  kind: "expense" | "income";
  amountCents: number; // integer centavos — never float pesos
  note: string;
  createdAt: string; // ISO
}

/** "1,250.50" → 125050 centavos; null when not a positive amount */
export function parseAmount(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatMoney(cents: number): string {
  return php.format(cents / 100);
}

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

/** Totals for the calendar month containing `now`, in centavos */
export function monthSummary(txns: Txn[], now = new Date()): MonthSummary {
  const year = now.getFullYear();
  const month = now.getMonth();
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    const d = new Date(t.createdAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (t.kind === "income") income += t.amountCents;
    else expense += t.amountCents;
  }
  return { income, expense, net: income - expense };
}
