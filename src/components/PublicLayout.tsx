import { useState, useEffect, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const BLACK    = '#0A0A0A';
const WHITE    = '#FFFFFF';
const GRAY_100 = '#F5F5F4';
const GRAY_200 = '#E8E8E6';
const GRAY_400 = '#9A9A9A';
const ACCENT   = '#9D7E3F';
const SERIF    = "'Cormorant Garamond', Georgia, serif";

const NAV = [
  { to: '/',          label: 'Home',      end: true },
  { to: '/services',  label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about',     label: 'About' },
  { to: '/contact',   label: 'Contact' },
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
  { label: 'About HOU INC',    to: '/about' },
  { label: 'Project Portfolio', to: '/portfolio' },
  { label: 'Our Services',      to: '/services' },
  { label: 'Contact Us',        to: '/contact' },
  { label: 'Client Portal',     to: '/portal' },
  { label: 'Finance Hub',       to: '/finance' },
];

/* ── Layout ─────────────────────────────────────────────────────────── */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const location                = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 44);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div style={{ backgroundColor: WHITE, color: BLACK, minHeight: '100vh' }}>

      {/* ── Pre-header — white, clean ── */}
      <div
        className="hidden md:flex items-center justify-between relative z-50"
        style={{
          backgroundColor: WHITE,
          borderBottom: `1px solid ${GRAY_200}`,
          height: '40px',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: ACCENT }} strokeWidth={1.5} />
            <span className="text-[8px] uppercase tracking-[0.32em] font-medium" style={{ color: GRAY_400 }}>
              2100 W Loop South, Suite #1115 · Houston, TX 77027
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="tel:+12819159595"
              className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.28em] font-medium transition-colors duration-150"
              style={{ color: GRAY_400 }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.color = GRAY_400)}>
              <Phone className="w-2.5 h-2.5" strokeWidth={1.5} />
              (281) 915-9595
            </a>
            <span style={{ color: GRAY_200 }}>|</span>
            <a href="mailto:Info@Houinc.com"
              className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.28em] font-medium transition-colors duration-150"
              style={{ color: GRAY_400 }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.color = GRAY_400)}>
              <Mail className="w-2.5 h-2.5" strokeWidth={1.5} />
              Info@Houinc.com
            </a>
            <span style={{ color: GRAY_200 }}>|</span>
            <span className="text-[8px] uppercase tracking-[0.24em] font-medium" style={{ color: GRAY_400 }}>
              Mon–Fri · 8am–6pm CST
            </span>
          </div>
        </div>
      </div>

      {/* ── Main header — always white ── */}
      <header
        className="fixed inset-x-0 z-40 transition-all duration-400"
        style={{
          top: scrolled ? 0 : 40,
          backgroundColor: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: `1px solid ${GRAY_200}`,
          boxShadow: scrolled ? '0 2px 32px rgba(0,0,0,0.07)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[70px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 select-none group">
            <motion.div
              className="w-px h-8"
              style={{ backgroundColor: ACCENT }}
              whileHover={{ scaleY: 0.55 }}
              transition={{ duration: 0.22 }}
            />
            <div>
              <div
                className="text-[13px] font-black tracking-[0.3em] uppercase"
                style={{ color: BLACK, fontFamily: SERIF, letterSpacing: '0.28em' }}
              >
                HOU INC
              </div>
              <div className="text-[7px] uppercase tracking-[0.36em] font-semibold" style={{ color: ACCENT }}>
                Construction · Houston
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="relative text-[10px] uppercase tracking-[0.26em] font-semibold group"
                style={({ isActive }) => ({
                  color: isActive ? BLACK : 'rgba(0,0,0,0.42)',
                  transition: 'color 0.18s',
                })}
                onMouseEnter={e => { e.currentTarget.style.color = BLACK; }}
                onMouseLeave={e => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.color = isActive ? BLACK : 'rgba(0,0,0,0.42)';
                }}
              >
                {n.label}
                {/* animated underline */}
                <span
                  className="absolute -bottom-0.5 left-0 h-px origin-left transition-transform duration-300 ease-out scale-x-0 group-hover:scale-x-100"
                  style={{ backgroundColor: BLACK, width: '100%' }}
                />
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-2.5 transition-all duration-200"
              style={{ backgroundColor: ACCENT, color: WHITE }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7d6432'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT; }}
            >
              Client Portal <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
            <Link
              to="/finance"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-2.5 border transition-all duration-200"
              style={{ borderColor: GRAY_200, color: 'rgba(0,0,0,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = BLACK; e.currentTarget.style.color = WHITE; e.currentTarget.style.borderColor = BLACK; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = GRAY_200; }}
            >
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <motion.button
            className="md:hidden p-1"
            style={{ color: 'rgba(0,0,0,0.55)' }}
            onClick={() => setOpen(o => !o)}
            whileTap={{ scale: 0.88 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open
                ? <motion.span key="x"    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.16 }}><X className="w-5 h-5" /></motion.span>
                : <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }}  animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.16 }}><Menu className="w-5 h-5" /></motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="drawer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden"
              style={{ backgroundColor: WHITE, borderTop: `1px solid ${GRAY_200}` }}
            >
              <div className="px-6 pt-3 pb-8">
                {/* Mobile contact */}
                <div className="flex items-center gap-4 py-3 mb-2" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                  <a href="tel:+12819159595" className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.24em] font-semibold" style={{ color: ACCENT }}>
                    <Phone className="w-3 h-3" strokeWidth={2} /> (281) 915-9595
                  </a>
                </div>

                {NAV.map((n, i) => (
                  <motion.div
                    key={n.to}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.045, duration: 0.24 }}
                  >
                    <NavLink
                      to={n.to}
                      end={n.end}
                      className="flex items-center justify-between py-4 text-[11px] uppercase tracking-[0.28em] font-semibold border-b"
                      style={({ isActive }) => ({
                        color: isActive ? BLACK : 'rgba(0,0,0,0.38)',
                        borderColor: GRAY_200,
                      })}
                    >
                      {n.label}
                      <ChevronRight className="w-3.5 h-3.5 opacity-25" strokeWidth={2} />
                    </NavLink>
                  </motion.div>
                ))}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link to="/portal"
                    className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5"
                    style={{ backgroundColor: ACCENT, color: WHITE }}>
                    Portal <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                  <Link to="/finance"
                    className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5"
                    style={{ backgroundColor: BLACK, color: WHITE }}>
                    Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Content ── */}
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

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: BLACK }}>

        {/* CTA band */}
        <div style={{ borderBottom: 'rgba(255,255,255,0.07) solid 1px' }}>
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
                  { icon: Phone,  label: '(281) 915-9595',            href: 'tel:+12819159595' },
                  { icon: Mail,   label: 'Info@Houinc.com',           href: 'mailto:Info@Houinc.com' },
                  { icon: MapPin, label: '2100 W Loop South · #1115', href: undefined },
                ].map(({ icon: Icon, label, href }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.22)' }} strokeWidth={1.5} />
                    {href
                      ? <a href={href} className="text-[11px] font-light transition-colors" style={{ color: 'rgba(255,255,255,0.24)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.24)')}>{label}</a>
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
                  { title: 'HBJ #1 Luxury Contractor', sub: '2022 · 2023 · 2024' },
                  { title: 'BBB Accredited A+', sub: '20+ Year Accreditation' },
                  { title: 'AGC Houston Member', sub: 'Associated General Contractors' },
                  { title: 'LEED Gold Certified', sub: 'Sustainable Construction' },
                ].map(a => (
                  <div key={a.title}>
                    <div className="text-[10px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{a.title}</div>
                    <div className="text-[9px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.2)' }}>{a.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderTop: 'rgba(255,255,255,0.07) solid 1px' }}>
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
