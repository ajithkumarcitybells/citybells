import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Star, Clock, ChevronLeft, Plus, Minus, ShoppingBag, Leaf, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodRestaurant, FoodMenuItem } from "@shared/schema";

interface CartEntry {
  item: FoodMenuItem;
  quantity: number;
}

const FOOD_CART_KEY = "citybell_food_cart";

function loadCart(): CartEntry[] {
  try {
    const raw = localStorage.getItem(FOOD_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartEntry[]) {
  localStorage.setItem(FOOD_CART_KEY, JSON.stringify(cart));
}

function MenuItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
}: {
  item: FoodMenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const price = parseFloat(item.price);
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const submittingRef = useRef(false);

  const submitReview = async () => {
    if (!user) { window.location.href = '/auth'; return; }
    if (!rating || rating < 1 || rating > 5) { toast({ title: 'Invalid rating' }); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: item.id, rating, comment }) });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to submit review');
      }
      const data = await res.json();
      toast({ title: 'Review submitted successfully' });
      setOpen(false);
      if (data && typeof data.averageRating !== 'undefined') {
        (item as any).averageRating = data.averageRating;
        (item as any).totalReviews = data.totalReviews || 0;
      }
    } catch (err: any) {
      console.error('submit review error', err);
      toast({ title: 'Failed to submit review', description: err?.message || '' });
    } finally { submittingRef.current = false; }
  };

  function ReviewsDialog({ productId }: { productId: string }) {
    const [openReviews, setOpenReviews] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(5);
    const [sort, setSort] = useState<'latest'|'highest'>('latest');

    const { data, isLoading, refetch } = useQuery<{ summary: { averageRating: number; totalReviews: number }, reviews: any[] }>(
      {
        queryKey: ['reviews', productId, page, limit, sort],
        queryFn: async () => {
          const q = new URLSearchParams({ page: String(page), limit: String(limit), sort });
          const res = await fetch(`/api/reviews/${productId}?${q.toString()}`);
          if (!res.ok) throw new Error('Failed to load reviews');
          return res.json();
        },
        enabled: openReviews,
      }
    );

    return (
      <Dialog open={openReviews} onOpenChange={(v) => { setOpenReviews(v); if (v) refetch(); }}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="w-full">View Reviews</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reviews</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {isLoading && <p>Loading reviews…</p>}
            {!isLoading && data && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{data.summary?.averageRating ?? 0} ★</div>
                    <div className="text-xs text-gray-500">{data.summary?.totalReviews ?? 0} reviews</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(1); refetch(); }} className="text-sm border rounded px-2 py-1">
                      <option value="latest">Latest</option>
                      <option value="highest">Highest</option>
                    </select>
                  </div>
                </div>

                <div className="divide-y">
                  {data.reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
                  {data.reviews.map((r: any) => (
                    <div key={r.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{r.userName || 'Anonymous'}</div>
                        <div className="text-sm text-yellow-500">{r.rating} ★</div>
                      </div>
                      <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                      {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Button size="sm" variant="outline" onClick={() => { if (page > 1) { setPage(p => p - 1); refetch(); } }}>Prev</Button>
                  </div>
                  <div className="text-sm text-gray-600">Page {page}</div>
                  <div>
                    <Button size="sm" onClick={() => { setPage(p => p + 1); refetch(); }}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div
      className="flex gap-3 py-3 border-b border-gray-100 last:border-0"
      id={`menu-item-${item.id}`}
      data-testid={`menu-item-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {item.isVeg ? (
            <div className="w-4 h-4 border-2 border-green-600 rounded-sm flex items-center justify-center flex-shrink-0">
              <CircleDot className="h-2.5 w-2.5 text-green-600" />
            </div>
          ) : (
            <div className="w-4 h-4 border-2 border-red-600 rounded-sm flex items-center justify-center flex-shrink-0">
              <CircleDot className="h-2.5 w-2.5 text-red-600" />
            </div>
          )}
          <h4 className="font-medium text-sm text-gray-800 truncate" data-testid={`text-menu-name-${item.id}`}>
            {item.name}
          </h4>
        </div>
        <p className="text-sm font-semibold text-gray-900" data-testid={`text-menu-price-${item.id}`}>
          ₹{price.toFixed(0)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-800">{(item as any).averageRating ? (item as any).averageRating.toFixed(1) : '0.0'}</span>
          </div>
          <span className="text-xs text-gray-500">{(item as any).totalReviews || 0} reviews</span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
        )}
        <div className="mt-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full">Write a Review</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Write a review</DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-sm font-medium">Your rating</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map((n)=> (
                      <button key={n} aria-label={`Rate ${n}`} onClick={() => setRating(n)} className={`p-1 ${rating>=n ? 'text-yellow-500' : 'text-gray-300'}`}>
                        <Star className="h-6 w-6" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Textarea placeholder="Share your experience…" value={comment} onChange={(e)=>setComment((e.target as HTMLTextAreaElement).value)} />
                </div>
              </div>
              <DialogFooter>
                <div className="w-full flex gap-2">
                  <Button onClick={() => setOpen(false)} variant="outline">Cancel</Button>
                  <Button onClick={submitReview}>Submit</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        {item.image && (
          <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        {quantity === 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="border-orange-500 text-orange-500"
            onClick={onAdd}
            data-testid={`button-add-${item.id}`}
          >
            ADD
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-orange-500 rounded-md px-1">
            <button onClick={onRemove} className="p-1 text-white" data-testid={`button-minus-${item.id}`}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-white text-sm font-semibold min-w-[16px] text-center" data-testid={`text-qty-${item.id}`}>
              {quantity}
            </span>
            <button onClick={onAdd} className="p-1 text-white" data-testid={`button-plus-${item.id}`}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FoodRestaurantPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<CartEntry[]>(loadCart);

  const { data, isLoading } = useQuery<FoodRestaurant & { menu: FoodMenuItem[] }>({
    queryKey: ["/api/food/restaurants", params.id],
  });

  const restaurant = data;
  const menu = data?.menu || [];

  const categories = Array.from(new Set(menu.map((m) => m.category || "Main Course")));

  const filteredMenu = vegOnly ? menu.filter((m) => m.isVeg) : menu;

  const getQty = (itemId: string) => {
    const entry = cart.find((c) => c.item.id === itemId);
    return entry?.quantity || 0;
  };

  const addItem = (item: FoodMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      let next: CartEntry[];
      if (existing) {
        next = prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        next = [...prev, { item, quantity: 1 }];
      }
      saveCart(next);
      return next;
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      let next = prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0);
      saveCart(next);
      return next;
    });
  };

  const cartForRestaurant = restaurant
    ? cart.filter((c) => c.item.restaurantId === restaurant.id)
    : [];
  const cartTotal = cartForRestaurant.reduce(
    (sum, c) => sum + parseFloat(c.item.price) * c.quantity,
    0
  );
  const cartCount = cartForRestaurant.reduce((sum, c) => sum + c.quantity, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-3 mt-6">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Restaurant not found</p>
      </div>
    );
  }

  const rating = parseFloat(restaurant.rating || "4.0");
  const cuisines = (restaurant.cuisine as string[]) || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="relative">
        {restaurant.image ? (
          <div className="aspect-[16/9] max-h-48 overflow-hidden">
            <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[16/9] max-h-48 bg-gradient-to-br from-orange-200 to-red-200" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button
          onClick={() => setLocation("/food")}
          className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full p-2"
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      <div className="px-4 -mt-6 relative z-10 max-w-lg mx-auto">
        <Card className="p-4">
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-restaurant-name">
            {restaurant.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
            </div>
            {restaurant.deliveryTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-500">{restaurant.deliveryTime}</span>
              </div>
            )}
          </div>
          {cuisines.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{cuisines.join(", ")}</p>
          )}
        </Card>
      </div>

      <div className="px-4 mt-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Menu</h2>
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <span className="text-xs text-gray-600">Veg Only</span>
            <Switch
              checked={vegOnly}
              onCheckedChange={setVegOnly}
              data-testid="switch-veg-only"
            />
          </div>
        </div>

        {categories.map((cat) => {
          const items = filteredMenu.filter((m) => (m.category || "Main Course") === cat && m.isAvailable);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2" data-testid={`text-category-${cat}`}>
                {cat} ({items.length})
              </h3>
              <Card className="px-4">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={getQty(item.id)}
                    onAdd={() => addItem(item)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </Card>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full bg-orange-500 border-orange-600 text-white"
              onClick={() => setLocation("/food/cart")}
              data-testid="button-view-cart"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {cartCount} {cartCount === 1 ? "item" : "items"} | ₹{cartTotal.toFixed(0)}
              <span className="ml-auto text-sm">View Cart</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
