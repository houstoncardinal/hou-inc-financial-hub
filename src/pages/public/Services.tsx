import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

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

const SERVICES = [
  {
    n: '01',
    title: 'Luxury Custom Homes',
    sub: 'Residential · Private Estates',
    description: "We build private residences for Houston's most exacting clients. Whether a 10,000 sq ft River Oaks estate or a contemporary lakefront retreat, every home we construct is an exercise in disciplined craft and uncompromising detail.",
    features: [
      'Custom architectural floor plans', 'Premium material selection & sourcing',
      'Smart home & automation integration', 'Landscape and hardscape design',
      'Interior design coordination', 'Post-completion warranty program',
    ],
    tag: 'Residential',
  },
  {
    n: '02',
    title: 'Commercial Developments',
    sub: 'Office · Corporate · Institutional',
    description: 'From Fortune 500 campuses to boutique professional towers, we deliver commercial environments that project prestige and perform at the highest level. Our project management systems ensure on-time, on-budget delivery at scale.',
    features: [
      'Class A & B office construction', 'Corporate campus master planning',
      'Tenant improvement & fit-out', 'Sustainable & LEED-certified builds',
      'Ground-up development', 'Renovation & adaptive reuse',
    ],
    tag: 'Commercial',
  },
  {
    n: '03',
    title: 'Shopping Centers & Retail',
    sub: 'Retail · Lifestyle · Mixed-Use',
    description: 'We develop the retail destinations that define communities — from neighborhood centers to regional lifestyle destinations. Our team understands the intersection of traffic engineering, tenant mix, and architectural identity.',
    features: [
      'Anchor retail center development', 'Lifestyle & open-air retail',
      'Mixed-use podium development', 'Parking structure & site design',
      'Phased retail construction', 'Tenant coordination & delivery',
    ],
    tag: 'Retail',
  },
  {
    n: '04',
    title: 'High-Rise Residential',
    sub: 'Condominiums · Multi-Family',
    description: 'Luxury multi-family and condominium towers that redefine the Houston skyline. We handle everything from structural engineering coordination and core-and-shell construction to high-end residential finish-out.',
    features: [
      'Podium & mid-rise residential', 'Luxury condo tower construction',
      'Amenity deck design & build', 'Unit finish-out packages',
      'Common area & lobby design', 'HOA transition support',
    ],
    tag: 'Multi-Family',
  },
  {
    n: '05',
    title: 'Industrial & Warehouse',
    sub: 'Logistics · Light Industrial · Flex',
    description: "Efficient, durable industrial facilities built to accommodate Houston's logistics, manufacturing, and distribution ecosystem. We deliver flex, light industrial, and large-format warehouse products with speed and precision.",
    features: [
      'Tilt-wall & pre-engineered steel', 'Distribution & fulfillment centers',
      'Cold storage & specialty builds', 'Light industrial flex space',
      'Truck court & dock design', 'Land development & infrastructure',
    ],
    tag: 'Industrial',
  },
  {
    n: '06',
    title: 'Renovation & Repositioning',
    sub: 'Adaptive Reuse · Historic · Value-Add',
    description: 'We breathe new life into existing properties — historic buildings, underperforming commercial assets, and residential tear-down/rebuilds. Our renovation expertise preserves what matters and elevates everything else.',
    features: [
      'Full gut rehabilitation', 'Historic preservation compliance',
      'Value-add repositioning', 'MEP systems modernization',
      'Seismic & structural upgrades', 'Phased occupied renovation',
    ],
    tag: 'Renovation',
  },
];

const CAPABILITIES = [
  'Pre-construction Planning', 'Design-Build Delivery', 'Construction Management',
  'General Contracting', 'Value Engineering', 'Safety & Compliance',
  'Subcontractor Management', 'Permitting & Entitlements', 'Schedule Management',
  'Budget Management', 'Quality Control', 'Post-Construction Support',
];

export default function Services() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="pt-40 pb-20" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>What We Build</div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 8vw, 110px)', color: DARK, lineHeight: 0.92, letterSpacing: '-0.01em' }}>
              Services
            </h1>
            <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
              From a 14,000 sq ft private estate to a 400,000 sq ft retail development — HOU INC has the capability, capacity, and conviction to deliver any project at the luxury level Houston demands.
            </p>
          </div>
        </div>
      </section>

      {/* Hairline */}
      <div className="h-px max-w-7xl mx-auto" style={{ backgroundColor: BORDER }} />

      {/* Services Grid */}
      <section className="py-24" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="space-y-0" style={{ border: `1px solid ${BORDER}` }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.n}
                className="grid md:grid-cols-2 group"
                style={{ borderBottom: i < SERVICES.length - 1 ? `1px solid ${BORDER}` : 'none' }}
              >
                {/* Visual side */}
                <div
                  className="relative min-h-[200px] md:min-h-[260px] flex items-end p-8 md:p-10"
                  style={{ backgroundColor: i % 2 === 0 ? CREAM : ALT, order: i % 2 === 0 ? 0 : 1, ...DOT }}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(ellipse at 30% 70%, rgba(157,126,63,0.08) 0%, transparent 60%)` }}
                  />
                  <div className="relative z-10">
                    <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: GOLD }}>{s.tag}</div>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '4.5rem', color: 'rgba(157,126,63,0.14)', lineHeight: 1 }}>{s.n}</div>
                  </div>
                </div>

                {/* Content side */}
                <div
                  className="p-8 md:p-10 flex flex-col justify-center"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderLeft:  i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
                    borderRight: i % 2 !== 0 ? `1px solid ${BORDER}` : 'none',
                    order: i % 2 === 0 ? 1 : 0,
                  }}
                >
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.5rem', color: DARK, marginBottom: '0.25rem' }}>{s.title}</div>
                  <div className="text-[9px] uppercase tracking-[0.22em] mb-5 font-semibold" style={{ color: GOLD }}>{s.sub}</div>
                  <p className="text-[11px] leading-relaxed mb-6 font-light" style={{ color: MUTED }}>{s.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {s.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-[10px]" style={{ color: 'rgba(28,24,20,0.4)' }}>
                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GOLD, opacity: 0.65 }} strokeWidth={1.5} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20" style={{ backgroundColor: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Core Capabilities</div>
          </div>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-0"
            style={{ borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}
          >
            {CAPABILITIES.map(c => (
              <div key={c} className="px-6 py-4" style={{ borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                <div className="text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: 'rgba(28,24,20,0.45)' }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32" style={{ backgroundColor: DARK }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px, 4.5vw, 60px)', color: CREAM, lineHeight: 1.08, marginBottom: '1.25rem' }}>
            Every Project Starts<br />
            <span style={{ color: GOLD }}>With a Conversation</span>
          </h2>
          <p className="text-sm mb-10 font-light" style={{ color: 'rgba(250,247,242,0.4)' }}>
            Tell us what you're building. Our team will respond within one business day.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90"
            style={{ backgroundColor: GOLD, color: DARK }}
          >
            Request a Consultation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

    </PublicLayout>
  );
}
