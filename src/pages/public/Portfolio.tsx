import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const G  = '#C4963C';
const BG = '#07070A';

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
    bg: 'linear-gradient(150deg, #12101C 0%, #1E1628 60%, #0C0812 100%)',
  },
  {
    name: 'Galleria Commerce Center',
    category: 'Commercial',
    loc: 'Galleria District, Houston',
    year: '2023',
    sqft: '280,000 sq ft',
    value: '$124M',
    detail: 'A Class A mixed-use office tower featuring 24 floors of premium office space, ground-floor retail, and a connected 1,400-space structured garage.',
    bg: 'linear-gradient(150deg, #0E1218 0%, #141E22 60%, #0A0C14 100%)',
  },
  {
    name: 'Katy Premium Outlets',
    category: 'Retail',
    loc: 'Katy, TX',
    year: '2022',
    sqft: '420,000 sq ft',
    value: '$186M',
    detail: "Houston's premier open-air luxury outlet center featuring 160 brand stores, three restaurant pavilions, and a state-of-the-art children's play zone.",
    bg: 'linear-gradient(150deg, #101014 0%, #18141E 60%, #0A0A10 100%)',
  },
  {
    name: 'The Heights Collection',
    category: 'Residential',
    loc: 'The Heights, Houston',
    year: '2024',
    sqft: '96,000 sq ft',
    value: '$52M',
    detail: '48 luxury condominiums in a 12-story mid-rise tower with rooftop terrace, concierge lobby, and panoramic views of the Houston skyline.',
    bg: 'linear-gradient(150deg, #140E12 0%, #201420 60%, #0C0810 100%)',
  },
  {
    name: 'Energy Corridor Plaza',
    category: 'Commercial',
    loc: 'Energy Corridor, Houston',
    year: '2023',
    sqft: '340,000 sq ft',
    value: '$155M',
    detail: 'A three-building corporate campus serving the energy sector, featuring LEED Gold certification, 2,000+ parking spaces, and executive amenities.',
    bg: 'linear-gradient(150deg, #0E1210 0%, #141C14 60%, #0A0C0A 100%)',
  },
  {
    name: 'Midtown Market District',
    category: 'Mixed-Use',
    loc: 'Midtown, Houston',
    year: '2022',
    sqft: '210,000 sq ft',
    value: '$89M',
    detail: 'A vibrant mixed-use development combining 120 luxury apartments, 40,000 sq ft of ground-floor retail, and a covered public market plaza.',
    bg: 'linear-gradient(150deg, #120E0A 0%, #1A1412 60%, #0C0A08 100%)',
  },
  {
    name: 'Bayport Logistics Hub',
    category: 'Industrial',
    loc: 'Bayport, Houston',
    year: '2021',
    sqft: '880,000 sq ft',
    value: '$78M',
    detail: 'A class-A logistics campus comprising three tilt-wall warehouses with 36-ft clear heights, 200 dock doors, and direct port connectivity.',
    bg: 'linear-gradient(150deg, #101410 0%, #181C16 60%, #0A100A 100%)',
  },
  {
    name: 'Tanglewood Custom Estate',
    category: 'Residential',
    loc: 'Tanglewood, Houston',
    year: '2024',
    sqft: '9,800 sq ft',
    value: '$6.1M',
    detail: 'A contemporary-transitional custom home featuring a double-height entry foyer, chef's kitchen, home spa, and seamless indoor-outdoor living spaces.',
    bg: 'linear-gradient(150deg, #0E0E14 0%, #161420 60%, #0A0A10 100%)',
  },
  {
    name: 'Memorial Park Village',
    category: 'Mixed-Use',
    loc: 'Memorial, Houston',
    year: '2023',
    sqft: '185,000 sq ft',
    value: '$74M',
    detail: 'Boutique mixed-use development adjacent to Memorial Park, featuring 80 luxury townhomes, curated retail, and a wellness-focused amenity program.',
    bg: 'linear-gradient(150deg, #14100E 0%, #1E1614 60%, #0E0C0A 100%)',
  },
];

