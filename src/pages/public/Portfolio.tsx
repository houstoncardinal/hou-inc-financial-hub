import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import TiltCard from '@/components/motion/TiltCard';
import MagneticButton from '@/components/motion/MagneticButton';

const CREAM  = '#FAF7F2';
const ALT    = '#F3EDE3';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.12) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

const CATEGORIES = ['All', 'Residential', 'Commercial', 'Retail', 'Mixed-Use', 'Industrial'];

const PROJECTS = [
  {
    name: 'The River Oaks Estate',
    category: 'Residential',
    loc: 'River Oaks, Houston',
    year: '2024',
    sqft: '14,200 sq ft',
    value: '$8.4M',
    detail: 'A fully custom 6-bedroom estate featuring a 12-car motor court, resort pool complex, home theater, and wine cellar. Completed 18 months from groundbreaking.',
  },
  {
    name: 'Galleria Commerce Center',
    category: 'Commercial',
    loc: 'Galleria District, Houston',
    year: '2023',
    sqft: '280,000 sq ft',
    value: '$124M',
    detail: 'A Class A mixed-use office tower featuring 24 floors of premium office space, ground-floor retail, and a connected 1,400-space structured garage.',
  },
  {
    name: 'Katy Premium Outlets',
    category: 'Retail',
    loc: 'Katy, TX',
    year: '2022',
    sqft: '420,000 sq ft',
    value: '$186M',
    detail: "Houston's premier open-air luxury outlet center featuring 160 brand stores, three restaurant pavilions, and a state-of-the-art children's play zone.",
  },
  {
    name: 'The Heights Collection',
    category: 'Residential',
    loc: 'The Heights, Houston',
    year: '2024',
    sqft: '96,000 sq ft',
    value: '$52M',
    detail: '48 luxury condominiums in a 12-story mid-rise tower with rooftop terrace, concierge lobby, and panoramic views of the Houston skyline.',
  },
  {
    name: 'Energy Corridor Plaza',
    category: 'Commercial',
    loc: 'Energy Corridor, Houston',
    year: '2023',
    sqft: '340,000 sq ft',
    value: '$155M',
    detail: 'A three-building corporate campus serving the energy sector, featuring LEED Gold certification, 2,000+ parking spaces, and executive amenities.',
  },
  {
    name: 'Midtown Market District',
    category: 'Mixed-Use',
    loc: 'Midtown, Houston',
    year: '2022',
    sqft: '210,000 sq ft',
    value: '$89M',
    detail: 'A vibrant mixed-use development combining 120 luxury apartments, 40,000 sq ft of ground-floor retail, and a covered public market plaza.',
  },
  {
    name: 'Bayport Logistics Hub',
    category: 'Industrial',
    loc: 'Bayport, Houston',
    year: '2021',
    sqft: '880,000 sq ft',
    value: '$78M',
    detail: 'A class-A logistics campus comprising three tilt-wall warehouses with 36-ft clear heights, 200 dock doors, and direct port connectivity.',
  },
  {
    name: 'Tanglewood Custom Estate',
    category: 'Residential',
    loc: 'Tanglewood, Houston',
    year: '2024',
    sqft: '9,800 sq ft',
    value: '$6.1M',
    detail: "A contemporary-transitional custom home featuring a double-height entry foyer, chef's kitchen, home spa, and seamless indoor-outdoor living spaces.",
  },
  {
    name: 'Memorial Park Village',
    category: 'Mixed-Use',
    loc: 'Memorial, Houston',
    year: '2023',
    sqft: '185,000 sq ft',
    value: '$74M',
    detail: 'Boutique mixed-use development adjacent to Memorial Park, featuring 80 luxury townhomes, curated retail, and a wellness-focused amenity program.',
  },
];

