import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Home, Building2,
  DollarSign, Clock, User,
} from 'lucide-react';

/* ── Tokens ── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SF   = "'Cormorant Garamond', Georgia, serif";
const G500 = '#8A8480';
const BORD = 'rgba(0,0,0,0.11)';

/* ── Data ── */
const RES_SCOPES = [
  { value: 'new_home',     label: 'New Home Construction',  desc: 'Ground-up custom home build on your lot' },
  { value: 'renovation',   label: 'Major Renovation',       desc: 'Full or substantial interior & exterior overhaul' },
  { value: 'addition',     label: 'Home Addition',          desc: 'Expanding your existing living space' },
  { value: 'kitchen_bath', label: 'Kitchen & Bath Remodel', desc: 'Targeted high-impact room transformation' },
  { value: 'outdoor',      label: 'Outdoor & Landscaping',  desc: 'Pool, patio, outdoor kitchen, hardscaping' },
  { value: 'other_res',    label: 'Something Else',         desc: 'Describe your vision in the next steps' },
];

const COMM_SCOPES = [
  { value: 'office',      label: 'Office Building',          desc: 'Corporate headquarters, professional spaces, co-working' },
  { value: 'retail',      label: 'Retail & Mixed-Use',       desc: 'Storefronts, shopping centers, mixed-use developments' },
  { value: 'hospitality', label: 'Hospitality & Restaurant', desc: 'Hotels, restaurants, entertainment venues' },
  { value: 'industrial',  label: 'Industrial & Warehouse',   desc: 'Warehousing, distribution, manufacturing facilities' },
  { value: 'medical',     label: 'Medical & Education',      desc: 'Clinics, schools, and institutional buildings' },
  { value: 'other_comm',  label: 'Something Else',           desc: 'Describe your vision in the next steps' },
];

const SQFT_OPTS = [
  { v: 'under_1500',  l: 'Under 1,500' },
  { v: '1500_3000',   l: '1,500 – 3,000' },
  { v: '3000_5000',   l: '3,000 – 5,000' },
  { v: '5000_10k',    l: '5,000 – 10,000' },
  { v: '10k_25k',     l: '10,000 – 25,000' },
  { v: 'over_25k',    l: '25,000+' },
];

const AREAS = [
  'River Oaks', 'Memorial', 'The Heights', 'Montrose',
  'Galleria / Uptown', 'Energy Corridor', 'Midtown',
  'Katy', 'Sugar Land', 'The Woodlands', 'Downtown Houston', 'Other',
];

const BUDGETS = [
  { v: 'under_250', l: 'Under $250K',   s: 'Targeted renovations & additions' },
  { v: '250_500',   l: '$250K – $500K', s: 'Mid-scale residential & small commercial' },
  { v: '500_1m',    l: '$500K – $1M',   s: 'Custom homes & commercial fit-outs' },
  { v: '1m_2.5m',  l: '$1M – $2.5M',  s: 'Luxury residential & commercial builds' },
  { v: '2.5m_5m',  l: '$2.5M – $5M',  s: 'Large-scale commercial & estate builds' },
  { v: 'over_5m',  l: '$5M+',          s: 'Flagship commercial & luxury developments' },
];

const TIMELINES = [
  { v: 'asap',   l: 'As Soon as Possible', s: 'Ready to break ground within 60 days' },
  { v: '3_6mo',  l: 'Next 3–6 Months',    s: 'Planning underway — need the right partner' },
  { v: '6_12mo', l: '6–12 Months',        s: 'In early planning, building out the team' },
  { v: '12plus', l: '12+ Months Out',     s: 'Exploring options and gathering estimates' },
];

const PRIORITIES = [
  'Budget certainty', 'Speed of delivery',
  'Design excellence', 'Sustainability',
  'Minimal disruption', 'Proven track record',
];

const STEPS = ['Type', 'Scope', 'Scale', 'Budget', 'Timeline', 'Contact'];
const TOTAL = STEPS.length;

/* ── Types ── */
interface FormData {
  type: 'residential' | 'commercial' | '';
  scope: string; sqft: string; location: string;
  budget: string; startTimeline: string;
  priorities: string[];
  name: string; email: string; phone: string; description: string;
}
const INIT: FormData = {
  type: '', scope: '', sqft: '', location: '', budget: '',
  startTimeline: '', priorities: [],
  name: '', email: '', phone: '', description: '',
};

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
};

