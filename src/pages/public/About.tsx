import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
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

const VALUES = [
  { n: '01', title: 'Excellence',        body: 'We bring an uncompromising standard to every detail of every project. From foundation to finish, our commitment to excellence defines the HOU INC difference.' },
  { n: '02', title: 'Integrity',         body: 'We operate with complete honesty and transparency. Every commitment we make is one we keep — building trust with clients, partners, and our community one project at a time.' },
  { n: '03', title: 'Innovation',        body: 'We continuously seek better methods, materials, and solutions. Embracing innovation allows us to deliver superior results and remain at the forefront of Houston construction.' },
  { n: '04', title: 'Customer Service',  body: 'Our clients are our highest priority. We provide personalized attention and tailored solutions at every stage — from initial consultation through project delivery and beyond.' },
];

const TEAM = [
  { name: 'William Hou',    title: 'Founder & Chief Executive',     initials: 'WH', yrs: '25 yrs' },
  { name: 'Marcus Chen',   title: 'President, Commercial Division', initials: 'MC', yrs: '18 yrs' },
  { name: 'Diana Reyes',   title: 'VP, Luxury Residential',         initials: 'DR', yrs: '14 yrs' },
  { name: 'James Tran',    title: 'Chief Financial Officer',        initials: 'JT', yrs: '12 yrs' },
  { name: 'Serena Park',   title: 'Director of Design Services',    initials: 'SP', yrs: '10 yrs' },
  { name: 'Robert Okafor', title: 'VP, Construction Operations',    initials: 'RO', yrs: '16 yrs' },
];

const MILESTONES = [
  { year: '1998', event: 'HOU INC founded by William Hou in Houston, TX' },
  { year: '2003', event: 'First major commercial project — a 60,000 sq ft office campus in the Energy Corridor' },
  { year: '2008', event: 'Expanded to retail development with the Cypress Station Shopping Center' },
  { year: '2012', event: 'Opened dedicated luxury residential division to serve River Oaks and Memorial clientele' },
  { year: '2016', event: 'Surpassed $500M in total constructed value' },
  { year: '2019', event: 'Completed first high-rise residential tower — The Post Midtown, 22 floors' },
  { year: '2022', event: 'Named Houston Business Journal #1 Luxury Contractor for 3rd consecutive year' },
  { year: '2024', event: 'Active pipeline exceeds $800M across residential, commercial, and mixed-use sectors' },
];

export default function About() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="pt-40 pb-24" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal direction="left" x={30} className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Our Story</div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-16 items-end">
            <Reveal>
              <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 8vw, 110px)', color: DARK, lineHeight: 0.92, letterSpacing: '-0.01em' }}>
                About<br />HOU INC
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-sm leading-relaxed font-light mb-4" style={{ color: MUTED }}>
                HOU INC is a leading name in the Houston construction industry, built on a foundation of excellence, integrity, and innovation. We serve residential and commercial clients who expect nothing short of exceptional.
              </p>
              <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
                Our meticulous attention to detail and commitment to quality craftsmanship have made us one of Houston's most trusted construction firms — delivering tailored solutions that exceed expectations on every project.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
              <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Our Mission</div>
            </div>
            <div className="w-12 h-px mb-8" style={{ backgroundColor: BORDER }} />
            <blockquote
              style={{
                fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(22px, 3vw, 36px)', color: DARK, lineHeight: 1.35,
                marginBottom: '1.5rem',
              }}
            >
              "To deliver exceptional construction solutions through meticulous attention to detail, quality craftsmanship, and an unwavering commitment to our clients — turning every dream into a lasting reality."
            </blockquote>
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: GOLD }}>— HOU INC Mission Statement</div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24" style={{ backgroundColor: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>What We Stand For</div>
          </div>
          <div className="grid md:grid-cols-4 gap-0" style={{ border: `1px solid ${BORDER}` }}>
            {VALUES.map((v, i) => (
              <Reveal key={v.n} delay={i * 0.1}>
                <TiltCard
                  max={4}
                  className="p-8 bg-white h-full"
                  style={{ borderRight: i < 3 ? `1px solid ${BORDER}` : 'none' }}
                >
                  <div
                    className="leading-none mb-5"
                    style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.8rem', color: 'rgba(157,126,63,0.22)' }}
                  >
                    {v.n}
                  </div>
                  <div className="w-6 h-px mb-5" style={{ backgroundColor: GOLD }} />
                  <div className="text-base font-bold tracking-tight mb-3" style={{ color: DARK }}>{v.title}</div>
                  <p className="text-[11px] leading-relaxed font-light" style={{ color: MUTED }}>{v.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>25 Years of Progress</div>
          </div>
          <div className="max-w-2xl space-y-0 relative">
            {/* Animated draw line */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-px origin-top"
              style={{ backgroundColor: GOLD }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            />
            {MILESTONES.map((m, i) => (
              <Reveal key={m.year} delay={i * 0.08} y={20} direction="left" x={20}
                className="flex items-start gap-8 pl-8 pb-8 relative"
              >
                <motion.div
                  className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 380, damping: 16 }}
                />
                <div
                  className="shrink-0 w-12"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem', color: GOLD }}
                >
                  {m.year}
                </div>
                <div
                  className="text-[12px] leading-relaxed"
                  style={{ color: i === MILESTONES.length - 1 ? DARK : MUTED }}
                >
                  {m.event}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24" style={{ backgroundColor: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Leadership</div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08} y={40}>
                <TiltCard
                  max={6}
                  className="overflow-hidden h-full"
                  style={{
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="relative h-40 flex items-end p-6" style={{ backgroundColor: CREAM, ...DOT }}>
                    <div
                      className="absolute top-4 right-4 text-[8px] uppercase tracking-[0.22em] font-bold px-2 py-1"
                      style={{ color: GOLD, backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid rgba(157,126,63,0.2)` }}
                    >
                      {t.yrs}
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: -3 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 14 }}
                      className="w-12 h-12 flex items-center justify-center text-base font-black"
                      style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD, border: `1px solid rgba(157,126,63,0.25)`, fontFamily: SERIF }}
                    >
                      {t.initials}
                    </motion.div>
                  </div>
                  <div className="p-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: '1.05rem', color: DARK, marginBottom: '0.2rem' }}>{t.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: GOLD }}>{t.title}</div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32" style={{ backgroundColor: DARK }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 54px)', color: CREAM, lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Build With <span style={{ color: GOLD }}>Houston's Best</span>
          </h2>
          <p className="text-sm mb-8 font-light" style={{ color: 'rgba(250,247,242,0.38)' }}>
            Our team is ready to hear about your project.
          </p>
          <Reveal delay={0.2} className="flex flex-wrap gap-4 justify-center">
            <MagneticButton as="a" href="/contact">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90 group"
                style={{ backgroundColor: GOLD, color: DARK }}
              >
                Get In Touch
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton as="a" href="/portfolio" strength={0.3}>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-all hover:bg-white/5"
                style={{ border: `1px solid rgba(157,126,63,0.38)`, color: GOLD }}
              >
                View Our Work
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
