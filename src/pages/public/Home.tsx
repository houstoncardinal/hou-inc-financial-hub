import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const G  = '#C4963C';
const G2 = '#E8C87A';
const BG = '#07070A';

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
    body: 'We design and build singular private homes for Houston's most discerning families. Every detail — from foundation to finish — is executed to an uncompromising standard.',
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
  { name: 'The River Oaks Estate', type: 'Luxury Residential', loc: 'River Oaks, Houston', year: '2024', sqft: '14,200 sq ft', bg: 'linear-gradient(135deg, #12101A 0%, #1C1424 60%, #0C0A12 100%)' },
  { name: 'Galleria Commerce Center', type: 'Class A Commercial', loc: 'Galleria District, Houston', year: '2023', sqft: '280,000 sq ft', bg: 'linear-gradient(135deg, #0E1218 0%, #141C20 60%, #0A0E14 100%)' },
  { name: 'The Heights Collection', type: 'Luxury Condominiums', loc: 'The Heights, Houston', year: '2024', sqft: '96,000 sq ft', bg: 'linear-gradient(135deg, #140E10 0%, #201418 60%, #0E0810 100%)' },
  { name: 'Katy Premium Outlets', type: 'Retail Development', loc: 'Katy, TX', year: '2022', sqft: '420,000 sq ft', bg: 'linear-gradient(135deg, #101410 0%, #161C14 60%, #0A100A 100%)' },
];

const STATS = [
  { n: '25+', label: 'Years in Houston' },
  { n: '500+', label: 'Projects Delivered' },
  { n: '$2B+', label: 'Total Constructed' },
  { n: '12', label: 'Property Types' },
];