/* ════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════ */
export default function StartProject() {
  const [step, setStep] = useState(1);
  const [dir,  setDir]  = useState(1);
  const [data, setData] = useState<FormData>(INIT);
  const [done, setDone] = useState(false);

  const scopes = data.type === 'commercial' ? COMM_SCOPES : RES_SCOPES;

  const canNext = () => {
    if (step === 1) return data.type !== '';
    if (step === 2) return data.scope !== '';
    if (step === 3) return data.sqft !== '' && data.location !== '';
    if (step === 4) return data.budget !== '';
    if (step === 5) return data.startTimeline !== '';
    if (step === 6) return data.name.trim() !== '' && data.email.trim() !== '';
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    if (step < TOTAL) { setDir(1); setStep(s => s + 1); }
    else {
      try {
        const sub = { id: crypto.randomUUID(), ...data, submittedAt: new Date().toISOString(), source: 'start-project-form' };
        const prev = JSON.parse(localStorage.getItem('hou-start-project-submissions') || '[]');
        localStorage.setItem('hou-start-project-submissions', JSON.stringify([...prev, sub]));
      } catch {}
      setDone(true);
    }
  };
  const back = () => { setDir(-1); setStep(s => Math.max(1, s - 1)); };

  const set = (k: keyof FormData, v: string) => setData(d => ({ ...d, [k]: v }));
  const togglePri = (p: string) => setData(d => ({
    ...d,
    priorities: d.priorities.includes(p)
      ? d.priorities.filter(x => x !== p)
      : [...d.priorities, p],
  }));

  /* ── Confirmation ── */
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
        style={{ backgroundColor: B }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center mx-auto mb-9"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              backgroundColor: 'rgba(157,126,63,0.10)',
              border: '1px solid rgba(157,126,63,0.28)',
            }}
          >
            <Check className="w-6 h-6" style={{ color: ACL }} strokeWidth={1.5} />
          </motion.div>

          <div className="text-[7.5px] uppercase tracking-[0.48em] font-bold mb-4" style={{ color: ACL }}>
            Brief Received
          </div>
          <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(32px, 6vw, 52px)', color: W, lineHeight: 1.05, marginBottom: 20 }}>
            {data.name ? `Thank you, ${data.name.split(' ')[0]}.` : 'Thank you.'}
          </h1>
          <p className="text-[13.5px] font-light leading-relaxed mx-auto mb-10"
            style={{ color: 'rgba(255,255,255,0.48)', maxWidth: '40ch' }}>
            Our team reviews your brief and reaches out within one business day to schedule your complimentary consultation.
          </p>

          <div className="mb-10" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />

          <div className="flex flex-col gap-4 text-left mb-10">
            {[
              { n: '01', t: 'Brief Review',      b: 'A senior estimator reviews your project details and preliminary scope.' },
              { n: '02', t: 'Initial Contact',   b: 'We reach out within one business day to discuss your vision.' },
              { n: '03', t: 'Site Consultation', b: 'A complimentary on-site meeting to walk the scope and answer questions.' },
            ].map(item => (
              <div key={item.n} className="flex gap-4 items-start">
                <span style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: ACL, lineHeight: 1.2, flexShrink: 0 }}>{item.n}</span>
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.t}</div>
                  <div className="text-[12.5px] font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.36)' }}>{item.b}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.14)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.48)', textDecoration: 'none',
            }}>Back to Home</Link>
            <Link to="/portfolio" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', backgroundColor: AC,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase' as const,
              color: W, textDecoration: 'none',
            }}>View Our Work</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = step / TOTAL;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F2EC' }}>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 shrink-0" style={{ backgroundColor: B }}>
        {/* Gold progress bar */}
        <div className="relative" style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: ACL }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-7 py-3">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-0.5 h-5" style={{ backgroundColor: AC }} />
            <div>
              <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase leading-none" style={{ color: W }}>HOU INC</div>
              <div className="text-[7px] tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.36)' }}>Project Brief</div>
            </div>
          </Link>
          <div className="text-[8.5px] font-semibold tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.36)' }}>
            {step} / {TOTAL}
          </div>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="shrink-0 overflow-x-auto" style={{ backgroundColor: 'rgba(10,10,10,0.03)', borderBottom: `1px solid ${BORD}` }}>
        <div className="flex" style={{ minWidth: 'max-content', padding: '0 16px' }}>
          {STEPS.map((label, i) => {
            const s = i + 1;
            const active   = s === step;
            const complete = s < step;
            return (
              <button
                key={label}
                onClick={() => { if (complete) { setDir(-1); setStep(s); } }}
                className="flex items-center gap-2 shrink-0"
                style={{
                  padding: '10px 12px', cursor: complete ? 'pointer' : 'default', background: 'none', border: 'none',
                  borderBottom: active ? `2px solid ${AC}` : '2px solid transparent',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    backgroundColor: complete ? AC : 'transparent',
                    border: complete ? `1px solid ${AC}` : active ? `1px solid ${AC}` : '1px solid rgba(0,0,0,0.18)',
                  }}
                >
                  {complete
                    ? <Check className="w-2.5 h-2.5" style={{ color: W }} strokeWidth={2.5} />
                    : <span style={{ fontSize: 8, fontWeight: 700, color: active ? AC : 'rgba(0,0,0,0.30)' }}>{s}</span>
                  }
                </div>
                <span
                  className="text-[9px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap hidden xs:inline"
                  style={{ color: active ? B : complete ? G500 : 'rgba(0,0,0,0.28)' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl w-full mx-auto px-4 sm:px-7 pt-8 sm:pt-12 pb-6">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && <StepType data={data} set={set} />}
              {step === 2 && <StepScope data={data} set={set} scopes={scopes} />}
              {step === 3 && <StepScale data={data} set={set} />}
              {step === 4 && <StepBudget data={data} set={set} />}
              {step === 5 && <StepTimeline data={data} set={set} togglePri={togglePri} />}
              {step === 6 && <StepContact data={data} set={set} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div className="shrink-0" style={{ borderTop: `1px solid ${BORD}`, backgroundColor: W }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-7 py-4 flex items-center justify-between gap-3">

          {/* Back / Cancel */}
          {step > 1 ? (
            <button
              onClick={back}
              className="flex items-center gap-2 font-bold uppercase tracking-[0.24em] text-[8.5px] shrink-0"
              style={{ padding: '10px 16px', border: `1px solid rgba(0,0,0,0.13)`, background: 'none', cursor: 'pointer', color: G500 }}
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={2} />
              <span className="hidden xs:inline">Back</span>
            </button>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-2 font-bold uppercase tracking-[0.24em] text-[8.5px] shrink-0 no-underline"
              style={{ padding: '10px 16px', border: `1px solid rgba(0,0,0,0.13)`, color: G500 }}
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={2} />
              <span className="hidden xs:inline">Cancel</span>
            </Link>
          )}

          {/* Step dots — hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 5,
                  width: i + 1 === step ? 20 : 5,
                  backgroundColor: i + 1 < step ? AC : i + 1 === step ? B : 'rgba(0,0,0,0.13)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Current step fraction on mobile */}
          <div className="flex sm:hidden items-center gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  width: i + 1 === step ? 16 : 4,
                  backgroundColor: i + 1 < step ? AC : i + 1 === step ? B : 'rgba(0,0,0,0.13)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Continue / Submit */}
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex items-center gap-2 font-bold uppercase tracking-[0.22em] text-[8.5px] shrink-0"
            style={{
              padding: '11px 20px', border: 'none', cursor: canNext() ? 'pointer' : 'not-allowed',
              backgroundColor: canNext() ? B : 'rgba(0,0,0,0.09)',
              color: canNext() ? W : 'rgba(0,0,0,0.28)',
              transition: 'background-color 0.2s ease',
            }}
          >
            <span>{step === TOTAL ? 'Submit Brief' : 'Continue'}</span>
            <ArrowRight className="w-3 h-3" strokeWidth={2} />
          </button>

        </div>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED PRIMITIVES
════════════════════════════════════════════════ */

function QHead({ eyebrow, q, sub }: { eyebrow: string; q: string; sub?: string }) {
  return (
    <div className="mb-7 sm:mb-9">
      <div className="text-[7.5px] uppercase tracking-[0.46em] font-bold mb-3" style={{ color: AC }}>
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 5vw, 46px)', color: B, lineHeight: 1.05, marginBottom: sub ? 12 : 0 }}>
        {q}
      </h2>
      {sub && <p className="text-[13px] leading-relaxed font-light" style={{ color: G500, maxWidth: '50ch' }}>{sub}</p>}
    </div>
  );
}

/* Selection card — icon left, label + desc right */
function Card({ selected, onClick, Icon, label, desc }: {
  selected: boolean; onClick: () => void;
  Icon?: React.ElementType; label: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 sm:gap-4 w-full text-left"
      style={{
        padding: '15px 16px',
        backgroundColor: selected ? B : W,
        border: selected ? `1px solid ${B}` : `1px solid ${BORD}`,
        cursor: 'pointer', position: 'relative' as const,
        transition: 'background-color 0.16s ease, border-color 0.16s ease',
      }}
    >
      {selected && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, backgroundColor: ACL }} />}

      {Icon ? (
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 34, height: 34,
            backgroundColor: selected ? 'rgba(196,167,107,0.14)' : 'rgba(0,0,0,0.04)',
            border: selected ? '1px solid rgba(196,167,107,0.28)' : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: selected ? ACL : 'rgba(0,0,0,0.38)' }} strokeWidth={1.5} />
        </div>
      ) : (
        <div
          className="flex items-center justify-center shrink-0 mt-0.5"
          style={{
            width: 18, height: 18,
            border: selected ? `1px solid ${ACL}` : '1px solid rgba(0,0,0,0.18)',
            backgroundColor: selected ? AC : 'transparent',
          }}
        >
          {selected && <Check className="w-2 h-2" style={{ color: W }} strokeWidth={2.5} />}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-tight mb-0.5" style={{ color: selected ? W : B }}>{label}</div>
        <div className="text-[11.5px] font-light leading-snug" style={{ color: selected ? 'rgba(255,255,255,0.52)' : G500 }}>{desc}</div>
      </div>
    </button>
  );
}

/* Compact tile for grids */
function Tile({ selected, onClick, main, sub }: { selected: boolean; onClick: () => void; main: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center"
      style={{
        padding: '12px 8px', cursor: 'pointer',
        backgroundColor: selected ? B : W,
        border: selected ? `1px solid ${B}` : `1px solid ${BORD}`,
        position: 'relative' as const,
        transition: 'background-color 0.16s ease',
      }}
    >
      {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: ACL }} />}
      <div className="text-[11.5px] font-semibold leading-tight" style={{ color: selected ? W : B }}>{main}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: selected ? 'rgba(255,255,255,0.48)' : G500 }}>{sub}</div>}
    </button>
  );
}

