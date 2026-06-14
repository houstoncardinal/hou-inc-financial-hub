import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Home, Building2, ShoppingBag, Layers, Factory, RefreshCw, ChevronDown, Plus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import MagneticButton from '@/components/motion/MagneticButton';

/* ── Tokens ───────────────────────────────────────────────────────── */
const B   = '#0A0A0A';
const W   = '#FFFFFF';
const OW  = '#F7F7F6';
const G50 = '#F2F2F0';
const G200 = '#E2E2E2';
const G500 = '#8A8A8A';
const G700 = '#3A3A3A';
const AC  = '#9D7E3F';
const SF  = "'Cormorant Garamond', Georgia, serif";

const DB = 'rgba(255,255,255,0.06)';
const LB = '#E2E2E2';

const GRID_D: React.CSSProperties = {
  backgroundImage: ['linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', 'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)'].join(','),
  backgroundSize: '80px 80px',
};
const DOT_L: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.05) 1px,transparent 1px)',
  backgroundSize: '28px 28px',
};

/* ── Corner brackets ──────────────────────────────────────────────── */
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

/* ── Fill button ──────────────────────────────────────────────────── */
function FillBtn({ to, children, dark = false }: { to: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link to={to} className="relative overflow-hidden group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
      style={{ backgroundColor: dark ? B : W, color: dark ? W : B }}>
      <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: dark ? '#1a1a1a' : OW }}
        initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      <span className="relative z-10">{children}</span>
      <ArrowUpRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.5} />
    </Link>
  );
}

/* ── Service data ─────────────────────────────────────────────────── */
type Service = {
  id: string; n: string; icon: React.ElementType; title: string; tag: string;
  tagline: string; description: string; expanded: string;
  features: string[]; deliverables: string[];
  stats: { v: string; l: string }[];
  dark: boolean;
};

