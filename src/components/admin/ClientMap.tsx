import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  MapPin as MapPinIcon, Globe, Map as MapIcon, BarChart2,
  DollarSign, Users, TrendingUp, X, CheckCircle2, Plus, Edit3,
  Trash2, Save, Search, Activity, Clock,
} from 'lucide-react';

/* ── Tokens ─────────────────────────────────────────────────────── */
const W    = '#FFFFFF';
const G100 = '#100F0D';
const G200 = '#2A2A2A';
const G400 = '#5A5A5A';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SERIF = "'Cormorant Garamond', Georgia, serif";

/* ── Types ─────────────────────────────────────────────────────── */
type PinStatus = 'active' | 'completed' | 'planning';

interface MapPin {
  id: string;
  name: string;
  client_company: string | null;
  city: string;
  state: string;
  lng: number;
  lat: number;
  project_type: string | null;
  status: PinStatus;
  value_million: number | null;
  sqft: string | null;
  description: string | null;
  year: number | null;
  region: string;
  created_at: string;
}

interface GeoResult {
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
}

interface PinFormState {
  address: string;
  name: string;
  client_company: string;
  city: string;
  state: string;
  lat: string;
  lng: string;
  project_type: string;
  status: PinStatus;
  value_million: string;
  sqft: string;
  description: string;
  year: string;
  region: string;
}

const STATUS_COLOR: Record<PinStatus, string> = {
  active:    '#9D7E3F',
  completed: '#10b981',
  planning:  '#3b82f6',
};
const STATUS_LABEL: Record<PinStatus, string> = {
  active: 'Active', completed: 'Completed', planning: 'Planning',
};
const PROJECT_TYPES = [
  'Luxury Residential', 'Commercial Office', 'Industrial', 'Retail',
  'Healthcare', 'Mixed-Use', 'Renovation', 'PM Consulting', 'Other',
];
const EMPTY_FORM: PinFormState = {
  address: '', name: '', client_company: '', city: '', state: 'TX',
  lat: '', lng: '', project_type: 'Luxury Residential',
  status: 'active', value_million: '', sqft: '',
  description: '', year: String(new Date().getFullYear()), region: 'texas',
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtVal(v: number | null): string {
  if (v == null) return '—';
  return v >= 10 ? `$${v.toFixed(0)}M` : `$${v.toFixed(1)}M`;
}
function markerSize(v: number | null): number {
  if (v == null || v < 5) return 20;
  if (v >= 80) return 32;
  if (v >= 20) return 26;
  return 22;
}

/* ── Marker + preview CSS ───────────────────────────────────────── */
function injectMarkerStyles() {
  if (document.getElementById('hou-map-styles')) return;
  const style = document.createElement('style');
  style.id = 'hou-map-styles';
  style.textContent = `
    .hou-marker-wrap { cursor: pointer; transition: transform 0.18s ease; }
    .hou-marker-wrap:hover { transform: scale(1.25); z-index: 99 !important; }
    .hou-dot {
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 700; color: #fff;
      border: 2px solid rgba(255,255,255,0.35);
      box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 2px rgba(0,0,0,0.3);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .hou-dot.status-active    { background: linear-gradient(135deg, #C4A76B, #9D7E3F); animation: hou-pulse 2.2s ease-out infinite; }
    .hou-dot.status-completed { background: linear-gradient(135deg, #34d399, #10b981); }
    .hou-dot.status-planning  { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    .hou-dot.is-selected { transform: scale(1.3); box-shadow: 0 0 0 4px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.6); }
    @keyframes hou-pulse {
      0%   { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 0   rgba(196,167,107,0.6); }
      60%  { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 10px rgba(196,167,107,0);   }
      100% { box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 0   rgba(196,167,107,0);   }
    }
    .hou-preview-wrap { pointer-events: none; }
    .hou-preview-dot {
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(157,126,63,0.35); border: 2px dashed #9D7E3F;
      display: flex; align-items: center; justify-content: center;
      animation: hou-preview-pulse 1.2s ease-in-out infinite;
    }
    .hou-preview-inner { width: 8px; height: 8px; border-radius: 50%; background: #C4A76B; }
    @keyframes hou-preview-pulse {
      0%   { transform: scale(1);    opacity: 0.9; }
      50%  { transform: scale(1.35); opacity: 0.55; }
      100% { transform: scale(1);    opacity: 0.9; }
    }
    .mapboxgl-ctrl-group { background: #1a1917 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 0 !important; }
    .mapboxgl-ctrl-group button { border-radius: 0 !important; }
    .mapboxgl-ctrl button.mapboxgl-ctrl-zoom-in   .mapboxgl-ctrl-icon,
    .mapboxgl-ctrl button.mapboxgl-ctrl-zoom-out  .mapboxgl-ctrl-icon,
    .mapboxgl-ctrl button.mapboxgl-ctrl-compass   .mapboxgl-ctrl-icon { filter: invert(1) opacity(0.55); }
    .mapboxgl-ctrl button:hover .mapboxgl-ctrl-icon { filter: invert(1) opacity(1); }
    .pin-row-actions { display: none; }
    .pin-row:hover .pin-row-actions { display: flex !important; }
  `;
  document.head.appendChild(style);
}

/* ── No-token placeholder ───────────────────────────────────────── */
function NoToken() {
  return (
    <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: '#0D0D0B', color: 'rgba(255,255,255,0.38)' }}>
      <MapIcon style={{ width: 48, height: 48, color: AC, marginBottom: 20 }} strokeWidth={1} />
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 28, color: W, marginBottom: 12 }}>
        Mapbox Token Required
      </div>
      <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 380, lineHeight: 1.8, marginBottom: 24 }}>
        Add your Mapbox public token to <code style={{ color: ACL, backgroundColor: 'rgba(157,126,63,0.1)', padding: '1px 6px' }}>.env</code>:
      </p>
      <div style={{ backgroundColor: '#1A1917', border: '1px solid rgba(157,126,63,0.3)', padding: '14px 24px', fontFamily: 'monospace', fontSize: 12, color: ACL }}>
        VITE_MAPBOX_TOKEN=pk.eyJ1...
      </div>
    </div>
  );
}

