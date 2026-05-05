import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type RecItem = { id: string; name: string; image?: string | null; price?: any; rating?: number | string | null };

export default function RecommendationSections() {
  const [data, setData] = useState<{ recommended: RecItem[]; frequentlyBoughtTogether: RecItem[]; similar: RecItem[]; trending: RecItem[]; popularNearby?: RecItem[] } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let es: EventSource | null = null;
    const load = async () => {
      try {
        const res = await fetch('/api/recommendations/personalized', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e:any) { console.error(e); }

      try {
        es = new EventSource('/api/recommendations/stream');
        es.addEventListener('recommendations', (ev: any) => {
          try { const parsed = JSON.parse(ev.data); setData(parsed); } catch (e:any) { console.error(e); }
        });
        es.onerror = () => {
          // reconnect will be handled by browser; do nothing
        };
      } catch (e:any) { console.error(e); }
    };
    load();
    return () => { if (es) es.close(); };
  }, []);

  if (!data) return null;

  const Row = ({ title, items }: { title: string; items: RecItem[] }) => (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No recommendations yet.</div>
        ) : (
          items.map((it) => (
              <Link
              key={it.id}
              href={`/product/${it.id}`}
              className="flex-shrink-0 w-44 snap-start"
              data-product-id={it.id}
              onClick={async () => {
                try {
                  await fetch('/api/recommendations/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'click', productId: it.id }) });
                } catch (e:any) { toast({ title: 'Failed to track click' }); }
              }}
            >
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm p-2 h-full">
                <div className="aspect-square bg-gray-50 flex items-center justify-center mb-2">
                  {it.image ? <img loading="lazy" src={it.image} alt={it.name} className="object-contain h-full w-full" /> : <div className="w-full h-full bg-gray-100" />}
                </div>
                <div className="text-sm font-medium text-gray-800 truncate">{it.name}</div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {it.price && <div className="text-sm text-primary">₹{parseFloat(it.price || 0).toFixed(2)}</div>}
                    {it.rating != null && <div className="text-xs text-gray-500">⭐ {it.rating}</div>}
                  </div>
                  <div>
                    <button
                      className="bg-primary text-white px-3 py-1 rounded text-xs"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: it.id, quantity: 1 }), credentials: 'include' });
                          if (res.ok) {
                            toast({ title: 'Added to cart' });
                          } else if (res.status === 401) {
                            toast({ title: 'Please login to add to cart' });
                          } else {
                            const text = await res.text().catch(() => res.statusText);
                            toast({ title: 'Failed to add to cart', description: text, variant: 'destructive' });
                          }
                        } catch (err:any) { toast({ title: 'Failed to add to cart', description: err?.message, variant: 'destructive' }); }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );

  // Impression tracking via IntersectionObserver
  useEffect(() => {
    if (!data) return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const pid = el.getAttribute('data-product-id');
          if (pid && !seen.has(pid)) {
            seen.add(pid);
            try {
              await fetch('/api/recommendations/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'impression', productId: pid }) });
            } catch (e:any) { console.error(e); }
          }
        }
      });
    }, { threshold: 0.5 });

    const nodes = Array.from(document.querySelectorAll('[data-product-id]')) as HTMLElement[];
    nodes.forEach(n => observer.observe(n));
    return () => {
      observer.disconnect();
    };
  }, [data]);

  return (
    <div>
      <Row title="Recommended For You" items={data.recommended} />
      <Row title="Popular Near You" items={data.popularNearby || []} />
      <Row title="Frequently Bought Together" items={data.frequentlyBoughtTogether} />
      <Row title="You May Also Like" items={data.similar} />
      <Row title="Trending Now" items={data.trending} />
    </div>
  );
}
