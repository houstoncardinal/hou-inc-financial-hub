import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, ProjectBrief } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const ALT    = '#F3EDE3';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const PROJECT_TYPES = [
  { id: 'Custom Estate',      label: 'Custom Estate',      sub: 'Luxury single-family, 5,000+ sq ft' },
  { id: 'Family Home',        label: 'Family Home',        sub: 'Premium residential, 2,500–5,000 sq ft' },
  { id: 'Multi-Family',       label: 'Multi-Family',       sub: 'Townhomes, duplexes, condos' },
  { id: 'Commercial',         label: 'Commercial',         sub: 'Office, retail, or mixed-use' },
  { id: 'Renovation',         label: 'Renovation',         sub: 'Upgrade or transform existing property' },
  { id: 'Investment Property', label: 'Investment Property', sub: 'Income-generating residential or commercial' },
];

const STYLES = [
  'Modern / Contemporary', 'Traditional', 'Transitional', 'Mediterranean',
  'French Country', 'Farmhouse', 'Mid-Century Modern', 'Industrial Chic',
];

const SQFT_OPTIONS = ['Under 2,500 sq ft', '2,500 – 5,000 sq ft', '5,000 – 8,000 sq ft', '8,000 – 12,000 sq ft', '12,000 – 20,000 sq ft', '20,000+ sq ft'];
const BED_OPTIONS  = ['2', '3', '4', '5', '6', '7+'];
const BATH_OPTIONS = ['2', '3', '4', '5', '6+'];
const FLOOR_OPTIONS = ['1', '2', '3', '4+'];
const BUDGET_OPTIONS = ['Under $500K', '$500K – $1M', '$1M – $3M', '$3M – $5M', '$5M – $10M', '$10M – $25M', '$25M+'];
const TIMELINE_OPTIONS = ['ASAP / Ready now', '3–6 months', '6–12 months', '1–2 years', '2+ years (planning phase)'];

const inputStyle: React.CSSProperties = {
  width: '100%', height: '44px', padding: '0 1rem',
  fontSize: '13px', backgroundColor: '#FFFFFF',
  border: `1px solid ${BORDER}`, color: DARK,
  outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '8px', textTransform: 'uppercase',
  letterSpacing: '0.24em', fontWeight: 700, marginBottom: '8px',
  color: 'rgba(28,24,20,0.4)',
};

const EMPTY_BRIEF: ProjectBrief = {
  type: '', location: '', sqft: '', bedrooms: '', bathrooms: '', floors: '',
  style: [], budget: '', timeline: '', description: '',
  status: 'draft',
};

const STEPS = ['Project Type', 'Scale & Location', 'Style & Vision', 'Budget & Timeline', 'Review'];