/* ── Address search ─────────────────────────────────────────────── */
function AddressSearch({
  token, value, onChange, onSelect, placeholder,
}: {
  token: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: GeoResult) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy]       = useState(false);
  const [open, setOpen]       = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 3) { setResults([]); return; }
    setBusy(true);
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${token}&autocomplete=true&types=address,place,poi,neighborhood&country=us&limit=6`;
      const res  = await fetch(url);
      const data = await res.json();
      setResults(data.features ?? []);
    } catch { setResults([]); }
    setBusy(false);
  }, [token]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (value.length > 2) {
      debounce.current = setTimeout(() => search(value), 280);
    } else {
      setResults([]);
    }
    return () => clearTimeout(debounce.current);
  }, [value, search]);

  const pick = (f: any) => {
    const [lng, lat] = f.center as [number, number];
    const ctx    = (f.context ?? []) as any[];
    const place  = ctx.find((c: any) => c.id.startsWith('place.'));
    const region = ctx.find((c: any) => c.id.startsWith('region.'));
    const city   = place?.text ?? f.text ?? '';
    const state  = region?.short_code?.replace('US-', '') ?? '';
    onSelect({ address: f.place_name, lat, lng, city, state });
    onChange(f.place_name);
    setResults([]);
    setOpen(false);
  };

  const showDropdown = open && results.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px',
        backgroundColor: '#141312',
        border: `1px solid ${open ? AC : 'rgba(255,255,255,0.09)'}`,
        transition: 'border-color 0.18s',
      }}>
        <Search style={{ width: 14, height: 14, color: open ? ACL : G500, flexShrink: 0, transition: 'color 0.18s' }} strokeWidth={2} />
        <input
          type="text"
          placeholder={placeholder ?? 'Type address or location…'}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={e => {
            if (e.key === 'Enter' && results.length > 0) pick(results[0]);
            if (e.key === 'Escape') { setResults([]); setOpen(false); }
          }}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: W, fontSize: 13, fontFamily: 'system-ui, sans-serif' }}
        />
        {busy && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(157,126,63,0.2)', borderTopColor: AC, flexShrink: 0 }}
          />
        )}
        {value && !busy && (
          <button
            onClick={() => { onChange(''); setResults([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: G500, padding: 0, display: 'flex', flexShrink: 0 }}
          >
            <X style={{ width: 12, height: 12 }} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              backgroundColor: '#1A1917', border: '1px solid rgba(157,126,63,0.35)',
              borderTop: 'none', maxHeight: 240, overflowY: 'auto',
            }}
          >
            {results.map((f: any) => (
              <button
                key={f.id}
                onMouseDown={() => pick(f)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 13px',
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', backgroundColor: 'transparent', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <MapPinIcon style={{ width: 12, height: 12, color: AC, flexShrink: 0, marginTop: 3 }} strokeWidth={2} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: W, fontWeight: 600, marginBottom: 2 }}>{f.text}</div>
                  <div style={{ fontSize: 10, color: G500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.place_name}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Pin form ───────────────────────────────────────────────────── */
function PinForm({
  form, setForm, onSave, onCancel, saving, isEdit, token, onCoordinateChange, onRequestMapPlace,
}: {
  form: PinFormState;
  setForm: (f: PinFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
  token: string;
  onCoordinateChange: (lat: number, lng: number) => void;
  onRequestMapPlace: () => void;
}) {
  const F = (field: keyof PinFormState, label: string, placeholder?: string, type = 'text') => (
    <div>
      <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 5 }}>{label}</label>
      <input
        type={type} placeholder={placeholder}
        value={form[field] as string}
        onChange={e => setForm({ ...form, [field]: e.target.value })}
        style={{ width: '100%', padding: '9px 12px', backgroundColor: '#141312', border: '1px solid rgba(255,255,255,0.09)', color: W, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }}
        onFocus={e => { e.target.style.borderColor = AC; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
    </div>
  );

  const coordsSet = form.lat && form.lng && !isNaN(Number(form.lat)) && !isNaN(Number(form.lng));
  const canSave   = !!form.name.trim() && !!coordsSet;

  const handleGeoSelect = (r: GeoResult) => {
    setForm({
      ...form,
      address: r.address,
      lat: String(r.lat.toFixed(6)),
      lng: String(r.lng.toFixed(6)),
      city: r.city || form.city,
      state: r.state || form.state,
    });
    onCoordinateChange(r.lat, r.lng);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, backgroundColor: G100, borderTop: `2px solid ${AC}`, maxHeight: '88vh', overflowY: 'auto' }}
    >
      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, backgroundColor: G100, zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: AC, fontWeight: 800, marginBottom: 2 }}>{isEdit ? 'Edit' : 'New'} Pin</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: W }}>Pin Details</div>
        </div>
        <button onClick={onCancel} style={{ color: G500, background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}>
          <X style={{ width: 16, height: 16 }} strokeWidth={2} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Location (geocoding) */}
        <div>
          <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 5 }}>
            Location — Search Address *
          </label>
          <AddressSearch
            token={token}
            value={form.address}
            onChange={v => setForm({ ...form, address: v })}
            onSelect={handleGeoSelect}
            placeholder="e.g. 5215 Westheimer Rd, Houston, TX"
          />

          {/* Location confirmed badge */}
          <AnimatePresence>
            {coordsSet && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, padding: '7px 10px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
              >
                <CheckCircle2 style={{ width: 11, height: 11, color: '#10b981', flexShrink: 0 }} strokeWidth={2} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {form.address
                    ? <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.address}</div>
                    : <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Pinned · {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}</div>
                  }
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop-pin-on-map button */}
          <button
            type="button"
            onClick={onRequestMapPlace}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', marginTop: 7, padding: '8px 12px',
              backgroundColor: 'rgba(157,126,63,0.08)', border: '1px solid rgba(157,126,63,0.22)',
              color: ACL, fontSize: 8, fontWeight: 800, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.08)'; }}
          >
            <MapPinIcon style={{ width: 11, height: 11 }} strokeWidth={2} />
            Or drop a pin on the map
          </button>
        </div>

        {/* Project Name */}
        {F('name', 'Project Name *', 'e.g. Galleria Commerce Center')}

        {/* Client / Company */}
        {F('client_company', 'Client / Company', 'e.g. Meridian Capital')}

        {/* Project type */}
        <div>
          <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 5 }}>Project Type</label>
          <select
            value={form.project_type}
            onChange={e => setForm({ ...form, project_type: e.target.value })}
            style={{ width: '100%', padding: '9px 12px', backgroundColor: '#141312', border: '1px solid rgba(255,255,255,0.09)', color: W, fontSize: 12, outline: 'none' }}
          >
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 7 }}>Status</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['active', 'completed', 'planning'] as PinStatus[]).map(s => (
              <button key={s} onClick={() => setForm({ ...form, status: s })}
                style={{
                  flex: 1, padding: '9px 4px', fontSize: 8, letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const, fontWeight: 800,
                  border: `1px solid ${form.status === s ? STATUS_COLOR[s] : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: form.status === s ? `${STATUS_COLOR[s]}22` : 'transparent',
                  color: form.status === s ? STATUS_COLOR[s] : G500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: form.status === s ? STATUS_COLOR[s] : 'rgba(255,255,255,0.2)', margin: '0 auto 4px', boxShadow: form.status === s && s === 'active' ? `0 0 6px ${STATUS_COLOR[s]}` : 'none' }} />
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Value + sqft */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {F('value_million', 'Value ($ M)', '8.4', 'number')}
          {F('sqft', 'Sq Footage', '14,200')}
        </div>

        {/* Year + Region */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {F('year', 'Year', '2024', 'number')}
          <div>
            <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 5 }}>Region</label>
            <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#141312', border: '1px solid rgba(255,255,255,0.09)', color: W, fontSize: 12, outline: 'none' }}>
              <option value="texas">Texas</option>
              <option value="national">National</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: G500, marginBottom: 5 }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief project description..."
            rows={3}
            style={{ width: '100%', padding: '9px 12px', backgroundColor: '#141312', border: '1px solid rgba(255,255,255,0.09)', color: W, fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'system-ui', boxSizing: 'border-box' as const }}
            onFocus={e => { e.target.style.borderColor = AC; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            style={{ flex: 1, padding: '12px', backgroundColor: canSave ? AC : '#2A2926', color: canSave ? W : G400, fontSize: 9, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase' as const, border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s' }}
            onMouseEnter={e => { if (canSave) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <Save style={{ width: 13, height: 13 }} strokeWidth={2} />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Pin'}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: '12px 18px', backgroundColor: 'transparent', color: G500, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Detail panel ───────────────────────────────────────────────── */
function DetailPanel({
  pin, onClose, onEdit, onDelete, deleting,
}: {
  pin: MapPin;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const col = STATUS_COLOR[pin.status];
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, zIndex: 20,
        backgroundColor: G100, borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      <div style={{ height: 4, backgroundColor: col, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: col, fontWeight: 800, marginBottom: 5 }}>
              {pin.project_type || 'Project'}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: W, lineHeight: 1.15, marginBottom: 4 }}>
              {pin.name}
            </div>
            {pin.client_company && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>{pin.client_company}</div>
            )}
          </div>
          <button onClick={onClose} style={{ color: G500, background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
            <X style={{ width: 15, height: 15 }} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', backgroundColor: `${col}18`, border: `1px solid ${col}40` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: col }} />
          <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, color: col }}>{STATUS_LABEL[pin.status]}</span>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>Location</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: W }}>{pin.city}{pin.city && pin.state ? ', ' : ''}{pin.state}</div>
          </div>
          {pin.value_million != null && (
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>Value</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: ACL }}>{fmtVal(pin.value_million)}</div>
            </div>
          )}
          {pin.sqft && (
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>Area</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: W }}>{pin.sqft} SF</div>
            </div>
          )}
          {pin.year && (
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>Year</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: W }}>{pin.year}</div>
            </div>
          )}
        </div>
      </div>

      {pin.description && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: G500, fontWeight: 700, marginBottom: 7 }}>Description</div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.56)', lineHeight: 1.72, margin: 0 }}>{pin.description}</p>
        </div>
      )}

      <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: G500, fontWeight: 600, marginBottom: 4 }}>Coordinates</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 18px', display: 'flex', gap: 8, marginTop: 'auto', flexShrink: 0 }}>
        <button onClick={onEdit}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', backgroundColor: 'rgba(157,126,63,0.12)', color: ACL, fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', border: `1px solid rgba(157,126,63,0.3)`, cursor: 'pointer' }}>
          <Edit3 style={{ width: 12, height: 12 }} strokeWidth={2} /> Edit
        </button>
        <button onClick={onDelete} disabled={deleting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', border: '1px solid rgba(239,68,68,0.2)', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
          <Trash2 style={{ width: 12, height: 12 }} strokeWidth={2} />
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function ClientMap() {
  const token          = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapContainer   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<mapboxgl.Map | null>(null);
  const markersRef     = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLElement }>>(new Map());
  const mapClickRef    = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);
  const previewMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [ready,        setReady]        = useState(false);
  const [pins,         setPins]         = useState<MapPin[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [detail,       setDetail]       = useState<MapPin | null>(null);
  const [addMode,      setAddMode]      = useState(false);
  const [formMode,     setFormMode]     = useState<'add' | 'edit' | null>(null);
  const [form,         setForm]         = useState<PinFormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [sideOpen,     setSideOpen]     = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PinStatus>('all');

  useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth < 768;
      setIsCompact(compact);
      if (compact) setSideOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Load pins ── */
  const loadPins = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('map_pins')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) {
        setPins([]);
        return;
      }
      setPins((data ?? []) as MapPin[]);
    } catch { /* table may not exist yet */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPins(); }, [loadPins]);

  /* ── Realtime ── */
  useEffect(() => {
    const ch = supabase.channel('map-pins-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_pins' }, loadPins)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadPins]);

  /* ── Filtered list ── */
  const filtered = pins.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!search.trim() || [p.name, p.client_company ?? '', p.city].some(s => s.toLowerCase().includes(search.toLowerCase())))
  );

  const totalValue  = filtered.reduce((s, p) => s + (p.value_million ?? 0), 0);
  const activeCount = filtered.filter(p => p.status === 'active').length;

  /* ── Preview marker helpers ── */
  const removePreview = useCallback(() => {
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
  }, []);

  const updatePreview = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    removePreview();
    const wrap = document.createElement('div');
    wrap.className = 'hou-preview-wrap';
    const dot = document.createElement('div');
    dot.className = 'hou-preview-dot';
    const inner = document.createElement('div');
    inner.className = 'hou-preview-inner';
    dot.appendChild(inner);
    wrap.appendChild(dot);
    previewMarkerRef.current = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    mapRef.current.easeTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 11), duration: 900 });
  }, [removePreview]);

  /* ── Reverse geocode ── */
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeoResult> => {
    const fallback: GeoResult = { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng, city: '', state: '' };
    if (!token) return fallback;
    try {
      const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address&limit=1`);
      const data = await res.json();
      const f    = data.features?.[0];
      if (!f) return fallback;
      const ctx    = (f.context ?? []) as any[];
      const place  = ctx.find((c: any) => c.id.startsWith('place.'));
      const region = ctx.find((c: any) => c.id.startsWith('region.'));
      return {
        address: f.place_name ?? fallback.address,
        lat, lng,
        city:  place?.text ?? '',
        state: region?.short_code?.replace('US-', '') ?? '',
      };
    } catch { return fallback; }
  }, [token]);

  /* ── Init map ── */
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    injectMarkerStyles();
    (mapboxgl as any).accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5, 39.5],
      zoom: 3.5,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;
      map.addSource('states', { type: 'geojson', data: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json' });
      map.addLayer({ id: 'state-fills', type: 'fill', source: 'states', paint: { 'fill-color': ['case', ['==', ['get', 'name'], 'Texas'], 'rgba(157,126,63,0.07)', 'rgba(255,255,255,0.01)'], 'fill-opacity': 1 } });
      map.addLayer({ id: 'state-borders', type: 'line', source: 'states', paint: { 'line-color': 'rgba(255,255,255,0.08)', 'line-width': 0.8 } });
      map.addLayer({ id: 'texas-border', type: 'line', source: 'states', filter: ['==', ['get', 'name'], 'Texas'], paint: { 'line-color': 'rgba(157,126,63,0.4)', 'line-width': 1.5 } });
      setReady(true);
      setTimeout(() => map.flyTo({ center: [-97.5, 31.0], zoom: 5.8, duration: 2200, essential: true, curve: 1.4 }), 600);
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      removePreview();
      map.remove();
      mapRef.current = null;
    };
  }, [token, removePreview]);

  /* ── Sync markers ── */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const visibleIds = new Set(filtered.map(p => p.id));

    markersRef.current.forEach(({ marker }, id) => {
      if (!visibleIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    filtered.forEach(pin => {
      const existing = markersRef.current.get(pin.id);
      if (existing) {
        const dot = existing.el.querySelector('.hou-dot') as HTMLElement | null;
        if (dot) dot.className = `hou-dot status-${pin.status}${selected === pin.id ? ' is-selected' : ''}`;
        return;
      }

      const sz   = markerSize(pin.value_million);
      const wrap = document.createElement('div');
      wrap.className = 'hou-marker-wrap';
      wrap.style.zIndex = String(sz);
      const dot = document.createElement('div');
      dot.className = `hou-dot status-${pin.status}${selected === pin.id ? ' is-selected' : ''}`;
      dot.style.width = `${sz}px`;
      dot.style.height = `${sz}px`;
      dot.style.fontSize = `${Math.max(7, sz / 3.5)}px`;
      if (sz >= 28) dot.textContent = pin.name.split(' ').slice(0, 2).map(w => w[0]).join('');
      wrap.appendChild(dot);

      const marker = new mapboxgl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current!);

      wrap.addEventListener('click', e => {
        e.stopPropagation();
        setSelected(pin.id);
        setDetail(pin);
        setFormMode(null);
        mapRef.current!.easeTo({ center: [pin.lng, pin.lat], zoom: 11, duration: 900 });
      });

      markersRef.current.set(pin.id, { marker, el: wrap });
    });
  }, [pins, filtered, selected, ready]);

  /* ── Map click for add mode (with reverse geocoding) ── */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (mapClickRef.current) { mapRef.current.off('click', mapClickRef.current); mapClickRef.current = null; }

    if (addMode) {
      mapRef.current.getCanvas().style.cursor = 'crosshair';
      const handler = async (e: mapboxgl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        mapRef.current!.getCanvas().style.cursor = 'wait';
        const geo = await reverseGeocode(lat, lng);
        setForm(f => ({
          ...f,
          address: geo.address,
          lat: String(lat.toFixed(6)),
          lng: String(lng.toFixed(6)),
          city:  geo.city  || f.city,
          state: geo.state || f.state,
        }));
        updatePreview(lat, lng);
        setFormMode('add');
        setAddMode(false);
        setSideOpen(true);
        mapRef.current!.getCanvas().style.cursor = '';
      };
      mapClickRef.current = handler;
      mapRef.current.on('click', handler);
    } else {
      mapRef.current.getCanvas().style.cursor = '';
    }
  }, [addMode, ready, reverseGeocode, updatePreview]);

  /* ── CRUD handlers ── */
  const openAdd = () => {
    removePreview();
    setForm(EMPTY_FORM);
    setFormMode('add');
    setDetail(null);
    setSelected(null);
  };

  const openEdit = (pin: MapPin) => {
    removePreview();
    setForm({
      address: '', name: pin.name, client_company: pin.client_company ?? '',
      city: pin.city, state: pin.state,
      lat: String(pin.lat), lng: String(pin.lng),
      project_type: pin.project_type ?? PROJECT_TYPES[0],
      status: pin.status,
      value_million: pin.value_million != null ? String(pin.value_million) : '',
      sqft: pin.sqft ?? '', description: pin.description ?? '',
      year: pin.year ? String(pin.year) : '', region: pin.region,
    });
    setFormMode('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.lat || !form.lng) return;
    setSaving(true);
    const payload = {
      name:           form.name.trim(),
      client_company: form.client_company.trim() || null,
      city:           form.city.trim() || '',
      state:          form.state.trim() || 'TX',
      lng:            parseFloat(form.lng),
      lat:            parseFloat(form.lat),
      project_type:   form.project_type || null,
      status:         form.status,
      value_million:  form.value_million ? parseFloat(form.value_million) : null,
      sqft:           form.sqft.trim() || null,
      description:    form.description.trim() || null,
      year:           form.year ? parseInt(form.year) : null,
      region:         form.region || 'texas',
    };
    try {
      if (formMode === 'edit' && detail) {
        await (supabase as any).from('map_pins').update(payload).eq('id', detail.id);
      } else {
        await (supabase as any).from('map_pins').insert(payload);
      }
      removePreview();
      setFormMode(null);
      setDetail(null);
      setSelected(null);
      await loadPins();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    await (supabase as any).from('map_pins').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleting(false);
    setDetail(null);
    setSelected(null);
    setConfirmId(null);
    await loadPins();
  };

  const flyTo = (pin: MapPin) => {
    setSelected(pin.id);
    setDetail(pin);
    setFormMode(null);
    mapRef.current?.easeTo({ center: [pin.lng, pin.lat], zoom: 11, duration: 900 });
  };

  const handleRequestMapPlace = () => {
    setFormMode(null);
    setAddMode(true);
    setSideOpen(false);
  };

  if (!token) {
    return <div style={{ height: '100%', display: 'flex' }}><NoToken /></div>;
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#0D0D0B', overflow: 'hidden', position: 'relative' }}>

      {/* ── SIDEBAR ── */}
      <AnimatePresence>
        {sideOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }} animate={{ width: isCompact ? Math.min(window.innerWidth, 340) : 295, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexShrink: 0, maxWidth: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: G100, borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', position: isCompact ? 'absolute' : 'relative', inset: isCompact ? '0 auto 0 0' : undefined, zIndex: isCompact ? 15 : 5 }}
          >
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Globe style={{ width: 12, height: 12, color: AC }} strokeWidth={1.5} />
                <div style={{ fontSize: 8, letterSpacing: '0.36em', textTransform: 'uppercase', fontWeight: 800, color: AC, flex: 1 }}>Client Map</div>
              </div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: W, marginBottom: 12, lineHeight: 1.1 }}>
                {pins.length} Project{pins.length !== 1 ? 's' : ''}
              </div>
              {/* Add Pin row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={openAdd}
                  style={{ flex: 1, padding: '8px 10px', backgroundColor: AC, color: W, fontSize: 8, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <Plus style={{ width: 12, height: 12 }} strokeWidth={2.5} /> Add Pin
                </button>
                <button
                  onClick={() => { setForm(EMPTY_FORM); setAddMode(true); setSideOpen(false); }}
                  title="Click on map to place"
                  style={{ padding: '8px 10px', backgroundColor: 'rgba(157,126,63,0.14)', border: `1px solid rgba(157,126,63,0.35)`, color: ACL, fontSize: 8, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.24)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.14)'; }}
                >
                  <MapPinIcon style={{ width: 11, height: 11 }} strokeWidth={2} /> Drop Pin
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              {([
                { icon: DollarSign,   label: 'Portfolio', val: totalValue > 0 ? `$${totalValue.toFixed(0)}M` : '$0M' },
                { icon: Activity,     label: 'Active',    val: String(activeCount) },
                { icon: CheckCircle2, label: 'Complete',  val: String(filtered.filter(p => p.status === 'completed').length) },
                { icon: Clock,        label: 'Planning',  val: String(filtered.filter(p => p.status === 'planning').length) },
              ] as { icon: React.ComponentType<any>; label: string; val: string }[]).map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} style={{ backgroundColor: G100, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <Icon style={{ width: 10, height: 10, color: AC }} strokeWidth={1.5} />
                      <div style={{ fontSize: 7.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: G500, fontWeight: 700 }}>{s.label}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: W, fontFamily: 'system-ui, sans-serif' }}>{s.val}</div>
                  </div>
                );
              })}
            </div>

            {/* Search + filter */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#1A1917', border: '1px solid rgba(255,255,255,0.08)', padding: '7px 10px', marginBottom: 8 }}>
                <Search style={{ width: 11, height: 11, color: G500, flexShrink: 0 }} strokeWidth={2} />
                <input
                  type="text" placeholder="Search projects…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: W, fontSize: 11, flex: 1, fontFamily: 'system-ui' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G500, padding: 0, display: 'flex' }}>
                    <X style={{ width: 10, height: 10 }} strokeWidth={2} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'active', 'completed', 'planning'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{ flex: 1, padding: '5px 2px', fontSize: 7.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, border: `1px solid ${statusFilter === s ? (STATUS_COLOR[s as PinStatus] ?? AC) : 'rgba(255,255,255,0.1)'}`, backgroundColor: statusFilter === s ? `${STATUS_COLOR[s as PinStatus] ?? AC}20` : 'transparent', color: statusFilter === s ? (STATUS_COLOR[s as PinStatus] ?? ACL) : G500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {s === 'all' ? 'All' : s === 'active' ? 'Active' : s === 'completed' ? 'Done' : 'Plan'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pin list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && <div style={{ padding: '24px 16px', textAlign: 'center', color: G500, fontSize: 11 }}>Loading…</div>}
              {!loading && filtered.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <MapPinIcon style={{ width: 26, height: 26, color: 'rgba(157,126,63,0.3)', display: 'block', margin: '0 auto 10px' }} strokeWidth={1} />
                  <div style={{ fontSize: 11, color: G500, marginBottom: 8 }}>
                    {pins.length === 0 ? 'No pins yet' : 'No matches'}
                  </div>
                  {pins.length === 0 && (
                    <button onClick={openAdd}
                      style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, color: ACL, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Add your first pin →
                    </button>
                  )}
                </div>
              )}
              {filtered.map(pin => {
                const col        = STATUS_COLOR[pin.status];
                const isSelected = selected === pin.id;
                return (
                  <div key={pin.id} className="pin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => flyTo(pin)}
                      style={{ flex: 1, textAlign: 'left', padding: '10px 12px 10px 14px', backgroundColor: isSelected ? 'rgba(157,126,63,0.1)' : 'transparent', borderLeft: `2px solid ${isSelected ? AC : 'transparent'}`, border: 'none', borderLeftColor: isSelected ? AC : 'transparent', borderLeftStyle: 'solid', borderLeftWidth: 2, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col, flexShrink: 0, marginTop: 4, boxShadow: pin.status === 'active' ? `0 0 5px ${col}` : 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? ACL : W, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pin.name}</div>
                        <div style={{ fontSize: 9, color: G500 }}>{pin.city}{pin.city && pin.state ? ', ' : ''}{pin.state}{pin.value_million ? ` · ${fmtVal(pin.value_million)}` : ''}</div>
                      </div>
                    </button>
                    <div className="pin-row-actions" style={{ display: 'none', gap: 4, paddingRight: 8, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setDetail(pin); openEdit(pin); }}
                        title="Edit"
                        style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,126,63,0.15)', border: '1px solid rgba(157,126,63,0.3)', cursor: 'pointer', color: ACL }}>
                        <Edit3 style={{ width: 11, height: 11 }} strokeWidth={2} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(pin.id); }}
                        title="Delete"
                        style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 style={{ width: 11, height: 11 }} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {Object.entries(STATUS_COLOR).map(([s, col]) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: col, boxShadow: s === 'active' ? `0 0 4px ${col}` : 'none' }} />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)' }}>{STATUS_LABEL[s as PinStatus]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form modal (slides over sidebar) */}
            <AnimatePresence>
              {formMode && (
                <PinForm
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  onCancel={() => { removePreview(); setFormMode(null); setAddMode(false); }}
                  saving={saving}
                  isEdit={formMode === 'edit'}
                  token={token}
                  onCoordinateChange={updatePreview}
                  onRequestMapPlace={handleRequestMapPlace}
                />
              )}
            </AnimatePresence>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAP AREA ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Sidebar toggle */}
        <button
          onClick={() => { setSideOpen(o => !o); if (addMode) setAddMode(false); }}
          style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, backgroundColor: G100, border: '1px solid rgba(157,126,63,0.3)', color: ACL, cursor: 'pointer', transition: 'all 0.18s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,126,63,0.3)'; }}
        >
          {sideOpen ? <X style={{ width: 12, height: 12 }} strokeWidth={2.5} /> : <BarChart2 style={{ width: 12, height: 12 }} strokeWidth={2} />}
          {sideOpen ? 'Hide' : 'Panel'}
        </button>

        {/* Add-mode instruction banner */}
        <AnimatePresence>
          {addMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', backgroundColor: G100, border: `1px solid ${AC}`, pointerEvents: 'auto' }}
            >
              <MapPinIcon style={{ width: 13, height: 13, color: ACL }} strokeWidth={2} />
              <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: W }}>Click map to place pin</span>
              <button onClick={() => { setAddMode(false); setSideOpen(true); setFormMode(formMode); }} style={{ color: G500, background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 4, display: 'flex' }}>
                <X style={{ width: 12, height: 12 }} strokeWidth={2.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Pin button when sidebar is hidden and not in add mode */}
        {!sideOpen && !addMode && !detail && (
          <button
            onClick={() => { setSideOpen(true); setTimeout(openAdd, 310); }}
            style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, backgroundColor: AC, color: W, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <Plus style={{ width: 12, height: 12 }} strokeWidth={2.5} /> Add Pin
          </button>
        )}

        {/* Summary chips */}
        {!addMode && !(isCompact && sideOpen) && (
          <div style={{ position: 'absolute', top: isCompact ? 58 : 14, left: isCompact ? 10 : '50%', right: isCompact ? 10 : undefined, transform: isCompact ? 'none' : 'translateX(-50%)', zIndex: 9, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, pointerEvents: 'none', maxWidth: isCompact ? 'none' : 'calc(100% - 28px)' }}>
            {([
              { icon: Users,      label: `${filtered.length} Pins` },
              { icon: TrendingUp, label: totalValue > 0 ? `$${totalValue.toFixed(0)}M Portfolio` : 'Portfolio' },
              { icon: Activity,   label: `${activeCount} Active` },
            ] as { icon: React.ComponentType<any>; label: string }[]).map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', backgroundColor: 'rgba(16,15,13,0.85)', border: '1px solid rgba(157,126,63,0.2)', backdropFilter: 'blur(8px)' }}>
                <Icon style={{ width: 10, height: 10, color: AC }} strokeWidth={1.5} />
                <span style={{ fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, color: W }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Map loading overlay */}
        <AnimatePresence>
          {!ready && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
              style={{ position: 'absolute', inset: 0, backgroundColor: '#0D0D0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(157,126,63,0.2)', borderTopColor: AC, marginBottom: 16 }} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: W, marginBottom: 6 }}>Initializing Map</div>
              <div style={{ fontSize: 10, color: G500 }}>Loading project coverage…</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail panel */}
        <AnimatePresence>
          {detail && !formMode && (
            <DetailPanel
              pin={detail}
              onClose={() => { setDetail(null); setSelected(null); }}
              onEdit={() => openEdit(detail)}
              onDelete={() => setConfirmId(detail.id)}
              deleting={deleting}
            />
          )}
        </AnimatePresence>

        {/* Delete confirmation dialog */}
        <AnimatePresence>
          {confirmId && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              onClick={() => setConfirmId(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ backgroundColor: '#131210', border: '1px solid rgba(239,68,68,0.3)', padding: '28px', maxWidth: 360, width: '100%' }}
              >
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: W, marginBottom: 8 }}>Remove Pin?</div>
                <p style={{ fontSize: 12, color: G500, marginBottom: 22, lineHeight: 1.65 }}>
                  This will permanently remove{' '}
                  <strong style={{ color: W }}>{pins.find(p => p.id === confirmId)?.name}</strong>{' '}
                  from the map. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDelete(confirmId!)}
                    disabled={deleting}
                    style={{ flex: 1, padding: '11px', backgroundColor: '#ef4444', color: W, fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
                    {deleting ? 'Removing…' : 'Yes, Remove'}
                  </button>
                  <button onClick={() => setConfirmId(null)}
                    style={{ flex: 1, padding: '11px', backgroundColor: 'transparent', color: G500, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
