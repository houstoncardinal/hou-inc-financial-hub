import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Award, Users, Shield, Clock, MessageSquare,
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
      name: 'Residential Construction Services — Houston, TX',
      provider: {
        '@type': 'LocalBusiness',
        name: 'HOU INC Construction',
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
        'Custom home construction, full renovations, home additions, and kitchen & bath remodeling across Greater Houston. Over 20 years of residential construction expertise.',
      areaServed: 'Greater Houston Metropolitan Area, TX',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What areas does HOU INC serve for residential construction?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We serve the Greater Houston metropolitan area including Harris, Fort Bend, Montgomery, Brazoria, and Galveston counties — covering communities such as Sugar Land, The Woodlands, Katy, Pearland, League City, and Friendswood.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need an architect before I contact HOU INC?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Not necessarily. We work closely with licensed architects and can facilitate introductions based on your project scope. Our team can advise on what design services are appropriate before construction begins.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does a custom home build typically take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Timeline depends heavily on scope, complexity, and permitting. A custom single-family home in Houston typically takes 10–18 months from permit approval to substantial completion. We provide detailed project schedules during pre-construction.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does HOU INC handle permits and inspections?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. We manage all permit applications through the City of Houston Permitting Center and coordinate required inspections throughout the construction process. Permit timelines vary by project type and jurisdiction.',
          },
        },
        {
          '@type': 'Question',
          name: "How do you handle Houston's flood zone requirements?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We coordinate with civil engineers and surveyors to ensure compliance with FEMA flood zone regulations, Houston floodplain management ordinances, and Harris County Flood Control District requirements. Finished floor elevation requirements vary by zone designation.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the difference between a general contractor and a construction manager?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A general contractor typically provides a lump-sum bid and manages subcontractors from their own roster. A construction manager (CM) works on behalf of the owner with full cost transparency — often in an at-risk or agency format. HOU INC can serve in either capacity depending on your project delivery preference.',
          },
        },
      ],
    },
  ],
};

const WHY_CHOOSE = [
  {
    Icon: Award,
    title: 'Unmatched Expertise',
    body: "With over 20 years of experience in Houston's residential construction market, our team brings deep knowledge of local building codes, Harris County deed restrictions, HOA approval processes, and Gulf Coast-specific construction standards.",
  },
  {
    Icon: Users,
    title: 'Personalized Approach',
    body: 'We believe your home should reflect your unique vision. Our architects, designers, and project leads work closely with you from concept to completion — tailoring every decision to your lifestyle, preferences, and budget.',
  },
  {
    Icon: Shield,
    title: 'Quality Craftsmanship',
    body: 'From foundation to finish, we are committed to exceptional workmanship. We select high-quality materials, maintain rigorous quality control, and pay careful attention to detail at every phase of construction.',
  },
  {
    Icon: Clock,
    title: 'Timely Delivery',
    body: 'We follow a structured project management approach — detailed scheduling, proactive procurement, and weekly progress reviews — to keep your project on track and within budget.',
  },
  {
    Icon: MessageSquare,
    title: 'Transparent Communication',
    body: "You'll always know where your project stands. We provide regular updates, clear documentation, and open access to project information throughout the entire construction process.",
  },
];

const SERVICES = [
  {
    title: 'Custom Home Construction',
    body: 'We specialize in building custom homes tailored to your specific needs. From architectural concept through final walkthrough, we manage every aspect — site preparation, framing, MEP systems, finishes, and landscaping coordination.',
  },
  {
    title: 'Home Renovation',
    body: 'Transform your existing home into the space you envisioned. Our renovation teams handle structural modifications, system upgrades, and aesthetic improvements with minimal disruption to your daily life.',
  },
  {
    title: 'Home Additions',
    body: 'Need more space? We design and build seamless additions — additional bedrooms, expanded living areas, second-story additions, sunrooms, and more — integrating new construction with your existing structure.',
  },
  {
    title: 'Kitchen & Bathroom Remodeling',
    body: 'End-to-end kitchen and bath upgrades: layout reconfiguration, plumbing and electrical rough-in, custom cabinetry, countertops, tile work, fixture installation, and final trim — all managed under one roof.',
  },
  {
    title: 'Interior & Exterior Upgrades',
    body: "Enhance your home's functionality and curb appeal. We offer flooring installation, interior painting, exterior siding and cladding, roofing, window and door replacement, and outdoor living construction.",
  },
  {
    title: 'Pool Houses & Outdoor Structures',
    body: "From covered outdoor kitchens to full pool house structures with guest accommodations, we build outdoor spaces designed for Houston's climate — durable, functional, and architecturally cohesive with your home.",
  },
];

