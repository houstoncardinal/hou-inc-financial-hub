import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Search, X, CheckCircle2, FolderKanban, CalendarDays,
  DollarSign, Edit3, Trash2, Send, Link2, Copy, RefreshCw,
  ArrowLeft, Pin, Eye, EyeOff, Target, MessageSquare,
  UserCheck, Users, Loader2, Zap, Building2, AlertTriangle,
  Wand2, ChevronRight, ChevronLeft, MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

/* ── Tokens ──────────────────────────────────────────────────────── */
const AC    = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const HE_ENTITY = 'houston-enterprise';

/* ── Types ──────────────────────────────────────────────────────── */
interface AdminProject {
  id: string;
  title: string;
  project_code: string | null;
  type: string;
  address: string | null;
  city: string;
  state: string;
  portal_client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  status: string;
  progress_pct: number;
  start_date: string | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  contract_amount: number | null;
  budget: number | null;
  project_manager: string | null;
  superintendent: string | null;
  architect: string | null;
  entity: string;
  description: string | null;
  internal_notes: string | null;
  zip_code: string | null;
  custom_fields: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

interface Milestone {
  id: string; project_id: string; title: string; description: string | null;
  sort_order: number; target_date: string | null; completed_date: string | null;
  is_active: boolean; is_client_visible: boolean;
}

interface ProjectUpdate {
  id: string; project_id: string; title: string; body: string;
  update_type: string; is_client_visible: boolean; pinned: boolean;
  created_by: string; created_at: string;
}

interface PortalClientRow { id: string; name: string; email: string; status: string; }

/* ── Constants ──────────────────────────────────────────────────── */
const PROJECT_STATUSES = [
  { value: 'planning',  label: 'Planning',  color: '#8b5cf6' },
  { value: 'active',    label: 'Active',    color: '#10b981' },
  { value: 'on_hold',   label: 'On Hold',   color: '#f59e0b' },
  { value: 'completed', label: 'Completed', color: AC        },
  { value: 'archived',  label: 'Archived',  color: '#8A8580' },
];

const PROJECT_TYPES = [
  'Custom Estate', 'Family Home', 'Multi-Family', 'Commercial',
  'Renovation', 'Investment Property', 'Real Estate Development', 'Other',
];

const UPDATE_TYPES = [
  { value: 'general',   label: 'General Update',    color: '#3b82f6' },
  { value: 'milestone', label: 'Milestone Complete', color: '#10b981' },
  { value: 'alert',     label: 'Action Required',    color: '#f59e0b' },
  { value: 'important', label: 'Important Notice',   color: '#ef4444' },
];

const WIZARD_STEPS = [
  { key: 'basics',     label: 'Basics',     optional: false, question: 'What are we building?'    },
  { key: 'location',   label: 'Location',   optional: true,  question: 'Where is it located?'     },
  { key: 'client',     label: 'Client',     optional: true,  question: 'Who is the client?'       },
  { key: 'timeline',   label: 'Timeline',   optional: true,  question: 'When does it happen?'     },
  { key: 'financials', label: 'Financials', optional: true,  question: "What's the contract value?" },
  { key: 'team',       label: 'Team',       optional: true,  question: "Who's on the project?"    },
  { key: 'details',    label: 'Details',    optional: true,  question: 'Anything else to add?'    },
  { key: 'review',     label: 'Review',     optional: false, question: 'Ready to create?'          },
] as const;

type WizardKey = typeof WIZARD_STEPS[number]['key'];

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtUSD(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}
function statusMeta(s: string) {
  return PROJECT_STATUSES.find(x => x.value === s) ?? PROJECT_STATUSES[4];
}
function autoCode(title: string, count: number) {
  const words = title.trim().split(/\s+/).filter(w => w.length > 1);
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return initials ? `${initials}-${String(count + 1).padStart(3, '0')}` : '';
}

/* ── Shared UI pieces ───────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusMeta(status).color }} />;
}

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.22em] px-1.5 py-0.5 whitespace-nowrap"
      style={{ backgroundColor: m.color + '18', color: m.color }}>
      {m.label}
    </span>
  );
}

function ProgressRing({ pct, size = 38 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-border" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={AC} strokeWidth={3}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{children}</div>;
}

function PillPicker({ options, value, onChange }: {
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = o.value === value;
        const c = o.color ?? '#0A0A0A';
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] border transition-all"
            style={sel
              ? { backgroundColor: c, color: '#fff', borderColor: c }
              : { backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
            }>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Address autocomplete (Texas-biased Nominatim) ─────────────────── */
interface AddressFields { address: string; city: string; state: string; zipcode: string; }
interface NominatimResult {
  place_id: number; display_name: string;
  address: {
    house_number?: string; road?: string; pedestrian?: string; path?: string;
    suburb?: string; neighbourhood?: string;
    city?: string; town?: string; village?: string; county?: string;
    state?: string; postcode?: string;
  };
}

function AddressAutocomplete({
  address, city, state, zipcode,
  onAddressChange, onCityChange, onStateChange, onZipcodeChange,
}: AddressFields & {
  onAddressChange: (v: string) => void; onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;   onZipcodeChange: (v: string) => void;
}) {
  const [results,  setResults]  = useState<NominatimResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 4) { setResults([]); setOpen(false); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      // viewbox=W,N,E,S — Texas bounding box; bounded=0 prefers but doesn't restrict
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8` +
        `&countrycodes=us&viewbox=-107.0,36.5,-93.5,25.5&bounded=0` +
        `&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en-US', 'User-Agent': 'HouIncFinHub/1.0' },
        signal: abortRef.current.signal,
      });
      const data: NominatimResult[] = await res.json();
      setResults(data); setOpen(data.length > 0);
    } catch (e: any) {
      if (e.name !== 'AbortError') setResults([]);
    } finally { setLoading(false); }
  }, []);

  const handleInput = (v: string) => {
    onAddressChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 370);
  };

  const selectResult = (r: NominatimResult) => {
    const a = r.address;
    const street = [a.house_number, a.road ?? a.pedestrian ?? a.path].filter(Boolean).join(' ');
    const cityVal = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? '';
    onAddressChange(street || r.display_name.split(',')[0]);
    onCityChange(cityVal);
    onStateChange(a.state ?? '');
    onZipcodeChange(a.postcode ?? '');
    setResults([]); setOpen(false);
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
    abortRef.current?.abort();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground" strokeWidth={1.5} />
        <input
          value={address}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Start typing to search Texas addresses…"
          autoComplete="off"
          className="w-full h-11 pl-9 pr-10 text-[14px] border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin" style={{ color: AC }} />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[9999] bg-background border border-t-0 border-border shadow-xl max-h-56 overflow-y-auto">
          {results.map((r, i) => {
            const a = r.address;
            const street = [a.house_number, a.road ?? a.pedestrian ?? a.path].filter(Boolean).join(' ');
            const cityVal = a.city ?? a.town ?? a.village ?? a.suburb ?? '';
            const sub = [cityVal, a.state, a.postcode].filter(Boolean).join(', ');
            return (
              <button key={r.place_id ?? i} type="button"
                onMouseDown={e => { e.preventDefault(); selectResult(r); }}
                className="w-full text-left px-3.5 py-2.5 border-b border-border/40 last:border-none hover:bg-secondary/60 transition-colors flex items-start gap-2.5">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" style={{ color: AC }} strokeWidth={2} />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">{street || r.display_name.split(',')[0]}</div>
                  {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NEW PROJECT WIZARD — multi-step guided form
════════════════════════════════════════════════════════════════════ */
const BLANK_WIZARD = {
  title: '', project_code: '', type: 'Custom Estate', status: 'planning',
  address: '', city: '', state: 'TX', zipcode: '',
  portal_client_id: '', client_name: '', client_email: '',
  start_date: '', estimated_completion: '',
  contract_amount: '', budget: '',
  project_manager: '', superintendent: '', architect: '',
  description: '', internal_notes: '',
};

function NewProjectWizard({
  onClose, onCreated, portalClients, existingCount,
}: {
  onClose: () => void;
  onCreated: (p: AdminProject) => void;
  portalClients: PortalClientRow[];
  existingCount: number;
}) {
  const [step,         setStep]         = useState(0);
  const [dir,          setDir]          = useState<1 | -1>(1);
  const [form,         setForm]         = useState({ ...BLANK_WIZARD });
  const [codeManual,   setCodeManual]   = useState(false);
  const [customFields, setCustomFields] = useState<{ id: number; key: string; value: string }[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const set = (k: keyof typeof BLANK_WIZARD, v: string) => setForm(f => ({ ...f, [k]: v }));

  /* Auto-generate code from title */
  useEffect(() => {
    if (!codeManual && form.title) {
      set('project_code', autoCode(form.title, existingCount));
    } else if (!codeManual && !form.title) {
      set('project_code', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, codeManual, existingCount]);

  /* Auto-fill budget when contract changes and budget is empty */
  const handleContractChange = (v: string) => {
    set('contract_amount', v);
    if (!form.budget) set('budget', v);
  };

  /* Auto-fill client name/email when portal client selected */
  const handleClientSelect = (id: string) => {
    set('portal_client_id', id === '__none__' ? '' : id);
    if (id && id !== '__none__') {
      const c = portalClients.find(c => c.id === id);
      if (c) {
        if (!form.client_name)  set('client_name', c.name);
        if (!form.client_email) set('client_email', c.email);
      }
    }
  };

  const addCustomField    = () => setCustomFields(p => [...p, { id: Date.now(), key: '', value: '' }]);
  const removeCustomField = (id: number) => setCustomFields(p => p.filter(f => f.id !== id));
  const updateCustomField = (id: number, k: 'key' | 'value', v: string) =>
    setCustomFields(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  const goNext = () => {
    setError('');
    if (step === 0 && !form.title.trim()) { setError('Project name is required.'); return; }
    setDir(1); setStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const goBack = () => { setError(''); setDir(-1); setStep(s => Math.max(s - 1, 0)); };
  const goTo   = (i: number) => { if (i < step) { setDir(-1); setStep(i); } };

  /* ── Create ───────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.title.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const customFieldsObj = customFields.reduce<Record<string, string>>((acc, { key, value }) => {
      return key.trim() ? { ...acc, [key.trim()]: value.trim() } : acc;
    }, {});

    const payload: any = {
      admin_user_id: user.id,
      entity: HE_ENTITY,
      title: form.title.trim(),
      project_code: form.project_code.trim() || null,
      type: form.type,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || 'TX',
      zip_code: form.zipcode.trim() || null,
      portal_client_id: form.portal_client_id || null,
      client_name: form.client_name.trim() || null,
      client_email: form.client_email.trim() || null,
      status: form.status,
      progress_pct: 0,
      start_date: form.start_date || null,
      estimated_completion: form.estimated_completion || null,
      contract_amount: form.contract_amount ? parseFloat(form.contract_amount) : null,
      budget: form.budget ? parseFloat(form.budget) : null,
      project_manager: form.project_manager.trim() || null,
      superintendent: form.superintendent.trim() || null,
      architect: form.architect.trim() || null,
      description: form.description.trim() || null,
      internal_notes: form.internal_notes.trim() || null,
      custom_fields: Object.keys(customFieldsObj).length ? customFieldsObj : null,
    };

    const { data, error: dbErr } = await supabase.from('admin_projects').insert(payload).select().single();
    if (dbErr) {
      setSaving(false);
      toast({ title: 'Failed to create project', description: dbErr.message, variant: 'destructive' });
      return;
    }
    // Finance sync is handled by the trg_sync_admin_project_to_finance DB trigger.

    setSaving(false);
    toast({ title: `${data.title} created`, description: 'Synced to finance dashboard' });
    onCreated(data);
  };

  /* ── Step content ─────────────────────────────────────────────── */
  const currentStep = WIZARD_STEPS[step];
  const statusOptions = PROJECT_STATUSES.map(s => ({ value: s.value, label: s.label, color: s.color }));
  const typeOptions   = PROJECT_TYPES.map(t => ({ value: t, label: t }));

  /* Count optional sections filled */
  const optionalFilled = [
    form.address.trim() || form.city.trim(),
    form.portal_client_id || form.client_name || form.client_email,
    form.start_date || form.estimated_completion,
    form.contract_amount || form.budget,
    form.project_manager || form.superintendent || form.architect,
    form.description || form.internal_notes || customFields.some(f => f.key),
  ].filter(Boolean).length;

  function renderStepContent() {
    switch (currentStep.key) {

      /* ── BASICS ── */
      case 'basics': return (
        <div className="space-y-5">
          <div>
            <MicroLabel>Project Name *</MicroLabel>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goNext()}
              placeholder="e.g. Johnson Custom Estate"
              className="w-full h-12 px-4 text-[15px] border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
            />
            {/* Auto-code suggestion */}
            {form.title && (
              <div className="mt-2 flex items-center gap-2">
                {!codeManual ? (
                  <>
                    <Wand2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: AC }} />
                    <span className="text-[10px] text-muted-foreground">
                      Auto-code: <span className="font-mono font-bold text-foreground">{form.project_code}</span>
                    </span>
                    <button onClick={() => setCodeManual(true)}
                      className="text-[10px] underline text-muted-foreground hover:text-foreground transition-colors ml-1">
                      customize
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={form.project_code}
                      onChange={e => set('project_code', e.target.value)}
                      placeholder="PRJ-001"
                      className="h-8 px-3 text-[12px] font-mono border border-border bg-background focus:outline-none focus:border-foreground/40 w-36 transition-colors"
                    />
                    <button onClick={() => { setCodeManual(false); }}
                      className="text-[10px] text-muted-foreground underline hover:text-foreground transition-colors">
                      auto-suggest
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <MicroLabel>Project Type</MicroLabel>
            <PillPicker options={typeOptions} value={form.type} onChange={v => set('type', v)} />
          </div>

          <div>
            <MicroLabel>Initial Status</MicroLabel>
            <PillPicker options={statusOptions} value={form.status} onChange={v => set('status', v)} />
          </div>
        </div>
      );

      /* ── LOCATION ── */
      case 'location': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Street Address</MicroLabel>
            <AddressAutocomplete
              address={form.address}
              city={form.city}
              state={form.state}
              zipcode={form.zipcode}
              onAddressChange={v => set('address', v)}
              onCityChange={v => set('city', v)}
              onStateChange={v => set('state', v)}
              onZipcodeChange={v => set('zipcode', v)}
            />
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Type an address — suggestions auto-fill city, state, and ZIP.
            </p>
          </div>
          <div className="grid grid-cols-6 gap-2.5">
            <div className="col-span-3">
              <MicroLabel>City</MicroLabel>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="City"
                className="w-full h-10 px-3 text-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <div className="col-span-1">
              <MicroLabel>State</MicroLabel>
              <input
                value={form.state}
                onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                maxLength={2}
                className="w-full h-10 px-3 text-[13px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <MicroLabel>ZIP Code</MicroLabel>
              <input
                value={form.zipcode}
                onChange={e => set('zipcode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="00000"
                maxLength={5}
                className="w-full h-10 px-3 text-[13px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
          </div>
        </div>
      );

      /* ── CLIENT ── */
      case 'client': return (
        <div className="space-y-4">
          {portalClients.filter(c => c.status === 'approved').length > 0 && (
            <div>
              <MicroLabel>Link Existing Portal Client</MicroLabel>
              <Select value={form.portal_client_id || '__none__'} onValueChange={handleClientSelect}>
                <SelectTrigger className="rounded-none h-11"><SelectValue placeholder="Select a portal client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No portal account yet</SelectItem>
                  {portalClients.filter(c => c.status === 'approved').map(c =>
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.portal_client_id && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                  <UserCheck className="w-2.5 h-2.5" /> Client will see project updates in their portal.
                </p>
              )}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MicroLabel>Client Name</MicroLabel>
              <Input autoFocus={portalClients.filter(c => c.status === 'approved').length === 0}
                className="rounded-none h-11" placeholder="Full name"
                value={form.client_name} onChange={e => set('client_name', e.target.value)} />
            </div>
            <div>
              <MicroLabel>Client Email</MicroLabel>
              <Input type="email" className="rounded-none h-11" placeholder="email@domain.com"
                value={form.client_email} onChange={e => set('client_email', e.target.value)} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">You can also invite the client to the portal after creating the project.</p>
        </div>
      );

      /* ── TIMELINE ── */
      case 'timeline': return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <MicroLabel>Start Date</MicroLabel>
              <Input autoFocus type="date" className="rounded-none h-11"
                value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <MicroLabel>Estimated Completion</MicroLabel>
              <Input type="date" className="rounded-none h-11"
                value={form.estimated_completion} onChange={e => set('estimated_completion', e.target.value)} />
            </div>
          </div>
          {form.start_date && form.estimated_completion && (
            <div className="p-3 border border-border bg-secondary/30">
              {(() => {
                const start = new Date(form.start_date);
                const end = new Date(form.estimated_completion);
                const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const months = Math.round(days / 30);
                return (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">{days} days</span>
                    {months > 0 && <span className="text-muted-foreground"> ({months} month{months !== 1 ? 's' : ''})</span>}
                    {' '}project duration
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      );

      /* ── FINANCIALS ── */
      case 'financials': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Contract Amount</MicroLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground select-none text-sm">$</span>
              <Input autoFocus type="number" step="1000" className="rounded-none h-12 pl-7 text-[15px] font-mono"
                placeholder="0"
                value={form.contract_amount}
                onChange={e => handleContractChange(e.target.value)} />
            </div>
          </div>
          <div>
            <MicroLabel>Budget</MicroLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground select-none text-sm">$</span>
              <Input type="number" step="1000" className="rounded-none h-12 pl-7 text-[15px] font-mono"
                placeholder="0"
                value={form.budget}
                onChange={e => set('budget', e.target.value)} />
            </div>
          </div>
          {form.contract_amount && form.budget && parseFloat(form.budget) < parseFloat(form.contract_amount) && (
            <div className="flex items-center gap-2 p-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400">Budget is lower than contract value — confirm this is intentional.</p>
            </div>
          )}
        </div>
      );

      /* ── TEAM ── */
      case 'team': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Project Manager</MicroLabel>
            <Input autoFocus className="rounded-none h-11" placeholder="Full name"
              value={form.project_manager} onChange={e => set('project_manager', e.target.value)} />
          </div>
          <div>
            <MicroLabel>Superintendent</MicroLabel>
            <Input className="rounded-none h-11" placeholder="Full name"
              value={form.superintendent} onChange={e => set('superintendent', e.target.value)} />
          </div>
          <div>
            <MicroLabel>Architect</MicroLabel>
            <Input className="rounded-none h-11" placeholder="Full name"
              value={form.architect} onChange={e => set('architect', e.target.value)} />
          </div>
        </div>
      );

      /* ── DETAILS ── */
      case 'details': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Project Description <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">(shown to client)</span></MicroLabel>
            <Textarea autoFocus className="rounded-none" rows={3}
              placeholder="Overview of scope, goals, and what the client can expect…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <MicroLabel>Internal Notes <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">(admin only)</span></MicroLabel>
            <Textarea className="rounded-none" rows={2}
              placeholder="Contract notes, vendor contacts, internal reminders…"
              value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} />
          </div>

          {/* Custom fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <MicroLabel>Custom Fields</MicroLabel>
              <button onClick={addCustomField}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-foreground"
                style={{ color: AC }}>
                <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Add Field
              </button>
            </div>
            {customFields.length === 0 ? (
              <button onClick={addCustomField}
                className="w-full border border-dashed border-border py-3 text-[10px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3" /> Add a custom field (e.g. Permit #, HOA Contact, Parcel ID…)
              </button>
            ) : (
              <div className="space-y-2">
                {customFields.map(f => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Input className="rounded-none h-9 text-xs w-36 flex-shrink-0"
                      placeholder="Field name"
                      value={f.key} onChange={e => updateCustomField(f.id, 'key', e.target.value)} />
                    <Input className="rounded-none h-9 text-xs flex-1"
                      placeholder="Value"
                      value={f.value} onChange={e => updateCustomField(f.id, 'value', e.target.value)} />
                    <button onClick={() => removeCustomField(f.id)}
                      className="p-1.5 text-muted-foreground hover:text-accent transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={addCustomField}
                  className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Another field
                </button>
              </div>
            )}
          </div>
        </div>
      );

      /* ── REVIEW ── */
      case 'review': return (
        <div className="space-y-4">
          {/* Completeness bar */}
          <div className="p-3 border border-border bg-secondary/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Project Completeness</span>
              <span className="text-[10px] font-bold" style={{ color: optionalFilled >= 4 ? '#10b981' : AC }}>
                {optionalFilled}/6 optional sections filled
              </span>
            </div>
            <div className="h-1 bg-border overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(optionalFilled / 6) * 100}%`, backgroundColor: optionalFilled >= 4 ? '#10b981' : AC }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              {optionalFilled >= 5 ? 'Excellent — very detailed project record.' : optionalFilled >= 3 ? 'Good — you can always add more details later.' : 'You can fill in more details anytime from the project view.'}
            </p>
          </div>

          {/* Summary sections */}
          <div className="space-y-0 border border-border divide-y divide-border">
            {[
              { label: 'Name',    value: form.title },
              { label: 'Code',    value: form.project_code || '—' },
              { label: 'Type',    value: form.type },
              { label: 'Status',  value: PROJECT_STATUSES.find(s => s.value === form.status)?.label ?? form.status },
              ...(form.address ? [{ label: 'Address', value: [form.address, form.city, [form.state, form.zipcode].filter(Boolean).join(' ')].filter(Boolean).join(', ') }] : []),
              ...(form.client_name || form.portal_client_id ? [{
                label: 'Client',
                value: form.portal_client_id
                  ? `${form.client_name || 'Portal client'} (linked)`
                  : form.client_name
              }] : []),
              ...(form.start_date ? [{ label: 'Start', value: fmtDate(form.start_date) }] : []),
              ...(form.estimated_completion ? [{ label: 'Est. Complete', value: fmtDate(form.estimated_completion) }] : []),
              ...(form.contract_amount ? [{ label: 'Contract', value: `$${parseFloat(form.contract_amount).toLocaleString()}` }] : []),
              ...(form.budget ? [{ label: 'Budget', value: `$${parseFloat(form.budget).toLocaleString()}` }] : []),
              ...(form.project_manager ? [{ label: 'PM', value: form.project_manager }] : []),
              ...(customFields.filter(f => f.key).map(f => ({ label: f.key, value: f.value || '—' }))),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-4 px-4 py-2.5">
                <div className="w-28 flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                <div className="text-[12px] font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Wand2 className="w-3 h-3 flex-shrink-0" style={{ color: AC }} />
            Will sync automatically to the Houston Enterprise finance dashboard.
          </div>

          {error && <p className="text-[11px] text-accent">{error}</p>}

          <Button onClick={handleCreate} disabled={saving || !form.title.trim()}
            className="w-full rounded-none h-12 text-[10px] font-black uppercase tracking-[0.22em]">
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Creating Project…</>
              : `Create ${form.title.trim() || 'Project'}`}
          </Button>
        </div>
      );

      default: return null;
    }
  }

  const isReview   = step === WIZARD_STEPS.length - 1;
  const isFirst    = step === 0;
  const isOptional = currentStep.optional;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <motion.div className="h-full" style={{ backgroundColor: AC }}
            animate={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }} />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b border-border flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mb-3">
              {WIZARD_STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => goTo(i)}
                  disabled={i > step}
                  title={s.label}
                  style={{
                    width:  i === step ? 20 : i < step ? 8 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === step ? AC : i < step ? AC + '60' : undefined,
                    border: i > step ? '1px solid var(--border)' : 'none',
                    transition: 'all 0.25s ease',
                    cursor: i < step ? 'pointer' : 'default',
                    flexShrink: 0,
                  }}
                />
              ))}
              <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {step + 1}/{WIZARD_STEPS.length}
              </span>
            </div>

            {/* Step title */}
            <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-[22px] font-light text-foreground leading-tight">
              {currentStep.question}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">{currentStep.label}</span>
              {isOptional && (
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 border border-border text-muted-foreground/70">
                  Optional
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content — scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)', minHeight: 200 }}>
          <div className="px-6 py-5">
            <AnimatePresence custom={dir} mode="wait">
              <motion.div
                key={step}
                custom={dir}
                variants={{
                  enter:  (d: number) => ({ x: d * 36, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:   (d: number) => ({ x: -d * 36, opacity: 0 }),
                }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {/* Inline validation error */}
            {error && step !== WIZARD_STEPS.length - 1 && (
              <p className="mt-3 text-[11px] text-accent">{error}</p>
            )}
          </div>
        </div>

        {/* Navigation footer — always visible so Back is available on every step */}
        <div className="border-t border-border px-6 py-3.5 flex items-center justify-between gap-3 bg-secondary/10">
          <button
            onClick={goBack}
            disabled={isFirst}
            className="flex items-center gap-1.5 h-8 px-3 text-[9px] font-bold uppercase tracking-[0.14em] border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>

          {!isReview && (
            <div className="flex items-center gap-2">
              {isOptional && (
                <button onClick={goNext}
                  className="h-8 px-4 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors">
                  Skip
                </button>
              )}
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 h-8 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-80"
                style={{ backgroundColor: AC }}
              >
                Continue <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function ProjectManager() {
  const [projects,      setProjects]      = useState<AdminProject[]>([]);
  const [milestones,    setMilestones]    = useState<Milestone[]>([]);
  const [updates,       setUpdates]       = useState<ProjectUpdate[]>([]);
  const [portalClients, setPortalClients] = useState<PortalClientRow[]>([]);
  const [loading,       setLoading]       = useState(true);

  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [mobileView,   setMobileView]   = useState<'list' | 'detail'>('list');
  const [detailTab,    setDetailTab]    = useState<'overview' | 'milestones' | 'updates' | 'settings'>('overview');
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showNew,       setShowNew]       = useState(false);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteName,    setInviteName]    = useState('');
  const [inviteToken,   setInviteToken]   = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving,   setSaving]   = useState(false);

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msForm, setMsForm] = useState({ title: '', description: '', target_date: '', is_client_visible: true });

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [upForm, setUpForm] = useState({ title: '', body: '', update_type: 'general', is_client_visible: true, pinned: false });

  const selectedProject = projects.find(p => p.id === selectedId) ?? null;

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [projRes, clientsRes] = await Promise.all([
      supabase.from('admin_projects').select('*').eq('admin_user_id', user.id).eq('entity', HE_ENTITY).order('created_at', { ascending: false }),
      supabase.from('portal_clients').select('id, name, email, status').order('name'),
    ]);
    setProjects(projRes.data ?? []);
    setPortalClients(clientsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime ─────────────────────────────────────────────────── */
  useEffect(() => {
    const ch = supabase.channel('pm-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_projects' },
        ({ new: row }) => setProjects(prev => prev.some(p => p.id === row.id) ? prev : [row as AdminProject, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_projects' },
        ({ new: row }) => setProjects(prev => prev.map(p => p.id === row.id ? row as AdminProject : p)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_projects' },
        ({ old: row }) => setProjects(prev => prev.filter(p => p.id !== row.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_project_milestones' },
        ({ new: row }) => { if (row.project_id === selectedId) setMilestones(prev => [...prev, row as Milestone]); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_project_milestones' },
        ({ new: row }) => setMilestones(prev => prev.map(m => m.id === row.id ? row as Milestone : m)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_project_milestones' },
        ({ old: row }) => setMilestones(prev => prev.filter(m => m.id !== row.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_project_updates' },
        ({ new: row }) => { if (row.project_id === selectedId) setUpdates(prev => [row as ProjectUpdate, ...prev]); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_project_updates' },
        ({ old: row }) => setUpdates(prev => prev.filter(u => u.id !== row.id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId]);

  /* ── Sub-data on selection ────────────────────────────────────── */
  useEffect(() => {
    if (!selectedId) { setMilestones([]); setUpdates([]); return; }
    Promise.all([
      supabase.from('admin_project_milestones').select('*').eq('project_id', selectedId).order('sort_order'),
      supabase.from('admin_project_updates').select('*').eq('project_id', selectedId)
        .order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    ]).then(([mRes, uRes]) => { setMilestones(mRes.data ?? []); setUpdates(uRes.data ?? []); });
  }, [selectedId]);

  /* ── Edit / Delete ────────────────────────────────────────────── */
  const saveEdit = async () => {
    if (!editForm || !selectedId) return;
    setSaving(true);
    const { data, error } = await supabase.from('admin_projects').update({
      title: editForm.title, project_code: editForm.project_code || null, type: editForm.type,
      address: editForm.address || null, city: editForm.city || null, state: editForm.state || 'TX',
      zip_code: editForm.zip_code || null,
      portal_client_id: editForm.portal_client_id || null, client_name: editForm.client_name || null,
      client_email: editForm.client_email || null, status: editForm.status,
      progress_pct: Number(editForm.progress_pct) || 0, start_date: editForm.start_date || null,
      estimated_completion: editForm.estimated_completion || null, actual_completion: editForm.actual_completion || null,
      contract_amount: editForm.contract_amount ? parseFloat(editForm.contract_amount) : null,
      budget: editForm.budget ? parseFloat(editForm.budget) : null,
      project_manager: editForm.project_manager || null, superintendent: editForm.superintendent || null,
      architect: editForm.architect || null, description: editForm.description || null,
      internal_notes: editForm.internal_notes || null,
    }).eq('id', selectedId).select().single();
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    setProjects(prev => prev.map(p => p.id === selectedId ? data : p));
    setEditMode(false); setEditForm(null);
    toast({ title: 'Project saved' });
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project and all milestones/updates?')) return;
    await supabase.from('admin_projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) { setSelectedId(null); setMobileView('list'); }
    toast({ title: 'Project deleted' });
  };

  const openEdit = () => setEditForm({
    ...selectedProject!,
    contract_amount: selectedProject!.contract_amount ?? '',
    budget: selectedProject!.budget ?? '',
    portal_client_id: selectedProject!.portal_client_id ?? '',
  });

  /* ── Milestones ───────────────────────────────────────────────── */
  const addMilestone = async () => {
    if (!msForm.title.trim() || !selectedId) return;
    const { data, error } = await supabase.from('admin_project_milestones').insert({
      project_id: selectedId, title: msForm.title.trim(),
      description: msForm.description.trim() || null, sort_order: milestones.length,
      target_date: msForm.target_date || null, is_client_visible: msForm.is_client_visible,
    }).select().single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setMilestones(prev => [...prev, data]);
    setMsForm({ title: '', description: '', target_date: '', is_client_visible: true });
    setShowMilestoneForm(false);
  };

  const completeMilestone = async (m: Milestone) => {
    const date = m.completed_date ? null : new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from('admin_project_milestones')
      .update({ completed_date: date, is_active: false }).eq('id', m.id).select().single();
    if (!error && data) setMilestones(prev => prev.map(x => x.id === m.id ? data : x));
  };

  const setMilestoneActive = async (m: Milestone) => {
    const { data, error } = await supabase.from('admin_project_milestones')
      .update({ is_active: !m.is_active }).eq('id', m.id).select().single();
    if (!error && data) setMilestones(prev => prev.map(x => x.id === m.id ? data : x));
  };

  const deleteMilestone = async (id: string) => {
    await supabase.from('admin_project_milestones').delete().eq('id', id);
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  /* ── Updates ──────────────────────────────────────────────────── */
  const postUpdate = async () => {
    if (!upForm.title.trim() || !upForm.body.trim() || !selectedId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('admin_project_updates').insert({
      project_id: selectedId, title: upForm.title.trim(), body: upForm.body.trim(),
      update_type: upForm.update_type, is_client_visible: upForm.is_client_visible,
      pinned: upForm.pinned, created_by: user?.email?.split('@')[0] ?? 'Admin',
    }).select().single();
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setUpdates(prev => [data, ...prev]);
    setUpForm({ title: '', body: '', update_type: 'general', is_client_visible: true, pinned: false });
    setShowUpdateForm(false);
    toast({ title: 'Update posted', description: upForm.is_client_visible ? 'Visible to client' : 'Internal only' });
  };

  const deleteUpdate = async (id: string) => {
    await supabase.from('admin_project_updates').delete().eq('id', id);
    setUpdates(prev => prev.filter(u => u.id !== id));
  };

  const toggleUpdateVisibility = async (u: ProjectUpdate) => {
    const { data, error } = await supabase.from('admin_project_updates')
      .update({ is_client_visible: !u.is_client_visible }).eq('id', u.id).select().single();
    if (!error && data) setUpdates(prev => prev.map(x => x.id === u.id ? data : x));
  };

  /* ── Invite ───────────────────────────────────────────────────── */
  const sendInvite = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    setInviteLoading(true);
    const { data, error } = await supabase.from('portal_invites').insert({
      email: inviteEmail.trim().toLowerCase(), name: inviteName.trim() || null, project_id: selectedId,
    }).select().single();
    setInviteLoading(false);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setInviteToken(data.token);
  };

  const inviteUrl = inviteToken ? `${window.location.origin}/portal/invite?token=${inviteToken}` : '';

  /* ── Filtered list ────────────────────────────────────────────── */
  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q) || p.project_code?.toLowerCase().includes(q))
      && (filterStatus === 'all' || p.status === filterStatus);
  });

  const clientDisplay = (p: AdminProject) => {
    if (p.portal_client_id) return portalClients.find(c => c.id === p.portal_client_id)?.name ?? p.client_name ?? 'Linked Client';
    return p.client_name ?? null;
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">

      {/* ═══ LEFT — Project List ═══ */}
      <aside className={`flex flex-col border-r border-border flex-shrink-0 w-full md:w-72 lg:w-80 ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-shrink-0 p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AC }} strokeWidth={1.5} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-lg font-light leading-none">Projects</div>
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-7 px-3 text-[9px] font-black uppercase tracking-[0.18em] bg-foreground text-background hover:opacity-80 transition-opacity">
              <Plus className="w-2.5 h-2.5" strokeWidth={3} /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition-colors" />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {['all', 'planning', 'active', 'on_hold', 'completed', 'archived'].map(s => {
              const active = filterStatus === s;
              const m = s !== 'all' ? statusMeta(s) : null;
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`flex-shrink-0 h-5 px-2 text-[8px] font-bold uppercase tracking-[0.14em] transition-all ${active ? '' : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}
                  style={active ? { backgroundColor: m?.color ?? '#0A0A0A', color: '#fff' } : {}}>
                  {s === 'all' ? 'All' : s === 'on_hold' ? 'Hold' : m!.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <FolderKanban className="w-8 h-8 text-border mb-3" strokeWidth={1} />
              <p className="text-xs text-muted-foreground">{search || filterStatus !== 'all' ? 'No matching projects' : 'No projects yet'}</p>
              {!search && filterStatus === 'all' && (
                <button onClick={() => setShowNew(true)} className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] px-4 py-2 bg-foreground text-background hover:opacity-80 transition-opacity">
                  Create First Project
                </button>
              )}
            </div>
          ) : (
            filtered.map((p, i) => {
              const sel = p.id === selectedId;
              const m = statusMeta(p.status);
              const client = clientDisplay(p);
              return (
                <motion.button key={p.id}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16, delay: i * 0.025 }}
                  onClick={() => { setSelectedId(p.id); setMobileView('detail'); setDetailTab('overview'); setEditMode(false); setEditForm(null); }}
                  className={`w-full text-left px-4 py-3.5 border-b border-border transition-all ${sel ? 'bg-secondary/60' : 'hover:bg-secondary/30'}`}
                  style={{ borderLeft: `2px solid ${sel ? AC : 'transparent'}` }}>
                  <div className="flex items-start gap-2 mb-2">
                    <StatusDot status={p.status} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] leading-tight truncate mb-0.5">{p.title}</div>
                      {client && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {p.portal_client_id ? <UserCheck className="w-2.5 h-2.5 flex-shrink-0" /> : <Users className="w-2.5 h-2.5 flex-shrink-0" />}
                          <span className="truncate">{client}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[11px] font-bold font-mono" style={{ color: m.color }}>{p.progress_pct}%</div>
                      {p.project_code && <div className="text-[8px] text-muted-foreground font-mono mt-0.5">{p.project_code}</div>}
                    </div>
                  </div>
                  <div className="h-0.5 bg-border overflow-hidden">
                    <div className="h-full" style={{ width: `${p.progress_pct}%`, backgroundColor: m.color, transition: 'width 0.6s ease' }} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <StatusBadge status={p.status} />
                    {p.estimated_completion && (
                      <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                        <CalendarDays className="w-2 h-2" />{fmtDate(p.estimated_completion)}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground uppercase tracking-[0.16em]">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[9px] font-bold" style={{ color: AC }}>
            {projects.filter(p => p.status === 'active').length} active
          </span>
        </div>
      </aside>

      {/* ═══ RIGHT — Detail ═══ */}
      <main className={`flex-1 flex flex-col overflow-hidden min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 border border-border flex items-center justify-center mb-6">
              <FolderKanban className="w-6 h-6 text-muted-foreground" strokeWidth={1} />
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-2xl font-light mb-2">Select a project</div>
            <p className="text-xs text-muted-foreground max-w-[220px] mb-6 leading-relaxed">
              Choose a project from the list to view details, milestones, and updates.
            </p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 h-9 px-5 text-[9px] font-black uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-80 transition-opacity">
              <Plus className="w-3 h-3" strokeWidth={2.5} /> New Project
            </button>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="flex-shrink-0 border-b border-border bg-background">
              <div className="px-4 sm:px-6 pt-4 pb-3 flex items-start gap-3">
                <button className="md:hidden mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileView('list')}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h1 className="text-base font-bold leading-tight">{selectedProject.title}</h1>
                    <StatusBadge status={selectedProject.status} />
                    {selectedProject.project_code && (
                      <span className="text-[9px] text-muted-foreground font-mono px-1.5 py-0.5 border border-border">{selectedProject.project_code}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {selectedProject.type}{selectedProject.city ? ` · ${selectedProject.city}, ${selectedProject.state}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setShowInvite(true)}
                    className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] border transition-all"
                    style={{ borderColor: selectedProject.portal_client_id ? '#10b98144' : AC + '44', color: selectedProject.portal_client_id ? '#10b981' : AC, backgroundColor: selectedProject.portal_client_id ? '#10b98108' : AC + '08' }}>
                    {selectedProject.portal_client_id ? <><UserCheck className="w-2.5 h-2.5" />Linked</> : <><Link2 className="w-2.5 h-2.5" />Invite</>}
                  </button>
                  <button onClick={() => { if (editMode) { setEditMode(false); setEditForm(null); } else { setEditMode(true); openEdit(); } }}
                    className={`flex items-center gap-1.5 h-7 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] border transition-all ${editMode ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}>
                    <Edit3 className="w-2.5 h-2.5" />{editMode ? 'Cancel' : 'Edit'}
                  </button>
                  <button onClick={() => deleteProject(selectedProject.id)}
                    className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-accent hover:border-accent/30 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-6 pb-3">
                <div className="flex items-center gap-3">
                  <ProgressRing pct={selectedProject.progress_pct} size={36} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Progress</span>
                      <span className="text-[9px] font-bold font-mono" style={{ color: AC }}>{selectedProject.progress_pct}%</span>
                    </div>
                    <div className="h-1 bg-border overflow-hidden">
                      <motion.div className="h-full" style={{ backgroundColor: AC }}
                        initial={{ width: 0 }} animate={{ width: `${selectedProject.progress_pct}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex border-t border-border overflow-x-auto">
                {(['overview', 'milestones', 'updates', 'settings'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)}
                    className={`flex-shrink-0 px-4 sm:px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] border-b-2 transition-all ${detailTab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t === 'milestones' ? `Milestones${milestones.length ? ` (${milestones.length})` : ''}`
                      : t === 'updates' ? `Updates${updates.length ? ` (${updates.length})` : ''}`
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 max-w-3xl">

                {/* OVERVIEW */}
                {detailTab === 'overview' && (
                  editMode ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[['title','Project Name *','text'],['project_code','Code','text'],['type','Type','select-type'],['status','Status','select-status']].map(([k, l, t]) => (
                          <div key={k} className={k === 'title' || k === 'type' ? 'col-span-2 sm:col-span-1' : ''}>
                            <MicroLabel>{l}</MicroLabel>
                            {t === 'select-type' ? (
                              <Select value={editForm[k]} onValueChange={v => setEditForm((f: any) => ({ ...f, [k]: v }))}>
                                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>{PROJECT_TYPES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : t === 'select-status' ? (
                              <Select value={editForm[k]} onValueChange={v => setEditForm((f: any) => ({ ...f, [k]: v }))}>
                                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>{PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Input className="rounded-none h-10" value={editForm[k] ?? ''}
                                onChange={e => setEditForm((f: any) => ({ ...f, [k]: e.target.value }))} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <MicroLabel>Progress — {editForm.progress_pct}%</MicroLabel>
                        <input type="range" min={0} max={100} value={editForm.progress_pct ?? 0}
                          onChange={e => setEditForm((f: any) => ({ ...f, progress_pct: Number(e.target.value) }))}
                          className="w-full cursor-pointer mt-1" style={{ accentColor: AC }} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                          <MicroLabel>Address</MicroLabel>
                          <Input className="rounded-none h-10" value={editForm.address ?? ''}
                            onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div className="col-span-2">
                          <MicroLabel>City</MicroLabel>
                          <Input className="rounded-none h-10" value={editForm.city}
                            onChange={e => setEditForm((f: any) => ({ ...f, city: e.target.value }))} />
                        </div>
                        <div>
                          <MicroLabel>State</MicroLabel>
                          <Input className="rounded-none h-10" value={editForm.state}
                            onChange={e => setEditForm((f: any) => ({ ...f, state: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <MicroLabel>Link Portal Client</MicroLabel>
                        <Select value={editForm.portal_client_id || '__none__'}
                          onValueChange={v => setEditForm((f: any) => ({ ...f, portal_client_id: v === '__none__' ? '' : v }))}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="No client linked" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No client linked</SelectItem>
                            {portalClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[['start_date','Start Date'],['estimated_completion','Est. Complete'],['actual_completion','Actual Complete']].map(([k, l]) => (
                          <div key={k}>
                            <MicroLabel>{l}</MicroLabel>
                            <Input type="date" className="rounded-none h-10" value={editForm[k] ?? ''}
                              onChange={e => setEditForm((f: any) => ({ ...f, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <MicroLabel>Contract Amount</MicroLabel>
                          <Input type="number" className="rounded-none h-10" value={editForm.contract_amount ?? ''}
                            onChange={e => setEditForm((f: any) => ({ ...f, contract_amount: e.target.value }))} />
                        </div>
                        <div>
                          <MicroLabel>Budget</MicroLabel>
                          <Input type="number" className="rounded-none h-10" value={editForm.budget ?? ''}
                            onChange={e => setEditForm((f: any) => ({ ...f, budget: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[['project_manager','PM'],['superintendent','Superintendent'],['architect','Architect']].map(([k, l]) => (
                          <div key={k}>
                            <MicroLabel>{l}</MicroLabel>
                            <Input className="rounded-none h-10" value={editForm[k] ?? ''}
                              onChange={e => setEditForm((f: any) => ({ ...f, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <MicroLabel>Description (client-visible)</MicroLabel>
                        <Textarea className="rounded-none" rows={3} value={editForm.description ?? ''}
                          onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <MicroLabel>Internal Notes</MicroLabel>
                        <Textarea className="rounded-none" rows={2} value={editForm.internal_notes ?? ''}
                          onChange={e => setEditForm((f: any) => ({ ...f, internal_notes: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveEdit} disabled={saving} className="rounded-none h-10 flex-1">
                          {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={() => { setEditMode(false); setEditForm(null); }} className="rounded-none h-10">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-px bg-border border border-border">
                        {[
                          { label: 'Contract', value: fmtUSD(selectedProject.contract_amount), Icon: DollarSign },
                          { label: 'Start Date', value: fmtDate(selectedProject.start_date), Icon: CalendarDays },
                          { label: 'Est. Complete', value: fmtDate(selectedProject.estimated_completion), Icon: Target },
                        ].map(({ label, value, Icon }) => (
                          <div key={label} className="bg-background p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon className="w-2.5 h-2.5" style={{ color: AC }} strokeWidth={1.5} />
                              <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
                            </div>
                            <div className="text-[13px] font-bold">{value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="border border-border divide-y divide-border">
                        {[
                          { label: 'Client', value: clientDisplay(selectedProject) ?? '—', sub: selectedProject.portal_client_id ? 'Linked portal account' : selectedProject.client_email },
                          { label: 'Type', value: selectedProject.type },
                          { label: 'Location', value: selectedProject.address ? `${selectedProject.address}, ${selectedProject.city}, ${selectedProject.state}` : `${selectedProject.city}, ${selectedProject.state}` },
                          { label: 'Budget', value: fmtUSD(selectedProject.budget) },
                        ].map(({ label, value, sub }) => (
                          <div key={label} className="flex items-start px-4 py-3 gap-4">
                            <div className="w-24 sm:w-28 flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground pt-0.5">{label}</div>
                            <div>
                              <div className="text-[13px] font-medium">{value}</div>
                              {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Custom fields */}
                      {selectedProject.custom_fields && Object.keys(selectedProject.custom_fields).length > 0 && (
                        <div className="border border-border divide-y divide-border">
                          <div className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.24em] text-muted-foreground bg-secondary/30">Custom Fields</div>
                          {Object.entries(selectedProject.custom_fields).map(([k, v]) => (
                            <div key={k} className="flex items-center px-4 py-2.5 gap-4">
                              <div className="w-24 sm:w-28 flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
                              <div className="text-[13px] font-medium">{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedProject.description && (
                        <div className="border border-border p-4 bg-secondary/20">
                          <div className="text-[8px] font-black uppercase tracking-[0.24em] text-muted-foreground mb-2.5">Description</div>
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                        </div>
                      )}
                      {selectedProject.internal_notes && (
                        <div className="border border-amber-200 dark:border-amber-900 p-4 bg-amber-50 dark:bg-amber-950/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            <div className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-500">Internal Notes</div>
                          </div>
                          <p className="text-[12px] text-amber-800 dark:text-amber-400 leading-relaxed whitespace-pre-wrap">{selectedProject.internal_notes}</p>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* MILESTONES */}
                {detailTab === 'milestones' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-xl font-light">Milestones</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{milestones.filter(m => m.completed_date).length} of {milestones.length} complete</div>
                      </div>
                      <button onClick={() => setShowMilestoneForm(true)}
                        className="flex items-center gap-1.5 h-8 px-3 text-[9px] font-black uppercase tracking-[0.16em] bg-foreground text-background hover:opacity-80 transition-opacity">
                        <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Add
                      </button>
                    </div>
                    <AnimatePresence>
                      {showMilestoneForm && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="border border-border bg-secondary/20 p-4 space-y-3">
                          <Input className="rounded-none h-10" placeholder="Milestone title *" autoFocus
                            value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))} />
                          <Textarea className="rounded-none" rows={2} placeholder="Description (optional)"
                            value={msForm.description} onChange={e => setMsForm(f => ({ ...f, description: e.target.value }))} />
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Target Date</Label>
                              <Input type="date" className="rounded-none h-9 mt-1"
                                value={msForm.target_date} onChange={e => setMsForm(f => ({ ...f, target_date: e.target.value }))} />
                            </div>
                            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer mt-5">
                              <input type="checkbox" checked={msForm.is_client_visible}
                                onChange={e => setMsForm(f => ({ ...f, is_client_visible: e.target.checked }))}
                                style={{ accentColor: AC }} />
                              Client visible
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={addMilestone} className="rounded-none h-9 flex-1 text-xs">Add Milestone</Button>
                            <Button variant="outline" onClick={() => setShowMilestoneForm(false)} className="rounded-none h-9 text-xs">Cancel</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {milestones.length > 0 && (
                      <div className="grid grid-cols-3 gap-px bg-border border border-border">
                        {[
                          { label: 'Total', v: milestones.length, c: '' },
                          { label: 'Complete', v: milestones.filter(m => m.completed_date).length, c: 'text-green-600 dark:text-green-400' },
                          { label: 'Remaining', v: milestones.filter(m => !m.completed_date).length, s: { color: AC } },
                        ].map(({ label, v, c, s }) => (
                          <div key={label} className="bg-background px-4 py-3 text-center">
                            <div className={`text-xl font-bold font-mono ${c}`} style={s}>{v}</div>
                            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {milestones.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Target className="w-8 h-8 text-border mb-3" strokeWidth={1} />
                        <p className="text-xs text-muted-foreground">No milestones yet — add your first one above.</p>
                      </div>
                    ) : (
                      <div className="border border-border divide-y divide-border">
                        {milestones.map(m => {
                          const done = !!m.completed_date;
                          const active = m.is_active && !done;
                          return (
                            <div key={m.id} className={`flex items-start gap-3 px-4 py-4 ${active ? 'bg-secondary/30' : ''}`}>
                              <button onClick={() => completeMilestone(m)} className="mt-0.5 flex-shrink-0">
                                {done
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  : active
                                  ? <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: AC, backgroundColor: AC + '18' }}>
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AC }} />
                                    </div>
                                  : <div className="w-5 h-5 rounded-full border-2 border-border" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  <span className={`text-[13px] font-semibold ${done ? 'text-muted-foreground line-through' : ''}`}>{m.title}</span>
                                  {active && <span className="text-[7px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5" style={{ backgroundColor: AC + '18', color: AC }}>In Progress</span>}
                                  {done && <span className="text-[7px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400">Complete</span>}
                                  {!m.is_client_visible && <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><EyeOff className="w-2.5 h-2.5" /> Internal</span>}
                                </div>
                                {m.description && <p className="text-[11px] text-muted-foreground">{m.description}</p>}
                                <div className="flex gap-3 mt-1">
                                  {m.target_date && <span className="text-[9px] text-muted-foreground flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" />{fmtDate(m.target_date)}</span>}
                                  {m.completed_date && <span className="text-[9px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{fmtDate(m.completed_date)}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {!done && (
                                  <button onClick={() => setMilestoneActive(m)} title={active ? 'Remove active' : 'Set active'}
                                    className="p-1.5 transition-colors" style={{ color: active ? AC : 'var(--muted-foreground)' }}>
                                    <Zap className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={() => deleteMilestone(m.id)} className="p-1.5 text-muted-foreground hover:text-accent transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* UPDATES */}
                {detailTab === 'updates' && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-xl font-light">Project Updates</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Client-visible updates appear in the portal in real-time.</div>
                      </div>
                      <button onClick={() => setShowUpdateForm(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 text-[9px] font-black uppercase tracking-[0.16em] bg-foreground text-background hover:opacity-80 transition-opacity">
                        <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Post
                      </button>
                    </div>
                    <AnimatePresence>
                      {showUpdateForm && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="border border-border bg-secondary/20 p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <Input className="rounded-none h-10 sm:col-span-3" placeholder="Update title *" autoFocus
                              value={upForm.title} onChange={e => setUpForm(f => ({ ...f, title: e.target.value }))} />
                            <Select value={upForm.update_type} onValueChange={v => setUpForm(f => ({ ...f, update_type: v }))}>
                              <SelectTrigger className="rounded-none h-10 sm:col-span-2"><SelectValue /></SelectTrigger>
                              <SelectContent>{UPDATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <Textarea className="rounded-none" rows={3} placeholder="Update details *"
                            value={upForm.body} onChange={e => setUpForm(f => ({ ...f, body: e.target.value }))} />
                          <div className="flex flex-wrap gap-4">
                            {[['is_client_visible', 'Visible to client'], ['pinned', 'Pin to top']].map(([k, l]) => (
                              <label key={k} className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={(upForm as any)[k]}
                                  onChange={e => setUpForm(f => ({ ...f, [k]: e.target.checked }))}
                                  style={{ accentColor: AC }} />
                                {l}
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={postUpdate} className="rounded-none h-9 flex-1 text-xs">Post Update</Button>
                            <Button variant="outline" onClick={() => setShowUpdateForm(false)} className="rounded-none h-9 text-xs">Cancel</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {updates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageSquare className="w-8 h-8 text-border mb-3" strokeWidth={1} />
                        <p className="text-xs text-muted-foreground">No updates yet — post the first update above.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {updates.map(u => {
                          const ut = UPDATE_TYPES.find(t => t.value === u.update_type) ?? UPDATE_TYPES[0];
                          return (
                            <div key={u.id} className="border p-4 relative"
                              style={{ borderColor: u.pinned ? AC + '44' : undefined, backgroundColor: u.pinned ? AC + '04' : undefined }}>
                              {u.pinned && <Pin className="w-3 h-3 absolute top-3 right-3" style={{ color: AC }} />}
                              <div className="flex items-center gap-2 mb-2 pr-6">
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5"
                                  style={{ backgroundColor: ut.color + '18', color: ut.color }}>{ut.label}</span>
                                <span className="text-[12px] font-semibold">{u.title}</span>
                              </div>
                              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 whitespace-pre-wrap">{u.body}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] text-muted-foreground">{u.created_by} · {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  <span className={`text-[9px] flex items-center gap-1 ${u.is_client_visible ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    {u.is_client_visible ? <><Eye className="w-2.5 h-2.5" />Visible</> : <><EyeOff className="w-2.5 h-2.5" />Internal</>}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => toggleUpdateVisibility(u)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                    {u.is_client_visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => deleteUpdate(u.id)} className="p-1.5 text-muted-foreground hover:text-accent transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SETTINGS */}
                {detailTab === 'settings' && (
                  <div className="space-y-4 max-w-lg">
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-xl font-light">Settings</div>
                    <div className="border border-border p-5 space-y-4">
                      <div className="text-[11px] font-bold">Portal Client Access</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {selectedProject.portal_client_id
                          ? 'Linked to a portal client — they see client-visible milestones and updates in real-time.'
                          : 'Not linked. Invite them to register a portal account and see updates in real-time.'}
                      </p>
                      {selectedProject.portal_client_id && (
                        <div className="flex items-center gap-2 p-2.5 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                          <UserCheck className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-[11px] text-green-700 dark:text-green-400 font-medium">
                            {portalClients.find(c => c.id === selectedProject.portal_client_id)?.name ?? 'Client'} — linked
                          </span>
                        </div>
                      )}
                      <button onClick={() => setShowInvite(true)}
                        className="flex items-center gap-2 h-9 px-4 text-[9px] font-black uppercase tracking-[0.16em] border border-border transition-all hover:bg-foreground hover:text-background hover:border-foreground">
                        {selectedProject.portal_client_id
                          ? <><RefreshCw className="w-3 h-3" />Send New Invite</>
                          : <><Send className="w-3 h-3" />Invite Client to Portal</>}
                      </button>
                    </div>
                    <div className="border border-red-200 dark:border-red-900 p-5 bg-red-50 dark:bg-red-950/20 space-y-3">
                      <div className="text-[11px] font-bold text-red-700 dark:text-red-400">Danger Zone</div>
                      <p className="text-[11px] text-red-600 dark:text-red-400/80 leading-relaxed">
                        Deleting this project permanently removes all milestones, updates, and invite history.
                      </p>
                      <button onClick={() => deleteProject(selectedProject.id)}
                        className="flex items-center gap-2 h-8 px-4 text-[9px] font-black uppercase tracking-[0.16em] bg-red-600 text-white hover:bg-red-700 transition-colors">
                        <Trash2 className="w-3 h-3" /> Delete Project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ═══ WIZARD MODAL ═══ */}
      <AnimatePresence>
        {showNew && (
          <NewProjectWizard
            onClose={() => setShowNew(false)}
            onCreated={p => {
              setProjects(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]);
              setSelectedId(p.id);
              setMobileView('detail');
              setDetailTab('overview');
              setShowNew(false);
            }}
            portalClients={portalClients}
            existingCount={projects.length}
          />
        )}
      </AnimatePresence>

      {/* ═══ INVITE MODAL ═══ */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(3px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowInvite(false); setInviteToken(null); setInviteEmail(''); setInviteName(''); } }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-background w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="h-0.5 w-full" style={{ backgroundColor: AC }} />
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-center justify-between mb-5">
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-xl font-light">Invite Client to Portal</div>
                  <button onClick={() => { setShowInvite(false); setInviteToken(null); setInviteEmail(''); setInviteName(''); }}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"><X className="w-4 h-4" /></button>
                </div>
                {portalClients.filter(c => c.status === 'approved').length > 0 && !inviteToken && (
                  <div className="mb-5">
                    <MicroLabel>Link Existing Portal Client</MicroLabel>
                    <Select value={selectedProject?.portal_client_id ?? '__none__'}
                      onValueChange={async v => {
                        if (!selectedId || v === '__none__') return;
                        const { data } = await supabase.from('admin_projects').update({ portal_client_id: v }).eq('id', selectedId).select().single();
                        if (data) { setProjects(prev => prev.map(p => p.id === selectedId ? data : p)); toast({ title: 'Client linked' }); setShowInvite(false); }
                      }}>
                      <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select portal client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Select client —</SelectItem>
                        {portalClients.filter(c => c.status === 'approved').map(c =>
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">or invite new</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>
                )}
                {!inviteToken ? (
                  <div className="space-y-4">
                    <p className="text-[12px] text-muted-foreground leading-relaxed">Create a 7-day invite link. The client registers with pre-filled details and is auto-linked to this project.</p>
                    <div><MicroLabel>Client Email *</MicroLabel><Input type="email" autoFocus className="rounded-none h-10" placeholder="client@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                    <div><MicroLabel>Client Name</MicroLabel><Input className="rounded-none h-10" placeholder="Full name" value={inviteName} onChange={e => setInviteName(e.target.value)} /></div>
                    <Button onClick={sendInvite} disabled={inviteLoading || !inviteEmail.trim()} className="w-full rounded-none h-10 text-[10px] font-black uppercase tracking-[0.18em]">
                      {inviteLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Creating…</> : 'Generate Invite Link'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3.5 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-green-700 dark:text-green-400 leading-relaxed">Invite created for <strong>{inviteEmail}</strong>. Expires in 7 days.</p>
                    </div>
                    <div>
                      <MicroLabel>Invite Link</MicroLabel>
                      <div className="flex">
                        <input readOnly value={inviteUrl} className="flex-1 h-10 px-3 text-[11px] font-mono border border-border bg-secondary/30 focus:outline-none overflow-hidden text-ellipsis" />
                        <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast({ title: 'Copied' }); }}
                          className="h-10 px-3 bg-foreground text-background border-l-0 hover:opacity-80 transition-opacity flex-shrink-0">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => { setShowInvite(false); setInviteToken(null); setInviteEmail(''); setInviteName(''); }} className="w-full rounded-none h-9 text-xs">Done</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
