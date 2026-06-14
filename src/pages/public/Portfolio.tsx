import { useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import TiltCard from '@/components/motion/TiltCard';
import MagneticButton from '@/components/motion/MagneticButton';

/* ── Tokens ───────────────────────────────────────────────────────── */
const B   = '#0A0A0A';
const W   = '#FFFFFF';
const OW  = '#F7F7F6';
const G50 = '#F2F2F0';
const G200 = '#E2E2E2';
const G500 = '#8A8A8A';
const AC  = '#9D7E3F';
const SF  = "'Cormorant Garamond', Georgia, serif";
const LB  = '#E2E2E2';

const GRID_D: React.CSSProperties = {
  backgroundImage: ['linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', 'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)'].join(','),
  backgroundSize: '80px 80px',
};
const DOT_L: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.05) 1px,transparent 1px)',
  backgroundSize: '28px 28px',
};
const DB = 'rgba(255,255,255,0.06)';

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

/* ── Data ─────────────────────────────────────────────────────────── */
const FILTERS = ['All','Residential','Commercial','Retail','Industrial','Renovation'] as const;
type Filter = typeof FILTERS[number];

type Project = {
  name: string; type: Filter; loc: string; year: string; sqft: string; value: string;
  area: string; detail: string; featured?: boolean;
};

const PROJECTS: Project[] = [
  { name: 'The River Oaks Estate',       type: 'Residential',  loc: 'River Oaks, Houston',        year: '2024', sqft: '14,200', value: '$8.4M',   area: 'Residential', detail: 'A fully custom 6-bedroom estate featuring a 12-car motor court, resort pool complex, home theater, and wine cellar. Delivered 18 months from groundbreaking.', featured: true },
  { name: 'Galleria Commerce Center',    type: 'Commercial',   loc: 'Galleria District, Houston', year: '2023', sqft: '280,000', value: '$124M',  area: 'Class A Office', detail: 'A Class A mixed-use office tower — 24 floors of premium office, ground-floor retail, and 1,400-space structured garage. Delivered on schedule.' },
  { name: 'Energy Corridor Plaza',       type: 'Commercial',   loc: 'Energy Corridor, Houston',   year: '2023', sqft: '340,000', value: '$155M',  area: 'Corporate Campus', detail: 'A three-building LEED Gold corporate campus. Executive amenities, 2,000+ parking spaces, and full campus infrastructure.' },
  { name: 'Memorial Park Residence',     type: 'Residential',  loc: 'Memorial Park, Houston',     year: '2024', sqft: '8,900',  value: '$5.2M',   area: 'Luxury Residential', detail: 'A contemporary estate with indoor-outdoor living areas, climate-controlled wine cellar, and resort-grade pool.' },
  { name: 'Houston Lifestyle Center',    type: 'Retail',       loc: 'Midtown, Houston',           year: '2022', sqft: '185,000', value: '$62M',   area: 'Retail Center', detail: 'An open-air lifestyle center with 65 tenants, curated dining, and 900 structured parking spaces — delivered 3 weeks early.' },
  { name: 'Northwest Industrial Park',   type: 'Industrial',   loc: 'Northwest Houston',          year: '2023', sqft: '520,000', value: '$38M',   area: 'Industrial', detail: 'A Class A distribution campus with 120 dock doors, 36-foot clear heights, and full truck court buildout.' },
  { name: 'The Woodlands Tower',         type: 'Commercial',   loc: 'The Woodlands, TX',         year: '2022', sqft: '210,000', value: '$88M',   area: 'Office Tower', detail: 'A 16-story Class A office tower serving the energy corridor with full LEED Gold certification.' },
  { name: 'Tanglewood Estate',           type: 'Residential',  loc: 'Tanglewood, Houston',        year: '2023', sqft: '11,400', value: '$7.1M',   area: 'Custom Residential', detail: 'A European-inspired limestone estate with formal gardens, 7 bedrooms, and a carriage house guest quarters.' },
  { name: 'Pearland Retail Commons',     type: 'Retail',       loc: 'Pearland, TX',              year: '2022', sqft: '95,000',  value: '$29M',   area: 'Neighborhood Retail', detail: 'An anchor retail center anchored by national grocery and pharmacy tenants — full delivery in 14 months.' },
  { name: 'Uptown Repositioning',        type: 'Renovation',   loc: 'Uptown District, Houston',  year: '2023', sqft: '160,000', value: '$44M',   area: 'Office Renovation', detail: 'A complete repositioning of a 1980s office building into Class A space — occupied throughout with zero tenant disruption.' },
  { name: 'Katy Logistics Hub',          type: 'Industrial',   loc: 'Katy, TX',                  year: '2024', sqft: '780,000', value: '$67M',   area: 'Distribution', detail: 'A two-building logistics campus with 200+ dock doors, ESFR sprinkler systems, and rail spur access.' },
  { name: 'Sugar Land Town Center',      type: 'Retail',       loc: 'Sugar Land, TX',            year: '2024', sqft: '140,000', value: '$52M',   area: 'Mixed-Use Retail', detail: 'A mixed-use town center with 42 retail tenants, restaurant row, and a 4-screen specialty cinema.' },
];

