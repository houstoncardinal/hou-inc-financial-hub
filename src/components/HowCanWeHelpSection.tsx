import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Building2, ClipboardList,
  ArrowRight, ChevronLeft, Check, Loader2, CheckCircle2,
  HardHat, Ruler, ShieldCheck, CalendarCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const CR   = '#F5F2EC';
const G200 = '#E5DFD6';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SF   = "'Cormorant Garamond', Georgia, serif";

/* ── Types ───────────────────────────────────────────────────────────── */
type ProjectType = 'residential' | 'commercial' | 'project_management';

type StepData = {
  type: ProjectType | null;
  scope: string; stage: string; sqft: string; pmHelp: string;
  location: string; description: string;
  budget: string; timeline: string;
  name: string; email: string; phone: string;
};

/* ── Form option data ────────────────────────────────────────────────── */
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
const PM_HELP_OPTIONS  = ['Full Project Management', 'Partial Oversight', 'Consulting Only'];
const BUDGET_OPTIONS   = ['Under $500K', '$500K – $1M', '$1M – $5M', '$5M – $10M', '$10M+', 'Not Sure'];
const TIMELINE_OPTIONS = ['ASAP (Within 3 months)', '3–6 Months', '6–12 Months', '1–2 Years', 'Just Planning'];
const SCOPE_LABEL: Record<ProjectType, string>  = { residential: 'Project Type', commercial: 'Building Type', project_management: 'Project Category' };
const STAGE_LABEL: Record<ProjectType, string>  = { residential: 'Project Stage', commercial: 'Project Stage', project_management: 'Current Stage' };

/* ── Hover-panel rich content ────────────────────────────────────────── */
type PanelData = {
  eyebrow: string;
  headline: string[];
  body: string;
  image: string;
  stats: { val: string; label: string }[];
  services: { Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>; name: string }[];
  feat: { name: string; sub: string };
  ctaLabel: string;
  linkLabel: string;
  linkTo: string;
};

const PANELS: Record<ProjectType, PanelData> = {
  residential: {
    eyebrow: '01 · Residential Construction',
    headline: ['Built for the', 'way you live.'],
    body: "We've built over 150 custom homes in Houston's finest neighborhoods — from intimate renovations to sprawling estates. Every project begins with a conversation and ends with a home you'll never want to leave.",
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=85',
    stats: [
      { val: '150+', label: 'Custom Homes Built' },
      { val: '20+',  label: 'Years in Houston' },
      { val: '4.9★', label: 'Client Rating' },
    ],
    services: [
      { Icon: HardHat,        name: 'Custom Home Construction' },
      { Icon: Ruler,          name: 'Renovation & Remodel' },
      { Icon: Home,           name: 'Additions & Expansions' },
      { Icon: ShieldCheck,    name: 'Kitchen & Bath' },
      { Icon: CalendarCheck,  name: 'Exterior Upgrades' },
    ],
    feat: { name: 'Chambord Estate', sub: 'River Oaks · 14,500 SF · 2024' },
    ctaLabel: 'Start My Home Project',
    linkLabel: 'View Residential Work',
    linkTo: '/portfolio',
  },
  commercial: {
    eyebrow: '02 · Commercial Construction',
    headline: ['Infrastructure', 'built to perform.'],
    body: "From corporate campuses to mixed-use towers, HOU INC brings precision planning and proven execution to every commercial project in the Greater Houston market — on schedule, within budget, to spec.",
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85',
    stats: [
      { val: '2M+',   label: 'Sq Ft Delivered' },
      { val: '$200M+', label: 'Projects Completed' },
      { val: '100%',  label: 'On-Time Rate' },
    ],
    services: [
      { Icon: Building2,      name: 'Office Buildings' },
      { Icon: HardHat,        name: 'Retail & Mixed-Use' },
      { Icon: Ruler,          name: 'Industrial / Warehouse' },
      { Icon: ShieldCheck,    name: 'Hospitality & Hotels' },
      { Icon: CalendarCheck,  name: 'Educational Facilities' },
    ],
    feat: { name: 'Chronicle Tower', sub: 'Midtown · 148,000 SF · 2022' },
    ctaLabel: 'Request a Commercial Proposal',
    linkLabel: 'View Commercial Work',
    linkTo: '/portfolio',
  },
  project_management: {
    eyebrow: '03 · Project Management',
    headline: ['Your project.', 'Perfectly executed.'],
    body: "A single dedicated project manager from day one through delivery. We control schedules, vendors, costs, and quality — so you can focus on what matters. Whether stepping in at pre-construction or rescuing a troubled build.",
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85',
    stats: [
      { val: '100%', label: 'Projects Delivered' },
      { val: 'Zero', label: 'Budget Overruns' },
      { val: 'Day 1', label: 'PM Assigned' },
    ],
    services: [
      { Icon: ClipboardList,  name: 'Full Project Management' },
      { Icon: CalendarCheck,  name: 'Pre-Construction Planning' },
      { Icon: ShieldCheck,    name: 'Budget & Cost Control' },
      { Icon: Ruler,          name: 'Risk Management' },
      { Icon: HardHat,        name: 'Consulting & Oversight' },
    ],
    feat: { name: 'Westway Commerce Campus', sub: 'Energy Corridor · 212,000 SF · 2024' },
    ctaLabel: 'Get a Project Assessment',
    linkLabel: 'Meet Our PM Team',
    linkTo: '/about',
  },
};

