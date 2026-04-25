import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "country" | "state" | "city";

interface NominatimResult {
  display_name: string;
  address?: {
    country?: string;
    state?: string;
    region?: string;
    province?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    municipality?: string;
    county?: string;
  };
  place_id?: number;
}

interface Props {
  kind: Kind;
  value: string;
  onChange: (value: string) => void;
  /** Used to scope city / state lookups. Optional. */
  country?: string;
  state?: string;
  placeholder?: string;
  className?: string;
  /** When true, uses an underline-only input style (onboarding). */
  underline?: boolean;
}

const featureTypeFor = (k: Kind) => {
  if (k === "country") return "country";
  if (k === "state") return "state";
  return "city";
};

const labelFromResult = (r: NominatimResult, kind: Kind): string => {
  const a = r.address || {};
  if (kind === "country") return a.country || r.display_name.split(",")[0];
  if (kind === "state") return a.state || a.region || a.province || r.display_name.split(",")[0];
  return (
    a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || r.display_name.split(",")[0]
  );
};

/**
 * Lightweight location autocomplete backed by OpenStreetMap Nominatim.
 * - No API key required.
 * - Debounced 250ms.
 * - Keyboard nav (↑/↓/Enter/Esc).
 * - For city/state, scopes results by parent country/state when provided.
 */
const LocationAutocomplete = ({
  kind,
  value,
  onChange,
  country,
  state,
  placeholder,
  className,
  underline = false,
}: Props) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef(0);

  // Sync external value -> local query (e.g. geolocation autofill).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced fetch.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      const fetchId = ++lastFetchRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: [q, state, country].filter(Boolean).join(", "),
          format: "jsonv2",
          addressdetails: "1",
          "accept-language": "en",
          limit: "8",
          featuretype: featureTypeFor(kind),
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const data: NominatimResult[] = res.ok ? await res.json() : [];
        // Drop late responses.
        if (fetchId !== lastFetchRef.current) return;
        // Deduplicate by label.
        const seen = new Set<string>();
        const cleaned = data.filter((r) => {
          const lbl = labelFromResult(r, kind);
          if (!lbl || seen.has(lbl.toLowerCase())) return false;
          seen.add(lbl.toLowerCase());
          return true;
        });
        setResults(cleaned);
        setActive(0);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        if (fetchId === lastFetchRef.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, kind, country, state]);

  const choose = (r: NominatimResult) => {
    const label = labelFromResult(r, kind);
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const inputClass = underline
    ? "w-full bg-transparent border-b border-border text-[14px] text-foreground placeholder:text-muted-foreground outline-none py-2"
    : "w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <input
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        className={inputClass}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {results.map((r, i) => {
            const label = labelFromResult(r, kind);
            const sub = r.display_name.split(",").slice(1).join(",").trim();
            return (
              <li
                key={r.place_id ?? `${label}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  i === active ? "bg-accent/15 text-foreground" : "text-foreground/90 hover:bg-accent/10"
                )}
              >
                <div className="font-medium">{label}</div>
                {sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;