const STEPS = [
  { n: '01', title: 'Discovery & Vision', body: 'We begin with an in-depth consultation to understand your goals, timeline, and standard of quality before a single line is drawn.' },
  { n: '02', title: 'Design & Engineering', body: 'Our in-house design team works with the top architectural firms in Houston to produce precise, buildable plans that translate vision into structure.' },
  { n: '03', title: 'Procurement & Build', body: 'We leverage decades of supplier relationships to source premium materials at scale, then execute construction with relentless quality control.' },
  { n: '04', title: 'Delivery & Beyond', body: 'On-time, on-spec delivery is our baseline — not our headline. Post-completion, our team remains available for warranty, maintenance, and future builds.' },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        className="relative flex flex-col justify-end"
        style={{
          minHeight: '100vh',
          background: `radial-gradient(ellipse at 15% 60%, rgba(196,150,60,0.07) 0%, transparent 55%),
                       radial-gradient(ellipse at 85% 30%, rgba(196,150,60,0.04) 0%, transparent 45%),
                       ${BG}`,
        }}
      >
        {/* Thin gold top accent */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: G, opacity: 0.35 }} />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(196,150,60,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(196,150,60,0.03) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-10" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.35em] font-semibold" style={{ color: G }}>
              Houston · Texas · Est. 1998
            </div>
          </div>

          {/* Main headline */}
          <h1
            className="font-black uppercase leading-[0.9] tracking-tight mb-8"
            style={{ fontSize: 'clamp(52px, 10vw, 130px)', color: '#F4F2EE' }}
          >
            Building<br />
            <span style={{ color: G }}>Houston's</span><br />
            Legacy.
          </h1>

          {/* Sub-headline */}
          <p className="text-base md:text-lg font-light max-w-xl mb-12 leading-relaxed" style={{ color: 'rgba(244,242,238,0.5)' }}>
            Luxury residential and commercial construction for those who refuse to compromise. From custom estates in River Oaks to landmark commercial developments across the greater Houston area.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-20">
            <Link
              to="/portfolio"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-8 py-4 transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: G, color: '#07070A' }}
            >
              View Our Work <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/contact"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-8 py-4 transition-all duration-200 hover:bg-white/5"
              style={{ border: `1px solid rgba(196,150,60,0.4)`, color: G }}
            >
              Start a Project
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderTop: '1px solid #1C1A22', borderLeft: '1px solid #1C1A22' }}>
            {STATS.map(s => (
              <div key={s.n} className="px-6 py-5" style={{ borderRight: '1px solid #1C1A22', borderBottom: '1px solid #1C1A22' }}>
                <div className="text-3xl md:text-4xl font-black leading-none mb-1" style={{ color: G }}>{s.n}</div>
                <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(244,242,238,0.35)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="text-[8px] uppercase tracking-[0.3em]" style={{ color: G }}>Scroll</div>
          <ArrowDown className="w-3 h-3" style={{ color: G }} strokeWidth={2} />
        </div>
      </section>

      {/* ═══════════════════ TICKER STRIP ═══════════════════ */}
      <div className="py-4 overflow-hidden" style={{ backgroundColor: G }}>
        <div className="flex items-center gap-8 px-8 flex-wrap justify-center md:justify-start">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="text-[9px] uppercase tracking-[0.25em] font-black whitespace-nowrap flex items-center gap-8" style={{ color: '#07070A' }}>
              {item}
              {i < TICKER.length * 2 - 1 && <span className="opacity-40">◆</span>}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════ ABOUT INTRO ═══════════════════ */}
      <section className="py-24 md:py-36" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            {/* Left: text */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8" style={{ backgroundColor: G }} />
                <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Our Story</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-6" style={{ color: '#F4F2EE' }}>
                A Quarter Century of<br />Building Excellence
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(244,242,238,0.45)' }}>
                HOU INC was founded in Houston in 1998 with a singular conviction: that the built environment shapes the quality of life for everyone who inhabits it. Over 25 years, we've grown from a boutique residential builder into one of Houston's most trusted luxury construction firms.
              </p>
              <p className="text-sm leading-relaxed mb-10" style={{ color: 'rgba(244,242,238,0.45)' }}>
                Today we serve private clients, institutional developers, and commercial enterprises across the greater Houston metro — delivering properties that set the standard for craftsmanship, design, and performance.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold pb-1 transition-all"
                style={{ color: G, borderBottom: `1px solid ${G}` }}
              >
                Our Full Story <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Right: oversized number */}
            <div className="flex flex-col items-center md:items-end">
              <div
                className="font-black leading-none select-none"
                style={{ fontSize: 'clamp(120px, 18vw, 220px)', color: 'rgba(196,150,60,0.07)', lineHeight: 1 }}
              >
                25
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] font-semibold -mt-4 md:-mt-8" style={{ color: 'rgba(196,150,60,0.4)' }}>
                Years · Houston · Texas
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SERVICES ═══════════════════ */}
      <section className="py-24 md:py-36" style={{ backgroundColor: '#0C0B0F' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: G }} />
                <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>What We Build</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: '#F4F2EE' }}>
                Our Services
              </h2>
            </div>
            <Link
              to="/services"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold self-start md:self-end pb-1"
              style={{ color: G, borderBottom: `1px solid ${G}` }}
            >
              All Services <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-0" style={{ border: '1px solid #1C1A22' }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.n}
                className="p-8 md:p-10 transition-colors duration-300 group cursor-default"
                style={{
                  borderRight: i < 2 ? '1px solid #1C1A22' : 'none',
                  borderTop: '3px solid transparent',
                  backgroundColor: '#0C0B0F',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#111018'; (e.currentTarget as HTMLDivElement).style.borderTopColor = G; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#0C0B0F'; (e.currentTarget as HTMLDivElement).style.borderTopColor = 'transparent'; }}
              >
                <div className="text-[9px] font-black tracking-[0.3em] mb-6" style={{ color: 'rgba(196,150,60,0.4)' }}>{s.n}</div>
                <div className="text-xl font-black tracking-tight mb-1" style={{ color: '#F4F2EE' }}>{s.title}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] mb-5" style={{ color: G }}>{s.sub}</div>
                <p className="text-[11px] leading-relaxed mb-8" style={{ color: 'rgba(244,242,238,0.45)' }}>{s.body}</p>
                <div className="space-y-2">
                  {s.specs.map(spec => (
                    <div key={spec} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: 'rgba(244,242,238,0.3)' }}>
                      <div className="w-3 h-px" style={{ backgroundColor: G, opacity: 0.5 }} />
                      {spec}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURED PROJECTS ═══════════════════ */}
      <section className="py-24 md:py-36" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8" style={{ backgroundColor: G }} />
                <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Signature Work</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: '#F4F2EE' }}>
                Selected Projects
              </h2>
            </div>
            <Link
              to="/portfolio"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold self-start md:self-end pb-1"
              style={{ color: G, borderBottom: `1px solid ${G}` }}
            >
              Full Portfolio <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-0" style={{ border: '1px solid #1C1A22' }}>
            {PROJECTS.map((p, i) => (
              <div
                key={p.name}
                className="relative group overflow-hidden"
                style={{
                  borderRight: i % 2 === 0 ? '1px solid #1C1A22' : 'none',
                  borderBottom: i < 2 ? '1px solid #1C1A22' : 'none',
                  minHeight: '280px',
                  background: p.bg,
                }}
              >
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(196,150,60,0.06) 0%, transparent 70%)` }}
                />
                <div className="relative z-10 p-8 md:p-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: G }}>{p.type}</div>
                    <div className="text-xl md:text-2xl font-black tracking-tight mb-2" style={{ color: '#F4F2EE' }}>{p.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: 'rgba(244,242,238,0.35)' }}>{p.loc}</div>
                  </div>
                  <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(196,150,60,0.4)' }}>Area</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(244,242,238,0.5)' }}>{p.sqft}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(196,150,60,0.4)' }}>Year</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(244,242,238,0.5)' }}>{p.year}</div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ArrowUpRight className="w-5 h-5" style={{ color: G }} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BIG STATS ═══════════════════ */}
      <section
        className="py-24 md:py-32"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(196,150,60,0.06) 0%, transparent 60%), #0C0B0F`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderTop: '1px solid #1C1A22', borderLeft: '1px solid #1C1A22' }}>
            {[
              { n: '25+', label: 'Years in Business', detail: 'Founded 1998 · Houston, TX' },
              { n: '500+', label: 'Projects Completed', detail: 'Residential · Commercial · Mixed-Use' },
              { n: '$2B+', label: 'Total Constructed Value', detail: 'Across Greater Houston Metro' },
              { n: '12', label: 'Property Types', detail: 'From Estates to Industrial Parks' },
            ].map(s => (
              <div key={s.n} className="p-8 md:p-10 group" style={{ borderRight: '1px solid #1C1A22', borderBottom: '1px solid #1C1A22' }}>
                <div className="text-5xl md:text-6xl font-black leading-none mb-3" style={{ color: G }}>{s.n}</div>
                <div className="text-[11px] font-bold mb-1.5" style={{ color: '#F4F2EE' }}>{s.label}</div>
                <div className="text-[9px] uppercase tracking-[0.15em]" style={{ color: 'rgba(244,242,238,0.25)' }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PROCESS ═══════════════════ */}
      <section className="py-24 md:py-36" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ backgroundColor: G }} />
              <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>How We Work</div>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: '#F4F2EE' }}>
              Our Process
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-0" style={{ borderLeft: '1px solid #1C1A22' }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className="px-8 py-6" style={{ borderRight: i === 3 ? 'none' : '1px solid #1C1A22' }}>
                <div className="text-[28px] font-black leading-none mb-5" style={{ color: 'rgba(196,150,60,0.2)' }}>{s.n}</div>
                <div className="w-8 h-px mb-5" style={{ backgroundColor: G }} />
                <div className="text-base font-black mb-3" style={{ color: '#F4F2EE' }}>{s.title}</div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(244,242,238,0.4)' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section
        className="py-24 md:py-36"
        style={{
          background: `linear-gradient(135deg, rgba(196,150,60,0.1) 0%, rgba(196,150,60,0.03) 50%, rgba(196,150,60,0.07) 100%), #0C0B0F`,
          borderTop: '1px solid #1C1A22',
          borderBottom: '1px solid #1C1A22',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-10" style={{ backgroundColor: G, opacity: 0.5 }} />
            <div className="text-[9px] uppercase tracking-[0.35em] font-semibold" style={{ color: G }}>Let's Build Together</div>
            <div className="h-px w-10" style={{ backgroundColor: G, opacity: 0.5 }} />
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6" style={{ color: '#F4F2EE' }}>
            Ready to Build<br />
            <span style={{ color: G }}>Something Extraordinary?</span>
          </h2>
          <p className="text-sm leading-relaxed mb-12 max-w-xl mx-auto" style={{ color: 'rgba(244,242,238,0.45)' }}>
            Every landmark starts with a conversation. Tell us about your project and let Houston's premier construction team bring your vision to life.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/contact"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 transition-all hover:opacity-90"
              style={{ backgroundColor: G, color: '#07070A' }}
            >
              Start Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/portfolio"
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 transition-all hover:bg-white/5"
              style={{ border: `1px solid rgba(196,150,60,0.35)`, color: G }}
            >
              View Portfolio
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
