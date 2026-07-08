import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, ClipboardList, ArrowRight, ChevronLeft, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens (matching Home.tsx) ─────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const CR   = '#F5F2EC';
const G200 = '#E5DFD6';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const SF   = "'Cormorant Garamond', Georgia, serif";

/* ── Types ───────────────────────────────────────────────────────────── */
type ProjectType = 'residential' | 'commercial' | 'project_management';

type StepData = {
  type: ProjectType | null;
  scope: string;
  stage: string;
  sqft: string;
  pmHelp: string;
  location: string;
  description: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  phone: string;
};

/* ── Static option data ──────────────────────────────────────────────── */
const SCOPE_OPTIONS: Record<ProjectType, string[]> = {
  residential: ['New Custom Home', 'Renovation / Remodel', 'Addition', 'Kitchen & Bath', 'Exterior Upgrade'],
  commercial:  ['Office Building', 'Retail Space', 'Industrial / Warehouse', 'Hospitality', 'Mixed-Use Development'],
  project_management: ['Residential Project', 'Commercial Project', 'Industrial Project'],
};

const SQFT_OPTIONS: Record<ProjectType, string[]> = {
  residential: ['Under 2,000 SF', '2,000–4,000 SF', '4,000–8,000 SF', '8,000+ SF', 'Not Sure'],
  commercial:  ['Under 10,000 SF', '10,000–50,000 SF', '50,000–100,000 SF', '100,000+ SF', 'Not Sure'],
  project_management: ['Under 5,000 SF', '5,000–50,000 SF', '50,000–200,000 SF', '200,000+ SF', 'Not Sure'],
};

const STAGE_OPTIONS: Record<ProjectType, string[]> = {
  residential: ['Planning / Pre-Design', 'Design Complete', 'Permitted', 'Ready to Build'],
  commercial:  ['Concept / Feasibility', 'Design Complete', 'Permitted', 'Ready to Build'],
  project_management: ['Pre-Construction', 'Under Construction', 'Needs Intervention / Oversight'],
};

const PM_HELP_OPTIONS = ['Full Project Management', 'Partial Oversight', 'Consulting Only'];
const BUDGET_OPTIONS  = ['Under $500K', '$500K – $1M', '$1M – $5M', '$5M – $10M', '$10M+', 'Not Sure'];
const TIMELINE_OPTIONS = ['ASAP (Within 3 months)', '3–6 Months', '6–12 Months', '1–2 Years', 'Just Planning'];

const SCOPE_LABEL: Record<ProjectType, string> = {
  residential: 'Project Type',
  commercial: 'Building Type',
  project_management: 'Project Category',
};

const STAGE_LABEL: Record<ProjectType, string> = {
  residential: 'Project Stage',
  commercial: 'Project Stage',
  project_management: 'Current Stage',
};

/* ── Netlify encode helper ───────────────────────────────────────────── */
const encodeForm = (data: Record<string, string>) =>
  Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');

/* ── Sub-components ──────────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 32, height: 1, backgroundColor: AC, flexShrink: 0 }} />
      <span style={{ color: AC, fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

function OptionBtn({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        border: `1px solid ${selected ? AC : G200}`,
        backgroundColor: selected ? 'rgba(157,126,63,0.05)' : W,
        color: selected ? AC : G500,
        fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
        textAlign: 'left', width: '100%',
        transition: 'border-color 0.2s, background-color 0.2s, color 0.2s',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${selected ? AC : G200}`,
        backgroundColor: selected ? AC : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {selected && <Check style={{ width: 8, height: 8, color: W }} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function TextInput({
  label, value, onChange, placeholder, type = 'text', required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 8, letterSpacing: '0.32em',
        textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 8,
      }}>
        {label}{required && ' *'}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%', backgroundColor: '#F7F7F6',
            border: `1px solid ${focused ? B : G200}`,
            borderRadius: 0, padding: '0.85rem 1rem', fontSize: 12,
            fontFamily: 'inherit', color: B, outline: 'none',
            transition: 'border-color 0.2s', boxSizing: 'border-box',
          }}
        />
        <motion.div
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 1, backgroundColor: B, transformOrigin: 'left',
          }}
        />
      </div>
    </div>
  );
}

function TextArea({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 8, letterSpacing: '0.32em',
        textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 8,
      }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: '100%', backgroundColor: '#F7F7F6',
          border: `1px solid ${focused ? B : G200}`,
          borderRadius: 0, padding: '0.85rem 1rem', fontSize: 12,
          fontFamily: 'inherit', color: B, outline: 'none',
          resize: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/* ── Step animation ──────────────────────────────────────────────────── */