const FAQS = [
  {
    q: 'What areas does HOU INC serve?',
    a: 'We serve Greater Houston including Harris, Fort Bend, Montgomery, Brazoria, and Galveston counties — Sugar Land, The Woodlands, Katy, Pearland, League City, and surrounding communities.',
  },
  {
    q: 'Do I need an architect before contacting HOU INC?',
    a: 'Not necessarily. We can advise on what design services are appropriate for your scope and facilitate introductions to licensed architects we work with regularly.',
  },
  {
    q: 'How long does a custom home build take?',
    a: 'Most custom homes take 10–18 months from permit approval to substantial completion. We provide detailed project schedules during pre-construction planning.',
  },
  {
    q: 'Do you handle permits and inspections?',
    a: 'Yes. We manage all permit applications through the City of Houston Permitting Center and coordinate all required inspections from foundation through final occupancy.',
  },
  {
    q: "How do you address Houston's flood zone requirements?",
    a: 'We coordinate with civil engineers and surveyors to meet FEMA flood zone designations, Houston floodplain ordinances, and HCFCD requirements. Finished floor elevations are determined per the specific flood zone of your lot.',
  },
  {
    q: "What's the difference between a general contractor and construction manager?",
    a: 'A GC provides a lump-sum contract and manages their own subcontractor roster. A CM works on your behalf with full cost transparency. HOU INC can operate in either delivery model.',
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

export default function ResidentialConstruction() {
  useEffect(() => {
    document.title = 'Residential Construction Services Houston TX | HOU INC';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Custom home construction, renovations, additions, and remodeling across Greater Houston. Over 20 years of residential construction expertise. Call (281) 915-9595.';
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
          background: 'radial-gradient(ellipse at 70% 50%, rgba(157,126,63,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-14" style={{ position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Link to="/services" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', textDecoration: 'none', fontWeight: 600 }}>Services</Link>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>/</span>
              <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: AC, fontWeight: 600 }}>Residential</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Home size={20} strokeWidth={1.5} style={{ color: AC, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: AC }}>Residential Construction</span>
            </div>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px,5vw,68px)', color: W, lineHeight: 1.08, maxWidth: 700, marginBottom: 24 }}>
              Custom Homes Built<br />for Houston Living
            </h1>
            <p style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.8, color: 'rgba(255,255,255,0.62)', maxWidth: 580, marginBottom: 36 }}>
              At HOU INC, we specialize in delivering top-quality residential construction services across Greater Houston. With our expert team of architects, engineers, and skilled craftsmen, we bring your vision of a dream home to life — whether you're building from scratch, renovating, or expanding.
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
                Schedule a Consultation <ArrowRight size={14} strokeWidth={2.5} />
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
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>Why Choose HOU INC</div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: B, lineHeight: 1.1, maxWidth: 520 }}>
              The HOU INC Difference in Residential Construction
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
              Our Residential Construction Services
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
              "From the foundation to the finishing touches, we pay attention to detail and use high-quality materials to ensure longevity and beauty."
            </blockquote>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: ACL }}>HOU INC · Residential Construction · Houston, TX</div>
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
                Residential Construction Questions
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(0,0,0,0.50)', fontWeight: 300 }}>
                Common questions about working with HOU INC on residential projects across Greater Houston.
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
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 16 }}>Get Started Today</div>
          <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,4vw,52px)', color: B, lineHeight: 1.1, marginBottom: 20 }}>
            Ready to Build Your Dream Home?
          </h2>
          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: 'rgba(0,0,0,0.52)', maxWidth: 520, margin: '0 auto 36px' }}>
            Contact HOU INC today to schedule a consultation. Our team will work closely with you to understand your vision, provide expert guidance, and deliver a residential construction experience that exceeds your expectations.
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
