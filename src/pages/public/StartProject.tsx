import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Home, Building2,
  DollarSign, Clock, User, Phone, Mail,
  AlertCircle, Loader2, Shield, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Design tokens ─────────────────────────────────────────────── */
const DARK  = '#07060A';
const PANEL = '#FAFAF8';
const GOLD  = '#9D7E3F';
const GOLDF = '#C4A76B';
const INK   = '#0A0A0A';
const MUTED = '#8A8480';
const BDR   = 'rgba(0,0,0,0.10)';
const W     = '#FFFFFF';
const SF    = "'Cormorant Garamond', Georgia, serif";
const ERR   = '#ef4444';

/* ── Data ─────────────────────────────────────────────────────── */
const RES_SCOPES = [
  { value: 'new_home',     label: 'New Home Construction',  desc: 'Ground-up custom home build on your lot' },
  { value: 'renovation',   label: 'Major Renovation',       desc: 'Full or substantial interior & exterior overhaul' },
  { value: 'addition',     label: 'Home Addition',          desc: 'Expanding your existing living space' },
  { value: 'kitchen_bath', label: 'Kitchen & Bath Remodel', desc: 'Targeted high-impact room transformation' },
  { value: 'outdoor',      label: 'Outdoor & Landscaping',  desc: 'Pool, patio, outdoor kitchen, hardscaping' },
  { value: 'other_res',    label: 'Something Else',         desc: 'Describe your vision in the next steps' },
];
const COMM_SCOPES = [
  { value: 'office',       label: 'Office Building',          desc: 'Corporate headquarters, professional spaces, co-working' },
  { value: 'retail',       label: 'Retail & Mixed-Use',       desc: 'Storefronts, shopping centers, mixed-use developments' },
  { value: 'hospitality',  label: 'Hospitality & Restaurant', desc: 'Hotels, restaurants, entertainment venues' },
  { value: 'industrial',   label: 'Industrial & Warehouse',   desc: 'Warehousing, distribution, manufacturing facilities' },
  { value: 'medical',      label: 'Medical & Education',      desc: 'Clinics, schools, and institutional buildings' },
  { value: 'other_comm',   label: 'Something Else',           desc: 'Describe your vision in the next steps' },
];
const SQFT_OPTS = [
  { v: 'under_1500', l: 'Under 1,500' },
  { v: '1500_3000',  l: '1,500–3,000' },
  { v: '3000_5000',  l: '3,000–5,000' },
  { v: '5000_10k',   l: '5,000–10,000' },
  { v: '10k_25k',    l: '10,000–25,000' },
  { v: 'over_25k',   l: '25,000+' },
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
  { v: '1m_2.5m',   l: '$1M – $2.5M',  s: 'Luxury residential & commercial builds' },
  { v: '2.5m_5m',   l: '$2.5M – $5M',  s: 'Large-scale commercial & estate builds' },
  { v: 'over_5m',   l: '$5M+',          s: 'Flagship commercial & luxury developments' },
];
const TIMELINES = [
  { v: 'asap',   l: 'As Soon as Possible', s: 'Ready to break ground within 60 days' },
  { v: '3_6mo',  l: 'Next 3–6 Months',    s: 'Planning underway — need the right partner' },
  { v: '6_12mo', l: '6–12 Months Out',    s: 'In early planning, building out the team' },
  { v: '12plus', l: '12+ Months Out',     s: 'Exploring options and gathering estimates' },
];
const PRIORITIES = [
  'Budget certainty', 'Speed of delivery',
  'Design excellence', 'Sustainability',
  'Minimal disruption', 'Proven track record',
];
const STEPS = ['Type', 'Scope', 'Scale', 'Budget', 'Timeline', 'Contact'];
const TOTAL = STEPS.length;

/* ── Left-panel context per step ───────────────────────────────── */
const STEP_CTX = [
  { label: 'Project Classification', heading: 'Residential\nor commercial?', note: 'Routes your brief to the right specialist team.' },
  { label: 'Scope of Work',          heading: 'What are\nwe building?',       note: 'Select all that apply — many projects span categories.' },
  { label: 'Scale & Location',       heading: 'Size and\nfootprint.',         note: 'Estimates are fine — we refine these together in consultation.' },
  { label: 'Investment Range',       heading: 'Your budget\nrange.',          note: 'Held in strict confidence. Helps us assemble the right team.' },
  { label: 'Start Timeline',         heading: 'When are\nyou ready?',         note: 'Determines scheduling priority for your first meeting.' },
  { label: 'Your Details',           heading: 'How do\nwe reach you?',        note: 'Reviewed personally — never shared with third parties.' },
];

