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
      <footer style={{ backgroundColor: BLACK }}>

        {/* CTA band */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 md:py-20">
            <div className="grid md:grid-cols-2 gap-12 items-end">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8" style={{ backgroundColor: ACCENT }} />
                  <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: ACCENT }}>
                    Ready to Build?
                  </div>
                </div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 48px)', color: WHITE, lineHeight: 1.1 }}>
                  Every landmark starts<br />with a conversation.
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end md:items-end">
                <Link to="/contact"
                  className="relative overflow-hidden group flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4"
                  style={{ backgroundColor: WHITE, color: BLACK }}>
                  <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: ACCENT }}
                    initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} />
                  <span className="relative z-10 group-hover:text-white transition-colors duration-150">Start Your Project</span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5 group-hover:text-white transition-colors duration-150" strokeWidth={2.5} />
                </Link>
                <a href="tel:+12819159595"
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-8 py-4 border transition-all"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.52)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; e.currentTarget.style.color = WHITE; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.52)'; }}>
                  (281) 915-9595
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-px h-8" style={{ backgroundColor: ACCENT }} />
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: WHITE, fontFamily: SERIF }}>HOU INC</div>
                  <div className="text-[7px] uppercase tracking-[0.36em]" style={{ color: ACCENT }}>Construction · Houston</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed mb-7 font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Unparalleled construction excellence across Greater Houston. Residential, commercial, retail, and industrial — built on 25 years of integrity, innovation, and results.
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: Phone,  label: '(281) 915-9595',            href: 'tel:+12819159595'       },
                  { icon: Mail,   label: 'Info@Houinc.com',           href: 'mailto:Info@Houinc.com' },
                  { icon: MapPin, label: '2100 W Loop South · #1115', href: undefined                },
                ].map(({ icon: Icon, label, href }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.22)' }} strokeWidth={1.5} />
                    {href
                      ? <a href={href} className="text-[11px] font-light transition-colors" style={{ color: 'rgba(255,255,255,0.24)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.24)')}>{label}</a>
                      : <span className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.24)' }}>{label}</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-6" style={{ color: ACCENT }}>Services</div>
              {FOOTER_SERVICES.map(s => (
                <Link key={s} to="/services"
                  className="block text-[11px] py-1.5 font-light transition-colors"
                  style={{ color: 'rgba(255,255,255,0.26)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = WHITE)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.26)')}>
                  {s}
                </Link>
              ))}
            </div>

            {/* Company */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-6" style={{ color: ACCENT }}>Company</div>
              {FOOTER_LINKS.map(l => (
                <Link key={l.label} to={l.to}
                  className="block text-[11px] py-1.5 font-light transition-colors"
                  style={{ color: 'rgba(255,255,255,0.26)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = WHITE)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.26)')}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Accreditation */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-6" style={{ color: ACCENT }}>Recognition</div>
              <div className="space-y-5">
                {[
                  { title: 'HBJ #1 Luxury Contractor', sub: '2022 · 2023 · 2024'           },
                  { title: 'BBB Accredited A+',         sub: '20+ Year Accreditation'       },
                  { title: 'AGC Houston Member',        sub: 'Associated General Contractors'},
                  { title: 'LEED Gold Certified',       sub: 'Sustainable Construction'     },
                ].map(a => (
                  <div key={a.title}>
                    <div className="text-[10px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{a.title}</div>
                    <div className="text-[9px] uppercase tracking-[0.12em]"  style={{ color: 'rgba(255,255,255,0.2)'  }}>{a.sub}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.16)' }}>
            © {new Date().getFullYear()} HOU INC Construction · All Rights Reserved · Houston, Texas
          </div>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Accessibility'].map(l => (
              <span key={l} className="text-[9px] uppercase tracking-[0.18em] cursor-pointer transition-colors"
                style={{ color: 'rgba(255,255,255,0.16)' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.42)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.16)')}>
                {l}
              </span>
            ))}
          </div>
        </div>

      </footer>
    </div>
  );
}
