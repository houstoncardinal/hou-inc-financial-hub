import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import {
  X, ChevronLeft, ChevronRight, Plus, Wand2, Loader2,
  AlertTriangle, MapPin, UserCheck,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/* ── Tokens ─────────────────────────────────────────────────────── */
const AC    = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";

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

const WIZARD_STEPS = [
  { key: 'basics',     label: 'Basics',     optional: false, question: 'What are we building?'      },
  { key: 'location',   label: 'Location',   optional: true,  question: 'Where is it located?'       },
  { key: 'client',     label: 'Client',     optional: true,  question: 'Who is the client?'         },
  { key: 'timeline',   label: 'Timeline',   optional: true,  question: 'When does it happen?'       },
  { key: 'financials', label: 'Financials', optional: false, question: "What's the contract value?" },
  { key: 'team',       label: 'Team',       optional: true,  question: "Who's on the project?"      },
  { key: 'details',    label: 'Details',    optional: true,  question: 'Anything else to add?'      },
  { key: 'review',     label: 'Review',     optional: false, question: 'Ready to create?'            },
] as const;
type WizardKey = typeof WIZARD_STEPS[number]['key'];

const BLANK: Record<string, string> = {
  title: '', project_code: '', type: 'Custom Estate', status: 'active',
  address: '', city: '', state: 'TX', zipcode: '',
  client_name: '', client_email: '',
  start_date: '', estimated_completion: '',
  contract_amount: '', budget: '',
  project_manager: '', superintendent: '', architect: '',
  description: '', internal_notes: '',
};

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function autoCode(title: string, count: number) {
  const words = title.trim().split(/\s+/).filter(w => w.length > 1);
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return initials ? `${initials}-${String(count + 1).padStart(3, '0')}` : '';
}

/* ── Micro components ───────────────────────────────────────────── */
function MicroLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{children}</div>;
}

function PillPicker({ options, value, onChange }: {
  options: { value: string; label: string; color?: string }[];
  value: string; onChange: (v: string) => void;
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

/* ── Address autocomplete (Texas-biased Nominatim) ──────────────── */
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
}: {
  address: string; city: string; state: string; zipcode: string;
  onAddressChange: (v: string) => void; onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;   onZipcodeChange: (v: string) => void;
}) {
  const [results,  setResults]  = useState<NominatimResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 4) { setResults([]); setOpen(false); return; }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8` +
        `&countrycodes=us&viewbox=-107.0,36.5,-93.5,25.5&bounded=0` +
        `&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en-US' },
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
    onAddressChange(street || r.display_name.split(',')[0]);
    onCityChange(a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? '');
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
   FINANCE PROJECT WIZARD
════════════════════════════════════════════════════════════════════ */
interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after successful creation with the new admin_projects row */
  onCreated?: (row: any) => void;
  /** Existing project count for auto-code generation */
  existingCount?: number;
}

