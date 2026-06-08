import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

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

export default function Home() {
  return (
    <PublicLayout>

      {/* ══ HERO ══ */}
      <section
        className="relative flex flex-col justify-end"
        style={{ minHeight: '100vh', backgroundColor: CREAM, ...DOT }}
      >
        {/* Gold hairline top */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.45 }} />

        {/* Warm glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 80% 15%, rgba(157,126,63,0.07) 0%, transparent 52%)` }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-36">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px w-10" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.42em] font-semibold" style={{ color: GOLD }}>
              Houston · Texas · Est. 1998
            </div>
          </div>

          {/* Headline */}
          <h1
            className="leading-[0.88] tracking-tight mb-10"
            style={{
              fontSize: 'clamp(58px, 10.5vw, 144px)',
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontWeight: 300,
              color: DARK,
            }}
          >
            Building<br />
            <span style={{ color: GOLD }}>Houston's</span><br />
            Legacy.
          </h1>

          {/* Hairline */}
          <div className="w-full h-px mb-10" style={{ backgroundColor: BORDER }} />

          {/* Sub + CTAs */}
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
              Luxury residential and commercial construction for those who refuse to compromise. From custom estates in River Oaks to landmark commercial developments across the greater Houston area.
            </p>
            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link
                to="/portfolio"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-4 transition-opacity hover:opacity-80"
                style={{ backgroundColor: DARK, color: CREAM }}
              >
                View Our Work <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-4 transition-opacity hover:opacity-70"
                style={{ border: `1px solid rgba(157,126,63,0.5)`, color: GOLD }}
              >
                Start a Project
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-16"
            style={{ borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}
          >
            {[
              { n: '25+', label: 'Years in Houston' },
              { n: '500+', label: 'Projects Delivered' },
              { n: '$2B+', label: 'Total Constructed' },
              { n: '12',   label: 'Property Types' },
            ].map(s => (
              <div key={s.n} className="px-6 py-5" style={{ borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <div
                  className="leading-none mb-1"
                  style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.9rem', color: GOLD }}
                >
                  {s.n}
                </div>
                <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(28,24,20,0.38)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: 0.28 }}>
          <div className="text-[8px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>Scroll</div>
          <ArrowDown className="w-3 h-3" style={{ color: GOLD }} strokeWidth={2} />
        </div>
      </section>

      {/* ══ TICKER ══ */}
      <div className="py-4 overflow-hidden" style={{ backgroundColor: GOLD }}>
        <div className="flex items-center gap-8 px-8 flex-wrap justify-center md:justify-start">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="text-[9px] uppercase tracking-[0.28em] font-black whitespace-nowrap flex items-center gap-8"
              style={{ color: '#fff' }}
            >
              {item}
              {i < TICKER.length * 2 - 1 && <span className="opacity-40">◆</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ══ ABOUT INTRO ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 md:gap-28 items-center">

            <div>
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
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 transition-opacity hover:opacity-70"
                style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
              >
                Our Full Story <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Decorative number */}
            <div className="relative flex items-center justify-center md:justify-end">
              <div className="absolute inset-0" style={{ ...DOT, opacity: 0.5 }} />
              <div className="relative text-right pr-4">
                <div
                  style={{
                    fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                    fontSize: 'clamp(100px, 18vw, 210px)',
                    color: 'rgba(157,126,63,0.07)', lineHeight: 1, userSelect: 'none',
                  }}
                >
                  25
                </div>
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold -mt-4 md:-mt-8" style={{ color: GOLD, opacity: 0.45 }}>
                  Years · Houston · Texas
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: ALT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>What We Build</div>
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
                Our Services
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 self-start md:self-end transition-opacity hover:opacity-70"
              style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
            >
              All Services <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map(s => (
              <div
                key={s.n}
                className="p-8 md:p-10 cursor-default transition-shadow duration-300"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 44px rgba(28,24,20,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 18px rgba(28,24,20,0.04)'; }}
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURED PROJECTS ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
                <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Signature Work</div>
              </div>
              <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
                Selected Projects
              </h2>
            </div>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] font-bold pb-1 self-start md:self-end transition-opacity hover:opacity-70"
              style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
            >
              Full Portfolio <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {PROJECTS.map(p => (
              <div
                key={p.name}
                className="group overflow-hidden cursor-default transition-shadow duration-300"
                style={{
                  backgroundColor: CREAM,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 18px rgba(28,24,20,0.04)',
                  minHeight: '260px',
                  ...DOT,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 44px rgba(28,24,20,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 18px rgba(28,24,20,0.04)'; }}
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowUpRight className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS — dark anchor ══ */}
      <section className="py-24 md:py-32" style={{ backgroundColor: DARK }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-0"
            style={{ borderTop: '1px solid rgba(250,247,242,0.07)', borderLeft: '1px solid rgba(250,247,242,0.07)' }}
          >
            {[
              { n: '25+',  label: 'Years in Business',      detail: 'Founded 1998 · Houston, TX' },
              { n: '500+', label: 'Projects Completed',     detail: 'Residential · Commercial · Mixed-Use' },
              { n: '$2B+', label: 'Total Constructed Value', detail: 'Across Greater Houston Metro' },
              { n: '12',   label: 'Property Types',         detail: 'From Estates to Industrial Parks' },
            ].map(s => (
              <div key={s.n} className="p-8 md:p-10" style={{ borderRight: '1px solid rgba(250,247,242,0.07)', borderBottom: '1px solid rgba(250,247,242,0.07)' }}>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(38px, 5vw, 62px)', color: GOLD, lineHeight: 1, marginBottom: '0.5rem' }}>{s.n}</div>
                <div className="text-[11px] font-bold mb-1" style={{ color: CREAM }}>{s.label}</div>
                <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'rgba(250,247,242,0.2)' }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROCESS ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
              <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>How We Work</div>
            </div>
            <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 3.8vw, 50px)', color: DARK, lineHeight: 1.08 }}>
              Our Process
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-0" style={{ borderLeft: `1px solid ${BORDER}` }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className="px-8 py-8" style={{ borderRight: i === 3 ? 'none' : `1px solid ${BORDER}` }}>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '2.5rem', color: 'rgba(157,126,63,0.22)', lineHeight: 1, marginBottom: '1.25rem' }}>{s.n}</div>
                <div className="w-8 h-px mb-5" style={{ backgroundColor: GOLD }} />
                <div className="text-base font-bold mb-3" style={{ color: DARK }}>{s.title}</div>
                <p className="text-[11px] leading-relaxed font-light" style={{ color: MUTED }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CLIENT PORTAL BAND ══ */}
      <section style={{ backgroundColor: GOLD }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-[9px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: 'rgba(28,24,20,0.5)' }}>New</div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.45rem', color: DARK, lineHeight: 1.1 }}>
                Client Portal — connect directly with your builder.
              </div>
            </div>
            <Link
              to="/portal"
              className="shrink-0 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-8 py-3.5 transition-opacity hover:opacity-90"
              style={{ backgroundColor: DARK, color: CREAM }}
            >
              Enter Portal <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-28 md:py-40" style={{ backgroundColor: DARK }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-10" style={{ backgroundColor: GOLD, opacity: 0.45 }} />
            <div className="text-[9px] uppercase tracking-[0.42em] font-semibold" style={{ color: GOLD }}>Let's Build Together</div>
            <div className="h-px w-10" style={{ backgroundColor: GOLD, opacity: 0.45 }} />
          </div>
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
          <p className="text-sm leading-relaxed mb-12 max-w-xl mx-auto font-light" style={{ color: 'rgba(250,247,242,0.4)' }}>
            Every landmark starts with a conversation. Tell us about your project and let Houston's premier construction team bring your vision to life.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/contact"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              Start Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/portfolio"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-all hover:bg-white/5"
              style={{ border: `1px solid rgba(157,126,63,0.38)`, color: GOLD }}
            >
              View Portfolio
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
