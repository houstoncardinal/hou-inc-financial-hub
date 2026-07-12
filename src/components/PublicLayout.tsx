import { useState, useEffect, useRef, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu, X, ArrowUpRight, Phone, Mail, MapPin,
  Home, Building2, ClipboardList, ChevronDown, ChevronRight, Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Design tokens ─────────────────────────────────────────── */
const BLACK  = '#0A0A0A';
const WHITE  = '#FFFFFF';
const CREAM  = '#F7F5F1';
const G200   = '#E8E8E6';
const ACCENT = '#9D7E3F';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

/* ── Data ───────────────────────────────────────────────────── */
const NAV = [
  { to: '/',          label: 'Home',      end: true  },
  { to: '/services',  label: 'Services'              },
  { to: '/portfolio', label: 'Portfolio'             },
  { to: '/about',     label: 'About'                 },
  { to: '/contact',   label: 'Contact'               },
];

const FOOTER_SERVICES = [
  'Luxury Custom Homes', 'Commercial Development', 'Shopping Centers',
  'High-Rise Residential', 'Industrial & Warehouse', 'Renovation & Repositioning',
];

const FOOTER_LINKS = [
  { label: 'About Houston Enterprise', to: '/about'     },
  { label: 'Project Portfolio', to: '/portfolio' },
  { label: 'Our Services',      to: '/services'  },
  { label: 'Contact Us',        to: '/contact'   },
  { label: 'Client Portal',     to: '/portal'    },
  { label: 'Finance Hub',       to: '/finance'   },
];

/* ── Mega-menu data ─────────────────────────────────────────── */
type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
interface MegaItem { label: string; slug: string; }
interface MegaColData {
  Icon: IconType; tag: string; title: string; tagline: string; to: string; items: readonly MegaItem[];
}
const MEGA_COLS: MegaColData[] = [
  {
    Icon: Home, tag: 'Residential', title: 'Residential\nConstruction',
    tagline: 'Bespoke luxury homes built to endure generations.',
    to: '/services/residential-construction',
    items: [
      { label: 'Custom Home Build',      slug: 'custom-home-build'      },
      { label: 'Home Renovation',        slug: 'home-renovation'        },
      { label: 'Home Addition',          slug: 'home-addition'          },
      { label: 'Kitchen & Bath Upgrade', slug: 'kitchen-bath-upgrade'   },
      { label: 'Master Suite Expansion', slug: 'master-suite-expansion' },
      { label: 'Pool House & Outdoor',   slug: 'pool-house-outdoor'     },
    ],
  },
  {
    Icon: Building2, tag: 'Commercial', title: 'Commercial\nConstruction',
    tagline: 'Grade-A commercial spaces engineered to perform.',
    to: '/services/commercial-construction',
    items: [
      { label: 'Class-A Office Space',      slug: 'class-a-office'         },
      { label: 'Retail & Mixed-Use',        slug: 'retail-mixed-use'       },
      { label: 'Restaurant & Hospitality',  slug: 'restaurant-hospitality' },
      { label: 'Industrial & Logistics',    slug: 'industrial-logistics'   },
      { label: 'Healthcare & Medical',      slug: 'healthcare-medical'     },
      { label: 'Educational Facility',      slug: 'educational-facility'   },
    ],
  },
  {
    Icon: ClipboardList, tag: 'Management', title: 'Project\nManagement',
    tagline: 'End-to-end delivery with total accountability.',
    to: '/services/project-management',
    items: [
      { label: 'Pre-Construction Planning',  slug: 'pre-construction-planning'  },
      { label: 'Budget & Cost Control',      slug: 'budget-cost-control'        },
      { label: 'Schedule Management',        slug: 'schedule-management'        },
      { label: 'Subcontractor Coordination', slug: 'subcontractor-coordination' },
      { label: 'Quality Assurance',          slug: 'quality-assurance'          },
      { label: "Owner's Rep / Consulting",   slug: 'owners-rep'                 },
    ],
  },
];

/* ── Mega-menu service item ─────────────────────────────────── */
function MegaServiceItem({ label, slug }: { label: string; slug: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={`/services/${slug}`} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
        <div style={{
          width: 3, height: 3, borderRadius: '50%', flexShrink: 0,
          backgroundColor: hov ? ACCENT : 'rgba(0,0,0,0.18)',
          transition: 'background-color 0.15s',
        }} />
        <span style={{
          fontSize: 10.5, fontWeight: 400, lineHeight: 1.3,
          color: hov ? BLACK : 'rgba(0,0,0,0.52)',
          transition: 'color 0.15s',
        }}>{label}</span>
      </div>
    </Link>
  );
}

/* ── Mega-menu service pillar ───────────────────────────────── */
function MegaCard({ col, index }: { col: MegaColData; index: number }) {
  const [hov, setHov] = useState(false);
  const nums = ['01', '02', '03'];
  /* first column aligns its left edge with the header logo;
     last column aligns its right edge with the header CTA */
  const padL = index === 0 ? 'clamp(2rem, 4vw, 6rem)' : '28px';
  const padR = index === 2 ? 'clamp(2rem, 4vw, 6rem)' : '28px';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: `20px ${padR} 22px ${padL}`,
        borderLeft: index > 0 ? `1px solid ${G200}` : 'none',
        backgroundColor: hov ? CREAM : WHITE,
        transition: 'background-color 0.26s',
        cursor: 'default',
      }}>

      {/* Gold sweep bar — appears on hover, left to right */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.28) 70%, transparent 100%)`,
        transform: `scaleX(${hov ? 1 : 0})`,
        transformOrigin: 'left',
        transition: 'transform 0.36s cubic-bezier(0.22,1,0.36,1)',
      }} />

      {/* Watermark number — decorative depth */}
      <div style={{
        position: 'absolute', bottom: 10, right: 18,
        fontFamily: SERIF, fontSize: 88, fontWeight: 700, lineHeight: 1,
        color: hov ? 'rgba(157,126,63,0.065)' : 'rgba(0,0,0,0.032)',
        userSelect: 'none', pointerEvents: 'none',
        transition: 'color 0.26s',
      }}>{nums[index]}</div>

      {/* Category tag */}
      <div style={{
        fontSize: 6.5, fontWeight: 700, letterSpacing: '0.50em',
        textTransform: 'uppercase' as const,
        color: hov ? ACCENT : 'rgba(0,0,0,0.32)',
        marginBottom: 8,
        transition: 'color 0.22s',
      }}>{col.tag}</div>

      {/* Category title — the primary navigation target */}
      <Link to={col.to} style={{ textDecoration: 'none' }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: 'clamp(20px, 1.7vw, 26px)',
          fontWeight: 300, fontStyle: 'italic', lineHeight: 1.18,
          color: hov ? ACCENT : BLACK,
          marginBottom: 14,
          position: 'relative', zIndex: 1,
          transition: 'color 0.22s',
        }}>{col.title.replace('\n', ' ')}</div>
      </Link>

      {/* Animated gradient rule */}
      <div style={{
        height: 1,
        background: hov
          ? `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.10) 75%, transparent 100%)`
          : `linear-gradient(90deg, rgba(0,0,0,0.09) 0%, transparent 100%)`,
        marginBottom: 12,
        transition: 'background 0.30s',
      }} />

      {/* Service list */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {col.items.map(item => <MegaServiceItem key={item.slug} label={item.label} slug={item.slug} />)}
      </div>

      {/* "Explore" CTA — reveals on hover */}
      <Link to={col.to} style={{ textDecoration: 'none' }}>
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 5,
          opacity: hov ? 1 : 0,
          transform: hov ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s, transform 0.22s',
          position: 'relative', zIndex: 1,
        }}>
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.36em',
            textTransform: 'uppercase' as const, color: ACCENT,
          }}>Explore {col.tag}</span>
          <ArrowUpRight size={10} strokeWidth={2.5} style={{ color: ACCENT }} />
        </div>
      </Link>
    </div>
  );
}

/* ── Services mega-menu (inside <header> DOM, no hover gap) ─── */
function ServicesMegaMenu() {
  return (
    <motion.div
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        backgroundColor: WHITE, zIndex: 10, overflow: 'hidden',
        boxShadow: '0 12px 40px -4px rgba(0,0,0,0.10), 0 4px 14px -2px rgba(0,0,0,0.06)',
      }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Full-width gold rule */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.20) 50%, transparent 100%)` }} />

      {/* Header strip — label left, "View All" right */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px clamp(2rem, 4vw, 6rem) 0',
      }}>
        <span style={{
          fontSize: 6.5, fontWeight: 700, letterSpacing: '0.50em',
          textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.28)',
        }}>Select a Service</span>
        <Link to="/services" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 6.5, fontWeight: 700, letterSpacing: '0.30em',
          textTransform: 'uppercase' as const, color: ACCENT, textDecoration: 'none',
        }}>
          View All Services <ArrowUpRight size={9} strokeWidth={2.5} />
        </Link>
      </div>

      {/* Three service pillars — full bleed, padded per-card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {MEGA_COLS.map((col, i) => (
          <MegaCard key={col.tag} col={col} index={i} />
        ))}
      </div>

      {/* Credential strip */}
      <div style={{ borderTop: `1px solid ${G200}`, backgroundColor: 'rgba(0,0,0,0.014)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px clamp(2rem, 4vw, 6rem)',
        }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' as const }}>
            {['Licensed & Bonded', 'BBB A+ Accredited', 'LEED Gold Certified', 'HBJ #1 Contractor 2024'].map(c => (
              <span key={c} style={{
                fontSize: 6.5, fontWeight: 600, letterSpacing: '0.22em',
                textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.24)',
              }}>{c}</span>
            ))}
          </div>
          <Link to="/contact" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
            fontSize: 6.5, fontWeight: 900, letterSpacing: '0.28em',
            textTransform: 'uppercase' as const, textDecoration: 'none',
            padding: '6px 14px', backgroundColor: ACCENT, color: WHITE,
          }}>
            Start Your Project <ArrowUpRight size={8} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Desktop nav: standard link ─────────────────────────────── */
