import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Globe, Map as MapIcon, BarChart2, DollarSign,
  Users, TrendingUp, Filter, X, ChevronRight,
  Activity, CheckCircle2, Clock, Maximize2,
} from 'lucide-react';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const G200 = '#2A2A2A';
const G400 = '#5A5A5A';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SERIF = "'Cormorant Garamond', Georgia, serif";

/* ── Demo client data ────────────────────────────────────────────────── */
type ClientStatus = 'active' | 'completed' | 'planning';
type ProjectType  = 'Luxury Residential' | 'Commercial Office' | 'Industrial' | 'Retail' | 'Healthcare' | 'Mixed-Use' | 'Renovation' | 'PM Consulting';

interface DemoClient {
  id: string;
  name: string;
  company: string;
  city: string;
  state: string;
  coords: [number, number];
  type: ProjectType;
  status: ClientStatus;
  value: number;
  year: number;
  sqft: string;
  region: 'texas' | 'national';
}

const DEMO: DemoClient[] = [
  // ── Houston Metro ──────────────────────────────────────────────────
  { id: 'c01', name: 'Chambord River Oaks Estate',   company: 'Fontaine Family',   city: 'River Oaks',    state: 'TX', coords: [-95.4148, 29.7549], type: 'Luxury Residential', status: 'completed', value: 8.4,  year: 2024, sqft: '14,200', region: 'texas' },
  { id: 'c02', name: 'Memorial Manor',               company: 'Ashford Group',     city: 'Memorial',      state: 'TX', coords: [-95.4820, 29.7652], type: 'Luxury Residential', status: 'active',    value: 5.2,  year: 2024, sqft: '8,900',  region: 'texas' },
  { id: 'c03', name: 'Tanglewood Estate',            company: 'Hargrove Estate',   city: 'Tanglewood',    state: 'TX', coords: [-95.4668, 29.7408], type: 'Luxury Residential', status: 'completed', value: 7.1,  year: 2023, sqft: '11,400', region: 'texas' },
  { id: 'c04', name: 'Galleria Commerce Center',     company: 'Meridian Capital',  city: 'Galleria Dist', state: 'TX', coords: [-95.4586, 29.7369], type: 'Commercial Office',  status: 'completed', value: 124,  year: 2023, sqft: '280,000', region: 'texas' },
  { id: 'c05', name: 'Post Oak Medical Plaza',       company: 'TMC Partners',      city: 'Medical Center',state: 'TX', coords: [-95.3981, 29.7092], type: 'Healthcare',         status: 'active',    value: 38,   year: 2024, sqft: '45,000', region: 'texas' },
  { id: 'c06', name: 'Energy Corridor Campus',       company: 'Vector Energy',     city: 'Energy Corridor',state:'TX', coords: [-95.6540, 29.7605], type: 'Commercial Office',  status: 'completed', value: 155,  year: 2023, sqft: '340,000', region: 'texas' },
  { id: 'c07', name: 'Heights Row Houses',           company: 'Blackwood Dev.',    city: 'The Heights',   state: 'TX', coords: [-95.4003, 29.7899], type: 'Renovation',         status: 'completed', value: 2.8,  year: 2024, sqft: '4,200',  region: 'texas' },
  { id: 'c08', name: 'Houston Lifestyle Center',     company: 'Atlas Retail LLC',  city: 'Midtown',       state: 'TX', coords: [-95.3885, 29.7447], type: 'Retail',             status: 'completed', value: 62,   year: 2022, sqft: '185,000', region: 'texas' },
  { id: 'c09', name: 'Upper Kirby Tower',            company: 'Kirby Properties',  city: 'Upper Kirby',   state: 'TX', coords: [-95.4180, 29.7309], type: 'Commercial Office',  status: 'planning',  value: 45,   year: 2025, sqft: '92,000', region: 'texas' },
  { id: 'c10', name: 'Greenway Plaza Annex',         company: 'Greenway Capital',  city: 'Greenway',      state: 'TX', coords: [-95.4330, 29.7333], type: 'Commercial Office',  status: 'active',    value: 67,   year: 2024, sqft: '210,000', region: 'texas' },
  { id: 'c11', name: 'Memorial Park Residence',      company: 'Calloway Family',   city: 'Memorial Park', state: 'TX', coords: [-95.4398, 29.7638], type: 'Luxury Residential', status: 'planning',  value: 5.8,  year: 2025, sqft: '9,200',  region: 'texas' },
  { id: 'c12', name: 'Bellaire Custom Home',         company: 'Delacroix Family',  city: 'Bellaire',      state: 'TX', coords: [-95.4585, 29.7060], type: 'Luxury Residential', status: 'active',    value: 3.4,  year: 2024, sqft: '5,800',  region: 'texas' },
  { id: 'c13', name: 'Sugar Land Retail Commons',    company: 'SL Ventures',       city: 'Sugar Land',    state: 'TX', coords: [-95.6350, 29.6197], type: 'Retail',             status: 'completed', value: 29,   year: 2022, sqft: '95,000', region: 'texas' },
  { id: 'c14', name: 'The Woodlands Estate',         company: 'Worthington Family',city: 'The Woodlands', state: 'TX', coords: [-95.4633, 30.1658], type: 'Luxury Residential', status: 'active',    value: 6.8,  year: 2024, sqft: '10,200', region: 'texas' },
  { id: 'c15', name: 'Katy Logistics Hub',           company: 'Southwest Dist.',   city: 'Katy',          state: 'TX', coords: [-95.8245, 29.7858], type: 'Industrial',         status: 'active',    value: 38,   year: 2024, sqft: '520,000', region: 'texas' },
  { id: 'c16', name: 'Pearland Retail Commons',      company: 'Pearland Dev.',     city: 'Pearland',      state: 'TX', coords: [-95.2860, 29.5635], type: 'Retail',             status: 'completed', value: 22,   year: 2023, sqft: '78,000', region: 'texas' },
  // ── Texas Statewide ────────────────────────────────────────────────
  { id: 'c17', name: 'Uptown Dallas Tower',          company: 'Crescent Holdings', city: 'Dallas',        state: 'TX', coords: [-96.8010, 32.7895], type: 'Commercial Office',  status: 'active',    value: 88,   year: 2024, sqft: '210,000', region: 'texas' },
  { id: 'c18', name: 'Preston Hollow Estate',        company: 'Langley Family',    city: 'Dallas',        state: 'TX', coords: [-96.8075, 32.8628], type: 'Luxury Residential', status: 'completed', value: 9.2,  year: 2023, sqft: '12,800', region: 'texas' },
  { id: 'c19', name: 'Fort Worth Industrial Park',   company: 'Alliance Ind.',     city: 'Fort Worth',    state: 'TX', coords: [-97.3208, 32.7555], type: 'Industrial',         status: 'active',    value: 44,   year: 2024, sqft: '380,000', region: 'texas' },
  { id: 'c20', name: 'Westlake Estate',              company: 'Weston Family',     city: 'Austin',        state: 'TX', coords: [-97.9950, 30.3080], type: 'Luxury Residential', status: 'planning',  value: 11.4, year: 2025, sqft: '13,600', region: 'texas' },
  { id: 'c21', name: 'Downtown Austin Mixed-Use',    company: 'Capital City Dev.', city: 'Austin',        state: 'TX', coords: [-97.7431, 30.2672], type: 'Mixed-Use',          status: 'active',    value: 78,   year: 2024, sqft: '190,000', region: 'texas' },
  { id: 'c22', name: 'San Antonio Corporate HQ',     company: 'Alamo Ventures',    city: 'San Antonio',   state: 'TX', coords: [-98.4936, 29.4241], type: 'Commercial Office',  status: 'completed', value: 34,   year: 2023, sqft: '88,000', region: 'texas' },
  { id: 'c23', name: 'Plano Corporate Campus',       company: 'Legacy Realty',     city: 'Plano',         state: 'TX', coords: [-96.6989, 33.0198], type: 'Commercial Office',  status: 'completed', value: 92,   year: 2022, sqft: '250,000', region: 'texas' },
  { id: 'c24', name: 'Frisco Commerce Park',         company: 'North Texas Dev.',  city: 'Frisco',        state: 'TX', coords: [-96.8236, 33.1507], type: 'Industrial',         status: 'active',    value: 55,   year: 2024, sqft: '340,000', region: 'texas' },
  { id: 'c25', name: 'Round Rock Healthcare',        company: 'Central TX Health', city: 'Round Rock',    state: 'TX', coords: [-97.6789, 30.5082], type: 'Healthcare',         status: 'planning',  value: 42,   year: 2025, sqft: '62,000', region: 'texas' },
  // ── National ───────────────────────────────────────────────────────
  { id: 'c26', name: 'Beverly Hills Estate',         company: 'Sterling Group',    city: 'Los Angeles',   state: 'CA', coords: [-118.3965, 34.0736], type: 'PM Consulting',     status: 'planning',  value: 14,   year: 2025, sqft: '9,800',  region: 'national' },
  { id: 'c27', name: 'Hudson Yards Commercial',      company: 'Empire Properties', city: 'New York',      state: 'NY', coords: [-74.0060, 40.7128],  type: 'PM Consulting',     status: 'active',    value: 220,  year: 2024, sqft: '420,000', region: 'national' },
  { id: 'c28', name: 'River North Mixed-Use',        company: 'Midwest Holdings',  city: 'Chicago',       state: 'IL', coords: [-87.6298, 41.8781],  type: 'PM Consulting',     status: 'completed', value: 88,   year: 2023, sqft: '195,000', region: 'national' },
  { id: 'c29', name: 'Brickell Tower',               company: 'Coastal Capital',   city: 'Miami',         state: 'FL', coords: [-80.1918, 25.7617],  type: 'PM Consulting',     status: 'active',    value: 56,   year: 2024, sqft: '145,000', region: 'national' },
  { id: 'c30', name: 'Buckhead Luxury Estate',       company: 'Southern Holdings', city: 'Atlanta',       state: 'GA', coords: [-84.3963, 33.7490],  type: 'PM Consulting',     status: 'completed', value: 12,   year: 2023, sqft: '8,200',  region: 'national' },
  { id: 'c31', name: 'Cherry Creek Office Park',     company: 'Mountain West Dev.',city: 'Denver',        state: 'CO', coords: [-104.9903, 39.7392], type: 'PM Consulting',     status: 'active',    value: 43,   year: 2024, sqft: '98,000', region: 'national' },
  { id: 'c32', name: 'Scottsdale Desert Estate',     company: 'Sonoran Properties',city: 'Phoenix',       state: 'AZ', coords: [-111.9730, 33.4484], type: 'PM Consulting',     status: 'completed', value: 8.6,  year: 2023, sqft: '7,400',  region: 'national' },
  { id: 'c33', name: 'Germantown Mixed-Use',         company: 'Music City Dev.',   city: 'Nashville',     state: 'TN', coords: [-86.7816, 36.1627],  type: 'PM Consulting',     status: 'active',    value: 47,   year: 2024, sqft: '112,000', region: 'national' },
  { id: 'c34', name: 'South End Corporate',          company: 'Carolinas Group',   city: 'Charlotte',     state: 'NC', coords: [-80.8431, 35.2271],  type: 'PM Consulting',     status: 'planning',  value: 68,   year: 2025, sqft: '178,000', region: 'national' },
  { id: 'c35', name: 'Bellevue Tech Campus',         company: 'Pacific Northwest', city: 'Seattle',       state: 'WA', coords: [-122.3321, 47.6062], type: 'PM Consulting',     status: 'completed', value: 92,   year: 2023, sqft: '260,000', region: 'national' },
];

