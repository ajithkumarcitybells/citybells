import { useEffect, useState, useRef } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchLocations, reverseGeocode, type SearchSuggestion } from "@/lib/taxi-map";

type LocationSearchInputProps = {
  active?: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  showUseCurrent?: boolean;
  recentKey?: string; // localStorage key for recent searches
};

export function LocationSearchInput({
  active = false,
  label,
  onChange,
  onFocus,
  onSelectSuggestion,
  placeholder,
  value,
  showUseCurrent = false,
  recentKey,
}: LocationSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [recent, setRecent] = useState<SearchSuggestion[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // load recent searches from localStorage
    const key = recentKey || "taxi_recent_searches";
    try {
      const raw = localStorage.getItem(key);
      if (raw) setRecent(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, [recentKey]);

  useEffect(() => {
    if (!isFocused) return;

    const q = value.trim();
    if (q.length < 3) {
      setSuggestions(q.length === 0 ? recent.slice(0, 6) : []);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const next = await searchLocations(q);
        if (!cancelled && mounted.current) {
          setSuggestions(next.slice(0, 6));
          setHighlightIdx(-1);
        }
      } catch (err: any) {
        if (!cancelled && mounted.current) {
          setSuggestions([]);
          setErrorMessage(err instanceof Error ? err.message : "Unable to search locations");
        }
      } finally {
        if (!cancelled && mounted.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isFocused, value, recent]);

  function saveRecent(s: SearchSuggestion) {
    try {
      const key = recentKey || "taxi_recent_searches";
      const copy = [s, ...recent.filter((r) => r.id !== s.id)];
      const trimmed = copy.slice(0, 6);
      localStorage.setItem(key, JSON.stringify(trimmed));
      setRecent(trimmed);
    } catch (e) {
      // ignore
    }
  }

  async function chooseSuggestion(s: SearchSuggestion) {
    onSelectSuggestion(s);
    saveRecent(s);
    setSuggestions([]);
    setIsFocused(false);
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      try {
        const place = await reverseGeocode(coords);
        const s: SearchSuggestion = { id: `cur_${Date.now()}`, name: 'Current location', address: place.address, lat: coords.lat, lng: coords.lng };
        chooseSuggestion(s);
      } catch (e) {
        console.error('Reverse geocode failed', e);
      }
    }, (err) => {
      console.error('Geolocation error', err);
    }, { maximumAge: 60_000 });
  }

  function highlightMatch(text: string | undefined, q: string) {
    if (!text) return null;
    const query = q.trim();
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (
      <span>
        {before}
        <strong className="font-semibold">{match}</strong>
        {after}
      </span>
    );
  }

  return (
    <div className="relative">
      <label className={`block rounded-3xl border p-3 shadow-sm transition ${active ? "border-orange-400 bg-orange-50/80 dark:border-amber-400 dark:bg-amber-500/10" : "border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70"}`}>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          <LocateFixed className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${active ? "text-orange-500 dark:text-amber-300" : "text-slate-400"}`} />
          <Input
            className="h-auto border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 120);
            }}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => { onFocus(); setIsFocused(true); }}
            onKeyDown={(e) => {
              if (!isFocused) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const idx = highlightIdx >= 0 ? highlightIdx : 0;
                const s = suggestions[idx];
                if (s) chooseSuggestion(s);
              } else if (e.key === 'Escape') {
                setIsFocused(false);
              }
            }}
            placeholder={placeholder}
            value={value}
          />
          {value ? (
            <button type="button" aria-label="Clear" className="text-slate-400 hover:text-slate-600" onClick={() => onChange("")}>✕</button>
          ) : null}
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        </div>
      </label>

      {isFocused && (suggestions.length > 0 || errorMessage) ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          {errorMessage ? <p className="px-3 py-2 text-sm text-rose-500">{errorMessage}</p> : null}
          {showUseCurrent ? (
            <button type="button" className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900 ${highlightIdx === 0 ? 'bg-muted' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => useCurrentLocation()}>
              <span className="mt-0.5 rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-amber-500/15 dark:text-amber-300"><LocateFixed className="h-3.5 w-3.5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">Use current location</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Allow location access to use</span>
              </span>
            </button>
          ) : null}
          {suggestions.map((suggestion, idx) => (
            <button key={suggestion.id} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900 ${idx === highlightIdx ? 'bg-muted' : ''}`} onMouseDown={(event) => { event.preventDefault(); chooseSuggestion(suggestion); }} type="button">
              <span className="mt-0.5 rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-amber-500/15 dark:text-amber-300"><MapPin className="h-3.5 w-3.5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{highlightMatch(suggestion.name, value)}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{highlightMatch(suggestion.address, value)}</span>
              </span>
            </button>
          ))}
          {!isLoading && !errorMessage && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}