/* ── Grid card with slide-up overlay ─────────────────────────────── */
function ProjectCard({ p, dark = false }: { p: Project; dark?: boolean }) {
  const [hov, setHov] = useState(false);
  const bg  = dark ? '#111111' : OW;
  const pat = dark ? GRID_D    : DOT_L;
  const tc  = dark ? W         : B;
  const sc  = dark ? 'rgba(255,255,255,0.28)' : G500;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden cursor-default"
      style={{ minHeight: 280, backgroundColor: bg, ...pat }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Brackets c={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} sz={14} />

      {/* Default state */}
      <div className="absolute inset-0 p-7 md:p-9 flex flex-col justify-between z-10">
        <div className="flex items-start justify-between">
          <div className="text-[7px] uppercase tracking-[0.28em] font-bold px-2 py-1"
            style={{ backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: sc }}>
            {p.area}
          </div>
          <div className="text-[8px] font-mono" style={{ color: dark ? 'rgba(255,255,255,0.18)' : G200 }}>{p.year}</div>
        </div>
        <div>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.45rem', color: tc, lineHeight: 1.08, marginBottom: '0.25rem' }}>
            {p.name}
          </div>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: sc }}>{p.loc}</div>
        </div>
      </div>

      {/* Slide-up dark overlay */}
      <motion.div
        className="absolute inset-0 z-20 flex flex-col justify-between p-7 md:p-9"
        style={{ backgroundColor: 'rgba(8,8,8,0.97)' }}
        initial={{ y: '100%' }}
        animate={{ y: hov ? '0%' : '100%' }}
        transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
      >
        <Brackets c="rgba(157,126,63,0.28)" sz={14} />
        <div>
          <div className="inline-block text-[7px] uppercase tracking-[0.28em] font-bold px-2.5 py-1 mb-4"
            style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC }}>
            {p.type} · {p.year}
          </div>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: W, lineHeight: 1.1, marginBottom: '0.75rem' }}>
            {p.name}
          </div>
          <p className="text-[10px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.detail}</p>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-3 pt-4 mb-4" style={{ borderTop: 'rgba(255,255,255,0.06) solid 1px' }}>
            {[['Area', p.sqft + ' SF'], ['Value', p.value], ['Location', p.loc.split(',')[0]]].map(([label, val]) => (
              <div key={label}>
                <div className="text-[7px] uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{label}</div>
                <div className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{val}</div>
              </div>
            ))}
          </div>
          <Link to="/contact" className="inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.24em] font-bold group" style={{ color: AC }}>
            Inquire
            <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.5} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Featured card (large) ────────────────────────────────────────── */
