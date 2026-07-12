import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Award, Users, Shield, Clock, HardHat,
  ArrowRight, ChevronDown, Phone, CheckCircle2,
} from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const B   = '#0A0A0A';
const W   = '#FFFFFF';
const CR  = '#F7F5F1';
const G   = '#E8E8E6';
const AC  = '#9D7E3F';
const ACL = '#C4A76B';
const SF  = "'Cormorant Garamond', Georgia, serif";

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      name: 'Commercial Construction Services — Houston, TX',
      provider: {
        '@type': 'LocalBusiness',
        name: 'Houston Enterprise Construction',
        telephone: '+12819159595',
        email: 'info@houinc.com',
        url: 'https://houinc.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '2100 W Loop South, Suite 1115',
          addressLocality: 'Houston',
          addressRegion: 'TX',
          postalCode: '77027',
          addressCountry: 'US',
        },
        areaServed: [
          'Houston', 'Harris County', 'Fort Bend County',
          'Montgomery County', 'Brazoria County', 'Galveston County',
        ],
      },
      description:
        'Commercial construction services for office buildings, retail spaces, hospitality, industrial facilities, and educational institutions across Greater Houston. 20+ years of commercial expertise.',
      areaServed: 'Greater Houston Metropolitan Area, TX',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What types of commercial projects does Houston Enterprise handle?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "We handle a broad range of commercial projects including office buildings, retail and mixed-use developments, restaurant and hospitality spaces, educational facilities, industrial and warehouse construction, and medical or healthcare facilities across Greater Houston.",
          },
        },
        {
          '@type': 'Question',
          name: "How does Houston's commercial permitting process work?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Commercial permits in Houston are processed through the City of Houston Permitting Center (COHPC). The process involves plan review, inspections, and certificate of occupancy issuance. Timelines vary by project type and scope. We manage all permitting coordination on behalf of our clients.',
          },
        },
        {
          '@type': 'Question',
          name: "What's the difference between shell construction and tenant improvements?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Shell construction delivers a building envelope — foundation, structural framing, roof, and exterior skin — without interior build-out. Tenant improvements (TI) complete the interior to occupancy-ready condition for a specific tenant's use. Houston Enterprise performs both.",
          },
        },
        {
          '@type': 'Question',
          name: 'Do you comply with Texas Accessibility Standards (TAS)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. All applicable commercial projects are designed and constructed in compliance with Texas Accessibility Standards (TAS), which are administered by the Texas Department of Licensing and Regulation (TDLR). TAS applies to most new commercial construction and renovations in Texas.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does commercial construction typically take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Commercial construction timelines vary significantly by project type and scale. Tenant improvements for smaller spaces may take 2–4 months, while ground-up office buildings or industrial facilities can take 12–24 months. We provide detailed project schedules during pre-construction.",
          },
        },
        {
          '@type': 'Question',
          name: "What is an Owner's Representative, and does Houston Enterprise offer that service?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "An Owner's Representative (Owner's Rep) acts on behalf of the property owner to manage the construction process — overseeing the GC, managing the design team, and protecting the owner's interests. Houston Enterprise offers Owner's Rep services as a standalone engagement for clients who want professional oversight without self-performing construction.",
          },
        },
      ],
    },
  ],
};

const WHY_CHOOSE = [
  {
    Icon: Award,
    title: 'Extensive Experience',
    body: 'With over two decades of commercial construction experience in Houston, our team has successfully completed projects across multiple sectors — office, retail, hospitality, industrial, medical, and educational — of varying complexity and scale.',
  },
  {
    Icon: Users,
    title: 'Client-Centric Approach',
    body: 'We prioritize your goals throughout the construction process. From initial consultation through final occupancy, we align on your vision, budget, and timeline — and work to keep every decision consistent with your objectives.',
  },
  {
    Icon: Shield,
    title: 'Quality Craftsmanship',
    body: 'Our team of skilled architects, engineers, and craftsmen is dedicated to producing exceptional results using high-quality materials and proven construction methods. We do not cut corners.',
  },
  {
    Icon: Clock,
    title: 'Efficient Project Management',
    body: 'We follow a systematic approach to commercial project management — efficient coordination of resources, regular progress reporting, and proactive management of schedule and budget to help deliver projects on time.',
  },
  {
    Icon: HardHat,
    title: 'Safety & Compliance',
    body: 'Safety is our top priority on every job site. We comply with OSHA standards, IBC requirements, Texas Accessibility Standards (TAS), and all applicable City of Houston and TDLR regulations throughout every phase of construction.',
  },
];

