import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

function shortLabel(r: NominatimResult): string {
  const a = r.address;
  const street = a.house_number ? `${a.house_number} ${a.road ?? ''}`.trim() : a.road;
  const area   = a.suburb ?? a.neighbourhood;
  const city   = a.city ?? a.town ?? a.village;
  const state  = a.state;
  const zip    = a.postcode;
  if (street && city && state) return zip ? `${street}, ${city}, ${state} ${zip}` : `${street}, ${city}, ${state}`;
  if (area && city && state) return `${area}, ${city}, ${state}`;
  if (city && state) return `${city}, ${state}`;
  return r.display_name.split(', ').slice(0, 3).join(', ');
}

function detailLabel(r: NominatimResult): string {
  return r.display_name.split(', ').slice(1, 4).join(', ');
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
  /** If provided, overrides internal focus border handling */
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  /** If provided, overrides internal blur border handling */
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  focusBorderColor?: string;
  defaultBorderColor?: string;
  showIcon?: boolean;
}

export default function LocationAutocomplete({
  value, onChange,
  placeholder = 'Neighborhood, city, or address…',
  inputStyle, inputClassName,
  onFocus: externalFocus,
  onBlur: externalBlur,
  focusBorderColor = '#9D7E3F',
  defaultBorderColor = '#DDD4C4',
  showIcon = true,
}: Props) {
  const [results, setResults]   = useState<NominatimResult[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef     = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=us&addressdetails=1&limit=7`,
        { headers: { 'Accept-Language': 'en-US,en' }, signal: abortRef.current.signal }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch (e: any) {
      if (e.name !== 'AbortError') setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    setActiveIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 350);
  };

  const select = (r: NominatimResult) => {
    onChange(shortLabel(r));
    setResults([]);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {showIcon && (
          <MapPin style={{
            position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14, color: '#8A7A6A', pointerEvents: 'none',
          }} strokeWidth={1.5} />
        )}
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          onFocus={e => {
            if (externalFocus) externalFocus(e);
            else e.target.style.borderColor = focusBorderColor;
            if (results.length > 0) setOpen(true);
          }}
          onBlur={e => {
            if (externalBlur) externalBlur(e);
            else e.target.style.borderColor = defaultBorderColor;
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
          style={{
            paddingLeft: showIcon ? '2.75rem' : undefined,
            paddingRight: loading ? '2.5rem' : undefined,
            ...inputStyle,
          }}
        />
        {loading && (
          <Loader2 className="animate-spin" style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            width: 13, height: 13, color: '#9D7E3F',
          }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDD4C4', borderTop: 'none',
          boxShadow: '0 8px 32px rgba(28,24,20,0.12)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {results.map((r, i) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(r); }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                backgroundColor: i === activeIdx ? 'rgba(157,126,63,0.07)' : '#FFFFFF',
                borderBottom: i < results.length - 1 ? '1px solid rgba(221,212,196,0.5)' : 'none',
                cursor: 'pointer',
              }}
            >
              <MapPin style={{ width: 11, height: 11, color: '#9D7E3F', marginTop: 3, flexShrink: 0 }} strokeWidth={2} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1814', lineHeight: 1.35 }}>
                  {shortLabel(r)}
                </div>
                <div style={{ fontSize: 10, color: '#8A7A6A', marginTop: 1, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detailLabel(r)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