const stepVar = {
  enter:  { opacity: 0, y: 18, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  center: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.2  } },
};

/* ── Type card data ──────────────────────────────────────────────────── */
const TYPE_CARDS: { key: ProjectType; Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>; title: string; desc: string }[] = [
  { key: 'residential',        Icon: Home,          title: 'Residential',        desc: 'Custom homes, renovations, additions, and remodels' },
  { key: 'commercial',         Icon: Building2,     title: 'Commercial',          desc: 'Office, retail, industrial, and mixed-use construction' },
  { key: 'project_management', Icon: ClipboardList, title: 'Project Management',  desc: 'Expert oversight and coordination for any project' },
];

/* ── Main export ─────────────────────────────────────────────────────── */
export default function HowCanWeHelpSection() {
  const [step, setStep]           = useState<0 | 1 | 2 | 3>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const [data, setData] = useState<StepData>({
    type: null, scope: '', stage: '', sqft: '', pmHelp: '',
    location: '', description: '', budget: '', timeline: '',
    name: '', email: '', phone: '',
  });

  const set = (k: keyof StepData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const selectType = (t: ProjectType) => {
    setData(d => ({ ...d, type: t, scope: '', stage: '', sqft: '', pmHelp: '' }));
    setStep(1);
  };

  const canStep1 = () => {
    if (!data.type) return false;
    if (data.type === 'project_management') return !!data.scope && !!data.pmHelp;
    return !!data.scope;
  };
  const canStep2 = () => !!data.budget && !!data.timeline;
  const canSubmit = () =>
    !!data.name.trim() && !!data.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

  const reset = () => {
    setStep(0); setSuccess(false); setError('');
    setData({ type: null, scope: '', stage: '', sqft: '', pmHelp: '', location: '', description: '', budget: '', timeline: '', name: '', email: '', phone: '' });
  };

  const handleSubmit = async () => {
    if (!canSubmit()) { setError('Please enter your name and a valid email address.'); return; }
    setSubmitting(true); setError('');
    try {
      await (supabase as any).from('start_project_submissions').insert({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim() || null,
        type: data.type,
        scope: data.scope || null,
        sqft: data.sqft || null,
        location: data.location.trim() || null,
        budget: data.budget || null,
        start_timeline: data.timeline || null,
        description: data.description.trim() || null,
        submitted_at: new Date().toISOString(),
      });

      // Netlify dual-submit (non-blocking — ignore failures)
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({
          'form-name': 'project-inquiry',
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          type: data.type ?? '',
          scope: data.scope,
          sqft: data.sqft,
          location: data.location.trim(),
          budget: data.budget,
          start_timeline: data.timeline,
          description: data.description.trim(),
        }),
      }).catch(() => {/* best-effort */});

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please call us at (281) 915-9595.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Stepper dots ─────────────────────────────────────────────────── */
  const StepDot = ({ n }: { n: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        backgroundColor: step > n ? AC : step === n ? B : 'transparent',
        border: `1.5px solid ${step >= n ? (step > n ? AC : B) : G200}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: step >= n ? W : G400,
        transition: 'all 0.3s',
        flexShrink: 0,
      }}>
        {step > n
          ? <Check style={{ width: 10, height: 10 }} strokeWidth={3} />
          : n}
      </div>
      <span style={{
        fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: step === n ? B : G400, fontWeight: step === n ? 700 : 400,
        transition: 'color 0.3s', whiteSpace: 'nowrap',
      }}>
        {n === 1 ? 'Project Details' : n === 2 ? 'Budget & Timeline' : 'Contact Info'}
      </span>
      {n < 3 && (
        <div style={{ width: 20, height: 1, backgroundColor: step > n ? AC : G200, transition: 'background-color 0.4s', margin: '0 2px' }} />
      )}
    </div>
  );

  /* ── Continue / Back buttons ──────────────────────────────────────── */
  const ContinueBtn = ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { backgroundColor: AC } : {}}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 32px',
        backgroundColor: disabled ? G200 : B,
        color: disabled ? G400 : W,
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800,
      }}
    >
      Continue <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2.5} />
    </motion.button>
  );

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: G500, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700,
      }}
    >
      <ChevronLeft style={{ width: 12, height: 12 }} strokeWidth={2.5} /> Back
    </button>
  );

  return (
    <section style={{ backgroundColor: W, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14">

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <Eyebrow>Start Your Project</Eyebrow>
          <h2 style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(30px, 4vw, 52px)', color: B, lineHeight: 1.06, maxWidth: 560,
          }}>
            How can we<br />help you?
          </h2>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Success state ───────────────────────────────────────── */}
          {success && (
            <motion.div key="success" variants={stepVar} initial="enter" animate="center" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 80, paddingBottom: 80, gap: 32 }}>
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                style={{
                  width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid ${AC}`,
                }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: AC }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.25rem', color: B, marginBottom: 12 }}>
                  We'll be in touch.
                </div>
                <p style={{ fontSize: 12, fontWeight: 300, color: G500, maxWidth: 420, lineHeight: 1.75, margin: '0 auto' }}>
                  Thanks, {data.name.split(' ')[0]}. Your project brief has been received and someone from our
                  team will follow up within 48 business hours.
                </p>
              </div>
              <button
                onClick={reset}
                style={{
                  fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
                  fontWeight: 700, color: AC, background: 'none', border: 'none', cursor: 'pointer',
                }}>
                Submit Another Inquiry
              </button>
            </motion.div>
          )}

          {/* ── Main form ───────────────────────────────────────────── */}
          {!success && (
            <motion.div key="form" variants={stepVar} initial="enter" animate="center" exit="exit">

              {/* Type selector cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 32 }}>
                {TYPE_CARDS.map(({ key, Icon, title, desc }) => {
                  const selected = data.type === key;
                  const dimmed   = data.type !== null && !selected;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      onClick={() => selectType(key)}
                      animate={{ opacity: dimmed ? 0.38 : 1 }}
                      transition={{ duration: 0.25 }}
                      whileHover={{ opacity: 1 }}
                      style={{
                        position: 'relative', padding: '32px 28px',
                        backgroundColor: selected ? B : CR,
                        border: `1px solid ${selected ? B : G200}`,
                        cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                        transition: 'background-color 0.25s, border-color 0.25s',
                      }}
                    >
                      {/* Gold top accent on selected */}
                      {selected && (
                        <motion.div
                          layoutId="type-accent-bar"
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: AC }}
                        />
                      )}

                      {/* Selected checkmark */}
                      {selected && (
                        <div style={{ position: 'absolute', top: 16, right: 16 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', backgroundColor: AC,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check style={{ width: 10, height: 10, color: W }} strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      <Icon style={{ width: 20, height: 20, color: selected ? AC : G500, marginBottom: 16 }} strokeWidth={1.5} />

                      <div style={{
                        fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 22,
                        color: selected ? W : B, lineHeight: 1.1, marginBottom: 8,
                      }}>
                        {title}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 300, color: selected ? 'rgba(255,255,255,0.5)' : G500, lineHeight: 1.6, margin: 0 }}>
                        {desc}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Step form panel */}
              <AnimatePresence>
                {data.type && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: { opacity: { duration: 0.3, delay: 0.1 }, height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ border: `1px solid ${G200}`, backgroundColor: '#FAFAF9', padding: '40px' }}>

                      {/* Step indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, flexWrap: 'wrap' }}>
                        <StepDot n={1} />
                        <StepDot n={2} />
                        <StepDot n={3} />
                      </div>

                      <AnimatePresence mode="wait">

                        {/* ── Step 1: Project Details ──────────────── */}
                        {step === 1 && (
                          <motion.div key="step1" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: AC, marginBottom: 6 }}>
                                {TYPE_CARDS.find(c => c.key === data.type)?.title}
                              </div>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>
                                {data.type === 'project_management'
                                  ? 'What kind of help do you need?'
                                  : 'Tell us about your project'}
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Left: scope */}
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                  {SCOPE_LABEL[data.type!]}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {SCOPE_OPTIONS[data.type!].map(opt => (
                                    <OptionBtn key={opt} selected={data.scope === opt} onClick={() => set('scope')(opt)}>
                                      {opt}
                                    </OptionBtn>
                                  ))}
                                </div>
                              </div>

                              {/* Right: stage + sqft/pmHelp */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                  <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                    {STAGE_LABEL[data.type!]}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {STAGE_OPTIONS[data.type!].map(opt => (
                                      <OptionBtn key={opt} selected={data.stage === opt} onClick={() => set('stage')(opt)}>
                                        {opt}
                                      </OptionBtn>
                                    ))}
                                  </div>
                                </div>

                                {data.type === 'project_management' ? (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                      Type of Help *
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {PM_HELP_OPTIONS.map(opt => (
                                        <OptionBtn key={opt} selected={data.pmHelp === opt} onClick={() => set('pmHelp')(opt)}>
                                          {opt}
                                        </OptionBtn>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                      Approx. Size
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {SQFT_OPTIONS[data.type!].map(opt => (
                                        <OptionBtn key={opt} selected={data.sqft === opt} onClick={() => set('sqft')(opt)}>
                                          {opt}
                                        </OptionBtn>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Location + Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 28 }}>
                              <TextInput
                                label="Location / Area"
                                value={data.location}
                                onChange={set('location')}
                                placeholder="Neighborhood, city, or zip code"
                              />
                              <TextArea
                                label="Additional Notes"
                                value={data.description}
                                onChange={set('description')}
                                placeholder="Any specific requirements, constraints, or details we should know…"
                              />
                            </div>

                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                              <ContinueBtn disabled={!canStep1()} onClick={() => setStep(2)} />
                            </div>
                          </motion.div>
                        )}

                        {/* ── Step 2: Budget & Timeline ────────────── */}
                        {step === 2 && (
                          <motion.div key="step2" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>
                                Budget & Timeline
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                  Estimated Budget *
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {BUDGET_OPTIONS.map(opt => (
                                    <OptionBtn key={opt} selected={data.budget === opt} onClick={() => set('budget')(opt)}>
                                      {opt}
                                    </OptionBtn>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                  When to Start? *
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {TIMELINE_OPTIONS.map(opt => (
                                    <OptionBtn key={opt} selected={data.timeline === opt} onClick={() => set('timeline')(opt)}>
                                      {opt}
                                    </OptionBtn>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <BackBtn onClick={() => setStep(1)} />
                              <ContinueBtn disabled={!canStep2()} onClick={() => setStep(3)} />
                            </div>
                          </motion.div>
                        )}

                        {/* ── Step 3: Contact Info ─────────────────── */}
                        {step === 3 && (
                          <motion.div key="step3" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>
                                How should we reach you?
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ maxWidth: 640 }}>
                              <TextInput label="Full Name" value={data.name} onChange={set('name')} placeholder="Your full name" required />
                              <TextInput label="Email Address" type="email" value={data.email} onChange={set('email')} placeholder="your@email.com" required />
                              <TextInput label="Phone Number" type="tel" value={data.phone} onChange={set('phone')} placeholder="(713) 000-0000" />
                            </div>

                            {error && (
                              <p style={{ marginTop: 14, fontSize: 10, color: '#C0392B' }}>{error}</p>
                            )}

                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                              <BackBtn onClick={() => setStep(2)} />
                              <motion.button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                whileHover={{ backgroundColor: AC }}
                                transition={{ duration: 0.22 }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '14px 36px', backgroundColor: B, color: W,
                                  border: 'none', cursor: submitting ? 'wait' : 'pointer',
                                  fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800,
                                }}
                              >
                                {submitting
                                  ? <><Loader2 className="animate-spin" style={{ width: 14, height: 14 }} strokeWidth={2} /> Submitting…</>
                                  : <>Submit Brief <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2.5} /></>
                                }
                              </motion.button>
                            </div>

                            <p style={{ marginTop: 14, fontSize: 8, color: G400, lineHeight: 1.6 }}>
                              By submitting this brief you agree to our privacy policy. All project information is kept strictly confidential.
                            </p>
                          </motion.div>
                        )}

                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