const SERVICES: Service[] = [
  {
    id: 'service-01', n: '01', icon: Home, title: 'Luxury Custom Homes', tag: 'Residential',
    tagline: 'Singular Private Estates Built to Absolute Perfection',
    description: "We design and build one-of-a-kind private residences for Houston's most discerning families — from grand River Oaks estates to contemporary lakefront retreats. Every detail is handled in-house, from architectural coordination through interior finish selection.",
    expanded: "Our residential team manages every aspect of the custom home journey — from site feasibility through final walkthrough. We work exclusively with top Houston architectural firms and source premium materials through decades-long supplier relationships. Expect a dedicated project manager, weekly progress reports, and a zero-surprise delivery.",
    features: ['Custom architectural coordination','Premium material procurement','Smart home integration','Resort-grade pools & outdoor living','Home theaters & wine cellars','Landscape & hardscape design'],
    deliverables: ['Fixed-price guaranteed contracts','Weekly video site walkthroughs','Dedicated project management team','Post-completion warranty program','Interior design coordination','Concierge aftercare service'],
    stats: [{ v: '200+', l: 'Custom Residences' }, { v: '$1M–$20M', l: 'Project Value Range' }, { v: '12–24', l: 'Months Avg. Build' }],
    dark: true,
  },
  {
    id: 'service-02', n: '02', icon: Building2, title: 'Commercial Construction', tag: 'Commercial',
    tagline: 'Class A Office Buildings That Define Skylines',
    description: 'HOU INC builds landmark Class A and Class B commercial spaces that project prestige, drive productivity, and hold their value for decades. From ground-up towers to major tenant improvements — on time, on budget, every time.',
    expanded: "Our commercial division is built for complexity. We deliver 20-story office towers, LEED-certified corporate campuses, and mid-rise mixed-use developments with the same precision we bring to every project. Our preconstruction teams build schedules with full contingency planning, meaning zero surprises during execution.",
    features: ['Class A & B office towers','Corporate headquarters & campuses','LEED Gold / Platinum certification','Structured parking systems','Multi-tenant build-outs','MEP design-build coordination'],
    deliverables: ['Guaranteed maximum price contracts','Monthly owner reporting packages','Full BIM / 3D modeling','LEED documentation & certification','Commissioning & tenant coordination','Post-occupancy support'],
    stats: [{ v: '150+', l: 'Commercial Projects' }, { v: '$2B+', l: 'Total Commercial Value' }, { v: '1.2M+', l: 'SF Office Delivered' }],
    dark: false,
  },
  {
    id: 'service-03', n: '03', icon: ShoppingBag, title: 'Retail & Mixed-Use', tag: 'Retail',
    tagline: 'High-Traffic Retail Destinations Built to Perform',
    description: 'End-to-end development of shopping centers, lifestyle destinations, and integrated mixed-use communities where commerce, culture, and residential life converge — built to draw traffic and hold tenants for decades.',
    expanded: "Retail construction demands precision phasing, tenant coordination, and schedule adherence that never wavers. Our retail team has delivered anchor retail centers, specialty lifestyle developments, and full mixed-use towers across the Greater Houston market. We understand retail operations and build accordingly.",
    features: ['Anchor retail shopping centers','Lifestyle destination developments','Mixed-use residential/retail towers','Restaurant & food hall build-outs','Phased tenant delivery programs','Common area & parking management'],
    deliverables: ['Phased tenant delivery scheduling','Anchor tenant coordination','Retail operations planning','MEP for high-density food use','Signage & wayfinding integration','Landscaping & hardscape'],
    stats: [{ v: '80+', l: 'Retail Projects' }, { v: '3.5M+', l: 'SF Retail Built' }, { v: '98%', l: 'On-Time Tenant Delivery' }],
    dark: true,
  },
  {
    id: 'service-04', n: '04', icon: Layers, title: 'High-Rise Residential', tag: 'Multi-Family',
    tagline: 'Premium Condominiums & Luxury Apartment Towers',
    description: 'Luxury high-rise residential towers and mid-rise condominium buildings that deliver premium amenities, panoramic views, and lasting asset value — delivered on schedule to exacting HOA and developer standards.',
    expanded: "High-rise residential is technically demanding and schedule-critical. Our team manages floor-by-floor phasing, MEP coordination across dozens of units, elevator and mechanical integration, and punch-list completion at scale. We've delivered over 2,000 luxury residential units across the Houston metro.",
    features: ['Luxury condominium towers','Premium apartment high-rises','Rooftop amenity decks','Resort pools & fitness centers','Concierge & lobby design','Structured parking integration'],
    deliverables: ['HOA & condo association coordination','Unit-by-unit finish scheduling','Elevator & MEP commissioning','Rooftop amenity delivery','Common area completion packages','FF&E coordination support'],
    stats: [{ v: '2,000+', l: 'Residential Units Built' }, { v: '40', l: 'Stories Max Height' }, { v: '100%', l: 'HOA Satisfaction Rate' }],
    dark: false,
  },
  {
    id: 'service-05', n: '05', icon: Factory, title: 'Industrial & Warehouse', tag: 'Industrial',
    tagline: 'Large-Scale Logistics & Manufacturing Facilities',
    description: 'High-bay warehouses, distribution centers, and manufacturing facilities built for operational efficiency, maximum throughput, and long-term durability — on schedule, to spec, with zero disruption to your operations.',
    expanded: "Industrial construction is all about function, schedule, and cost certainty. Our team has delivered millions of square feet of distribution, manufacturing, and cold-storage facilities for Fortune 500 tenants and regional logistics operators across the Houston market. Tilt-wall, steel frame, and pre-engineered systems.",
    features: ['High-bay tilt-wall warehouses','Distribution & logistics centers','Cold storage & refrigerated facilities','Manufacturing & flex industrial','Truck court & dock design','Industrial MEP systems'],
    deliverables: ['Tilt-up & steel frame construction','Loading dock & court engineering','Heavy MEP for manufacturing loads','Fire suppression systems','Industrial flooring & flatwork','Utility coordination & permitting'],
    stats: [{ v: '4M+', l: 'SF Industrial Built' }, { v: '65+', l: 'Warehouse Projects' }, { v: '36', l: 'Ft Max Clear Height' }],
    dark: true,
  },
  {
    id: 'service-06', n: '06', icon: RefreshCw, title: 'Renovation & Repositioning', tag: 'Renovation',
    tagline: 'Transforming Existing Assets Into Premium Properties',
    description: 'Historic renovations, hotel conversions, commercial repositioning, and occupied-building renovations — executed with precision and minimal disruption to operations, tenants, and communities.',
    expanded: "Renovation projects are among the most technically complex builds — occupied buildings, existing systems, unknown conditions, and strict timelines. Our renovation team excels at pre-construction investigation, live-building phasing, and tenant communication, ensuring your asset transformation goes exactly as planned.",
    features: ['Historic building rehabilitation','Hotel & hospitality renovations','Office repositioning & upgrades','Occupied building renovation management','Adaptive reuse & conversion','Facade & exterior restoration'],
    deliverables: ['Pre-construction site investigation','Live-building phasing plans','Tenant / occupant communication program','Historic preservation compliance','Existing MEP integration','Full permit management'],
    stats: [{ v: '120+', l: 'Renovation Projects' }, { v: '60+', l: 'Year Oldest Bldg Renovated' }, { v: '100%', l: 'Client Retention Rate' }],
    dark: false,
  },
];

