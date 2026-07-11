import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Users, BarChart3, Shield, Calendar,
  TrendingUp, ArrowRight, ChevronDown, Phone, CheckCircle2,
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
      name: 'Construction Project Management Services — Houston, TX',
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
        'Comprehensive construction project management for residential and commercial projects in Greater Houston — pre-construction planning, budget control, scheduling, subcontractor coordination, and Owner\'s Representation.',
      areaServed: 'Greater Houston Metropolitan Area, TX',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: "What is the difference between a general contractor and a construction project manager?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "A general contractor (GC) assumes financial risk by bidding a lump-sum price and self-performing or subcontracting all work. A construction project manager (PM) works on behalf of the owner — managing schedule, budget, and quality without holding the risk of a lump-sum contract. The PM model offers greater transparency and owner control. HOU INC can serve in either role.",
          },
        },
        {
          '@type': 'Question',
          name: "When should I hire a project manager for my construction project?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Engaging a project manager during pre-construction — before design is finalized and before a GC is selected — yields the most value. Early PM involvement allows for budget validation, constructability review, and procurement strategy. However, PM can also add value mid-project when additional oversight is needed.",
          },
        },
        {
          '@type': 'Question',
          name: "Can HOU INC serve as my Owner's Representative?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Yes. We offer Owner's Representative services as a standalone engagement — representing your interests throughout the design, bidding, and construction phases without self-performing construction work. This is appropriate when you want independent oversight of a third-party GC.",
          },
        },
        {
          '@type': 'Question',
          name: "Can HOU INC take over management of a troubled project already underway?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Yes. We have experience stepping into projects that are behind schedule, over budget, or experiencing contractor performance issues. We conduct an initial assessment, stabilize the project, and develop a recovery plan. Outcomes depend on the specific conditions we inherit.",
          },
        },
        {
          '@type': 'Question',
          name: "How does HOU INC manage construction budgets?",
          acceptedAnswer: {
            '@type': 'Answer',
            text: "We employ rigorous cost control measures from pre-construction through closeout — developing detailed cost estimates, tracking committed versus actual costs, managing change orders with discipline, and providing regular cost reports. We leverage our industry relationships to source competitive pricing from qualified subcontractors and suppliers.",
          },
        },
      ],
    },
  ],
};

const APPROACH = [
  {
    Icon: Users,
    num: '01',
    title: 'Collaborative Planning',
    body: 'We start with a thorough consultation to understand your vision, goals, and requirements. Working alongside architects, engineers, and subcontractors, we develop a comprehensive project plan that aligns with your objectives and maximizes efficiency.',
  },
  {
    Icon: Calendar,
    num: '02',
    title: 'Detailed Scheduling',
    body: 'We create detailed CPM schedules outlining every phase and milestone. Our project managers actively manage resources, logistics, and dependencies — maintaining timelines without compromising quality through weekly 3-week lookahead reviews.',
  },
  {
    Icon: BarChart3,
    num: '03',
    title: 'Budget Management',
    body: 'Staying within budget is critical. We employ rigorous cost control — monitoring expenditures, conducting thorough cost analysis, and providing regular owner reporting. We leverage our industry connections to source quality subcontractors and materials at competitive prices.',
  },
  {
    Icon: Shield,
    num: '04',
    title: 'Quality Assurance',
    body: 'Our project managers oversee the construction process through regular inspections and quality checks — ensuring all work meets or exceeds industry standards. We maintain strong relationships with trusted subcontractors who share our commitment to quality.',
  },
  {
    Icon: TrendingUp,
    num: '05',
    title: 'Risk Management',
    body: 'We take a proactive approach to identifying and mitigating risk. Our project managers develop contingency plans, monitor progress closely, and implement robust safety protocols — protecting workers, clients, and the surrounding community.',
  },
  {
    Icon: ClipboardList,
    num: '06',
    title: 'Client Satisfaction',
    body: 'Client satisfaction is at the heart of everything we do. We build long-term relationships through exceptional results, transparent communication, and a genuine commitment to exceeding expectations at every stage of the project.',
  },
];

