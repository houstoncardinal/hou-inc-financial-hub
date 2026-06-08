import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import Marquee from '@/components/motion/Marquee';
import MagneticButton from '@/components/motion/MagneticButton';
import TiltCard from '@/components/motion/TiltCard';

const CREAM  = '#FAF7F2';
const ALT    = '#F3EDE3';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.13) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

const TICKER = [
  'Luxury Custom Homes', 'Shopping Centers', 'Mixed-Use Developments',
  'Commercial Campuses', 'River Oaks Estates', 'High-Rise Residential',
  'Industrial Parks', 'Retail Centers', 'Luxury Condominiums',
];

const SERVICES = [
  {
    n: '01',
    title: 'Luxury Residences',
    sub: 'Custom Estates & High-End Homes',
    body: "We design and build singular private homes for Houston's most discerning families. Every detail — from foundation to finish — is executed to an uncompromising standard.",
    specs: ['Custom Floor Plans', 'Smart Home Integration', 'Concierge Project Management', 'Premium Material Sourcing'],
  },
  {
    n: '02',
    title: 'Commercial Developments',
    sub: 'Office Campuses & Corporate Facilities',
    body: 'Landmark commercial spaces that project prestige, drive productivity, and hold their value for decades. We build for the Fortune 500 and the bold independent alike.',
    specs: ['Class A Office Towers', 'Corporate Campus Design', 'Sustainable LEED Builds', 'Tenant Improvement'],
  },
  {
    n: '03',
    title: 'Retail & Mixed-Use',
    sub: 'Shopping Centers & Live-Work Communities',
    body: 'End-to-end development of high-traffic retail environments and integrated communities where commerce, culture, and residential life converge seamlessly.',
    specs: ['Anchor Retail Centers', 'Lifestyle Developments', 'Mixed-Use Towers', 'Ground-Up Development'],
  },
];

const PROJECTS = [
  { name: 'The River Oaks Estate',    type: 'Luxury Residential',  loc: 'River Oaks, Houston',       year: '2024', sqft: '14,200 sq ft' },
  { name: 'Galleria Commerce Center', type: 'Class A Commercial',   loc: 'Galleria District, Houston', year: '2023', sqft: '280,000 sq ft' },
  { name: 'The Heights Collection',   type: 'Luxury Condominiums',  loc: 'The Heights, Houston',       year: '2024', sqft: '96,000 sq ft' },
  { name: 'Katy Premium Outlets',     type: 'Retail Development',   loc: 'Katy, TX',                   year: '2022', sqft: '420,000 sq ft' },
];

const STEPS = [
  { n: '01', title: 'Discovery & Vision',   body: 'We begin with an in-depth consultation to understand your goals, timeline, and standard of quality before a single line is drawn.' },
  { n: '02', title: 'Design & Engineering', body: 'Our in-house design team works with the top architectural firms in Houston to produce precise, buildable plans that translate vision into structure.' },
  { n: '03', title: 'Procurement & Build',  body: 'We leverage decades of supplier relationships to source premium materials at scale, then execute construction with relentless quality control.' },
  { n: '04', title: 'Delivery & Beyond',    body: 'On-time, on-spec delivery is our baseline. Post-completion, our team remains available for warranty, maintenance, and future builds.' },
];

const STAT_NUMBERS: Array<{ value: number; prefix?: string; suffix?: string; label: string }> = [
  { value: 25,  suffix: '+',  label: 'Years in Houston' },
  { value: 500, suffix: '+',  label: 'Projects Delivered' },
  { value: 2,   prefix: '$',  suffix: 'B+', label: 'Total Constructed' },
  { value: 12,  suffix: '',   label: 'Property Types' },
];

