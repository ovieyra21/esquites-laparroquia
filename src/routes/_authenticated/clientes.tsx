
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/lib/crm.functions";
import {
    Users, Search, UserPlus, Phone, Mail, Award,
    History, Edit2, Loader2, Save
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({ component: ClientesPage });

function ClientesPage() {
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const queryClient = useQueryClient();
    const { data: customers, isLoading } = useQuery({
        queryKey: ["customers"],
        queryFn: () => crmApi.getCustomers()
    });

    const createMutation = useMutation({
        mutationFn: crmApi.createCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setIsAdding(false);
            toast.success("Cliente registrado con éxito");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: any }) => crmApi.updateCustomer(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setEditingId(null);
            toast.success("Información actualizada");
        }
    });

    const filteredCustomers = customers?.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );

    return (
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="font-display text-4xl mb-2 flex items-center gap-3">
                        <Users className="size-8 text-gold" /> Clientes
                    </h1>
                    <p className="text-muted-foreground text-sm">Gestiona tu base de datos y puntos de lealtad.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-gold hover:bg-gold-soft text-black font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-transform active:scale-95"
                >
                    <UserPlus className="size-5" /> Nuevo Cliente
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full bg-surface-1 border border-border rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-gold outline-none text-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="size-8 animate-spin text-gold" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isAdding && (
                        <CustomerCard
                            isNew
                            onSave={(data: any) => createMutation.mutate(data)}
                            onCancel={() => setIsAdding(false)}
                        />
                    )}
                    {filteredCustomers?.map((c: any) => (
                        <CustomerCard
                            key={c.id}
                            customer={c}
                            isEditing={editingId === c.id}
                            onEdit={() => setEditingId(c.id)}
                            onSave={(updates: any) => updateMutation.mutate({ id: c.id, updates })}
                            onCancel={() => setEditingId(null)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CustomerCard({ customer, isNew, isEditing, onEdit, onSave, onCancel }: any) {
    const [formData, setFormData] = useState(customer || { name: "", phone: "", email: "" });

    return (
        <div className={`rounded-2xl p-5 border transition-all ${isEditing || isNew ? 'bg-surface-2 border-gold ring-1 ring-gold shadow-lg' : 'bg-card border-border hover:border-gold-soft/50'}`}>
            {isEditing || isNew ? (
                <div className="space-y-4">
                    <input
                        autoFocus
                        className="w-full bg-surface-1 border border-border rounded-lg p-2 outline-none focus:border-gold"
                        placeholder="Nombre completo"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            className="bg-surface-1 border border-border rounded-lg p-2 outline-none focus:border-gold"
                            placeholder="Teléfono (10 dígitos)"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <input
                            className="bg-surface-1 border border-border rounded-lg p-2 outline-none focus:border-gold"
                            placeholder="Email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSave(formData)}
                            className="flex-1 bg-gold text-black py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                            <Save className="size-4" /> Guardar
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-surface-1 border border-border rounded-lg text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="font-display text-xl text-gold-soft">{customer.name}</div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {customer.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {customer.phone}</span>}
                            {customer.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {customer.email}</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20 flex items-center gap-2">
                            <Award className="size-3" /> {customer.loyalty_points} pts
                        </div>
                    </div>
                    <button onClick={onEdit} className="p-2 hover:bg-surface-2 rounded-lg text-muted-foreground">
                        <Edit2 className="size-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