const FAQS = [
  { q: 'How do I begin working with HOU INC?',
    a: 'The process begins with a complimentary discovery consultation — we learn about your project, timeline, budget expectations, and goals. From there, we prepare a detailed scope and proposal within 5–7 business days.' },
  { q: 'Do you handle design and architecture, or construction only?',
    a: "We are a full-service construction firm with deep relationships with Houston's top architectural and engineering firms. We can coordinate the full design-build process or deliver construction-only services — our team manages whichever scope works best for you." },
  { q: 'What types of contracts does HOU INC offer?',
    a: "We offer Fixed-Price (lump sum) contracts for well-defined scopes, Guaranteed Maximum Price (GMP) for complex projects, and Cost-Plus arrangements for highly custom builds. We recommend the right structure for your project during preconstruction." },
  { q: 'What is your geographic service area?',
    a: 'We primarily build across the Greater Houston Metropolitan Area, including Houston proper, The Woodlands, Katy, Sugar Land, Pearland, and surrounding communities. Selected large commercial projects have been delivered across Texas.' },
  { q: 'How do you ensure on-budget delivery?',
    a: 'Our preconstruction team invests heavily in detailed estimating, subcontractor bid leveling, and value engineering before we ever break ground. Our change-order rate is among the lowest in the Houston market — transparency and precision upfront eliminates surprises downstream.' },
];

