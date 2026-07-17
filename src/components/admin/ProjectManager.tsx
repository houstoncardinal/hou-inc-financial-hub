import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Search, X, CheckCircle2, FolderKanban, CalendarDays,
  DollarSign, Edit3, Trash2, Send, Link2, Copy, RefreshCw,
  ArrowLeft, Pin, Eye, EyeOff, Target, MessageSquare,
  UserCheck, Users, Loader2, Zap, Building2, AlertTriangle,
  Wand2, ChevronRight, ChevronLeft, MapPin, Clock, TrendingUp,
  Wallet, Receipt, ShieldCheck, Home, BriefcaseBusiness, ExternalLink,
  LayoutGrid, List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StatCard } from '@/components/project-detail/StatCard';
import { MilestoneTimeline } from '@/components/project-detail/MilestoneTimeline';
import { ProgressRing } from '@/components/project-detail/ProgressRing';
import { ActionButton } from '@/components/admin/design/ActionButton';
import { PDV2_CSS } from '@/components/project-detail/cardStyles';

/* ── Tokens ──────────────────────────────────────────────────────── */
const AC    = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const HE_ENTITY = 'houston-enterprise';

const ADMIN_PROJECT_CSS = `
.ap-kpi{position:relative;overflow:hidden;border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 3px rgba(10,10,10,.045),0 1px 0 rgba(255,255,255,.7) inset;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease;}
.ap-kpi::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--ap-color-soft),transparent 46%);pointer-events:none;}
.ap-kpi:hover{border-color:hsl(var(--foreground)/.16);box-shadow:0 12px 30px rgba(10,10,10,.08);transform:translateY(-1px);}
.ap-kpi-icon{width:34px;height:34px;border:1px solid hsl(var(--border));background:var(--ap-color-soft);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.ap-kpi-foot{border-top:1px solid hsl(var(--border)/.65);background:hsl(var(--secondary)/.24);}
.ap-command{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.04);}
.ap-project-card{position:relative;border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 3px rgba(10,10,10,.04),0 1px 0 rgba(255,255,255,.65) inset;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease;}
.ap-project-card::before{content:'';position:absolute;inset:0;background:linear-gradient(145deg,rgba(157,126,63,.045),transparent 42%);pointer-events:none;}
.ap-project-card:hover{border-color:hsl(var(--foreground)/.18);box-shadow:0 14px 34px rgba(10,10,10,.08);transform:translateY(-1px);}
@media(max-width:767px){
  .ap-kpi{min-height:68px;}
  .ap-kpi-icon{width:30px;height:30px;}
  .ap-command{padding:10px!important;}
}
`;

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
  finance_project_id: string | null;
  deleted_at?: string | null;
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

