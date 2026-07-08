import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Building2, ClipboardList,
  ArrowRight, ChevronRight, ChevronLeft, ChevronDown,
  Check, Loader2, CheckCircle2, Sparkles,
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
const PANEL_BG = '#131210';   /* warmer than pure black, easier on eyes */

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
  residential:        ['New Custom Home', 'Renovation / Remodel', 'Addition', 'Kitchen & Bath', 'Exterior Upgrade'],
  commercial:         ['Office Building', 'Retail Space', 'Industrial / Warehouse', 'Hospitality', 'Mixed-Use Development'],
  project_management: ['Residential Project', 'Commercial Project', 'Industrial Project'],
};
const SQFT_OPTIONS: Record<ProjectType, string[]> = {
  residential:        ['Under 2,000 SF', '2,000–4,000 SF', '4,000–8,000 SF', '8,000+ SF', 'Not Sure'],
  commercial:         ['Under 10,000 SF', '10,000–50,000 SF', '50,000–100,000 SF', '100,000+ SF', 'Not Sure'],
  project_management: ['Under 5,000 SF', '5,000–50,000 SF', '50,000–200,000 SF', '200,000+ SF', 'Not Sure'],
};
const STAGE_OPTIONS: Record<ProjectType, string[]> = {
  residential:        ['Planning / Pre-Design', 'Design Complete', 'Permitted', 'Ready to Build'],
  commercial:         ['Concept / Feasibility', 'Design Complete', 'Permitted', 'Ready to Build'],
  project_management: ['Pre-Construction', 'Under Construction', 'Needs Intervention / Oversight'],
};
const PM_HELP_OPTIONS  = ['Full Project Management', 'Partial Oversight', 'Consulting Only'];
const BUDGET_OPTIONS   = ['Under $500K', '$500K – $1M', '$1M – $5M', '$5M – $10M', '$10M+', 'Not Sure'];
const TIMELINE_OPTIONS = ['ASAP (Within 3 months)', '3–6 Months', '6–12 Months', '1–2 Years', 'Just Planning'];
const SCOPE_LABEL: Record<ProjectType, string> = { residential: 'Project Type', commercial: 'Building Type', project_management: 'Project Category' };
const STAGE_LABEL: Record<ProjectType, string> = { residential: 'Project Stage', commercial: 'Project Stage', project_management: 'Current Stage' };

/* ── Dropdown menu content ───────────────────────────────────────────── */
type DropdownMenu = {
  col1: { heading: string; items: string[] };
  col2: { heading: string; items: string[] };
  trends: string[];
  trendNote: string;
  ctaLabel: string;
  secondaryLabel: string;
  secondaryTo: string;
};

