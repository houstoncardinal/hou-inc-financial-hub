import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Home, Building2, ClipboardList, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import MagneticButton from '@/components/motion/MagneticButton';

/* ── Tokens ──────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const OW   = '#F7F7F6';
const G50  = '#F2F2F0';
const G200 = '#E2E2E2';
const G500 = '#8A8A8A';
const G700 = '#3A3A3A';
const AC   = '#9D7E3F';
const SF   = "'Cormorant Garamond', Georgia, serif";
const DB   = 'rgba(255,255,255,0.06)';
const LB   = '#E2E2E2';

const GRID_D: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)',
    'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
  ].join(','),
  backgroundSize: '80px 80px',
};
const DOT_L: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.05) 1px,transparent 1px)',
  backgroundSize: '28px 28px',
};

/* ── Corner brackets ─────────────────────────────────────────────── */
function Brackets({ c = 'rgba(255,255,255,0.12)', sz = 16, w = 1 }: { c?: string; sz?: number; w?: number }) {
  const base: React.CSSProperties = { position: 'absolute', width: sz, height: sz, pointerEvents: 'none' };
  const b = `${w}px solid ${c}`;
  return (
    <>
      <span style={{ ...base, top: 0, left: 0,     borderTop: b, borderLeft:  b }} />
      <span style={{ ...base, top: 0, right: 0,    borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: 0, left: 0,  borderBottom: b, borderLeft:  b }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  );
}

/* ── Fill button ─────────────────────────────────────────────────── */
function FillBtn({ to, children, dark = false }: { to: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link
      to={to}
      className="relative overflow-hidden group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
      style={{ backgroundColor: dark ? B : W, color: dark ? W : B }}
    >
      <motion.span
        className="absolute inset-0 origin-left"
        style={{ backgroundColor: dark ? '#1a1a1a' : OW }}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      />
      <span className="relative z-10">{children}</span>
      <ArrowUpRight
        className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={2.5}
      />
    </Link>
  );
}

/* ── Data ────────────────────────────────────────────────────────── */
type Bullet = { slug: string; label: string };
type Pillar = {
  n: string; Icon: React.ElementType; title: string; tagline: string;
  href: string; bullets: Bullet[]; exploreLabel: string;
};

const PILLARS: Pillar[] = [
  {
    n: '01', Icon: Home,
    title: 'Residential Construction',
    tagline: 'Singular Private Estates, Flawlessly Executed',
    href: '/services/residential-construction',
    bullets: [
      { slug: 'custom-home-build',      label: 'Custom Home Build'      },
      { slug: 'home-renovation',        label: 'Home Renovation'        },
      { slug: 'home-addition',          label: 'Home Addition'          },
      { slug: 'kitchen-bath-upgrade',   label: 'Kitchen & Bath Upgrade' },
      { slug: 'master-suite-expansion', label: 'Master Suite Expansion' },
      { slug: 'pool-house-outdoor',     label: 'Pool House & Outdoor'   },
    ],
    exploreLabel: 'Explore Residential',
  },
  {
    n: '02', Icon: Building2,
    title: 'Commercial Construction',
    tagline: 'Landmark Buildings That Define Houston Skylines',
    href: '/services/commercial-construction',
    bullets: [
      { slug: 'class-a-office',         label: 'Class A Office'            },
      { slug: 'retail-mixed-use',       label: 'Retail & Mixed-Use'        },
      { slug: 'restaurant-hospitality', label: 'Restaurant & Hospitality'  },
      { slug: 'industrial-logistics',   label: 'Industrial & Logistics'    },
      { slug: 'healthcare-medical',     label: 'Healthcare & Medical'      },
      { slug: 'educational-facility',   label: 'Educational Facility'      },
    ],
    exploreLabel: 'Explore Commercial',
  },
  {
    n: '03', Icon: ClipboardList,
    title: 'Project Management',
    tagline: 'Precision Oversight from Ground Break to Handover',
    href: '/services/project-management',
    bullets: [
      { slug: 'pre-construction-planning',  label: 'Pre-Construction Planning'  },
      { slug: 'budget-cost-control',        label: 'Budget & Cost Control'      },
      { slug: 'schedule-management',        label: 'Schedule Management'        },
      { slug: 'subcontractor-coordination', label: 'Subcontractor Coordination' },
      { slug: 'quality-assurance',          label: 'Quality Assurance'          },
      { slug: 'owners-rep',                 label: "Owner's Representative"     },
    ],
    exploreLabel: 'Explore Project Management',
  },
];

type ShowcaseCard = { tag: string; title: string; desc: string; stats: { v: string; l: string }[] };

const SHOWCASE: ShowcaseCard[] = [
  {
    tag: 'Residential', title: 'Luxury Custom Homes',
    desc: 'One-of-a-kind private residences for Houston’s most discerning families — from grand River Oaks estates to contemporary lakefront retreats.',
    stats: [{ v: '$1M–$20M', l: 'Project Range' }, { v: '200+', l: 'Homes Built' }],
  },
  {
    tag: 'Commercial', title: 'Commercial Construction',
    desc: 'Class A and Class B office buildings, corporate campuses, and mixed-use towers built on time, on budget, to the highest standard.',
    stats: [{ v: '$2B+', l: 'Built Value' }, { v: '150+', l: 'Projects' }],
  },
  {
    tag: 'Retail', title: 'Retail & Mixed-Use',
    desc: 'High-traffic shopping centers and lifestyle destinations built to attract long-term tenants and generate returns across market cycles.',
    stats: [{ v: '80+', l: 'Projects' }, { v: '3.5M SF', l: 'Built' }],
  },
  {
    tag: 'Multi-Family', title: 'High-Rise Residential',
    desc: 'Luxury condominium towers and premium apartment high-rises with resort amenities, delivered to exacting HOA and developer standards.',
    stats: [{ v: '2,000+', l: 'Units Built' }, { v: '40', l: 'Max Stories' }],
  },
  {
    tag: 'Industrial', title: 'Industrial & Warehouse',
    desc: 'High-bay warehouses, distribution centers, and manufacturing facilities built for operational efficiency and long-term durability.',
    stats: [{ v: '4M+ SF', l: 'Built' }, { v: '65+', l: 'Projects' }],
  },
  {
    tag: 'Renovation', title: 'Renovation & Repositioning',
    desc: 'Historic renovations, hotel conversions, and commercial repositioning executed with precision and minimal disruption to operations.',
    stats: [{ v: '120+', l: 'Projects' }, { v: '100%', l: 'Client Retention' }],
  },
];

const STEPS = [
  {
    n: '01', title: 'Discovery & Feasibility',
    body: 'A no-obligation consultation to understand your vision, site, timeline, and budget — followed by a detailed feasibility review and preliminary scope.',
  },
  {
    n: '02', title: 'Preconstruction & Planning',
    body: 'Comprehensive estimates, schedules, bid packages, and value engineering options. You know exactly what you’re getting before a shovel hits the ground.',
  },
  {
    n: '03', title: 'Construction Execution',
    body: 'Relentless quality control, weekly owner reporting, and proactive subcontractor management. Your dedicated project lead is reachable every day.',
  },
  {
    n: '04', title: 'Closeout & Handover',
    body: 'A comprehensive punch-list process, commissioning of all systems, and complete documentation. Our warranty team remains available long after the ribbon is cut.',
  },
];

const CAPS = [
  'Preconstruction & Estimating', 'Construction Management', 'Design-Build Services',
  'General Contracting',          'LEED Certification Mgmt', 'BIM & 3D Modeling',
  'Value Engineering',            'Subcontractor Management', 'Safety & Risk Programs',
  'Post-Construction Warranty',   'Owner Reporting',          'Tenant Coordination',
];

const FAQS = [
  {
    q: 'How do I begin working with Houston Enterprise?',
    a: 'The process begins with a complimentary discovery consultation — we learn about your project, timeline, budget expectations, and goals. From there, we prepare a detailed scope and proposal within 5–7 business days.',
  },
  {
    q: 'Do you handle design and architecture, or construction only?',
    a: 'We are a full-service construction firm with deep relationships with Houston’s top architectural and engineering firms. We can coordinate the full design-build process or deliver construction-only services — our team manages whichever scope works best for you.',
  },
  {
    q: 'What types of contracts does Houston Enterprise offer?',
    a: 'We offer Fixed-Price (lump sum) contracts for well-defined scopes, Guaranteed Maximum Price (GMP) for complex projects, and Cost-Plus arrangements for highly custom builds. We recommend the right structure for your project during preconstruction.',
  },
  {
    q: 'What is your geographic service area?',
    a: 'We primarily build across the Greater Houston Metropolitan Area, including Houston proper, The Woodlands, Katy, Sugar Land, Pearland, and surrounding communities. Selected large commercial projects have been delivered across Texas.',
  },
  {
    q: 'How do you ensure on-budget delivery?',
    a: 'Our preconstruction team invests heavily in detailed estimating, subcontractor bid leveling, and value engineering before we ever break ground. Our change-order rate is among the lowest in the Houston market — transparency and precision upfront eliminates surprises downstream.',
  },
];

/* ── Sub-components ──────────────────────────────────────────────── */
function PillarBullet({ slug, label }: { slug: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={`/services/${slug}`}
      className="flex items-center gap-2.5 py-2.5 text-[10px] leading-none"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        color: hov ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.32)',
        transition: 'color 0.2s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ backgroundColor: hov ? AC : 'rgba(157,126,63,0.38)', transition: 'background-color 0.2s' }}
      />
      <span className="flex-1 tracking-wide">{label}</span>
      <ArrowUpRight
        className="w-2.5 h-2.5 shrink-0"
        style={{ color: AC, opacity: hov ? 1 : 0, transition: 'opacity 0.2s' }}
        strokeWidth={2.5}
      />
    </Link>
  );
}