interface FinanceProject {
  id: string;
  name: string;
  code: string | null;
  budget: number | null;
  status: string;
  notes: string | null;
  department?: string | null;
  location?: string | null;
  client_name_snapshot?: string | null;
  admin_project_id?: string | null;
  created_at?: string | null;
}

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
const PROJECT_CATEGORIES = [
  { id: 'all', label: 'All Work', short: 'All', icon: FolderKanban, color: AC },
  { id: 'residential', label: 'Residential Construction', short: 'Residential', icon: Home, color: '#0f766e' },
  { id: 'commercial', label: 'Commercial Construction', short: 'Commercial', icon: Building2, color: '#2563eb' },
  { id: 'management', label: 'Project Management', short: 'Management', icon: BriefcaseBusiness, color: '#7c3aed' },
] as const;
type ProjectCategory = typeof PROJECT_CATEGORIES[number]['id'];
type WorkCategory = Exclude<ProjectCategory, 'all'>;
const categoryById = (id: ProjectCategory) => PROJECT_CATEGORIES.find(c => c.id === id) ?? PROJECT_CATEGORIES[0];
const inferProjectCategory = (p: any): WorkCategory => {
  const haystack = [
    p.department, p.project_type, p.service_type, p.category, p.type, p.name, p.title, p.notes, p.description, p.location,
  ].filter(Boolean).join(' ').toLowerCase();
  if (/management|owner rep|owner's rep|project management|consult|coordination|\bpm\b/.test(haystack)) return 'management';
  if (/commercial|tenant|retail|restaurant|office|industrial|warehouse|medical|buildout|build-out/.test(haystack)) return 'commercial';
  return 'residential';
};
const healthTone = (score: number) => (
  score >= 82 ? { label: 'Strong', color: '#10b981' }
    : score >= 64 ? { label: 'Stable', color: AC }
      : score >= 45 ? { label: 'Watch', color: '#f59e0b' }
        : { label: 'At Risk', color: '#ef4444' }
);
const missingDbColumn = (error: any, column: string) => {
  const msg = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`;
  return msg.toLowerCase().includes(column.toLowerCase()) || msg.includes(`'${column}'`);
};
const isSyntheticFinanceId = (id: string | null | undefined) => !!id && id.startsWith('finance:');
const financeStatusToAdmin = (status: string) => (
  status === 'on_hold' || status === 'completed' || status === 'archived' ? status : 'active'
);
const financeToAdminProject = (p: FinanceProject, userId: string): AdminProject => ({
  id: `finance:${p.id}`,
  title: p.name,
  project_code: p.code,
  type: p.department || inferProjectCategory(p),
  address: null,
  city: p.location || 'Houston',
  state: 'TX',
  portal_client_id: null,
  client_name: p.client_name_snapshot || null,
  client_email: null,
  status: financeStatusToAdmin(p.status),
  progress_pct: 0,
  start_date: null,
  estimated_completion: null,
  actual_completion: null,
  contract_amount: p.budget,
  budget: p.budget,
  project_manager: null,
  superintendent: null,
  architect: null,
  entity: HE_ENTITY,
  finance_project_id: p.id,
  deleted_at: null,
  description: p.notes,
  internal_notes: null,
  zip_code: null,
  custom_fields: null,
  created_at: p.created_at || new Date().toISOString(),
  updated_at: p.created_at || new Date().toISOString(),
});
function autoCode(title: string, count: number) {
  const words = title.trim().split(/\s+/).filter(w => w.length > 1);
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return initials ? `${initials}-${String(count + 1).padStart(3, '0')}` : '';
}

/* ── Shared UI pieces ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.22em] px-1.5 py-0.5 whitespace-nowrap"
      style={{ backgroundColor: m.color + '18', color: m.color }}>
      {m.label}
    </span>
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
        const c = o.color ?? 'hsl(var(--foreground))';
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] border transition-all"
            style={sel
              ? { backgroundColor: c, color: '#fff', borderColor: c }
              : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
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
          className="w-full h-11 pl-9 pr-10 text-[14px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
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
              className="w-full h-12 px-4 text-[15px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
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
                      className="h-8 px-3 text-[12px] font-mono rounded-lg border border-border bg-background focus:outline-none focus:border-foreground/40 w-36 transition-colors"
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
                className="w-full h-10 px-3 text-[13px] rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <div className="col-span-1">
              <MicroLabel>State</MicroLabel>
              <input
                value={form.state}
                onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX"
                maxLength={2}
                className="w-full h-10 px-3 text-[13px] font-mono rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <MicroLabel>ZIP Code</MicroLabel>
              <input
                value={form.zipcode}
                onChange={e => set('zipcode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="00000"
                maxLength={5}
                className="w-full h-10 px-3 text-[13px] font-mono rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors"
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
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
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
          <div className="p-3 rounded-lg border border-border bg-secondary/20">
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
          <div className="space-y-0 rounded-lg border border-border divide-y divide-border overflow-hidden">
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
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded border border-border text-muted-foreground/70">
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects,      setProjects]      = useState<AdminProject[]>([]);
  const [financeProjects, setFinanceProjects] = useState<FinanceProject[]>([]);
  const [financeTxns, setFinanceTxns] = useState<any[]>([]);
  const [financeChecks, setFinanceChecks] = useState<any[]>([]);
  const [milestones,    setMilestones]    = useState<Milestone[]>([]);
  const [updates,       setUpdates]       = useState<ProjectUpdate[]>([]);
  const [portalClients, setPortalClients] = useState<PortalClientRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [bridgeWarning, setBridgeWarning] = useState('');
  const userIdRef = useRef<string | null>(null);

  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [detailTab,    setDetailTab]    = useState<'overview' | 'milestones' | 'updates' | 'settings'>('overview');
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory>('all');
  const [portfolioView, setPortfolioView] = useState<'cards' | 'list'>('cards');

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
  const selectedFinanceProject = selectedProject?.finance_project_id
    ? financeProjects.find(p => p.id === selectedProject.finance_project_id) ?? null
    : null;

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setBridgeWarning('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    userIdRef.current = user.id;
    let adminQuery = supabase.from('admin_projects').select('*').eq('admin_user_id', user.id).eq('entity', HE_ENTITY).is('deleted_at', null).order('created_at', { ascending: false });
    let projRes = await adminQuery;
    if (projRes.error && missingDbColumn(projRes.error, 'deleted_at')) {
      setBridgeWarning('Admin project archive/link columns are missing in Supabase. Finance projects are visible, but admin delivery management requires the admin-finance bridge migration.');
      projRes = await supabase.from('admin_projects').select('*').eq('admin_user_id', user.id).eq('entity', HE_ENTITY).order('created_at', { ascending: false });
    }

    const [clientsRes, finProjRes, finTxnRes, finCheckRes] = await Promise.all([
      supabase.from('portal_clients').select('id, name, email, status').order('name'),
      supabase.from('projects').select('*').eq('entity_id', HE_ENTITY).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('entity_id', HE_ENTITY).is('deleted_at', null),
      supabase.from('checks').select('*').eq('entity_id', HE_ENTITY).is('deleted_at', null),
    ]);
    if (projRes.error) {
      setBridgeWarning(projRes.error.message || 'Could not load admin delivery projects.');
    }
    const adminRows = (projRes.data ?? []) as AdminProject[];
    const financeRows = (finProjRes.data ?? []) as FinanceProject[];
    const adminFinanceIds = new Set(adminRows.map(p => p.finance_project_id).filter(Boolean));
    const financeOnly = financeRows
      .filter(p => !p.admin_project_id && !adminFinanceIds.has(p.id) && !adminRows.some(ap => ap.title === p.name || ap.project_code === p.code))
      .map(p => financeToAdminProject(p, user.id));
    setProjects([...adminRows, ...financeOnly]);
    setPortalClients(clientsRes.data ?? []);
    setFinanceProjects(financeRows);
    setFinanceTxns(finTxnRes.data ?? []);
    setFinanceChecks(finCheckRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const requested = searchParams.get('project');
    if (!requested || !projects.length) return;
    const match = projects.find(p => p.id === requested || p.finance_project_id === requested);
    if (match && selectedId !== match.id) openProject(match.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, searchParams, selectedId]);

  /* ── Realtime ─────────────────────────────────────────────────── */
  useEffect(() => {
    const ch = supabase.channel('pm-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_projects' },
        ({ new: row }) => setProjects(prev => row.deleted_at ? prev : (prev.some(p => p.id === row.id) ? prev : [row as AdminProject, ...prev])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_projects' },
        ({ new: row }) => setProjects(prev => row.deleted_at ? prev.filter(p => p.id !== row.id) : prev.map(p => p.id === row.id ? row as AdminProject : p)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_projects' },
        ({ old: row }) => setProjects(prev => prev.filter(p => p.id !== row.id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `entity_id=eq.${HE_ENTITY}` },
        () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `entity_id=eq.${HE_ENTITY}` },
        () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `entity_id=eq.${HE_ENTITY}` },
        () => load())
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
  }, [load, selectedId]);

  /* ── Sub-data on selection ────────────────────────────────────── */
  useEffect(() => {
    if (!selectedId || isSyntheticFinanceId(selectedId)) { setMilestones([]); setUpdates([]); return; }
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
    if (!confirm('Archive this project in admin and finance? Milestones, updates, transactions, and checks are preserved.')) return;
    const { error } = await supabase.from('admin_projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error && missingDbColumn(error, 'deleted_at')) {
      await supabase.from('admin_projects').delete().eq('id', id);
      setBridgeWarning('Supabase is missing admin_projects.deleted_at, so this project used legacy delete behavior. Run the bridge migration for archive-safe syncing.');
    } else if (error) {
      toast({ title: 'Archive failed', description: error.message, variant: 'destructive' });
      return;
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast({ title: 'Project archived', description: 'Hidden from active admin and finance project views' });
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

  const financeById = useMemo(() => new Map(financeProjects.map(p => [p.id, p])), [financeProjects]);

  const enrichedProjects = useMemo(() => projects.map(p => {
    const finance = p.finance_project_id ? financeById.get(p.finance_project_id) : null;
    const financeId = finance?.id ?? p.finance_project_id;
    const pChecks = financeId ? financeChecks.filter((c: any) => c.project_id === financeId) : [];
    const pTxns = financeId ? financeTxns.filter((t: any) => t.project_id === financeId) : [];
    const incoming = pTxns
      .filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
    const expenses = pTxns
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + Number(t.total_amount ?? t.amount ?? 0), 0);
    const cleared = pChecks
      .filter((c: any) => c.status === 'cleared')
      .reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
    const outstanding = pChecks
      .filter((c: any) => c.status === 'pending')
      .reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
    const budget = Number(finance?.budget ?? p.budget ?? p.contract_amount ?? 0);
    const spent = expenses + cleared;
    const used = budget > 0 ? Math.min(150, (spent / budget) * 100) : 0;
    const collectionPct = budget > 0 ? Math.min(150, (incoming / budget) * 100) : 0;
    const outstandingRatio = budget > 0 ? outstanding / budget : 0;
    const cashRatio = incoming > 0 ? (incoming - spent) / Math.max(incoming, 1) : 0;
    const category = inferProjectCategory({ ...finance, ...p, name: finance?.name, notes: finance?.notes });
    const healthScore = Math.max(0, Math.min(100,
      92
      - Math.max(0, (spent / Math.max(budget, 1)) - 0.78) * 95
      - outstandingRatio * 28
      - (p.status === 'on_hold' ? 12 : p.status === 'archived' ? 22 : 0)
      + (cashRatio > 0.12 ? 5 : 0)
    ));

    return {
      ...p,
      finance,
      budget,
      incoming,
      spent,
      outstanding,
      net: incoming - spent,
      used,
      collectionPct,
      healthScore,
      healthLabel: healthTone(healthScore).label,
      projectCategory: category,
    };
  }), [projects, financeById, financeChecks, financeTxns]);

  const categoryStats = useMemo(() => PROJECT_CATEGORIES.map(category => {
    const list = category.id === 'all' ? enrichedProjects : enrichedProjects.filter((p: any) => p.projectCategory === category.id);
    return {
      ...category,
      count: list.length,
      budget: list.reduce((s: number, p: any) => s + Number(p.budget || 0), 0),
      active: list.filter((p: any) => p.status === 'active').length,
      net: list.reduce((s: number, p: any) => s + p.net, 0),
      health: list.length ? list.reduce((s: number, p: any) => s + p.healthScore, 0) / list.length : 0,
    };
  }), [enrichedProjects]);
  const selectedCategoryStats = categoryStats.find(c => c.id === categoryFilter) ?? categoryStats[0];

  const selectedProjectMetrics = selectedId ? enrichedProjects.find(p => p.id === selectedId) ?? null : null;

  /* ── Filtered list ────────────────────────────────────────────── */
  const filtered = enrichedProjects.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q) || p.project_code?.toLowerCase().includes(q))
      && (filterStatus === 'all' || p.status === filterStatus)
      && (categoryFilter === 'all' || p.projectCategory === categoryFilter);
  });

  const clientDisplay = (p: AdminProject) => {
    if (p.portal_client_id) return portalClients.find(c => c.id === p.portal_client_id)?.name ?? p.client_name ?? 'Linked Client';
    return p.client_name ?? null;
  };

  const materializeFinanceProject = async (p: AdminProject) => {
    if (!p.id.startsWith('finance:') || !p.finance_project_id) return p.id;
    const userId = userIdRef.current ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    const { data: existing, error: existingError } = await supabase
      .from('admin_projects')
      .select('*')
      .eq('finance_project_id', p.finance_project_id)
      .maybeSingle();
    if (existingError && missingDbColumn(existingError, 'finance_project_id')) {
      setBridgeWarning('Supabase is missing admin_projects.finance_project_id. Run the admin-finance bridge migration to manage finance-created projects inside Admin.');
      toast({
        title: 'Project bridge migration needed',
        description: 'Opening the finance project detail instead. Admin delivery management needs the bridge columns in Supabase.',
        variant: 'destructive',
      });
      navigate(`/projects/${p.finance_project_id}`);
      return null;
    }
    if (existing) {
      setProjects(prev => prev.map(row => row.id === p.id ? existing as AdminProject : row));
      return existing.id;
    }

    const { data, error } = await supabase.from('admin_projects').insert({
      admin_user_id: userId,
      entity: HE_ENTITY,
      title: p.title,
      project_code: p.project_code,
      type: p.type || 'Other',
      city: p.city || 'Houston',
      state: p.state || 'TX',
      client_name: p.client_name,
      status: p.status,
      progress_pct: p.progress_pct || 0,
      contract_amount: p.contract_amount,
      budget: p.budget,
      description: p.description,
      custom_fields: {},
      finance_project_id: p.finance_project_id,
    }).select().single();
    if (error) {
      const bridgeMissing = missingDbColumn(error, 'finance_project_id');
      if (bridgeMissing) {
        setBridgeWarning('Supabase is missing the admin-finance bridge columns. Finance projects are visible here, but admin management requires the bridge migration.');
        navigate(`/projects/${p.finance_project_id}`);
      }
      toast({
        title: bridgeMissing ? 'Project bridge migration needed' : 'Could not open delivery workspace',
        description: bridgeMissing ? 'Opening the finance project detail instead.' : error.message,
        variant: 'destructive',
      });
      return null;
    }
    setProjects(prev => prev.map(row => row.id === p.id ? data as AdminProject : row));
    toast({ title: 'Delivery workspace linked', description: 'This finance project can now be managed in admin.' });
    return data.id;
  };

  const openProject = async (id: string) => {
    const requested = projects.find(p => p.id === id);
    const nextId = requested ? await materializeFinanceProject(requested) : id;
    if (!nextId || isSyntheticFinanceId(nextId)) return;
    setSelectedId(nextId); setDetailTab('overview'); setEditMode(false); setEditForm(null);
    // Scroll the admin content pane (and window, when standalone) back to the top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      document.querySelector('.admin-dashboard main')?.scrollTo({ top: 0 });
    });
  };

  /* ── Portfolio metrics ────────────────────────────────────────── */
  const activeCount    = enrichedProjects.filter(p => p.status === 'active').length;
  const planningCount  = enrichedProjects.filter(p => p.status === 'planning').length;
  const completedCount = enrichedProjects.filter(p => p.status === 'completed').length;
  const totalContract  = enrichedProjects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
  const totalSpent     = enrichedProjects.reduce((s, p) => s + (Number(p.spent) || 0), 0);
  const totalIncoming  = enrichedProjects.reduce((s, p) => s + (Number(p.incoming) || 0), 0);
  const totalOpenChecks = enrichedProjects.reduce((s, p) => s + (Number(p.outstanding) || 0), 0);
  const watchCount     = enrichedProjects.filter(p => p.healthScore < 64 || p.used >= 90).length;
  const avgProgress    = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress_pct || 0), 0) / projects.length) : 0;

  /* ── Selected-project derived data ────────────────────────────── */
  const selMeta = selectedProject ? statusMeta(selectedProject.status) : null;
  const msDone  = milestones.filter(m => m.completed_date).length;
  const timelineMs = milestones.map(m => ({
    id: m.id,
    title: m.title,
    date: m.completed_date || m.target_date,
    status: (m.completed_date ? 'completed' : m.is_active ? 'active' : 'pending') as 'completed' | 'active' | 'pending',
  }));
  const schedule = (() => {
    if (!selectedProject?.start_date || !selectedProject?.estimated_completion) return null;
    const start = new Date(selectedProject.start_date + 'T12:00:00').getTime();
    const end   = new Date(selectedProject.estimated_completion + 'T12:00:00').getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const now = Date.now();
    const totalDays   = Math.round((end - start) / 86400000);
    const elapsedDays = Math.min(Math.max(Math.round((now - start) / 86400000), 0), totalDays);
    const daysLeft    = Math.ceil((end - now) / 86400000);
    return { totalDays, elapsedDays, daysLeft, pct: Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100) };
  })();

  /* Set progress_pct from completed-milestone ratio */
  const syncProgress = async () => {
    if (!selectedId || milestones.length === 0) return;
    const pct = Math.round((msDone / milestones.length) * 100);
    const { data, error } = await supabase.from('admin_projects').update({ progress_pct: pct }).eq('id', selectedId).select().single();
    if (error) { toast({ title: 'Sync failed', description: error.message, variant: 'destructive' }); return; }
    setProjects(prev => prev.map(p => p.id === selectedId ? data : p));
    toast({ title: `Progress synced to ${pct}%`, description: 'Based on completed milestones' });
  };

  const SelectedCategoryIcon = selectedCategoryStats?.icon ?? FolderKanban;
  const portfolioKpis = [
    { label: 'Total Projects', value: String(projects.length), sub: `${planningCount} planning · ${completedCount} completed`, foot: 'Admin + finance register', icon: FolderKanban, color: AC },
    { label: 'Active Builds', value: String(activeCount), sub: activeCount > 0 ? 'Currently in delivery' : 'No active builds', foot: 'Live Houston Enterprise', icon: Zap, color: '#10b981' },
    { label: 'Portfolio Value', value: fmtUSD(totalContract), sub: 'Finance budget', foot: `${categoryStats[0]?.count ?? 0} scoped records`, icon: DollarSign, color: '#3b82f6' },
    { label: 'Capital Deployed', value: fmtUSD(totalSpent), sub: `${totalContract > 0 ? ((totalSpent / totalContract) * 100).toFixed(1) : '0.0'}% of budget`, foot: 'Checks + expenses', icon: Wallet, color: '#ef4444' },
    { label: 'Revenue', value: fmtUSD(totalIncoming), sub: `${fmtUSD(totalOpenChecks)} open checks`, foot: 'Transactions linked', icon: Receipt, color: '#0f766e' },
    { label: 'Watch List', value: String(watchCount), sub: `${avgProgress}% avg progress`, foot: 'Risk intelligence', icon: ShieldCheck, color: '#f59e0b' },
  ];

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="text-foreground">
      <style>{PDV2_CSS}{ADMIN_PROJECT_CSS}</style>

      {!selectedProject ? (
        /* ═══ PORTFOLIO — KPI rail + project register ═══ */
        <div className="space-y-5">
          {bridgeWarning && (
            <div className="pdv2-card !border-warning/35 bg-warning/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.18em] font-black text-warning">Admin-Finance Bridge Needs Database Migration</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{bridgeWarning}</div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="h-8 px-3 border border-warning/30 text-warning text-[9px] uppercase tracking-[0.16em] font-black hover:bg-warning/10 transition-colors"
              >
                Open Finance Projects
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-2.5">
            {portfolioKpis.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  className="ap-kpi text-left min-w-0"
                  style={{ '--ap-color-soft': `${card.color}14` } as any}
                >
                  <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: card.color }} />
                  <div className="relative flex items-center gap-2.5 p-2.5 sm:p-3">
                    <span className="ap-kpi-icon" style={{ color: card.color }}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[8px] uppercase tracking-[0.16em] font-black text-foreground/60 truncate">{card.label}</span>
                      <span className="block text-[17px] sm:text-[18px] font-mono-tab font-black leading-tight truncate text-foreground">{card.value}</span>
                      <span className="block text-[9px] text-muted-foreground truncate">{card.sub}</span>
                    </span>
                  </div>
                  <div className="ap-kpi-foot relative hidden sm:flex px-3 py-1.5 items-center justify-between gap-2">
                    <span className="text-[7.5px] uppercase tracking-[0.15em] font-black text-foreground/45 truncate">{card.foot}</span>
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: card.color }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pdv2-card overflow-hidden">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3 px-3 sm:px-5 py-3 border-b border-border">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wide">
                  Project Portfolio ({filtered.length}{filtered.length !== projects.length ? ` of ${projects.length}` : ''})
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Finance-linked delivery view with realtime cash, progress, and risk signals.
                </div>
              </div>
              <div className="ap-command flex flex-col lg:flex-row lg:items-center gap-2 min-w-0 p-2">
                <div className="relative flex items-center min-w-0 lg:w-[245px]">
                  <Search className="absolute left-2.5 w-3 h-3 pointer-events-none text-muted-foreground" strokeWidth={2} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search projects…"
                    className="text-[11px] outline-none border border-border bg-background text-foreground pl-6 pr-2.5 py-2 w-full h-10 focus:border-accent transition-colors" />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:w-[330px] min-w-0">
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ProjectCategory)}>
                    <SelectTrigger className="h-10 rounded-none border-border text-left">
                      <SelectValue placeholder="Work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryStats.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label} · {category.count}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="hidden sm:flex items-center gap-2 border border-border bg-secondary/25 px-2.5 min-w-[148px]">
                    <SelectedCategoryIcon className="w-3.5 h-3.5 shrink-0" style={{ color: selectedCategoryStats.color }} />
                    <div className="min-w-0">
                      <div className="text-[8px] uppercase tracking-[0.14em] font-black text-muted-foreground truncate">{selectedCategoryStats.short}</div>
                      <div className="text-[9px] font-mono-tab font-bold truncate">{fmtUSD(selectedCategoryStats.budget)} · {selectedCategoryStats.active} active</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:flex sm:items-center gap-2">
                  <div className="inline-flex border border-border bg-background overflow-hidden shrink-0 h-10">
                    {[
                      { key: 'cards' as const, label: 'Cards', Icon: LayoutGrid },
                      { key: 'list' as const, label: 'List', Icon: List },
                    ].map(v => {
                      const active = portfolioView === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setPortfolioView(v.key)}
                          className={`px-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] font-black transition-colors border-r border-border last:border-r-0 ${
                            active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                          }`}
                        >
                          <v.Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <ActionButton variant="primary" icon={Plus} onClick={() => setShowNew(true)}>New Project</ActionButton>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 px-3 sm:px-5 py-2 border-b border-border">
              {['all', 'planning', 'active', 'on_hold', 'completed', 'archived'].map(s => {
                const on = filterStatus === s;
                const m  = s !== 'all' ? statusMeta(s) : null;
                const count = s === 'all' ? projects.length : projects.filter(p => p.status === s).length;
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] transition-all"
                    style={on
                      ? { backgroundColor: m?.color ?? 'hsl(var(--foreground))', borderColor: m?.color ?? 'hsl(var(--foreground))', color: '#fff' }
                      : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                    {s === 'all' ? 'All' : m!.label}
                    <span className="font-mono-tab">{count}</span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <FolderKanban className="w-9 h-9 text-muted-foreground/35 mb-3" strokeWidth={1} />
                <div className="text-[13px] font-semibold text-foreground mb-1">{search || filterStatus !== 'all' ? 'No matching projects' : 'No projects yet'}</div>
                <p className="text-[11px] text-muted-foreground mb-5">
                  {search || filterStatus !== 'all' ? 'Try a different search or status filter.' : 'Create your first project to start tracking delivery.'}
                </p>
                {!search && filterStatus === 'all' && (
                  <ActionButton variant="primary" icon={Plus} onClick={() => setShowNew(true)}>Create First Project</ActionButton>
                )}
              </div>
            ) : portfolioView === 'cards' ? (
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {filtered.map((p: any, idx: number) => {
                  const m = statusMeta(p.status);
                  const client = clientDisplay(p);
                  const category = categoryById(p.projectCategory);
                  const CategoryIcon = category.icon;
                  const health = healthTone(p.healthScore);
                  const overBudget = p.used >= 100;
                  const nearLimit = p.used >= 80 && p.used < 100;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.025 }}
                      onClick={() => openProject(p.id)}
                      className="ap-project-card group cursor-pointer overflow-hidden"
                    >
                      <div className="h-[3px]" style={{ backgroundColor: m.color }} />
                      <div className="p-3.5 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {p.project_code && (
                                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground font-mono-tab bg-secondary px-2 py-0.5">
                                  {p.project_code}
                                </span>
                              )}
                              <span className="text-[8px] uppercase tracking-[0.18em] font-black px-2 py-0.5 border" style={{ color: m.color, borderColor: `${m.color}55`, backgroundColor: `${m.color}12` }}>
                                {m.label}
                              </span>
                              <span className="text-[8px] uppercase tracking-[0.16em] font-black px-2 py-0.5 border border-border bg-secondary/45 text-foreground/70 inline-flex items-center gap-1">
                                <CategoryIcon className="w-2.5 h-2.5" style={{ color: category.color }} />
                                {category.short}
                              </span>
                            </div>
                            <div className="text-[15px] font-bold leading-tight truncate group-hover:text-accent transition-colors">{p.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate mt-1">
                              {[client, p.city, p.state].filter(Boolean).join(' · ') || p.type}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[8px] uppercase tracking-[0.18em] font-black text-muted-foreground">Health</div>
                            <div className="text-[22px] font-mono-tab font-black leading-none mt-1" style={{ color: health.color }}>
                              {Math.round(p.healthScore)}
                            </div>
                            <div className="text-[9px] font-semibold" style={{ color: health.color }}>{health.label}</div>
                          </div>
                        </div>

                        <div className="mt-3 border border-border bg-secondary/20 p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] uppercase tracking-[0.18em] font-black text-muted-foreground">Delivery Progress</span>
                            <span className="text-[10px] font-mono-tab font-bold" style={{ color: m.color }}>{p.progress_pct}%</span>
                          </div>
                          <div className="h-1.5 bg-background border border-border overflow-hidden">
                            <div className="h-full" style={{ width: `${Math.min(p.progress_pct || 0, 100)}%`, backgroundColor: m.color }} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                              ['Budget Used', `${Math.min(p.used, 150).toFixed(0)}%`, overBudget ? '#ef4444' : nearLimit ? '#f59e0b' : category.color],
                              ['Collections', `${Math.min(p.collectionPct, 150).toFixed(0)}%`, '#10b981'],
                              ['Open Checks', fmtUSD(p.outstanding), p.outstanding > 0 ? '#f59e0b' : 'hsl(var(--muted-foreground))'],
                            ].map(([label, value, color]) => (
                              <div key={label as string} className="min-w-0">
                                <div className="text-[7px] uppercase tracking-[0.13em] font-black text-muted-foreground truncate">{label}</div>
                                <div className="text-[10px] font-mono-tab font-bold truncate" style={{ color: color as string }}>{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
                          {[
                            ['Budget', fmtUSD(p.budget), ''],
                            ['Deployed', fmtUSD(p.spent), ''],
                            ['Revenue', fmtUSD(p.incoming), 'text-positive'],
                            ['Net', fmtUSD(p.net), p.net >= 0 ? 'text-positive' : 'text-accent'],
                          ].map(([label, value, cls]) => (
                            <div key={label} className="bg-background px-2 py-2 min-w-0">
                              <div className="text-[7px] uppercase tracking-[0.14em] font-black text-muted-foreground">{label}</div>
                              <div className={`text-[11px] font-mono-tab font-bold truncate ${cls}`}>{value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5 min-w-0">
                            {overBudget && <span className="text-[8px] uppercase tracking-[0.15em] font-black px-2 py-1 bg-destructive/10 text-destructive">Over Budget</span>}
                            {nearLimit && <span className="text-[8px] uppercase tracking-[0.15em] font-black px-2 py-1 bg-warning/10 text-warning">Near Limit</span>}
                            {p.finance_project_id && <span className="text-[8px] uppercase tracking-[0.15em] font-black px-2 py-1 bg-accent/10 text-accent">Finance Linked</span>}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-black text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                            Manage <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden xl:block overflow-hidden">
                  <table className="w-full table-fixed text-[12px]">
                    <colgroup>
                      <col className="w-[24%]" />
                      <col className="w-[14%]" />
                      <col className="w-[10%]" />
                      <col className="w-[8%]" />
                      <col className="w-[11%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead className="bg-secondary/45">
                      <tr className="border-b border-border">
                        {['Project', 'Client', 'Category', 'Status', 'Progress', 'Budget', 'Deployed', 'Revenue', 'Net'].map((h, i) => (
                          <th key={h + i} className={`px-4 py-3.5 text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-black whitespace-nowrap ${['Budget', 'Deployed', 'Revenue', 'Net'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => {
                        const m = statusMeta(p.status);
                        const client = clientDisplay(p);
                        const category = categoryById(p.projectCategory);
                        const CategoryIcon = category.icon;
                        return (
                          <tr key={p.id} onClick={() => openProject(p.id)}
                            className="border-b border-border last:border-b-0 pdv2-row-hover transition-colors cursor-pointer">
                            <td className="px-4 py-3.5 min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${m.color}14` }}>
                                  <Building2 className="w-3.5 h-3.5" style={{ color: m.color }} strokeWidth={1.6} />
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[12.5px] font-bold text-foreground truncate max-w-[260px]">{p.title}</div>
                                  <div className="text-[9.5px] text-muted-foreground font-mono">{p.project_code || p.type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 min-w-0">
                              {client ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                                  {p.portal_client_id
                                    ? <UserCheck className="w-3 h-3 text-positive shrink-0" strokeWidth={2} />
                                    : <Users className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={2} />}
                                  <span className="truncate max-w-[150px]">{client}</span>
                                </div>
                              ) : <span className="text-[11px] text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/70 whitespace-nowrap">
                                <CategoryIcon className="w-3 h-3" style={{ color: category.color }} />
                                {category.short}
                              </span>
                            </td>
                            <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-3.5 min-w-[130px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-secondary/70 overflow-hidden min-w-[56px]">
                                  <div className="h-full rounded-full" style={{ width: `${p.progress_pct}%`, backgroundColor: m.color, transition: 'width .5s ease' }} />
                                </div>
                                <span className="text-[10px] font-bold font-mono-tab w-8 text-right" style={{ color: m.color }}>{p.progress_pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono-tab font-semibold whitespace-nowrap truncate">{fmtUSD(p.budget)}</td>
                            <td className="px-4 py-3.5 text-right font-mono-tab font-semibold whitespace-nowrap truncate">{fmtUSD(p.spent)}</td>
                            <td className="px-4 py-3.5 text-right font-mono-tab font-semibold text-positive whitespace-nowrap truncate">{fmtUSD(p.incoming)}</td>
                            <td className={`px-4 py-3.5 text-right font-mono-tab font-bold whitespace-nowrap truncate ${p.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(p.net)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="xl:hidden divide-y divide-border">
                  {filtered.map(p => {
                    const m = statusMeta(p.status);
                    const client = clientDisplay(p);
                    const category = categoryById(p.projectCategory);
                    return (
                      <button key={p.id} onClick={() => openProject(p.id)} className="w-full text-left px-4 py-4 pdv2-row-hover transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-foreground truncate">{p.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {client || p.type}{p.project_code ? ` · ${p.project_code}` : ''}
                            </div>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary/70 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.progress_pct}%`, backgroundColor: m.color }} />
                          </div>
                          <span className="text-[10px] font-bold font-mono-tab" style={{ color: m.color }}>{p.progress_pct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono-tab font-semibold text-foreground">{fmtUSD(p.budget)}</span>
                          <span>{category.short}</span>
                          {p.estimated_completion && (
                            <span className="flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" strokeWidth={1.7} />{fmtDate(p.estimated_completion)}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-px bg-border border border-border mt-3">
                          {[
                            ['Deployed', fmtUSD(p.spent), ''],
                            ['Revenue', fmtUSD(p.incoming), 'text-positive'],
                            ['Net', fmtUSD(p.net), p.net >= 0 ? 'text-positive' : 'text-accent'],
                          ].map(([label, value, cls]) => (
                            <div key={label} className="bg-background px-2 py-1.5 min-w-0">
                              <div className="text-[7px] uppercase tracking-[0.15em] font-bold text-muted-foreground">{label}</div>
                              <div className={`text-[10px] font-bold font-mono-tab truncate ${cls}`}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-border px-5 py-2.5 flex items-center justify-between bg-secondary/20">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-[0.16em]">
                    {projects.length} total project{projects.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: AC }}>{activeCount} active</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ═══ PROJECT DETAIL — full-width command view ═══ */
        <div className="space-y-5">
            {/* ── Command header ── */}
            <div className="pdv2-card overflow-hidden">
              <div className="h-[3px]" style={{ backgroundColor: selMeta!.color }} />
              <div className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => setSelectedId(null)}
                      className="mt-0.5 w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
                      title="Back to portfolio">
                      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="text-[17px] sm:text-[20px] font-bold leading-tight text-foreground">{selectedProject.title}</h1>
                        <StatusBadge status={selectedProject.status} />
                        {selectedProject.project_code && (
                          <span className="text-[9px] text-muted-foreground font-mono px-1.5 py-0.5 rounded border border-border">{selectedProject.project_code}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" strokeWidth={1.6} />{selectedProject.type}</span>
                        {(selectedProject.address || selectedProject.city) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" strokeWidth={1.6} />
                            {[selectedProject.address, selectedProject.city, selectedProject.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {clientDisplay(selectedProject) && (
                          <span className="flex items-center gap-1">
                            {selectedProject.portal_client_id
                              ? <UserCheck className="w-3 h-3 text-positive" strokeWidth={1.6} />
                              : <Users className="w-3 h-3" strokeWidth={1.6} />}
                            {clientDisplay(selectedProject)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pl-11 lg:pl-2">
                    {selectedProject.finance_project_id && (
                      <ActionButton variant="neutral" icon={ExternalLink}
                        className="!border-accent/30 !text-accent"
                        onClick={() => navigate(`/projects/${selectedProject.finance_project_id}`)}>
                        Finance View
                      </ActionButton>
                    )}
                    <ActionButton variant="neutral" icon={selectedProject.portal_client_id ? UserCheck : Link2}
                      className={selectedProject.portal_client_id ? '!border-positive/30 !text-positive' : '!border-accent/30 !text-accent'}
                      onClick={() => setShowInvite(true)}>
                      {selectedProject.portal_client_id ? 'Portal Linked' : 'Invite Client'}
                    </ActionButton>
                    <ActionButton variant={editMode ? 'primary' : 'neutral'} icon={Edit3}
                      onClick={() => { if (editMode) { setEditMode(false); setEditForm(null); } else { setEditMode(true); openEdit(); setDetailTab('overview'); } }}>
                      {editMode ? 'Cancel Edit' : 'Edit'}
                    </ActionButton>
                    <ActionButton variant="negative" icon={Trash2} onClick={() => deleteProject(selectedProject.id)}>Delete</ActionButton>
                  </div>
                </div>

                {/* Progress gauge + schedule strip */}
                <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
                  <ProgressRing pct={selectedProject.progress_pct} size={76} label="complete" color={selMeta!.color} />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[8px] uppercase tracking-[0.24em] font-black text-muted-foreground">Progress</span>
                        <span className="text-[10px] font-bold font-mono-tab" style={{ color: selMeta!.color }}>{selectedProject.progress_pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/70 overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: selMeta!.color }}
                          initial={{ width: 0 }} animate={{ width: `${selectedProject.progress_pct}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                    {schedule && (
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[8px] uppercase tracking-[0.24em] font-black text-muted-foreground">Schedule</span>
                          <span className={`text-[10px] font-bold font-mono-tab ${schedule.daysLeft < 0 ? 'text-destructive' : schedule.daysLeft <= 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {schedule.daysLeft < 0 ? `${Math.abs(schedule.daysLeft)} days overdue` : `${schedule.daysLeft} days remaining`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary/70 overflow-hidden">
                          <div className="h-full rounded-full bg-foreground/30" style={{ width: `${schedule.pct}%`, transition: 'width .5s ease' }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                          <span>{fmtDate(selectedProject.start_date)}</span>
                          <span className="font-semibold">Day {schedule.elapsedDays} of {schedule.totalDays}</span>
                          <span>{fmtDate(selectedProject.estimated_completion)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section tabs ── */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
              {(['overview', 'milestones', 'updates', 'settings'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`text-[9px] uppercase tracking-[0.22em] font-bold px-3 md:px-4 py-2 rounded-lg transition-all shrink-0 border ${
                    detailTab === t ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent'
                  }`}>
                  {t === 'milestones' ? `Milestones${milestones.length ? ` (${milestones.length})` : ''}`
                    : t === 'updates' ? `Updates${updates.length ? ` (${updates.length})` : ''}`
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

                {/* OVERVIEW */}
                {detailTab === 'overview' && (
                  editMode && editForm ? (
                    <div className="pdv2-card overflow-hidden">
                      <div className="pdv2-card-header flex items-center gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                        <span className="text-[11px] font-bold uppercase tracking-wide">Edit Project</span>
                      </div>
                      <div className="p-5 space-y-4">
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
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* KPI rail */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <StatCard label="Budget" value={fmtUSD(selectedProjectMetrics?.budget ?? selectedProject.budget ?? selectedProject.contract_amount)}
                          sub={selectedFinanceProject ? 'Synced finance project' : 'Admin project'}
                          icon={DollarSign} trendColor={AC} />
                        <StatCard label="Deployed" value={fmtUSD(selectedProjectMetrics?.spent ?? 0)}
                          sub={`${(selectedProjectMetrics?.used ?? 0).toFixed(1)}% used`} icon={Wallet} trendColor="#ef4444" />
                        <StatCard label="Revenue" value={fmtUSD(selectedProjectMetrics?.incoming ?? 0)}
                          sub={`Net ${fmtUSD(selectedProjectMetrics?.net ?? 0)}`} icon={Receipt} trendColor="#0f766e" />
                        <StatCard label="Progress" value={`${selectedProject.progress_pct}%`}
                          sub={selMeta!.label} icon={TrendingUp} trendColor={selMeta!.color} />
                        <StatCard label="Days Remaining"
                          value={schedule ? (schedule.daysLeft < 0 ? `${Math.abs(schedule.daysLeft)} over` : String(schedule.daysLeft)) : '—'}
                          sub={selectedProject.estimated_completion ? `Est. ${fmtDate(selectedProject.estimated_completion)}` : 'No target date'}
                          subColor={schedule && schedule.daysLeft < 0 ? 'text-destructive font-semibold' : schedule && schedule.daysLeft <= 30 ? 'text-warning font-semibold' : undefined}
                          icon={Clock} trendColor={schedule && schedule.daysLeft < 0 ? '#ef4444' : schedule && schedule.daysLeft <= 30 ? '#f59e0b' : '#3b82f6'} />
                        <StatCard label="Health" value={String(Math.round(selectedProjectMetrics?.healthScore ?? 0))}
                          sub={`${fmtUSD(selectedProjectMetrics?.outstanding ?? 0)} open checks`}
                          icon={ShieldCheck} trendColor={healthTone(selectedProjectMetrics?.healthScore ?? 0).color} />
                      </div>

                      {/* Milestone timeline + project details */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                        <div className="pdv2-card overflow-hidden xl:col-span-2">
                          <div className="pdv2-card-header flex items-center justify-between">
                            <div className="text-[11px] font-bold uppercase tracking-wide">Milestone Timeline</div>
                            <button onClick={() => setDetailTab('milestones')} className="pdv2-link">Manage →</button>
                          </div>
                          <div className="p-4">
                            <MilestoneTimeline milestones={timelineMs} />
                          </div>
                        </div>

                        <div className="pdv2-card overflow-hidden">
                          <div className="pdv2-card-header flex items-center justify-between">
                            <div className="text-[11px] font-bold uppercase tracking-wide">Project Details</div>
                            <button onClick={() => { setEditMode(true); openEdit(); }} className="pdv2-link">Edit →</button>
                          </div>
                          <div className="divide-y divide-border">
                            {([
                              ['Client', clientDisplay(selectedProject) ?? '—', selectedProject.portal_client_id ? 'Linked portal account' : selectedProject.client_email ?? undefined],
                              ['Location', [selectedProject.address, selectedProject.city, selectedProject.state].filter(Boolean).join(', ') || '—', selectedProject.zip_code ?? undefined],
                              ['Project Manager', selectedProject.project_manager ?? '—', undefined],
                              ['Superintendent', selectedProject.superintendent ?? '—', undefined],
                              ['Architect', selectedProject.architect ?? '—', undefined],
                              ['Timeline', `${fmtDate(selectedProject.start_date)} → ${fmtDate(selectedProject.estimated_completion)}`, selectedProject.actual_completion ? `Completed ${fmtDate(selectedProject.actual_completion)}` : undefined],
                            ] as [string, string, string | undefined][]).map(([label, value, sub]) => (
                              <div key={label} className="flex items-start px-4 py-2.5 gap-3">
                                <div className="w-24 shrink-0 text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground pt-0.5">{label}</div>
                                <div className="min-w-0">
                                  <div className="text-[12px] font-medium text-foreground">{value}</div>
                                  {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Latest updates + quick actions */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="pdv2-card overflow-hidden">
                          <div className="pdv2-card-header flex items-center justify-between">
                            <div className="text-[11px] font-bold uppercase tracking-wide">Latest Updates</div>
                            <button onClick={() => setDetailTab('updates')} className="pdv2-link">View all →</button>
                          </div>
                          {updates.length === 0 ? (
                            <div className="px-5 py-10 text-center text-[12px] text-muted-foreground">No updates posted yet.</div>
                          ) : (
                            <div className="divide-y divide-border">
                              {updates.slice(0, 4).map(u => {
                                const ut = UPDATE_TYPES.find(t => t.value === u.update_type) ?? UPDATE_TYPES[0];
                                return (
                                  <div key={u.id} className="px-5 py-3.5 flex items-start gap-3">
                                    <span className="pdv2-icon-chip shrink-0 mt-0.5" style={{ backgroundColor: `${ut.color}14` }}>
                                      <MessageSquare className="w-3 h-3" style={{ color: ut.color }} strokeWidth={1.7} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-semibold text-foreground truncate">{u.title}</span>
                                        {u.pinned && <Pin className="w-2.5 h-2.5 shrink-0" style={{ color: AC }} />}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{u.body}</div>
                                      <div className="text-[9px] text-muted-foreground mt-1">
                                        {u.created_by} · {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {u.is_client_visible ? 'Client visible' : 'Internal'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="pdv2-card overflow-hidden">
                          <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Quick Actions</div></div>
                          <div className="p-3 space-y-1.5">
                            {[
                              { label: 'Post Client Update', icon: MessageSquare, onClick: () => { setDetailTab('updates'); setShowUpdateForm(true); } },
                              { label: 'Add Milestone', icon: Target, onClick: () => { setDetailTab('milestones'); setShowMilestoneForm(true); } },
                              ...(selectedProject.finance_project_id ? [{ label: 'Open Finance Detail', icon: ExternalLink, onClick: () => navigate(`/projects/${selectedProject.finance_project_id}`) }] : []),
                              { label: selectedProject.portal_client_id ? 'Manage Portal Link' : 'Invite Client to Portal', icon: Link2, onClick: () => setShowInvite(true) },
                              { label: 'Edit Project Details', icon: Edit3, onClick: () => { setEditMode(true); openEdit(); } },
                            ].map(a => (
                              <button key={a.label} onClick={a.onClick}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border rounded-md group">
                                <a.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <span className="flex-1 text-left">{a.label}</span>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Description / internal notes / custom fields */}
                      {(selectedProject.description || selectedProject.internal_notes || (selectedProject.custom_fields && Object.keys(selectedProject.custom_fields).length > 0)) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {selectedProject.description && (
                            <div className="pdv2-card overflow-hidden">
                              <div className="pdv2-card-header flex items-center gap-1.5">
                                <Eye className="w-3 h-3 text-positive" strokeWidth={2} />
                                <div className="text-[11px] font-bold uppercase tracking-wide">Description — Client Visible</div>
                              </div>
                              <p className="p-4 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{selectedProject.description}</p>
                            </div>
                          )}
                          {selectedProject.internal_notes && (
                            <div className="pdv2-card overflow-hidden !border-warning/30">
                              <div className="pdv2-card-header flex items-center gap-1.5 bg-warning/5">
                                <EyeOff className="w-3 h-3 text-warning" strokeWidth={2} />
                                <div className="text-[11px] font-bold uppercase tracking-wide text-warning">Internal Notes — Admin Only</div>
                              </div>
                              <p className="p-4 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{selectedProject.internal_notes}</p>
                            </div>
                          )}
                          {selectedProject.custom_fields && Object.keys(selectedProject.custom_fields).length > 0 && (
                            <div className="pdv2-card overflow-hidden">
                              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Custom Fields</div></div>
                              <div className="divide-y divide-border">
                                {Object.entries(selectedProject.custom_fields).map(([k, v]) => (
                                  <div key={k} className="flex items-center px-4 py-2.5 gap-3">
                                    <div className="w-28 shrink-0 text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">{k}</div>
                                    <div className="text-[12px] font-medium text-foreground">{v}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* MILESTONES */}
                {detailTab === 'milestones' && (
                  <div className="space-y-5">
                    {milestones.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        <StatCard label="Total Milestones" value={String(milestones.length)} icon={Target} trendColor={AC} />
                        <StatCard label="Complete" value={String(msDone)} icon={CheckCircle2} trendColor="#10b981" />
                        <StatCard label="Remaining" value={String(milestones.length - msDone)} icon={Clock} trendColor="#f59e0b" />
                      </div>
                    )}

                    <div className="pdv2-card overflow-hidden">
                      <div className="pdv2-card-header flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wide">Delivery Milestones</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{msDone} of {milestones.length} complete — client-visible milestones appear in the portal</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {milestones.length > 0 && (
                            <ActionButton variant="neutral" icon={RefreshCw} onClick={syncProgress}>
                              Sync Progress to {Math.round((msDone / milestones.length) * 100)}%
                            </ActionButton>
                          )}
                          <ActionButton variant="primary" icon={Plus} onClick={() => setShowMilestoneForm(true)}>Add Milestone</ActionButton>
                        </div>
                      </div>

                      {milestones.length > 0 && (
                        <div className="p-4 border-b border-border">
                          <MilestoneTimeline milestones={timelineMs} />
                        </div>
                      )}

                      <AnimatePresence>
                        {showMilestoneForm && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="px-5 py-4 bg-accent/5 border-b border-border space-y-3">
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

                      {milestones.length === 0 && !showMilestoneForm ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                          <Target className="w-9 h-9 text-muted-foreground/35 mb-3" strokeWidth={1} />
                          <p className="text-[12px] text-muted-foreground">No milestones yet — add the first one to build the delivery timeline.</p>
                        </div>
                      ) : (
                      <div className="divide-y divide-border">
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
                                    className="p-1.5 rounded-md transition-colors" style={{ color: active ? AC : 'hsl(var(--muted-foreground))' }}>
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
                  </div>
                )}

                {/* UPDATES */}
                {detailTab === 'updates' && (
                  <div className="pdv2-card overflow-hidden">
                    <div className="pdv2-card-header flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide">Project Updates</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Client-visible updates appear in the portal in real-time.</div>
                      </div>
                      <ActionButton variant="primary" icon={Plus} onClick={() => setShowUpdateForm(true)}>Post Update</ActionButton>
                    </div>
                    <AnimatePresence>
                      {showUpdateForm && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="px-5 py-4 bg-accent/5 border-b border-border space-y-3">
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
                    {updates.length === 0 && !showUpdateForm ? (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <MessageSquare className="w-9 h-9 text-muted-foreground/35 mb-3" strokeWidth={1} />
                        <p className="text-[12px] text-muted-foreground">No updates yet — post the first update to keep the client informed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {updates.map(u => {
                          const ut = UPDATE_TYPES.find(t => t.value === u.update_type) ?? UPDATE_TYPES[0];
                          return (
                            <div key={u.id} className="px-5 py-4 relative" style={{ backgroundColor: u.pinned ? AC + '06' : undefined }}>
                              {u.pinned && <Pin className="w-3 h-3 absolute top-4 right-5" style={{ color: AC }} />}
                              <div className="flex items-start gap-3">
                                <span className="pdv2-icon-chip shrink-0 mt-0.5" style={{ backgroundColor: `${ut.color}14` }}>
                                  <MessageSquare className="w-3 h-3" style={{ color: ut.color }} strokeWidth={1.7} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1 pr-6">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: ut.color + '14', color: ut.color }}>{ut.label}</span>
                                    <span className="text-[12.5px] font-semibold text-foreground">{u.title}</span>
                                  </div>
                                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-2.5 whitespace-pre-wrap">{u.body}</p>
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[9px] text-muted-foreground">{u.created_by} · {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      <span className={`text-[9px] flex items-center gap-1 font-semibold ${u.is_client_visible ? 'text-positive' : 'text-muted-foreground'}`}>
                                        {u.is_client_visible ? <><Eye className="w-2.5 h-2.5" />Client visible</> : <><EyeOff className="w-2.5 h-2.5" />Internal only</>}
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      <button onClick={() => toggleUpdateVisibility(u)} title={u.is_client_visible ? 'Make internal' : 'Make visible'}
                                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                        {u.is_client_visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                      </button>
                                      <button onClick={() => deleteUpdate(u.id)} title="Delete update"
                                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <div className="pdv2-card overflow-hidden">
                      <div className="pdv2-card-header flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-accent" strokeWidth={2} />
                        <div className="text-[11px] font-bold uppercase tracking-wide">Portal Client Access</div>
                      </div>
                      <div className="p-5 space-y-4">
                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                          {selectedProject.portal_client_id
                            ? 'Linked to a portal client — they see client-visible milestones and updates in real-time.'
                            : 'Not linked. Invite the client to register a portal account and follow progress in real-time.'}
                        </p>
                        {selectedProject.portal_client_id && (
                          <div className="flex items-center gap-2 p-3 rounded-lg border border-positive/30 bg-positive/5">
                            <UserCheck className="w-3.5 h-3.5 text-positive shrink-0" strokeWidth={2} />
                            <span className="text-[12px] text-positive font-medium">
                              {portalClients.find(c => c.id === selectedProject.portal_client_id)?.name ?? 'Client'} — linked
                            </span>
                          </div>
                        )}
                        <ActionButton variant="neutral" className="!border-accent/30 !text-accent"
                          icon={selectedProject.portal_client_id ? RefreshCw : Send}
                          onClick={() => setShowInvite(true)}>
                          {selectedProject.portal_client_id ? 'Send New Invite' : 'Invite Client to Portal'}
                        </ActionButton>
                      </div>
                    </div>

                    <div className="pdv2-card overflow-hidden !border-destructive/30">
                      <div className="pdv2-card-header flex items-center gap-1.5 bg-destructive/5">
                        <AlertTriangle className="w-3 h-3 text-destructive" strokeWidth={2} />
                        <div className="text-[11px] font-bold uppercase tracking-wide text-destructive">Danger Zone</div>
                      </div>
                      <div className="p-5 space-y-4">
                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                          Deleting this project permanently removes all milestones, updates, and invite history.
                        </p>
                        <ActionButton variant="negative" icon={Trash2} onClick={() => deleteProject(selectedProject.id)}>
                          Delete Project
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                )}
        </div>
      )}

      {/* ═══ WIZARD MODAL ═══ */}
      <AnimatePresence>
        {showNew && (
          <NewProjectWizard
            onClose={() => setShowNew(false)}
            onCreated={p => {
              setProjects(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev]);
              setSelectedId(p.id);
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
                        <input readOnly value={inviteUrl} className="flex-1 h-10 px-3 text-[11px] font-mono rounded-lg border border-border bg-secondary/30 focus:outline-none overflow-hidden text-ellipsis" />
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