function FeaturedCard({ p }: { p: Project }) {
  const [hov, setHov] = useState(false);
  return (
    <TiltCard max={3} className="relative overflow-hidden cursor-default" style={{ minHeight: 540, backgroundColor: B, ...GRID_D }}>
      <Brackets c="rgba(157,126,63,0.22)" sz={22} />
      <div
        className="absolute inset-0 p-10 md:p-14 flex flex-col justify-between z-10"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5" style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: '1px solid rgba(157,126,63,0.2)' }}>
            <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Featured · {p.year}</span>
          </div>
          <div className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{p.sqft} SF</div>
        </div>

        <div>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(42px, 6vw, 80px)', color: W, lineHeight: 0.9, marginBottom: '1rem' }}>
            {p.name}
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.loc}</div>
          <AnimatePresence>
            {hov && (
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3 }}
                className="text-[12px] leading-relaxed font-light mb-6 max-w-lg" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {p.detail}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-3 gap-6 pt-6" style={{ borderTop: DB }}>
            {[['Built Value', p.value], ['Total Area', p.sqft + ' SF'], ['Location', p.loc.split(',')[0]]].map(([label, val]) => (
              <div key={label}>
                <div className="text-[7px] uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{label}</div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.1rem', color: W }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const [filter, setFilter] = useState<Filter>('All');
  const featured = PROJECTS.find(p => p.featured)!;
  const grid = PROJECTS.filter(p => !p.featured && (filter === 'All' || p.type === filter));

  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '82vh', backgroundColor: B, ...GRID_D }}>
        <motion.div className="absolute top-0 inset-x-0 h-px origin-left" style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 15%, rgba(157,126,63,0.08) 0%, transparent 50%)' }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-44 w-full">
          <motion.div className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <motion.div className="h-px" style={{ backgroundColor: AC }}
              initial={{ width: 0 }} animate={{ width: 40 }} transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Our Portfolio</span>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-end">
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 9vw, 128px)', color: W, lineHeight: 0.9 }}>
              Work That<br /><span style={{ color: AC }}>Endures.</span>
            </motion.h1>
            <Reveal direction="right" x={40} className="max-w-md">
              <p className="text-[13px] leading-relaxed font-light mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                A curated selection of HOU INC's most significant residential and commercial projects across the Greater Houston Metropolitan Area.
              </p>
              <div className="grid grid-cols-3 gap-6">
                {[['500+', 'Projects'], ['$2B+', 'Built Value'], ['25 Yrs', 'In Houston']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: W }}>{v}</div>
                    <div className="text-[7px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-0" style={{ backgroundColor: B }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
          <div className="pt-0 pb-8 flex items-center gap-4">
            <div className="h-px w-10" style={{ backgroundColor: AC }} />
            <div className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>Featured Project</div>
          </div>
          <FeaturedCard p={featured} />
        </div>
      </section>

      {/* Filter bar + grid */}
      <section style={{ backgroundColor: OW, borderTop: `1px solid ${LB}` }}>
        {/* Sticky filter */}
        <div className="sticky top-0 z-20 py-0 overflow-x-auto" style={{ backgroundColor: W, borderBottom: `1px solid ${LB}` }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <LayoutGroup id="portfolio-filter">
              <div className="flex items-center gap-0">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="relative px-5 py-3.5 text-[8px] uppercase tracking-[0.3em] font-bold transition-colors whitespace-nowrap"
                    style={{ color: filter === f ? B : G500, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {filter === f && (
                      <motion.span
                        layoutId="portfolio-pill"
                        className="absolute bottom-0 inset-x-0 h-px"
                        style={{ backgroundColor: B }}
                        transition={{ type: 'spring', stiffness: 500, damping: 42 }}
                      />
                    )}
                    {f}
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-0" style={{ border: `1px solid ${LB}` }}>
              {grid.map((p, i) => (
                <div key={p.name} style={{ borderRight: `1px solid ${LB}`, borderBottom: `1px solid ${LB}` }}>
                  <ProjectCard p={p} dark={i % 3 === 1} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
          {grid.length === 0 && (
            <div className="py-24 text-center" style={{ color: G500 }}>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontSize: '2rem', marginBottom: '1rem' }}>No projects in this category yet.</div>
              <Link to="/contact" className="text-[9px] uppercase tracking-[0.3em]" style={{ color: AC }}>Discuss a Project</Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="overflow-hidden" style={{ backgroundColor: B, borderTop: 'rgba(255,255,255,0.06) solid 1px' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderTop: DB, borderLeft: DB }}>
            {[
              { v: 500, s: '+', p: '',  l: 'Total Projects',      d: 'Res · Comm · Industrial' },
              { v: 2,   s: 'B+', p: '$', l: 'Constructed Value',  d: 'Greater Houston Metro' },
              { v: 25,  s: '+', p: '',  l: 'Years Building',       d: 'Since 1998' },
              { v: 98,  s: '%', p: '',  l: 'Schedule Adherence',   d: 'On-time delivery rate' },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 0.09} className="p-10 md:p-14" style={{ borderRight: DB, borderBottom: DB }}>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(38px, 5.5vw, 68px)', color: W, lineHeight: 1, marginBottom: '0.6rem' }}>
                  <AnimatedCounter value={s.v} prefix={s.p} suffix={s.s} />
                </div>
                <div className="text-[11px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.l}</div>
                <div className="text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.18)' }}>{s.d}</div>
              </Reveal>
            ))}
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
              <div className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: AC }}>Your Project</div>
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
            </div>
            <h2 className="mb-8" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(40px, 7vw, 96px)', color: W, lineHeight: 0.96 }}>
              Ready to Create<br /><span style={{ color: AC }}>Your Legacy?</span>
            </h2>
            <p className="text-[13px] leading-relaxed mb-14 max-w-md mx-auto font-light" style={{ color: 'rgba(255,255,255,0.27)' }}>
              Every landmark in our portfolio began with a conversation. Let's talk about yours.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <MagneticButton as="div">
                <Link to="/contact"
                  className="relative overflow-hidden group flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4"
                  style={{ backgroundColor: W, color: B }}>
                  <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                    initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                  <span className="relative z-10 group-hover:text-white transition-colors duration-150">Start Your Project</span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </MagneticButton>
              <Link to="/services"
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.42)'; e.currentTarget.style.color = W; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                View Services
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
