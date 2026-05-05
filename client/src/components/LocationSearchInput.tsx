import React, { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

type NominatimSearchResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
};

interface Props {
  value?: string;
  placeholder?: string;
  onSelect: (coords: LatLng, displayName: string) => void;
}

function hasGooglePlaces(): boolean {
  return !!(window as any)?.google?.maps?.places?.Autocomplete;
}

async function searchNominatim(q: string): Promise<NominatimSearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Search failed (${r.status})`);
  const j = await r.json();
  return Array.isArray(j) ? (j as NominatimSearchResult[]) : [];
}

export default function LocationSearchInput({ value = "", placeholder = "Search location", onSelect }: Props) {
  const [val, setVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autocompleteRef = useRef<any | null>(null);

  useEffect(() => {
    setVal(value);
  }, [value]);

  // If Google Places is available (Maps script loaded with places library), use it.
  useEffect(() => {
    if (!inputRef.current) return;
    if (!hasGooglePlaces()) return;
    if (autocompleteRef.current) return;

    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
    });
    autocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      const coords = { lat: loc.lat(), lng: loc.lng() };
      const name = place.formatted_address || place.name || "";
      setVal(name);
      setOpen(false);
      setResults([]);
      setHighlightIdx(-1);
      onSelect(coords, name);
    });
  }, [inputRef.current]);

  const canSearch = useMemo(() => val.trim().length >= 3, [val]);

  useEffect(() => {
    // When Google Places is active, don't run Nominatim queries.
    if (hasGooglePlaces()) return;

    setError(null);
    setHighlightIdx(-1);
    if (!canSearch) {
      setResults([]);
      return;
    }

    const q = val.trim();
    setLoading(true);
    setOpen(true);

    const t = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        // fetch() doesn’t support AbortController in all older browsers, but modern ones do.
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`,
          { headers: { Accept: "application/json" }, signal: abortRef.current.signal },
        );
        if (!r.ok) throw new Error(`Search failed (${r.status})`);
        const j = await r.json();
        const list = Array.isArray(j) ? (j as NominatimSearchResult[]) : [];
        setResults(list);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setResults([]);
        setError(e?.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [val, canSearch]);

  function choose(r: NominatimSearchResult) {
    const coords = { lat: Number(r.lat), lng: Number(r.lon) };
    const name = r.display_name || "";
    setVal(name);
    setOpen(false);
    setResults([]);
    setHighlightIdx(-1);
    onSelect(coords, name);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onBlur={() => {
          // allow click selection before closing
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const idx = highlightIdx >= 0 ? highlightIdx : 0;
            const r = results[idx];
            if (r) choose(r);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full border rounded px-3 py-2 bg-background"
      />

      {/* Only show Nominatim dropdown when Google Places isn't active */}
      {!hasGooglePlaces() && open && (loading || error || results.length) ? (
        <div className="absolute z-50 mt-1 w-full rounded border bg-background shadow">
          {loading ? <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div> : null}
          {error ? <div className="px-3 py-2 text-sm text-red-600">{error}</div> : null}
          {!loading && !error && results.map((r, idx) => (
            <button
              key={String(r.place_id)}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                idx === highlightIdx ? "bg-muted" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(r)}
            >
              {r.display_name}
            </button>
          ))}
          {!loading && !error && !results.length ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