export default function Portfolio() {
  const [active, setActive] = useState('All');
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = active === 'All' ? PROJECTS : PROJECTS.filter(p => p.category === active);

  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="pt-40 pb-20"
        style={{
          background: `radial-gradient(ellipse at 80% 30%, rgba(196,150,60,0.07) 0%, transparent 50%), ${BG}`,
          borderBottom: '1px solid #1C1A22',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Signature Work</div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none" style={{ color: '#F4F2EE' }}>
              Portfolio
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,242,238,0.45)' }}>
              Over 500 completed projects across Houston and the greater Texas market. Residential estates, commercial towers, retail destinations, and industrial campuses — each built to the same uncompromising standard.
            </p>
          </div>
        </div>
      </section>

      {/* Filter */}
      <div className="sticky top-[68px] z-30" style={{ backgroundColor: 'rgba(7,7,10,0.97)', borderBottom: '1px solid #1C1A22', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-0 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className="px-5 py-4 text-[9px] uppercase tracking-[0.22em] font-bold whitespace-nowrap transition-colors shrink-0"
                style={{
                  color: active === cat ? G : 'rgba(244,242,238,0.3)',
                  borderBottom: active === cat ? `2px solid ${G}` : '2px solid transparent',
                }}
              >
                {cat}
              </button>
            ))}
            <div className="ml-auto shrink-0 px-5 py-4">
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(244,242,238,0.2)' }}>
                {filtered.length} Projects
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="py-2" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-3 gap-0 mt-6" style={{ border: '1px solid #1C1A22' }}>
            {filtered.map((p, i) => (
              <div
                key={p.name}
                className="relative overflow-hidden group cursor-default"
                style={{
                  minHeight: '300px',
                  background: p.bg,
                  borderRight: (i + 1) % 3 !== 0 ? '1px solid #1C1A22' : 'none',
                  borderBottom: '1px solid #1C1A22',
                }}
                onMouseEnter={() => setHovered(p.name)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(196,150,60,0.08) 0%, transparent 70%)`, opacity: hovered === p.name ? 1 : 0 }}
                />

                <div className="relative z-10 p-7 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[8px] uppercase tracking-[0.28em] font-bold px-2 py-1" style={{ backgroundColor: 'rgba(196,150,60,0.12)', color: G }}>
                        {p.category}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: 'rgba(244,242,238,0.25)' }}>{p.year}</div>
                    </div>
                    <div className="text-lg font-black tracking-tight mb-1" style={{ color: '#F4F2EE' }}>{p.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] mb-4" style={{ color: 'rgba(244,242,238,0.35)' }}>{p.loc}</div>
                    <p
                      className="text-[10px] leading-relaxed transition-all duration-300"
                      style={{
                        color: 'rgba(244,242,238,0.4)',
                        maxHeight: hovered === p.name ? '100px' : '0',
                        overflow: 'hidden',
                        opacity: hovered === p.name ? 1 : 0,
                      }}
                    >
                      {p.detail}
                    </p>
                  </div>

                  <div className="flex items-end justify-between mt-6">
                    <div className="flex items-center gap-5">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(196,150,60,0.4)' }}>Area</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(244,242,238,0.5)' }}>{p.sqft}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.18em] mb-0.5" style={{ color: 'rgba(196,150,60,0.4)' }}>Value</div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgba(244,242,238,0.5)' }}>{p.value}</div>
                      </div>
                    </div>
                    <div
                      className="transition-all duration-300"
                      style={{ opacity: hovered === p.name ? 1 : 0, transform: hovered === p.name ? 'translate(0,0)' : 'translate(4px,4px)' }}
                    >
                      <ArrowUpRight className="w-5 h-5" style={{ color: G }} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ backgroundColor: BG, borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5" style={{ color: '#F4F2EE' }}>
            Your Project Could Be <span style={{ color: G }}>Next</span>
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(244,242,238,0.4)' }}>
            Let's discuss your vision. We respond within one business day.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: G, color: '#07070A' }}
          >
            Start a Conversation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
