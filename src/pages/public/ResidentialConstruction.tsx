import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileText,
  Hammer,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  Ruler,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const B = '#0A0A0A';
const W = '#FFFFFF';
const CR = '#F7F5F1';
const G = '#E8E8E6';
const AC = '#9D7E3F';
const ACL = '#C4A76B';
const SF = "'Cormorant Garamond', Georgia, serif";

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      name: 'Residential Construction Services in Houston, TX',
      serviceType: [
        'Custom Home Construction',
        'Home Renovation',
        'Home Additions',
        'Kitchen Remodeling',
        'Bathroom Remodeling',
        'Interior and Exterior Upgrades',
      ],
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
      },
      areaServed: [
        'Houston, TX',
        'Greater Houston Metropolitan Area',
        'Harris County',
        'Fort Bend County',
        'Montgomery County',
        'Brazoria County',
        'Galveston County',
      ],
      description:
        'Residential construction services in Houston including custom homes, home renovations, additions, kitchen and bathroom remodeling, and interior and exterior upgrades.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What residential construction services does Houston Enterprise provide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Houston Enterprise provides custom home construction, home renovation, home additions, kitchen and bathroom remodeling, and interior and exterior upgrades for homeowners in the Greater Houston area.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can Houston Enterprise help before plans are finalized?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Houston Enterprise can assist during early planning, review project scope, coordinate with design professionals when appropriate, and help owners understand construction feasibility before work begins.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Houston Enterprise handle permits and inspections?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Houston Enterprise can coordinate permit submissions and required inspections for residential construction projects. Requirements and timing vary by municipality, jurisdiction, HOA, and project scope.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does a residential construction project take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Residential construction timelines vary based on project size, design complexity, permitting, selections, weather, and material availability. Houston Enterprise provides a project-specific schedule during planning.',
          },
        },
      ],
    },
  ],
};

const SERVICES = [
  {
    icon: Home,
    title: 'Custom Home Construction',
    kicker: 'Ground-up residences',
    body:
      'Houston Enterprise builds custom homes shaped around the owner’s site, lifestyle, layout goals, finish preferences, and long-term needs. Our team coordinates construction from pre-build planning through final walkthrough.',
    bullets: ['Site and scope review', 'Construction planning', 'Material and finish coordination'],
  },
  {
    icon: Wrench,
    title: 'Home Renovation',
    kicker: 'Modernize existing homes',
    body:
      'From targeted updates to full-home renovations, we help transform dated or inefficient spaces into homes that feel current, functional, and more aligned with daily life.',
    bullets: ['Whole-home updates', 'Structural and system coordination', 'Finish modernization'],
  },
  {
    icon: Layers,
    title: 'Home Additions',
    kicker: 'More space, integrated well',
    body:
      'We plan and build additions that are intended to connect thoughtfully with the existing structure, including bedrooms, expanded kitchens, living spaces, sunrooms, and second-story concepts.',
    bullets: ['Layout integration', 'Exterior tie-ins', 'Foundation and framing coordination'],
  },
  {
    icon: Ruler,
    title: 'Kitchen and Bathroom Remodeling',
    kicker: 'High-use rooms, carefully managed',
    body:
      'Kitchen and bath work requires sequencing, trade coordination, and detail control. We manage cabinetry, countertops, tile, plumbing, electrical, fixtures, and final finish work.',
    bullets: ['Cabinetry and counters', 'Plumbing and electrical coordination', 'Tile, fixtures, and trim'],
  },
  {
    icon: Hammer,
    title: 'Interior and Exterior Upgrades',
    kicker: 'Performance and curb appeal',
    body:
      'Houston Enterprise can improve the look, comfort, and function of a home through flooring, painting, roofing, siding, window replacement, doors, exterior finishes, and related upgrades.',
    bullets: ['Flooring and painting', 'Roofing and siding', 'Windows, doors, and exterior finishes'],
  },
];

const HIGHLIGHTS = [
  {
    icon: Award,
    title: 'Experienced Construction Team',
    body:
      'With more than 20 years of construction experience, Houston Enterprise brings practical knowledge of residential planning, trade coordination, sequencing, and quality control.',
  },
  {
    icon: Users,
    title: 'Personalized Planning',
    body:
      'Every home has a different story. We work with owners and design professionals to understand priorities, clarify decisions, and align construction with the intended use of the space.',
  },
  {
    icon: Shield,
    title: 'Craftsmanship and Materials',
    body:
      'We place emphasis on durable assemblies, clean finish execution, and appropriate material selections for Houston-area homes and Gulf Coast conditions.',
  },
  {
    icon: Clock,
    title: 'Structured Project Management',
    body:
      'Schedules, procurement, documentation, and field coordination are managed with a clear process designed to reduce surprises and keep the project moving.',
  },
  {
    icon: MessageSquare,
    title: 'Transparent Communication',
    body:
      'Clients receive clear updates, documented decisions, and direct communication throughout the construction process so issues can be addressed early.',
  },
];