const MENUS: Record<ProjectType, DropdownMenu> = {
  residential: {
    col1: {
      heading: 'Home Styles & Design',
      items: [
        'Modern Farmhouse',
        'Warm Contemporary',
        'Traditional Colonial',
        'Mediterranean Estate',
        'Mid-Century Modern',
        'Indoor-Outdoor Living',
      ],
    },
    col2: {
      heading: 'Project Types',
      items: [
        'New Custom Home Build',
        'Full Home Renovation',
        'Kitchen & Bath Upgrade',
        'Home Addition',
        'Master Suite Expansion',
        'Pool House & Outdoor',
      ],
    },
    trends: ['Warm Minimalism', 'Biophilic Design', 'Statement Ceilings', 'Japandi Style', 'Arch Detailing'],
    trendNote: '2025 design movements shaping Houston homes',
    ctaLabel: 'Start My Home Project',
    secondaryLabel: 'View Residential Portfolio',
    secondaryTo: '/portfolio',
  },
  commercial: {
    col1: {
      heading: 'Building Types',
      items: [
        'Class A Office Space',
        'Retail & Mixed-Use',
        'Restaurant / Hospitality',
        'Industrial & Logistics',
        'Healthcare / Medical',
        'Educational Facility',
      ],
    },
    col2: {
      heading: 'Specialty Builds',
      items: [
        'Ground-Up Construction',
        'Tenant Improvements',
        'Exterior Facade & Skin',
        'Interior Fitout & FF&E',
        'Adaptive Reuse',
        'LEED-Ready Development',
      ],
    },
    trends: ['Activity-Based Workplaces', 'Living Walls', 'Industrial Chic', 'Warm Material Palettes', 'Hybrid Office Design'],
    trendNote: 'Emerging directions in commercial design for 2025',
    ctaLabel: 'Request a Commercial Proposal',
    secondaryLabel: 'Commercial Portfolio',
    secondaryTo: '/portfolio',
  },
  project_management: {
    col1: {
      heading: 'PM Services',
      items: [
        'Pre-Construction Planning',
        'Budget & Cost Control',
        'Schedule Management',
        'Subcontractor Coordination',
        'Quality Assurance',
        'Closeout & Handover',
      ],
    },
    col2: {
      heading: 'PM Expertise',
      items: [
        'Residential Projects',
        'Commercial Builds',
        'Multi-Family Developments',
        'Industrial Projects',
        'Crisis & Recovery PM',
        "Owner's Rep / Consulting",
      ],
    },
    trends: ['BIM & Digital Twins', 'Lean Construction', 'Real-Time Dashboards', 'Prefab Integration', 'Sustainable Builds'],
    trendNote: 'Tools and methods redefining how projects get delivered',
    ctaLabel: 'Get a PM Assessment',
    secondaryLabel: 'Our PM Process',
    secondaryTo: '/services',
  },
};

/* ── Netlify encode ──────────────────────────────────────────────────── */
const encodeForm = (data: Record<string, string>) =>
  Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');

