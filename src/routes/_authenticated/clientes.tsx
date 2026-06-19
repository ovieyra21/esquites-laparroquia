import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Search, UserPlus, Phone, Mail, Award,
  History, Edit2, Loader2, Save, ShoppingBag, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/clientes")({ component: ClientesPage });

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => crmApi.getCustomers(),
  });

  // Customer purchase stats
  const { data: customerStats } = useQuery({
    queryKey: ["customer-purchase-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("customer_id, total, created_at")
        .not("customer_id", "is", null)
        .eq("cancelled", false);

      if (error || !data) return {} as Record<string, { count: number; total: number; lastVisit: string }>;

      const map: Record<string, { count: number; total: number; lastVisit: string }> = {};
      for (const s of data) {
        if (!map[s.customer_id]) map[s.customer_id] = { count: 0, total: 0, lastVisit: s.created_at };
        map[s.customer_id].count += 1;
        map[s.customer_id].total += Number(s.total ?? 0);
        if (s.created_at > map[s.customer_id].lastVisit) map[s.customer_id].lastVisit = s.created_at;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: crmApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsAdding(false);
      toast.success("Cliente registrado con éxito");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => crmApi.updateCustomer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditingId(null);
      toast.success("Información actualizada");
    },
  });

  const filteredCustomers = (customers ?? []).filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl flex items-center gap-3">
            <Users className="size-8 text-gold" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm">
            {customers?.length ?? 0} clientes registrados
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-gold hover:bg-gold-soft text-black font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
        >
          <UserPlus className="size-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-gold outline-none text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="size-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isAdding && (
            <CustomerCard
              isNew
              onSave={(data: any) => createMutation.mutate(data)}
              onCancel={() => setIsAdding(false)}
            />
          )}
          {filteredCustomers.map((c: any) => {
            const stats = customerStats?.[c.id];
            return (
              <CustomerCard
                key={c.id}
                customer={c}
                stats={stats}
                isEditing={editingId === c.id}
                isExpanded={expandedId === c.id}
                onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onEdit={() => setEditingId(c.id)}
                onSave={(updates: any) => updateMutation.mutate({ id: c.id, updates })}
                onCancel={() => setEditingId(null)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomerCard({
  customer, stats, isNew, isEditing, isExpanded, onToggleExpand, onEdit, onSave, onCancel,
}: any) {
  const [formData, setFormData] = useState(customer || { name: "", phone: "", email: "" });

  if (isEditing || isNew) {
    return (
      <div className="rounded-2xl p-5 border-2 border-gold bg-surface-2 ring-1 ring-gold shadow-lg">
        <div className="space-y-3">
          <input
            autoFocus
            className="w-full bg-surface border border-border rounded-lg p-2 outline-none focus:border-gold text-sm"
            placeholder="Nombre completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-surface border border-border rounded-lg p-2 outline-none focus:border-gold text-sm"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <input
              className="bg-surface border border-border rounded-lg p-2 outline-none focus:border-gold text-sm"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSave(formData)} className="flex-1 bg-gold text-black py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm">
              <Save className="size-4" /> Guardar
            </button>
            <button onClick={onCancel} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card hover:border-gold/30 transition">
      {/* Main row */}
      <button onClick={onToggleExpand} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg gold-text truncate">{customer.name}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {customer.phone && (
                <span className="flex items-center gap-1"><Phone className="size-3" /> {customer.phone}</span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1"><Mail className="size-3" /> {customer.email}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="bg-gold/10 text-gold px-2.5 py-1 rounded-full text-xs font-bold border border-gold/20 flex items-center gap-1.5">
                <Award className="size-3" /> {customer.loyalty_points} pts
              </div>
              {stats && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {stats.count} compras · {fmt(stats.total)}
                </div>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 hover:bg-surface-2 rounded-lg text-muted-foreground">
              <Edit2 className="size-4" />
            </button>
          </div>
        </div>
      </button>

      {/* Expanded: stats detail */}
      {isExpanded && stats && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="grid grid-cols-3 gap-3 pt-3">
            <MiniStat icon={ShoppingBag} label="Compras" value={String(stats.count)} />
            <MiniStat icon={DollarSign} label="Total gastado" value={fmt(stats.total)} />
            <MiniStat icon={Calendar} label="Última visita" value={formatDistanceToNow(new Date(stats.lastVisit), { addSuffix: true, locale: es })} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-2.5 text-center">
      <Icon className="size-3.5 mx-auto text-gold mb-1" />
      <div className="text-xs font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
