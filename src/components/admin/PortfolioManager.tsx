import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Trash2, Edit3, Star, Image as ImageIcon,
  Video, Upload, CheckCircle2, AlertCircle, Loader2,
  ImagePlus, PlayCircle, MapPin, Search, Copy, ExternalLink,
  DollarSign, User, Maximize2, Calendar, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const G100 = '#F4F2EF';
const G200 = '#E5DFD6';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SERIF = "'Cormorant Garamond', Georgia, serif";

const CATEGORIES = [
  'Luxury Residential', 'Commercial Industrial', 'Retail & Mixed-Use',
  'Medical & Healthcare', 'High-Rise Residential', 'Renovation', 'Project Management',
];

const HOUSTON_NEIGHBORHOODS = [
  'River Oaks, Houston, TX', 'Memorial, Houston, TX', 'The Heights, Houston, TX',
  'Montrose, Houston, TX', 'Midtown, Houston, TX', 'Uptown / Galleria, Houston, TX',
  'Sugar Land, TX', 'Katy, TX', 'The Woodlands, TX', 'Pearland, TX',
  'Friendswood, TX', 'League City, TX', 'Cypress, TX', 'Spring, TX',
  'Humble, TX', 'Baytown, TX', 'Pasadena, TX', 'Bellaire, TX',
  'West University Place, TX', 'Southside Place, TX', 'Bunker Hill Village, TX',
  'Piney Point Village, TX', 'Hunters Creek Village, TX', 'Missouri City, TX',
  'Richmond, TX', 'Conroe, TX', 'Kingwood, TX',
];

/* ── Types ───────────────────────────────────────────────────────────── */
export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  location: string;
  city: string;
  sqft: string | null;
  budget: string | null;
  client_name: string | null;
  year: string;
  description: string | null;
  featured: boolean;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface PortfolioMedia {
  id: string;
  project_id: string;
  url: string;
  storage_path: string;
  media_type: 'image' | 'video';
  caption: string | null;
  sort_order: number;
}

interface UploadItem {
  uid: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
  previewUrl?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
  type: string;
}

/* ── Storage helpers ─────────────────────────────────────────────────── */
const SUPA_URL  = (import.meta.env.VITE_SUPABASE_URL  as string) ?? '';
const SUPA_ANON = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? '';

function publicUrl(path: string) {
  return `${SUPA_URL}/storage/v1/object/public/portfolio/${path}`;
}

function uploadWithProgress(
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(publicUrl(path));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).message ?? 'Upload failed')); }
        catch { reject(new Error(`Upload failed (${xhr.status})`)); }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', `${SUPA_URL}/storage/v1/object/portfolio/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPA_ANON}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });
}

/* ── DB helpers ──────────────────────────────────────────────────────── */
const db = supabase as any;