const PROCESS = [
  {
    label: '01',
    title: 'Discovery and Scope Review',
    body:
      'We begin with your goals, property, budget expectations, timeline, and existing drawings or inspiration so the project can be evaluated clearly.',
  },
  {
    label: '02',
    title: 'Pre-Construction Planning',
    body:
      'Our team reviews feasibility, sequencing, allowances, long-lead items, trade requirements, and permitting considerations before construction begins.',
  },
  {
    label: '03',
    title: 'Build Coordination',
    body:
      'Houston Enterprise manages daily construction activity, subcontractor coordination, documentation, inspections, and quality checkpoints.',
  },
  {
    label: '04',
    title: 'Closeout and Final Details',
    body:
      'We walk the project, document remaining items, coordinate final corrections, and help owners transition from active construction into use of the home.',
  },
];

const SEO_AREAS = [
  'Houston',
  'River Oaks',
  'West University',
  'Bellaire',
  'Memorial',
  'The Heights',
  'Katy',
  'Sugar Land',
  'The Woodlands',
  'Pearland',
  'League City',
  'Friendswood',
];

const FAQS = [
  {
    q: 'What types of residential construction projects do you handle?',
    a: 'Houston Enterprise works on custom homes, major renovations, additions, kitchen and bathroom remodels, and interior or exterior upgrades. The right scope depends on the property, design requirements, budget, and permitting path.',
  },
  {
    q: 'Can you help with design coordination?',
    a: 'Yes. We can coordinate with architects, designers, engineers, and consultants when the project requires professional design input. We avoid making assumptions about licensing or engineering requirements and recommend the right professional path for the scope.',
  },
  {
    q: 'Do you guarantee a project will be completed on a certain date or budget?',
    a: 'Construction involves variables such as permitting, weather, site conditions, material availability, and owner selections. We do not promise unrealistic guarantees. We do provide structured schedules, documented pricing, transparent updates, and proactive project management.',
  },
  {
    q: 'Do you work on occupied homes?',
    a: 'For some renovations and remodels, work can be phased around an occupied home. Safety, dust control, access, temporary utilities, and sequencing are reviewed before construction so expectations are clear.',
  },
  {
    q: 'What makes Houston residential construction different?',
    a: 'Houston projects often require attention to drainage, floodplain considerations, expansive soils, heat and humidity, HOA requirements, municipal permitting, and hurricane-season planning. We factor these considerations into project planning when applicable.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rc-faq-item">
      <button type="button" onClick={() => setOpen(o => !o)} className="rc-faq-button">
        <span>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="rc-faq-answer">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResidentialConstruction() {
  useEffect(() => {
    document.title = 'Residential Construction Services Houston TX | Custom Homes & Renovations';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) {
      desc.content =
        'Houston residential construction services for custom homes, renovations, home additions, kitchen remodeling, bathroom remodeling, and interior or exterior upgrades.';
    }
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = 'https://houinc.com/services/residential-construction';

    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify(SCHEMA);
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  return (
    <PublicLayout>
      <style>{`
        .rc-page { --rc-black: ${B}; --rc-gold: ${AC}; --rc-cream: ${CR}; color: ${B}; }
        .rc-container { width: min(100%, 1280px); margin: 0 auto; padding: 0 clamp(20px, 4vw, 56px); }
        .rc-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.42em; text-transform: uppercase; color: ${AC}; }
        .rc-serif { font-family: ${SF}; font-style: italic; font-weight: 300; letter-spacing: 0; }
        .rc-body { font-size: 15px; line-height: 1.85; font-weight: 300; color: rgba(0,0,0,0.56); }
        .rc-hero { position: relative; min-height: min(860px, 96vh); display: flex; align-items: flex-end; overflow: hidden; background: ${B}; }
        .rc-hero video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.58; filter: saturate(0.78) contrast(1.05); }
        .rc-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 42%, rgba(0,0,0,0.28) 100%), linear-gradient(0deg, rgba(0,0,0,0.88), transparent 50%); }
        .rc-hero-content { position: relative; z-index: 1; padding-top: 150px; padding-bottom: clamp(42px, 7vw, 88px); }
        .rc-hero h1 { max-width: 780px; margin: 20px 0 22px; color: ${W}; font-size: clamp(42px, 6vw, 86px); line-height: 0.98; }
        .rc-hero p { max-width: 660px; color: rgba(255,255,255,0.72); font-size: clamp(15px, 1.5vw, 18px); line-height: 1.85; font-weight: 300; }
        .rc-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
        .rc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 48px; padding: 0 28px; text-decoration: none; font-size: 10px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; transition: all 0.2s ease; }
        .rc-btn-gold { background: ${AC}; color: ${W}; }
        .rc-btn-gold:hover { background: ${ACL}; }
        .rc-btn-outline { border: 1px solid rgba(255,255,255,0.28); color: ${W}; }
        .rc-btn-outline:hover { border-color: ${AC}; color: ${ACL}; }
        .rc-hero-panel { margin-top: clamp(36px, 7vw, 84px); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid rgba(255,255,255,0.16); background: rgba(10,10,10,0.52); backdrop-filter: blur(18px); }
        .rc-hero-stat { padding: 20px 22px; border-right: 1px solid rgba(255,255,255,0.12); }
        .rc-hero-stat:last-child { border-right: 0; }
        .rc-hero-stat strong { display: block; color: ${W}; font-size: 18px; font-weight: 600; margin-bottom: 5px; }
        .rc-hero-stat span { display: block; color: rgba(255,255,255,0.48); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; line-height: 1.5; }
        .rc-section { padding: clamp(68px, 9vw, 118px) 0; }
        .rc-section-head { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); gap: clamp(28px, 7vw, 84px); align-items: end; margin-bottom: clamp(36px, 6vw, 64px); }
        .rc-section h2 { margin: 14px 0 0; font-size: clamp(32px, 4.5vw, 58px); line-height: 1.03; }
        .rc-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid ${G}; border-left: 0; border-bottom: 0; }
        .rc-service { min-height: 430px; padding: 30px 24px; background: ${W}; border-left: 1px solid ${G}; border-bottom: 1px solid ${G}; display: flex; flex-direction: column; }
        .rc-service-icon { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(157,126,63,0.09); color: ${AC}; margin-bottom: 30px; }
        .rc-service-kicker { font-size: 8px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: ${AC}; margin-bottom: 9px; }
        .rc-service h3 { font-size: 19px; line-height: 1.15; margin: 0 0 16px; font-weight: 600; }
        .rc-service p { font-size: 13px; line-height: 1.75; color: rgba(0,0,0,0.55); font-weight: 300; margin: 0 0 22px; }
        .rc-service ul { margin: auto 0 0; padding: 0; list-style: none; display: grid; gap: 10px; }
        .rc-service li { display: flex; align-items: flex-start; gap: 9px; font-size: 11px; line-height: 1.5; color: rgba(0,0,0,0.64); }
        .rc-dark { background: ${B}; color: ${W}; }
        .rc-dark .rc-body { color: rgba(255,255,255,0.58); }
        .rc-process { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,0.16); border-left: 1px solid rgba(255,255,255,0.16); }
        .rc-process-card { padding: 32px 26px; border-right: 1px solid rgba(255,255,255,0.16); border-bottom: 1px solid rgba(255,255,255,0.16); min-height: 280px; }
        .rc-process-card span { color: ${ACL}; font-size: 10px; font-weight: 800; letter-spacing: 0.28em; }
        .rc-process-card h3 { color: ${W}; margin: 34px 0 14px; font-size: 20px; font-weight: 500; line-height: 1.2; }
        .rc-process-card p { color: rgba(255,255,255,0.56); font-size: 13px; line-height: 1.75; font-weight: 300; }
        .rc-highlight-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; background: ${G}; }
        .rc-highlight { background: ${W}; padding: 30px 24px; min-height: 280px; }
        .rc-highlight svg { color: ${AC}; margin-bottom: 22px; }
        .rc-highlight h3 { font-size: 16px; line-height: 1.25; margin: 0 0 12px; }
        .rc-highlight p { font-size: 13px; line-height: 1.75; color: rgba(0,0,0,0.55); font-weight: 300; }
        .rc-info-band { background: ${CR}; border-top: 1px solid ${G}; border-bottom: 1px solid ${G}; }
        .rc-info-grid { display: grid; grid-template-columns: 0.95fr 1.4fr; gap: clamp(28px, 6vw, 70px); align-items: start; }
        .rc-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .rc-list-item { display: flex; gap: 12px; background: ${W}; border: 1px solid ${G}; padding: 16px; font-size: 13px; line-height: 1.55; color: rgba(0,0,0,0.64); }
        .rc-faq-item { border-bottom: 1px solid ${G}; }
        .rc-faq-button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 21px 0; background: none; border: none; cursor: pointer; text-align: left; color: ${B}; }
        .rc-faq-button span:first-child { font-size: 15px; font-weight: 550; line-height: 1.4; }
        .rc-faq-button svg { color: ${AC}; }
        .rc-faq-answer { font-size: 14px; line-height: 1.85; color: rgba(0,0,0,0.58); padding: 0 0 22px; font-weight: 300; }
        .rc-final { background: ${B}; color: ${W}; text-align: center; padding: clamp(76px, 10vw, 132px) 0; }
        .rc-final h2 { margin: 16px auto 18px; max-width: 760px; font-size: clamp(34px, 5vw, 68px); line-height: 1.03; }
        .rc-final p { max-width: 620px; margin: 0 auto 34px; color: rgba(255,255,255,0.62); }
        @media (max-width: 1120px) {
          .rc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .rc-service { min-height: auto; }
          .rc-highlight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .rc-process { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .rc-hero { min-height: auto; align-items: flex-end; }
          .rc-hero-content { padding-top: 116px; padding-bottom: 36px; }
          .rc-cta-row { flex-direction: column; }
          .rc-btn { width: 100%; padding: 0 18px; }
          .rc-hero-panel { grid-template-columns: 1fr 1fr; }
          .rc-hero-stat { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.12); }
          .rc-hero-stat:nth-child(2) { border-right: 0; }
          .rc-section-head, .rc-info-grid { grid-template-columns: 1fr; }
          .rc-grid, .rc-highlight-grid, .rc-process, .rc-list { grid-template-columns: 1fr; }
          .rc-service, .rc-highlight, .rc-process-card { padding: 26px 20px; }
        }
      `}</style>

      <main className="rc-page">
        <section className="rc-hero">
          <video src="/herobg.mp4" autoPlay muted loop playsInline aria-hidden />
          <div className="rc-container rc-hero-content">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Link to="/services" style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontWeight: 700 }}>Services</Link>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>/</span>
                <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: ACL, fontWeight: 700 }}>Residential Construction</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Home size={20} strokeWidth={1.5} style={{ color: ACL }} />
                <span className="rc-eyebrow">Houston Residential Construction</span>
              </div>
              <h1 className="rc-serif">Residential Construction Services in Houston, TX</h1>
              <p>
                Custom homes, home renovations, additions, kitchen and bathroom remodeling, and interior or exterior upgrades
                delivered with careful planning, clear communication, and construction management for Greater Houston homes.
              </p>
              <div className="rc-cta-row">
                <Link to="/contact" className="rc-btn rc-btn-gold">
                  Schedule a Consultation <ArrowRight size={14} strokeWidth={2.4} />
                </Link>
                <a href="tel:+12819159595" className="rc-btn rc-btn-outline">
                  <Phone size={14} strokeWidth={1.7} /> Call (281) 915-9595
                </a>
              </div>
              <div className="rc-hero-panel">
                <div className="rc-hero-stat"><strong>20+ years</strong><span>Construction experience</span></div>
                <div className="rc-hero-stat"><strong>Houston</strong><span>Greater metro area</span></div>
                <div className="rc-hero-stat"><strong>Custom</strong><span>Homes, additions, remodels</span></div>
                <div className="rc-hero-stat"><strong>Managed</strong><span>Planning through closeout</span></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="rc-section" style={{ background: W }}>
          <div className="rc-container">
            <div className="rc-section-head">
              <div>
                <div className="rc-eyebrow">Residential Construction Services</div>
                <h2 className="rc-serif">Built around how your home needs to work.</h2>
              </div>
              <p className="rc-body">
                Houston Enterprise supports residential projects from early planning through final details. Each service is
                scoped around the home, the owner’s priorities, the existing conditions, and the construction requirements
                needed to move the project forward responsibly.
              </p>
            </div>
            <div className="rc-grid">
              {SERVICES.map(({ icon: Icon, title, kicker, body, bullets }, i) => (
                <motion.article
                  className="rc-service"
                  key={title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.42, delay: i * 0.04 }}
                >
                  <div className="rc-service-icon"><Icon size={18} strokeWidth={1.5} /></div>
                  <div className="rc-service-kicker">{kicker}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <ul>
                    {bullets.map(b => (
                      <li key={b}><CheckCircle2 size={14} strokeWidth={1.6} style={{ color: AC, marginTop: 2, flexShrink: 0 }} />{b}</li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="rc-section rc-dark">
          <div className="rc-container">
            <div className="rc-section-head">
              <div>
                <div className="rc-eyebrow">Construction Process</div>
                <h2 className="rc-serif">A clear path from idea to finished home.</h2>
              </div>
              <p className="rc-body">
                Residential construction works best when expectations are documented before work begins. Our process is
                designed to clarify scope, communicate constraints, coordinate trades, and keep the owner informed.
              </p>
            </div>
            <div className="rc-process">
              {PROCESS.map(step => (
                <article className="rc-process-card" key={step.label}>
                  <span>{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rc-section rc-info-band">
          <div className="rc-container">
            <div className="rc-info-grid">
              <div>
                <div className="rc-eyebrow">Project Planning</div>
                <h2 className="rc-serif" style={{ fontSize: 'clamp(32px,4.2vw,56px)', lineHeight: 1.04, margin: '14px 0 20px' }}>
                  The details that protect residential projects.
                </h2>
                <p className="rc-body">
                  A beautiful home depends on more than finishes. We pay close attention to the practical items that often
                  decide whether a project feels organized: documentation, selections, schedule, site access, permitting,
                  existing conditions, and communication.
                </p>
              </div>
              <div className="rc-list">
                {[
                  ['Scope documentation', FileText],
                  ['Schedule planning', CalendarDays],
                  ['Houston-area considerations', MapPin],
                  ['Quality checkpoints', ClipboardCheck],
                  ['Owner communication', MessageSquare],
                  ['Trade coordination', Hammer],
                ].map(([label, Icon]) => {
                  const I = Icon as typeof FileText;
                  return (
                    <div className="rc-list-item" key={label as string}>
                      <I size={17} strokeWidth={1.5} style={{ color: AC, flexShrink: 0, marginTop: 1 }} />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rc-section" style={{ background: W }}>
          <div className="rc-container">
            <div className="rc-section-head">
              <div>
                <div className="rc-eyebrow">Why Choose Houston Enterprise</div>
                <h2 className="rc-serif">Residential construction with professional oversight.</h2>
              </div>
              <p className="rc-body">
                The goal is not only to build. It is to make the process easier to understand, better documented, and more
                controlled from the first planning conversation through the final punch list.
              </p>
            </div>
            <div className="rc-highlight-grid">
              {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
                <article className="rc-highlight" key={title}>
                  <Icon size={22} strokeWidth={1.5} />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rc-section" style={{ background: CR, borderTop: `1px solid ${G}`, borderBottom: `1px solid ${G}` }}>
          <div className="rc-container">
            <div className="rc-section-head">
              <div>
                <div className="rc-eyebrow">Greater Houston Service Area</div>
                <h2 className="rc-serif">Residential construction for Houston-area homes.</h2>
              </div>
              <p className="rc-body">
                Houston Enterprise works with homeowners across the Greater Houston area. Service availability can vary by
                project scope, jurisdiction, permitting requirements, and schedule.
              </p>
            </div>
            <div className="rc-list">
              {SEO_AREAS.map(area => (
                <div className="rc-list-item" key={area}>
                  <MapPin size={16} strokeWidth={1.5} style={{ color: AC, flexShrink: 0, marginTop: 1 }} />
                  <span>{area}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rc-section" style={{ background: W }}>
          <div className="rc-container">
            <div className="rc-info-grid">
              <div>
                <div className="rc-eyebrow">Residential Construction FAQ</div>
                <h2 className="rc-serif" style={{ fontSize: 'clamp(32px,4vw,54px)', lineHeight: 1.05, margin: '14px 0 20px' }}>
                  Questions homeowners ask before they build.
                </h2>
                <p className="rc-body">
                  These answers are general information only. Final scope, schedule, cost, permits, and professional
                  requirements depend on your property and project documents.
                </p>
              </div>
              <div>
                {FAQS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
              </div>
            </div>
          </div>
        </section>

        <section className="rc-final">
          <div className="rc-container">
            <div className="rc-eyebrow">Start the Conversation</div>
            <h2 className="rc-serif">Ready to plan a residential construction project in Houston?</h2>
            <p className="rc-body">
              Tell us about the home you want to build, renovate, expand, or improve. Houston Enterprise can help you
              evaluate the next practical step.
            </p>
            <div className="rc-cta-row" style={{ justifyContent: 'center' }}>
              <Link to="/contact" className="rc-btn rc-btn-gold">
                Request a Consultation <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
              <Link to="/portfolio" className="rc-btn rc-btn-outline">
                View Portfolio <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