/* ─────────────────────────────────────────────────────────────────────
   DROPDOWN — full rewrite for legibility
───────────────────────────────────────────────────────────────────── */
function CardDropdown({
  type, onSelect, onMouseEnter, onMouseLeave, isStatic,
}: {
  type: ProjectType;
  onSelect: (t: ProjectType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isStatic?: boolean;   /* true on mobile: in-flow, not absolute */
}) {
  const m = MENUS[type];

  const colVar = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } }),
  };
  const rowVar  = { hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } };
  const itemVar = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  };

  const positionStyle: React.CSSProperties = isStatic
    ? { position: 'relative', zIndex: 1 }
    : { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60 };

  return (
    <motion.div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.22, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.1 } } }}
      transition={{ height: { duration: 0.44, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.24 } }}
      style={{ overflow: 'hidden', ...positionStyle }}
    >
      <div style={{
        backgroundColor: PANEL_BG,
        borderTop: `3px solid ${AC}`,
        borderLeft: `1px solid rgba(196,167,107,0.3)`,
        borderRight: `1px solid rgba(196,167,107,0.3)`,
        borderBottom: `1px solid rgba(196,167,107,0.3)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Corner glow */}
        <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: '60%', background: 'radial-gradient(ellipse at top right, rgba(157,126,63,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, width: '40%', height: '40%', background: 'radial-gradient(ellipse at bottom left, rgba(157,126,63,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* ── Two columns ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isStatic ? '1fr' : '1fr 1fr', gap: isStatic ? 0 : '0 1px', padding: '28px 28px 0' }}>

          {[m.col1, m.col2].map((col, ci) => (
            <motion.div
              key={col.heading}
              custom={ci}
              variants={colVar}
              initial="hidden"
              animate="visible"
              style={{ paddingRight: (!isStatic && ci === 0) ? 28 : 0, paddingLeft: (!isStatic && ci === 1) ? 28 : 0, borderLeft: (!isStatic && ci === 1) ? '1px solid rgba(255,255,255,0.07)' : 'none', marginBottom: isStatic ? 24 : 0 }}
            >
              {/* Column heading */}
              <div style={{
                fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase',
                fontWeight: 800, color: W, marginBottom: 18,
                paddingBottom: 12, borderBottom: `1px solid rgba(196,167,107,0.22)`,
              }}>
                {col.heading}
              </div>

              {/* Items */}
              <motion.ul
                variants={rowVar} initial="hidden" animate="visible"
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                {col.items.map(item => (
                  <motion.li key={item} variants={itemVar}>
                    <DropdownItem label={item} onClick={() => onSelect(type)} />
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          ))}
        </div>

        {/* ── Trending Now ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.38 }}
          style={{
            margin: '0 28px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 20, paddingBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles style={{ width: 13, height: 13, color: ACL, flexShrink: 0 }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800, color: ACL }}>
              Trending Now
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 14, letterSpacing: '0.01em', lineHeight: 1.5 }}>
            {m.trendNote}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {m.trends.map((t, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <TrendChip label={t} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA bar ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          style={{
            margin: '0 28px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '18px 0 22px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}
        >
          <motion.button
            type="button"
            onClick={() => onSelect(type)}
            whileHover={{ backgroundColor: ACL }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 22px', backgroundColor: AC, color: W,
              border: 'none', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800,
            }}
          >
            {m.ctaLabel}
            <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2.5} />
          </motion.button>

          <Link
            to={m.secondaryTo}
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, letterSpacing: '0.08em', fontWeight: 500, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.18s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACL; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            {m.secondaryLabel}
            <ArrowRight style={{ width: 13, height: 13 }} strokeWidth={2} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Dropdown item ───────────────────────────────────────────────────── */
function DropdownItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', background: hov ? 'rgba(157,126,63,0.06)' : 'none',
        border: 'none',
        borderLeft: `2px solid ${hov ? AC : 'transparent'}`,
        padding: '10px 10px 10px 12px',
        cursor: 'pointer', textAlign: 'left',
        color: hov ? W : 'rgba(255,255,255,0.75)',
        fontSize: 14, fontFamily: 'inherit',
        transition: 'color 0.14s, background 0.14s, border-color 0.14s',
        lineHeight: 1.3,
      }}
    >
      <ChevronRight
        style={{ width: 12, height: 12, color: hov ? ACL : 'rgba(255,255,255,0.2)', flexShrink: 0, transition: 'color 0.14s, transform 0.14s', transform: hov ? 'translateX(3px)' : 'none' }}
        strokeWidth={2.5}
      />
      {label}
    </button>
  );
}

/* ── Trend chip ──────────────────────────────────────────────────────── */
function TrendChip({ label }: { label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <span
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '6px 14px',
        border: `1px solid ${hov ? AC : 'rgba(255,255,255,0.15)'}`,
        backgroundColor: hov ? 'rgba(157,126,63,0.12)' : 'rgba(255,255,255,0.04)',
        color: hov ? ACL : 'rgba(255,255,255,0.65)',
        fontSize: 12, letterSpacing: '0.04em', cursor: 'default',
        transition: 'all 0.18s', fontWeight: 400,
      }}
    >
      {label}
    </span>
  );
}

/* ── Form helpers ────────────────────────────────────────────────────── */
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
      <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${selected ? AC : G200}`, backgroundColor: selected ? AC : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s' }}>
        {selected && <Check style={{ width: 8, height: 8, color: W }} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function FInput({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 8 }}>
        {label}{required && ' *'}
      </label>
      <div style={{ position: 'relative' }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder}
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

/* ── Step animation ──────────────────────────────────────────────────── */
const stepVar = {
  enter:  { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const } },
  exit:   { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ── Card config ─────────────────────────────────────────────────────── */
const TYPE_CARDS: {
  key: ProjectType;
  Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>;
  title: string;
  tagline: string;
  num: string;
}[] = [
  { key: 'residential',        Icon: Home,          title: 'Residential',       num: '01', tagline: 'Custom homes · Renovations · Additions' },
  { key: 'commercial',         Icon: Building2,     title: 'Commercial',         num: '02', tagline: 'Office · Retail · Industrial · Mixed-Use' },
  { key: 'project_management', Icon: ClipboardList, title: 'Project Management', num: '03', tagline: 'Full PM · Oversight · Consulting · Recovery' },
];

/* ── Main export ─────────────────────────────────────────────────────── */
export default function HowCanWeHelpSection() {
  const [step, setStep]               = useState<0 | 1 | 2 | 3>(0);
  const [hoveredType, setHoveredType] = useState<ProjectType | null>(null);
  const [mobileOpen, setMobileOpen]   = useState<ProjectType | null>(null);
  const [isTouch, setIsTouch]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const leaveTimers = useRef<Record<ProjectType, ReturnType<typeof setTimeout> | null>>({
    residential: null, commercial: null, project_management: null,
  });

  useEffect(() => {
    /* Detect touch device: use touch capability + narrow viewport */
    const checkTouch = () => setIsTouch(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const [data, setData] = useState<StepData>({
    type: null, scope: '', stage: '', sqft: '', pmHelp: '',
    location: '', description: '', budget: '', timeline: '',
    name: '', email: '', phone: '',
  });

  const set = (k: keyof StepData) => (v: string) => setData(d => ({ ...d, [k]: v }));

  const clearTimer = (t: ProjectType) => {
    if (leaveTimers.current[t]) { clearTimeout(leaveTimers.current[t]!); leaveTimers.current[t] = null; }
  };
  const onCardEnter   = useCallback((t: ProjectType) => { clearTimer(t); setHoveredType(t); }, []);
  const onCardLeave   = useCallback((t: ProjectType) => { leaveTimers.current[t] = setTimeout(() => setHoveredType(prev => prev === t ? null : prev), 150); }, []);
  const onDdEnter     = useCallback((t: ProjectType) => { clearTimer(t); }, []);
  const onDdLeave     = useCallback((t: ProjectType) => { leaveTimers.current[t] = setTimeout(() => setHoveredType(prev => prev === t ? null : prev), 150); }, []);

  const selectType = (t: ProjectType) => {
    setHoveredType(null); setMobileOpen(null);
    setData(d => ({ ...d, type: t, scope: '', stage: '', sqft: '', pmHelp: '' }));
    setStep(1);
  };

  /* On touch: tap card → toggle mobile menu; tap CTA inside → selectType */
  const handleCardClick = (key: ProjectType) => {
    if (isTouch) {
      setMobileOpen(prev => prev === key ? null : key);
    } else {
      selectType(key);
    }
  };

  const canStep1  = () => !data.type ? false : data.type === 'project_management' ? !!data.scope && !!data.pmHelp : !!data.scope;
  const canStep2  = () => !!data.budget && !!data.timeline;
  const canSubmit = () => !!data.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);

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
    } finally { setSubmitting(false); }
  };

  const inForm = data.type !== null && step >= 1;

  /* Stepper */
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

          {/* Success */}
          {success && (
            <motion.div key="success" variants={stepVar} initial="enter" animate="center" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 80, paddingBottom: 80, gap: 32 }}>
              <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid ${AC}` }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: AC }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.25rem', color: B, marginBottom: 12 }}>We'll be in touch.</div>
                <p style={{ fontSize: 12, fontWeight: 300, color: G500, maxWidth: 420, lineHeight: 1.75, margin: '0 auto' }}>
                  Thanks, {data.name.split(' ')[0]}. Your project brief has been received and someone from our team will follow up within 48 business hours.
                </p>
              </div>
              <button onClick={reset} style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, color: AC, background: 'none', border: 'none', cursor: 'pointer' }}>
                Submit Another Inquiry
              </button>
            </motion.div>
          )}

          {/* Main */}
          {!success && (
            <motion.div key="main" variants={stepVar} initial="enter" animate="center" exit="exit">

              {/* ─── Cards ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ border: `1px solid ${G200}` }}>
                {TYPE_CARDS.map(({ key, Icon, title, tagline, num }, ci) => {
                  const isSelected  = data.type === key;
                  const isDimmed    = inForm && !isSelected;
                  const isHovered   = hoveredType === key && !inForm;
                  const isMobileExp = mobileOpen === key && !inForm;
                  const showDd      = isTouch ? isMobileExp : isHovered;

                  return (
                    <div key={key} style={{ position: 'relative', borderRight: ci < 2 ? `1px solid ${G200}` : 'none', borderBottom: `1px solid ${G200}` }}>

                      {/* Card */}
                      <motion.button
                        type="button"
                        onClick={() => handleCardClick(key)}
                        onMouseEnter={() => !isTouch && onCardEnter(key)}
                        onMouseLeave={() => !isTouch && onCardLeave(key)}
                        animate={{ opacity: isDimmed ? 0.35 : 1 }}
                        transition={{ duration: 0.22 }}
                        style={{
                          width: '100%', padding: '36px 32px 32px',
                          backgroundColor: isSelected ? B : (isHovered || isMobileExp) ? '#EAE5DC' : CR,
                          cursor: 'pointer', textAlign: 'left', border: 'none',
                          position: 'relative', overflow: 'hidden',
                          transition: 'background-color 0.28s',
                        }}
                      >
                        {/* Gold top sweep */}
                        <motion.div
                          animate={{ scaleX: (isHovered || isMobileExp || isSelected) ? 1 : 0 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: AC, transformOrigin: 'left', zIndex: 2 }}
                        />
                        <motion.div
                          animate={{ opacity: (isHovered || isMobileExp) ? 1 : 0 }}
                          transition={{ duration: 0.3 }} aria-hidden
                          style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 20%, rgba(157,126,63,0.07) 0%, transparent 65%)', pointerEvents: 'none' }}
                        />

                        <div style={{ fontSize: 9, letterSpacing: '0.38em', fontWeight: 700, color: isSelected ? ACL : (isHovered || isMobileExp) ? AC : G400, marginBottom: 22, textTransform: 'uppercase', transition: 'color 0.25s' }}>
                          {num}
                        </div>

                        <motion.div animate={{ y: (isHovered || isMobileExp) ? -4 : 0, scale: (isHovered || isMobileExp) ? 1.1 : 1 }} transition={{ duration: 0.28 }} style={{ marginBottom: 18 }}>
                          <Icon style={{ width: 24, height: 24, color: isSelected ? ACL : (isHovered || isMobileExp) ? AC : G500, transition: 'color 0.25s' }} strokeWidth={1.5} />
                        </motion.div>

                        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: isSelected ? W : B, lineHeight: 1.1, marginBottom: 8, transition: 'color 0.25s' }}>
                          {title}
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 300, color: isSelected ? 'rgba(255,255,255,0.4)' : G400, lineHeight: 1.7, margin: 0, letterSpacing: '0.02em', transition: 'color 0.25s' }}>
                          {tagline}
                        </p>

                        {/* Desktop: "Explore Options →" hint */}
                        {!isTouch && (
                          <motion.div animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }} transition={{ duration: 0.22 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 18, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700, color: AC }}>
                            Explore Options <ChevronRight style={{ width: 11, height: 11 }} strokeWidth={2.5} />
                          </motion.div>
                        )}

                        {/* Mobile: chevron expand indicator */}
                        {isTouch && !inForm && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 18, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: isMobileExp ? ACL : G500 }}>
                            {isMobileExp ? 'Close' : 'Explore Options'}
                            <motion.div animate={{ rotate: isMobileExp ? 180 : 0 }} transition={{ duration: 0.25 }}>
                              <ChevronDown style={{ width: 13, height: 13 }} strokeWidth={2.5} />
                            </motion.div>
                          </div>
                        )}

                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            style={{ position: 'absolute', top: 16, right: 16, width: 22, height: 22, borderRadius: '50%', backgroundColor: AC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: 11, height: 11, color: W }} strokeWidth={3} />
                          </motion.div>
                        )}
                      </motion.button>

                      {/* Dropdown */}
                      <AnimatePresence>
                        {showDd && (
                          <CardDropdown
                            key={`dd-${key}`}
                            type={key}
                            onSelect={selectType}
                            onMouseEnter={() => onDdEnter(key)}
                            onMouseLeave={() => onDdLeave(key)}
                            isStatic={isTouch}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* ─── Guided form panel ──────────────────────────── */}
              <AnimatePresence>
                {inForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', transition: { opacity: { duration: 0.3, delay: 0.1 }, height: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ border: `1px solid ${G200}`, borderTop: 'none', backgroundColor: '#FAFAF9', padding: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 36, flexWrap: 'wrap' }}>
                        <StepDot n={1} /><StepDot n={2} /><StepDot n={3} />
                      </div>
                      <AnimatePresence mode="wait">

                        {step === 1 && (
                          <motion.div key="s1" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: AC, marginBottom: 6 }}>{TYPE_CARDS.find(c => c.key === data.type)?.title}</div>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>
                                {data.type === 'project_management' ? 'What kind of help do you need?' : 'Tell us about your project'}
                              </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>{SCOPE_LABEL[data.type!]}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {SCOPE_OPTIONS[data.type!].map(o => <OptionBtn key={o} selected={data.scope === o} onClick={() => set('scope')(o)}>{o}</OptionBtn>)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                  <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>{STAGE_LABEL[data.type!]}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {STAGE_OPTIONS[data.type!].map(o => <OptionBtn key={o} selected={data.stage === o} onClick={() => set('stage')(o)}>{o}</OptionBtn>)}
                                  </div>
                                </div>
                                {data.type === 'project_management' ? (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Type of Help *</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {PM_HELP_OPTIONS.map(o => <OptionBtn key={o} selected={data.pmHelp === o} onClick={() => set('pmHelp')(o)}>{o}</OptionBtn>)}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Approx. Size</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {SQFT_OPTIONS[data.type!].map(o => <OptionBtn key={o} selected={data.sqft === o} onClick={() => set('sqft')(o)}>{o}</OptionBtn>)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 28 }}>
                              <FInput label="Location / Area" value={data.location} onChange={set('location')} placeholder="Neighborhood, city, or zip code" />
                              <FTextarea label="Additional Notes" value={data.description} onChange={set('description')} placeholder="Any specific requirements or details…" />
                            </div>
                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <BackBtn onClick={() => { setStep(0); setData(d => ({ ...d, type: null })); }} />
                              <ContinueBtn disabled={!canStep1()} onClick={() => setStep(2)} />
                            </div>
                          </motion.div>
                        )}

                        {step === 2 && (
                          <motion.div key="s2" variants={stepVar} initial="enter" animate="center" exit="exit">
                            <div style={{ marginBottom: 28 }}>
                              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: B, lineHeight: 1.1, margin: 0 }}>Budget & Timeline</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>Estimated Budget *</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {BUDGET_OPTIONS.map(o => <OptionBtn key={o} selected={data.budget === o} onClick={() => set('budget')(o)}>{o}</OptionBtn>)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 700, color: G500, marginBottom: 10 }}>When to Start? *</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {TIMELINE_OPTIONS.map(o => <OptionBtn key={o} selected={data.timeline === o} onClick={() => set('timeline')(o)}>{o}</OptionBtn>)}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <BackBtn onClick={() => setStep(1)} />
                              <ContinueBtn disabled={!canStep2()} onClick={() => setStep(3)} />
                            </div>
                          </motion.div>
                        )}

                        {step === 3 && (
                          <motion.div key="s3" variants={stepVar} initial="enter" animate="center" exit="exit">
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
