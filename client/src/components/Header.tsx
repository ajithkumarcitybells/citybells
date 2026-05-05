import { ShoppingCart, Search, User } from "lucide-react";
import { Bell, Mic } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AddressPicker } from "./AddressPicker";
import Announcer from "./Announcer";
import { CartItemWithProduct, EcomCartItemWithProduct } from "@shared/schema";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";
import { Input } from "@/components/ui/input";
import { useRef, useState, useEffect } from "react";
import { registerServiceWorker, subscribeForPush, sendSubscriptionToServer } from '@/lib/push';

function useCartContext() {
  const [location] = useLocation();

  if (location.startsWith("/ecommerce")) {
    return { queryKey: "/api/ecom/cart" as const, cartPath: "/ecommerce/cart" };
  }
  if (location.startsWith("/food")) {
    return { queryKey: null, cartPath: "/food/cart" };
  }
  return { queryKey: "/api/cart" as const, cartPath: "/cart" };
}

export function Header() {
  const { user } = useAuth();
  const { queryKey, cartPath } = useCartContext();
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [onlyFast, setOnlyFast] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [ariaMessage, setAriaMessage] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const speechRef = useRef<any>(null);

  const { data: groceryCart = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user && queryKey === "/api/cart",
  });

  const { data: ecomCart = [] } = useQuery<EcomCartItemWithProduct[]>({
    queryKey: ["/api/ecom/cart"],
    enabled: !!user && queryKey === "/api/ecom/cart",
  });

  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!user,
  });

  // debounce search suggestions
  useEffect(() => {
    const q = (search || transcript || '').trim();
    if (!q) { setSuggestions([]); setShowSuggestions(false); return; }
    const id = setTimeout(async () => {
      try {
        const url = `/api/search/products?q=${encodeURIComponent(q)}${onlyFast ? '&fastDelivery=1' : ''}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.slice(0, 8));
        setSelectedIndex(-1);
        setShowSuggestions(true);
      } catch (err) {
        console.error('search suggestions error', err);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [search, transcript]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark read");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark notification read");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setPushEnabled(true);
  }, []);

  async function enablePush() {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        alert('Please enable notifications in your browser settings');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;

      const reg = await registerServiceWorker();
      if (!reg) return;

      const vapidRes = await fetch('/api/notifications/vapid');
      if (!vapidRes.ok) return;
      const { publicKey } = await vapidRes.json();
      if (!publicKey) return;

      const sub = await subscribeForPush(reg, publicKey);
      if (!sub) return;

      const ok = await sendSubscriptionToServer(sub);
      if (ok) setPushEnabled(true);
    } catch (err) {
      console.error('enablePush error', err);
    }
  }

  const cartCount = queryKey === "/api/ecom/cart"
    ? ecomCart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : queryKey === "/api/cart"
      ? groceryCart.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm safe-area-pt">
      <div className="flex items-center gap-3 px-3 py-2">
        <Announcer />
        <div className="flex items-center gap-2 flex-shrink-0">
          <AddressPicker />
        </div>

        <div className="flex-1">
          <div className="relative max-w-2xl mx-auto">
            <Input
              value={search || transcript}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setTranscript(''); }}
              placeholder="Search for fruits, milk, snacks…"
              className="pl-10 pr-12 rounded-full"
              onKeyDown={(e) => {
                // keyboard navigation for suggestions
                if (showSuggestions && suggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.min((i === -1 ? -1 : i) + 1, suggestions.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(i => Math.max((i === -1 ? suggestions.length : i) - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter') {
                    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                      e.preventDefault();
                      const s = suggestions[selectedIndex];
                      // navigate according to source (ecom -> ecommerce route)
                      if (s?.source === 'ecom' || s?.source === 'ecommerce') {
                        setLocation(`/ecommerce/product/${s.id}`);
                      } else {
                        setLocation(`/product/${s.id}`);
                      }
                      setShowSuggestions(false);
                      setSelectedIndex(-1);
                      return;
                    }
                    // fallback: go to grocery search page
                    setLocation(`/grocery?search=${encodeURIComponent(search || transcript)}`);
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }
                } else {
                  if (e.key === 'Enter') {
                    setLocation(`/grocery?search=${encodeURIComponent(search || transcript)}`);
                  }
                }
              }}
              data-testid="input-header-search"
              aria-label="Search for products"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

            <div className="absolute left-0 right-0 mt-12 px-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs bg-white/80 p-1 rounded shadow-sm">
                <input type="checkbox" checked={onlyFast} onChange={(e) => setOnlyFast(e.target.checked)} aria-label="Show only 10 min delivery" />
                <span>Show only 10 min delivery</span>
              </label>
            </div>

            {/* Microphone button inside input */}
            <button
              aria-label="Search using voice"
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full ${listening ? 'bg-red-100' : 'bg-white'}`}
              onClick={() => {
                // initialize speech recognition lazily
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                  alert('Voice recognition not supported in this browser.');
                  return;
                }
                if (!speechRef.current) {
                  const recog = new SpeechRecognition();
                  recog.lang = 'en-US';
                  recog.interimResults = false;
                  recog.maxAlternatives = 1;
                  recog.onstart = () => { setListening(true); setAriaMessage('Listening'); };
                  recog.onend = () => { setListening(false); setAriaMessage('Stopped listening'); if (transcript || search) setLocation(`/grocery?search=${encodeURIComponent((transcript || search))}`); };
                  recog.onerror = (e:any) => { setListening(false); setAriaMessage('Voice recognition error'); console.error(e); };
                  recog.onresult = (ev:any) => {
                    const text = ev.results[0][0].transcript;
                    setTranscript(text);
                    setSearch(text);
                    setAriaMessage(`Heard ${text}`);
                  };
                  speechRef.current = recog;
                }
                try {
                  if (listening) {
                    speechRef.current.stop();
                  } else {
                    setTranscript('');
                    setAriaMessage('Starting listening');
                    speechRef.current.start();
                  }
                } catch (err) {
                  console.error(err);
                  setAriaMessage('Voice recognition unavailable');
                }
              }}
            >
              <span aria-hidden className={`flex items-center justify-center ${listening ? 'animate-pulse text-red-600' : 'text-gray-600'}`}>
                <Mic className="h-5 w-5" />
              </span>
            </button>

            <div className="sr-only" role="status" aria-live="polite">{ariaMessage}</div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-lg z-50" role="listbox" aria-label="Search suggestions">
                {suggestions.map((s, idx) => (
                  <div
                    key={s.id}
                    role="option"
                    aria-selected={selectedIndex === idx}
                    tabIndex={-1}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onMouseLeave={() => setSelectedIndex(-1)}
                    onClick={() => { 
                      if (s?.source === 'ecom' || s?.source === 'ecommerce') {
                        setLocation(`/ecommerce/product/${s.id}`);
                      } else {
                        setLocation(`/product/${s.id}`);
                      }
                      setShowSuggestions(false); setSelectedIndex(-1); }}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-3 ${selectedIndex === idx ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <img src={s.image || '/favicon.ico'} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="flex items-center gap-1">
                          <div className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{(s?.source === 'ecom' || s?.source === 'ecommerce') ? 'Ecom' : 'Grocery'}</div>
                          {s.fastDelivery && (
                            <div className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1" aria-label="Delivered in 10 minutes">
                              <span className="text-xs">⚡</span>
                              <span>10 mins</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{s.category || (s.tags && s.tags.join(', '))}</div>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">{s.score > 0 ? `★${s.score}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              aria-label="View notifications"
              className="p-2 rounded-full bg-white shadow-sm h-10 w-10 flex items-center justify-center"
              onClick={() => setNotifOpen(v => !v)}
            >
              <Bell className="h-5 w-5 text-gray-700" />
              {notifications?.some((n:any) => !n.read) && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-semibold rounded-full h-4 w-4 flex items-center justify-center">{notifications.filter((n:any) => !n.read).length}</span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 shadow-lg rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <div className="font-medium">Notifications</div>
                  <button className="text-sm text-primary" onClick={() => markAllRead.mutate()}>Mark all as read</button>
                </div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">No notifications</div>
                  )}
                  {notifications.map((n: any) => (
                    <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 ${n.read ? 'bg-white' : 'bg-gray-50'}`} onClick={() => markOneRead.mutate(n.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm">{n.title}</div>
                          <div className="text-xs text-gray-600">{n.description || n.desc}</div>
                        </div>
                        <div className="text-xs text-gray-400">{n.ts || (n.createdAt ? new Date(n.createdAt).toLocaleString() : '')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {user && !pushEnabled && (
            <button onClick={enablePush} className="text-sm px-2 py-1 rounded bg-primary text-white">Enable push</button>
          )}

          <Link href="/profile">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <User className="h-5 w-5 text-gray-700" />
            </div>
          </Link>
          <Link href={cartPath} data-testid="link-cart">
            <div className="relative p-2 rounded-full bg-white shadow-sm">
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {cartCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  data-testid="text-cart-count"
                >
                  {cartCount}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
