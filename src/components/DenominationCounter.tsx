import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { fmt } from "@/store/cart";

const DENOMS = [
  { value: 1000, label: "$1,000", type: "billete" },
  { value: 500, label: "$500", type: "billete" },
  { value: 200, label: "$200", type: "billete" },
  { value: 100, label: "$100", type: "billete" },
  { value: 50, label: "$50", type: "billete" },
  { value: 20, label: "$20", type: "billete" },
  { value: 20, label: "$20 mon.", type: "moneda" },
  { value: 10, label: "$10", type: "moneda" },
  { value: 5, label: "$5", type: "moneda" },
  { value: 2, label: "$2", type: "moneda" },
  { value: 1, label: "$1", type: "moneda" },
  { value: 0.5, label: "$0.50", type: "moneda" },
];

export type Breakdown = { value: number; label: string; count: number; subtotal: number }[];

export function DenominationCounter({
  onChange,
  initial,
}: {
  onChange: (total: number, breakdown: Breakdown) => void;
  initial?: Record<string, number>;
}) {
  const [counts, setCounts] = useState<number[]>(() =>
    DENOMS.map((d) => initial?.[`${d.type}-${d.value}-${d.label}`] ?? 0),
  );

  const { total, breakdown } = useMemo(() => {
    const b = DENOMS.map((d, i) => ({
      value: d.value,
      label: d.label,
      count: counts[i] || 0,
      subtotal: (counts[i] || 0) * d.value,
    }));
    return { total: b.reduce((s, r) => s + r.subtotal, 0), breakdown: b };
  }, [counts]);

  useEffect(() => {
    onChange(total, breakdown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const set = (i: number, v: number) =>
    setCounts((p) => p.map((c, j) => (i === j ? Math.max(0, Math.floor(v)) : c)));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-semibold text-muted-foreground px-2">
        <span>Denominación</span>
        <span className="w-24 text-center">Cantidad</span>
        <span className="w-24 text-right">Subtotal</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {DENOMS.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center bg-surface-2 rounded-lg p-2">
            <span className="text-sm font-medium">
              {d.label} <span className="text-[10px] text-muted-foreground capitalize">({d.type})</span>
            </span>
            <Input
              type="number"
              min="0"
              value={counts[i] || ""}
              onChange={(e) => set(i, Number(e.target.value))}
              className="w-24 h-9 text-center"
              placeholder="0"
            />
            <span className="w-24 text-right font-mono text-sm">{fmt(breakdown[i].subtotal)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center bg-gold/10 rounded-lg p-3 border border-gold/30">
        <span className="text-sm font-semibold">Total contado</span>
        <span className="font-display text-2xl gold-text">{fmt(total)}</span>
      </div>
    </div>
  );
}
