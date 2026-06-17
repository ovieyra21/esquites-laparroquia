
import { supabase } from "@/integrations/supabase/client";

export const crmApi = {
    async getCustomers() {
        const { data, error } = await (supabase as any)
            .from("customers")
            .select("*")
            .order("name", { ascending: true });
        if (error) throw error;
        return data;
    },

    async createCustomer(customer: { name: string, phone?: string, email?: string }) {
        const { data, error } = await (supabase as any)
            .from("customers")
            .insert([customer])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateCustomer(id: string, updates: any) {
        const { data, error } = await (supabase as any)
            .from("customers")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async findCustomerByPhone(phone: string) {
        const { data, error } = await (supabase as any)
            .from("customers")
            .select("*")
            .eq("phone", phone)
            .maybeSingle();
        if (error) throw error;
        return data;
    }
};