const SERVICES = [
  {
    title: 'Office Buildings',
    body: 'From small professional suites to large corporate complexes, we design and construct efficient, functional, and aesthetically compelling office environments — Class A finishes, flexible floor plans, and systems integration.',
  },
  {
    title: 'Retail Spaces',
    body: 'Whether launching a new retail location or renovating an existing space, we create inviting environments that maximize brand impact and enhance customer experience — inline retail, anchor spaces, and mixed-use ground-floor commercial.',
  },
  {
    title: 'Hospitality & Entertainment',
    body: 'We specialize in hotels, restaurants, entertainment venues, and food-and-beverage concepts across Houston. We understand the operational requirements and life-safety standards unique to these project types.',
  },
  {
    title: 'Educational Facilities',
    body: 'From K-12 campuses to higher education buildings, we construct safe, functional, and durable educational environments — with attention to ADA compliance, Texas Education Agency (TEA) requirements, and long-term maintainability.',
  },
  {
    title: 'Industrial & Warehouse',
    body: 'Our team is experienced in tilt-wall, pre-engineered metal building, and conventional industrial construction — distribution centers, light manufacturing, flex-industrial, and cold-storage facilities across the Houston market.',
  },
  {
    title: 'Medical & Healthcare',
    body: 'Medical facility construction requires specialized knowledge of infection control, HVAC standards, plumbing codes, and NFPA life-safety requirements. We coordinate closely with medical equipment planners and MEP engineers to deliver compliant healthcare spaces.',
  },
];

