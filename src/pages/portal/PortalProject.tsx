import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ChevronRight, ChevronLeft, CheckCircle,
  Building2, Home, Users, Briefcase, Wrench, TrendingUp,
} from 'lucide-react';
import LocationAutocomplete from '@/components/ui/smart/LocationAutocomplete';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, ProjectBrief } from '@/hooks/usePortal';

const SIDEBAR = '#0F0D0B';
const DARK    = '#1C1814';
const CREAM   = '#FAF7F2';
const GOLD    = '#9D7E3F';
const GOLDF   = '#C4A76B';
const BORDER  = '#DDD4C4';
const MUTED   = '#8A7A6A';
const SERIF   = "'Cormorant Garamond', Georgia, serif";

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
  const { client, loaded, getBrief, saveBrief, submitBrief } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const existing    = getBrief();
  const isSubmitted = existing?.status === 'submitted' || existing?.status === 'reviewing'
    || existing?.status === 'consultation_scheduled' || existing?.status === 'in_progress';

  const [step, setStep]         = useState(0);
  const [direction, setDirection] = useState(1);
  const [brief, setBrief]       = useState<ProjectBrief>(existing ?? EMPTY_BRIEF);
  const [done, setDone]         = useState(false);

  if (!loaded || !client) return null;

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

  const handleNext = () => {
    saveBrief(brief);
    if (step < STEPS.length - 1) { setDirection(1); setStep(s => s + 1); }
  };

  const handleBack = () => { setDirection(-1); setStep(s => s - 1); };

  const handleSubmit = () => {
    submitBrief({ ...brief, status: 'submitted' });
    setDone(true);
  };

  // ── Success / already submitted ──────────────────────────────────────
  if (done || isSubmitted) {
    const display = existing ?? brief;
    return (
      <PortalLayout>
        <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="p-10 md:p-14"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 4px 32px rgba(28,24,20,0.06)' }}>
              <div className="w-14 h-14 flex items-center justify-center mx-auto mb-8"
                style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid rgba(157,126,63,0.3)` }}>
                <CheckCircle className="w-6 h-6" style={{ color: GOLD }} strokeWidth={1.5} />
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.5rem', color: DARK, lineHeight: 1.1, textAlign: 'center', marginBottom: '0.75rem' }}>
                {done ? 'Brief Submitted' : 'Brief on File'}
              </h2>
              <p className="text-sm font-light text-center" style={{ color: MUTED, maxWidth: 420, margin: '0 auto 2.5rem' }}>
                {done
                  ? 'Your project brief has been sent to your builder. Expect a message within one business day to schedule your consultation.'
                  : 'Your brief is already on file and under review. Your builder will reach out shortly.'}
              </p>

              <div className="mb-10" style={{ border: `1px solid ${BORDER}` }}>
                {[
                  { label: 'Project Type', val: display?.type },
                  { label: 'Location',     val: display?.location },
                  { label: 'Scale',        val: display?.sqft },
                  { label: 'Budget',       val: display?.budget },
                  { label: 'Timeline',     val: display?.timeline },
                  { label: 'Styles',       val: (display?.style ?? []).join(', ') },
                ].filter(r => r.val).map((r, i) => (
                  <div key={r.label} className="flex justify-between items-baseline px-5 py-3.5"
                    style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : CREAM, borderBottom: `1px solid ${BORDER}` }}>
                    <span className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: MUTED }}>{r.label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: DARK }}>{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/portal/messages')}
                  className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: GOLD, color: DARK }}>
                  Message Your Builder <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
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
      <div className="flex" style={{ minHeight: 'calc(100dvh - 56px)' }}>

        {/* ── Left sidebar (lg+) ── */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0"
          style={{ backgroundColor: SIDEBAR }}>

          {/* Brand */}
          <div className="px-8 pt-10 pb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-1.5" style={{ color: GOLD }}>HOU INC</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.3 }}>
              Project Brief
            </div>
          </div>

          {/* Step list */}
          <div className="flex-1 px-5 py-7 space-y-0.5">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone   = i < step;
              return (
                <button
                  key={s.label}
                  onClick={() => { if (isDone) { setDirection(-1); setStep(i); } }}
                  disabled={!isDone && !isActive}
                  className="w-full text-left px-4 py-3.5 transition-all duration-200 flex items-start gap-3.5"
                  style={{
                    backgroundColor: isActive ? 'rgba(157,126,63,0.1)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? GOLD : isDone ? 'rgba(157,126,63,0.38)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: isDone ? 'pointer' : 'default',
                  }}>
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isDone ? GOLD : isActive ? 'rgba(157,126,63,0.22)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isDone ? GOLD : isActive ? GOLD : 'rgba(255,255,255,0.12)'}`,
                    }}>
                    {isDone
                      ? <span className="text-[7px] font-black" style={{ color: DARK }}>✓</span>
                      : <span className="text-[8px] font-bold" style={{ color: isActive ? GOLDF : 'rgba(255,255,255,0.22)' }}>{i + 1}</span>
                    }
                  </div>
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: isActive ? GOLDF : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.26)' }}>
                      {s.label}
                    </div>
                    <div className="text-[9px] mt-0.5 font-light" style={{ color: isActive ? 'rgba(196,167,107,0.6)' : 'rgba(255,255,255,0.18)' }}>
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="px-8 py-7" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between text-[8px] uppercase tracking-[0.2em] font-bold mb-2.5"
              style={{ color: 'rgba(255,255,255,0.22)' }}>
              <span>Progress</span>
              <span style={{ color: GOLD }}>{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
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
              <div className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD }}>
                {STEPS[step].label}
              </div>
            </div>
            <div className="h-px w-full" style={{ backgroundColor: BORDER }}>
              <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
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
                    <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
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
                            className="group text-left p-6 transition-all duration-200 flex items-start gap-4"
                            style={{
                              backgroundColor: sel ? 'rgba(157,126,63,0.06)' : '#FFFFFF',
                              border: `1px solid ${sel ? GOLD : BORDER}`,
                              boxShadow: sel ? '0 0 0 1px rgba(157,126,63,0.22)' : 'none',
                            }}>
                            <div className="w-10 h-10 flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: sel ? 'rgba(157,126,63,0.1)' : 'rgba(28,24,20,0.04)',
                                border: `1px solid ${sel ? 'rgba(157,126,63,0.28)' : BORDER}`,
                              }}>
                              <pt.Icon className="w-4 h-4" style={{ color: sel ? GOLD : MUTED }} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-bold mb-1" style={{ color: sel ? GOLD : DARK }}>{pt.label}</div>
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
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
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
                        focusBorderColor={GOLD}
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
                              className="py-4 px-3 text-[11px] font-semibold transition-all"
                              style={{
                                border: `1px solid ${sel ? GOLD : BORDER}`,
                                backgroundColor: sel ? 'rgba(157,126,63,0.07)' : '#FFFFFF',
                                color: sel ? GOLD : 'rgba(28,24,20,0.55)',
                                boxShadow: sel ? '0 0 0 1px rgba(157,126,63,0.2)' : 'none',
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
                            onFocus={e => (e.target.style.borderColor = GOLD)}
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
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
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
                              className="flex items-center gap-3.5 py-4 px-5 text-[12px] font-semibold text-left transition-all"
                              style={{
                                border: `1px solid ${sel ? GOLD : BORDER}`,
                                backgroundColor: sel ? 'rgba(157,126,63,0.06)' : '#FFFFFF',
                                color: sel ? GOLD : 'rgba(28,24,20,0.6)',
                              }}>
                              <div className="w-4 h-4 rounded-sm border flex items-center justify-center shrink-0"
                                style={{ borderColor: sel ? GOLD : BORDER, backgroundColor: sel ? GOLD : 'transparent' }}>
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
                        onFocus={e => (e.target.style.borderColor = GOLD)}
                        onBlur={e => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 3: Budget & Timeline ── */}
                {step === 3 && (
                  <div className="space-y-9">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
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
                              className="py-4 px-3 text-[11px] font-semibold transition-all"
                              style={{
                                border: `1px solid ${sel ? GOLD : BORDER}`,
                                backgroundColor: sel ? 'rgba(157,126,63,0.07)' : '#FFFFFF',
                                color: sel ? GOLD : 'rgba(28,24,20,0.55)',
                                boxShadow: sel ? '0 0 0 1px rgba(157,126,63,0.2)' : 'none',
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
                              className="w-full text-left flex items-center gap-4 py-4 px-5 transition-all"
                              style={{
                                border: `1px solid ${sel ? GOLD : BORDER}`,
                                backgroundColor: sel ? 'rgba(157,126,63,0.06)' : '#FFFFFF',
                              }}>
                              <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                                style={{ borderColor: sel ? GOLD : BORDER, backgroundColor: sel ? 'rgba(157,126,63,0.12)' : 'transparent' }}>
                                {sel && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />}
                              </div>
                              <span className="text-[12px] font-semibold" style={{ color: sel ? GOLD : 'rgba(28,24,20,0.65)' }}>{o}</span>
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
                    <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
                      Step 5 — Review
                    </div>
                    <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: DARK, lineHeight: 1.1, marginBottom: '0.5rem' }}>
                      Confirm & submit.
                    </h2>
                    <p className="text-[12px] font-light mb-8" style={{ color: MUTED }}>
                      Review your brief below. Once submitted, your builder will receive it immediately.
                    </p>

                    <div style={{ border: `1px solid ${BORDER}` }}>
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
                            style={{ color: 'rgba(28,24,20,0.36)' }}>
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
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-bold py-3.5 px-6 transition-opacity hover:opacity-70"
                  style={{ border: `1px solid ${BORDER}`, color: 'rgba(28,24,20,0.5)' }}>
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button onClick={handleNext} disabled={!canNext()}
                  className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black py-3.5 px-8 transition-opacity hover:opacity-90 disabled:opacity-35"
                  style={{ backgroundColor: GOLD, color: DARK }}>
                  Continue <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              ) : (
                <button onClick={handleSubmit}
                  className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black py-3.5 px-8 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: DARK, color: CREAM }}>
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
