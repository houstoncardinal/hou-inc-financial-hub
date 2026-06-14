import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDown, BadgeCheck, Gauge, TreePine, HardHat,
  Building2, Star, Compass, Ruler, Hammer, ClipboardCheck, Trophy,
  Users, Quote, CheckCircle2, Award, ChevronRight,
} from 'lucide-react';
import {
  motion, useScroll, useTransform, useReducedMotion,
  useInView, AnimatePresence,
} from 'framer-motion';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const G50  = '#F4F4F2';
const G200 = '#E2E2DE';
const G500 = '#8A8A8A';
const G700 = '#3A3A3A';
const AC   = '#9D7E3F';
const SF   = "'Cormorant Garamond', Georgia, serif";

/* ── Photography ────────────────────────────────────────────────────── */
const PH = {
  hero:        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
  residential: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
  commercial:  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=85',
  svcHomes:    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
  svcComm:     'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
  svcReno:     'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
  proj1:       'https://images.unsplash.com/photo-1600607687939-ce8a6d350b8b?auto=format&fit=crop&w=1200&q=80',
  proj2:       'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  proj3:       'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
};

/* ── Helpers ─────────────────────────────────────────────────────────── */
function Brackets({ c = B, sz = 16, w = 1.5 }: { c?: string; sz?: number; w?: number }) {
  const s = { position: 'absolute' as const, width: sz, height: sz };
  const l = { position: 'absolute' as const, backgroundColor: c };
  return (
    <>
      <span style={{ ...s, top: 0, left: 0 }}>
        <span style={{ ...l, top: 0, left: 0, width: w, height: sz }} />
        <span style={{ ...l, top: 0, left: 0, height: w, width: sz }} />
      </span>
      <span style={{ ...s, top: 0, right: 0 }}>
        <span style={{ ...l, top: 0, right: 0, width: w, height: sz }} />
        <span style={{ ...l, top: 0, right: 0, height: w, width: sz }} />
      </span>
      <span style={{ ...s, bottom: 0, left: 0 }}>
        <span style={{ ...l, bottom: 0, left: 0, width: w, height: sz }} />
        <span style={{ ...l, bottom: 0, left: 0, height: w, width: sz }} />
      </span>
      <span style={{ ...s, bottom: 0, right: 0 }}>
        <span style={{ ...l, bottom: 0, right: 0, width: w, height: sz }} />
        <span style={{ ...l, bottom: 0, right: 0, height: w, width: sz }} />
      </span>
    </>
  );
}