const FAQS = [
  {
    q: 'What types of commercial projects does Houston Enterprise handle?',
    a: 'We handle office buildings, retail and mixed-use developments, restaurant and hospitality spaces, educational facilities, industrial and warehouse construction, and medical/healthcare facilities across Greater Houston.',
  },
  {
    q: "How does Houston's commercial permitting process work?",
    a: 'Commercial permits are processed through the City of Houston Permitting Center (COHPC). The process includes plan review, inspections, and certificate of occupancy. We manage all permitting coordination on behalf of our clients.',
  },
  {
    q: "What's the difference between shell construction and tenant improvements?",
    a: 'Shell construction delivers a building envelope without interior build-out. Tenant improvements (TI) complete the interior to occupancy-ready condition for a specific tenant. Houston Enterprise performs both.',
  },
  {
    q: 'Do you comply with Texas Accessibility Standards (TAS)?',
    a: 'Yes. All applicable commercial projects are designed and built in compliance with TAS, administered by the Texas Department of Licensing and Regulation (TDLR).',
  },
  {
    q: 'How long does commercial construction take?',
    a: 'Timelines vary by scope. TI projects may take 2–4 months; ground-up buildings typically take 12–24 months. We provide detailed schedules during pre-construction.',
  },
  {
    q: "What is an Owner's Rep and do you offer that service?",
    a: "An Owner's Rep acts on behalf of the property owner to oversee the GC and design team. Yes — Houston Enterprise offers Owner's Rep services as a standalone engagement.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${G}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: B, lineHeight: 1.4, paddingRight: 24 }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={18} strokeWidth={1.5} style={{ color: AC }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(0,0,0,0.58)', paddingBottom: 20, fontWeight: 300 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CommercialConstruction() {
  useEffect(() => {
    document.title = 'Commercial Construction Services Houston TX | Houston Enterprise';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Office buildings, retail, hospitality, industrial, and healthcare construction across Greater Houston. 20+ years of commercial construction expertise. Call (281) 915-9595.';
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify(SCHEMA);
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  return (
    <PublicLayout>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 72, backgroundColor: B, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 75% 40%, rgba(157,126,63,0.11) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-14" style={{ position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Link to="/services" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', textDecoration: 'none', fontWeight: 600 }}>Services</Link>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>/</span>
              <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: AC, fontWeight: 600 }}>Commercial</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Building2 size={20} strokeWidth={1.5} style={{ color: AC, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: AC }}>Commercial Construction</span>
            </div>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px,5vw,68px)', color: W, lineHeight: 1.08, maxWidth: 700, marginBottom: 24 }}>
              Grade-A Commercial<br />Construction in Houston
            </h1>
            <p style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.8, color: 'rgba(255,255,255,0.62)', maxWidth: 580, marginBottom: 36 }}>
              At Houston Enterprise, we deliver exceptional commercial construction services with precision and professionalism. Whether you are planning a new office building, renovating a retail space, or building a commercial complex, our team of experts is ready to deliver outstanding results.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link to="/contact"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', backgroundColor: AC, color: W,
                  textDecoration: 'none', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.22em', textTransform: 'uppercase', transition: 'background-color 0.22s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ACL; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = AC; }}
              >
                Request a Proposal <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
              <Link to="/portfolio"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', backgroundColor: 'transparent', color: W,
                  textDecoration: 'none', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.22)', transition: 'border-color 0.22s, color 0.22s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = AC; (e.currentTarget as HTMLAnchorElement).style.color = ACL; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLAnchorElement).style.color = W; }}
              >
                View Portfolio <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Why Choose ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: CR, padding: '80px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>Why Choose Houston Enterprise</div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: B, lineHeight: 1.1, maxWidth: 520 }}>
              The Houston Enterprise Difference in Commercial Construction
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, backgroundColor: G }}>
            {WHY_CHOOSE.map(({ Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: i * 0.07 }}
                style={{ backgroundColor: W, padding: '36px 32px' }}
              >
                <div style={{ width: 42, height: 42, backgroundColor: 'rgba(157,126,63,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Icon size={18} strokeWidth={1.5} style={{ color: AC }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: B, marginBottom: 12 }}>{title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(0,0,0,0.54)', fontWeight: 300 }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Services ───────────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '80px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>What We Build</div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: B, lineHeight: 1.1, maxWidth: 500 }}>
              Our Commercial Construction Services
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, backgroundColor: G }}>
            {SERVICES.map(({ title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.40, delay: i * 0.06 }}
                style={{ backgroundColor: CR, padding: '32px 28px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: AC, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: B, lineHeight: 1.3 }}>{title}</div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(0,0,0,0.54)', fontWeight: 300 }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pull Quote ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: B, padding: '72px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div style={{ maxWidth: 740, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: 40, height: 1, backgroundColor: AC, margin: '0 auto 28px' }} />
            <blockquote style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px,2.8vw,36px)', color: W, lineHeight: 1.45, marginBottom: 24 }}>
              "We take pride in delivering superior craftsmanship in every project — highly skilled professionals dedicated to exceptional results using the highest quality materials and construction techniques."
            </blockquote>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: ACL }}>Houston Enterprise · Commercial Construction · Houston, TX</div>
            <div style={{ width: 40, height: 1, backgroundColor: AC, margin: '28px auto 0' }} />
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '80px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr]" style={{ gap: 48 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>FAQ</div>
              <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px,3vw,42px)', color: B, lineHeight: 1.15, marginBottom: 20 }}>
                Commercial Construction Questions
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(0,0,0,0.50)', fontWeight: 300 }}>
                Common questions about commercial construction in Greater Houston with Houston Enterprise.
              </p>
              <div style={{ marginTop: 32 }}>
                <a href="tel:+12819159595" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  textDecoration: 'none', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase', color: AC,
                }}>
                  <Phone size={14} strokeWidth={1.5} /> (281) 915-9595
                </a>
              </div>
            </div>
            <div>
              {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CR, padding: '80px 0', borderTop: `1px solid ${G}` }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 16 }}>Get Started</div>
          <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,4vw,52px)', color: B, lineHeight: 1.1, marginBottom: 20 }}>
            Ready to Discuss Your Commercial Project?
          </h2>
          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: 'rgba(0,0,0,0.52)', maxWidth: 520, margin: '0 auto 36px' }}>
            Reach out to us today to schedule a consultation with our experienced commercial construction team. We look forward to understanding your project and delivering outstanding results.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link to="/contact"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '15px 32px', backgroundColor: B, color: W,
                textDecoration: 'none', fontSize: 10, fontWeight: 800,
                letterSpacing: '0.22em', textTransform: 'uppercase', transition: 'background-color 0.22s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = AC; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = B; }}
            >
              Schedule a Consultation <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <a href="tel:+12819159595"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '15px 32px', backgroundColor: 'transparent', color: B,
                textDecoration: 'none', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                border: `1px solid ${G}`, transition: 'border-color 0.22s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = AC; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = G; }}
            >
              <Phone size={14} strokeWidth={1.5} /> (281) 915-9595
            </a>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