function HeaderLink({ n, onEnterNav }: { n: typeof NAV[number]; onEnterNav?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink to={n.to} end={n.end ?? false} className="relative"
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => { setHov(true); onEnterNav?.(); }}
      onMouseLeave={() => setHov(false)}>
      {({ isActive }) => (
        <>
          <span style={{
            display: 'block', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.27em', textTransform: 'uppercase' as const,
            paddingBottom: 4, transition: 'color 0.22s',
            color: isActive ? ACCENT : hov ? BLACK : 'rgba(0,0,0,0.46)',
          }}>{n.label}</span>
          <span style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 1.5, backgroundColor: ACCENT,
            transform: `scaleX(${isActive || hov ? 1 : 0})`,
            transformOrigin: 'left center',
            transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </>
      )}
    </NavLink>
  );
}

/* ── Desktop nav: Services trigger (chevron + opens mega menu) ─ */
function ServicesNavItem({ openMega, megaOpen }: { openMega: () => void; megaOpen: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => { setHov(true); openMega(); }} onMouseLeave={() => setHov(false)}>
      <NavLink to="/services" style={{ textDecoration: 'none' }} className="relative">
        {({ isActive }) => (
          <>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 4,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.27em',
              textTransform: 'uppercase' as const, transition: 'color 0.22s',
              color: isActive || megaOpen ? ACCENT : hov ? BLACK : 'rgba(0,0,0,0.46)',
            }}>
              Services
              <ChevronDown size={9} strokeWidth={2.5} style={{
                transform: megaOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.24s cubic-bezier(0.22,1,0.36,1)',
                color: 'inherit',
              }} />
            </span>
            <span style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 1.5, backgroundColor: ACCENT,
              transform: `scaleX(${isActive || megaOpen || hov ? 1 : 0})`,
              transformOrigin: 'left center',
              transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </>
        )}
      </NavLink>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT
