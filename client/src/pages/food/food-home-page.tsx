import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Star, Clock, ChevronLeft, ChevronRight, Leaf, UtensilsCrossed,
  Zap, Tag, Salad, Drumstick, Percent, Flame, Coffee, Pizza, Soup
} from "lucide-react";
import { Mic } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import ComboCarousel from "@/components/ComboCarousel";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodRestaurant } from "@shared/schema";

const quickActions = [
  { label: "Restaurants", icon: UtensilsCrossed, filter: "All", bg: "from-orange-400 to-orange-500" },
  { label: "Express", icon: Zap, filter: "Fast Food", bg: "from-yellow-400 to-amber-500" },
  { label: "Veg Only", icon: Leaf, filter: "veg", bg: "from-green-400 to-emerald-500" },
  { label: "Non-Veg", icon: Drumstick, filter: "non-veg", bg: "from-red-400 to-rose-500" },
  { label: "Healthy", icon: Salad, filter: "Healthy", bg: "from-teal-400 to-green-500" },
  { label: "Offers", icon: Tag, filter: "offers", bg: "from-purple-400 to-violet-500" },
];

const cuisineFilters = [
  "All", "North Indian", "South Indian", "Chinese", "Italian",
  "Fast Food", "Biryani", "Pizza", "Desserts", "Beverages",
  "Japanese", "Thai", "Mughlai", "Tandoor", "Sushi",
];

const popularCuisines = [
  { label: "Biryani", icon: Flame, bg: "bg-orange-50", color: "text-orange-600" },
  { label: "Pizza", icon: Pizza, bg: "bg-red-50", color: "text-red-600" },
  { label: "Chinese", icon: Soup, bg: "bg-yellow-50", color: "text-yellow-700" },
  { label: "South Indian", icon: Coffee, bg: "bg-green-50", color: "text-green-600" },
  { label: "Desserts", icon: UtensilsCrossed, bg: "bg-pink-50", color: "text-pink-600" },
  { label: "Fast Food", icon: Zap, bg: "bg-amber-50", color: "text-amber-600" },
];

function HeroBanner() {
  const slides = [
    { title: "50% OFF", subtitle: "On Your First Order", bg: "from-orange-500 to-red-500", accent: "Use code: WELCOME50" },
    { title: "FREE DELIVERY", subtitle: "On Orders Above ₹199", bg: "from-emerald-500 to-teal-600", accent: "No minimum distance" },
    { title: "LATE NIGHT?", subtitle: "Order Till 2 AM", bg: "from-indigo-500 to-purple-600", accent: "Midnight cravings sorted" },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-xl" data-testid="food-hero-banner">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((s, i) => (
          <div key={i} className={`min-w-full aspect-[2.5/1] bg-gradient-to-r ${s.bg} flex flex-col justify-center px-5`}>
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{s.accent}</span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{s.title}</h2>
            <p className="text-xs text-white/90 mt-0.5">{s.subtitle}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} data-testid={`button-food-banner-dot-${i}`} />
        ))}
          </div>
    </div>
  );
}