/* ── Type card config ────────────────────────────────────────────────── */
const TYPE_CARDS: {
  key: ProjectType;
  Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>;
  title: string;
  desc: string;
  num: string;
}[] = [
  { key: 'residential',        Icon: Home,          title: 'Residential',       desc: 'Custom homes, renovations & remodels',         num: '01' },
  { key: 'commercial',         Icon: Building2,     title: 'Commercial',         desc: 'Office, retail, industrial & mixed-use',       num: '02' },
  { key: 'project_management', Icon: ClipboardList, title: 'Project Management', desc: 'Expert oversight for any construction project', num: '03' },
];

/* ── Netlify encode ──────────────────────────────────────────────────── */
const encodeForm = (data: Record<string, string>) =>
  Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');

/* ── Small helpers ───────────────────────────────────────────────────── */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 32, height: 1, backgroundColor: AC, flexShrink: 0 }} />
      <span style={{ color: AC, fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

function OptionBtn({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      border: `1px solid ${selected ? AC : G200}`,
      backgroundColor: selected ? 'rgba(157,126,63,0.05)' : W,
      color: selected ? AC : G500,
      fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
      textAlign: 'left', width: '100%',
      transition: 'border-color 0.18s, background-color 0.18s, color 0.18s',
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${selected ? AC : G200}`,
        backgroundColor: selected ? AC : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s',
      }}>
        {selected && <Check style={{ width: 8, height: 8, color: W }} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function FInput({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 8 }}>
        {label}{required && ' *'}
      </label>
      <div style={{ position: 'relative' }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{ width: '100%', backgroundColor: '#F7F7F6', border: `1px solid ${focused ? B : G200}`, borderRadius: 0, padding: '0.85rem 1rem', fontSize: 12, fontFamily: 'inherit', color: B, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} />
        <motion.div animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.3 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: B, transformOrigin: 'left' }} />
      </div>
    </div>
  );
}

function FTextarea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 8 }}>
        {label}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} rows={4}
        style={{ width: '100%', backgroundColor: '#F7F7F6', border: `1px solid ${focused ? B : G200}`, borderRadius: 0, padding: '0.85rem 1rem', fontSize: 12, fontFamily: 'inherit', color: B, outline: 'none', resize: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} />
    </div>
  );
}

/* ── Hover Info Panel ────────────────────────────────────────────────── */
function HoverInfoPanel({ type, onSelect }: { type: ProjectType; onSelect: (t: ProjectType) => void }) {
  const p = PANELS[type];

  const itemVar = {
    hidden: { opacity: 0, y: 22 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: 0.06 + i * 0.07, duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  const statVar = {
    hidden: { opacity: 0, scale: 0.75, y: 10 },
    visible: (i: number) => ({
      opacity: 1, scale: 1, y: 0,
      transition: { delay: 0.22 + i * 0.09, duration: 0.5, ease: [0.34, 1.4, 0.64, 1] as const },
    }),
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.32, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.15 } } }}
      transition={{ height: { duration: 0.52, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.25, delay: 0.08 } }}
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <div style={{ position: 'relative', backgroundColor: B, overflow: 'hidden' }}>
        {/* Subtle grid */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

        {/* Gold sweep line top */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: AC, transformOrigin: 'left', zIndex: 10 }}
        />

        {/* Scan sweep effect */}
        <motion.div
          initial={{ y: 0, opacity: 0.6 }}
          animate={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.7, ease: 'linear', delay: 0.05 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: `linear-gradient(transparent, ${ACL}, transparent)`, pointerEvents: 'none', zIndex: 9 }}
        />

        {/* Ambient glow */}
        <div aria-hidden style={{ position: 'absolute', top: 0, right: '10%', width: '40%', height: '60%', background: 'radial-gradient(ellipse at top right, rgba(157,126,63,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-8 md:px-14" style={{ paddingTop: 52, paddingBottom: 52 }}>
          <div style={{ display: 'flex', gap: 64, alignItems: 'flex-start' }}>

            {/* ── LEFT: content ───────────────────────────────── */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>

              {/* Eyebrow */}
              <motion.div custom={0} variants={itemVar} initial="hidden" animate="visible"
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 24, height: 1, backgroundColor: AC }} />
                <span style={{ fontSize: 8, letterSpacing: '0.44em', textTransform: 'uppercase', fontWeight: 700, color: ACL }}>
                  {p.eyebrow}
                </span>
              </motion.div>

              {/* Headline */}
              <div style={{ marginBottom: 20 }}>
                {p.headline.map((line, i) => (
                  <motion.div key={i} custom={i + 1} variants={itemVar} initial="hidden" animate="visible">
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(32px,3.5vw,52px)', color: W, lineHeight: 1.05 }}>
                      {line}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Body */}
              <motion.p custom={3} variants={itemVar} initial="hidden" animate="visible"
                style={{ fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.48)', lineHeight: 1.75, marginBottom: 32, maxWidth: 420 }}>
                {p.body}
              </motion.p>

              {/* Stats */}
              <motion.div custom={4} variants={itemVar} initial="hidden" animate="visible"
                style={{ display: 'flex', gap: 0, marginBottom: 32, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, paddingBottom: 20 }}>
                {p.stats.map((s, i) => (
                  <motion.div key={s.label} custom={i} variants={statVar} initial="hidden" animate="visible"
                    style={{ flex: 1, paddingRight: 24, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none', paddingLeft: i > 0 ? 24 : 0 }}>
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontSize: 'clamp(22px,2.2vw,32px)', color: ACL, fontWeight: 300, lineHeight: 1, marginBottom: 6 }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Services */}
              <motion.div custom={5} variants={itemVar} initial="hidden" animate="visible"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 36 }}>
                {p.services.map(({ Icon, name }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon style={{ width: 12, height: 12, color: AC, flexShrink: 0 }} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div custom={6} variants={itemVar} initial="hidden" animate="visible"
                style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

                {/* Primary CTA */}
                <motion.button
                  type="button"
                  onClick={() => onSelect(type)}
                  whileHover={{ backgroundColor: ACL }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '13px 28px', backgroundColor: AC, color: W,
                    border: 'none', cursor: 'pointer',
                    fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800,
                  }}
                >
                  {p.ctaLabel}
                  <ArrowRight style={{ width: 13, height: 13 }} strokeWidth={2.5} />
                </motion.button>

                {/* Secondary link */}
                <Link
                  to={p.linkTo}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = ACL)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)')}
                >
                  {p.linkLabel}
                  <ArrowRight style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                </Link>
              </motion.div>
            </div>

            {/* ── RIGHT: featured image ────────────────────────────── */}
            <motion.div
              custom={2}
              variants={itemVar}
              initial="hidden"
              animate="visible"
              style={{ width: 340, flexShrink: 0, position: 'relative', height: 380, overflow: 'hidden' }}
              className="hidden lg:block"
            >
              {/* Corner brackets */}
              {[
                { top: -1, left: -1, borderTop: `1.5px solid ${AC}`, borderLeft: `1.5px solid ${AC}` },
                { top: -1, right: -1, borderTop: `1.5px solid ${AC}`, borderRight: `1.5px solid ${AC}` },
                { bottom: -1, left: -1, borderBottom: `1.5px solid ${AC}`, borderLeft: `1.5px solid ${AC}` },
                { bottom: -1, right: -1, borderBottom: `1.5px solid ${AC}`, borderRight: `1.5px solid ${AC}` },
              ].map((s, i) => (
                <span key={i} aria-hidden style={{ position: 'absolute', width: 16, height: 16, zIndex: 4, ...s }} />
              ))}

              {/* Image with clip-path reveal */}
              <motion.div
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ duration: 0.72, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${p.image})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}
              />

              {/* Gradient overlay */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(8,6,4,0.95) 0%, rgba(8,6,4,0.2) 55%, transparent 100%)',
                zIndex: 2,
              }} />

              {/* Project label */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 22px', zIndex: 3 }}
              >
                <div style={{ fontSize: 7, letterSpacing: '0.38em', textTransform: 'uppercase', color: ACL, marginBottom: 5, fontWeight: 700 }}>
                  Featured Project
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: W, lineHeight: 1.1, marginBottom: 3 }}>
                  {p.feat.name}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
                  {p.feat.sub}
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Step animation ──────────────────────────────────────────────────── */
const stepVar = {
  enter:  { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ── Main export ─────────────────────────────────────────────────────── */
export default function HowCanWeHelpSection() {
  const [step, setStep]             = useState<0 | 1 | 2 | 3>(0);
  const [hoveredType, setHoveredType] = useState<ProjectType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');
  const leaveTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<StepData>({
    type: null, scope: '', stage: '', sqft: '', pmHelp: '',
    location: '', description: '', budget: '', timeline: '',
    name: '', email: '', phone: '',
  });

  const set = (k: keyof StepData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  /* Delayed-leave prevents flicker when mouse moves between cards → panel */
  const onCardEnter = useCallback((t: ProjectType) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHoveredType(t);
  }, []);

  const onAreaLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHoveredType(null), 120);
  }, []);

  const onPanelEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const selectType = (t: ProjectType) => {
    setHoveredType(null);
    setData(d => ({ ...d, type: t, scope: '', stage: '', sqft: '', pmHelp: '' }));
    setStep(1);
  };

  const canStep1 = () => {
    if (!data.type) return false;
    if (data.type === 'project_management') return !!data.scope && !!data.pmHelp;
    return !!data.scope;
  };
  const canStep2   = () => !!data.budget && !!data.timeline;
  const canSubmit  = () => !!data.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

  const reset = () => {
    setStep(0); setSuccess(false); setError('');
    setData({ type: null, scope: '', stage: '', sqft: '', pmHelp: '', location: '', description: '', budget: '', timeline: '', name: '', email: '', phone: '' });
  };

  const handleSubmit = async () => {
    if (!canSubmit()) { setError('Please enter your name and a valid email address.'); return; }
    setSubmitting(true); setError('');
    try {
      await (supabase as any).from('start_project_submissions').insert({
        name: data.name.trim(), email: data.email.trim(),
        phone: data.phone.trim() || null, type: data.type,
        scope: data.scope || null, sqft: data.sqft || null,
        location: data.location.trim() || null, budget: data.budget || null,
        start_timeline: data.timeline || null,
        description: data.description.trim() || null,
        submitted_at: new Date().toISOString(),
      });
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({ 'form-name': 'project-inquiry', name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), type: data.type ?? '', scope: data.scope, sqft: data.sqft, location: data.location.trim(), budget: data.budget, start_timeline: data.timeline, description: data.description.trim() }),
      }).catch(() => {});
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please call us at (281) 915-9595.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Stepper ──────────────────────────────────────────────────────── */
  const StepDot = ({ n }: { n: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: step > n ? AC : step === n ? B : 'transparent', border: `1.5px solid ${step >= n ? (step > n ? AC : B) : G200}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: step >= n ? W : G400, transition: 'all 0.3s', flexShrink: 0 }}>
        {step > n ? <Check style={{ width: 10, height: 10 }} strokeWidth={3} /> : n}
      </div>
      <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: step === n ? B : G400, fontWeight: step === n ? 700 : 400, transition: 'color 0.3s', whiteSpace: 'nowrap' }}>
        {n === 1 ? 'Project Details' : n === 2 ? 'Budget & Timeline' : 'Contact Info'}
      </span>
      {n < 3 && <div style={{ width: 20, height: 1, backgroundColor: step > n ? AC : G200, transition: 'background-color 0.4s', margin: '0 2px' }} />}
    </div>
  );

  /* ── Buttons ──────────────────────────────────────────────────────── */
  const ContinueBtn = ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <motion.button type="button" onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { backgroundColor: AC } : {}} transition={{ duration: 0.22 }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: disabled ? G200 : B, color: disabled ? G400 : W, border: 'none', cursor: disabled ? 'default' : 'pointer', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800 }}>
      Continue <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2.5} />
    </motion.button>
  );

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: G500, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
      <ChevronLeft style={{ width: 12, height: 12 }} strokeWidth={2.5} /> Back
    </button>
  );

  /* ── Derived display state ────────────────────────────────────────── */
  const inForm      = data.type !== null && step >= 1;
  const showHoverPanel = hoveredType !== null && !inForm;

  return (
    <section style={{ backgroundColor: W, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14">

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <SectionEyebrow>Start Your Project</SectionEyebrow>
          <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4vw,52px)', color: B, lineHeight: 1.06, maxWidth: 560 }}>
            How can we<br />help you?
          </h2>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Success ─────────────────────────────────────────────── */}
          {success && (
            <motion.div key="success" variants={stepVar} initial="enter" animate="center" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 80, paddingBottom: 80, gap: 32 }}>
              <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid ${AC}` }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: AC }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.25rem', color: B, marginBottom: 12 }}>
                  We'll be in touch.
                </div>
                <p style={{ fontSize: 12, fontWeight: 300, color: G500, maxWidth: 420, lineHeight: 1.75, margin: '0 auto' }}>
                  Thanks, {data.name.split(' ')[0]}. Your project brief has been received and someone from our team will follow up within 48 business hours.
                </p>
              </div>
              <button onClick={reset} style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, color: AC, background: 'none', border: 'none', cursor: 'pointer' }}>
                Submit Another Inquiry
              </button>
            </motion.div>
          )}

          {/* ── Main content ────────────────────────────────────────── */}
          {!success && (
            <motion.div key="main" variants={stepVar} initial="enter" animate="center" exit="exit">

              {/* ─── 3 Type Cards ─────────────────────────────────── */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-0"
                onMouseLeave={onAreaLeave}
                style={{ marginBottom: 0, border: `1px solid ${G200}` }}
              >
                {TYPE_CARDS.map(({ key, Icon, title, desc, num }) => {
                  const isSelected  = data.type === key;
                  const isDimmed    = inForm && !isSelected;
                  const isHovered   = hoveredType === key && !inForm;

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      onClick={() => selectType(key)}
                      onMouseEnter={() => onCardEnter(key)}
                      animate={{ opacity: isDimmed ? 0.35 : 1 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        position: 'relative', padding: '36px 32px 32px',
                        backgroundColor: isSelected ? B : isHovered ? '#EDE8E1' : CR,
                        borderRight: `1px solid ${G200}`,
                        cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                        transition: 'background-color 0.28s',
                      }}
                    >
                      {/* Gold sweep line across top — on hover OR selected */}
                      <motion.div
                        animate={{ scaleX: isHovered || isSelected ? 1 : 0 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: AC, transformOrigin: 'left', zIndex: 3 }}
                      />

                      {/* Subtle background texture on hover */}
                      <motion.div
                        animate={{ opacity: isHovered ? 1 : 0 }}
                        transition={{ duration: 0.35 }}
                        aria-hidden
                        style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(157,126,63,0.06) 0%, transparent 65%)', pointerEvents: 'none' }}
                      />

                      {/* Number */}
                      <div style={{ fontSize: 8, letterSpacing: '0.38em', fontWeight: 700, color: isSelected ? ACL : isHovered ? AC : G400, marginBottom: 20, textTransform: 'uppercase', transition: 'color 0.25s' }}>
                        {num}
                      </div>

                      {/* Icon */}
                      <motion.div
                        animate={{ y: isHovered ? -3 : 0, scale: isHovered ? 1.1 : 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ marginBottom: 18 }}
                      >
                        <Icon style={{ width: 22, height: 22, color: isSelected ? ACL : isHovered ? AC : G500, transition: 'color 0.25s' }} strokeWidth={1.5} />
                      </motion.div>

                      {/* Title */}
                      <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: isSelected ? W : B, lineHeight: 1.1, marginBottom: 10, transition: 'color 0.25s' }}>
                        {title}
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: 11, fontWeight: 300, color: isSelected ? 'rgba(255,255,255,0.45)' : isHovered ? G500 : G400, lineHeight: 1.6, margin: 0, transition: 'color 0.25s' }}>
                        {desc}
                      </p>

                      {/* "Explore →" hint on hover */}
                      <motion.div
                        animate={{ opacity: isHovered && !isSelected ? 1 : 0, y: isHovered && !isSelected ? 0 : 6 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 20, fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, color: AC }}
                      >
                        Learn More <ArrowRight style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                      </motion.div>

                      {/* Selected: checkmark badge */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          style={{ position: 'absolute', top: 16, right: 16, width: 22, height: 22, borderRadius: '50%', backgroundColor: AC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check style={{ width: 11, height: 11, color: W }} strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* ─── Hover info panel ─────────────────────────────── */}
              <AnimatePresence>
                {showHoverPanel && hoveredType && (
                  <div onMouseEnter={onPanelEnter} onMouseLeave={onAreaLeave}>
                    <AnimatePresence mode="wait">
                      <motion.div key={hoveredType}>
                        <HoverInfoPanel type={hoveredType} onSelect={selectType} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </AnimatePresence>

              {/* ─── Guided form panel ────────────────────────────── */}
              <AnimatePresence>
                {inForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: { opacity: { duration: 0.3, delay: 0.1 }, height: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ border: `1px solid ${G200}`, borderTop: 'none', backgroundColor: '#FAFAF9', padding: '40px' }}>

                      {/* Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, flexWrap: 'wrap' }}>
                        <StepDot n={1} /><StepDot n={2} /><StepDot n={3} />
                      </div>

                      <AnimatePresence mode="wait">

                        {/* Step 1 */}
                        {step === 1 && (
                          <motion.div key="step1" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: AC, marginBottom: 6 }}>
                                {TYPE_CARDS.find(c => c.key === data.type)?.title}
                              </div>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>
                                {data.type === 'project_management' ? 'What kind of help do you need?' : 'Tell us about your project'}
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                  {SCOPE_LABEL[data.type!]}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {SCOPE_OPTIONS[data.type!].map(opt => (
                                    <OptionBtn key={opt} selected={data.scope === opt} onClick={() => set('scope')(opt)}>{opt}</OptionBtn>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                  <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>
                                    {STAGE_LABEL[data.type!]}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {STAGE_OPTIONS[data.type!].map(opt => (
                                      <OptionBtn key={opt} selected={data.stage === opt} onClick={() => set('stage')(opt)}>{opt}</OptionBtn>
                                    ))}
                                  </div>
                                </div>

                                {data.type === 'project_management' ? (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Type of Help *</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {PM_HELP_OPTIONS.map(opt => (
                                        <OptionBtn key={opt} selected={data.pmHelp === opt} onClick={() => set('pmHelp')(opt)}>{opt}</OptionBtn>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Approx. Size</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {SQFT_OPTIONS[data.type!].map(opt => (
                                        <OptionBtn key={opt} selected={data.sqft === opt} onClick={() => set('sqft')(opt)}>{opt}</OptionBtn>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 28 }}>
                              <FInput label="Location / Area" value={data.location} onChange={set('location')} placeholder="Neighborhood, city, or zip code" />
                              <FTextarea label="Additional Notes" value={data.description} onChange={set('description')} placeholder="Any specific requirements or details we should know…" />
                            </div>

                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <BackBtn onClick={() => { setStep(0); setData(d => ({ ...d, type: null })); }} />
                              <ContinueBtn disabled={!canStep1()} onClick={() => setStep(2)} />
                            </div>
                          </motion.div>
                        )}

                        {/* Step 2 */}
                        {step === 2 && (
                          <motion.div key="step2" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>Budget & Timeline</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Estimated Budget *</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {BUDGET_OPTIONS.map(opt => (
                                    <OptionBtn key={opt} selected={data.budget === opt} onClick={() => set('budget')(opt)}>{opt}</OptionBtn>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>When to Start? *</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {TIMELINE_OPTIONS.map(opt => (
                                    <OptionBtn key={opt} selected={data.timeline === opt} onClick={() => set('timeline')(opt)}>{opt}</OptionBtn>
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

                        {/* Step 3 */}
                        {step === 3 && (
                          <motion.div key="step3" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>How should we reach you?</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ maxWidth: 640 }}>
                              <FInput label="Full Name" value={data.name} onChange={set('name')} placeholder="Your full name" required />
                              <FInput label="Email Address" type="email" value={data.email} onChange={set('email')} placeholder="your@email.com" required />
                              <FInput label="Phone Number" type="tel" value={data.phone} onChange={set('phone')} placeholder="(713) 000-0000" />
                            </div>
                            {error && <p style={{ marginTop: 14, fontSize: 10, color: '#C0392B' }}>{error}</p>}
                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                              <BackBtn onClick={() => setStep(2)} />
                              <motion.button type="button" onClick={handleSubmit} disabled={submitting}
                                whileHover={{ backgroundColor: AC }} transition={{ duration: 0.22 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 36px', backgroundColor: B, color: W, border: 'none', cursor: submitting ? 'wait' : 'pointer', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800 }}>
                                {submitting
                                  ? <><Loader2 className="animate-spin" style={{ width: 14, height: 14 }} strokeWidth={2} /> Submitting…</>
                                  : <>Submit Brief <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2.5} /></>}
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
