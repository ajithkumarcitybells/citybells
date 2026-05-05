import { useState } from "react";
import { AdminLayout } from "./index";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminCombosPage() {
  const { toast } = useToast();
  const { data: combos = [] } = useQuery<any[]>({ queryKey: ['/api/combos'], queryFn: async () => { const res = await fetch('/api/combos'); if (!res.ok) throw new Error('Failed'); return res.json(); } });
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/food/menu'],
    queryFn: async () => {
      const res = await fetch('/api/admin/food/menu');
      if (!res.ok) throw new Error('Failed to fetch food menu');
      return res.json();
    }
  });

  const [name, setName] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [totalPrice, setTotalPrice] = useState("");
  const [discount, setDiscount] = useState<number>(0);

  const createCombo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/combos', { name, items, totalPrice, discount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/combos'] });
      setName(''); setItems([]); setTotalPrice(''); setDiscount(0);
      toast({ title: 'Combo created' });
    },
    onError: (err: any) => toast({ title: 'Failed to create combo', description: err?.message || String(err), variant: 'destructive' }),
  });

  const addItem = () => setItems((s) => [...s, { productId: products[0]?.id || '', quantity: 1 }]);
  const updateItem = (idx: number, v: Partial<{ productId: string; quantity: number }>) => setItems(s => s.map((it,i)=> i===idx ? { ...it, ...v } : it));
  const removeItem = (idx: number) => setItems(s => s.filter((_,i)=>i!==idx));

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Combos</h1>
          <div className="text-sm text-gray-500">Create and manage combo packs</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Combo name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Total price (e.g. 249.00)" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} />
            <Input placeholder="Discount %" value={String(discount)} onChange={(e) => setDiscount(Number(e.target.value || 0))} />
          </div>

          <div className="mt-4 space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select onValueChange={(v) => updateItem(idx, { productId: v })} value={it.productId}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => {
                      const pid = p.id || p._id || p._id?.toString?.() || '';
                      const title = p.name || p.title || p.menuName || `${p.id || p._id}`;
                      return <SelectItem key={pid} value={pid}>{title}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Input className="w-32" type="number" value={String(it.quantity)} onChange={(e)=> updateItem(idx, { quantity: Number(e.target.value || 1) })} />
                <Button variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
              </div>
            ))}
            <div>
              <Button onClick={addItem}>Add Item</Button>
            </div>
          </div>

            <div className="mt-4">
              <Button onClick={() => createCombo.mutate()} disabled={(createCombo as any).isLoading || !name || items.length === 0}>Create Combo</Button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Available Food Items</h3>
              {products.length === 0 ? (
                <div className="text-sm text-gray-500">No food items found. Make sure you're logged in as an admin.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {products.map((p: any) => (
                    <div key={p.id || p._id} className="p-2 border rounded-md bg-white">
                      <div className="font-medium">{p.name || p.title || p.menuName}</div>
                      <div className="text-sm text-gray-500">Price: {p.price || p.priceText || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <div className="space-y-3">
          {combos.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-500">Items: {Array.isArray(c.items) ? c.items.length : 0} • Price: {c.totalPrice} • Discount: {c.discount || 0}%</div>
              </div>
              <div>
                <Button size="sm" onClick={async () => {
                  try { await apiRequest('POST', `/api/combos/${c._id || c.id}/add-to-cart`); toast({ title: 'Combo added to cart' }); } catch (e) { toast({ title: 'Failed to add combo', variant: 'destructive' }); }
                }}>Add to cart</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