function PillarCard({ p, idx }: { p: Pillar; idx: number }) {
  const Icon = p.Icon;
  return (
    <Reveal delay={idx * 0.1} y={32} className="h-full">
      <motion.div
        className="relative flex flex-col h-full overflow-hidden p-8 md:p-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.025)', border: `1px solid ${DB}` }}
        initial="rest"
        whileHover="hover"
      >
        {/* Gold top sweep */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 origin-left z-10"
          style={{ backgroundColor: AC }}
          variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        />

        <Brackets c="rgba(157,126,63,0.15)" sz={14} />

        {/* Number watermark */}
        <div
          aria-hidden
          className="absolute top-4 right-5 select-none pointer-events-none"
          style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(72px, 11vw, 130px)', color: 'rgba(255,255,255,0.03)', lineHeight: 1,
          }}
        >
          {p.n}
        </div>

        {/* Icon badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 w-fit"
          style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.22)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={1.5} />
          <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
            {p.n}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(22px, 3vw, 36px)', color: W, lineHeight: 1.1, marginBottom: '0.4rem',
          }}
        >
          {p.title}
        </h3>

        {/* Tagline */}
        <p
          className="text-[10px] leading-relaxed font-light mb-6"
          style={{ color: 'rgba(255,255,255,0.36)', fontStyle: 'italic' }}
        >
          {p.tagline}
        </p>

        {/* Gold divider */}
        <div className="h-px mb-6" style={{ backgroundColor: 'rgba(157,126,63,0.22)' }} />

        {/* Bullets */}
        <div className="flex-1 mb-8">
          {p.bullets.map((b) => (
            <PillarBullet key={b.slug} slug={b.slug} label={b.label} />
          ))}
        </div>

        {/* CTA */}
        <div>
          <FillBtn to={p.href}>{p.exploreLabel}</FillBtn>
        </div>
      </motion.div>
    </Reveal>
  );
}