function QuickActionStrip({ onFilter, active }: { onFilter: (f: string) => void; active: string | null }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide" data-testid="food-quick-actions">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onFilter(action.filter)}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
          data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all ${active === action.filter ? "ring-2 ring-orange-400 ring-offset-2 bg-gradient-to-br " + action.bg : "bg-gradient-to-br " + action.bg}`}>
            <action.icon className="h-6 w-6 text-white" />
          </div>
          <span className={`text-[10px] font-medium whitespace-nowrap ${active === action.filter ? "text-orange-600" : "text-gray-600"}`}>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function OffersRow() {
  const offers = [
    { text: "Up to 60% Off", sub: "On top restaurants", bg: "from-orange-500 to-red-400" },
    { text: "Free Delivery", sub: "On first 3 orders", bg: "from-blue-500 to-indigo-500" },
    { text: "Buy 1 Get 1", sub: "On selected items", bg: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide" data-testid="food-offers-row">
      {offers.map((offer, i) => (
        <div key={i} className={`flex-shrink-0 w-36 rounded-xl bg-gradient-to-br ${offer.bg} p-3 cursor-pointer`} data-testid={`card-food-offer-${i}`}>
          <Tag className="h-4 w-4 text-white/80 mb-1" />
          <p className="text-sm font-bold text-white leading-tight">{offer.text}</p>
          <p className="text-[10px] text-white/80 mt-0.5">{offer.sub}</p>
        </div>
      ))}
    </div>
  );
}

function SpotlightSection({ restaurants }: { restaurants: FoodRestaurant[] }) {
  const spotlight = restaurants
    .filter((r) => r.isActive && parseFloat(r.rating || "0") >= 4.3)
    .sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"))
    .slice(0, 4);

  if (spotlight.length === 0) return null;

  return (
    <div data-testid="food-spotlight-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-bold text-gray-800">In the Spotlight</h2>
        </div>
        <span className="text-xs text-orange-500 font-medium cursor-pointer" data-testid="link-see-all-spotlight">SEE ALL</span>
      </div>
      <div className="space-y-3">
        {spotlight.map((r) => {
          const rating = parseFloat(r.rating || "4.0");
          const cuisines = (r.cuisine as string[]) || [];
          const discountPercent = Math.floor(Math.random() * 30) + 20;

          return (
            <Link key={r.id} href={`/food/restaurant/${r.id}`}>
              <div className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 cursor-pointer" data-testid={`card-spotlight-${r.id}`}>
                <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  {r.image ? (
                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600 to-transparent px-1.5 py-1">
                    <span className="text-[9px] font-bold text-white">{discountPercent}% OFF</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-800 truncate" data-testid={`text-spotlight-name-${r.id}`}>{r.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{cuisines.join(", ")}</p>
                  {r.address && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{r.address}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5 bg-green-600 text-white rounded px-1.5 py-0.5">
                      <Star className="h-2.5 w-2.5 fill-white" />
                      <span className="text-[10px] font-bold">{rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">•</span>
                    <span className="text-[10px] text-gray-500">{r.deliveryTime}</span>
                    <span className="text-[10px] text-gray-400">•</span>
                    <span className="text-[10px] text-gray-500">₹{parseFloat(r.minOrder || "99").toFixed(0)} for two</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Tag className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] text-blue-500 font-medium">Free Delivery</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RestaurantsYouLove({ restaurants }: { restaurants: FoodRestaurant[] }) {
  const loved = restaurants.filter((r) => r.isActive).slice(0, 8);
  if (loved.length === 0) return null;

  return (
    <div data-testid="food-restaurants-you-love">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-bold text-gray-800">Restaurants You Love</h2>
        </div>
        <Link href="#all-restaurants" className="text-xs text-orange-500 font-medium flex items-center gap-0.5" data-testid="link-see-all-restaurants">
          See All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        {loved.map((r) => {
          const discountPercent = Math.floor(Math.random() * 30) + 15;
          return (
            <Link key={r.id} href={`/food/restaurant/${r.id}`}>
              <div className="flex-shrink-0 w-32 cursor-pointer" data-testid={`card-loved-${r.id}`}>
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  {r.image ? (
                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100" />
                  )}
                  <div className="absolute top-2 left-0 bg-blue-600 rounded-r-md px-1.5 py-0.5">
                    <span className="text-[9px] font-bold text-white">{discountPercent}% OFF</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <div className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-white" />
                      <span className="text-[10px] text-white font-medium">{r.deliveryTime}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-800 mt-1.5 truncate" data-testid={`text-loved-name-${r.id}`}>{r.name}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CouponsSection() {
  const coupons = [
    { code: "NEW DEALS DAILY", text: "GET 60% OFF", bg: "bg-orange-500" },
    { code: "MISSED YOU", text: "GET 50% OFF", bg: "bg-purple-500" },
    { code: "TRYNEW", text: "GET 50% OFF", bg: "bg-teal-500" },
  ];

  return (
    <div data-testid="food-coupons-section">
      <h2 className="text-base font-bold text-gray-800 mb-3">Coupons For You</h2>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
        {coupons.map((c, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-28 cursor-pointer" data-testid={`card-coupon-${i}`}>
            <div className={`w-16 h-16 rounded-full ${c.bg} flex items-center justify-center shadow-md`}>
              <Percent className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-tight">{c.code}</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PopularCuisines({ onFilter }: { onFilter: (cuisine: string) => void }) {
  return (
    <div data-testid="food-popular-cuisines">
      <h2 className="text-base font-bold text-gray-800 mb-3">Popular Cuisines</h2>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
        {popularCuisines.map((c) => (
          <button
            key={c.label}
            onClick={() => onFilter(c.label)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            data-testid={`button-cuisine-pop-${c.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className={`w-14 h-14 rounded-full ${c.bg} flex items-center justify-center`}>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
            <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: FoodRestaurant }) {
  const rating = parseFloat(restaurant.rating || "4.0");
  const cuisines = (restaurant.cuisine as string[]) || [];

  return (
    <Link href={`/food/restaurant/${restaurant.id}`}>
      <Card className="overflow-hidden border-gray-100 cursor-pointer" data-testid={`card-restaurant-${restaurant.id}`}>
        <div className="relative aspect-[2/1] bg-gray-100">
          {restaurant.image ? (
            <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100" />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm" data-testid={`text-restaurant-name-${restaurant.id}`}>
                {restaurant.name}
              </h3>
              <div className="flex items-center gap-0.5 bg-green-600 rounded px-1.5 py-0.5">
                <Star className="h-2.5 w-2.5 fill-white text-white" />
                <span className="text-[10px] font-bold text-white">{rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          {restaurant.deliveryTime && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-[10px] font-semibold text-gray-700" data-testid={`text-delivery-time-${restaurant.id}`}>
                {restaurant.deliveryTime}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            {cuisines.length > 0 && (
              <p className="text-xs text-gray-500 line-clamp-1 flex-1">{cuisines.join(", ")}</p>
            )}
            {restaurant.minOrder && (
              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">₹{parseFloat(restaurant.minOrder).toFixed(0)} min</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function FoodHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [, setLocation] = useLocation();

  const { data: restaurants = [], isLoading } = useQuery<FoodRestaurant[]>({
    queryKey: ["/api/food/restaurants"],
  });

  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  const handleQuickFilter = (filter: string) => {
    if (activeQuickAction === filter) {
      setActiveQuickAction(null);
      setSelectedCuisine("All");
    } else {
      setActiveQuickAction(filter);
      if (filter === "All" || filter === "veg" || filter === "non-veg" || filter === "offers") {
        setSelectedCuisine("All");
      } else {
        setSelectedCuisine(filter);
      }
    }
  };

  const filtered = restaurants.filter((r) => {
    if (!r.isActive) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.name.toLowerCase().includes(q);
      const cuisineMatch = ((r.cuisine as string[]) || []).some((c) =>
        c.toLowerCase().includes(q)
      );
      if (!nameMatch && !cuisineMatch) return false;
    }
    if (selectedCuisine !== "All") {
      const cuisines = (r.cuisine as string[]) || [];
      if (!cuisines.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase())))
        return false;
    }
    return true;
  });

  // Voice recognition refs/state
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    // keep in ref, will be created on demand per start
    setVoiceSupported(true);
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch (e:any) { console.error(e); }
    };
  }, []);

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setVoiceStatus("Voice search not supported");
      return;
    }
    try {
      const r = new SpeechRecognition();
      recognitionRef.current = r;
      r.interimResults = false;
      r.lang = 'en-IN';
      r.maxAlternatives = 1;

      r.onstart = () => {
        setListening(true);
        setVoiceStatus("Listening...");
      };

      r.onresult = (ev: any) => {
        const transcript = Array.from(ev.results).map((res: any) => res[0].transcript).join(' ').trim();
        if (transcript) {
          setSearchQuery(transcript);
          setVoiceStatus(`Search updated to ${transcript}`);
        } else {
          setVoiceStatus("Couldn't hear clearly, try again");
        }
      };

      r.onerror = (err: any) => {
        console.error('Speech recognition error', err);
        setVoiceStatus("Couldn't hear clearly, try again");
      };

      r.onend = () => {
        setListening(false);
        // clear status after short delay
        setTimeout(() => setVoiceStatus(null), 2500);
      };

      r.start();
    } catch (err) {
      console.error('startVoice error', err);
      setVoiceStatus("Couldn't start voice recognition");
      setListening(false);
    }
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch (e:any) { console.error(e); }
    setListening(false);
    setVoiceStatus(null);
  };

  // debounce search suggestions
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q) { setSuggestions([]); setShowSuggestions(false); setSelectedIndex(-1); return; }
    // cached results
    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) { setSuggestions(cached); setShowSuggestions(true); return; }
    const id = setTimeout(async () => {
      try {
        const url = `/api/search?q=${encodeURIComponent(q)}&limit=8`;
        const res = await fetch(url);
        if (!res.ok) { setSuggestions([]); setShowSuggestions(false); return; }
        const data = await res.json();
        cacheRef.current.set(q.toLowerCase(), data);
        setSuggestions(data || []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('search suggestions error', err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const onSelectSuggestion = (item: any) => {
    setSearchQuery(item.name || '');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // navigate depending on item type
    if (item.type === 'restaurant') {
      setLocation(`/food/restaurant/${item.id}`);
      return;
    }
    if (item.type === 'item' && item.restaurantId) {
      setLocation(`/food/restaurant/${item.restaurantId}#menu-item-${item.id}`);
      return;
    }
    // fallback: open generic product route
    setLocation(`/product/${item.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) onSelectSuggestion(suggestions[selectedIndex]);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Food Delivery</h1>
            <p className="text-xs text-gray-500">Order from your favourite restaurants</p>
          </div>
          <Link href="/food/orders" className="text-xs font-medium text-orange-500" data-testid="link-food-orders">
            My Orders
          </Link>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-5">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search restaurants or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="pl-10 pr-14 bg-white border-gray-200"
            data-testid="input-food-search"
            aria-label="Search restaurants or cuisines"
            aria-autocomplete="list"
            aria-controls="food-search-suggestions"
          />
          <button
            type="button"
            onClick={() => {
              if (!voiceSupported) return;
              if (listening) stopVoice(); else startVoice();
            }}
            title={voiceSupported ? (listening ? 'Stop voice search' : 'Search by voice') : 'Voice search not supported'}
            aria-label="Search food using voice"
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ${listening ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600'} focus:outline-none`} 
            style={{ minWidth: 44, minHeight: 44 }}
            disabled={!voiceSupported}
          >
            <Mic className={`h-5 w-5`} />
          </button>
          <div aria-live="polite" className="sr-only">{voiceStatus}</div>
          {voiceStatus && (
            <div className="mt-2 text-sm text-gray-600" role="status" aria-live="polite">{voiceStatus}</div>
          )}
          {showSuggestions && (
            <div id="food-search-suggestions" role="listbox" aria-label="Search suggestions" className="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-lg z-50 overflow-hidden">
              {suggestions.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No items found</div>
              ) : (
                suggestions.map((s, idx) => {
                  const q = (searchQuery || '').trim();
                  const name = s.name || '';
                  const lc = name.toLowerCase();
                  const pos = lc.indexOf(q.toLowerCase());
                  const before = pos >= 0 ? name.slice(0, pos) : name;
                  const match = pos >= 0 ? name.slice(pos, pos + q.length) : '';
                  const after = pos >= 0 ? name.slice(pos + q.length) : '';
                  return (
                    <button
                      key={s.id}
                      role="option"
                      aria-selected={selectedIndex === idx}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-50 ${selectedIndex === idx ? 'bg-gray-100' : ''}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onMouseLeave={() => setSelectedIndex(-1)}
                      onClick={() => onSelectSuggestion(s)}
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        {s.image ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {before}<span className="font-bold">{match}</span>{after}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.type === 'restaurant' ? 'Restaurant' : (s.price ? `₹${parseFloat(String(s.price)).toFixed(0)}` : '')}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </form>

        <QuickActionStrip onFilter={handleQuickFilter} active={activeQuickAction} />

        <HeroBanner />

        <OffersRow />

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[2/1]" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <ComboCarousel />
            <SpotlightSection restaurants={restaurants} />

            <RestaurantsYouLove restaurants={restaurants} />

            <CouponsSection />

            <PopularCuisines onFilter={(cuisine) => setSelectedCuisine(cuisine)} />

            <div id="all-restaurants">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-800" data-testid="text-all-restaurants-heading">All Restaurants</h2>
                <span className="text-xs text-gray-400">{filtered.length} places</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {cuisineFilters.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCuisine(c)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedCuisine === c
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                    data-testid={`button-cuisine-${c.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium" data-testid="text-no-restaurants">No restaurants found</p>
                  <p className="text-gray-400 text-sm mt-1">Try a different search or cuisine</p>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  {filtered.map((r) => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
