import { useState, useEffect, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Design tokens ───────────────────────────────────────────────── */
const BLACK  = '#0A0A0A';
const WHITE  = '#FFFFFF';
const G200   = '#E8E8E6';
const G400   = '#9A9A9A';
const ACCENT = '#9D7E3F';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const NAV = [
  { to: '/',          label: 'Home',      end: true  },
  { to: '/services',  label: 'Services'              },
  { to: '/portfolio', label: 'Portfolio'             },
  { to: '/about',     label: 'About'                 },
  { to: '/contact',   label: 'Contact'               },
];

const FOOTER_SERVICES = [
  'Luxury Custom Homes',
  'Commercial Development',
  'Shopping Centers',
  'High-Rise Residential',
  'Industrial & Warehouse',
  'Renovation & Repositioning',
];

const FOOTER_LINKS = [
  { label: 'About HOU INC',     to: '/about'     },
  { label: 'Project Portfolio',  to: '/portfolio' },
  { label: 'Our Services',       to: '/services'  },
  { label: 'Contact Us',         to: '/contact'   },
  { label: 'Client Portal',      to: '/portal'    },
  { label: 'Finance Hub',        to: '/finance'   },
];

/* ── Desktop nav link (hover-aware with sweep underline) ─────────── */
function HeaderLink({ n }: { n: typeof NAV[0] }) {
  const [hov, setHov] = useState(false);
  return (
    <NavLink
      to={n.to}
      end={n.end ?? false}
      className="relative"
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {({ isActive }) => (
        <>
          <span style={{
            display:       'block',
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.27em',
            textTransform: 'uppercase',
            paddingBottom: 4,
            transition:    'color 0.22s',
            color: isActive ? ACCENT : hov ? BLACK : 'rgba(0,0,0,0.46)',
          }}>
            {n.label}
          </span>
          <span style={{
            position:        'absolute',
            bottom:          0,
            left:            0,
            right:           0,
            height:          1.5,
            backgroundColor: ACCENT,
            transform:       `scaleX(${isActive || hov ? 1 : 0})`,
            transformOrigin: 'left center',
            transition:      'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </>
      )}
    </NavLink>
  );
}

/* ── Layout ──────────────────────────────────────────────────────── */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);
  const location                = useLocation();

  /* scroll detection */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* close menu + scroll-to-top on route change */
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  /* lock body scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div style={{ backgroundColor: WHITE, color: BLACK, minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header style={{
        position:        'fixed',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          50,
        height:          72,
        display:         'flex',
        alignItems:      'center',
        backgroundColor: WHITE,
        borderTop:       `2px solid ${ACCENT}`,
        borderBottom:    `1px solid ${G200}`,
        boxShadow:       scrolled ? '0 2px 48px rgba(0,0,0,0.08)' : 'none',
        transition:      'box-shadow 0.3s ease',
      }}>
        <div className="w-full px-8 md:px-14 lg:px-24 flex items-center" style={{ gap: 0 }}>

          {/* ── Logo ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0 }}>
            <motion.div
              style={{ width: 36, height: 36, backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              whileHover={{ scale: 0.9 }} transition={{ duration: 0.18 }}>
              <span style={{ color: WHITE, fontSize: 15, fontFamily: SERIF, fontWeight: 700, fontStyle: 'italic', lineHeight: 1, userSelect: 'none' }}>H</span>
            </motion.div>
            <div>
              <div style={{
                fontSize: 12, fontWeight: 900, letterSpacing: '0.32em', textTransform: 'uppercase',
                fontFamily: SERIF, lineHeight: 1.1,
                color:      BLACK,
              }}>HOU INC</div>
              <div style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: '0.38em', textTransform: 'uppercase', color: ACCENT, marginTop: 2 }}>
                Construction · Houston
              </div>
            </div>
          </Link>

          {/* ── Desktop center nav ── */}
          <nav style={{ display: 'none', flex: 1, justifyContent: 'center', gap: 36, alignItems: 'center' }}
            className="md:!flex">
            {NAV.map(n => <HeaderLink key={n.to} n={n} />)}
          </nav>

          {/* ── Desktop right: phone + CTA ── */}
          <div style={{ display: 'none', alignItems: 'center', gap: 20, flexShrink: 0 }}
            className="md:!flex">

            {/* Phone */}
            <a href="tel:+12819159595" style={{
              display:       'flex',
              alignItems:    'center',
              gap:           6,
              fontSize:      8.5,
              fontWeight:    700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              textDecoration:'none',
              color: 'rgba(0,0,0,0.46)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = BLACK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(0,0,0,0.46)'; }}>
              <Phone size={11} strokeWidth={1.8} />
              (281) 915-9595
            </a>

            {/* Divider */}
            <div style={{ width: 1, height: 18, backgroundColor: G200 }} />

            {/* Portal CTA */}
            <Link to="/portal" style={{
              display:       'flex',
              alignItems:    'center',
              gap:           6,
              padding:       '10px 22px',
              fontSize:      8,
              fontWeight:    900,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              textDecoration:'none',
              backgroundColor: ACCENT,
              color:           WHITE,
              transition:      'background-color 0.22s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#7d6432'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ACCENT; }}>
              Client Portal
              <ArrowUpRight size={12} strokeWidth={2.5} />
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <div style={{ marginLeft: 'auto' }} className="md:hidden">
            <motion.button
              onClick={() => setOpen(o => !o)}
              whileTap={{ scale: 0.86 }}
              style={{ padding: 6, color: BLACK, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <Menu size={22} strokeWidth={1.5} />
            </motion.button>
          </div>

        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE FULL-SCREEN MENU
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-overlay"
            style={{
              position:        'fixed',
              inset:           0,
              zIndex:          200,
              backgroundColor: BLACK,
              display:         'flex',
              flexDirection:   'column',
              overflowY:       'auto',
            }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -16 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >

            {/* Top bar */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '0 28px',
              height:         72,
              borderBottom:   '1px solid rgba(255,255,255,0.07)',
              flexShrink:     0,
            }}>
              <Link to="/" onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
                <div style={{ width: 34, height: 34, backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: WHITE, fontSize: 14, fontFamily: SERIF, fontWeight: 700, fontStyle: 'italic', userSelect: 'none' }}>H</span>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: SERIF, color: WHITE, lineHeight: 1.1 }}>
                    HOU INC
                  </div>
                  <div style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: '0.36em', textTransform: 'uppercase', color: ACCENT, marginTop: 2 }}>
                    Construction · Houston
                  </div>
                </div>
              </Link>
              <motion.button onClick={() => setOpen(false)} whileTap={{ scale: 0.85 }}
                style={{ padding: 6, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={22} strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Nav links — large serif italic */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 28px 0' }}>
              {NAV.map((n, i) => (
                <motion.div key={n.to}
                  initial={{ opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: 0.08 + i * 0.055, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
                  <NavLink
                    to={n.to}
                    end={n.end ?? false}
                    onClick={() => setOpen(false)}
                    style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <div style={{
                        fontFamily:    SERIF,
                        fontSize:      'clamp(40px, 9vw, 60px)',
                        fontWeight:    300,
                        fontStyle:     'italic',
                        lineHeight:    1.14,
                        padding:       '10px 0',
                        borderBottom:  '1px solid rgba(255,255,255,0.06)',
                        color:          isActive ? ACCENT : 'rgba(255,255,255,0.78)',
                        display:       'flex',
                        alignItems:    'center',
                        justifyContent:'space-between',
                        transition:    'color 0.2s',
                      }}>
                        {n.label}
                        <ArrowUpRight size={16} strokeWidth={1} style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.2)', flexShrink: 0, marginLeft: 12 }} />
                      </div>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>

            {/* Contact + CTAs at bottom */}
            <motion.div
              style={{ padding: '24px 28px 32px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}>

              {/* Contact row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 28px', marginBottom: 18 }}>
                <a href="tel:+12819159595" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.52)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  <Phone size={11} strokeWidth={1.5} style={{ color: ACCENT }} />
                  (281) 915-9595
                </a>
                <a href="mailto:info@houinc.com" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', color: 'rgba(255,255,255,0.52)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  <Mail size={11} strokeWidth={1.5} style={{ color: ACCENT }} />
                  Info@houinc.com
                </a>
              </div>

              {/* CTA row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/contact" onClick={() => setOpen(false)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '15px 0', backgroundColor: ACCENT, color: WHITE,
                  fontSize: 8.5, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  Start Your Project <ArrowUpRight size={13} strokeWidth={2.5} />
                </Link>
                <Link to="/portal" onClick={() => setOpen(false)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '15px 0', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.68)',
                  fontSize: 8.5, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  Client Portal <ArrowUpRight size={13} strokeWidth={2} />
                </Link>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          PAGE CONTENT
      ══════════════════════════════════════════ */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{ backgroundColor: WHITE }}>

        {/* Top gold accent rule */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${ACCENT} 0%, rgba(157,126,63,0.28) 50%, transparent 100%)` }} />

        {/* ── Upper: Brand + Contact ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 md:pt-20 pb-14 md:pb-16"
          style={{ borderBottom: `1px solid ${G200}` }}>
          <div className="grid lg:grid-cols-[360px_1fr] gap-14 lg:gap-24">

            {/* Brand block */}
            <div className="flex flex-col justify-between gap-10">
              <div>
                {/* Wordmark */}
                <div className="flex items-start gap-4 mb-7">
                  <div style={{ width: 2, height: 52, background: `linear-gradient(to bottom, ${ACCENT} 0%, transparent 100%)`, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 30, color: BLACK, letterSpacing: '0.05em', textTransform: 'uppercase' as const, lineHeight: 1 }}>
                      HOU INC
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase' as const, color: ACCENT, marginTop: 6 }}>
                      Construction · Houston, Texas
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.92, fontWeight: 300, color: 'rgba(0,0,0,0.46)', maxWidth: '30ch' }}>
                  Landmark construction across Greater Houston since 1998 — built on 25 years of integrity, craftsmanship, and results that endure.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 1, width: 24, backgroundColor: ACCENT, flexShrink: 0 }} />
                <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.38em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.28)' }}>
                  Est. 1998 · Licensed & Bonded · BBB A+
                </span>
              </div>
            </div>

            {/* Contact + CTA */}
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.46em', textTransform: 'uppercase' as const, color: ACCENT, marginBottom: 22 }}>
                Reach Us
              </div>
              <div className="grid sm:grid-cols-3 gap-8 mb-10">
                {[
                  { icon: Phone,  tag: 'Call',  val: '(281) 915-9595',      hint: 'Mon – Fri · 8am – 6pm CT', href: 'tel:+12819159595'      },
                  { icon: Mail,   tag: 'Email', val: 'Info@Houinc.com',      hint: 'Response within 24 hours',  href: 'mailto:info@houinc.com'},
                  { icon: MapPin, tag: 'Visit', val: '2100 W Loop South\nSuite #1115\nHouston, TX 77027', hint: 'By appointment', href: undefined },
                ].map(({ icon: Icon, tag, val, hint, href }) => (
                  <div key={tag}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: ACCENT }} strokeWidth={1.5} />
                      <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACCENT }}>{tag}</span>
                    </div>
                    {href
                      ? <a href={href} className="block transition-colors"
                          style={{ fontSize: 13, fontWeight: 500, color: BLACK, lineHeight: 1.5, whiteSpace: 'pre-line' as const }}
                          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                          onMouseLeave={e => (e.currentTarget.style.color = BLACK)}>{val}</a>
                      : <div style={{ fontSize: 13, fontWeight: 500, color: BLACK, lineHeight: 1.5, whiteSpace: 'pre-line' as const }}>{val}</div>
                    }
                    <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.30)', marginTop: 5, fontWeight: 300 }}>{hint}</div>
                  </div>
                ))}
              </div>
              {/* CTA */}
              <Link to="/contact"
                className="relative overflow-hidden group inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] font-black px-9 py-4"
                style={{ backgroundColor: BLACK, color: WHITE }}>
                <motion.div className="absolute inset-0 origin-left" style={{ backgroundColor: ACCENT }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }} />
                <span className="relative z-10">Start Your Project</span>
                <ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
            </div>

          </div>
        </div>

        {/* ── Navigation grid ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16">

            {/* Services */}
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${G200}` }}>
                Services
              </div>
              {FOOTER_SERVICES.map(s => (
                <Link key={s} to="/services"
                  className="block py-1.5 transition-colors"
                  style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0,0,0,0.52)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = BLACK)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.52)')}>
                  {s}
                </Link>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${G200}` }}>
                Company
              </div>
              {FOOTER_LINKS.map(l => (
                <Link key={l.label} to={l.to}
                  className="block py-1.5 transition-colors"
                  style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0,0,0,0.52)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = BLACK)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.52)')}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Recognition — spans 2 cols on md+ */}
            <div className="col-span-2">
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase' as const, color: ACCENT, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${G200}` }}>
                Recognition & Accreditation
              </div>
              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-5">
                {[
                  { title: 'HBJ #1 Luxury Contractor', sub: '2022 · 2023 · 2024'            },
                  { title: 'BBB Accredited A+',         sub: '20+ Year Accreditation'        },
                  { title: 'AGC Houston Member',        sub: 'Associated General Contractors' },
                  { title: 'LEED Gold Certified',       sub: 'Sustainable Construction'      },
                ].map(a => (
                  <div key={a.title} className="flex items-start gap-3">
                    <div style={{ width: 16, height: 1, backgroundColor: ACCENT, marginTop: 8, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.72)', lineHeight: 1.3 }}>{a.title}</div>
                      <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.30)', marginTop: 3 }}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{ borderTop: `1px solid ${G200}` }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <div style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.24em', color: 'rgba(0,0,0,0.26)' }}>
              © {new Date().getFullYear()} HOU INC Construction · All Rights Reserved · Houston, Texas
            </div>
            <div className="flex items-center gap-6">
              {['Privacy Policy', 'Terms of Service', 'Accessibility'].map(l => (
                <span key={l} className="cursor-pointer transition-colors"
                  style={{ fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.26)' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(0,0,0,0.60)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(0,0,0,0.26)')}>
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
