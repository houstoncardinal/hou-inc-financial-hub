import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowUpRight, ChevronRight, ChevronLeft, CheckCircle, Plus, FileText,
  Building2, Home, Users, Briefcase, Wrench, TrendingUp,
} from 'lucide-react';
import LocationAutocomplete from '@/components/ui/smart/LocationAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, ProjectBrief } from '@/hooks/usePortal';

const DARK    = '#111827';
const CREAM   = '#F8FAFC';
const ACCENT      = '#000000';
const ACCENT_SOFT = '#404040';
const BORDER  = '#E5E7EB';
const MUTED   = '#6B7280';
const SERIF   = "'Cormorant Garamond', Georgia, serif";

/* Bento card recipe — same recipe as the rest of the (now light) portal. */
const PF_CSS = `
.pfp-card{position:relative;background:#fff;border-radius:20px;border:1px solid ${BORDER};box-shadow:0 1px 3px rgba(17,24,39,.04),0 8px 24px rgba(17,24,39,.05);transition:box-shadow .3s cubic-bezier(.16,1,.3,1),border-color .2s ease;}
.pfp-card:hover{border-color:rgba(0,0,0,.35);box-shadow:0 6px 18px rgba(17,24,39,.05),0 18px 44px rgba(17,24,39,.08);}
.pfp-tile{position:relative;border-radius:14px;background:#fff;border:1px solid ${BORDER};transition:all .2s cubic-bezier(.16,1,.3,1);}
.pfp-tile:hover{border-color:rgba(0,0,0,.4);transform:translateY(-1px);box-shadow:0 4px 14px rgba(17,24,39,.06);}
.pfp-tile.sel{background:rgba(0,0,0,.06);border-color:${ACCENT};box-shadow:0 0 0 1px rgba(0,0,0,.22);}
`;

const PROJECT_TYPES = [
  { id: 'Custom Estate',       label: 'Custom Estate',       sub: 'Luxury single-family, 5,000+ sq ft',           Icon: Building2 },
  { id: 'Family Home',         label: 'Family Home',         sub: 'Premium residential, 2,500–5,000 sq ft',       Icon: Home },
  { id: 'Multi-Family',        label: 'Multi-Family',        sub: 'Townhomes, duplexes, condos',                   Icon: Users },
  { id: 'Commercial',          label: 'Commercial',          sub: 'Office, retail, or mixed-use',                  Icon: Briefcase },
  { id: 'Renovation',          label: 'Renovation',          sub: 'Upgrade or transform existing property',        Icon: Wrench },
  { id: 'Investment Property', label: 'Investment Property', sub: 'Income-generating residential or commercial',   Icon: TrendingUp },
];

const STYLES = [
  'Modern / Contemporary', 'Traditional', 'Transitional', 'Mediterranean',
  'French Country', 'Farmhouse', 'Mid-Century Modern', 'Industrial Chic',
];

const SQFT_OPTIONS     = ['Under 2,500 sq ft', '2,500 – 5,000 sq ft', '5,000 – 8,000 sq ft', '8,000 – 12,000 sq ft', '12,000 – 20,000 sq ft', '20,000+ sq ft'];
const BED_OPTIONS      = ['2', '3', '4', '5', '6', '7+'];
const BATH_OPTIONS     = ['2', '3', '4', '5', '6+'];
const FLOOR_OPTIONS    = ['1', '2', '3', '4+'];
const BUDGET_OPTIONS   = ['Under $500K', '$500K – $1M', '$1M – $3M', '$3M – $5M', '$5M – $10M', '$10M – $25M', '$25M+'];
const TIMELINE_OPTIONS = ['ASAP / Ready now', '3–6 months', '6–12 months', '1–2 years', '2+ years (planning phase)'];

const STEPS = [
  { label: 'Project Type',      desc: 'Define your build category' },
  { label: 'Scale & Location',  desc: 'Size, site, and program' },
  { label: 'Style & Vision',    desc: 'Aesthetic direction' },
  { label: 'Budget & Timeline', desc: 'Investment scope' },
  { label: 'Review & Submit',   desc: 'Confirm and send to builder' },
];

