import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ComboCarousel() {
  const { data: combos = [] } = useQuery<any[]>({ queryKey: ['/api/combos'], queryFn: async () => { const res = await fetch('/api/combos'); if (!res.ok) throw new Error('Failed'); return res.json(); } });
  const { data: menuItems = [] } = useQuery<any[]>({ queryKey: ['/api/food/menu'], queryFn: async () => { const res = await fetch('/api/food/menu'); if (!res.ok) return []; return res.json(); } });
  const { toast } = useToast();

  if (!combos || combos.length === 0) return null;

  const menuMap = new Map<string,string>();
  (menuItems || []).forEach((m:any) => menuMap.set(m.id || m._id, m.name || m.title || ''));

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Combo Packs</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {combos.map((c: any) => (
          <div key={c.id || c._id} className="flex-shrink-0 w-72 bg-white rounded-xl p-3 border border-gray-100">
            <div className="font-medium mb-1">{c.name}</div>
            <div className="text-sm text-gray-500 mb-2">{Array.isArray(c.items) ? c.items.map((it:any)=> menuMap.get(it.productId) || it.productId).join(', ') : ''}</div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-primary">₹{c.totalPrice}</div>
              <div>
                <Button size="sm" onClick={async () => { try { await apiRequest('POST', `/api/combos/${c._id || c.id}/add-to-cart`); toast({ title: 'Combo added to cart' }); } catch (e:any) { toast({ title: 'Failed to add combo', description: e?.message, variant: 'destructive' }); } }}>Add Combo</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