/* Text input */
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[8.5px] uppercase tracking-[0.34em] font-bold mb-2" style={{ color: AC }}>
        {label}{required && <span style={{ color: ACL, marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full outline-none text-[13px] font-light"
        style={{ padding: '12px 14px', border: `1px solid ${BORD}`, color: B, backgroundColor: W, boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════
   STEPS
════════════════════════════════════════════════ */

function StepType({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div>
      <QHead
        eyebrow="Step 1 of 6 — Project Type"
        q="What kind of project are you building?"
        sub="This routes your brief to the right specialist team."
      />
      <div className="flex flex-col gap-2.5">
        <Card selected={data.type === 'residential'} onClick={() => set('type', 'residential')} Icon={Home}     label="Residential" desc="Custom homes, luxury renovations, additions, and estate remodels" />
        <Card selected={data.type === 'commercial'}  onClick={() => set('type', 'commercial')}  Icon={Building2} label="Commercial"  desc="Office buildings, retail spaces, hospitality venues, and industrial facilities" />
      </div>
    </div>
  );
}

function StepScope({ data, set, scopes }: {
  data: FormData; scopes: typeof RES_SCOPES;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div>
      <QHead
        eyebrow="Step 2 of 6 — Project Scope"
        q={data.type === 'residential' ? 'What best describes your project?' : 'What type of commercial build is this?'}
      />
      <div className="flex flex-col gap-2.5">
        {scopes.map(s => (
          <Card key={s.value} selected={data.scope === s.value} onClick={() => set('scope', s.value)} label={s.label} desc={s.desc} />
        ))}
      </div>
    </div>
  );
}

function StepScale({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div>
      <QHead
        eyebrow="Step 3 of 6 — Scale & Location"
        q="Tell us about the scale."
        sub="Approximate numbers are fine — we refine these together."
      />

      <div className="mb-8">
        <div className="text-[8.5px] uppercase tracking-[0.34em] font-bold mb-3" style={{ color: AC }}>
          Estimated Square Footage
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SQFT_OPTS.map(opt => (
            <Tile key={opt.v} selected={data.sqft === opt.v} onClick={() => set('sqft', opt.v)} main={opt.l} sub="sq ft" />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[8.5px] uppercase tracking-[0.34em] font-bold mb-3" style={{ color: AC }}>
          Project Location
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AREAS.map(area => (
            <Tile key={area} selected={data.location === area} onClick={() => set('location', area)} main={area} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepBudget({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div>
      <QHead
        eyebrow="Step 4 of 6 — Investment Range"
        q="What is your investment range?"
        sub="Held in strict confidence. Helps us structure the right scope and team."
      />
      <div className="flex flex-col gap-2.5">
        {BUDGETS.map(b => (
          <Card key={b.v} selected={data.budget === b.v} onClick={() => set('budget', b.v)} Icon={DollarSign} label={b.l} desc={b.s} />
        ))}
      </div>
    </div>
  );
}

function StepTimeline({ data, set, togglePri }: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  togglePri: (p: string) => void;
}) {
  return (
    <div>
      <QHead eyebrow="Step 5 of 6 — Timeline" q="When are you looking to move forward?" />

      <div className="flex flex-col gap-2.5 mb-9">
        {TIMELINES.map(t => (
          <Card key={t.v} selected={data.startTimeline === t.v} onClick={() => set('startTimeline', t.v)} Icon={Clock} label={t.l} desc={t.s} />
        ))}
      </div>

      <div>
        <div className="text-[8.5px] uppercase tracking-[0.34em] font-bold mb-3" style={{ color: AC }}>
          What matters most? <span className="normal-case font-normal tracking-normal" style={{ color: 'rgba(0,0,0,0.30)', fontSize: 9.5 }}>(optional — select all that apply)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRIORITIES.map(p => {
            const on = data.priorities.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePri(p)}
                className="flex items-center gap-2.5 text-left"
                style={{
                  padding: '11px 13px', cursor: 'pointer',
                  backgroundColor: on ? 'rgba(157,126,63,0.06)' : W,
                  border: on ? `1px solid rgba(157,126,63,0.30)` : `1px solid ${BORD}`,
                  transition: 'all 0.16s ease',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 15, height: 15,
                    border: on ? `1px solid ${AC}` : '1px solid rgba(0,0,0,0.18)',
                    backgroundColor: on ? AC : 'transparent',
                  }}
                >
                  {on && <Check className="w-2 h-2" style={{ color: W }} strokeWidth={3} />}
                </div>
                <span className="text-[12px] font-medium" style={{ color: on ? B : 'rgba(10,10,10,0.60)' }}>{p}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepContact({ data, set }: { data: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div>
      <QHead
        eyebrow="Step 6 of 6 — Your Details"
        q="How should we reach you?"
        sub="Your information is private and only used to follow up on your project."
      />
      <div className="flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name"     value={data.name}  onChange={v => set('name', v)}  placeholder="Your full name"      required />
          <Field label="Email Address" type="email" value={data.email} onChange={v => set('email', v)} placeholder="you@example.com" required />
        </div>
        <Field label="Phone Number" type="tel" value={data.phone} onChange={v => set('phone', v)} placeholder="+1 (713) 000-0000" />
        <div>
          <label className="block text-[8.5px] uppercase tracking-[0.34em] font-bold mb-2" style={{ color: AC }}>
            Describe Your Vision <span className="normal-case font-normal tracking-normal" style={{ color: 'rgba(0,0,0,0.30)', fontSize: 9.5 }}>(optional)</span>
          </label>
          <textarea
            value={data.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Share any details, inspiration, special requirements, or questions about your project..."
            rows={4}
            className="w-full outline-none text-[13px] font-light leading-relaxed resize-y"
            style={{ padding: '12px 14px', border: `1px solid ${BORD}`, color: B, backgroundColor: W, boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
          />
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-3 rounded-none" style={{ padding: '13px 15px', backgroundColor: 'rgba(157,126,63,0.05)', border: '1px solid rgba(157,126,63,0.13)' }}>
          <User className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: AC }} strokeWidth={1.5} />
          <p className="text-[11.5px] font-light leading-relaxed m-0" style={{ color: G500 }}>
            Your brief is reviewed exclusively by a HOU INC senior estimator. We never share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}