/* ── Types ─────────────────────────────────────────────────────── */
interface FormData {
  type: 'residential' | 'commercial' | '';
  scopes: string[]; sqft: string; location: string;
  budget: string; startTimeline: string;
  priorities: string[];
  name: string; email: string; phone: string; description: string;
}
const INIT: FormData = {
  type: '', scopes: [], sqft: '', location: '', budget: '',
  startTimeline: '', priorities: [],
  name: '', email: '', phone: '', description: '',
};

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
};

/* ════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════ */
export default function StartProject() {
  const [step,        setStep]        = useState(1);
  const [dir,         setDir]         = useState(1);
  const [data,        setData]        = useState<FormData>(INIT);
  const [done,        setDone]        = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  const isCommercial = data.type === 'commercial';
  const scopes = isCommercial ? COMM_SCOPES : RES_SCOPES;
  const ctx = STEP_CTX[step - 1];

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1 && !data.type) errs.type = 'Please select a project type';
    if (s === 2 && data.scopes.length === 0) errs.scope = 'Please select at least one scope';
    if (s === 3) {
      if (!data.sqft) errs.sqft = 'Please select a size';
      if (!data.location) errs.location = 'Please select a location';
    }
    if (s === 4 && !data.budget) errs.budget = 'Please select a budget range';
    if (s === 5 && !data.startTimeline) errs.timeline = 'Please select a timeline';
    if (s === 6) {
      if (!data.name.trim()) errs.name = 'Full name is required';
      if (!data.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Enter a valid email address';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canNext = () => {
    if (step === 1) return data.type !== '';
    if (step === 2) return data.scopes.length > 0;
    if (step === 3) return data.sqft !== '' && data.location !== '';
    if (step === 4) return data.budget !== '';
    if (step === 5) return data.startTimeline !== '';
    if (step === 6) return data.name.trim() !== '' && data.email.trim() !== '';
    return true;
  };

  const next = async () => {
    if (!validateStep(step)) return;
    if (step < TOTAL) { setDir(1); setStep(s => s + 1); setFieldErrors({}); }
    else {
      setSubmitting(true);
      setSubmitError('');
      try {
        const { error } = await supabase.from('start_project_submissions').insert({
          name: data.name, email: data.email, phone: data.phone || null,
          type: data.type, scope: data.scopes.join(', '), sqft: data.sqft,
          location: data.location, budget: data.budget,
          start_timeline: data.startTimeline,
          priorities: data.priorities.length > 0 ? data.priorities : null,
          description: data.description || null,
        });
        if (error) throw error;
        try {
          const sub = { id: crypto.randomUUID(), ...data, scope: data.scopes.join(', '), submittedAt: new Date().toISOString(), source: 'start-project-form' };
          const prev = JSON.parse(localStorage.getItem('hou-start-project-submissions') || '[]');
          localStorage.setItem('hou-start-project-submissions', JSON.stringify([...prev, sub]));
        } catch {}
        setDone(true);
      } catch (err: any) {
        setSubmitError(err?.message || 'Something went wrong. Please try again or call us at (281) 915-9595.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const back = () => { setDir(-1); setStep(s => Math.max(1, s - 1)); setFieldErrors({}); };
  const set  = (k: keyof FormData, v: string) => {
    setData(d => ({ ...d, [k]: v }));
    if (fieldErrors[k as string]) setFieldErrors(p => { const n = { ...p }; delete n[k as string]; return n; });
  };
  const toggleScope = (v: string) => {
    setData(d => ({ ...d, scopes: d.scopes.includes(v) ? d.scopes.filter(x => x !== v) : [...d.scopes, v] }));
    if (fieldErrors.scope) setFieldErrors(p => { const n = { ...p }; delete n.scope; return n; });
  };
  const togglePri = (p: string) => setData(d => ({
    ...d, priorities: d.priorities.includes(p) ? d.priorities.filter(x => x !== p) : [...d.priorities, p],
  }));

  /* ── Confirmation ───────────────────────────────────────────── */
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16"
        style={{ backgroundColor: DARK, backgroundImage: 'radial-gradient(circle, rgba(196,167,107,0.035) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center mx-auto mb-10"
            style={{ width: 64, height: 64, border: '1px solid rgba(196,167,107,0.32)', backgroundColor: 'rgba(196,167,107,0.08)' }}
          >
            <Check style={{ width: 22, height: 22, color: GOLDF }} strokeWidth={1.5} />
          </motion.div>

          <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.52em', fontWeight: 700, color: GOLDF, marginBottom: 16, textAlign: 'center' }}>
            Brief Received
          </div>
          <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 7vw, 56px)', color: W, lineHeight: 1.04, marginBottom: 16, textAlign: 'center' }}>
            {data.name ? `Thank you,\n${data.name.split(' ')[0]}.` : 'Thank you.'}
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.75, color: 'rgba(255,255,255,0.44)', maxWidth: '38ch', margin: '0 auto 40px', textAlign: 'center' }}>
            Our team reviews your brief and reaches out within one business day to schedule your complimentary consultation.
          </p>

          {/* Brief summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.025)', padding: '22px 24px', marginBottom: 32 }}
          >
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700, color: 'rgba(255,255,255,0.26)', marginBottom: 16 }}>Brief Summary</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Project Type', data.type === 'residential' ? 'Residential' : 'Commercial'],
                ['Scope', data.scopes.map(s => s.replace(/_/g, ' ')).join(', ') || '—'],
                ['Size', SQFT_OPTS.find(o => o.v === data.sqft)?.l ? SQFT_OPTS.find(o => o.v === data.sqft)!.l + ' sq ft' : '—'],
                ['Location', data.location || '—'],
                ['Budget', BUDGETS.find(b => b.v === data.budget)?.l || '—'],
                ['Timeline', TIMELINES.find(t => t.v === data.startTimeline)?.l || '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: 'rgba(255,255,255,0.22)', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Next steps */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 28, marginBottom: 36 }}>
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.4em', fontWeight: 700, color: 'rgba(255,255,255,0.26)', marginBottom: 20 }}>What Happens Next</div>
            {[
              { n: '01', t: 'Brief Review',      b: 'A senior estimator reviews your project details and preliminary scope.' },
              { n: '02', t: 'Initial Contact',   b: 'We reach out within one business day to discuss your vision.' },
              { n: '03', t: 'Site Consultation', b: 'Complimentary on-site walkthrough to assess scope and answer questions.' },
            ].map(item => (
              <div key={item.n} className="flex gap-4 items-start mb-5 last:mb-0">
                <span style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 20, color: GOLDF, lineHeight: 1.1, flexShrink: 0, minWidth: 28 }}>{item.n}</span>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{item.t}</div>
                  <div style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.65, color: 'rgba(255,255,255,0.32)' }}>{item.b}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 24px', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.42)', textDecoration: 'none',
            }}>Back to Home</Link>
            <Link to="/portfolio" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 24px', backgroundColor: GOLD,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const,
              color: W, textDecoration: 'none',
            }}>
              View Our Work <ChevronRight style={{ width: 12, height: 12 }} strokeWidth={2.5} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = step / TOTAL;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">

      {/* ═══ LEFT SIDEBAR — desktop only ═══════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[360px] xl:w-[400px] shrink-0 relative overflow-hidden"
        style={{ backgroundColor: DARK, height: '100vh', position: 'sticky', top: 0 }}>

        {/* Texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />
        {/* Warm glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 60%, rgba(157,126,63,0.07) 0%, transparent 60%)',
        }} />
        {/* Gold hairline top */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.5 }} />

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-12 py-10">

          {/* Brand */}
          <Link to="/" className="inline-flex items-center gap-3 select-none shrink-0">
            <div style={{ width: 2, height: 26, backgroundColor: GOLD }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.42em', textTransform: 'uppercase', color: '#FAF8F4', fontFamily: SF }}>Houston Enterprise</div>
              <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 600, color: GOLDF, marginTop: 2 }}>Project Brief</div>
            </div>
          </Link>

          {/* Step context — center */}
          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.46em', fontWeight: 700, color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
                  {ctx.label}
                </div>
                <div style={{ fontFamily: SF, fontSize: 'clamp(36px, 3.2vw, 52px)', fontStyle: 'italic', fontWeight: 300, color: GOLDF, lineHeight: 1, marginBottom: 6 }}>
                  {String(step).padStart(2, '0')}
                </div>
                <h2 style={{
                  fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                  fontSize: 'clamp(28px, 2.6vw, 40px)', color: '#FAF8F4',
                  lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 18,
                  whiteSpace: 'pre-line',
                }}>
                  {ctx.heading}
                </h2>
                <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.72, color: 'rgba(255,255,255,0.3)', maxWidth: '28ch' }}>
                  {ctx.note}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots + bottom */}
          <div className="shrink-0">
            {/* Step dots */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((_, i) => {
                const s = i + 1;
                const done = s < step;
                const active = s === step;
                return (
                  <button key={i} onClick={() => { if (done) { setDir(-1); setStep(s); } }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: done ? 'pointer' : 'default' }}>
                    <div style={{
                      width: active ? 28 : done ? 8 : 6,
                      height: 2,
                      backgroundColor: active ? GOLDF : done ? 'rgba(196,167,107,0.5)' : 'rgba(255,255,255,0.12)',
                      transition: 'all 0.3s ease',
                    }} />
                  </button>
                );
              })}
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.24)', marginLeft: 4 }}>{step} / {TOTAL}</span>
            </div>

            {/* Trust signals */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              {['Texas Licensed & Fully Insured', 'A+ BBB Accredited  ·  Est. 1998', '$50M+ Bonding Capacity'].map(line => (
                <div key={line} style={{ fontSize: 9.5, fontWeight: 400, color: 'rgba(255,255,255,0.18)', marginBottom: 6, letterSpacing: '0.02em' }}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ RIGHT PANEL ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden">

        {/* Mobile header — sticky */}
        <header className="lg:hidden shrink-0 sticky top-0 z-40" style={{ backgroundColor: DARK }}>
          {/* Gold progress bar */}
          <div style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative' }}>
            <motion.div
              style={{ position: 'absolute', inset: '0 auto 0 0', backgroundColor: GOLDF }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
              <div style={{ width: 2, height: 20, backgroundColor: GOLD }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.38em', textTransform: 'uppercase', color: '#FAF8F4', fontFamily: SF, lineHeight: 1 }}>Houston Enterprise</div>
                <div style={{ fontSize: 6.5, textTransform: 'uppercase', letterSpacing: '0.38em', fontWeight: 600, color: GOLDF, marginTop: 1.5 }}>Project Brief</div>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <a href="tel:+12819159595" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}>
                <Phone style={{ width: 11, height: 11 }} strokeWidth={2} />
                <span className="hidden sm:inline">(281) 915-9595</span>
              </a>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>{step}/{TOTAL}</div>
            </div>
          </div>
          {/* Mobile step label */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px' }}>
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.38em', fontWeight: 700, color: GOLDF }}>
              {ctx.label}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" ref={contentRef} style={{ backgroundColor: PANEL }}>
          <div className="w-full max-w-[560px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-12 pb-4">

            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 1 && <StepType data={data} set={set} fieldErrors={fieldErrors} onNext={() => { setDir(1); setStep(2); setFieldErrors({}); }} />}
                {step === 2 && <StepScope data={data} toggleScope={toggleScope} scopes={scopes} fieldErrors={fieldErrors} />}
                {step === 3 && <StepScale data={data} set={set} fieldErrors={fieldErrors} />}
                {step === 4 && <StepBudget data={data} set={set} fieldErrors={fieldErrors} />}
                {step === 5 && <StepTimeline data={data} set={set} togglePri={togglePri} fieldErrors={fieldErrors} />}
                {step === 6 && <StepContact data={data} set={set} fieldErrors={fieldErrors} scopes={scopes} SQFT_OPTS={SQFT_OPTS} BUDGETS={BUDGETS} TIMELINES={TIMELINES} />}
              </motion.div>
            </AnimatePresence>

            {submitError && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-4 flex items-start gap-3"
                style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <AlertCircle style={{ width: 15, height: 15, color: ERR, flexShrink: 0, marginTop: 1 }} strokeWidth={1.5} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: ERR, marginBottom: 2 }}>Submission Error</div>
                  <p style={{ fontSize: 11, fontWeight: 300, color: MUTED, margin: 0 }}>{submitError}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Bottom navigation bar ── */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', backgroundColor: W }}>
          <div className="max-w-[560px] mx-auto px-5 sm:px-8 lg:px-10 py-4 flex items-center justify-between gap-4">

            {/* Back / Cancel */}
            {step > 1 ? (
              <button onClick={back}
                className="flex items-center gap-2 shrink-0"
                style={{
                  padding: '12px 18px', fontSize: 9, fontWeight: 700, letterSpacing: '0.24em',
                  textTransform: 'uppercase', color: MUTED, border: `1px solid rgba(0,0,0,0.12)`,
                  background: 'none', cursor: 'pointer',
                }}>
                <ArrowLeft style={{ width: 12, height: 12 }} strokeWidth={2.5} />
                <span>Back</span>
              </button>
            ) : (
              <Link to="/"
                className="flex items-center gap-2 shrink-0 no-underline"
                style={{
                  padding: '12px 18px', fontSize: 9, fontWeight: 700, letterSpacing: '0.24em',
                  textTransform: 'uppercase', color: MUTED, border: `1px solid rgba(0,0,0,0.12)`,
                }}>
                <ArrowLeft style={{ width: 12, height: 12 }} strokeWidth={2.5} />
                <span>Cancel</span>
              </Link>
            )}

            {/* Pip dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <div key={i} style={{
                  height: 3, width: i + 1 === step ? 20 : i + 1 < step ? 8 : 6,
                  backgroundColor: i + 1 < step ? GOLD : i + 1 === step ? INK : 'rgba(0,0,0,0.12)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>

            {/* Next / Submit */}
            <button onClick={next} disabled={!canNext() || submitting}
              className="flex items-center gap-2 shrink-0"
              style={{
                padding: '12px 22px', fontSize: 9, fontWeight: 700, letterSpacing: '0.24em',
                textTransform: 'uppercase', border: 'none', cursor: canNext() && !submitting ? 'pointer' : 'not-allowed',
                backgroundColor: canNext() && !submitting ? (step === TOTAL ? GOLD : INK) : 'rgba(0,0,0,0.08)',
                color: canNext() && !submitting ? W : 'rgba(0,0,0,0.24)',
                transition: 'background-color 0.2s ease',
              }}>
              {submitting
                ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" strokeWidth={2} /><span>Submitting…</span></>
                : <><span>{step === TOTAL ? 'Submit Brief' : 'Continue'}</span><ArrowRight style={{ width: 12, height: 12 }} strokeWidth={2.5} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SHARED PRIMITIVES
════════════════════════════════════════════════ */

function QHead({ q, sub }: { q: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
        fontSize: 'clamp(26px, 5vw, 40px)', color: INK,
        lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: sub ? 10 : 0,
      }}>
        {q}
      </h2>
      {sub && <p style={{ fontSize: 13.5, lineHeight: 1.7, fontWeight: 300, color: MUTED, maxWidth: '46ch', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Card({ selected, onClick, Icon, label, desc, error }: {
  selected: boolean; onClick: () => void;
  Icon?: React.ElementType; label: string; desc: string; error?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-4 w-full text-left"
      style={{
        padding: '18px 20px',
        minHeight: 72,
        backgroundColor: selected ? INK : hov ? 'rgba(0,0,0,0.022)' : W,
        border: error ? `1px solid ${ERR}` : selected ? `1px solid ${INK}` : hov ? '1px solid rgba(0,0,0,0.26)' : `1px solid ${BDR}`,
        cursor: 'pointer',
        position: 'relative' as const,
        transition: 'background-color 0.18s ease, border-color 0.18s ease',
      }}>
      {selected && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, backgroundColor: GOLDF }} />}
      {Icon ? (
        <div className="flex items-center justify-center shrink-0" style={{
          width: 38, height: 38,
          backgroundColor: selected ? 'rgba(196,167,107,0.12)' : 'rgba(0,0,0,0.04)',
          border: selected ? '1px solid rgba(196,167,107,0.28)' : '1px solid rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}>
          <Icon style={{ width: 15, height: 15, color: selected ? GOLDF : 'rgba(0,0,0,0.36)' }} strokeWidth={1.5} />
        </div>
      ) : (
        <div className="flex items-center justify-center shrink-0" style={{
          width: 20, height: 20, flexShrink: 0,
          border: error ? `1px solid ${ERR}` : selected ? `1px solid ${GOLDF}` : '1px solid rgba(0,0,0,0.18)',
          backgroundColor: selected ? GOLD : 'transparent',
        }}>
          {selected && <Check style={{ width: 10, height: 10, color: W }} strokeWidth={2.5} />}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: selected ? W : INK, lineHeight: 1.3, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 300, color: selected ? 'rgba(255,255,255,0.52)' : MUTED, lineHeight: 1.5 }}>{desc}</div>
      </div>
      {selected && (
        <div className="shrink-0" style={{ width: 18, height: 18, backgroundColor: 'rgba(196,167,107,0.16)', border: '1px solid rgba(196,167,107,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check style={{ width: 9, height: 9, color: GOLDF }} strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}

function Tile({ selected, onClick, main, sub, error }: {
  selected: boolean; onClick: () => void; main: string; sub?: string; error?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full text-center"
      style={{
        padding: '14px 10px',
        minHeight: 58,
        cursor: 'pointer',
        backgroundColor: selected ? INK : hov ? 'rgba(0,0,0,0.022)' : W,
        border: error ? `1px solid ${ERR}` : selected ? `1px solid ${INK}` : hov ? '1px solid rgba(0,0,0,0.26)' : `1px solid ${BDR}`,
        position: 'relative' as const,
        transition: 'background-color 0.18s ease, border-color 0.18s ease',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
      {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLDF }} />}
      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? W : INK, lineHeight: 1.25 }}>{main}</div>
      {sub && <div style={{ fontSize: 9.5, marginTop: 2, color: selected ? 'rgba(255,255,255,0.48)' : MUTED, fontWeight: 400 }}>{sub}</div>}
    </button>
  );
}

function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, error, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; required?: boolean; error?: string; icon?: React.ElementType;
}) {
  const [focused, setFocused] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(type === 'tel' ? fmtPhone(e.target.value) : e.target.value);
  };
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.36em',
        fontWeight: 700, color: error ? ERR : GOLD, marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: GOLDF, marginLeft: 4 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? GOLD : 'rgba(0,0,0,0.22)' }}>
            <Icon style={{ width: 14, height: 14 }} strokeWidth={1.5} />
          </div>
        )}
        <input
          type={type} value={value} onChange={handleChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined}
          inputMode={type === 'tel' ? 'tel' : undefined}
          style={{
            width: '100%', padding: Icon ? '14px 14px 14px 38px' : '14px 16px',
            fontSize: 14, fontWeight: 300, color: INK, backgroundColor: W,
            border: error ? `1px solid ${ERR}` : focused ? `1px solid ${GOLD}` : `1px solid rgba(0,0,0,0.14)`,
            outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
            transition: 'border-color 0.2s ease',
          }} />
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 500, color: ERR }}>
          {error}
        </motion.p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   STEPS
════════════════════════════════════════════════ */

function StepType({ data, set, fieldErrors, onNext }: {
  data: FormData; set: (k: keyof FormData, v: string) => void;
  fieldErrors: Record<string, string>; onNext?: () => void;
}) {
  const handleSelect = (val: string) => { set('type', val); setTimeout(() => onNext?.(), 260); };
  return (
    <div>
      <QHead q="What kind of project are you building?" sub="This routes your brief to the right specialist team." />
      {fieldErrors.type && <Err>{fieldErrors.type}</Err>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card selected={data.type === 'residential'} onClick={() => handleSelect('residential')} Icon={Home}
          label="Residential" desc="Custom homes, luxury renovations, additions, and estate remodels" error={!!fieldErrors.type} />
        <Card selected={data.type === 'commercial'} onClick={() => handleSelect('commercial')} Icon={Building2}
          label="Commercial" desc="Office buildings, retail spaces, hospitality venues, and industrial facilities" error={!!fieldErrors.type} />
      </div>
    </div>
  );
}

function StepScope({ data, toggleScope, scopes, fieldErrors }: {
  data: FormData; toggleScope: (v: string) => void;
  scopes: typeof RES_SCOPES; fieldErrors: Record<string, string>;
}) {
  return (
    <div>
      <QHead q={data.type === 'residential' ? 'What best describes your project?' : 'What type of commercial build is this?'}
        sub={data.scopes.length > 1 ? `${data.scopes.length} selected` : 'You may select multiple if your project spans categories.'} />
      {fieldErrors.scope && <Err>{fieldErrors.scope}</Err>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scopes.map(s => (
          <Card key={s.value} selected={data.scopes.includes(s.value)} onClick={() => toggleScope(s.value)}
            label={s.label} desc={s.desc} error={!!fieldErrors.scope} />
        ))}
      </div>
    </div>
  );
}

function StepScale({ data, set, fieldErrors }: {
  data: FormData; set: (k: keyof FormData, v: string) => void; fieldErrors: Record<string, string>;
}) {
  return (
    <div>
      <QHead q="Tell us about the scale." sub="Approximate numbers are fine — we refine these together." />
      <div style={{ marginBottom: 28 }}>
        <SectionLabel error={!!fieldErrors.sqft}>Estimated Square Footage {fieldErrors.sqft && <ErrInline>{fieldErrors.sqft}</ErrInline>}</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SQFT_OPTS.map(opt => (
            <Tile key={opt.v} selected={data.sqft === opt.v} onClick={() => set('sqft', opt.v)}
              main={opt.l} sub="sq ft" error={!!fieldErrors.sqft} />
          ))}
        </div>
      </div>
      <div>
        <SectionLabel error={!!fieldErrors.location}>Project Location {fieldErrors.location && <ErrInline>{fieldErrors.location}</ErrInline>}</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AREAS.map(area => (
            <Tile key={area} selected={data.location === area} onClick={() => set('location', area)}
              main={area} error={!!fieldErrors.location} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepBudget({ data, set, fieldErrors }: {
  data: FormData; set: (k: keyof FormData, v: string) => void; fieldErrors: Record<string, string>;
}) {
  return (
    <div>
      <QHead q="What is your investment range?" sub="Held in strict confidence. Helps us structure the right scope and team." />
      {fieldErrors.budget && <Err>{fieldErrors.budget}</Err>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {BUDGETS.map(b => (
          <Card key={b.v} selected={data.budget === b.v} onClick={() => set('budget', b.v)}
            Icon={DollarSign} label={b.l} desc={b.s} error={!!fieldErrors.budget} />
        ))}
      </div>
    </div>
  );
}

function StepTimeline({ data, set, togglePri, fieldErrors }: {
  data: FormData; set: (k: keyof FormData, v: string) => void; togglePri: (p: string) => void;
  fieldErrors: Record<string, string>;
}) {
  return (
    <div>
      <QHead q="When are you looking to move forward?" />
      {fieldErrors.timeline && <Err>{fieldErrors.timeline}</Err>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {TIMELINES.map(t => (
          <Card key={t.v} selected={data.startTimeline === t.v} onClick={() => set('startTimeline', t.v)}
            Icon={Clock} label={t.l} desc={t.s} error={!!fieldErrors.timeline} />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD, marginBottom: 4 }}>
          What matters most?
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 300, color: MUTED, marginBottom: 14 }}>
          Optional — select all that apply.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRIORITIES.map(p => {
            const on = data.priorities.includes(p);
            return <PriorityChip key={p} label={p} on={on} onToggle={() => togglePri(p)} />;
          })}
        </div>
      </div>
    </div>
  );
}

function PriorityChip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-3 text-left w-full"
      style={{
        padding: '13px 14px',
        cursor: 'pointer',
        backgroundColor: on ? 'rgba(157,126,63,0.07)' : hov ? 'rgba(0,0,0,0.02)' : W,
        border: on ? `1px solid rgba(157,126,63,0.32)` : hov ? '1px solid rgba(0,0,0,0.24)' : `1px solid ${BDR}`,
        transition: 'all 0.18s ease',
      }}>
      <div className="flex items-center justify-center shrink-0" style={{
        width: 18, height: 18,
        border: on ? `1px solid ${GOLD}` : '1px solid rgba(0,0,0,0.18)',
        backgroundColor: on ? GOLD : 'transparent',
        transition: 'all 0.18s ease',
      }}>
        {on && <Check style={{ width: 10, height: 10, color: W }} strokeWidth={2.5} />}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: on ? INK : 'rgba(10,10,10,0.58)', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

function StepContact({ data, set, fieldErrors, scopes, SQFT_OPTS: sqftOpts, BUDGETS: budgets, TIMELINES: timelines }: {
  data: FormData; set: (k: keyof FormData, v: string) => void;
  fieldErrors: Record<string, string>;
  scopes: typeof RES_SCOPES; SQFT_OPTS: typeof SQFT_OPTS; BUDGETS: typeof BUDGETS; TIMELINES: typeof TIMELINES;
}) {
  return (
    <div>
      <QHead q="How should we reach you?" sub="Your information is private and only used to follow up on your project." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={data.name} onChange={v => set('name', v)} placeholder="Your full name" required error={fieldErrors.name} icon={User} />
          <Field label="Email Address" type="email" value={data.email} onChange={v => set('email', v)} placeholder="you@example.com" required error={fieldErrors.email} icon={Mail} />
        </div>
        <Field label="Phone Number" type="tel" value={data.phone} onChange={v => set('phone', v)} placeholder="+1 (713) 000-0000" icon={Phone} />

        <div>
          <label style={{ display: 'block', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD, marginBottom: 8 }}>
            Describe Your Vision <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 300, color: MUTED, fontSize: 11 }}>(optional)</span>
          </label>
          <textarea value={data.description} onChange={e => set('description', e.target.value)}
            placeholder="Share any details, inspiration, special requirements, or questions about your project…"
            rows={4}
            style={{
              width: '100%', padding: '14px 16px',
              fontSize: 14, fontWeight: 300, lineHeight: 1.6, color: INK,
              border: `1px solid rgba(0,0,0,0.14)`, backgroundColor: W,
              outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const,
            }} />
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 8, color: 'rgba(0,0,0,0.22)' }}>{data.description.length} / 2000</div>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-3" style={{ padding: '14px 16px', backgroundColor: 'rgba(157,126,63,0.045)', border: '1px solid rgba(157,126,63,0.14)' }}>
          <Shield style={{ width: 14, height: 14, color: GOLD, flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.65, color: MUTED, margin: 0 }}>
              Your brief is reviewed exclusively by a Houston Enterprise senior estimator. We never share your information with third parties.
            </p>
            <p style={{ fontSize: 10.5, fontWeight: 300, marginTop: 6, margin: '6px 0 0', color: 'rgba(0,0,0,0.28)' }}>
              Need help? Call <a href="tel:+12819159595" style={{ color: GOLD, textDecoration: 'none' }}>(281) 915-9595</a>
            </p>
          </div>
        </div>

        {/* Brief summary */}
        <div style={{ padding: '18px 20px', backgroundColor: W, border: `1px solid rgba(0,0,0,0.09)` }}>
          <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: MUTED, marginBottom: 14 }}>Your Brief So Far</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Type', data.type === 'residential' ? 'Residential' : 'Commercial'],
              ['Scope', data.scopes.map(s => scopes.find(x => x.value === s)?.label || s).join(', ') || '—'],
              ['Size', sqftOpts.find(o => o.v === data.sqft)?.l ? sqftOpts.find(o => o.v === data.sqft)!.l + ' sq ft' : '—'],
              ['Location', data.location || '—'],
              ['Budget', budgets.find(b => b.v === data.budget)?.l || '—'],
              ['Timeline', timelines.find(t => t.v === data.startTimeline)?.l || '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: INK, lineHeight: 1.4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Micro helpers ──────────────────────────────────────────────── */
function Err({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10.5, fontWeight: 500, color: ERR, marginBottom: 12, marginTop: -4 }}>{children}</p>;
}
function ErrInline({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 9, fontWeight: 500, color: ERR, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>{children}</span>;
}
function SectionLabel({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: error ? ERR : GOLD, marginBottom: 12 }}>
      {children}
    </div>
  );
}