══════════════════════════════════════════════════════════════ */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const [scrolled,           setScrolled]           = useState(false);
  const [open,               setOpen]               = useState(false);
  const [megaOpen,           setMegaOpen]           = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const megaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location     = useLocation();

  /* Open mega immediately, cancel any pending close */
  const openMega = () => {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setMegaOpen(true);
  };
  /* Schedule close — short delay lets cursor cross internal gaps */
  const closeMega = () => {
    megaTimerRef.current = setTimeout(() => setMegaOpen(false), 120);
  };
  /* Instant close used when cursor enters a non-Services nav item */
  const closeMegaNow = () => {
    if (megaTimerRef.current) clearTimeout(megaTimerRef.current);
    setMegaOpen(false);
  };

  useEffect(() => {
    const fn = () => { setScrolled(window.scrollY > 10); };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Close mega on scroll */
  useEffect(() => {
    const fn = () => setMegaOpen(false);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setOpen(false); setMegaOpen(false); setMobileServicesOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => () => { if (megaTimerRef.current) clearTimeout(megaTimerRef.current); }, []);

  return (
    <div style={{ backgroundColor: WHITE, color: BLACK, minHeight: '100vh' }}>

      {/* ════════════════════════════════════════
          HEADER — mega menu lives inside here.
          overflow:visible lets the absolute-
          positioned panel extend below without
          clipping, and keeps the entire area
          one contiguous hover zone.
      ════════════════════════════════════════ */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: 72,
          display: 'flex', alignItems: 'center',
          backgroundColor: WHITE,
          borderTop: `2px solid ${ACCENT}`,
          borderBottom: `1px solid ${G200}`,
          boxShadow: scrolled ? '0 2px 48px rgba(0,0,0,0.08)' : 'none',
          transition: 'box-shadow 0.3s ease',
          overflow: 'visible',       /* ← lets mega menu extend below */
        }}
        /* onMouseLeave fires only when cursor leaves BOTH the
           header box AND the overflowing mega panel beneath it */
        onMouseLeave={closeMega}
      >
        <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 flex items-center">

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 2, height: 26, background: `linear-gradient(to bottom, ${ACCENT}, rgba(157,126,63,0.15))`, flexShrink: 0 }} />
            <motion.div whileHover={{ x: 1 }} transition={{ duration: 0.18 }}>
              <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: BLACK, lineHeight: 1.1 }}>
                Houston
              </div>
              <div style={{ fontSize: 5.5, fontWeight: 700, letterSpacing: '0.52em', textTransform: 'uppercase', color: ACCENT, marginTop: 2, lineHeight: 1 }}>
                Enterprise
              </div>
            </motion.div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'none', flex: 1, justifyContent: 'center', gap: 36, alignItems: 'center' }}
            className="md:!flex">
            {NAV.map(n =>
              n.label === 'Services'
                ? <ServicesNavItem key={n.to} openMega={openMega} megaOpen={megaOpen} />
                : <HeaderLink key={n.to} n={n} onEnterNav={closeMegaNow} />
            )}
          </nav>

          {/* Desktop right */}
          <div style={{ display: 'none', alignItems: 'center', gap: 20, flexShrink: 0 }} className="md:!flex">
            <a href="tel:+12819159595" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', textDecoration: 'none',
              color: 'rgba(0,0,0,0.46)', transition: 'color 0.22s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = BLACK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(0,0,0,0.46)'; }}>
              <Phone size={11} strokeWidth={1.8} /> (281) 915-9595
            </a>
            <div style={{ width: 1, height: 18, backgroundColor: G200 }} />
            <Link to="/portal" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', fontSize: 8, fontWeight: 900, letterSpacing: '0.3em',
              textTransform: 'uppercase', textDecoration: 'none',
              backgroundColor: ACCENT, color: WHITE, transition: 'background-color 0.22s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#7d6432'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ACCENT; }}>
              Client Portal <ArrowUpRight size={12} strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div style={{ marginLeft: 'auto' }} className="md:hidden">
            <motion.button onClick={() => setOpen(o => !o)} whileTap={{ scale: 0.86 }}
              style={{ padding: 6, color: BLACK, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <Menu size={22} strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>

        {/* ── Mega menu — absolute child of fixed header ───────── */}
        {/* This is the key architecture: being a DOM child of the  */}
        {/* header means no hover gap between trigger and panel.    */}
        <AnimatePresence>
          {megaOpen && <ServicesMegaMenu />}
        </AnimatePresence>

      </header>

      {/* ════════════════════════════════════════
          MOBILE MENU — LUXURY DRAWER
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              display: 'flex', flexDirection: 'column',
              overflowX: 'hidden',
              backgroundColor: BLACK,  /* fills any gap on tall devices */
            }}
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >

            {/* ── Top bar — white, matches header exactly ── */}
            <div style={{
              backgroundColor: WHITE, flexShrink: 0,
              borderTop: `2px solid ${ACCENT}`,
              borderBottom: `1px solid rgba(0,0,0,0.07)`,
              height: 72,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 24px',
            }}>
              <Link to="/" onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
                <div style={{ width: 2, height: 24, background: `linear-gradient(to bottom, ${ACCENT}, rgba(157,126,63,0.15))`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: BLACK, lineHeight: 1.1 }}>Houston</div>
                  <div style={{ fontSize: 5.5, fontWeight: 700, letterSpacing: '0.52em', textTransform: 'uppercase', color: ACCENT, marginTop: 2, lineHeight: 1 }}>Enterprise</div>
                </div>
              </Link>
              <motion.button onClick={() => setOpen(false)} whileTap={{ scale: 0.85 }}
                style={{
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: `1px solid rgba(0,0,0,0.10)`, cursor: 'pointer', color: BLACK,
                }}>
                <X size={18} strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* ── Nav links — cream background, grows to fill space ── */}
            <div style={{ backgroundColor: CREAM, flex: '1 1 auto', overflowY: 'auto', padding: '4px 0 0' }}>
              {NAV.map((n, i) => {
                const isServices = n.label === 'Services';
                return (
                  <motion.div key={n.to}
                    initial={{ opacity: 0, x: 32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ delay: 0.05 + i * 0.045, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}>

                    {isServices ? (
                      <div>
                        {/* Services row */}
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          borderBottom: mobileServicesOpen ? 'none' : `1px solid rgba(0,0,0,0.06)`,
                        }}>
                          <NavLink to="/services" end={false} onClick={() => setOpen(false)}
                            style={{ textDecoration: 'none', flex: 1 }}>
                            {({ isActive }) => (
                              <div style={{
                                display: 'flex', alignItems: 'center',
                                padding: '14px 0 14px 20px',
                                borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                                transition: 'border-color 0.22s',
                              }}>
                                <span style={{
                                  fontFamily: SERIF,
                                  fontSize: 'clamp(32px, 7.5vw, 50px)',
                                  fontWeight: 300, fontStyle: 'italic', lineHeight: 1.15,
                                  color: isActive ? ACCENT : 'rgba(0,0,0,0.78)',
                                  transition: 'color 0.22s',
                                }}>Services</span>
                              </div>
                            )}
                          </NavLink>
                          <motion.button
                            onClick={() => setMobileServicesOpen(o => !o)}
                            whileTap={{ scale: 0.88 }}
                            style={{
                              width: 44, height: 44, flexShrink: 0, marginRight: 20,
                              border: `1px solid rgba(0,0,0,0.12)`, backgroundColor: mobileServicesOpen ? 'rgba(157,126,63,0.08)' : 'transparent',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background-color 0.2s',
                            }}>
                            <motion.div
                              animate={{ rotate: mobileServicesOpen ? 45 : 0 }}
                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                              <Plus size={14} strokeWidth={1.8} style={{ color: mobileServicesOpen ? ACCENT : 'rgba(0,0,0,0.40)' }} />
                            </motion.div>
                          </motion.button>
                        </div>

                        {/* Services accordion */}
                        <AnimatePresence>
                          {mobileServicesOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
                              style={{ overflow: 'hidden' }}>
                              <div style={{
                                margin: '0 20px 0 22px',
                                borderLeft: `2px solid rgba(157,126,63,0.28)`,
                                paddingLeft: 18, paddingBottom: 12,
                              }}>
                                {MEGA_COLS.map((cat, ci) => (
                                  <motion.div key={cat.tag}
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: ci * 0.06, duration: 0.26 }}>
                                    <Link to={cat.to} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                                      <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '11px 12px 11px 0',
                                        borderBottom: ci < 2 ? `1px solid rgba(0,0,0,0.05)` : 'none',
                                      }}>
                                        <div>
                                          <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.40em', textTransform: 'uppercase' as const, color: ACCENT, marginBottom: 2 }}>
                                            {cat.tag}
                                          </div>
                                          <div style={{ fontSize: 14, fontWeight: 400, color: 'rgba(0,0,0,0.62)', letterSpacing: '0.01em' }}>
                                            {cat.title.replace('\n', ' ')}
                                          </div>
                                        </div>
                                        <ChevronRight size={13} strokeWidth={1.5} style={{ color: 'rgba(0,0,0,0.22)', flexShrink: 0 }} />
                                      </div>
                                    </Link>
                                  </motion.div>
                                ))}
                              </div>
                              <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', margin: '0 0 0 0' }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <NavLink to={n.to} end={n.end ?? false} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                        {({ isActive }) => (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px 14px 20px',
                            borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
                            borderBottom: `1px solid rgba(0,0,0,0.06)`,
                            transition: 'border-color 0.22s',
                          }}>
                            <span style={{
                              fontFamily: SERIF,
                              fontSize: 'clamp(32px, 7.5vw, 50px)',
                              fontWeight: 300, fontStyle: 'italic', lineHeight: 1.15,
                              color: isActive ? ACCENT : 'rgba(0,0,0,0.78)',
                              transition: 'color 0.22s',
                            }}>{n.label}</span>
                            <ArrowUpRight size={16} strokeWidth={1.2}
                              style={{ color: isActive ? ACCENT : 'rgba(0,0,0,0.16)', flexShrink: 0 }} />
                          </div>
                        )}
                      </NavLink>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── Gold gradient separator ── */}
            <motion.div
              style={{ height: 2, background: `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.20) 65%, transparent 100%)`, flexShrink: 0, transformOrigin: 'left' }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ delay: 0.32, duration: 0.42, ease: [0.22, 1, 0.36, 1] }} />

            {/* ── Quick Access — dark section ── */}
            <motion.div
              style={{ backgroundColor: BLACK, flexShrink: 0 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.30, duration: 0.32 }}>

              {/* Section label */}
              <div style={{ padding: '18px 24px 10px' }}>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.48em', textTransform: 'uppercase' as const, color: ACCENT }}>
                  Quick Access
                </span>
              </div>

              {/* Quick-access rows */}
              {[
                {
                  to: '/portal', label: 'Client Portal',
                  desc: 'Sign in to your project dashboard',
                  accent: true,
                },
                {
                  to: '/contact', label: 'Start a Project',
                  desc: 'Free consultation & estimate',
                  accent: false,
                },
                {
                  to: '/portfolio', label: 'View Portfolio',
                  desc: 'Explore completed landmark projects',
                  accent: false,
                },
              ].map((item, i) => (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                  <motion.div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderTop: `1px solid rgba(255,255,255,0.07)`,
                    }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    transition={{ duration: 0.18 }}>
                    <div>
                      <div style={{
                        fontSize: 15, fontWeight: 600, letterSpacing: '0.01em',
                        color: item.accent ? ACCENT : WHITE,
                        marginBottom: 3,
                      }}>{item.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.02em' }}>
                        {item.desc}
                      </div>
                    </div>
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, marginLeft: 16,
                      backgroundColor: item.accent ? 'rgba(157,126,63,0.18)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ArrowUpRight size={15} strokeWidth={1.8} style={{ color: item.accent ? ACCENT : 'rgba(255,255,255,0.50)' }} />
                    </div>
                  </motion.div>
                </Link>
              ))}

              {/* Contact strip */}
              <div style={{
                borderTop: `1px solid rgba(255,255,255,0.07)`,
                padding: '14px 24px',
                display: 'flex', gap: 0, flexDirection: 'column' as const,
              }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>
                  Contact
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px 24px' }}>
                  <a href="tel:+12819159595" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    textDecoration: 'none', color: 'rgba(255,255,255,0.55)',
                    fontSize: 12, fontWeight: 500, letterSpacing: '0.02em',
                  }}>
                    <Phone size={12} strokeWidth={1.5} style={{ color: ACCENT }} />
                    (281) 915-9595
                  </a>
                  <a href="mailto:info@houinc.com" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    textDecoration: 'none', color: 'rgba(255,255,255,0.55)',
                    fontSize: 12, fontWeight: 500, letterSpacing: '0.02em',
                  }}>
                    <Mail size={12} strokeWidth={1.5} style={{ color: ACCENT }} />
                    Info@HouInc.com
                  </a>
                </div>
              </div>

              {/* Bottom wordmark */}
              <div style={{
                borderTop: `1px solid rgba(255,255,255,0.05)`,
                padding: '10px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 7.5, fontWeight: 300, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.18)' }}>
                  Houston Enterprise · Est. 1998
                </span>
                <span style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(157,126,63,0.45)' }}>
                  Houston, TX
                </span>
              </div>

            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          PAGE CONTENT
      ════════════════════════════════════════ */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer style={{ backgroundColor: WHITE }}>

        <div style={{ height: 2, background: `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.25) 55%, transparent 100%)` }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-8 lg:gap-12">

            {/* Brand + contact */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-start gap-3 mb-5">
                <div style={{ width: 2, height: 40, background: `linear-gradient(to bottom, ${ACCENT}, transparent)`, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: BLACK, letterSpacing: '0.06em', textTransform: 'uppercase' as const, lineHeight: 1 }}>Houston Enterprise</div>
                  <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACCENT, marginTop: 5 }}>Construction · Houston</div>
                </div>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.85, fontWeight: 300, color: 'rgba(0,0,0,0.44)', marginBottom: 14 }}>
                Landmark residential and commercial construction across Greater Houston since 1998.
              </p>
              <div className="space-y-2 mb-6">
                {[
                  { Icon: Phone,  val: '(281) 915-9595',            href: 'tel:+12819159595'       },
                  { Icon: Mail,   val: 'Info@HouInc.com',           href: 'mailto:info@houinc.com' },
                  { Icon: MapPin, val: '206 Brooks St · Sugar Land', href: undefined               },
                ].map(({ Icon, val, href }) => (
                  <div key={val} className="flex items-center gap-2">
                    <Icon className="w-3 h-3 shrink-0" style={{ color: ACCENT }} strokeWidth={1.5} />
                    {href
                      ? <a href={href} className="transition-colors" style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,0,0,0.55)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.55)')}>{val}</a>
                      : <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,0,0,0.55)' }}>{val}</span>
                    }
                  </div>
                ))}
              </div>
              <Link to="/contact"
                className="relative overflow-hidden group inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.30em] font-black px-6 py-3"
                style={{ backgroundColor: BLACK, color: WHITE }}>
                <motion.div className="absolute inset-0 origin-left" style={{ backgroundColor: ACCENT }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
                <span className="relative z-10">Start Your Project</span>
                <ArrowUpRight className="relative z-10 w-3 h-3" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Services */}
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${G200}` }}>Services</div>
              {FOOTER_SERVICES.map(s => (
                <Link key={s} to="/services" className="block py-1 transition-colors"
                  style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,0,0,0.50)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = BLACK)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.50)')}>
                  {s}
                </Link>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${G200}` }}>Company</div>
              {FOOTER_LINKS.map(l => (
                <Link key={l.label} to={l.to} className="block py-1 transition-colors"
                  style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,0,0,0.50)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = BLACK)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.50)')}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Recognition */}
            <div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 10, marginBottom: 12, borderBottom: `1px solid ${G200}` }}>Recognition</div>
              <div className="space-y-4">
                {[
                  { title: 'HBJ #1 Luxury Contractor', sub: '2022 · 2023 · 2024'            },
                  { title: 'BBB Accredited A+',         sub: '20+ Year Accreditation'        },
                  { title: 'AGC Houston Member',        sub: 'Associated General Contractors' },
                  { title: 'LEED Gold Certified',       sub: 'Sustainable Construction'      },
                ].map(a => (
                  <div key={a.title} className="flex items-start gap-2.5">
                    <div style={{ width: 12, height: 1, backgroundColor: ACCENT, marginTop: 7, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.68)' }}>{a.title}</div>
                      <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.28)', marginTop: 2 }}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div style={{ borderTop: `1px solid ${G200}` }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
            <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.22em', color: 'rgba(0,0,0,0.24)' }}>
              © {new Date().getFullYear()} Houston Enterprise · All Rights Reserved · Houston, Texas
            </div>
            <div className="flex items-center gap-5">
              {['Privacy Policy', 'Terms of Service', 'Accessibility'].map(l => (
                <span key={l} className="cursor-pointer"
                  style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.24)' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(0,0,0,0.55)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(0,0,0,0.24)')}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>

      </footer>
    </div>
  );
}
