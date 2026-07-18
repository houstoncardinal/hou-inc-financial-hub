/* ── HGP Dispatch Map ─────────────────────────────────────────────────────────
   Mapbox map for the Storm Response command center: customer sites, generator
   jobs (colored by type, emergencies pulsing), and active outage events on
   one canvas. Follows the admin ClientMap pattern — VITE_MAPBOX_TOKEN,
   client-side markers, no external data beyond Mapbox tiles/geocoding.
   Marker clicks report the underlying record to the parent, which renders
   the detail/quick-action card (React stays out of mapbox popups). ── */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface MapPoint {
  id: string;
  kind: 'site' | 'job' | 'outage';
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  color: string;
  pulse?: boolean;
}

const HOUSTON: [number, number] = [-95.3698, 29.7604];

export default function DispatchMap({
  points, selectedId, onSelect, height = 420,
}: {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (p: MapPoint) => void;
  height?: number;
}) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    (mapboxgl as any).accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: HOUSTON,
      zoom: 8.4,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    for (const p of points) {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = `${p.label}${p.sub ? ` — ${p.sub}` : ''}`;
      el.setAttribute('aria-label', p.label);
      const selected = p.id === selectedId;
      const size = p.kind === 'outage' ? 18 : 13;
      el.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;cursor:pointer;padding:0;
        background:${p.kind === 'outage' ? `${p.color}55` : p.color};
        border:2px solid ${selected ? '#ffffff' : p.kind === 'outage' ? p.color : 'rgba(255,255,255,0.75)'};
        box-shadow:${selected ? `0 0 0 3px ${p.color}66,` : ''}0 1px 4px rgba(0,0,0,0.4);
        ${p.pulse ? 'animation:hgp-pulse 1.4s ease-out infinite;' : ''}
      `;
      el.addEventListener('click', e => { e.stopPropagation(); onSelect(p); });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      markersRef.current.push(marker);
    }

    if (points.length) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(p => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 11.5, duration: 500 });
    }
  }, [points, selectedId, onSelect]);

  if (!token) {
    return (
      <div className="border border-border bg-secondary/20 flex items-center justify-center text-xs text-muted-foreground p-6" style={{ height }}>
        Set VITE_MAPBOX_TOKEN in .env to enable the dispatch map.
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes hgp-pulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}70%{box-shadow:0 0 0 12px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}`}</style>
      <div ref={containerRef} className="w-full border border-border" style={{ height }} />
    </>
  );
}
