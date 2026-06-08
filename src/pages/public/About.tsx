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
  { n: '01', title: 'Uncompromising Quality',   body: 'We hold every trade, material, and decision to an impossibly high standard. Not because we have to — because anything less would be an insult to our clients and our craft.' },
  { n: '02', title: 'Absolute Transparency',    body: 'Every budget, every schedule, every challenge is communicated clearly and promptly. Our clients are never surprised by a HOU INC project.' },
  { n: '03', title: 'Long-Term Relationships',  body: "The best measure of our work isn't the ribbon cutting — it's the call we get when that client is ready to build again. Over 70% of our revenue comes from repeat clients." },
  { n: '04', title: 'Houston First',            body: "We are Houston. We hire Houston subcontractors, buy from Houston suppliers, and reinvest in the city we're proud to build. This isn't a marketing line — it's how we operate." },
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
                Founded in Houston in 1998, HOU INC has spent <AnimatedCounter value={25} className="font-semibold" style={{ color: GOLD }} /> years building some of the most recognized residential and commercial properties in Texas.
              </p>
              <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
                We are builders, first and foremost. We are also a company that believes the built environment shapes lives, communities, and economies — and that a construction firm has an obligation to its city.
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
              "To build structures that outlast us — and relationships that do the same. We measure our success not in square footage but in trust earned, one project at a time."
            </blockquote>
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: GOLD }}>— William Hou, Founder</div>
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
              <div key={v.n} className="p-8 bg-white" style={{ borderRight: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
                <div
                  className="leading-none mb-5"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.8rem', color: 'rgba(157,126,63,0.22)' }}
                >
                  {v.n}
                </div>
                <div className="w-6 h-px mb-5" style={{ backgroundColor: GOLD }} />
                <div className="text-base font-bold tracking-tight mb-3" style={{ color: DARK }}>{v.title}</div>
                <p className="text-[11px] leading-relaxed font-light" style={{ color: MUTED }}>{v.body}</p>
              </div>
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
          <div className="max-w-2xl space-y-0" style={{ borderLeft: `1px solid ${GOLD}` }}>
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="flex items-start gap-8 pl-8 pb-8 relative">
                <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24" style={{ backgroundColor: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Leadership</div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map(t => (
              <div
                key={t.name}
                className="overflow-hidden transition-shadow duration-300"
                style={{
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                  backgroundColor: '#FFFFFF',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(28,24,20,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 18px rgba(28,24,20,0.04)'; }}
              >
                {/* Avatar area */}
                <div className="relative h-40 flex items-end p-6" style={{ backgroundColor: CREAM, ...DOT }}>
                  <div
                    className="absolute top-4 right-4 text-[8px] uppercase tracking-[0.22em] font-bold px-2 py-1"
                    style={{ color: GOLD, backgroundColor: 'rgba(157,126,63,0.1)', border: `1px solid rgba(157,126,63,0.2)` }}
                  >
                    {t.yrs}
                  </div>
                  <div
                    className="w-12 h-12 flex items-center justify-center text-base font-black"
                    style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD, border: `1px solid rgba(157,126,63,0.25)`, fontFamily: SERIF }}
                  >
                    {t.initials}
                  </div>
                </div>
                <div className="p-6" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: '1.05rem', color: DARK, marginBottom: '0.2rem' }}>{t.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: GOLD }}>{t.title}</div>
                </div>
              </div>
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
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              Get In Touch <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-all hover:bg-white/5"
              style={{ border: `1px solid rgba(157,126,63,0.38)`, color: GOLD }}
            >
              View Our Work
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