function ShowcaseItem({ card, i }: { card: ShowcaseCard; i: number }) {
  const [hov, setHov] = useState(false);
  const col = i % 3;
  const row = Math.floor(i / 3);
  return (
    <Reveal delay={(col) * 0.07} y={20}>
      <motion.div
        className="relative p-8 md:p-9 flex flex-col gap-4 h-full cursor-default"
        style={{
          backgroundColor: hov ? W : 'transparent',
          borderRight: col < 2 ? `1px solid ${LB}` : 'none',
          borderBottom: row === 0 ? `1px solid ${LB}` : 'none',
          transition: 'background-color 0.22s',
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Brackets c={hov ? 'rgba(157,126,63,0.2)' : 'rgba(0,0,0,0.05)'} sz={11} />

        {/* Gold top sweep on hover */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 origin-left"
          style={{ backgroundColor: AC }}
          animate={{ scaleX: hov ? 1 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Category tag */}
        <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: AC }}>
          {card.tag}
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 400,
            fontSize: 'clamp(18px, 2.4vw, 26px)', color: B, lineHeight: 1.1,
          }}
        >
          {card.title}
        </h3>

        {/* Description */}
        <p className="text-[11px] leading-relaxed font-light flex-1" style={{ color: G500 }}>
          {card.desc}
        </p>

        {/* Stats row */}
        <div className="flex gap-6 pt-4" style={{ borderTop: `1px solid ${LB}` }}>
          {card.stats.map((s) => (
            <div key={s.l}>
              <div
                style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.05rem', color: B, lineHeight: 1 }}
              >
                {s.v}
              </div>
              <div className="text-[7px] uppercase tracking-[0.18em] mt-0.5" style={{ color: G500 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Inquire link */}
        <Link
          to="/contact"
          className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.28em] font-bold transition-colors"
          style={{ color: hov ? AC : G500 }}
        >
          Inquire
          <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
        </Link>
      </motion.div>
    </Reveal>
  );
}

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${LB}` }}>
      <button
        className="w-full flex items-start justify-between gap-6 py-6 text-left"
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex items-start gap-5">
          <span className="text-[8px] font-mono mt-0.5 shrink-0" style={{ color: AC }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-[14px] font-medium tracking-tight" style={{ color: B }}>{q}</span>
        </div>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.24 }} className="shrink-0 mt-0.5">
          <Plus className="w-4 h-4" style={{ color: G700 }} strokeWidth={1.5} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="pb-7 pl-11 text-[12px] leading-relaxed font-light" style={{ color: G500 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function Services() {
  const [hovCap, setHovCap] = useState<number | null>(null);

  return (
    <PublicLayout>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '62vh', backgroundColor: B, ...GRID_D }}
      >
        {/* Scan line */}
        <motion.div
          className="absolute top-0 inset-x-0 h-px origin-left"
          style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 75% 10%, rgba(157,126,63,0.08) 0%, transparent 50%)' }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-40 w-full">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div>
              <motion.div
                className="flex items-center gap-4 mb-8"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.9 }}
              >
                <motion.div
                  className="h-px"
                  style={{ backgroundColor: AC }}
                  initial={{ width: 0 }}
                  animate={{ width: 40 }}
                  transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Our Services
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                  fontSize: 'clamp(48px, 8vw, 110px)', color: W, lineHeight: 0.92,
                }}
              >
                Built for<br /><span style={{ color: AC }}>Ambition.</span>
              </motion.h1>
            </div>

            <Reveal direction="right" x={36} className="max-w-sm">
              <p className="text-[13px] leading-relaxed font-light mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Three specialized service divisions — one unified standard of excellence. Every Houston Enterprise project is delivered with uncompromising quality, complete transparency, and industry-leading schedule adherence.
              </p>
              <div className="flex flex-wrap gap-4">
                <FillBtn to="/start-project" dark>Start a Project</FillBtn>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4 border transition-all"
                  style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = W; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  View Portfolio
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Metrics bar ──────────────────────────────────────── */}
      <div style={{ backgroundColor: '#0D0D0D', borderTop: DB, borderBottom: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderLeft: DB }}>
            {([
              { value: 500, prefix: '',  suffix: '+',    label: 'Projects Delivered'    },
              { value: 2,   prefix: '$', suffix: 'B+',   label: 'Total Built Value'     },
              { value: 28,  prefix: '',  suffix: ' Yrs', label: 'Houston Track Record'  },
              { value: 98,  prefix: '',  suffix: '%',    label: 'On-Time Delivery'      },
            ] as const).map((m) => (
              <div key={m.label} className="px-6 py-5 flex flex-col gap-1" style={{ borderRight: DB }}>
                <div
                  style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.65rem', color: W, lineHeight: 1 }}
                >
                  <AnimatedCounter value={m.value} prefix={m.prefix} suffix={m.suffix} />
                </div>
                <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Pillars ─────────────────────────────────── */}
      <section className="py-20 md:py-28 relative" style={{ backgroundColor: B, ...GRID_D }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(157,126,63,0.06) 0%, transparent 55%)' }}
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: 'rgba(255,255,255,0.26)' }}>
                Service Divisions
              </div>
            </div>
            <h2
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(32px, 5vw, 64px)', color: W, lineHeight: 1.0,
              }}
            >
              Three Pillars of<br />
              <span style={{ color: AC }}>Expertise</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ backgroundColor: DB }}>
            {PILLARS.map((p, idx) => (
              <PillarCard key={p.n} p={p} idx={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* ── All Services Showcase ────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ backgroundColor: G50, ...DOT_L }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>
                Full Portfolio
              </div>
            </div>
            <h2
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(32px, 5vw, 64px)', color: B, lineHeight: 1.0,
              }}
            >
              All Services
            </h2>
          </Reveal>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0"
            style={{ border: `1px solid ${LB}` }}
          >
            {SHOWCASE.map((card, i) => (
              <ShowcaseItem key={card.title} card={card} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Delivery Model ───────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: OW }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>
                How We Work
              </div>
            </div>
            <h2
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(32px, 5vw, 64px)', color: B, lineHeight: 1.0,
              }}
            >
              Our Delivery Model
            </h2>
          </Reveal>

          {/* 4-col grid on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px" style={{ backgroundColor: G200 }}>
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08} y={20}>
                <motion.div
                  className="flex flex-col gap-4 p-7 md:p-8 h-full"
                  style={{ backgroundColor: OW }}
                  whileHover={{ backgroundColor: W }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono" style={{ color: AC }}>{step.n}</span>
                    {i < 3 && (
                      <div className="hidden md:block flex-1 h-px" style={{ backgroundColor: G200 }} />
                    )}
                  </div>
                  <div className="text-[13px] font-bold tracking-tight" style={{ color: B }}>
                    {step.title}
                  </div>
                  <p className="text-[10px] leading-relaxed font-light" style={{ color: G500 }}>
                    {step.body}
                  </p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex justify-end">
            <MagneticButton as="div">
              <Link
                to="/contact"
                className="relative overflow-hidden group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
                style={{ backgroundColor: B, color: W }}
              >
                <motion.span
                  className="absolute inset-0 origin-left"
                  style={{ backgroundColor: AC }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="relative z-10">Schedule Consultation</span>
                <ArrowUpRight
                  className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.5}
                />
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </section>

      {/* ── Capabilities Grid ────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: B, ...GRID_D }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: 'rgba(255,255,255,0.26)' }}>
                Full Scope
              </div>
            </div>
            <h2
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(32px, 5vw, 64px)', color: W, lineHeight: 1.0,
              }}
            >
              Core Capabilities
            </h2>
          </Reveal>

          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0"
            style={{ borderTop: DB, borderLeft: DB }}
          >
            {CAPS.map((cap, i) => (
              <motion.div
                key={cap}
                className="relative px-6 py-6 flex items-center gap-3 cursor-default"
                style={{ borderRight: DB, borderBottom: DB }}
                onMouseEnter={() => setHovCap(i)}
                onMouseLeave={() => setHovCap(null)}
                animate={{ backgroundColor: hovCap === i ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0)' }}
                transition={{ duration: 0.22 }}
              >
                <motion.div
                  animate={{ backgroundColor: hovCap === i ? AC : 'rgba(157,126,63,0.15)' }}
                  transition={{ duration: 0.22 }}
                  className="w-1 h-5 shrink-0"
                />
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-medium leading-relaxed"
                  style={{ color: hovCap === i ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }}
                >
                  {cap}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: W, borderTop: `1px solid ${LB}` }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>
                Have Questions
              </div>
            </div>
            <h2
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(32px, 5vw, 64px)', color: B, lineHeight: 1.0,
              }}
            >
              FAQ
            </h2>
          </Reveal>
          <div style={{ borderTop: `1px solid ${LB}` }}>
            {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: B, ...GRID_D }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 58%, rgba(157,126,63,0.12), transparent 50%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
              <div className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: AC }}>
                Get Started
              </div>
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
            </div>
            <h2
              className="mb-8"
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(40px, 7vw, 96px)', color: W, lineHeight: 0.96,
              }}
            >
              Let&apos;s Build<br /><span style={{ color: AC }}>Something Great.</span>
            </h2>
            <p className="text-[13px] leading-relaxed mb-12 max-w-md mx-auto font-light" style={{ color: 'rgba(255,255,255,0.27)' }}>
              Every exceptional project starts with a conversation. Contact our team today for a complimentary consultation.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <MagneticButton as="div">
                <Link
                  to="/contact"
                  className="relative overflow-hidden group flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4"
                  style={{ backgroundColor: W, color: B }}
                >
                  <motion.span
                    className="absolute inset-0 origin-left"
                    style={{ backgroundColor: AC }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className="relative z-10 group-hover:text-white transition-colors duration-150">
                    Free Consultation
                  </span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </MagneticButton>
              <Link
                to="/portfolio"
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.42)'; e.currentTarget.style.color = W; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                View Our Work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
