import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { data } from "@data/local";
import { Button } from "@ui/Button";
import { Card } from "@ui/Card";
import { Input } from "@ui/Input";
import { relativeTime } from "@ui/time";

import { formatMoney, monthSummary, parseAmount, type Txn } from "./money";

const NS = "finances"; // === storageNamespace in the manifest

const kinds = [
  { value: "expense", label: "Spent" },
  { value: "income", label: "Received" },
] as const;

export default function Finances() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [kind, setKind] = useState<Txn["kind"]>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    const all = await data.list<Txn>(NS);
    setTxns(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const amountCents = parseAmount(amount);
    if (amountCents === null) return;
    await data.put<Txn>(NS, {
      id: crypto.randomUUID(),
      kind,
      amountCents,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    setAmount("");
    setNote("");
    await refresh();
  }

  async function remove(id: string) {
    await data.remove(NS, id);
    await refresh();
  }

  const month = monthSummary(txns);
  const monthName = new Date().toLocaleString("en", { month: "long" });

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="font-display text-2xl font-semibold">Manna</h1>

      <Card className="flex items-end justify-between">
        <div>
          <p className="font-display font-semibold text-umber-700">{monthName}</p>
          <p className="mt-1 text-sm text-umber-700">
            <span className="text-sage-500">+{formatMoney(month.income)}</span>
            {"  ·  "}
            <span>−{formatMoney(month.expense)}</span>
          </p>
        </div>
        <p className="font-display text-2xl font-semibold">
          {month.net < 0 ? "−" : ""}
          {formatMoney(Math.abs(month.net))}
        </p>
      </Card>

      <Card>
        <form onSubmit={(e) => void add(e)} className="flex flex-col gap-3">
          <div className="flex rounded-control bg-clay-200 p-1">
            {kinds.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`min-h-11 flex-1 rounded-control font-display font-semibold transition-colors duration-150 ${
                  kind === k.value ? "bg-clay-50 text-umber-900 shadow-soft" : "text-umber-700"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <Input
            inputMode="decimal"
            placeholder="Amount (₱)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount in pesos"
          />
          <Input
            placeholder="For what? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Note"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={parseAmount(amount) === null}>
              Add
            </Button>
          </div>
        </form>
      </Card>

      {txns.length === 0 ? (
        <p className="py-10 text-center text-umber-700">Nothing logged yet. It is well.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {txns.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate">{t.note || (t.kind === "expense" ? "Expense" : "Income")}</p>
                <p className="text-sm text-umber-700">{relativeTime(t.createdAt)}</p>
              </div>
              <p className={`shrink-0 font-display font-semibold ${t.kind === "income" ? "text-sage-500" : ""}`}>
                {t.kind === "income" ? "+" : "−"}
                {formatMoney(t.amountCents)}
              </p>
              <button
                aria-label="Delete transaction"
                onClick={() => void remove(t.id)}
                className="flex size-11 shrink-0 items-center justify-center rounded-control text-umber-700 transition-colors duration-150 hover:bg-clay-200 hover:text-umber-900"
              >
                <Trash2 className="size-5" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
