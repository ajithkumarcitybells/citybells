import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompareList, clearCompare } from "@/lib/compare";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLocation } from "wouter";

async function fetchProductWithSource(id: string) {
  try {
    const r = await fetch(`/api/ecom/products/${id}`);
    if (r.ok) {
      const p = await r.json();
      return { product: p, source: "ecom" };
    }
  } catch {}
  try {
    const r = await fetch(`/api/products/${id}`);
    if (r.ok) {
      const p = await r.json();
      return { product: p, source: "grocery" };
    }
  } catch {}
  return null;
}

async function fetchProducts(ids: string[]) {
  const proms = ids.map((id) => fetchProductWithSource(id));
  const results = await Promise.all(proms);
  return results.filter(Boolean) as { product: any; source: "ecom" | "grocery" }[];
}

async function fetchProductsByCategory(categoryId: string | null, source: "ecom" | "grocery") {
  if (!categoryId) return [];
  const url = source === "ecom" ? `/api/ecom/products?category=${encodeURIComponent(categoryId)}` : `/api/products?category=${encodeURIComponent(categoryId)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const storedIds = useMemo(() => getCompareList(), []);
  const [primary, setPrimary] = useState<string | null>(storedIds[0] || null);
  const [secondary, setSecondary] = useState<string | null>(storedIds[1] || null);

  const { data: fetched = [], isLoading } = useQuery({
    queryKey: ["/api/compare", primary, secondary],
    queryFn: () => fetchProducts([primary, secondary].filter(Boolean) as string[]),
    enabled: !!primary,
  });

  const primaryProduct = fetched[0]?.product || null;
  const primarySource = fetched[0]?.source || (fetched.length > 0 ? fetched[0].source : null);

  const { data: categoryProducts = [] } = useQuery({
    queryKey: ["/api/compare/category", primaryProduct?.categoryId, primarySource],
    queryFn: () => fetchProductsByCategory(primaryProduct?.categoryId, primarySource || "ecom"),
    enabled: !!primaryProduct?.categoryId && !!primarySource,
  });

  useEffect(() => {
    if (!primaryProduct || !secondary) return;
    const sec = fetched[1]?.product;
    if (sec && sec.categoryId !== primaryProduct.categoryId) {
      setSecondary(null);
    }
  }, [fetched, primaryProduct, secondary]);

  const secondaryProduct = fetched[1]?.product || null;

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;

  if (!primary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-semibold mb-4">No primary product selected for comparison</h2>
        <Button onClick={() => setLocation('/ecommerce')}>Browse products</Button>
      </div>
    );
  }

  const specsA = primaryProduct?.specifications || {};
  const specsB = secondaryProduct?.specifications || {};
  const allSpecsKeys = new Set<string>();
  if (specsA && typeof specsA === 'object') Object.keys(specsA).forEach(k => allSpecsKeys.add(k));
  if (specsB && typeof specsB === 'object') Object.keys(specsB).forEach(k => allSpecsKeys.add(k));

  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Compare Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => { clearCompare(); window.location.reload(); }}>Clear</Button>
          <Button onClick={() => setLocation(primarySource === 'ecom' ? '/ecommerce' : '/grocery')}>Continue Shopping</Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="font-medium">Primary</div>
          {primaryProduct ? <div>{primaryProduct.name}</div> : <div className="text-sm text-gray-500">Select a primary product</div>}
        </div>
        <div className="flex-1">
          <div className="font-medium">Compare with</div>
          <Select value={secondary ?? "none"} onValueChange={(v) => setSecondary(v === "none" ? null : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder={secondary ? undefined : "Select product in same category"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categoryProducts.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3">Property</th>
              <th className="p-3 text-left border-l">{primaryProduct?.name || '—'}</th>
              <th className="p-3 text-left border-l">{secondaryProduct?.name || '—'}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-50">
              <td className="p-3 font-medium">Image</td>
              <td className="p-3 border-l"><img src={(primaryProduct?.images?.[0] || primaryProduct?.image) || '/placeholder.png'} alt={primaryProduct?.name} className="h-20 object-contain" /></td>
              <td className="p-3 border-l"><img src={(secondaryProduct?.images?.[0] || secondaryProduct?.image) || '/placeholder.png'} alt={secondaryProduct?.name} className="h-20 object-contain" /></td>
            </tr>
            <tr>
              <td className="p-3 font-medium">Price</td>
              <td className="p-3 border-l">₹{primaryProduct ? Math.round(parseFloat(primaryProduct.price)) : '—'}</td>
              <td className="p-3 border-l">₹{secondaryProduct ? Math.round(parseFloat(secondaryProduct.price)) : '—'}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="p-3 font-medium">Rating</td>
              <td className="p-3 border-l">{primaryProduct?.rating || '—'}</td>
              <td className="p-3 border-l">{secondaryProduct?.rating || '—'}</td>
            </tr>
            <tr>
              <td className="p-3 font-medium">Description</td>
              <td className="p-3 border-l">{primaryProduct?.description || '—'}</td>
              <td className="p-3 border-l">{secondaryProduct?.description || '—'}</td>
            </tr>

            {Array.from(allSpecsKeys).map((key) => (
              <tr key={key} className="bg-white">
                <td className="p-3 font-medium">{key}</td>
                <td className="p-3 border-l">{(specsA && specsA[key]) ?? '—'}</td>
                <td className="p-3 border-l">{(specsB && specsB[key]) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
