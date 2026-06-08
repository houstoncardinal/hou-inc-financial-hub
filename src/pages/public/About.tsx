import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const G  = '#C4963C';
const BG = '#07070A';

const VALUES = [
  { n: '01', title: 'Uncompromising Quality', body: 'We hold every trade, material, and decision to an impossibly high standard. Not because we have to — because anything less would be an insult to our clients and our craft.' },
  { n: '02', title: 'Absolute Transparency', body: 'Every budget, every schedule, every challenge is communicated clearly and promptly. Our clients are never surprised by a HOU INC project.' },
  { n: '03', title: 'Long-Term Relationships', body: "The best measure of our work isn't the ribbon cutting — it's the call we get when that client is ready to build again. Over 70% of our revenue comes from repeat clients." },
  { n: '04', title: 'Houston First', body: "We are Houston. We hire Houston subcontractors, buy from Houston suppliers, and reinvest in the city we're proud to build. This isn't a marketing line — it's how we operate." },
];

const TEAM = [
  { name: 'William Hou', title: 'Founder & Chief Executive', bg: 'linear-gradient(135deg, #12101C 0%, #1C1424 100%)', yrs: '25 yrs' },
  { name: 'Marcus Chen', title: 'President, Commercial Division', bg: 'linear-gradient(135deg, #0E1218 0%, #141C20 100%)', yrs: '18 yrs' },
  { name: 'Diana Reyes', title: 'VP, Luxury Residential', bg: 'linear-gradient(135deg, #120E0C 0%, #1C1612 100%)', yrs: '14 yrs' },
  { name: 'James Tran', title: 'Chief Financial Officer', bg: 'linear-gradient(135deg, #100E14 0%, #181420 100%)', yrs: '12 yrs' },
  { name: 'Serena Park', title: 'Director of Design Services', bg: 'linear-gradient(135deg, #14100E 0%, #201614 100%)', yrs: '10 yrs' },
  { name: 'Robert Okafor', title: 'VP, Construction Operations', bg: 'linear-gradient(135deg, #101410 0%, #181C14 100%)', yrs: '16 yrs' },
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
      <section
        className="pt-40 pb-24"
        style={{
          background: `radial-gradient(ellipse at 70% 40%, rgba(196,150,60,0.07) 0%, transparent 50%), ${BG}`,
          borderBottom: '1px solid #1C1A22',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Our Story</div>
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-end">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none" style={{ color: '#F4F2EE' }}>
              About<br />HOU INC
            </h1>
            <div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(244,242,238,0.5)' }}>
                Founded in Houston in 1998, HOU INC has spent 25 years building some of the most recognized residential and commercial properties in Texas.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,242,238,0.5)' }}>
                We are builders, first and foremost. We are also a company that believes the built environment shapes lives, communities, and economies — and that a construction firm has an obligation to its city.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#0C0B0F' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8" style={{ backgroundColor: G }} />
              <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Our Mission</div>
            </div>
            <blockquote
              className="text-2xl md:text-3xl font-black leading-tight tracking-tight mb-8"
              style={{ color: '#F4F2EE' }}
            >
              "To build structures that outlast us — and relationships that do the same. We measure our success not in square footage but in trust earned, one project at a time."
            </blockquote>
            <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: G }}>— William Hou, Founder</div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>What We Stand For</div>
          </div>
          <div className="grid md:grid-cols-4 gap-0" style={{ border: '1px solid #1C1A22' }}>
            {VALUES.map((v, i) => (
              <div key={v.n} className="p-8" style={{ borderRight: i < 3 ? '1px solid #1C1A22' : 'none' }}>
                <div className="text-[9px] font-black tracking-[0.3em] mb-5" style={{ color: 'rgba(196,150,60,0.35)' }}>{v.n}</div>
                <div className="w-6 h-px mb-5" style={{ backgroundColor: G }} />
                <div className="text-base font-black tracking-tight mb-3" style={{ color: '#F4F2EE' }}>{v.title}</div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(244,242,238,0.4)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24" style={{ backgroundColor: '#0C0B0F', borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>25 Years of Progress</div>
          </div>
          <div className="space-y-0" style={{ borderLeft: `1px solid ${G}`, opacity: 0.9 }}>
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="flex items-start gap-8 pl-8 pb-8 relative">
                <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full" style={{ backgroundColor: G }} />
                <div className="text-[11px] font-black w-12 shrink-0" style={{ color: G }}>{m.year}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: i === MILESTONES.length - 1 ? '#F4F2EE' : 'rgba(244,242,238,0.45)' }}>{m.event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24" style={{ backgroundColor: BG, borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Leadership</div>
          </div>
          <div className="grid md:grid-cols-3 gap-0" style={{ border: '1px solid #1C1A22' }}>
            {TEAM.map((t, i) => (
              <div key={t.name} style={{ borderRight: (i + 1) % 3 !== 0 ? '1px solid #1C1A22' : 'none', borderBottom: i < 3 ? '1px solid #1C1A22' : 'none' }}>
                {/* Avatar placeholder */}
                <div className="relative h-40 flex items-end p-6" style={{ background: t.bg }}>
                  <div className="absolute top-4 right-4 text-[8px] uppercase tracking-[0.2em] font-bold px-2 py-1" style={{ color: G, backgroundColor: 'rgba(196,150,60,0.1)' }}>
                    {t.yrs}
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black" style={{ backgroundColor: 'rgba(196,150,60,0.15)', color: G }}>
                    {t.name.split(' ').map(w => w[0]).join('')}
                  </div>
                </div>
                <div className="p-6" style={{ backgroundColor: '#0C0B0F' }}>
                  <div className="text-sm font-black mb-1" style={{ color: '#F4F2EE' }}>{t.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: G }}>{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ backgroundColor: '#0C0B0F', borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5" style={{ color: '#F4F2EE' }}>
            Build With <span style={{ color: G }}>Houston's Best</span>
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(244,242,238,0.4)' }}>
            Our team is ready to hear about your project.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: G, color: '#07070A' }}
            >
              Get In Touch <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 hover:bg-white/5 transition-colors"
              style={{ border: `1px solid rgba(196,150,60,0.35)`, color: G }}
            >
              View Our Work
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