function Reveal({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function AnimatedCounter({
  target, suffix = '',
}: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [count, setCount] = useState(0);
  const started = useRef(false);

  if (inView && !started.current) {
    started.current = true;
    const duration = 1800;
    const start = performance.now();
    const step = (now: number) => {
      const pct  = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 4);
      setCount(Math.floor(ease * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* Interactive headline word — hovers to gold */
function IW({ ch, delay = 0, light = false }: { ch: string; delay?: number; light?: boolean }) {
  const reduced = useReducedMotion();
  const [hov, setHov] = useState(false);
  return (
    <motion.span
      className="inline-block cursor-default"
      style={{ color: hov ? AC : (light ? B : W), transition: 'color 0.22s' }}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {ch}
    </motion.span>
  );
}

/* ── CTA Buttons ─────────────────────────────────────────────────────── */
function HeroPrimaryBtn({ to, children }: { to: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to}
      className="relative overflow-hidden inline-flex items-center gap-2"
      style={{
        color: hov ? B : W,
        padding: '14px 28px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase' as const,
        transition: 'color 0.3s',
        border: `1px solid ${W}`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <motion.span className="absolute inset-0"
        style={{ backgroundColor: W, transformOrigin: 'left' }}
        animate={{ scaleX: hov ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Link>
  );
}

function HeroSecondaryBtn({ to, children }: { to: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to}
      className="relative overflow-hidden inline-flex items-center gap-2"
      style={{
        color: hov ? W : 'rgba(255,255,255,0.48)',
        padding: '14px 28px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase' as const,
        transition: 'color 0.2s',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <motion.span className="absolute inset-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', transformOrigin: 'left' }}
        animate={{ scaleX: hov ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Link>
  );
}

function SectionBtn({ to, children, dark = false }: { to: string; children: React.ReactNode; dark?: boolean }) {
  const [hov, setHov] = useState(false);
  const bg = dark ? W : B;
  const fg = dark ? B : W;
  return (
    <Link to={to}
      className="relative overflow-hidden inline-flex items-center gap-2"
      style={{
        backgroundColor: bg,
        color: hov ? W : fg,
        padding: '13px 26px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase' as const,
        transition: 'color 0.3s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <motion.span className="absolute inset-0"
        style={{ backgroundColor: AC, transformOrigin: 'left' }}
        animate={{ scaleX: hov ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Link>
  );
}

/* ── Data ────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  'Luxury Custom Homes', 'Grade-A Commercial', 'Retail Centers', 'High-Rise Residential',
  'Industrial Warehouses', 'Mixed-Use Development', 'LEED Certified', 'HBJ #1 Contractor',
  '25 Years · Houston', 'BBB A+ Rated',
];

const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'BBB A+ Accredited' },
  { icon: Trophy,     label: 'HBJ #1 Luxury Builder' },
  { icon: Gauge,      label: '98% On-Time Delivery' },
  { icon: TreePine,   label: 'LEED Certified' },
  { icon: Users,      label: '500+ Projects Completed' },
];

const STATS = [
  { v: 25,  s: '+',  l: 'Years in Houston',   d: 'Founded 1998' },
  { v: 500, s: '+',  l: 'Projects Delivered',  d: 'Res · Comm · Retail' },
  { v: 2,   s: 'B+', l: 'Value Constructed',  d: 'Greater Houston' },
  { v: 98,  s: '%',  l: 'On-Time Delivery',    d: 'Schedule adherence' },
];

const SERVICES = [
  {
    img: PH.svcHomes,
    tag: '01 · Residential',
    title: 'Luxury Custom Homes',
    sub: 'Bespoke estates and luxury residences crafted to the highest specification — River Oaks, Memorial, Tanglewood, and beyond.',
    spec: ['Custom Estate Homes', 'High-Rise Residential', 'Renovation & Addition', 'Interior Fit-Out'],
  },
  {
    img: PH.svcComm,
    tag: '02 · Commercial',
    title: 'Commercial Development',
    sub: 'Class-A office campuses, medical facilities, and corporate headquarters delivered on time and on budget.',
    spec: ['Class-A Office', 'Medical Facilities', 'Corporate HQ', 'Hospitality'],
  },
  {
    img: PH.svcReno,
    tag: '03 · Retail & Mixed-Use',
    title: 'Retail & Mixed-Use',
    sub: 'Shopping centers, mixed-use developments, and retail flagship builds that drive commerce and community.',
    spec: ['Anchored Shopping Centers', 'Mixed-Use Towers', 'Flagship Retail', 'Warehouse & Industrial'],
  },
];

const PROJECTS = [
  { img: PH.proj1, tag: 'River Oaks · Residential',   title: 'Chambord Estate',             sqft: '14,500 SF', year: '2024', wide: true  },
  { img: PH.proj2, tag: 'Energy Corridor · Industrial',title: 'Westway Commerce Campus',     sqft: '212,000 SF', year: '2024', wide: false },
  { img: PH.proj3, tag: 'Galleria · Commercial',       title: 'Meridian Tower — Retail',     sqft: '98,000 SF', year: '2023', wide: false },
];

const WHY = [
  { icon: Trophy,        title: 'HBJ #1 Luxury Contractor', sub: 'Recognized three consecutive years as Houston Business Journal\'s top-ranked luxury contractor.' },
  { icon: HardHat,       title: 'Vertically Integrated',    sub: 'In-house architecture, engineering, and construction management — one team, zero handoff gaps.' },
  { icon: Gauge,         title: '98% On-Time Delivery',     sub: 'Industry-leading schedule adherence across every project type and scale since 2009.' },
  { icon: TreePine,      title: 'LEED Gold Certified',      sub: 'Sustainable building expertise woven into every project, for structures built to last generations.' },
  { icon: CheckCircle2,  title: 'Fixed-Price Guarantee',    sub: 'Our guaranteed maximum price contract protects your investment from cost overruns and surprises.' },
  { icon: Users,         title: 'Dedicated Project Lead',   sub: 'A senior project executive remains your single point of contact from ground-break to handover.' },
];

const PROCESS = [
  { icon: Compass,        n: '01', title: 'Discovery & Vision',    sub: 'We begin by deeply understanding your goals, timeline, and budget — then align every decision to that north star.' },
  { icon: Ruler,          n: '02', title: 'Design & Engineering',  sub: 'Our in-house team produces detailed architectural drawings and structural plans, refined with you at every stage.' },
  { icon: Hammer,         n: '03', title: 'Precision Construction', sub: 'Master craftsmen and trusted trade partners execute with exacting standards under rigorous daily quality review.' },
  { icon: ClipboardCheck, n: '04', title: 'Delivery & Stewardship', sub: 'We hand over a complete, punch-list-free project — then remain your partner through the full warranty period.' },
];

const TESTIMONIALS = [
  {
    dark: true,
    q: '"HOU INC delivered our River Oaks estate three weeks early and $200K under budget. The craftsmanship is extraordinary — not a single punch-list item at handover."',
    name: 'James Whitfield',
    title: 'Founding Partner, Whitfield Capital · River Oaks Estate',
    stars: 5,
  },
  {
    dark: false,
    q: '"As a developer, I\'ve worked with the top contractors in Houston. HOU INC\'s commercial team operates at a completely different level. The Galleria project came in on time, exactly to spec."',
    name: 'Diane Okonkwo',
    title: 'CEO, Meridian Properties Group · Galleria Commerce Center',
    stars: 5,
  },
  {
    dark: true,
    q: '"When you invest $8M in a custom home, you need a builder who treats it like it\'s their own. HOU INC\'s team was at our site every day and communication was impeccable from day one."',
    name: 'Robert & Sarah Castellan',
    title: 'Homeowners · Memorial Luxury Estate',
    stars: 5,
  },
];

/* ── Sub-components ──────────────────────────────────────────────────── */
function ServiceCard({ s }: { s: typeof SERVICES[0] }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer"
      style={{ height: '480px', backgroundColor: G700 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <motion.div className="absolute inset-0"
        style={{ backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.06 : 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(8,8,8,0.96) 35%, rgba(8,8,8,0.25) 100%)' }}
        animate={{ opacity: hov ? 1 : 0.85 }}
        transition={{ duration: 0.4 }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        <div className="text-[8px] uppercase tracking-[0.38em] font-semibold mb-4" style={{ color: AC }}>{s.tag}</div>
        <h3 className="mb-3" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '26px', color: W, lineHeight: 1.1 }}>
          {s.title}
        </h3>
        <motion.p className="text-[12px] leading-relaxed mb-5 font-light" style={{ color: 'rgba(255,255,255,0.58)' }}
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 12 }}
          transition={{ duration: 0.35 }}>
          {s.sub}
        </motion.p>
        <motion.div className="space-y-1.5"
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 8 }}
          transition={{ duration: 0.35, delay: 0.04 }}>
          {s.spec.map(sp => (
            <div key={sp} className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 shrink-0" style={{ color: AC }} strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>{sp}</span>
            </div>
          ))}
        </motion.div>
        <motion.div className="mt-5"
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 6 }}
          transition={{ duration: 0.3, delay: 0.08 }}>
          <Link to="/services" className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] font-bold"
            style={{ color: AC }}>
            Explore Service <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProjectCard({ p, wide }: { p: typeof PROJECTS[0]; wide: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer"
      style={{ height: wide ? 640 : 308 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <motion.div className="absolute inset-0"
        style={{ backgroundImage: `url(${p.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.05 : 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.15) 100%)' }} />
      <motion.div className="absolute inset-x-0 bottom-0 p-7 pb-8"
        animate={{ y: hov ? 0 : 16, opacity: hov ? 1 : 0.6 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="text-[8px] uppercase tracking-[0.34em] font-semibold mb-2" style={{ color: AC }}>{p.tag}</div>
        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: wide ? '28px' : '20px', color: W, lineHeight: 1.1 }}>
          {p.title}
        </div>
        <motion.div className="flex items-center gap-5 mt-3"
          animate={{ opacity: hov ? 1 : 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>{p.sqft}</span>
          <span style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.48)' }}>{p.year}</span>
        </motion.div>
      </motion.div>
      <motion.div className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center"
        style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.35)' }}
        animate={{ opacity: hov ? 1 : 0, scale: hov ? 1 : 0.8 }}
        transition={{ duration: 0.25 }}>
        <ArrowUpRight className="w-4 h-4" style={{ color: W }} strokeWidth={1.5} />
      </motion.div>
    </motion.div>
  );
}

function WhyCard({ w: card }: { w: typeof WHY[0] }) {
  const [hov, setHov] = useState(false);
  const Icon = card.icon;
  return (
    <motion.div className="relative p-7 cursor-default overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.06)', backgroundColor: hov ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'background-color 0.3s' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <motion.div className="absolute top-0 left-0 h-px"
        style={{ backgroundColor: AC }}
        animate={{ width: hov ? '100%' : '0%' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{ border: `1px solid ${hov ? AC : 'rgba(255,255,255,0.12)'}`, transition: 'border-color 0.3s' }}>
          <Icon className="w-4 h-4" style={{ color: hov ? AC : 'rgba(255,255,255,0.38)', transition: 'color 0.3s' }} strokeWidth={1.5} />
        </div>
      </div>
      <div className="text-[12px] font-bold mb-2 uppercase tracking-[0.14em]"
        style={{ color: hov ? W : 'rgba(255,255,255,0.72)', transition: 'color 0.25s' }}>{card.title}</div>
      <div className="text-[12px] leading-relaxed font-light"
        style={{ color: 'rgba(255,255,255,0.38)' }}>{card.sub}</div>
    </motion.div>
  );
}

function StepCard({ s, i }: { s: typeof PROCESS[0]; i: number }) {
  const [hov, setHov] = useState(false);
  const Icon = s.icon;
  return (
    <Reveal delay={i * 0.08}>
      <div className="relative cursor-default"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}>
        <div className="relative h-px mb-7" style={{ backgroundColor: G200 }}>
          <motion.div className="absolute inset-y-0 left-0" style={{ backgroundColor: AC }}
            animate={{ width: hov ? '100%' : '0%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ backgroundColor: hov ? AC : G50, border: `1px solid ${hov ? AC : G200}`, transition: 'all 0.3s' }}>
            <Icon className="w-4 h-4" style={{ color: hov ? W : G700, transition: 'color 0.3s' }} strokeWidth={1.5} />
          </div>
          <div className="text-[10px] uppercase tracking-[0.34em] font-black"
            style={{ color: hov ? AC : G500, transition: 'color 0.25s' }}>{s.n}</div>
        </div>
        <div className="text-[13px] font-bold uppercase tracking-[0.14em] mb-3"
          style={{ color: hov ? B : G700, transition: 'color 0.25s' }}>{s.title}</div>
        <div className="text-[12px] leading-relaxed font-light" style={{ color: G500 }}>{s.sub}</div>
        <motion.div className="absolute top-6 right-0"
          animate={{ opacity: hov ? 1 : 0, x: hov ? 0 : -6 }}
          transition={{ duration: 0.2 }}>
          <ArrowUpRight className="w-4 h-4" style={{ color: AC }} strokeWidth={2} />
        </motion.div>
      </div>
    </Reveal>
  );
}

function TestiCard({ t, i }: { t: typeof TESTIMONIALS[0]; i: number }) {
  return (
    <Reveal delay={i * 0.1}>
      <div className="relative p-8 h-full"
        style={{
          backgroundColor: t.dark ? B : G50,
          border: `1px solid ${t.dark ? 'rgba(255,255,255,0.07)' : G200}`,
        }}>
        <Brackets c={t.dark ? 'rgba(157,126,63,0.22)' : 'rgba(157,126,63,0.2)'} sz={13} w={1} />
        <div className="flex gap-1 mb-5">
          {Array.from({ length: t.stars }).map((_, j) => (
            <Star key={j} className="w-3 h-3 fill-current" style={{ color: AC }} strokeWidth={0} />
          ))}
        </div>
        <Quote className="w-5 h-5 mb-4" style={{ color: t.dark ? 'rgba(157,126,63,0.3)' : 'rgba(157,126,63,0.25)' }} strokeWidth={1} />
        <p className="text-[13px] leading-relaxed font-light mb-6 italic"
          style={{ fontFamily: SF, color: t.dark ? 'rgba(255,255,255,0.72)' : G700 }}>
          {t.q}
        </p>
        <div className="pt-5" style={{ borderTop: `1px solid ${t.dark ? 'rgba(255,255,255,0.07)' : G200}` }}>
          <div className="text-[11px] font-bold tracking-[0.08em]"
            style={{ color: t.dark ? 'rgba(255,255,255,0.72)' : B }}>{t.name}</div>
          <div className="text-[10px] mt-0.5 leading-snug"
            style={{ color: t.dark ? 'rgba(255,255,255,0.3)' : G500 }}>{t.title}</div>
        </div>
      </div>
    </Reveal>
  );
}

function SplitPanel({ img, tag, title, desc, specs, to }: {
  img: string; tag: string; title: string; desc: string; specs: string[]; to: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div className="relative overflow-hidden flex-1 cursor-pointer" style={{ minHeight: '560px' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      <motion.div className="absolute inset-0"
        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.04 : 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      <motion.div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(5,5,5,0.95) 40%, rgba(5,5,5,0.30) 100%)' }}
        animate={{ opacity: hov ? 1 : 0.88 }}
        transition={{ duration: 0.4 }} />
      <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14">
        <div className="text-[8px] uppercase tracking-[0.44em] font-semibold mb-4" style={{ color: AC }}>{tag}</div>
        <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.5vw, 44px)', color: W, lineHeight: 1.05, marginBottom: 16 }}>
          {title}
        </h2>
        <motion.p className="text-[13px] leading-relaxed font-light max-w-sm mb-6"
          style={{ color: 'rgba(255,255,255,0.52)' }}
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 14 }}
          transition={{ duration: 0.35 }}>
          {desc}
        </motion.p>
        <motion.div className="space-y-2 mb-7"
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 10 }}
          transition={{ duration: 0.3, delay: 0.05 }}>
          {specs.map(sp => (
            <div key={sp} className="flex items-center gap-2">
              <div className="w-1 h-1 shrink-0 rounded-full" style={{ backgroundColor: AC }} />
              <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.55)' }}>{sp}</span>
            </div>
          ))}
        </motion.div>
        <motion.div
          animate={{ opacity: hov ? 1 : 0.3, y: hov ? 0 : 4 }}
          transition={{ duration: 0.25, delay: 0.1 }}>
          <Link to={to} className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] font-black py-3 px-6"
            style={{ backgroundColor: AC, color: W }}>
            Explore <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ManifestoText() {
  const text = "We don't just construct buildings. We engineer the landmarks that define Houston's legacy — one iconic structure at a time.";
  const words = text.split(' ');
  return (
    <p style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3.5vw, 44px)', lineHeight: 1.35, color: B }}>
      {words.map((word, i) => (
        <motion.span key={i} className="inline-block mr-[0.22em]"
          initial={{ opacity: 0.1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: i * 0.028, duration: 0.55, ease: 'easeOut' }}>
          {word}
        </motion.span>
      ))}
    </p>
  );
}

/* ── Architectural grid pattern ──────────────────────────────────────── */
const GRID = {
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
  `,
  backgroundSize: '72px 72px',
};

/* ── Page ────────────────────────────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY    = useTransform(heroScroll, [0, 1], [0, 80]);
  const heroFade = useTransform(heroScroll, [0, 0.55], [1, 0]);

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          HERO — Split dark + architectural photo
      ═══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ backgroundColor: B, minHeight: '100svh', ...GRID }}>

        {/* Image panel (right, desktop only) */}
        <motion.div
          className="hidden lg:block absolute top-0 right-0 bottom-0"
          style={{ width: '42%' }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
          {/* Blend edge */}
          <div className="absolute inset-y-0 left-0 w-28 z-10"
            style={{ background: `linear-gradient(to right, ${B}, transparent)` }} />
          <div className="absolute inset-0"
            style={{ backgroundImage: `url(${PH.hero})`, backgroundSize: 'cover', backgroundPosition: 'center 25%' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />

          {/* Floating stat card */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 px-7 py-5 whitespace-nowrap"
            style={{ backgroundColor: 'rgba(10,10,10,0.88)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}>
            <Brackets c="rgba(157,126,63,0.28)" sz={10} w={1} />
            <div className="text-center">
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '32px', color: W, lineHeight: 1 }}>500+</div>
              <div className="text-[8px] uppercase tracking-[0.38em] font-semibold mt-1.5" style={{ color: AC }}>Projects Delivered</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Content panel */}
        <motion.div
          className="relative z-10 flex flex-col justify-end lg:justify-center px-8 md:px-14 lg:px-16 pb-16 lg:pb-0"
          style={{ minHeight: '100svh', paddingTop: '110px', y: heroY, opacity: heroFade }}>
          <div className="lg:max-w-[600px]">

            {/* Eyebrow */}
            <motion.div className="flex items-center gap-3 mb-12"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.48em] font-semibold" style={{ color: AC }}>
                Established 1998 · Houston, Texas
              </div>
            </motion.div>

            {/* Massive interactive headline */}
            <div className="mb-6" style={{ lineHeight: 0.92 }}>
              <div style={{ fontSize: 'clamp(58px, 10vw, 148px)', fontFamily: SF, fontWeight: 400 }}>
                <div><IW ch="Building" delay={0.1} /></div>
                <div><IW ch="Houston's" delay={0.2} /></div>
                <div style={{ color: AC, fontStyle: 'italic' }}>
                  <IW ch="Finest." delay={0.3} />
                </div>
              </div>
            </div>

            {/* Subhead */}
            <motion.p className="text-[14px] leading-relaxed font-light mb-10 max-w-md"
              style={{ color: 'rgba(255,255,255,0.48)' }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}>
              Greater Houston's premier construction firm — delivering luxury residences, Class-A commercial, and mixed-use developments for 25 years.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-wrap gap-3 mb-14"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.54, ease: [0.22, 1, 0.36, 1] }}>
              <HeroPrimaryBtn to="/contact">
                Start Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </HeroPrimaryBtn>
              <HeroSecondaryBtn to="/portfolio">
                View Portfolio <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </HeroSecondaryBtn>
            </motion.div>

            {/* Trust row */}
            <motion.div className="flex flex-wrap items-center gap-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.68 }}>
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                  <span className="text-[8px] uppercase tracking-[0.22em] font-medium whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                </div>
              ))}
            </motion.div>

            {/* Scroll nudge */}
            <motion.div className="flex items-center gap-3 mt-12"
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>
              <ArrowDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.18)' }} strokeWidth={1.5} />
              <span className="text-[8px] uppercase tracking-[0.38em]" style={{ color: 'rgba(255,255,255,0.18)' }}>Scroll</span>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TICKER
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ backgroundColor: AC, height: '44px' }}>
        <motion.div
          className="flex items-center h-full whitespace-nowrap"
          animate={{ x: [0, '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-6 px-8 h-full text-[8.5px] uppercase tracking-[0.36em] font-bold"
              style={{ color: W }}>
              {item}
              <span className="w-1 h-1 rounded-full inline-block flex-shrink-0 opacity-50" style={{ backgroundColor: W }} />
            </span>
          ))}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MANIFESTO
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-28 md:py-40">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-20 items-start">
            <Reveal>
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8" style={{ backgroundColor: AC }} />
                  <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>Our Commitment</div>
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px, 5vw, 64px)', color: B, lineHeight: 1.05 }}>
                  25 years of<br />uncompromising<br />excellence.
                </div>
              </div>
            </Reveal>
            <div className="pt-2 lg:pt-4">
              <ManifestoText />
              <Reveal delay={0.3}>
                <div className="flex flex-wrap gap-10 mt-16">
                  {STATS.map(st => (
                    <div key={st.l}>
                      <div style={{ fontFamily: SF, fontStyle: 'italic', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, color: B, lineHeight: 1 }}>
                        <AnimatedCounter target={st.v} suffix={st.s} />
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.26em] font-semibold mt-1" style={{ color: AC }}>{st.l}</div>
                      <div className="text-[9px] uppercase tracking-[0.18em] mt-0.5" style={{ color: G500 }}>{st.d}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SERVICES — Image cards
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: G50, paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-8" style={{ backgroundColor: AC }} />
                  <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>What We Build</div>
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 4vw, 52px)', color: B, lineHeight: 1.08 }}>
                  End-to-end construction<br />services, delivered.
                </div>
              </div>
              <SectionBtn to="/services">
                All Services <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </SectionBtn>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SERVICES.map((s, i) => (
              <Reveal key={s.tag} delay={i * 0.1}>
                <ServiceCard s={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          RESIDENTIAL vs COMMERCIAL — Split image panels
      ═══════════════════════════════════════════════════ */}
      <section>
        <Reveal>
          <div className="max-w-7xl mx-auto px-8 md:px-14 pt-20 pb-10">
            <div className="text-[8px] uppercase tracking-[0.44em] font-semibold mb-3" style={{ color: AC }}>Our Expertise</div>
            <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 3.8vw, 48px)', color: B, lineHeight: 1.08 }}>
              Two specializations.<br />One team. Zero compromise.
            </div>
          </div>
        </Reveal>
        <div className="flex flex-col lg:flex-row">
          <SplitPanel
            img={PH.residential}
            tag="Residential Construction"
            title="Luxury Homes & Custom Estates"
            desc="From River Oaks estates to Memorial custom homes — we bring your most ambitious residential vision to life with obsessive attention to detail."
            specs={['Custom Estate Homes', 'High-Rise Residential', 'Award-Winning Design', 'LEED Certified']}
            to="/services"
          />
          <div className="hidden lg:block w-px flex-shrink-0" style={{ backgroundColor: B }} />
          <SplitPanel
            img={PH.commercial}
            tag="Commercial Construction"
            title="Grade-A Office & Retail Development"
            desc="Class-A offices, medical facilities, shopping centers, and mixed-use towers that define Houston's commercial landscape for decades."
            specs={['Class-A Office Parks', 'Medical & Healthcare', 'Retail & Mixed-Use', 'Industrial Warehouse']}
            to="/services"
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SELECTED PROJECTS
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: B, paddingTop: '80px', paddingBottom: '80px', ...GRID }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-8" style={{ backgroundColor: AC }} />
                  <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>Selected Work</div>
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 52px)', color: W, lineHeight: 1.08 }}>
                  Projects that define<br />Houston's skyline.
                </div>
              </div>
              <Link to="/portfolio" className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] font-black"
                style={{ color: AC }}
                onMouseEnter={e => { e.currentTarget.style.color = W; }}
                onMouseLeave={e => { e.currentTarget.style.color = AC; }}>
                Full Portfolio <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROJECTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <ProjectCard p={p} wide={p.wide} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          WHY HOU INC
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: B, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="grid md:grid-cols-2 gap-16 items-end mb-16">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8" style={{ backgroundColor: AC }} />
                  <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>Why HOU INC</div>
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 4vw, 52px)', color: W, lineHeight: 1.08 }}>
                  The standard others<br />measure themselves by.
                </div>
              </div>
              <p className="text-[13px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
                HOU INC isn't just Houston's most recognized contractor — we're the firm that the city's most discerning clients return to again and again. Here's why.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 0.07}>
                <WhyCard w={w} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PROCESS
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: G50 }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="text-center mb-20">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-10" style={{ backgroundColor: AC }} />
                <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>How We Build</div>
                <div className="h-px w-10" style={{ backgroundColor: AC }} />
              </div>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 4vw, 52px)', color: B, lineHeight: 1.1 }}>
                A process built on<br />precision and trust.
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {PROCESS.map((s, i) => <StepCard key={s.n} s={s} i={i} />)}
          </div>
          <Reveal delay={0.2}>
            <div className="mt-20 text-center">
              <SectionBtn to="/contact">
                Begin Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </SectionBtn>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8" style={{ backgroundColor: AC }} />
                  <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>Client Testimonials</div>
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 4vw, 52px)', color: B, lineHeight: 1.08 }}>
                  What Houston's leaders<br />say about us.
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" style={{ color: AC }} strokeWidth={0} />
                ))}
                <span className="text-[10px] font-semibold ml-2 self-center uppercase tracking-[0.2em]" style={{ color: G500 }}>5.0 Average</span>
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => <TestiCard key={t.name} t={t} i={i} />)}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          AWARDS STRIP
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: B, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            {[
              { icon: Trophy,     title: 'HBJ #1 Luxury Contractor', sub: '2022 · 2023 · 2024' },
              { icon: Award,      title: 'AGC Build America Award',   sub: 'Associated General Contractors' },
              { icon: BadgeCheck, title: 'BBB A+ Accredited',         sub: '20+ Years Standing' },
              { icon: TreePine,   title: 'LEED Gold Certified',        sub: 'Sustainable Construction' },
            ].map(({ icon: Icon, title, sub }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0"
                    style={{ border: '1px solid rgba(157,126,63,0.3)' }}>
                    <Icon className="w-4 h-4" style={{ color: AC }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.62)' }}>{title}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PORTAL BAND
      ═══════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: AC }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <div className="text-[8px] uppercase tracking-[0.44em] font-semibold mb-4"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>Client Portal</div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 48px)', color: W, lineHeight: 1.1 }}>
                  Your project. Real time.<br />Complete transparency.
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex flex-col gap-5">
                <p className="text-[13px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  Track budgets, milestones, RFIs, and change orders in real time. Communicate directly with your project lead. Everything in one place.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/portal" className="relative overflow-hidden group inline-flex items-center gap-2"
                    style={{ backgroundColor: W, color: AC, padding: '13px 26px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const }}>
                    <motion.span className="absolute inset-0" style={{ backgroundColor: B, transformOrigin: 'left' }}
                      initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                    <span className="relative z-10 group-hover:text-white transition-colors flex items-center gap-2">
                      Access Portal <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                  </Link>
                  <Link to="/finance" className="inline-flex items-center gap-2"
                    style={{ color: 'rgba(255,255,255,0.55)', padding: '13px 26px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const, border: '1px solid rgba(255,255,255,0.25)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = W; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}>
                    Finance Hub <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ backgroundColor: B, ...GRID }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(157,126,63,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-32 md:py-44 relative z-10 text-center">
          <Reveal>
            <div className="text-[8px] uppercase tracking-[0.52em] font-semibold mb-8" style={{ color: AC }}>
              Ready to Build?
            </div>
            <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(40px, 7vw, 110px)', color: W, lineHeight: 0.95, marginBottom: 32 }}>
              Let's build something<br />
              <span style={{ color: AC }}>extraordinary.</span>
            </div>
            <p className="text-[14px] leading-relaxed font-light mb-14 max-w-xl mx-auto"
              style={{ color: 'rgba(255,255,255,0.38)' }}>
              Whether you're planning a custom luxury residence or a multi-million-dollar commercial development, your HOU INC project begins with a single conversation.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link to="/contact" className="relative overflow-hidden group inline-flex items-center gap-2"
                style={{ backgroundColor: W, color: B, padding: '16px 36px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const }}>
                <motion.span className="absolute inset-0" style={{ backgroundColor: AC, transformOrigin: 'left' }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32 }} />
                <span className="relative z-10 group-hover:text-white transition-colors flex items-center gap-2">
                  Start Your Project <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </Link>
              <a href="tel:+12819159595" className="inline-flex items-center gap-2"
                style={{ color: 'rgba(255,255,255,0.38)', padding: '16px 36px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase' as const, border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => { e.currentTarget.style.color = W; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                (281) 915-9595
              </a>
            </div>
            <div className="flex items-center justify-center gap-12 flex-wrap">
              {STATS.map(s => (
                <div key={s.l} className="text-center">
                  <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 44px)', color: W, lineHeight: 1 }}>
                    <AnimatedCounter target={s.v} suffix={s.s} />
                  </div>
                  <div className="text-[8px] uppercase tracking-[0.26em] font-semibold mt-2"
                    style={{ color: 'rgba(255,255,255,0.28)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