async function loadProjects(): Promise<PortfolioProject[]> {
  const { data, error } = await db.from('portfolio_projects').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function createProject(f: Omit<PortfolioProject, 'id' | 'created_at'>): Promise<PortfolioProject> {
  const { data, error } = await db.from('portfolio_projects').insert(f).select().single();
  if (error) throw error;
  return data;
}

async function updateProject(id: string, f: Partial<PortfolioProject>): Promise<void> {
  const { error } = await db.from('portfolio_projects')
    .update({ ...f, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

async function deleteProject(id: string): Promise<void> {
  const { error } = await db.from('portfolio_projects').delete().eq('id', id);
  if (error) throw error;
}

async function loadMedia(projectId: string): Promise<PortfolioMedia[]> {
  const { data, error } = await db.from('portfolio_media').select('*')
    .eq('project_id', projectId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function insertMedia(rec: Omit<PortfolioMedia, 'id'>): Promise<PortfolioMedia> {
  const { data, error } = await db.from('portfolio_media').insert(rec).select().single();
  if (error) throw error;
  return data;
}

async function deleteMedia(m: PortfolioMedia): Promise<void> {
  await supabase.storage.from('portfolio').remove([m.storage_path]);
  const { error } = await db.from('portfolio_media').delete().eq('id', m.id);
  if (error) throw error;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function ext(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : '';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTableMissing(msg: string): boolean {
  return msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation') || msg.includes('table');
}

/* ── Setup banner ────────────────────────────────────────────────────── */
const SETUP_SQL_SNIPPET = `-- Run this in Supabase → SQL Editor → New Query

create table if not exists portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Luxury Residential',
  location text not null default '',
  city text not null default 'Houston, TX',
  sqft text, budget text, client_name text,
  year text not null default extract(year from now())::text,
  description text, featured boolean not null default false,
  cover_url text, sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists portfolio_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references portfolio_projects(id) on delete cascade,
  url text not null, storage_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table portfolio_projects enable row level security;
alter table portfolio_media enable row level security;
create policy "public read portfolio_projects" on portfolio_projects for select using (true);
create policy "anon write portfolio_projects" on portfolio_projects for all using (true) with check (true);
create policy "public read portfolio_media" on portfolio_media for select using (true);
create policy "anon write portfolio_media" on portfolio_media for all using (true) with check (true);
insert into storage.buckets (id,name,public,file_size_limit)
values ('portfolio','portfolio',true,524288000)
on conflict (id) do update set public=true;
create policy "public read portfolio storage" on storage.objects for select using (bucket_id='portfolio');
create policy "anon insert portfolio storage" on storage.objects for insert to anon with check (bucket_id='portfolio');
create policy "anon delete portfolio storage" on storage.objects for delete to anon using (bucket_id='portfolio');`;

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SETUP_SQL_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.03)', padding: 20 }}>
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} strokeWidth={2} />
        <div>
          <div className="text-[13px] font-bold mb-1" style={{ color: B }}>Database tables not set up</div>
          <div className="text-[11px] leading-relaxed" style={{ color: G500 }}>
            The <code className="px-1 py-0.5 text-[10px] rounded" style={{ backgroundColor: G100 }}>portfolio_projects</code> and{' '}
            <code className="px-1 py-0.5 text-[10px] rounded" style={{ backgroundColor: G100 }}>portfolio_media</code> tables
            don't exist in your Supabase project yet. Follow these steps to create them:
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5 ml-8">
        {[
          { n: '1', text: 'Open your Supabase Dashboard', link: 'https://supabase.com/dashboard' },
          { n: '2', text: 'Go to SQL Editor → New Query' },
          { n: '3', text: 'Copy the SQL below and paste it in, then click Run' },
          { n: '4', text: 'Come back here and click "I\'ve run the SQL"' },
        ].map(s => (
          <div key={s.n} className="flex items-start gap-2.5">
            <div className="w-5 h-5 shrink-0 flex items-center justify-center text-[9px] font-black rounded-full"
              style={{ backgroundColor: AC, color: W }}>{s.n}</div>
            <div className="text-[11px] pt-0.5" style={{ color: B }}>
              {s.text}{' '}
              {s.link && (
                <a href={s.link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-0.5 underline"
                  style={{ color: AC }}>
                  supabase.com/dashboard <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SQL block */}
      <div className="ml-8">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold mb-2"
          style={{ color: G500, background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronDown className="w-3.5 h-3.5" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
          {expanded ? 'Hide SQL' : 'Show SQL to copy'}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="relative">
                <pre className="text-[9px] leading-relaxed overflow-x-auto p-3"
                  style={{ backgroundColor: B, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', maxHeight: 200 }}>
                  {SETUP_SQL_SNIPPET}
                </pre>
                <button onClick={copy}
                  className="absolute top-2 right-2 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 transition-colors"
                  style={{ backgroundColor: copied ? '#10b981' : AC, color: W, border: 'none', cursor: 'pointer' }}>
                  {copied ? <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2.5} />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 mt-4 ml-8">
        <button onClick={onRetry}
          className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-5 py-2.5"
          style={{ backgroundColor: B, color: W, border: 'none', cursor: 'pointer' }}>
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          I've run the SQL — retry
        </button>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-bold"
          style={{ color: AC }}>
          Open Supabase <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

/* ── Location autocomplete ───────────────────────────────────────────── */
function LocationAutocomplete({ value, onChange, city, onCityChange }: {
  value: string;
  onChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<{ label: string; sublabel: string; city: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [f, setF] = useState(false);

  /* Click outside to close */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Debounced search */
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }

    /* Local Houston neighborhoods first */
    const localMatches = HOUSTON_NEIGHBORHOODS
      .filter(n => n.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map(n => ({
        label: n.split(',')[0],
        sublabel: n.split(',').slice(1).join(',').trim(),
        city: n.includes('Houston') ? 'Houston, TX' : n.split(',').slice(-2).join(',').trim(),
      }));

    if (localMatches.length >= 3) {
      setSuggestions(localMatches);
      setOpen(true);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query + ', Texas, USA')}&` +
          `format=json&addressdetails=1&countrycodes=us&limit=6`,
          { headers: { 'Accept-Language': 'en-US,en' } }
        );
        const data: NominatimResult[] = await res.json();
        const apiMatches = data
          .filter(r => r.address?.state === 'Texas')
          .map(r => {
            const a = r.address;
            const street = a.road ? `${a.road}` : '';
            const neighborhood = a.suburb ?? a.neighbourhood ?? '';
            const cityName = a.city ?? a.town ?? a.county ?? 'Houston';
            const state = a.state ?? 'TX';
            return {
              label: street || neighborhood || r.display_name.split(',')[0],
              sublabel: [neighborhood, cityName, state].filter(Boolean).join(', '),
              city: `${cityName}, ${state}`,
            };
          })
          .slice(0, 5);
        setSuggestions([...localMatches, ...apiMatches].slice(0, 6));
        if ([...localMatches, ...apiMatches].length > 0) setOpen(true);
      } catch {
        setSuggestions(localMatches);
        if (localMatches.length > 0) setOpen(true);
      }
      setSearching(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (s: { label: string; sublabel: string; city: string }) => {
    const full = s.sublabel ? `${s.label}, ${s.sublabel}` : s.label;
    setQuery(full);
    onChange(full);
    onCityChange(s.city);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: f || open ? AC : G400 }} strokeWidth={1.5} />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: G400 }} strokeWidth={2} />}
        {!searching && query && (
          <button onClick={() => { setQuery(''); onChange(''); setSuggestions([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: G400, display: 'flex', alignItems: 'center' }}>
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
        <input
          className="w-full text-[13px] outline-none transition-colors"
          style={{
            padding: '10px 36px',
            border: `1px solid ${f || open ? B : G200}`,
            color: B, background: '#FAFAF9',
          }}
          value={query}
          placeholder="Start typing a neighborhood, address, or city…"
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          onFocus={() => { setF(true); if (suggestions.length > 0) setOpen(true); }}
          onBlur={() => setF(false)}
        />
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute z-50 left-0 right-0 top-full mt-1"
            style={{ backgroundColor: W, border: `1px solid ${G200}`, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}>
            <div className="text-[7px] uppercase tracking-[0.28em] font-bold px-3 py-1.5"
              style={{ color: G400, borderBottom: `1px solid ${G200}`, backgroundColor: G100 }}>
              <Search className="w-2.5 h-2.5 inline mr-1" strokeWidth={2} />
              Suggestions
            </div>
            {suggestions.map((s, i) => (
              <button key={i} onMouseDown={e => { e.preventDefault(); select(s); }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? `1px solid ${G200}` : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = G100; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                <div>
                  <div className="text-[12px] font-semibold" style={{ color: B }}>{s.label}</div>
                  {s.sublabel && <div className="text-[10px]" style={{ color: G500 }}>{s.sublabel}</div>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Shared form field component ─────────────────────────────────────── */
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5" style={{ color: G500 }}>
        {label}{required && ' *'}
        {hint && <span className="normal-case tracking-normal font-normal" style={{ color: G400 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-[13px] outline-none transition-colors';
const inputStyle = (focused: boolean): React.CSSProperties => ({
  padding: '10px 13px', border: `1px solid ${focused ? B : G200}`, color: B, background: '#FAFAF9',
});

function TInput({ value, onChange, required, placeholder, prefix, type = 'text' }: {
  value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
  prefix?: React.ReactNode; type?: string;
}) {
  const [f, setF] = useState(false);
  return (
    <div className="relative">
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: f ? AC : G400 }}>{prefix}</div>
      )}
      <input className={inputCls} style={{ ...inputStyle(f), paddingLeft: prefix ? 32 : 13 }}
        type={type} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        required={required} placeholder={placeholder} />
    </div>
  );
}

function TTextarea({ value, onChange, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  const [f, setF] = useState(false);
  return (
    <textarea className={`${inputCls} resize-none`} style={inputStyle(f)} value={value} rows={rows}
      onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
      placeholder={placeholder} />
  );
}

function TSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  const [f, setF] = useState(false);
  return (
    <div className="relative">
      <select className={inputCls} style={{ ...inputStyle(f), appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
        value={value} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: G400 }} strokeWidth={1.5} />
    </div>
  );
}

/* ── Upload zone ─────────────────────────────────────────────────────── */
function UploadZone({ onFiles, disabled }: { onFiles: (files: FileList) => void; disabled?: boolean }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? AC : disabled ? G200 : '#C8C0B4'}`,
        backgroundColor: drag ? 'rgba(157,126,63,0.05)' : disabled ? G100 : '#FAFAF9',
        padding: '32px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center', transition: 'all 0.18s', opacity: disabled ? 0.5 : 1,
      }}
    >
      <input ref={inputRef} type="file" multiple hidden
        accept="image/*,video/mp4,video/quicktime,video/webm,video/x-msvideo"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
      />
      <motion.div animate={{ y: drag ? -6 : 0 }} transition={{ duration: 0.22 }}>
        <div className="flex items-center justify-center gap-4 mb-3">
          <div style={{ padding: '10px', border: `1px solid ${drag ? AC : G200}`, backgroundColor: drag ? 'rgba(157,126,63,0.08)' : G100 }}>
            <ImageIcon style={{ width: 22, height: 22, color: drag ? AC : G400 }} strokeWidth={1.5} />
          </div>
          <div style={{ padding: '10px', border: `1px solid ${drag ? AC : G200}`, backgroundColor: drag ? 'rgba(157,126,63,0.08)' : G100 }}>
            <Video style={{ width: 22, height: 22, color: drag ? AC : G400 }} strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-[13px] font-semibold mb-1.5" style={{ color: drag ? AC : B }}>
          {drag ? 'Drop files here to upload' : 'Drag & drop photos or videos'}
        </div>
        <div className="text-[10px] mb-3" style={{ color: G500 }}>
          Or click to browse — any size · JPG, PNG, WebP, HEIC, MP4, MOV, WebM
        </div>
        {!disabled && (
          <div className="inline-flex items-center gap-2 px-4 py-2 text-[9px] uppercase tracking-[0.22em] font-bold transition-colors"
            style={{ backgroundColor: drag ? AC : B, color: W }}>
            <Upload className="w-3 h-3" strokeWidth={2} />
            Choose Files
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Upload progress item ────────────────────────────────────────────── */
function UploadProgressItem({ item }: { item: UploadItem }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
      <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${G200}` }}>
        <div className="w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid ${G200}` }}>
          {item.previewUrl
            ? <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
            : item.file.type.startsWith('video/')
              ? <PlayCircle style={{ width: 16, height: 16, color: G400 }} strokeWidth={1.5} />
              : <ImagePlus style={{ width: 16, height: 16, color: G400 }} strokeWidth={1.5} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold truncate mb-0.5" style={{ color: B }}>{item.file.name}</div>
          <div className="text-[9px]" style={{ color: G500 }}>{fmtSize(item.file.size)}</div>
          {(item.status === 'uploading' || item.status === 'queued') && (
            <div className="mt-1.5 h-1 overflow-hidden" style={{ backgroundColor: G200 }}>
              <motion.div animate={{ width: `${item.progress}%` }} transition={{ duration: 0.2 }}
                style={{ height: '100%', backgroundColor: AC }} />
            </div>
          )}
          {item.status === 'error' && (
            <div className="text-[9px] mt-1" style={{ color: '#ef4444' }}>{item.errorMsg}</div>
          )}
        </div>
        <div className="shrink-0 text-[9px]" style={{ color: G500 }}>
          {item.status === 'uploading' && <><Loader2 className="animate-spin inline w-4 h-4" style={{ color: AC }} strokeWidth={2} /> {item.progress}%</>}
          {item.status === 'done'      && <CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} strokeWidth={2} />}
          {item.status === 'error'     && <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} strokeWidth={2} />}
          {item.status === 'queued'    && <span style={{ color: G400 }}>Queued</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Media thumbnail ─────────────────────────────────────────────────── */
function MediaThumb({ media, isCover, onSetCover, onDelete }: {
  media: PortfolioMedia; isCover: boolean; onSetCover: () => void; onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div className="relative overflow-hidden"
      style={{ aspectRatio: '4/3', border: `2px solid ${isCover ? AC : G200}` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {media.media_type === 'image'
        ? <img src={media.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        : (
          <div className="w-full h-full relative" style={{ backgroundColor: '#111' }}>
            <video src={media.url} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PlayCircle style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.5} />
            </div>
          </div>
        )
      }
      {isCover && (
        <div className="absolute top-1.5 left-1.5 text-[7px] uppercase tracking-[0.2em] font-bold px-2 py-0.5"
          style={{ backgroundColor: AC, color: W }}>Cover</div>
      )}
      <AnimatePresence>
        {hov && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(10,10,10,0.72)' }}>
            {media.media_type === 'image' && !isCover && (
              <button onClick={onSetCover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] font-bold"
                style={{ backgroundColor: AC, color: W, border: 'none', cursor: 'pointer' }}>
                <Star style={{ width: 10, height: 10 }} strokeWidth={2.5} /> Set Cover
              </button>
            )}
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] font-bold"
              style={{ backgroundColor: 'rgba(239,68,68,0.9)', color: W, border: 'none', cursor: 'pointer' }}>
              <Trash2 style={{ width: 10, height: 10 }} strokeWidth={2.5} /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Project modal ───────────────────────────────────────────────────── */
type ModalTab = 'details' | 'media';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

function ProjectModal({ initial, onClose, onSaved }: {
  initial: PortfolioProject | null;
  onClose: () => void;
  onSaved: (p: PortfolioProject) => void;
}) {
  const isNew = !initial;
  const [tab, setTab] = useState<ModalTab>('details');

  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    category:    initial?.category    ?? CATEGORIES[0],
    location:    initial?.location    ?? '',
    city:        initial?.city        ?? 'Houston, TX',
    sqft:        initial?.sqft        ?? '',
    budget:      initial?.budget      ?? '',
    client_name: initial?.client_name ?? '',
    year:        initial?.year        ?? CURRENT_YEAR.toString(),
    description: initial?.description ?? '',
    featured:    initial?.featured    ?? false,
  });
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const [project, setProject] = useState<PortfolioProject | null>(initial);

  const [media, setMedia]           = useState<PortfolioMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploads, setUploads]       = useState<UploadItem[]>([]);

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!project) return;
    setMediaLoading(true);
    loadMedia(project.id).then(setMedia).catch(console.error).finally(() => setMediaLoading(false));
  }, [project?.id]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setSaveError('Project title is required.'); return; }
    setSaving(true); setSaveError('');
    try {
      const payload = {
        title:       form.title.trim(),
        category:    form.category,
        location:    form.location.trim(),
        city:        form.city.trim() || 'Houston, TX',
        sqft:        form.sqft.trim() || null,
        budget:      form.budget.trim() || null,
        client_name: form.client_name.trim() || null,
        year:        form.year,
        description: form.description.trim() || null,
        featured:    form.featured,
      };
      if (project) {
        await updateProject(project.id, payload);
        const updated = { ...project, ...payload };
        setProject(updated);
        onSaved(updated);
      } else {
        const created = await createProject({ ...payload, cover_url: null, sort_order: 0 });
        setProject(created);
        onSaved(created);
        setTab('media');
      }
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = useCallback((files: FileList) => {
    if (!project) return;
    const newItems: UploadItem[] = Array.from(files).map(file => ({
      uid: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'queued',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setUploads(prev => [...prev, ...newItems]);

    newItems.forEach(item => {
      const path = `projects/${project.id}/${item.uid}${ext(item.file)}`;
      setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, status: 'uploading' } : u));
      uploadWithProgress(path, item.file, pct => {
        setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, progress: pct } : u));
      })
        .then(async url => {
          const mediaType = item.file.type.startsWith('video/') ? 'video' : 'image';
          const mediaRecord = await insertMedia({
            project_id: project.id, url, storage_path: path,
            media_type: mediaType, caption: null, sort_order: Date.now(),
          });
          if (!project.cover_url && mediaType === 'image') {
            await updateProject(project.id, { cover_url: url });
            const updated = { ...project, cover_url: url };
            setProject(updated);
            onSaved(updated);
          }
          setMedia(prev => [...prev, mediaRecord]);
          setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, status: 'done', progress: 100 } : u));
          setTimeout(() => {
            setUploads(prev => prev.filter(u => u.uid !== item.uid));
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          }, 2500);
        })
        .catch(err => {
          setUploads(prev => prev.map(u =>
            u.uid === item.uid ? { ...u, status: 'error', errorMsg: err.message } : u
          ));
        });
    });
  }, [project, onSaved]);

  const handleSetCover = async (url: string) => {
    if (!project) return;
    await updateProject(project.id, { cover_url: url });
    const updated = { ...project, cover_url: url };
    setProject(updated); onSaved(updated);
  };

  const handleDeleteMedia = async (m: PortfolioMedia) => {
    await deleteMedia(m);
    setMedia(prev => prev.filter(x => x.id !== m.id));
    if (project?.cover_url === m.url) {
      const next = media.find(x => x.id !== m.id && x.media_type === 'image');
      await updateProject(project!.id, { cover_url: next?.url ?? null });
      const updated = { ...project!, cover_url: next?.url ?? null };
      setProject(updated); onSaved(updated);
    }
  };

  const activeUploads = uploads.filter(u => u.status === 'uploading').length;
  const hasProject = !!project;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col w-full"
        style={{ maxWidth: 880, maxHeight: '92vh', backgroundColor: W, border: `1px solid ${G200}`, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-7 py-5 shrink-0"
          style={{ borderBottom: `1px solid ${G200}` }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em] font-bold mb-0.5" style={{ color: AC }}>
              {isNew ? 'New Portfolio Project' : 'Edit Project'}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: B, lineHeight: 1.1 }}>
              {project?.title || 'Untitled Project'}
            </div>
            {project && (
              <div className="text-[9px] mt-0.5 uppercase tracking-[0.14em]" style={{ color: G400 }}>
                {project.category} · {project.city || 'Houston, TX'}
              </div>
            )}
          </div>
          <button onClick={onClose} className="mt-1" style={{ color: G400, background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: `1px solid ${G200}` }}>
          {(['details', 'media'] as ModalTab[]).map(t => (
            <button key={t}
              onClick={() => (t === 'details' || hasProject) && setTab(t)}
              disabled={t === 'media' && !hasProject}
              className="relative px-7 py-3 text-[9px] uppercase tracking-[0.26em] font-bold transition-colors"
              style={{
                color: tab === t ? B : G400, cursor: (t === 'media' && !hasProject) ? 'not-allowed' : 'pointer',
                opacity: (t === 'media' && !hasProject) ? 0.38 : 1, background: 'none', border: 'none',
              }}>
              {t === 'details' ? 'Project Details' : (
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Photos & Videos{media.length > 0 ? ` (${media.length})` : ''}
                  {activeUploads > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: AC }} />
                  )}
                </span>
              )}
              {tab === t && (
                <motion.div layoutId="modal-tab-line" className="absolute bottom-0 inset-x-0 h-px"
                  style={{ backgroundColor: B }} />
              )}
            </button>
          ))}
          {isNew && !hasProject && (
            <div className="ml-auto flex items-center pr-7 text-[9px]" style={{ color: G400 }}>
              Save details first to unlock media upload
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── DETAILS TAB ─────────────────────────────────── */}
            {tab === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}>
                <form id="details-form" onSubmit={handleSaveDetails} className="p-7">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Title */}
                    <div className="md:col-span-2">
                      <Field label="Project Title" required>
                        <TInput value={form.title} onChange={set('title')} required
                          placeholder="e.g. River Oaks Estate · Memorial Office Tower" />
                      </Field>
                    </div>

                    {/* Category */}
                    <Field label="Category">
                      <TSelect value={form.category} onChange={set('category')} options={CATEGORIES} />
                    </Field>

                    {/* Year */}
                    <Field label="Year Completed" required>
                      <TSelect value={form.year} onChange={set('year')} options={YEAR_OPTIONS} />
                    </Field>

                    {/* Location with autocomplete */}
                    <div className="md:col-span-2">
                      <Field label="Location / Address" hint="start typing for suggestions">
                        <LocationAutocomplete
                          value={form.location}
                          onChange={set('location')}
                          city={form.city}
                          onCityChange={set('city')}
                        />
                      </Field>
                    </div>

                    {/* City (auto-filled) */}
                    <Field label="City / Area" hint="auto-filled from location">
                      <TInput value={form.city} onChange={set('city')} placeholder="e.g. Houston, TX"
                        prefix={<MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />} />
                    </Field>

                    {/* Square footage */}
                    <Field label="Square Footage">
                      <TInput value={form.sqft ?? ''} onChange={set('sqft')} placeholder="e.g. 14,500 SF"
                        prefix={<Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />} />
                    </Field>

                    {/* Budget */}
                    <Field label="Project Value / Budget" hint="optional">
                      <TInput value={form.budget ?? ''} onChange={set('budget')} placeholder="e.g. $4.2M or $800K–$1.2M"
                        prefix={<DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />} />
                    </Field>

                    {/* Client name */}
                    <Field label="Client Name" hint="optional, shown internally">
                      <TInput value={form.client_name ?? ''} onChange={set('client_name')} placeholder="e.g. The Johnson Family (confidential)"
                        prefix={<User className="w-3.5 h-3.5" strokeWidth={1.5} />} />
                    </Field>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <Field label="Project Description">
                        <TTextarea value={form.description ?? ''} onChange={set('description')} rows={4}
                          placeholder="Describe this project — scope, materials, highlights, awards…" />
                      </Field>
                    </div>
                  </div>

                  {/* Featured toggle */}
                  <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${G200}` }}>
                    <button type="button" onClick={() => set('featured')(!form.featured)}
                      className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 transition-all"
                      style={{ border: `1px solid ${form.featured ? AC : G200}`, color: form.featured ? AC : G500, backgroundColor: form.featured ? 'rgba(157,126,63,0.06)' : 'transparent' }}>
                      <Star className="w-3.5 h-3.5" style={{ fill: form.featured ? AC : 'none', color: form.featured ? AC : G500 }} strokeWidth={2} />
                      {form.featured ? 'Featured on Portfolio' : 'Mark as Featured'}
                    </button>
                    <span className="text-[10px]" style={{ color: G400 }}>Featured projects appear prominently on the public portfolio page</span>
                  </div>

                  {saveError && (
                    <div className="flex items-start gap-2 p-3 mt-4 text-[11px]"
                      style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
                      <div>
                        <div className="font-bold mb-0.5">Could not save project</div>
                        <div>{saveError}</div>
                        {isTableMissing(saveError) && (
                          <div className="mt-1 opacity-80">
                            The database tables are not set up yet. Close this modal and follow the setup instructions.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

            {/* ── MEDIA TAB ───────────────────────────────────── */}
            {tab === 'media' && (
              <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }} className="p-7 space-y-5">

                {/* Upload stats */}
                {media.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] uppercase tracking-[0.26em] font-bold" style={{ color: G500 }}>
                      {media.filter(m => m.media_type === 'image').length} Photos ·{' '}
                      {media.filter(m => m.media_type === 'video').length} Videos
                    </div>
                    {project?.cover_url && (
                      <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em]" style={{ color: AC }}>
                        <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} /> Cover photo set
                      </div>
                    )}
                  </div>
                )}

                <UploadZone onFiles={handleFiles} disabled={!project} />

                <AnimatePresence>
                  {uploads.map(u => <UploadProgressItem key={u.uid} item={u} />)}
                </AnimatePresence>

                {mediaLoading
                  ? (
                    <div className="flex items-center justify-center py-12 gap-3" style={{ color: G400 }}>
                      <Loader2 className="animate-spin w-5 h-5" strokeWidth={2} />
                      <span className="text-[11px]">Loading media…</span>
                    </div>
                  )
                  : media.length > 0
                    ? (
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-2" style={{ color: G400 }}>
                          Hover any photo to set as cover or remove
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {media.map(m => (
                            <MediaThumb key={m.id} media={m}
                              isCover={project?.cover_url === m.url}
                              onSetCover={() => handleSetCover(m.url)}
                              onDelete={() => handleDeleteMedia(m)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                    : uploads.length === 0 && (
                      <div className="text-center py-8" style={{ color: G500 }}>
                        <ImagePlus className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                        <div className="text-[12px] font-semibold mb-1" style={{ color: B }}>No media yet</div>
                        <div className="text-[11px]">Drag files above to start uploading photos and videos</div>
                      </div>
                    )
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 shrink-0"
          style={{ borderTop: `1px solid ${G200}`, backgroundColor: G100 }}>
          <button type="button" onClick={onClose}
            className="text-[9px] uppercase tracking-[0.24em] font-bold px-5 py-2.5"
            style={{ border: `1px solid ${G200}`, color: G500, cursor: 'pointer', background: W }}>
            {tab === 'details' && isNew && !hasProject ? 'Cancel' : 'Close'}
          </button>

          <div className="flex items-center gap-3">
            {tab === 'media' && hasProject && (
              <button type="button" onClick={() => setTab('details')}
                className="text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-2.5"
                style={{ border: `1px solid ${G200}`, color: B, cursor: 'pointer', background: W }}>
                ← Back to Details
              </button>
            )}
            {tab === 'details' && (
              <button type="submit" form="details-form" disabled={saving}
                className="flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-black px-6 py-2.5 transition-opacity"
                style={{ backgroundColor: saving ? G400 : B, color: W, border: 'none', cursor: saving ? 'wait' : 'pointer' }}>
                {saving
                  ? <><Loader2 className="animate-spin w-3.5 h-3.5" strokeWidth={2.5} /> Saving…</>
                  : isNew && !hasProject
                    ? <><Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Create Project</>
                    : <><CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Save Changes</>
                }
              </button>
            )}
            {tab === 'media' && (
              <div className="text-[10px]" style={{ color: G500 }}>
                {activeUploads > 0
                  ? <span className="flex items-center gap-1.5"><Loader2 className="animate-spin w-3.5 h-3.5" strokeWidth={2} /> Uploading {activeUploads} file{activeUploads !== 1 ? 's' : ''}…</span>
                  : `${media.length} file${media.length !== 1 ? 's' : ''} saved`
                }
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Project row ─────────────────────────────────────────────────────── */
function ProjectRow({ project, onEdit, onDelete, onToggleFeatured }: {
  project: PortfolioProject;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <motion.div
      className="flex items-center gap-4 p-4"
      style={{ backgroundColor: W, border: `1px solid ${G200}` }}
      whileHover={{ backgroundColor: G100 }}
      transition={{ duration: 0.15 }}>
      <div className="w-16 h-12 shrink-0 overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid ${G200}` }}>
        {project.cover_url
          ? <img src={project.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <ImageIcon style={{ width: 18, height: 18, color: G400 }} strokeWidth={1.5} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-[13px] font-bold truncate" style={{ color: B }}>{project.title}</div>
          {project.featured && <Star className="w-3 h-3 shrink-0 fill-current" style={{ color: AC }} strokeWidth={0} />}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] uppercase tracking-[0.14em]" style={{ color: G500 }}>
          <span>{project.category}</span>
          {(project.location || project.city) && <><span>·</span><span>{project.location || project.city}</span></>}
          {project.sqft && <><span>·</span><span>{project.sqft} SF</span></>}
          {project.budget && <><span>·</span><span>{project.budget}</span></>}
          <span>·</span><span>{project.year}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onToggleFeatured}
          className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-all"
          style={{ border: `1px solid ${project.featured ? AC : G200}`, color: project.featured ? AC : G500, backgroundColor: project.featured ? 'rgba(157,126,63,0.06)' : 'transparent', cursor: 'pointer', background: project.featured ? 'rgba(157,126,63,0.06)' : 'none' }}>
          <Star className="w-3 h-3" style={{ fill: project.featured ? AC : 'none', color: project.featured ? AC : G500 }} strokeWidth={2} />
          {project.featured ? 'Featured' : 'Feature'}
        </button>
        <button onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: G400, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
          <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: G400, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────── */
export default function PortfolioManager({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [projects, setProjects]   = useState<PortfolioProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [modalProject, setModalProject] = useState<PortfolioProject | null | undefined>(undefined);
  const [filter, setFilter]       = useState('All');

  const refresh = useCallback(async () => {
    setLoading(true); setLoadError(''); setSetupNeeded(false);
    try {
      const data = await loadProjects();
      setProjects(data);
      onCountChange?.(data.length);
    } catch (err: any) {
      const msg = err.message ?? '';
      if (isTableMissing(msg)) {
        setSetupNeeded(true);
      } else {
        setLoadError(msg || 'Failed to load portfolio.');
      }
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaved = useCallback((p: PortfolioProject) => {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id);
      const next = exists ? prev.map(x => x.id === p.id ? p : x) : [...prev, p];
      onCountChange?.(next.length);
      return next;
    });
  }, [onCountChange]);

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this project and all its media?')) return;
    await deleteProject(id);
    setProjects(prev => { const next = prev.filter(x => x.id !== id); onCountChange?.(next.length); return next; });
  };

  const handleToggleFeatured = async (p: PortfolioProject) => {
    const updated = { ...p, featured: !p.featured };
    await updateProject(p.id, { featured: updated.featured });
    setProjects(prev => prev.map(x => x.id === p.id ? updated : x));
  };

  const allCats = ['All', ...Array.from(new Set(projects.map(p => p.category)))];
  const filtered = filter === 'All' ? projects : projects.filter(p => p.category === filter);

  return (
    <div>
      {/* Setup banner */}
      {setupNeeded && !loading && <SetupBanner onRetry={refresh} />}

      {/* Toolbar */}
      {!setupNeeded && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
              Portfolio Projects ({projects.length})
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category filter */}
              {allCats.length > 2 && allCats.map(c => (
                <button key={c} onClick={() => setFilter(c)}
                  className="text-[8px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 transition-all"
                  style={{
                    border: `1px solid ${filter === c ? B : G200}`,
                    color: filter === c ? W : G500,
                    backgroundColor: filter === c ? B : 'transparent',
                    cursor: 'pointer',
                  }}>
                  {c}
                </button>
              ))}
              <button onClick={refresh}
                className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-2 transition-colors"
                style={{ border: `1px solid ${G200}`, color: G500, background: 'none', cursor: 'pointer' }}>
                Refresh
              </button>
              <button onClick={() => setModalProject(null)}
                className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2.5 hover:opacity-85 transition-opacity"
                style={{ backgroundColor: B, color: W, border: 'none', cursor: 'pointer' }}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Project
              </button>
            </div>
          </div>

          {/* Load error */}
          {loadError && (
            <div className="flex items-start gap-3 p-4 mb-4 text-[11px]"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <div className="font-bold mb-0.5">Could not load portfolio</div>
                <div>{loadError}</div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-12 justify-center" style={{ color: G400 }}>
              <Loader2 className="animate-spin w-5 h-5" strokeWidth={2} />
              <span className="text-[12px]">Loading projects…</span>
            </div>
          )}

          {/* Project list */}
          {!loading && !loadError && (
            <div className="space-y-2">
              {filtered.length === 0
                ? (
                  <div className="text-center py-16" style={{ color: G500, border: `1px dashed ${G200}` }}>
                    <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[13px] font-semibold mb-2" style={{ color: B }}>
                      {filter !== 'All' ? `No ${filter} projects` : 'No portfolio projects yet'}
                    </div>
                    <div className="text-[11px]">
                      {filter !== 'All' ? 'Try a different category filter' : 'Click "Add Project" to create your first one'}
                    </div>
                  </div>
                )
                : filtered.map(p => (
                  <ProjectRow key={p.id} project={p}
                    onEdit={() => setModalProject(p)}
                    onDelete={() => handleDelete(p.id)}
                    onToggleFeatured={() => handleToggleFeatured(p)}
                  />
                ))
              }
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalProject !== undefined && !setupNeeded && (
          <ProjectModal
            initial={modalProject}
            onClose={() => setModalProject(undefined)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
