
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export const analyticsApi = {
    async getDailyStats() {
        const today = startOfDay(new Date()).toISOString();
        const tonight = endOfDay(new Date()).toISOString();

        const { data: sales, error } = await supabase
            .from("sales")
            .select(`
        id,
        total,
        created_at,
        sale_items (
          quantity,
          unit_price,
          unit_cost
        )
      `)
            .is("cancelled", false)
            .gte("created_at", today)
            .lte("created_at", tonight);

        if (error) throw error;

        let revenue = 0;
        let cost = 0;
        const hourlyData: Record<number, number> = {};

        sales?.forEach(sale => {
            revenue += Number(sale.total);
            sale.sale_items?.forEach((item: any) => {
                cost += Number(item.quantity) * Number(item.unit_cost || 0);
            });

            const hour = new Date(sale.created_at!).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + Number(sale.total);
        });

        const chartData = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            ventas: hourlyData[i] || 0
        })).filter(d => d.ventas > 0 || (Number(d.hour.split(":")[0]) >= 9 && Number(d.hour.split(":")[0]) <= 22));

        return {
            revenue,
            cost,
            profit: revenue - cost,
            count: sales?.length || 0,
            chartData
        };
    },

    async getTopProducts() {
        const { data, error } = await supabase
            .from("sale_items")
            .select("product_name, quantity, total")
            .limit(100); // In a real app we'd filter by date and sum in SQL

        if (error) throw error;

        const counts: Record<string, { q: number, t: number }> = {};
        data?.forEach(item => {
            const name = item.product_name!;
            if (!counts[name]) counts[name] = { q: 0, t: 0 };
            counts[name].q += Number(item.quantity);
            counts[name].t += Number(item.total);
        });

        return Object.entries(counts)
            .map(([name, val]) => ({ name, quantity: val.q, total: val.t }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }
};