export default function Portfolio() {
  const [active,  setActive]  = useState('All');
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = active === 'All' ? PROJECTS : PROJECTS.filter(p => p.category === active);

  return (
    <PublicLayout>

      {/* Hero */}
      <section className="pt-40 pb-20" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal direction="left" x={30} className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Signature Work</div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <Reveal>
              <motion.h1
                style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 8vw, 110px)', color: DARK, lineHeight: 0.92, letterSpacing: '-0.01em' }}
                initial={{ letterSpacing: '0.04em', opacity: 0 }}
                animate={{ letterSpacing: '-0.01em', opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                Portfolio
              </motion.h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
                Over <AnimatedCounter value={500} suffix="+" className="font-semibold" style={{ color: GOLD }} /> completed projects across Houston and the greater Texas market. Residential estates, commercial towers, retail destinations, and industrial campuses — each built to the same uncompromising standard.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div
        className="sticky top-[72px] z-30"
        style={{ backgroundColor: 'rgba(250,247,242,0.97)', borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(14px)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <LayoutGroup>
            <div className="flex items-center gap-0 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className="relative px-5 py-4 text-[9px] uppercase tracking-[0.24em] font-bold whitespace-nowrap transition-colors shrink-0"
                  style={{ color: active === cat ? GOLD : 'rgba(28,24,20,0.35)' }}
                >
                  {cat}
                  {active === cat && (
                    <motion.div
                      layoutId="portfolio-pill"
                      className="absolute left-0 right-0 bottom-0 h-[2px]"
                      style={{ backgroundColor: GOLD }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    />
                  )}
                </button>
              ))}
              <div className="ml-auto shrink-0 px-5 py-4">
                <motion.div
                  key={filtered.length}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[9px] uppercase tracking-[0.22em]"
                  style={{ color: 'rgba(28,24,20,0.25)' }}
                >
                  {filtered.length} Projects
                </motion.div>
              </div>
            </div>
          </LayoutGroup>
        </div>
      </div>

      {/* Grid */}
      <section className="py-2" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div layout className="grid md:grid-cols-3 gap-0 mt-6" style={{ border: `1px solid ${BORDER}` }}>
            <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.div
                key={p.name}
                layout
                initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                transition={{ duration: 0.55, delay: (i % 9) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden group cursor-default transition-shadow duration-300"
                style={{
                  minHeight: '300px',
                  backgroundColor: i % 2 === 0 ? CREAM : '#FFFFFF',
                  borderRight: (i + 1) % 3 !== 0 ? `1px solid ${BORDER}` : 'none',
                  borderBottom: `1px solid ${BORDER}`,
                  ...DOT,
                }}
                onMouseEnter={() => setHovered(p.name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at 50% 50%, rgba(157,126,63,0.07) 0%, transparent 70%)`,
                    opacity: hovered === p.name ? 1 : 0,
                  }}
                />

                <div className="relative z-10 p-7 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="text-[8px] uppercase tracking-[0.3em] font-bold px-2 py-1"
                        style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}
                      >
                        {p.category}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: 'rgba(28,24,20,0.25)' }}>{p.year}</div>
                    </div>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.2rem', color: DARK, marginBottom: '0.2rem' }}>{p.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] mb-4" style={{ color: 'rgba(28,24,20,0.38)' }}>{p.loc}</div>
                    <p
                      className="text-[10px] leading-relaxed transition-all duration-300 font-light"
                      style={{
                        color: MUTED,
                        maxHeight: hovered === p.name ? '100px' : '0',
                        overflow: 'hidden',
                        opacity: hovered === p.name ? 1 : 0,
                      }}
                    >
                      {p.detail}
                    </p>
                  </div>

                  <div className="flex items-end justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div className="flex items-center gap-5">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(157,126,63,0.5)' }}>Area</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(28,24,20,0.45)' }}>{p.sqft}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(157,126,63,0.5)' }}>Value</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(28,24,20,0.45)' }}>{p.value}</div>
                      </div>
                    </div>
                    <div
                      className="transition-all duration-300"
                      style={{ opacity: hovered === p.name ? 1 : 0, transform: hovered === p.name ? 'translate(0,0)' : 'translate(4px,4px)' }}
                    >
                      <ArrowUpRight className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32" style={{ backgroundColor: DARK }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 54px)', color: CREAM, lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Your Project Could Be <span style={{ color: GOLD }}>Next</span>
          </h2>
          <p className="text-sm mb-8 font-light" style={{ color: 'rgba(250,247,242,0.38)' }}>
            Let's discuss your vision. We respond within one business day.
          </p>
          <Reveal delay={0.2}>
            <MagneticButton as="a" href="/contact">
              <a
                href="/contact"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90 group"
                style={{ backgroundColor: GOLD, color: DARK }}
              >
                Start a Conversation
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              </a>
            </MagneticButton>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
