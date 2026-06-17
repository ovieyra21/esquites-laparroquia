
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { fmt } from "@/store/cart";

const BILLS = [1000, 500, 200, 100, 50, 20];
const COINS = [20, 10, 5, 2, 1, 0.5];

export type Breakdown = Record<string, number>;

interface Props {
    onTotalChange: (total: number) => void;
    onBreakdownChange: (breakdown: Breakdown) => void;
    initialBreakdown?: Breakdown;
}

export function DenominationCounter({ onTotalChange, onBreakdownChange, initialBreakdown = {} }: Props) {
    const [breakdown, setBreakdown] = useState<Breakdown>(initialBreakdown);

    useEffect(() => {
        const total = Object.entries(breakdown).reduce((acc, [den, qty]) => acc + (parseFloat(den) * qty), 0);
        onTotalChange(total);
        onBreakdownChange(breakdown);
    }, [breakdown]);

    const updateQty = (den: number, val: string) => {
        const qty = parseInt(val) || 0;
        setBreakdown(prev => ({ ...prev, [den.toString()]: qty }));
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Billetes</h3>
                <div className="grid grid-cols-2 gap-3">
                    {BILLS.map(b => (
                        <div key={b} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
                            <div className="w-12 text-sm font-bold text-gold">${b}</div>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-center bg-surface-2"
                                value={breakdown[b.toString()] || ""}
                                onChange={e => updateQty(b, e.target.value)}
                            />
                            <div className="w-20 text-right text-[10px] font-mono text-muted-foreground">
                                {fmt((breakdown[b.toString()] || 0) * b)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Monedas</h3>
                <div className="grid grid-cols-2 gap-3">
                    {COINS.map(c => (
                        <div key={c} className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
                            <div className="w-12 text-sm font-bold text-gold-soft">${c}</div>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-9 text-center bg-surface-2"
                                value={breakdown[c.toString()] || ""}
                                onChange={e => updateQty(c, e.target.value)}
                            />
                            <div className="w-20 text-right text-[10px] font-mono text-muted-foreground">
                                {fmt((breakdown[c.toString()] || 0) * c)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="text-sm font-bold uppercase">Total calculado:</span>
                <span className="text-2xl font-display font-black gold-text">
                    {fmt(Object.entries(breakdown).reduce((acc, [den, qty]) => acc + (parseFloat(den) * qty), 0))}
                </span>
            </div>
        </div>
    );
}
