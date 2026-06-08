import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const G  = '#C4963C';
const BG = '#07070A';

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
    bg: 'linear-gradient(135deg, #12101A 0%, #1C1424 70%, #0A0812 100%)',
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
    bg: 'linear-gradient(135deg, #0E1218 0%, #141C20 70%, #0A0E14 100%)',
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
    bg: 'linear-gradient(135deg, #100E14 0%, #181420 70%, #0C0A10 100%)',
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
    bg: 'linear-gradient(135deg, #140E10 0%, #201418 70%, #0E0810 100%)',
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
    bg: 'linear-gradient(135deg, #101410 0%, #161C14 70%, #0A100A 100%)',
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
    bg: 'linear-gradient(135deg, #120E0A 0%, #1C1610 70%, #0E0A08 100%)',
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
      <section
        className="pt-40 pb-20"
        style={{
          background: `radial-gradient(ellipse at 20% 50%, rgba(196,150,60,0.07) 0%, transparent 50%), ${BG}`,
          borderBottom: '1px solid #1C1A22',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>What We Build</div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none" style={{ color: '#F4F2EE' }}>
              Services
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,242,238,0.45)' }}>
              From a 14,000 sq ft private estate to a 400,000 sq ft retail development — HOU INC has the capability, capacity, and conviction to deliver any project at the luxury level Houston demands.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="space-y-0" style={{ border: '1px solid #1C1A22' }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.n}
                className="grid md:grid-cols-2 group"
                style={{ borderBottom: i < SERVICES.length - 1 ? '1px solid #1C1A22' : 'none' }}
              >
                {/* Visual side */}
                <div
                  className="relative min-h-[220px] md:min-h-[280px] flex items-end p-8 md:p-10"
                  style={{ background: s.bg, order: i % 2 === 0 ? 0 : 1 }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(ellipse at 30% 70%, rgba(196,150,60,0.08) 0%, transparent 60%)` }}
                  />
                  <div className="relative z-10">
                    <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G }}>{s.tag}</div>
                    <div className="text-[60px] font-black leading-none" style={{ color: 'rgba(196,150,60,0.12)' }}>{s.n}</div>
                  </div>
                </div>

                {/* Content side */}
                <div
                  className="p-8 md:p-10 flex flex-col justify-center"
                  style={{ backgroundColor: '#0C0B0F', borderLeft: i % 2 === 0 ? '1px solid #1C1A22' : 'none', borderRight: i % 2 !== 0 ? '1px solid #1C1A22' : 'none', order: i % 2 === 0 ? 1 : 0 }}
                >
                  <div className="text-xl md:text-2xl font-black tracking-tight mb-1" style={{ color: '#F4F2EE' }}>{s.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] mb-5" style={{ color: G }}>{s.sub}</div>
                  <p className="text-[11px] leading-relaxed mb-6" style={{ color: 'rgba(244,242,238,0.45)' }}>{s.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {s.features.map(f => (
                      <div key={f} className="flex items-start gap-2 text-[10px]" style={{ color: 'rgba(244,242,238,0.3)' }}>
                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: G, opacity: 0.6 }} strokeWidth={1.5} />
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
      <section className="py-20" style={{ backgroundColor: '#0C0B0F', borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Core Capabilities</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderTop: '1px solid #1C1A22', borderLeft: '1px solid #1C1A22' }}>
            {CAPABILITIES.map(c => (
              <div key={c} className="px-6 py-4" style={{ borderRight: '1px solid #1C1A22', borderBottom: '1px solid #1C1A22' }}>
                <div className="text-[10px] uppercase tracking-[0.15em] font-medium" style={{ color: 'rgba(244,242,238,0.4)' }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ backgroundColor: BG, borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5" style={{ color: '#F4F2EE' }}>
            Every Project Starts<br />
            <span style={{ color: G }}>With a Conversation</span>
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(244,242,238,0.4)' }}>
            Tell us what you're building. Our team will respond within one business day.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: G, color: '#07070A' }}
          >
            Request a Consultation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