const SERVICES = [
  {
    title: 'Pre-Construction Planning',
    body: 'Budget validation, constructability review, scope development, procurement strategy, permit coordination, and project schedule development — all before a shovel hits the ground.',
  },
  {
    title: 'Budget & Cost Control',
    body: 'Detailed cost estimating, value engineering, change order management, cash flow forecasting, and regular cost-to-complete reporting throughout construction.',
  },
  {
    title: 'Schedule Management',
    body: 'CPM scheduling, 3-week lookahead planning, subcontractor coordination, milestone tracking, and proactive delay mitigation to keep your project on time.',
  },
  {
    title: 'Subcontractor Coordination',
    body: 'Prequalification, bid leveling, contract administration, RFI and submittal management, and day-to-day coordination of all trades on your project.',
  },
  {
    title: 'Quality Assurance',
    body: 'Regular site inspections, punch list management, testing and inspection coordination, and documentation to ensure construction meets design intent and applicable standards.',
  },
  {
    title: "Owner's Representation",
    body: "Independent oversight on your behalf — representing your interests throughout design, bidding, and construction without the conflict of self-performing the work. Available as a standalone service.",
  },
];

const FAQS = [
  {
    q: "What's the difference between a GC and a project manager?",
    a: "A GC bids a lump-sum price and assumes financial risk. A PM works on behalf of the owner with full cost transparency and no lump-sum risk. HOU INC can serve in either role.",
  },
  {
    q: 'When should I hire a project manager?',
    a: 'Ideally during pre-construction — before design is finalized and before a GC is selected. Early PM involvement allows budget validation, constructability review, and competitive procurement.',
  },
  {
    q: "Can HOU INC serve as Owner's Representative?",
    a: "Yes — as a standalone engagement, representing your interests throughout design, bidding, and construction without self-performing any work.",
  },
  {
    q: 'Can you take over a troubled project already in progress?',
    a: 'Yes. We assess current conditions, stabilize the project, and develop a recovery plan. We have experience stepping into projects with schedule delays, budget overruns, or contractor performance issues.',
  },
  {
    q: 'How do you manage construction budgets?',
    a: 'Through detailed cost estimating, committed-versus-actual tracking, disciplined change order management, and regular owner cost reports — from pre-construction through closeout.',
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

export default function ProjectManagementServices() {
  useEffect(() => {
    document.title = 'Construction Project Management Services Houston TX | HOU INC';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = "Construction project management for residential and commercial projects across Greater Houston — pre-construction, budget control, scheduling, and Owner's Representation. Call (281) 915-9595.";
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
          background: 'radial-gradient(ellipse at 65% 45%, rgba(157,126,63,0.11) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-14" style={{ position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Link to="/services" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', textDecoration: 'none', fontWeight: 600 }}>Services</Link>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>/</span>
              <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: AC, fontWeight: 600 }}>Project Management</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <ClipboardList size={20} strokeWidth={1.5} style={{ color: AC, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: AC }}>Project Management</span>
            </div>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px,5vw,68px)', color: W, lineHeight: 1.08, maxWidth: 700, marginBottom: 24 }}>
              Construction PM That<br />Protects Your Interests
            </h1>
            <p style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.8, color: 'rgba(255,255,255,0.62)', maxWidth: 580, marginBottom: 36 }}>
              At HOU INC, we understand that effective project management is the cornerstone of successful construction. We are committed to providing exceptional PM services for both commercial and residential projects — with a proven track record of on-time, on-budget delivery.
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

      {/* ── Our Approach ───────────────────────────────────────── */}
      <section style={{ backgroundColor: CR, padding: '80px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>How We Work</div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: B, lineHeight: 1.1, maxWidth: 520 }}>
              Our Project Management Approach
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, backgroundColor: G }}>
            {APPROACH.map(({ Icon, num, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: i * 0.07 }}
                style={{ backgroundColor: W, padding: '36px 32px', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', bottom: 12, right: 16, fontFamily: SF, fontSize: 72, fontWeight: 700, lineHeight: 1, color: 'rgba(157,126,63,0.06)', userSelect: 'none', pointerEvents: 'none' }}>{num}</div>
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

      {/* ── PM Services ────────────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '80px 0' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-14">
          <div style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: AC, marginBottom: 14 }}>What We Provide</div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: B, lineHeight: 1.1, maxWidth: 500 }}>
              Our Project Management Services
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
              "Client satisfaction is at the heart of our project management services. We build long-term relationships through exceptional results, transparent communication, and a commitment to exceeding expectations."
            </blockquote>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase', color: ACL }}>HOU INC · Project Management · Houston, TX</div>
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
                Project Management Questions
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(0,0,0,0.50)', fontWeight: 300 }}>
                Common questions about construction project management services with HOU INC in Greater Houston.
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
            Ready to Experience Expert Construction PM?
          </h2>
          <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.8, color: 'rgba(0,0,0,0.52)', maxWidth: 520, margin: '0 auto 36px' }}>
            Contact HOU INC to schedule a consultation with our project management team. We look forward to collaborating with you to bring your construction vision to life — on schedule and within budget.
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
