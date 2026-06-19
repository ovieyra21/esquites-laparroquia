
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
    },

    async getRangeStats(dateFrom: string, dateTo: string) {
        const from = startOfDay(new Date(dateFrom)).toISOString();
        const to = endOfDay(new Date(dateTo)).toISOString();

        const { data: sales, error } = await supabase
            .from("sales")
            .select("id, total, payment_method, created_at, cancelled")
            .gte("created_at", from)
            .lte("created_at", to);

        if (error) throw error;

        const active = (sales ?? []).filter((s) => !s.cancelled);

        let revenue = 0;
        const paymentBreakdown: Record<string, number> = {};
        const dailyMap: Record<string, { revenue: number; count: number }> = {};

        for (const s of active) {
            revenue += Number(s.total ?? 0);
            const method = s.payment_method || "efectivo";
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(s.total ?? 0);
            const day = (s.created_at as string).slice(0, 10);
            if (!dailyMap[day]) dailyMap[day] = { revenue: 0, count: 0 };
            dailyMap[day].revenue += Number(s.total ?? 0);
            dailyMap[day].count += 1;
        }

        // Previous period comparison
        const daysDiff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1;
        const prevFrom = startOfDay(subDays(new Date(dateFrom), daysDiff)).toISOString();
        const prevTo = endOfDay(subDays(new Date(dateTo), daysDiff)).toISOString();

        const { data: prevSales } = await supabase
            .from("sales")
            .select("total, cancelled")
            .gte("created_at", prevFrom)
            .lte("created_at", prevTo);

        const prevActive = (prevSales ?? []).filter((s) => !s.cancelled);
        const prevRevenue = prevActive.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
        const prevCount = prevActive.length;

        return {
            revenue,
            count: active.length,
            avgTicket: active.length > 0 ? revenue / active.length : 0,
            paymentBreakdown: Object.entries(paymentBreakdown)
                .map(([method, total]) => ({ method, total }))
                .sort((a, b) => b.total - a.total),
            dailyData: Object.entries(dailyMap)
                .map(([date, val]) => ({ date: format(new Date(date), "dd/MM"), ...val }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            prevRevenue,
            prevCount,
            revenueChange: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
            countChange: prevCount > 0 ? ((active.length - prevCount) / prevCount) * 100 : null,
        };
    }
};