/* ── Animated headline word ── */
function HeadlineWord({ children, delay = 0, color }: { children: React.ReactNode; delay?: number; color?: string }) {
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}>
      <motion.span
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 1.05, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-block', color }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY     = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '24%']);
  const heroFade  = useTransform(scrollYProgress, [0, 1], [1, 0.35]);
  const bigNumY   = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);

  return (
    <PublicLayout>

      {/* ══ HERO ══ */}
      <section
        ref={heroRef}
        className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '100vh', backgroundColor: CREAM, ...DOT }}
      >
        {/* Gold hairline top */}
        <motion.div
          className="absolute top-0 inset-x-0 h-px origin-left"
          style={{ backgroundColor: GOLD, opacity: 0.45 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Warm glow w/ slow drift */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 80% 15%, rgba(157,126,63,0.09) 0%, transparent 52%)` }}
          animate={reduced ? {} : { backgroundPosition: ['80% 15%', '70% 25%', '80% 15%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle floating blueprint lines */}
        {!reduced && (
          <>
            <motion.div
              className="absolute h-px"
              style={{ left: 0, right: 0, top: '34%', backgroundColor: GOLD, opacity: 0.08 }}
              animate={{ x: ['-12%', '12%', '-12%'] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-px"
              style={{ top: 0, bottom: 0, left: '68%', backgroundColor: GOLD, opacity: 0.06 }}
              animate={{ y: ['-6%', '6%', '-6%'] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-36 w-full"
        >
          {/* Eyebrow */}
          <motion.div
            className="flex items-center gap-3 mb-10"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            <motion.div
              className="h-px"
              style={{ backgroundColor: GOLD }}
              initial={{ width: 0 }}
              animate={{ width: 40 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="text-[9px] uppercase tracking-[0.42em] font-semibold" style={{ color: GOLD }}>
              Houston · Texas · Est. 1998
            </div>
          </motion.div>

          {/* Headline */}
          <h1
            className="leading-[0.88] tracking-tight mb-10"
            style={{
              fontSize: 'clamp(58px, 10.5vw, 144px)',
              fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, color: DARK,
            }}
          >
            <HeadlineWord delay={0.2}>Building</HeadlineWord><br />
            <HeadlineWord delay={0.45} color={GOLD}>Houston's</HeadlineWord><br />
            <HeadlineWord delay={0.7}>Legacy.</HeadlineWord>
          </h1>

          {/* Hairline */}
          <motion.div
            className="w-full h-px mb-10 origin-left"
            style={{ backgroundColor: BORDER }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Sub + CTAs */}
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <Reveal delay={1}>
              <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
                Luxury residential and commercial construction for those who refuse to compromise. From custom estates in River Oaks to landmark commercial developments across the greater Houston area.
              </p>
            </Reveal>
            <Reveal delay={1.05} className="flex flex-wrap gap-4 md:justify-end">
              <MagneticButton as="a" href="/portfolio">
                <Link
                  to="/portfolio"
                  className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-4 transition-opacity hover:opacity-90 group"
                  style={{ backgroundColor: DARK, color: CREAM }}
                >
                  View Our Work
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </Link>
              </MagneticButton>
              <MagneticButton as="a" href="/contact" strength={0.3}>
                <Link
                  to="/contact"
                  className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-4 transition-all hover:bg-[rgba(157,126,63,0.08)]"
                  style={{ border: `1px solid rgba(157,126,63,0.5)`, color: GOLD }}
                >
                  Start a Project
                </Link>
              </MagneticButton>
            </Reveal>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-16"
            style={{ borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}
          >
            {STAT_NUMBERS.map((s, i) => (
              <Reveal
                key={s.label}
                delay={1.2 + i * 0.08}
                className="px-6 py-5"
                style={{ borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
              >
                <div
                  className="leading-none mb-1"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.9rem', color: GOLD }}
                >
                  <AnimatedCounter
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                  />
                </div>
                <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(28,24,20,0.38)' }}>{s.label}</div>
              </Reveal>
            ))}
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          <div className="text-[8px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>Scroll</div>
          <motion.div
            animate={reduced ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="w-3 h-3" style={{ color: GOLD }} strokeWidth={2} />
          </motion.div>
        </motion.div>
      </section>

      {/* ══ TICKER ══ */}
      <div className="py-4 overflow-hidden" style={{ backgroundColor: GOLD }}>
        <Marquee speed={42}>
          {TICKER.map((item, i) => (
            <span
              key={i}
              className="text-[9px] uppercase tracking-[0.28em] font-black whitespace-nowrap flex items-center gap-8 pr-8"
              style={{ color: '#fff' }}
            >
              {item}
              <span className="opacity-50">◆</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* ══ ABOUT INTRO ══ */}
      <section className="py-28 md:py-40 overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 md:gap-28 items-center">

            <Reveal direction="left" x={50}>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Our Story</div>
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08, marginBottom: '1.25rem' }}>
                A Quarter Century of<br />Building Excellence
              </h2>
              <div className="w-10 h-px mb-7" style={{ backgroundColor: BORDER }} />
              <p className="text-sm leading-relaxed font-light mb-5" style={{ color: MUTED }}>
                HOU INC was founded in Houston in 1998 with a singular conviction: that the built environment shapes the quality of life for everyone who inhabits it. Over 25 years, we have grown from a boutique residential builder into one of Houston's most trusted luxury construction firms.
              </p>
              <p className="text-sm leading-relaxed font-light mb-10" style={{ color: MUTED }}>
                Today we serve private clients, institutional developers, and commercial enterprises across the greater Houston metro — delivering properties that set the standard for craftsmanship, design, and performance.
              </p>
              <MagneticButton as="a" href="/about" strength={0.25}>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 transition-opacity hover:opacity-70 group"
                  style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
                >
                  Our Full Story
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                  </span>
                </Link>
              </MagneticButton>
            </Reveal>

            {/* Decorative number with parallax */}
            <Reveal direction="right" x={60} className="relative flex items-center justify-center md:justify-end">
              <div className="absolute inset-0" style={{ ...DOT, opacity: 0.5 }} />
              <motion.div className="relative text-right pr-4" style={{ y: bigNumY }}>
                <AnimatedCounter
                  value={25}
                  duration={2200}
                  style={{
                    fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                    fontSize: 'clamp(100px, 18vw, 210px)',
                    color: 'rgba(157,126,63,0.1)', lineHeight: 1, userSelect: 'none',
                    display: 'block',
                  }}
                />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold -mt-4 md:-mt-8" style={{ color: GOLD, opacity: 0.45 }}>
                  Years · Houston · Texas
                </div>
              </motion.div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: ALT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <Reveal>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>What We Build</div>
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
                Our Services
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 self-start md:self-end transition-opacity hover:opacity-70 group"
                style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
              >
                All Services
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </span>
              </Link>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12} y={48}>
                <TiltCard
                  max={6}
                  className="h-full"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                  }}
                >
                  <div className="p-8 md:p-10">
                    <div
                      className="leading-none mb-6"
                      style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: 'rgba(157,126,63,0.3)' }}
                    >
                      {s.n}
                    </div>
                    <div className="w-8 h-px mb-5" style={{ backgroundColor: GOLD }} />
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.3rem', color: DARK, marginBottom: '0.3rem' }}>{s.title}</div>
                    <div className="text-[9px] uppercase tracking-[0.22em] mb-5 font-semibold" style={{ color: GOLD }}>{s.sub}</div>
                    <p className="text-[11px] leading-relaxed mb-7 font-light" style={{ color: MUTED }}>{s.body}</p>
                    <div className="space-y-2">
                      {s.specs.map(spec => (
                        <div key={spec} className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'rgba(28,24,20,0.38)' }}>
                          <div className="w-3 h-px shrink-0" style={{ backgroundColor: GOLD, opacity: 0.6 }} />
                          {spec}
                        </div>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURED PROJECTS ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <Reveal>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Signature Work</div>
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
                Selected Projects
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 self-start md:self-end transition-opacity hover:opacity-70 group"
                style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
              >
                Full Portfolio
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </span>
              </Link>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {PROJECTS.map((p, i) => (
              <Reveal key={p.name} delay={(i % 2) * 0.1} y={40}>
                <TiltCard
                  max={5}
                  className="group cursor-default"
                  style={{
                    backgroundColor: CREAM,
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                    minHeight: '260px',
                    ...DOT,
                  }}
                >
                  <div className="p-8 h-full flex flex-col justify-between">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: GOLD }}>{p.type}</div>
                      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.5rem', color: DARK, marginBottom: '0.35rem' }}>{p.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(28,24,20,0.38)' }}>{p.loc}</div>
                    </div>
                    <div className="flex items-center justify-between mt-8 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-6">
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(157,126,63,0.55)' }}>Area</div>
                          <div className="text-[11px] font-semibold" style={{ color: 'rgba(28,24,20,0.45)' }}>{p.sqft}</div>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.2em] mb-0.5" style={{ color: 'rgba(157,126,63,0.55)' }}>Year</div>
                          <div className="text-[11px] font-semibold" style={{ color: 'rgba(28,24,20,0.45)' }}>{p.year}</div>
                        </div>
                      </div>
                      <motion.div
                        className="opacity-0 group-hover:opacity-100"
                        initial={false}
                        whileHover={{ rotate: 45 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                      >
                        <ArrowUpRight className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
                      </motion.div>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS — dark anchor ══ */}
      <section className="py-24 md:py-32 overflow-hidden" style={{ backgroundColor: DARK }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-0"
            style={{ borderTop: '1px solid rgba(250,247,242,0.07)', borderLeft: '1px solid rgba(250,247,242,0.07)' }}
          >
            {[
              { value: 25,  suffix: '+',  label: 'Years in Business',       detail: 'Founded 1998 · Houston, TX' },
              { value: 500, suffix: '+',  label: 'Projects Completed',      detail: 'Residential · Commercial · Mixed-Use' },
              { value: 2,   prefix: '$',  suffix: 'B+', label: 'Total Constructed Value', detail: 'Across Greater Houston Metro' },
              { value: 12,                label: 'Property Types',          detail: 'From Estates to Industrial Parks' },
            ].map((s, i) => (
              <Reveal
                key={s.label}
                delay={i * 0.1}
                className="p-8 md:p-10"
                style={{ borderRight: '1px solid rgba(250,247,242,0.07)', borderBottom: '1px solid rgba(250,247,242,0.07)' }}
              >
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(38px, 5vw, 62px)', color: GOLD, lineHeight: 1, marginBottom: '0.5rem' }}>
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
                <div className="text-[11px] font-bold mb-1" style={{ color: CREAM }}>{s.label}</div>
                <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'rgba(250,247,242,0.2)' }}>{s.detail}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROCESS ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
              <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>How We Work</div>
            </div>
            <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
              Our Process
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-0 relative" style={{ borderLeft: `1px solid ${BORDER}` }}>
            {/* Progress line that draws on scroll */}
            <motion.div
              className="absolute left-0 top-0 h-1 origin-left"
              style={{ backgroundColor: GOLD, width: '100%' }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
            {STEPS.map((s, i) => (
              <Reveal
                key={s.n}
                delay={i * 0.12}
                className="px-8 py-8"
                style={{ borderRight: i === 3 ? 'none' : `1px solid ${BORDER}` }}
              >
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.5rem', color: 'rgba(157,126,63,0.22)', lineHeight: 1, marginBottom: '1.25rem' }}>{s.n}</div>
                <div className="w-8 h-px mb-5" style={{ backgroundColor: GOLD }} />
                <div className="text-base font-bold mb-3" style={{ color: DARK }}>{s.title}</div>
                <p className="text-[11px] leading-relaxed font-light" style={{ color: MUTED }}>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CLIENT PORTAL BAND ══ */}
      <section style={{ backgroundColor: GOLD, overflow: 'hidden' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Reveal direction="left" x={30}>
              <div className="text-[9px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: 'rgba(28,24,20,0.5)' }}>New</div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.45rem', color: DARK, lineHeight: 1.1 }}>
                Client Portal — connect directly with your builder.
              </div>
            </Reveal>
            <Reveal direction="right" x={30}>
              <MagneticButton as="a" href="/portal">
                <Link
                  to="/portal"
                  className="shrink-0 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-3.5 transition-opacity hover:opacity-90 group"
                  style={{ backgroundColor: DARK, color: CREAM }}
                >
                  Enter Portal
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </Link>
              </MagneticButton>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-28 md:py-40 relative overflow-hidden" style={{ backgroundColor: DARK }}>
        {/* Drifting glow */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, rgba(157,126,63,0.18), transparent 55%)` }}
          animate={reduced ? {} : { scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px w-10" style={{ backgroundColor: GOLD, opacity: 0.45 }} />
              <div className="text-[9px] uppercase tracking-[0.42em] font-semibold" style={{ color: GOLD }}>Let's Build Together</div>
              <div className="h-px w-10" style={{ backgroundColor: GOLD, opacity: 0.45 }} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2
              className="mb-8"
              style={{
                fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(34px, 5.5vw, 78px)', color: CREAM, lineHeight: 1.05,
              }}
            >
              Ready to Build<br />
              <span style={{ color: GOLD }}>Something Extraordinary?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-sm leading-relaxed mb-12 max-w-xl mx-auto font-light" style={{ color: 'rgba(250,247,242,0.4)' }}>
              Every landmark starts with a conversation. Tell us about your project and let Houston's premier construction team bring your vision to life.
            </p>
          </Reveal>
          <Reveal delay={0.3} className="flex flex-wrap gap-4 justify-center">
            <MagneticButton as="a" href="/contact">
              <Link
                to="/contact"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90 group"
                style={{ backgroundColor: GOLD, color: DARK }}
              >
                Start Your Project
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton as="a" href="/portfolio" strength={0.3}>
              <Link
                to="/portfolio"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-all hover:bg-white/5"
                style={{ border: `1px solid rgba(157,126,63,0.38)`, color: GOLD }}
              >
                View Portfolio
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