export default function PortalProject() {
  const { client, getBrief, saveBrief, submitBrief } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);

  const existing = getBrief();
  const isSubmitted = existing?.status === 'submitted' || existing?.status === 'reviewing' || existing?.status === 'consultation_scheduled' || existing?.status === 'in_progress';

  const [step, setStep]         = useState(0);
  const [direction, setDirection] = useState(1);
  const [brief, setBrief]       = useState<ProjectBrief>(existing ?? EMPTY_BRIEF);
  const [done, setDone]         = useState(false);

  if (!client) return null;

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

  if (done || isSubmitted) {
    return (
      <PortalLayout>
        <div className="p-6 md:p-10 max-w-2xl">
          <div
            className="p-10 text-center"
            style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 2px 18px rgba(28,24,20,0.04)' }}
          >
            <div
              className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid rgba(157,126,63,0.3)` }}
            >
              <CheckCircle className="w-7 h-7" style={{ color: GOLD }} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.25rem', color: DARK, lineHeight: 1.1, marginBottom: '0.75rem' }}>
              Brief {done ? 'Submitted' : 'Received'}
            </h2>
            <p className="text-sm font-light max-w-sm mx-auto mb-8" style={{ color: MUTED }}>
              {done
                ? 'Your project brief has been sent to your builder. Expect a message within one business day to schedule your first consultation.'
                : 'Your brief is already on file. Your builder has reviewed it and will be in touch shortly.'}
            </p>

            {/* Brief summary */}
            <div className="text-left space-y-3 mb-8 px-2">
              {[
                { label: 'Project Type', val: existing?.type || brief.type },
                { label: 'Scale',        val: existing?.sqft || brief.sqft },
                { label: 'Location',     val: existing?.location || brief.location },
                { label: 'Budget',       val: existing?.budget || brief.budget },
                { label: 'Timeline',     val: existing?.timeline || brief.timeline },
              ].filter(r => r.val).map(r => (
                <div key={r.label} className="flex justify-between items-baseline py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: 'rgba(28,24,20,0.4)' }}>{r.label}</span>
                  <span className="text-[12px] font-semibold" style={{ color: DARK }}>{r.val}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/portal/messages')}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-3 transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              Message Your Builder <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="p-6 md:p-10 max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <div className="text-[9px] uppercase tracking-[0.38em] font-semibold mb-1" style={{ color: GOLD }}>Project Brief</div>
          <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(24px, 3.5vw, 38px)', color: DARK, lineHeight: 1.1 }}>
            Tell us about your vision.
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <button
                onClick={() => i < step && setStep(i)}
                className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold px-1 py-1 transition-colors"
                style={{ color: i === step ? GOLD : i < step ? 'rgba(28,24,20,0.55)' : 'rgba(28,24,20,0.25)' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                  style={{
                    backgroundColor: i < step ? GOLD : i === step ? 'rgba(157,126,63,0.12)' : 'transparent',
                    border: `1px solid ${i <= step ? GOLD : BORDER}`,
                    color: i < step ? DARK : GOLD,
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px mx-2" style={{ backgroundColor: i < step ? GOLD : BORDER }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="mb-5 overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 2px 18px rgba(28,24,20,0.04)' }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="p-7 md:p-10"
            >

              {/* ── Step 0: Project Type ── */}
              {step === 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: DARK }}>What are you building?</h2>
                  <p className="text-[11px] font-light mb-7" style={{ color: MUTED }}>Select the project type that best describes your vision.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PROJECT_TYPES.map(pt => (
                      <button
                        key={pt.id}
                        onClick={() => set('type', pt.id)}
                        className="text-left p-4 transition-all duration-200"
                        style={{
                          backgroundColor: brief.type === pt.id ? 'rgba(157,126,63,0.07)' : CREAM,
                          border: `1px solid ${brief.type === pt.id ? GOLD : BORDER}`,
                        }}
                      >
                        <div className="text-[12px] font-bold mb-0.5" style={{ color: brief.type === pt.id ? GOLD : DARK }}>{pt.label}</div>
                        <div className="text-[10px] font-light" style={{ color: MUTED }}>{pt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 1: Scale & Location ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold mb-1" style={{ color: DARK }}>Scale & Location</h2>
                    <p className="text-[11px] font-light mb-6" style={{ color: MUTED }}>Give us a sense of size and where you're building.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Project Location / Neighborhood *</label>
                    <input
                      value={brief.location}
                      onChange={e => set('location', e.target.value)}
                      placeholder="e.g. River Oaks, The Heights, Katy, TX…"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Approximate Square Footage *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SQFT_OPTIONS.map(o => (
                        <button key={o} onClick={() => set('sqft', o)}
                          className="py-2.5 px-3 text-[10px] font-semibold transition-all"
                          style={{ border: `1px solid ${brief.sqft === o ? GOLD : BORDER}`, backgroundColor: brief.sqft === o ? 'rgba(157,126,63,0.07)' : '#FFFFFF', color: brief.sqft === o ? GOLD : 'rgba(28,24,20,0.6)' }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label style={labelStyle}>Bedrooms</label>
                      <select value={brief.bedrooms} onChange={e => set('bedrooms', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">—</option>
                        {BED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Bathrooms</label>
                      <select value={brief.bathrooms} onChange={e => set('bathrooms', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">—</option>
                        {BATH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Floors</label>
                      <select value={brief.floors} onChange={e => set('floors', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">—</option>
                        {FLOOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Style & Vision ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold mb-1" style={{ color: DARK }}>Style & Vision</h2>
                    <p className="text-[11px] font-light mb-6" style={{ color: MUTED }}>Select all architectural styles that resonate with your vision.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Architectural Style * (select all that apply)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map(s => (
                        <button key={s} onClick={() => toggleStyle(s)}
                          className="flex items-center gap-2.5 py-3 px-4 text-[11px] font-semibold text-left transition-all"
                          style={{ border: `1px solid ${brief.style.includes(s) ? GOLD : BORDER}`, backgroundColor: brief.style.includes(s) ? 'rgba(157,126,63,0.07)' : CREAM, color: brief.style.includes(s) ? GOLD : 'rgba(28,24,20,0.6)' }}>
                          <div className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0"
                            style={{ borderColor: brief.style.includes(s) ? GOLD : BORDER, backgroundColor: brief.style.includes(s) ? GOLD : 'transparent' }}>
                            {brief.style.includes(s) && <span className="text-[8px] font-black" style={{ color: DARK }}>✓</span>}
                          </div>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Describe Your Vision</label>
                    <textarea
                      rows={4} value={brief.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Tell us anything that inspires you — materials, references, must-haves, deal-breakers…"
                      style={{ ...inputStyle, height: 'auto', padding: '0.75rem 1rem', resize: 'none' }}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 3: Budget & Timeline ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold mb-1" style={{ color: DARK }}>Budget & Timeline</h2>
                    <p className="text-[11px] font-light mb-6" style={{ color: MUTED }}>This helps us match you with the right team and plan resources.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Total Project Budget *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUDGET_OPTIONS.map(o => (
                        <button key={o} onClick={() => set('budget', o)}
                          className="py-2.5 px-3 text-[10px] font-semibold transition-all"
                          style={{ border: `1px solid ${brief.budget === o ? GOLD : BORDER}`, backgroundColor: brief.budget === o ? 'rgba(157,126,63,0.07)' : '#FFFFFF', color: brief.budget === o ? GOLD : 'rgba(28,24,20,0.6)' }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Desired Start Timeline *</label>
                    <div className="space-y-2">
                      {TIMELINE_OPTIONS.map(o => (
                        <button key={o} onClick={() => set('timeline', o)}
                          className="w-full text-left py-3 px-4 text-[11px] font-semibold transition-all"
                          style={{ border: `1px solid ${brief.timeline === o ? GOLD : BORDER}`, backgroundColor: brief.timeline === o ? 'rgba(157,126,63,0.07)' : CREAM, color: brief.timeline === o ? GOLD : 'rgba(28,24,20,0.6)' }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review ── */}
              {step === 4 && (
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: DARK }}>Review Your Brief</h2>
                  <p className="text-[11px] font-light mb-6" style={{ color: MUTED }}>Confirm the details below, then submit to your builder.</p>
                  <div className="space-y-0" style={{ border: `1px solid ${BORDER}` }}>
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
                      <div key={r.label} className="flex gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: i % 2 === 0 ? '#FFFFFF' : CREAM }}>
                        <div className="w-28 shrink-0 text-[9px] uppercase tracking-[0.2em] font-bold pt-0.5" style={{ color: 'rgba(28,24,20,0.38)' }}>{r.label}</div>
                        <div className="text-[12px] font-semibold flex-1" style={{ color: DARK }}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold py-3 px-5 transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${BORDER}`, color: 'rgba(28,24,20,0.5)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black py-3 px-7 transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black py-3 px-7 transition-opacity hover:opacity-90"
              style={{ backgroundColor: DARK, color: CREAM }}
            >
              Submit to Builder <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
