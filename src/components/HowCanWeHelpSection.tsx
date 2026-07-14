import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, ClipboardList, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Tokens ─────────────────────────────────────────────────────── */
const B   = '#0A0A0A';
const W   = '#FFFFFF';
const G200 = '#E5DFD6';
const G500 = '#8A8480';
const AC  = '#9D7E3F';
const ACL = '#C4A76B';
const SF  = "'Cormorant Garamond', Georgia, serif";

/* ── Card data ──────────────────────────────────────────────────── */
const SERVICES = [
  {
    key: 'residential',
    num: '01',
    Icon: Home,
    title: 'Residential',
    subtitle: 'Construction',
    tagline: 'Custom homes, masterwork renovations, and additions crafted for Houston\'s finest neighborhoods.',
    to: '/services/residential-construction',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=90',
    features: ['Custom Home Builds', 'Full Renovations', 'Kitchen & Bath', 'Additions'],
  },
  {
    key: 'commercial',
    num: '02',
    Icon: Building2,
    title: 'Commercial',
    subtitle: 'Construction',
    tagline: 'Grade-A office towers, retail centers, and mixed-use developments delivered on time and on budget.',
    to: '/services/commercial-construction',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=90',
    features: ['Office & Mixed-Use', 'Retail & Hospitality', 'Industrial Builds', 'Ground-Up Development'],
  },
  {
    key: 'project_management',
    num: '03',
    Icon: ClipboardList,
    title: 'Project',
    subtitle: 'Management',
    tagline: 'End-to-end oversight, expert coordination, and absolute accountability on every build — large or small.',
    to: '/services/project-management',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=90',
    features: ['Full PM Services', 'Budget Control', 'Subcontractor Coordination', 'Crisis Recovery'],
  },
] as const;

/* ── Eyebrow ────────────────────────────────────────────────────── */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 32, height: 1, backgroundColor: AC, flexShrink: 0 }} />
      <span style={{ color: AC, fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

/* ── Service Card ───────────────────────────────────────────────── */
function ServiceCard({ svc }: { svc: typeof SERVICES[number] }) {
  const [hov, setHov] = useState(false);

  return (
    <Link
      to={svc.to}
      aria-label={`Explore ${svc.title} ${svc.subtitle}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        minHeight: 420,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '36px 32px',
        textDecoration: 'none',
        cursor: 'pointer',
        backgroundColor: '#0C0B09',
      }}
    >
      {/* Background image — subtle ken-burns on hover */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{ scale: hov ? 1.07 : 1.0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={svc.image}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </motion.div>

      {/* Gradient layers */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,6,4,0.97) 0%, rgba(8,6,4,0.80) 42%, rgba(8,6,4,0.44) 68%, rgba(8,6,4,0.18) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,6,4,0.28) 0%, transparent 32%)' }} />

      {/* Gold top bar — slides in on hover */}
      <motion.div
        animate={{ scaleX: hov ? 1 : 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(to right, ${AC}, ${ACL})`,
          transformOrigin: 'left', zIndex: 4,
        }}
      />

      {/* Number — top-left */}
      <div style={{
        position: 'absolute', top: 28, left: 32, zIndex: 3,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.38em', textTransform: 'uppercase',
        color: hov ? ACL : 'rgba(255,255,255,0.22)',
        transition: 'color 0.3s ease',
      }}>
        {svc.num}
      </div>

      {/* Content block */}
      <div style={{ position: 'relative', zIndex: 3 }}>

        {/* Icon */}
        <svc.Icon
          style={{
            width: 22, height: 22, marginBottom: 14,
            color: hov ? ACL : 'rgba(255,255,255,0.28)',
            transition: 'color 0.26s ease',
          }}
          strokeWidth={1.5}
        />

        {/* Title */}
        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 2.8vw, 38px)', color: W, lineHeight: 1.0, marginBottom: 4 }}>
          {svc.title}
        </div>
        <div style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(13px, 1.3vw, 17px)', color: ACL, lineHeight: 1.0, marginBottom: 16, letterSpacing: '0.06em' }}>
          {svc.subtitle}
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)', lineHeight: 1.72, marginBottom: 20, fontWeight: 300, maxWidth: '30ch' }}>
          {svc.tagline}
        </p>

        {/* Feature chips — fade in on hover */}
        <motion.div
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22, pointerEvents: hov ? 'auto' : 'none' }}
        >
          {svc.features.map(f => (
            <span key={f} style={{
              fontSize: 8, padding: '4px 10px',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              border: `1px solid ${AC}38`,
              color: ACL, fontWeight: 600,
              backgroundColor: 'rgba(157,126,63,0.09)',
            }}>
              {f}
            </span>
          ))}
        </motion.div>

        {/* Explore link row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={{ width: hov ? 28 : 14, backgroundColor: hov ? AC : 'rgba(255,255,255,0.25)' }}
            transition={{ duration: 0.32 }}
            style={{ height: 1, flexShrink: 0 }}
          />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: hov ? ACL : 'rgba(255,255,255,0.3)',
            transition: 'color 0.25s ease',
          }}>
            Explore Services
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Main Export ────────────────────────────────────────────────── */
export default function HowCanWeHelpSection() {
  return (
    <section style={{ backgroundColor: W, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-7xl mx-auto px-8 md:px-14">

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <SectionEyebrow>Our Services</SectionEyebrow>
          <h2 style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(30px, 4vw, 52px)', color: B,
            lineHeight: 1.06, maxWidth: 480,
          }}>
            How can we<br />help you?
          </h2>
        </div>

        {/* 3-column card grid — gap-px creates 1px separators from parent bg */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px"
          style={{ border: `1px solid ${G200}`, backgroundColor: G200 }}
        >
          {SERVICES.map(svc => (
            <ServiceCard key={svc.key} svc={svc} />
          ))}
        </div>

        {/* Bottom CTA row */}
        <div style={{
          marginTop: 32,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 12, color: G500, fontWeight: 300, lineHeight: 1.65, maxWidth: '52ch' }}>
            Not sure where to start? Contact our team for a complimentary consultation — we'll guide you to the right path for your project.
          </p>
          <Link
            to="/contact"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 26px', backgroundColor: B, color: W,
              textDecoration: 'none', fontSize: 10,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              fontWeight: 800, flexShrink: 0,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = AC; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = B; }}
          >
            Start Your Project
            <ArrowRight style={{ width: 13, height: 13 }} strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </section>
  );
}