const EMPTY_BRIEF: ProjectBrief = {
  type: '', location: '', sqft: '', bedrooms: '', bathrooms: '', floors: '',
  style: [], budget: '', timeline: '', description: '',
  status: 'draft',
};

export default function PortalProject() {
  const { client, loaded, getBriefs, saveBrief, submitBrief } = usePortal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const briefs = getBriefs();
  const isNew  = searchParams.get('new') === '1';
  const viewId = searchParams.get('id');
  const viewedBrief   = viewId ? (briefs.find(b => b.id === viewId) ?? null) : null;
  const viewedIsDraft = viewedBrief?.status === 'draft';

  // 'wizard' — starting fresh, resuming a draft, or this client's very first brief ever.
  // 'detail' — viewing one specific already-submitted brief.
  // 'list'   — the default landing once at least one brief exists: every brief, plus a way to start another.
  let mode: 'wizard' | 'detail' | 'list';
  if (isNew) mode = 'wizard';
  else if (viewId) mode = viewedBrief ? (viewedIsDraft ? 'wizard' : 'detail') : (briefs.length > 0 ? 'list' : 'wizard');
  else mode = briefs.length > 0 ? 'list' : 'wizard';

  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState(1);
  const [draftId, setDraftId]     = useState<string | null>(viewedIsDraft ? viewId : null);
  const [brief, setBrief]         = useState<ProjectBrief>(viewedIsDraft && viewedBrief ? viewedBrief : EMPTY_BRIEF);
  const [done, setDone]           = useState(false);

  // Re-sync wizard state when navigating between a fresh brief and a specific draft
  // (react-router doesn't remount the component for a search-param-only navigation).
  // The `!!viewedBrief` dep (not `briefs` itself) matters: on a hard reload of a
  // `?id=` link, `briefs` loads in asynchronously after the first render, so this
  // re-fires once when the target draft actually becomes available — but it must
  // NOT re-fire on every later `briefs` update (each autosave replaces an entry in
  // place), or every keystroke's Continue click would reset the wizard to step 0.
  useEffect(() => {
    setStep(0);
    setDirection(1);
    setDone(false);
    setDraftId(viewedIsDraft ? viewId : null);
    setBrief(viewedIsDraft && viewedBrief ? viewedBrief : EMPTY_BRIEF);
  }, [viewId, isNew, !!viewedBrief]);

  if (!loaded || !client || (client.status && client.status !== 'approved')) return null;

  const set = (k: keyof ProjectBrief, v: string | string[]) =>
    setBrief(b => ({ ...b, [k]: v }));

  const toggleStyle = (s: string) => {
    const next = brief.style.includes(s)
      ? brief.style.filter(x => x !== s)
      : [...brief.style, s];
    set('style', next);
  };

  const canNext = () => {
    if (step === 0) return !!brief.type;
    if (step === 1) return !!brief.sqft && !!brief.location;
    if (step === 2) return brief.style.length > 0;
    if (step === 3) return !!brief.budget && !!brief.timeline;
    return true;
  };

  const handleNext = async () => {
    const savedId = await saveBrief(brief, draftId ?? undefined);
    if (savedId && !draftId) setDraftId(savedId);
    if (step < STEPS.length - 1) { setDirection(1); setStep(s => s + 1); }
  };

  const handleBack = () => { setDirection(-1); setStep(s => s - 1); };

  const handleSubmit = async () => {
    await submitBrief({ ...brief, status: 'submitted' }, draftId ?? undefined);
    setDone(true);
  };

  // ── List — every brief on file, plus a way to start another ──────────
  if (mode === 'list') {
    return (
      <PortalLayout>
        <style>{PF_CSS}</style>
        <div className="px-5 sm:px-10 py-8 md:py-12 max-w-3xl mx-auto" style={{ backgroundColor: CREAM }}>
          <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: ACCENT }}>Client Portal</div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px,4vw,44px)', color: DARK, lineHeight: 1.05 }}>
                Project Briefs
              </div>
            </div>
            <Link
              to="/portal/project?new=1"
              className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-bold px-5 py-3.5 rounded-full transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT, color: '#FFFFFF' }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Submit New Project Brief
            </Link>
          </div>

          <div className="space-y-3">
            {briefs.map(b => {
              const label = b.status === 'draft' ? 'Draft — In Progress'
                : b.status === 'submitted' ? 'Submitted — Under Review'
                : b.status === 'reviewing' ? 'Under Review'
                : b.status === 'consultation_scheduled' ? 'Consultation Scheduled'
                : b.status === 'in_progress' ? 'In Progress' : b.status;
              return (
                <Link
                  key={b.id}
                  to={`/portal/project?id=${b.id}`}
                  className="pfp-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-5 sm:px-6 py-5"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.08)', border: `1px solid rgba(0,0,0,0.24)` }}>
                      <FileText className="w-4 h-4" style={{ color: ACCENT }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: DARK }}>{b.type || 'Untitled Project'}</div>
                      <div className="text-[11px] font-light truncate" style={{ color: MUTED }}>
                        {[b.location, b.budget].filter(Boolean).join(' · ') || 'No details yet'}
                      </div>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto text-[9px] uppercase tracking-[0.18em] font-bold shrink-0 px-2.5 py-1 rounded-full ml-[52px] sm:ml-0" style={{ color: b.status === 'draft' ? MUTED : ACCENT, backgroundColor: b.status === 'draft' ? 'rgba(107,114,128,0.08)' : 'rgba(0,0,0,0.1)' }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </PortalLayout>
    );
  }

  // ── Success / brief detail ────────────────────────────────────────────
  if (mode === 'detail' || done) {
    const display = done ? brief : viewedBrief;
    return (
      <PortalLayout>
        <style>{PF_CSS}</style>
        <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center p-6" style={{ backgroundColor: CREAM }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="pfp-card p-10 md:p-14" style={{ overflow: 'hidden' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`, margin: '-40px -56px 40px' }} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-8"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', border: `1px solid rgba(0,0,0,0.3)` }}>
                <CheckCircle className="w-6 h-6" style={{ color: ACCENT }} strokeWidth={1.5} />
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.5rem', color: DARK, lineHeight: 1.1, textAlign: 'center', marginBottom: '0.75rem' }}>
                {done ? 'Brief Submitted' : 'Brief on File'}
              </h2>
              <p className="text-sm font-light text-center" style={{ color: MUTED, maxWidth: 420, margin: '0 auto 2.5rem' }}>
                {done
                  ? 'Your project brief has been sent to your builder. Expect a message within one business day to schedule your consultation.'
                  : 'Your brief is already on file and under review. Your builder will reach out shortly.'}
              </p>

              <div className="mb-10 rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                {[
                  { label: 'Project Type', val: display?.type },
                  { label: 'Location',     val: display?.location },
                  { label: 'Scale',        val: display?.sqft },
                  { label: 'Budget',       val: display?.budget },
                  { label: 'Timeline',     val: display?.timeline },
                  { label: 'Styles',       val: (display?.style ?? []).join(', ') },
                ].filter(r => r.val).map((r, i, arr) => (
                  <div key={r.label} className="flex justify-between items-baseline px-5 py-3.5"
                    style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : CREAM, borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <span className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: MUTED }}>{r.label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: DARK }}>{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center items-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate('/portal/messages')}
                  className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 rounded-full transition-opacity hover:opacity-90"
                  style={{ backgroundColor: ACCENT, color: '#FFFFFF' }}>
                  Message Your Builder <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                {briefs.length > 1 && (
                  <button
                    onClick={() => navigate('/portal/project')}
                    className="text-[9px] uppercase tracking-[0.24em] font-bold transition-opacity hover:opacity-70"
                    style={{ color: MUTED }}>
                    ← Back to all briefs
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </PortalLayout>
    );
  }

  // ── Main wizard ───────────────────────────────────────────────────────
  return (
    <PortalLayout>
      <style>{PF_CSS}</style>
      <div className="flex" style={{ minHeight: 'calc(100dvh - 56px)' }}>

        {/* ── Left sidebar (lg+) ── */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white"
          style={{ borderRight: `1px solid ${BORDER}` }}>

          {/* Brand */}
          <div className="px-8 pt-10 pb-7" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-1.5" style={{ color: ACCENT }}>HOU INC</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.1rem', color: DARK, lineHeight: 1.3 }}>
              Project Brief
            </div>
          </div>

          {/* Step list */}
          <div className="flex-1 px-5 py-7 space-y-1">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone   = i < step;
              return (
                <button
                  key={s.label}
                  onClick={() => { if (isDone) { setDirection(-1); setStep(i); } }}
                  disabled={!isDone && !isActive}
                  className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-200 flex items-start gap-3.5"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? ACCENT : isDone ? 'rgba(0,0,0,0.38)' : BORDER}`,
                    cursor: isDone ? 'pointer' : 'default',
                  }}>
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isDone ? ACCENT : isActive ? 'rgba(0,0,0,0.14)' : '#F9FAFB',
                      border: `1px solid ${isDone ? ACCENT : isActive ? ACCENT : BORDER}`,
                    }}>
                    {isDone
                      ? <span className="text-[7px] font-black text-white">✓</span>
                      : <span className="text-[8px] font-bold" style={{ color: isActive ? ACCENT : '#9CA3AF' }}>{i + 1}</span>
                    }
                  </div>
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: isActive ? ACCENT : isDone ? DARK : '#9CA3AF' }}>
                      {s.label}
                    </div>
                    <div className="text-[9px] mt-0.5 font-light" style={{ color: isActive ? 'rgba(0,0,0,0.7)' : '#D1D5DB' }}>
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="px-8 py-7" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex justify-between text-[8px] uppercase tracking-[0.2em] font-bold mb-2.5"
              style={{ color: '#9CA3AF' }}>
              <span>Progress</span>
              <span style={{ color: ACCENT }}>{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
              <motion.div className="h-full" style={{ backgroundColor: ACCENT }}
                animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
        </div>

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: CREAM }}>

          {/* Mobile progress bar */}
          <div className="lg:hidden shrink-0 px-5 py-4"
            style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: MUTED }}>
                Step {step + 1} of {STEPS.length}
              </div>
              <div className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: ACCENT }}>
                {STEPS[step].label}
              </div>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
              <motion.div className="h-full" style={{ backgroundColor: ACCENT }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>

          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -28 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="px-6 sm:px-10 md:px-14 xl:px-16 py-10 md:py-14 max-w-3xl"
              >

                {/* ── Step 0: Project Type ── */}
                {step === 0 && (
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: ACCENT }}>
                      Step 1 — Project Type
                    </div>
                    <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                      What are you building?
                    </h2>
                    <p className="text-[12px] font-light mb-10" style={{ color: MUTED }}>
                      Select the category that best describes your project.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {PROJECT_TYPES.map(pt => {
                        const sel = brief.type === pt.id;
                        return (
                          <button
                            key={pt.id}
                            onClick={() => set('type', pt.id)}
                            className="pfp-tile group text-left p-6 transition-all duration-200 flex items-start gap-4"
                            style={{
                              backgroundColor: sel ? 'rgba(0,0,0,0.06)' : '#FFFFFF',
                              border: `1px solid ${sel ? ACCENT : BORDER}`,
                              boxShadow: sel ? '0 0 0 1px rgba(0,0,0,0.22)' : 'none',
                            }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: sel ? 'rgba(0,0,0,0.1)' : 'rgba(17,24,39,0.04)',
                                border: `1px solid ${sel ? 'rgba(0,0,0,0.28)' : BORDER}`,
                              }}>
                              <pt.Icon className="w-4 h-4" style={{ color: sel ? ACCENT : MUTED }} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold mb-1" style={{ color: sel ? ACCENT : DARK }}>{pt.label}</div>
                              <div className="text-[10px] font-light leading-relaxed" style={{ color: MUTED }}>{pt.sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Step 1: Scale & Location ── */}
                {step === 1 && (
                  <div className="space-y-9">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: ACCENT }}>
                        Step 2 — Scale & Location
                      </div>
                      <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                        Where and how large?
                      </h2>
                      <p className="text-[12px] font-light" style={{ color: MUTED }}>
                        Help us understand the scope and site of your project.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Project Location / Neighborhood *
                      </label>
                      <LocationAutocomplete
                        value={brief.location}
                        onChange={v => set('location', v)}
                        placeholder="e.g. River Oaks, The Heights, Katy, TX…"
                        inputClassName="w-full outline-none text-[13px] font-light"
                        inputStyle={{
                          height: 52, paddingRight: '1rem',
                          backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, color: DARK,
                          transition: 'border-color 0.15s',
                        }}
                        focusBorderColor={ACCENT}
                        defaultBorderColor={BORDER}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Approximate Square Footage *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SQFT_OPTIONS.map(o => {
                          const sel = brief.sqft === o;
                          return (
                            <button key={o} onClick={() => set('sqft', o)}
                              className="pfp-tile py-4 px-3 text-[11px] font-semibold transition-all"
                              style={{
                                border: `1px solid ${sel ? ACCENT : BORDER}`,
                                backgroundColor: sel ? 'rgba(0,0,0,0.07)' : '#FFFFFF',
                                color: sel ? ACCENT : 'rgba(17,24,39,0.55)',
                                boxShadow: sel ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
                              }}>
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { label: 'Bedrooms', key: 'bedrooms' as const, options: BED_OPTIONS },
                        { label: 'Bathrooms', key: 'bathrooms' as const, options: BATH_OPTIONS },
                        { label: 'Floors', key: 'floors' as const, options: FLOOR_OPTIONS },
                      ] as const).map(({ label, key, options }) => (
                        <div key={key}>
                          <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                            {label}
                          </label>
                          <select
                            value={brief[key]}
                            onChange={e => set(key, e.target.value)}
                            className="w-full outline-none text-[13px] appearance-none cursor-pointer"
                            style={{
                              height: 52, padding: '0 1rem',
                              backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`,
                              color: brief[key] ? DARK : MUTED,
                              transition: 'border-color 0.15s',
                            }}
                            onFocus={e => (e.target.style.borderColor = ACCENT)}
                            onBlur={e => (e.target.style.borderColor = BORDER)}>
                            <option value="">—</option>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Style & Vision ── */}
                {step === 2 && (
                  <div className="space-y-9">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: ACCENT }}>
                        Step 3 — Style & Vision
                      </div>
                      <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                        What's your aesthetic?
                      </h2>
                      <p className="text-[12px] font-light" style={{ color: MUTED }}>
                        Select all architectural styles that resonate with your vision.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Architectural Style * (select all that apply)
                      </label>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {STYLES.map(s => {
                          const sel = brief.style.includes(s);
                          return (
                            <button key={s} onClick={() => toggleStyle(s)}
                              className="pfp-tile flex items-center gap-3.5 py-4 px-5 text-[12px] font-semibold text-left transition-all"
                              style={{
                                border: `1px solid ${sel ? ACCENT : BORDER}`,
                                backgroundColor: sel ? 'rgba(0,0,0,0.06)' : '#FFFFFF',
                                color: sel ? ACCENT : 'rgba(17,24,39,0.6)',
                              }}>
                              <div className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                                style={{ borderColor: sel ? ACCENT : BORDER, backgroundColor: sel ? ACCENT : 'transparent' }}>
                                {sel && <span className="text-[8px] font-black" style={{ color: DARK }}>✓</span>}
                              </div>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Describe Your Vision
                      </label>
                      <textarea
                        rows={5}
                        value={brief.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Tell us anything that inspires you — materials, references, must-haves, deal-breakers…"
                        className="w-full outline-none text-[13px] font-light resize-none"
                        style={{
                          padding: '1rem 1.25rem', lineHeight: 1.75,
                          backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, color: DARK,
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.target.style.borderColor = ACCENT)}
                        onBlur={e => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 3: Budget & Timeline ── */}
                {step === 3 && (
                  <div className="space-y-9">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: ACCENT }}>
                        Step 4 — Budget & Timeline
                      </div>
                      <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                        Investment scope.
                      </h2>
                      <p className="text-[12px] font-light" style={{ color: MUTED }}>
                        This helps us match you with the right team and plan resources.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Total Project Budget *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {BUDGET_OPTIONS.map(o => {
                          const sel = brief.budget === o;
                          return (
                            <button key={o} onClick={() => set('budget', o)}
                              className="pfp-tile py-4 px-3 text-[11px] font-semibold transition-all"
                              style={{
                                border: `1px solid ${sel ? ACCENT : BORDER}`,
                                backgroundColor: sel ? 'rgba(0,0,0,0.07)' : '#FFFFFF',
                                color: sel ? ACCENT : 'rgba(17,24,39,0.55)',
                                boxShadow: sel ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
                              }}>
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: MUTED }}>
                        Desired Start Timeline *
                      </label>
                      <div className="space-y-2">
                        {TIMELINE_OPTIONS.map(o => {
                          const sel = brief.timeline === o;
                          return (
                            <button key={o} onClick={() => set('timeline', o)}
                              className="pfp-tile w-full text-left flex items-center gap-4 py-4 px-5 transition-all"
                              style={{
                                border: `1px solid ${sel ? ACCENT : BORDER}`,
                                backgroundColor: sel ? 'rgba(0,0,0,0.06)' : '#FFFFFF',
                              }}>
                              <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                                style={{ borderColor: sel ? ACCENT : BORDER, backgroundColor: sel ? 'rgba(0,0,0,0.12)' : 'transparent' }}>
                                {sel && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
                              </div>
                              <span className="text-[12px] font-semibold" style={{ color: sel ? ACCENT : 'rgba(17,24,39,0.65)' }}>{o}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Review ── */}
                {step === 4 && (
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: ACCENT }}>
                      Step 5 — Review
                    </div>
                    <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                      Confirm & submit.
                    </h2>
                    <p className="text-[12px] font-light mb-8" style={{ color: MUTED }}>
                      Review your brief below. Once submitted, your builder will receive it immediately.
                    </p>

                    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                      {[
                        { label: 'Project Type', val: brief.type },
                        { label: 'Location',     val: brief.location },
                        { label: 'Scale',        val: brief.sqft },
                        { label: 'Bedrooms',     val: brief.bedrooms },
                        { label: 'Bathrooms',    val: brief.bathrooms },
                        { label: 'Floors',       val: brief.floors },
                        { label: 'Style',        val: brief.style.join(', ') },
                        { label: 'Budget',       val: brief.budget },
                        { label: 'Timeline',     val: brief.timeline },
                        { label: 'Vision Notes', val: brief.description },
                      ].filter(r => r.val).map((r, i) => (
                        <div key={r.label} className="flex gap-5 px-6 py-4"
                          style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: i % 2 === 0 ? '#FFFFFF' : CREAM }}>
                          <div className="w-32 shrink-0 text-[9px] uppercase tracking-[0.22em] font-bold pt-0.5"
                            style={{ color: 'rgba(17,24,39,0.36)' }}>
                            {r.label}
                          </div>
                          <div className="text-[12px] font-semibold flex-1 leading-relaxed" style={{ color: DARK }}>
                            {r.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation footer ── */}
          <div className="shrink-0 px-6 sm:px-10 md:px-14 xl:px-16 py-5"
            style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between max-w-3xl">
              {step > 0 ? (
                <button onClick={handleBack}
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-bold py-3.5 px-6 rounded-full transition-all hover:border-[rgba(0,0,0,0.4)]"
                  style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button onClick={handleNext} disabled={!canNext()}
                  className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black py-3.5 px-8 rounded-full transition-opacity hover:opacity-90 disabled:opacity-35"
                  style={{ backgroundColor: ACCENT, color: '#FFFFFF' }}>
                  Continue <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              ) : (
                <button onClick={handleSubmit}
                  className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black py-3.5 px-8 rounded-full transition-opacity hover:opacity-90"
                  style={{ backgroundColor: DARK, color: '#FFFFFF' }}>
                  Submit to Builder <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