export default function FinanceProjectWizard({ open, onClose, onCreated, existingCount = 0 }: Props) {
  const qc = useQueryClient();
  const { entity } = useEntity();
  const entityId = entity?.id ?? 'houston-enterprise';

  const [step,         setStep]         = useState(0);
  const [dir,          setDir]          = useState<1 | -1>(1);
  const [form,         setForm]         = useState({ ...BLANK });
  const [codeManual,   setCodeManual]   = useState(false);
  const [customFields, setCustomFields] = useState<{ id: number; key: string; value: string }[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  /* Reset wizard when opened */
  useEffect(() => {
    if (open) {
      setStep(0); setDir(1); setForm({ ...BLANK });
      setCodeManual(false); setCustomFields([]); setError('');
    }
  }, [open]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  /* Auto-generate code from title */
  useEffect(() => {
    if (!codeManual && form.title) {
      set('project_code', autoCode(form.title, existingCount));
    } else if (!codeManual && !form.title) {
      set('project_code', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, codeManual, existingCount]);

  const handleContractChange = (v: string) => {
    set('contract_amount', v);
    if (!form.budget) set('budget', v);
  };

  const addCustomField    = () => setCustomFields(p => [...p, { id: Date.now(), key: '', value: '' }]);
  const removeCustomField = (id: number) => setCustomFields(p => p.filter(f => f.id !== id));
  const updateCustomField = (id: number, k: 'key' | 'value', v: string) =>
    setCustomFields(p => p.map(f => f.id === id ? { ...f, [k]: v } : f));

  const goNext = () => {
    setError('');
    if (step === 0 && !form.title.trim()) { setError('Project name is required.'); return; }
    if (step === 4 && !form.budget && !form.contract_amount) {
      // financials step — warn but allow skip since step is required
    }
    setDir(1); setStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const goBack = () => { setError(''); setDir(-1); setStep(s => Math.max(s - 1, 0)); };
  const goTo   = (i: number) => { if (i < step) { setDir(-1); setStep(i); } };

  /* ── Create ─────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.title.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setError('Not authenticated.'); return; }

    const customFieldsObj = customFields.reduce<Record<string, string>>((acc, { key, value }) =>
      key.trim() ? { ...acc, [key.trim()]: value.trim() } : acc, {});

    const payload = {
      admin_user_id: user.id,
      entity: entityId,
      title: form.title.trim(),
      project_code: form.project_code.trim() || null,
      type: form.type,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || 'TX',
      zip_code: form.zipcode.trim() || null,
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

    const { data, error: dbErr } = await supabase
      .from('admin_projects').insert(payload).select().single();

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      toast.error('Failed to create project', { description: dbErr.message });
      return;
    }

    // Sync trigger already wrote to the finance `projects` table — just refresh cache
    await qc.invalidateQueries({ queryKey: ['projects'] });

    toast.success(`${data.title} created`, { description: 'Synced to finance portfolio' });
    onCreated?.(data);
    onClose();
  };

  if (!open) return null;

  const currentStep = WIZARD_STEPS[step];
  const isFirst     = step === 0;
  const isReview    = step === WIZARD_STEPS.length - 1;
  const isOptional  = currentStep.optional;
  const statusOpts  = PROJECT_STATUSES.map(s => ({ value: s.value, label: s.label, color: s.color }));
  const typeOpts    = PROJECT_TYPES.map(t => ({ value: t, label: t }));

  const optionalFilled = [
    form.address.trim() || form.city.trim(),
    form.client_name.trim() || form.client_email.trim(),
    form.start_date || form.estimated_completion,
    form.contract_amount || form.budget,
    form.project_manager.trim() || form.superintendent.trim() || form.architect.trim(),
    form.description.trim() || form.internal_notes.trim() || customFields.some(f => f.key.trim()),
  ].filter(Boolean).length;

  /* ── Step content ──────────────────────────────────────────── */
  function renderStep(): React.ReactNode {
    switch (currentStep.key as WizardKey) {

      case 'basics': return (
        <div className="space-y-5">
          <div>
            <MicroLabel>Project Name *</MicroLabel>
            <input autoFocus value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goNext()}
              placeholder="e.g. Johnson Custom Estate"
              className="w-full h-12 px-4 text-[15px] border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"
            />
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
                    <input value={form.project_code}
                      onChange={e => set('project_code', e.target.value)}
                      placeholder="PRJ-001"
                      className="h-8 px-3 text-[12px] font-mono border border-border bg-background focus:outline-none focus:border-foreground/40 w-36 transition-colors"
                    />
                    <button onClick={() => setCodeManual(false)}
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
            <PillPicker options={typeOpts} value={form.type} onChange={v => set('type', v)} />
          </div>
          <div>
            <MicroLabel>Status</MicroLabel>
            <PillPicker options={statusOpts} value={form.status} onChange={v => set('status', v)} />
            {form.status === 'planning' && (
              <p className="mt-1.5 text-[9px] text-muted-foreground">
                "Planning" maps to <strong>Active</strong> in the finance portfolio view.
              </p>
            )}
          </div>
        </div>
      );

      case 'location': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Street Address</MicroLabel>
            <AddressAutocomplete
              address={form.address} city={form.city} state={form.state} zipcode={form.zipcode}
              onAddressChange={v => set('address', v)} onCityChange={v => set('city', v)}
              onStateChange={v => set('state', v)}     onZipcodeChange={v => set('zipcode', v)}
            />
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Type an address — suggestions auto-fill city, state, and ZIP.
            </p>
          </div>
          <div className="grid grid-cols-6 gap-2.5">
            <div className="col-span-3">
              <MicroLabel>City</MicroLabel>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City"
                className="w-full h-10 px-3 text-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
            <div className="col-span-1">
              <MicroLabel>State</MicroLabel>
              <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="TX" maxLength={2}
                className="w-full h-10 px-3 text-[13px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
            <div className="col-span-2">
              <MicroLabel>ZIP Code</MicroLabel>
              <input value={form.zipcode}
                onChange={e => set('zipcode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="00000" maxLength={5}
                className="w-full h-10 px-3 text-[13px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
          </div>
        </div>
      );

      case 'client': return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <MicroLabel>Client Name</MicroLabel>
              <input autoFocus value={form.client_name} onChange={e => set('client_name', e.target.value)}
                placeholder="Full name"
                className="w-full h-11 px-3 text-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
            <div>
              <MicroLabel>Client Email</MicroLabel>
              <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)}
                placeholder="email@domain.com"
                className="w-full h-11 px-3 text-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
          </div>
          <div className="p-3 border border-border bg-secondary/20">
            <div className="flex items-start gap-2">
              <UserCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: AC }} />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                You can invite this client to the project portal from the Admin dashboard after the project is created.
              </p>
            </div>
          </div>
        </div>
      );

      case 'timeline': return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <MicroLabel>Start Date</MicroLabel>
              <input autoFocus type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full h-11 px-3 text-[13px] border border-border bg-background text-foreground focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
            <div>
              <MicroLabel>Estimated Completion</MicroLabel>
              <input type="date" value={form.estimated_completion} onChange={e => set('estimated_completion', e.target.value)}
                className="w-full h-11 px-3 text-[13px] border border-border bg-background text-foreground focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
          </div>
          {form.start_date && form.estimated_completion && (() => {
            const start = new Date(form.start_date);
            const end   = new Date(form.estimated_completion);
            const days  = Math.round((end.getTime() - start.getTime()) / 86400000);
            const months = Math.round(days / 30);
            if (days <= 0) return null;
            return (
              <div className="p-3 border border-border bg-secondary/30">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{days} days</span>
                  {months > 0 && <span className="ml-1">({months} month{months !== 1 ? 's' : ''})</span>}
                  {' '}project duration
                </p>
              </div>
            );
          })()}
        </div>
      );

      case 'financials': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Contract Amount</MicroLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground select-none text-sm">$</span>
              <input autoFocus type="number" step="1000" value={form.contract_amount}
                onChange={e => handleContractChange(e.target.value)}
                placeholder="0"
                className="w-full h-12 pl-7 pr-4 text-[15px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">The total contract value — appears in the finance portfolio.</p>
          </div>
          <div>
            <MicroLabel>Budget <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">(auto-fills from contract)</span></MicroLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground select-none text-sm">$</span>
              <input type="number" step="1000" value={form.budget}
                onChange={e => set('budget', e.target.value)}
                placeholder="0"
                className="w-full h-12 pl-7 pr-4 text-[15px] font-mono border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
          </div>
          {form.contract_amount && form.budget &&
           parseFloat(form.budget) < parseFloat(form.contract_amount) && (
            <div className="flex items-center gap-2 p-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                Budget is below contract value — confirm this is intentional.
              </p>
            </div>
          )}
        </div>
      );

      case 'team': return (
        <div className="space-y-4">
          {[
            { key: 'project_manager', label: 'Project Manager' },
            { key: 'superintendent',  label: 'Superintendent'  },
            { key: 'architect',       label: 'Architect'       },
          ].map((f, i) => (
            <div key={f.key}>
              <MicroLabel>{f.label}</MicroLabel>
              <input autoFocus={i === 0} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                placeholder="Full name"
                className="w-full h-11 px-3 text-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors" />
            </div>
          ))}
        </div>
      );

      case 'details': return (
        <div className="space-y-4">
          <div>
            <MicroLabel>Project Description <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">(client-visible)</span></MicroLabel>
            <Textarea autoFocus className="rounded-none text-sm" rows={3}
              placeholder="Scope, goals, and what the client can expect…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <MicroLabel>Internal Notes <span className="font-normal text-muted-foreground/60 normal-case tracking-normal">(admin only)</span></MicroLabel>
            <Textarea className="rounded-none text-sm" rows={2}
              placeholder="Vendor contacts, contract notes, internal reminders…"
              value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <MicroLabel>Custom Fields</MicroLabel>
              <button onClick={addCustomField}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] hover:text-foreground transition-colors"
                style={{ color: AC }}>
                <Plus className="w-2.5 h-2.5" strokeWidth={3} /> Add Field
              </button>
            </div>
            {customFields.length === 0 ? (
              <button onClick={addCustomField}
                className="w-full border border-dashed border-border py-3 text-[10px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all flex items-center justify-center gap-1.5">
                <Plus className="w-3 h-3" /> Add a custom field (Permit #, HOA Contact, Parcel ID…)
              </button>
            ) : (
              <div className="space-y-2">
                {customFields.map(f => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input className="h-9 px-3 text-xs border border-border bg-background focus:outline-none focus:border-foreground/40 w-36 flex-shrink-0 transition-colors"
                      placeholder="Field name" value={f.key}
                      onChange={e => updateCustomField(f.id, 'key', e.target.value)} />
                    <input className="h-9 px-3 text-xs border border-border bg-background focus:outline-none focus:border-foreground/40 flex-1 transition-colors"
                      placeholder="Value" value={f.value}
                      onChange={e => updateCustomField(f.id, 'value', e.target.value)} />
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

      case 'review': return (
        <div className="space-y-4">
          {/* Completeness */}
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
              {optionalFilled >= 5 ? 'Excellent — very detailed project record.' : optionalFilled >= 3 ? 'Good — add more details any time.' : 'You can fill in details later from Admin.'}
            </p>
          </div>

          {/* Summary */}
          <div className="border border-border divide-y divide-border">
            {[
              { label: 'Name',    value: form.title },
              { label: 'Code',    value: form.project_code || '—' },
              { label: 'Type',    value: form.type },
              { label: 'Status',  value: PROJECT_STATUSES.find(s => s.value === form.status)?.label ?? form.status },
              ...(form.address ? [{ label: 'Address', value: [form.address, form.city, [form.state, form.zipcode].filter(Boolean).join(' ')].filter(Boolean).join(', ') }] : []),
              ...(form.client_name ? [{ label: 'Client', value: form.client_name }] : []),
              ...(form.start_date ? [{ label: 'Start', value: fmtDate(form.start_date) }] : []),
              ...(form.estimated_completion ? [{ label: 'Est. Complete', value: fmtDate(form.estimated_completion) }] : []),
              ...(form.contract_amount ? [{ label: 'Contract', value: `$${parseFloat(form.contract_amount).toLocaleString()}` }] : []),
              ...(form.budget ? [{ label: 'Budget', value: `$${parseFloat(form.budget).toLocaleString()}` }] : []),
              ...(form.project_manager ? [{ label: 'PM', value: form.project_manager }] : []),
              ...customFields.filter(f => f.key.trim()).map(f => ({ label: f.key, value: f.value || '—' })),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-4 px-4 py-2.5">
                <div className="w-28 flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                <div className="text-[12px] font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Wand2 className="w-3 h-3 flex-shrink-0" style={{ color: AC }} />
            Will appear in the Project Portfolio and sync to the Admin dashboard.
          </div>

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <button onClick={handleCreate} disabled={saving || !form.title.trim()}
            className="w-full h-12 text-[10px] font-black uppercase tracking-[0.22em] text-background transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: saving ? '#666' : AC }}>
            {saving
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating Project…</span>
              : `Create ${form.title.trim() || 'Project'}`}
          </button>
        </div>
      );

      default: return null;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background w-full sm:max-w-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '95svh', borderRadius: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <motion.div className="h-full" style={{ backgroundColor: AC }}
            animate={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Step dots */}
            <div className="flex items-center gap-1.5 mb-3">
              {WIZARD_STEPS.map((s, i) => (
                <button key={s.key} onClick={() => goTo(i)} disabled={i > step} title={s.label}
                  style={{
                    width: i === step ? 20 : i < step ? 8 : 6, height: 6, borderRadius: 3,
                    backgroundColor: i === step ? AC : i < step ? AC + '60' : undefined,
                    border: i > step ? '1px solid var(--border)' : 'none',
                    transition: 'all 0.25s ease',
                    cursor: i < step ? 'pointer' : 'default', flexShrink: 0,
                  }}
                />
              ))}
              <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {step + 1}/{WIZARD_STEPS.length}
              </span>
            </div>
            {/* Title */}
            <div style={{ fontFamily: SERIF, fontStyle: 'italic' }} className="text-[22px] font-light text-foreground leading-tight">
              {currentStep.question}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">{currentStep.label}</span>
              {isOptional && (
                <span className="text-[8px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 border border-border text-muted-foreground/70">Optional</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95svh - 230px)', minHeight: 200 }}>
          <div className="px-5 py-5">
            <AnimatePresence custom={dir} mode="wait">
              <motion.div key={step} custom={dir}
                variants={{
                  enter:  (d: number) => ({ x: d * 32, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:   (d: number) => ({ x: -d * 32, opacity: 0 }),
                }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
                {renderStep()}
              </motion.div>
            </AnimatePresence>
            {error && step !== WIZARD_STEPS.length - 1 && (
              <p className="mt-3 text-[11px] text-red-500">{error}</p>
            )}
          </div>
        </div>

        {/* Navigation footer — always visible */}
        <div className="border-t border-border px-5 py-3.5 flex items-center justify-between gap-3 bg-secondary/10">
          <button onClick={goBack} disabled={isFirst}
            className="flex items-center gap-1.5 h-8 px-3 text-[9px] font-bold uppercase tracking-[0.14em] border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-30 disabled:pointer-events-none">
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
              <button onClick={goNext}
                className="flex items-center gap-1.5 h-8 px-4 text-[9px] font-black uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-80"
                style={{ backgroundColor: AC }}>
                Continue <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