/* ── Service Section ──────────────────────────────────────────────── */
function ServiceSection({ s }: { s: Service }) {
  const [expanded, setExpanded] = useState(false);
  const [hovFeature, setHovFeature] = useState<number | null>(null);

  const dark = s.dark;
  const bg   = dark ? B : OW;
  const pat  = dark ? GRID_D : DOT_L;
  const tc   = dark ? W : B;
  const sc   = dark ? 'rgba(255,255,255,0.3)' : G500;
  const bdr  = dark ? DB : `1px solid ${LB}`;
  const nbdr = dark ? 'rgba(255,255,255,0.05)' : LB;

  const Icon = s.icon;

  return (
    <section id={s.id} className="py-32 md:py-44 relative scroll-mt-24" style={{ backgroundColor: bg, ...pat }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        <div className="flex items-center justify-between flex-wrap gap-4 mb-16">
          <div className="flex items-center gap-4">
            <div className="h-px w-10" style={{ backgroundColor: AC }} />
            <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: AC }}>{s.tag}</div>
          </div>
          <div className="text-[8px] uppercase tracking-[0.28em] font-mono" style={{ color: dark ? 'rgba(255,255,255,0.15)' : G200 }}>
            Service {s.n} / 06
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-0" style={{ border: dark ? 'none' : `1px solid ${LB}` }}>

          {/* Visual panel */}
          <div className="relative flex flex-col justify-between p-10 md:p-14 min-h-[420px]"
            style={{ backgroundColor: dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)', borderRight: bdr }}>
            <Brackets c={dark ? 'rgba(157,126,63,0.28)' : 'rgba(0,0,0,0.1)'} sz={20} />

            <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(96px, 18vw, 188px)', color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', lineHeight: 1, userSelect: 'none', marginBottom: '2rem' }}>
              {s.n}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6" style={{ backgroundColor: dark ? 'rgba(157,126,63,0.12)' : 'rgba(157,126,63,0.08)', border: '1px solid rgba(157,126,63,0.2)' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={1.5} />
                <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>{s.tag}</span>
              </div>
              <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 52px)', color: tc, lineHeight: 1.05, marginBottom: '0.6rem' }}>
                {s.title}
              </h3>
              <p className="text-[10px] leading-relaxed font-light" style={{ color: sc }}>{s.tagline}</p>
            </div>

            <div className="grid grid-cols-3 gap-0 mt-10 pt-8" style={{ borderTop: bdr }}>
              {s.stats.map((st, i) => (
                <div key={st.l} className="pr-4" style={{ borderRight: i < 2 ? bdr : 'none' }}>
                  <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.3rem', color: tc, lineHeight: 1 }}>{st.v}</div>
                  <div className="text-[7px] uppercase tracking-[0.18em] mt-1" style={{ color: sc }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Content panel */}
          <div className="flex flex-col p-10 md:p-14">
            <p className="text-[13px] leading-relaxed font-light mb-6" style={{ color: sc }}>{s.description}</p>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="text-[12px] leading-relaxed font-light mb-6" style={{ color: dark ? 'rgba(255,255,255,0.22)' : G500 }}>{s.expanded}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] font-bold mb-10 transition-colors"
              style={{ color: AC, background: 'none', border: 'none', cursor: 'pointer' }}>
              {expanded ? 'Read Less' : 'Read More'}
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.28 }}>
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.span>
            </button>

            <div className="mb-8">
              <div className="text-[7px] uppercase tracking-[0.38em] font-semibold mb-5" style={{ color: dark ? 'rgba(255,255,255,0.2)' : G500 }}>Scope Includes</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                {s.features.map((f, fi) => (
                  <motion.div
                    key={f}
                    className="flex items-start gap-2.5 py-2.5 pr-4 cursor-default"
                    style={{ borderBottom: `1px solid ${nbdr}` }}
                    onMouseEnter={() => setHovFeature(fi)}
                    onMouseLeave={() => setHovFeature(null)}
                  >
                    <motion.div animate={{ scale: hovFeature === fi ? 1.15 : 1 }} transition={{ duration: 0.2 }} className="mt-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3" style={{ color: hovFeature === fi ? AC : (dark ? 'rgba(157,126,63,0.5)' : AC) }} strokeWidth={1.5} />
                    </motion.div>
                    <span className="text-[10px] leading-relaxed" style={{ color: dark ? (hovFeature === fi ? W : 'rgba(255,255,255,0.32)') : (hovFeature === fi ? B : G500) }}>
                      {f}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <div className="text-[7px] uppercase tracking-[0.38em] font-semibold mb-5" style={{ color: dark ? 'rgba(255,255,255,0.2)' : G500 }}>What We Deliver</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {s.deliverables.map((d) => (
                  <div key={d} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em]" style={{ color: dark ? 'rgba(255,255,255,0.2)' : G500 }}>
                    <Plus className="w-2.5 h-2.5 shrink-0" style={{ color: AC, opacity: 0.65 }} strokeWidth={2.5} />
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-8" style={{ borderTop: bdr }}>
              <Link to="/contact"
                className="relative overflow-hidden group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
                style={{ backgroundColor: dark ? 'rgba(255,255,255,0.06)' : B, color: W }}>
                <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                <span className="relative z-10">Inquire About {s.title}</span>
                <ArrowUpRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ Item ─────────────────────────────────────────────────────── */
function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${LB}` }}>
      <button
        className="w-full flex items-start justify-between gap-6 py-7 text-left"
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
            style={{ overflow: 'hidden' }}>
            <p className="pb-8 pl-11 text-[12px] leading-relaxed font-light" style={{ color: G500 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CAPS = [
  'Preconstruction & Estimating','Construction Management','Design-Build Services',
  'General Contracting','LEED Certification Management','BIM & 3D Modeling',
  'Value Engineering','Subcontractor Management','Safety & Risk Programs',
  'Post-Construction Warranty','Owner Reporting & Transparency','Tenant Coordination',
];

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Services() {
  const NAV = SERVICES.map(s => ({ id: s.id, n: s.n, short: s.tag }));
  const [hovCap, setHovCap] = useState<number | null>(null);

  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '82vh', backgroundColor: B, ...GRID_D }}>
        <motion.div className="absolute top-0 inset-x-0 h-px origin-left" style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 75% 10%, rgba(157,126,63,0.08) 0%, transparent 50%)' }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-44 w-full">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div>
              <motion.div className="flex items-center gap-4 mb-10"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
                <motion.div className="h-px" style={{ backgroundColor: AC }}
                  initial={{ width: 0 }} animate={{ width: 40 }} transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
                <span className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Our Services</span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 9vw, 128px)', color: W, lineHeight: 0.9 }}>
                Built for<br /><span style={{ color: AC }}>Ambition.</span>
              </motion.h1>
            </div>
            <Reveal direction="right" x={36} className="max-w-md">
              <p className="text-[13px] leading-relaxed font-light mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Six specialized service divisions — one unified standard of excellence. Every HOU INC project is delivered with uncompromising quality, complete transparency, and industry-leading schedule adherence.
              </p>
              <FillBtn to="/contact" dark>Start a Project</FillBtn>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ backgroundColor: '#0D0D0D', borderTop: DB, borderBottom: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderLeft: DB }}>
            {[
              { v: '500+',   l: 'Projects Delivered' },
              { v: '$2B+',   l: 'Total Built Value' },
              { v: '25 Yrs', l: 'Houston Track Record' },
              { v: '98%',    l: 'On-Time Delivery Rate' },
            ].map((t, i) => (
              <div key={t.l} className="px-6 py-4 flex flex-col gap-0.5" style={{ borderRight: DB }}>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.55rem', color: W }}>{t.v}</div>
                <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.2)' }}>{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky service nav */}
      <div className="hidden md:block sticky top-0 z-30" style={{ backgroundColor: W, borderBottom: `1px solid ${LB}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 overflow-x-auto">
          <div className="flex items-center gap-0">
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`}
                className="flex items-center gap-2 px-5 py-3.5 text-[8px] uppercase tracking-[0.28em] font-bold whitespace-nowrap transition-colors group relative"
                style={{ color: G500 }}
                onMouseEnter={e => (e.currentTarget.style.color = B)}
                onMouseLeave={e => (e.currentTarget.style.color = G500)}>
                <span className="text-[7px] font-mono" style={{ color: AC }}>{n.n}</span>
                {n.short}
                <span className="absolute bottom-0 inset-x-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ backgroundColor: B }} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Service Sections */}
      {SERVICES.map((s) => <ServiceSection key={s.id} s={s} />)}

      {/* Capabilities Grid */}
      <section className="py-36 md:py-48" style={{ backgroundColor: B, ...GRID_D }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: 'rgba(255,255,255,0.26)' }}>Full Scope</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: W, lineHeight: 1.0 }}>
              Core Capabilities
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0" style={{ borderTop: DB, borderLeft: DB }}>
            {CAPS.map((cap, i) => (
              <motion.div key={cap}
                className="relative px-7 py-7 flex items-center gap-3 cursor-default"
                style={{ borderRight: DB, borderBottom: DB }}
                onMouseEnter={() => setHovCap(i)}
                onMouseLeave={() => setHovCap(null)}
                animate={{ backgroundColor: hovCap === i ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0)' }}
                transition={{ duration: 0.22 }}>
                <motion.div
                  animate={{ backgroundColor: hovCap === i ? AC : 'rgba(157,126,63,0.15)' }}
                  transition={{ duration: 0.22 }}
                  className="w-1 h-6 shrink-0"
                />
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium leading-relaxed"
                  style={{ color: hovCap === i ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }}>
                  {cap}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Model */}
      <section className="py-36 md:py-48" style={{ backgroundColor: OW }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-12 gap-16 items-start">
            <Reveal className="md:col-span-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-10" style={{ backgroundColor: AC }} />
                <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>How We Work</div>
              </div>
              <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5vw, 64px)', color: B, lineHeight: 1.0, marginBottom: '1.75rem' }}>
                Our Delivery<br />Model
              </h2>
              <p className="text-[12px] leading-relaxed font-light mb-10" style={{ color: G500 }}>
                Every HOU INC project follows a precision-engineered delivery model built over 25 years of construction excellence. We invest heavily in preconstruction to eliminate risk before we break ground — so execution is predictable, accountable, and completely transparent.
              </p>
              <MagneticButton as="div">
                <Link to="/contact"
                  className="relative overflow-hidden group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
                  style={{ backgroundColor: B, color: W }}>
                  <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                    initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                  <span className="relative z-10">Schedule Consultation</span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.5} />
                </Link>
              </MagneticButton>
            </Reveal>
            <div className="md:col-span-7">
              <div className="space-y-0" style={{ border: `1px solid ${LB}` }}>
                {[
                  { n: '01', title: 'Discovery & Feasibility',    body: "We begin with a no-obligation consultation to understand your project vision, site conditions, timeline, and budget expectations. From there, we conduct a detailed feasibility review and preliminary scope." },
                  { n: '02', title: 'Preconstruction & Planning', body: "Our team develops a comprehensive preconstruction package including detailed estimates, schedule, bid packages, and value engineering options. You know exactly what you're getting before a shovel hits the ground." },
                  { n: '03', title: 'Construction Execution',     body: "Relentless quality control, weekly owner reporting, and proactive subcontractor management define our build phase. Your dedicated project lead is reachable every day — not once a month." },
                  { n: '04', title: 'Closeout & Handover',        body: "A comprehensive punch-list process, commissioning of all systems, and complete documentation package ensures a smooth handover. Our warranty team remains available long after the ribbon is cut." },
                ].map((step, i) => (
                  <Reveal key={step.n} delay={i * 0.1} y={24}>
                    <motion.div whileHover={{ backgroundColor: G50 }} transition={{ duration: 0.2 }}
                      className="flex gap-6 p-7 md:p-9"
                      style={{ borderBottom: i < 3 ? `1px solid ${LB}` : 'none' }}>
                      <div className="text-[8px] font-mono shrink-0 mt-1" style={{ color: AC }}>{step.n}</div>
                      <div>
                        <div className="text-[13px] font-bold mb-2 tracking-tight" style={{ color: B }}>{step.title}</div>
                        <p className="text-[11px] leading-relaxed font-light" style={{ color: G500 }}>{step.body}</p>
                      </div>
                    </motion.div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-36 md:py-48" style={{ backgroundColor: W, borderTop: `1px solid ${LB}` }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>Have Questions</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: B, lineHeight: 1.0 }}>
              FAQ
            </h2>
          </Reveal>
          <div style={{ borderTop: `1px solid ${LB}` }}>
            {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} i={i} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-44 md:py-56 relative overflow-hidden" style={{ backgroundColor: B, ...GRID_D }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 58%, rgba(157,126,63,0.12), transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
              <div className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: AC }}>Get Started</div>
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
            </div>
            <h2 className="mb-8" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(40px, 7vw, 96px)', color: W, lineHeight: 0.96 }}>
              Let's Build<br /><span style={{ color: AC }}>Something Great.</span>
            </h2>
            <p className="text-[13px] leading-relaxed mb-14 max-w-md mx-auto font-light" style={{ color: 'rgba(255,255,255,0.27)' }}>
              Every exceptional project starts with a conversation. Contact our team today for a complimentary consultation.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <MagneticButton as="div">
                <Link to="/contact"
                  className="relative overflow-hidden group flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4"
                  style={{ backgroundColor: W, color: B }}>
                  <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                    initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                  <span className="relative z-10 group-hover:text-white transition-colors duration-150">Free Consultation</span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </MagneticButton>
              <Link to="/portfolio"
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.42)'; e.currentTarget.style.color = W; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                View Our Work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