const STATUS_COLOR: Record<ClientStatus, string> = {
  active:    '#9D7E3F',
  completed: '#10b981',
  planning:  '#3b82f6',
};
const STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'Active', completed: 'Completed', planning: 'Planning',
};

/* ── Helper ──────────────────────────────────────────────────────────── */
function fmtVal(v: number) {
  return v >= 100 ? `$${v.toFixed(0)}M` : v >= 10 ? `$${v.toFixed(0)}M` : `$${v.toFixed(1)}M`;
}

/* ── Marker size by project value ────────────────────────────────────── */
function markerSize(value: number) {
  if (value >= 80) return 32;
  if (value >= 20) return 26;
  return 20;
}

/* ── Inject global marker CSS once ──────────────────────────────────── */
function injectMarkerStyles() {
  const id = 'hou-map-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .hou-marker-wrap {
      cursor: pointer;
      transition: transform 0.18s ease;
    }
    .hou-marker-wrap:hover {
      transform: scale(1.25);
      z-index: 99 !important;
    }
    .hou-dot {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 700;
      color: #fff;
      border: 2px solid rgba(255,255,255,0.35);
      box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 2px rgba(0,0,0,0.3);
      position: relative;
    }
    .hou-dot.status-active {
      background: linear-gradient(135deg, #C4A76B, #9D7E3F);
      animation: hou-pulse 2.2s ease-out infinite;
    }
    .hou-dot.status-completed {
      background: linear-gradient(135deg, #34d399, #10b981);
    }
    .hou-dot.status-planning {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
    }
    @keyframes hou-pulse {
      0%   { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 0 rgba(196,167,107,0.6); }
      60%  { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 10px rgba(196,167,107,0); }
      100% { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 0 rgba(196,167,107,0); }
    }
    .mapboxgl-popup-content {
      background: #131210 !important;
      border: 1px solid rgba(196,167,107,0.3) !important;
      border-radius: 0 !important;
      padding: 0 !important;
      box-shadow: 0 24px 60px rgba(0,0,0,0.7) !important;
      min-width: 260px !important;
    }
    .mapboxgl-popup-tip {
      border-top-color: rgba(196,167,107,0.3) !important;
    }
    .mapboxgl-popup-close-button {
      color: rgba(255,255,255,0.4) !important;
      font-size: 18px !important;
      padding: 6px 10px !important;
    }
    .mapboxgl-popup-close-button:hover {
      color: #C4A76B !important;
      background: transparent !important;
    }
    .mapboxgl-ctrl-group {
      background: #1a1917 !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 0 !important;
    }
    .mapboxgl-ctrl-group button {
      border-radius: 0 !important;
    }
    .mapboxgl-ctrl button.mapboxgl-ctrl-zoom-in .mapboxgl-ctrl-icon,
    .mapboxgl-ctrl button.mapboxgl-ctrl-zoom-out .mapboxgl-ctrl-icon,
    .mapboxgl-ctrl button.mapboxgl-ctrl-compass .mapboxgl-ctrl-icon {
      filter: invert(1) opacity(0.55);
    }
    .mapboxgl-ctrl button:hover .mapboxgl-ctrl-icon { filter: invert(1) opacity(1); }
  `;
  document.head.appendChild(style);
}

/* ── Popup HTML generator ────────────────────────────────────────────── */
function popupHtml(c: DemoClient): string {
  const col = STATUS_COLOR[c.status];
  return `
    <div style="font-family: system-ui, sans-serif;">
      <div style="height:3px;background:linear-gradient(90deg,${col},transparent);"></div>
      <div style="padding:16px 18px 14px;">
        <div style="font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:${col};font-weight:800;margin-bottom:6px;">${c.type}</div>
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:18px;color:#fff;font-weight:300;line-height:1.1;margin-bottom:4px;">${c.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">${c.company}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);">
          <div>
            <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:3px;">Location</div>
            <div style="font-size:12px;font-weight:600;color:#fff;">${c.city}, ${c.state}</div>
          </div>
          <div>
            <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:3px;">Value</div>
            <div style="font-size:12px;font-weight:700;color:#C4A76B;">${fmtVal(c.value)}</div>
          </div>
          <div>
            <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:3px;">Area</div>
            <div style="font-size:12px;font-weight:600;color:#fff;">${c.sqft} SF</div>
          </div>
          <div>
            <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:3px;">Year</div>
            <div style="font-size:12px;font-weight:600;color:#fff;">${c.year}</div>
          </div>
        </div>
        <div style="margin-top:12px;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:${col}18;border:1px solid ${col}44;">
          <div style="width:6px;height:6px;border-radius:50%;background:${col};${c.status==='active'?'animation:hou-pulse 2.2s ease-out infinite;':''}"></div>
          <span style="font-size:8px;letter-spacing:0.22em;text-transform:uppercase;font-weight:800;color:${col};">${STATUS_LABEL[c.status]}</span>
        </div>
      </div>
    </div>
  `;
}

/* ── Client list row ─────────────────────────────────────────────────── */
function ClientRow({
  client, isSelected, onClick,
}: {
  client: DemoClient;
  isSelected: boolean;
  onClick: () => void;
}) {
  const col = STATUS_COLOR[client.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition-all flex items-center gap-3"
      style={{
        background: isSelected ? 'rgba(157,126,63,0.12)' : 'transparent',
        borderLeft: `2px solid ${isSelected ? AC : 'transparent'}`,
        border: 'none',
        borderLeftColor: isSelected ? AC : 'transparent',
        borderLeftStyle: 'solid',
        borderLeftWidth: 2,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: col, flexShrink: 0,
          boxShadow: client.status === 'active' ? `0 0 6px ${col}` : 'none',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 11, fontWeight: 600, color: isSelected ? ACL : W, lineHeight: 1.3 }}>
          {client.name}
        </div>
        <div style={{ fontSize: 9, color: G500, marginTop: 1 }}>
          {client.city}, {client.state} · {fmtVal(client.value)}
        </div>
      </div>
      <ChevronRight style={{ width: 12, height: 12, color: isSelected ? ACL : G400, flexShrink: 0 }} strokeWidth={2} />
    </button>
  );
}

/* ── No-token placeholder ────────────────────────────────────────────── */
function NoToken() {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'rgba(255,255,255,0.38)', backgroundColor: '#0D0D0B' }}>
      <MapIcon style={{ width: 48, height: 48, color: AC, marginBottom: 20 }} strokeWidth={1} />
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, color: W, marginBottom: 12 }}>
        Mapbox Token Required
      </div>
      <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 380, lineHeight: 1.8, marginBottom: 24 }}>
        Add your Mapbox public token to the project's <code style={{ color: ACL, backgroundColor: 'rgba(157,126,63,0.1)', padding: '1px 6px' }}>.env</code> file:
      </p>
      <div style={{ backgroundColor: '#1A1917', border: '1px solid rgba(157,126,63,0.3)', padding: '14px 24px', fontFamily: 'monospace', fontSize: 12, color: ACL, marginBottom: 20 }}>
        VITE_MAPBOX_TOKEN=pk.eyJ1...
      </div>
      <p style={{ fontSize: 11, color: G500 }}>
        Get a free token at{' '}
        <span style={{ color: ACL }}>mapbox.com</span>
        {' '}→ Account → Tokens
      </p>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────── */
export default function ClientMap() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef     = useRef<mapboxgl.Popup | null>(null);

  const [ready,     setReady]     = useState(false);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [region,    setRegion]    = useState<'all' | 'texas' | 'national'>('all');
  const [status,    setStatus]    = useState<'all' | ClientStatus>('all');
  const [typeFilter, setType]     = useState<'all' | ProjectType>('all');
  const [sideOpen,  setSideOpen]  = useState(true);

  /* filtered list */
  const filtered = DEMO.filter(c =>
    (region === 'all' || c.region === region) &&
    (status === 'all' || c.status === status) &&
    (typeFilter === 'all' || c.type === typeFilter)
  );

  /* Stats */
  const totalValue  = filtered.reduce((s, c) => s + c.value, 0);
  const activeCount = filtered.filter(c => c.status === 'active').length;
  const states      = new Set(filtered.map(c => c.state)).size;

  /* ── Build / destroy markers on filter change ── */
  const syncMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const visibleIds = new Set(filtered.map(c => c.id));

    DEMO.forEach(c => {
      const existing = markersRef.current.get(c.id);
      if (!visibleIds.has(c.id)) {
        existing?.remove();
        markersRef.current.delete(c.id);
        return;
      }
      if (existing) return; // already on map

      /* Build custom marker element */
      const sz = markerSize(c.value);
      const wrap = document.createElement('div');
      wrap.className = 'hou-marker-wrap';
      wrap.style.zIndex = String(sz);

      const dot = document.createElement('div');
      dot.className = `hou-dot status-${c.status}`;
      dot.style.width  = `${sz}px`;
      dot.style.height = `${sz}px`;
      dot.style.fontSize = `${Math.max(7, sz / 3.5)}px`;
      /* Show initials for large markers */
      if (sz >= 28) dot.textContent = c.name.split(' ').slice(0, 2).map(w => w[0]).join('');
      wrap.appendChild(dot);

      const marker = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat(c.coords)
        .addTo(mapRef.current!);

      wrap.addEventListener('click', () => {
        setSelected(c.id);
        /* Close old popup */
        popupRef.current?.remove();
        /* Open new popup */
        const popup = new mapboxgl.Popup({ offset: sz / 2 + 4, closeButton: true, maxWidth: '300px' })
          .setLngLat(c.coords)
          .setHTML(popupHtml(c))
          .addTo(mapRef.current!);
        popupRef.current = popup;
        /* Fly smoothly */
        mapRef.current!.easeTo({ center: c.coords, zoom: 11, duration: 900, offset: [100, 0] });
      });

      markersRef.current.set(c.id, marker);
    });
  }, [filtered]);

  /* ── Init map ── */
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    injectMarkerStyles();

    (mapboxgl as any).accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5, 39.5],  // center USA
      zoom: 3.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;

      /* ── Subtle US state outlines ── */
      map.addSource('states', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
      });
      map.addLayer({
        id: 'state-fills',
        type: 'fill',
        source: 'states',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'name'], 'Texas'], 'rgba(157,126,63,0.07)',
            'rgba(255,255,255,0.01)',
          ],
          'fill-opacity': 1,
        },
      });
      map.addLayer({
        id: 'state-borders',
        type: 'line',
        source: 'states',
        paint: {
          'line-color': 'rgba(255,255,255,0.08)',
          'line-width': 0.8,
        },
      });
      /* Texas highlight border */
      map.addLayer({
        id: 'texas-border',
        type: 'line',
        source: 'states',
        filter: ['==', ['get', 'name'], 'Texas'],
        paint: {
          'line-color': 'rgba(157,126,63,0.4)',
          'line-width': 1.5,
        },
      });

      setReady(true);

      /* Stagger-add markers after brief pause */
      setTimeout(() => {
        DEMO.forEach((c, i) => {
          setTimeout(() => {
            if (!mapRef.current) return;
            const sz = markerSize(c.value);
            const wrap = document.createElement('div');
            wrap.className = 'hou-marker-wrap';
            wrap.style.opacity = '0';
            wrap.style.transform = 'scale(0.3) translateY(-20px)';
            wrap.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';

            const dot = document.createElement('div');
            dot.className = `hou-dot status-${c.status}`;
            dot.style.width  = `${sz}px`;
            dot.style.height = `${sz}px`;
            dot.style.fontSize = `${Math.max(7, sz / 3.5)}px`;
            if (sz >= 28) dot.textContent = c.name.split(' ').slice(0, 2).map(w => w[0]).join('');
            wrap.appendChild(dot);

            const marker = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
              .setLngLat(c.coords)
              .addTo(mapRef.current!);

            /* Pop-in animation */
            requestAnimationFrame(() => {
              wrap.style.opacity = '1';
              wrap.style.transform = 'scale(1) translateY(0)';
            });

            wrap.addEventListener('click', () => {
              setSelected(c.id);
              popupRef.current?.remove();
              const popup = new mapboxgl.Popup({ offset: sz / 2 + 4, closeButton: true, maxWidth: '300px' })
                .setLngLat(c.coords).setHTML(popupHtml(c)).addTo(mapRef.current!);
              popupRef.current = popup;
              mapRef.current!.easeTo({ center: c.coords, zoom: 11, duration: 900, offset: [100, 0] });
            });

            markersRef.current.set(c.id, marker);
          }, i * 55);
        });

        /* After all markers drop, fly to Texas */
        setTimeout(() => {
          map.flyTo({ center: [-97.5, 31.0], zoom: 5.8, duration: 2200, essential: true, curve: 1.4 });
        }, DEMO.length * 55 + 300);
      }, 600);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  /* ── Sync markers when filter changes ── */
  useEffect(() => {
    if (ready) syncMarkers();
  }, [ready, syncMarkers]);

  /* ── Fly-to from sidebar click ── */
  const flyTo = useCallback((c: DemoClient) => {
    if (!mapRef.current) return;
    setSelected(c.id);
    popupRef.current?.remove();
    const sz = markerSize(c.value);
    const popup = new mapboxgl.Popup({ offset: sz / 2 + 4, closeButton: true, maxWidth: '300px' })
      .setLngLat(c.coords).setHTML(popupHtml(c)).addTo(mapRef.current);
    popupRef.current = popup;
    mapRef.current.flyTo({ center: c.coords, zoom: 12, duration: 1200, offset: [80, 0] });
  }, []);

  if (!token) {
    return (
      <div style={{ height: '100%', display: 'flex' }}>
        <NoToken />
      </div>
    );
  }

  const types = Array.from(new Set(DEMO.map(c => c.type))) as ProjectType[];

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#0D0D0B', overflow: 'hidden' }}>

      {/* ── SIDEBAR ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sideOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#100F0D', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Globe style={{ width: 14, height: 14, color: AC }} strokeWidth={1.5} />
                <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', fontWeight: 800, color: AC }}>Client Coverage</div>
                <div style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', backgroundColor: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '2px 8px', fontWeight: 800 }}>DEMO</div>
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: W, lineHeight: 1.1 }}>
                {filtered.length} Projects
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {[
                { icon: DollarSign, label: 'Portfolio Value', val: `$${(totalValue).toFixed(0)}M` },
                { icon: Activity,   label: 'Active Projects', val: String(activeCount) },
                { icon: CheckCircle2, label: 'Completed',    val: String(filtered.filter(c => c.status === 'completed').length) },
                { icon: MapPin,     label: 'States',          val: String(states) },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} style={{ backgroundColor: '#100F0D', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <Icon style={{ width: 11, height: 11, color: AC }} strokeWidth={1.5} />
                      <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: G500, fontWeight: 700 }}>{s.label}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: W, fontFamily: SERIF, fontStyle: 'italic' }}>{s.val}</div>
                  </div>
                );
              })}
            </div>

            {/* View buttons */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {[
                { label: 'All US',  action: () => { setRegion('all');    mapRef.current?.flyTo({ center: [-98.5, 39.5],  zoom: 3.5,  duration: 1200 }); } },
                { label: 'Texas',   action: () => { setRegion('texas');  mapRef.current?.flyTo({ center: [-97.5, 31.0],  zoom: 5.8,  duration: 1200 }); } },
                { label: 'Houston', action: () => {                       mapRef.current?.flyTo({ center: [-95.4900, 29.74], zoom: 10.5, duration: 1200 }); } },
              ].map(b => (
                <button key={b.label} onClick={b.action}
                  style={{ flex: 1, padding: '6px 4px', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, backgroundColor: 'rgba(157,126,63,0.08)', border: '1px solid rgba(157,126,63,0.2)', color: ACL, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.08)'; }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <Filter style={{ width: 10, height: 10, color: G400 }} strokeWidth={2} />
                <span style={{ fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase', color: G500, fontWeight: 700 }}>Filters</span>
                {(status !== 'all' || region !== 'all' || typeFilter !== 'all') && (
                  <button onClick={() => { setStatus('all'); setRegion('all'); setType('all'); }}
                    style={{ marginLeft: 'auto', fontSize: 8, color: AC, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <X style={{ width: 9, height: 9 }} strokeWidth={2.5} /> Reset
                  </button>
                )}
              </div>

              {/* Status filter pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(['all', 'active', 'completed', 'planning'] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, padding: '4px 10px', border: `1px solid ${status === s ? STATUS_COLOR[s as ClientStatus] ?? AC : 'rgba(255,255,255,0.12)'}`, backgroundColor: status === s ? `${STATUS_COLOR[s as ClientStatus] ?? AC}18` : 'transparent', color: status === s ? (STATUS_COLOR[s as ClientStatus] ?? ACL) : G500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {s === 'all' ? 'All Status' : STATUS_LABEL[s as ClientStatus]}
                  </button>
                ))}
              </div>

              {/* Region filter pills */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                {(['all', 'texas', 'national'] as const).map(r => (
                  <button key={r} onClick={() => setRegion(r)}
                    style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, padding: '4px 10px', border: `1px solid ${region === r ? AC : 'rgba(255,255,255,0.12)'}`, backgroundColor: region === r ? 'rgba(157,126,63,0.18)' : 'transparent', color: region === r ? ACL : G500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {r === 'all' ? 'All' : r === 'texas' ? 'Texas' : 'National'}
                  </button>
                ))}
              </div>
            </div>

            {/* Client list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '10px 14px 6px', position: 'sticky', top: 0, backgroundColor: '#100F0D', zIndex: 1 }}>
                <span style={{ fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase', color: G500, fontWeight: 700 }}>{filtered.length} projects shown</span>
              </div>
              {filtered.map(c => (
                <ClientRow key={c.id} client={c} isSelected={selected === c.id} onClick={() => flyTo(c)} />
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: G500, fontSize: 11 }}>
                  No clients match the current filters.
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: G500, fontWeight: 700, marginBottom: 8 }}>Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(STATUS_COLOR).map(([s, col]) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col, flexShrink: 0, boxShadow: s === 'active' ? `0 0 5px ${col}` : 'none' }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{STATUS_LABEL[s as ClientStatus]}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, fontSize: 8, color: G500 }}>Marker size = project value</div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAP AREA ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map container */}
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Sidebar toggle */}
        <button
          onClick={() => setSideOpen(o => !o)}
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', fontSize: 9, letterSpacing: '0.22em',
            textTransform: 'uppercase', fontWeight: 800,
            backgroundColor: '#100F0D', border: '1px solid rgba(157,126,63,0.3)',
            color: ACL, cursor: 'pointer', transition: 'all 0.18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,126,63,0.3)'; }}
        >
          {sideOpen ? <X style={{ width: 12, height: 12 }} strokeWidth={2.5} /> : <BarChart2 style={{ width: 12, height: 12 }} strokeWidth={2} />}
          {sideOpen ? 'Hide Panel' : 'Show Panel'}
        </button>

        {/* Summary chips (top center) */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 8, pointerEvents: 'none' }}>
          {[
            { icon: Users,      label: `${filtered.length} Clients` },
            { icon: TrendingUp, label: `$${totalValue.toFixed(0)}M Portfolio` },
            { icon: Clock,      label: `${activeCount} Active` },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', backgroundColor: 'rgba(16,15,13,0.85)', border: '1px solid rgba(157,126,63,0.25)', backdropFilter: 'blur(8px)' }}>
              <Icon style={{ width: 11, height: 11, color: AC }} strokeWidth={1.5} />
              <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: W }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {!ready && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{ position: 'absolute', inset: 0, backgroundColor: '#0D0D0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(157,126,63,0.2)', borderTopColor: AC, marginBottom: 16 }}
              />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: W, marginBottom: 6 }}>
                Initializing Map
              </div>
              <div style={{ fontSize: 10, color: G500 }}>Loading client coverage data…</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo watermark */}
        <div style={{ position: 'absolute', bottom: 40, left: sideOpen ? 16 : 16, zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', backgroundColor: 'rgba(16,15,13,0.7)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, color: '#60a5fa' }}>Demo Data — Replace with live client records</span>
          </div>
        </div>
      </div>
    </div>
  );
}
