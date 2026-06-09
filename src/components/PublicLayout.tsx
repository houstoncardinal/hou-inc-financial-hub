import { useState, useEffect, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

const CREAM  = '#FAF7F2';
const DARK   = '#1C1814';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const NAV = [
  { to: '/',          label: 'Home',      end: true },
  { to: '/services',  label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about',     label: 'About' },
  { to: '/contact',   label: 'Contact' },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const location                = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div style={{ backgroundColor: CREAM, color: DARK, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
        style={{
          borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
          backgroundColor: scrolled ? 'rgba(250,247,242,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          boxShadow: scrolled ? '0 1px 28px rgba(28,24,20,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 select-none">
            <div className="w-px h-8" style={{ backgroundColor: GOLD }} />
            <div>
              <div className="text-[12px] font-black tracking-[0.3em] uppercase" style={{ color: DARK, fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.38em] font-medium" style={{ color: GOLD }}>Construction · Houston</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-9">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="text-[10px] uppercase tracking-[0.24em] font-semibold transition-colors duration-200"
                style={({ isActive }) => ({ color: isActive ? GOLD : 'rgba(28,24,20,0.42)' })}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/portal"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-2.5 transition-all hover:opacity-80"
              style={{ backgroundColor: GOLD, color: '#fff' }}
            >
              Client Portal <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
            <Link
              to="/finance"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-2.5 transition-all hover:opacity-80"
              style={{ backgroundColor: DARK, color: CREAM }}
            >
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden transition-colors"
            style={{ color: 'rgba(28,24,20,0.45)' }}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden px-6 pb-8 pt-2" style={{ backgroundColor: CREAM, borderTop: `1px solid ${BORDER}` }}>
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="flex items-center py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold border-b"
                style={({ isActive }) => ({ color: isActive ? GOLD : 'rgba(28,24,20,0.45)', borderColor: BORDER })}
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/portal"
              className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5"
              style={{ backgroundColor: GOLD, color: '#fff' }}
            >
              Client Portal <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
            <Link
              to="/finance"
              className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5"
              style={{ backgroundColor: DARK, color: CREAM }}
            >
              Finance Sector <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main>{children}</main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#1C1814' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-px h-7" style={{ backgroundColor: GOLD }} />
                <div>
                  <div className="text-[11px] font-black tracking-[0.28em] uppercase" style={{ color: CREAM, fontFamily: SERIF }}>HOU INC</div>
                  <div className="text-[7px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>Construction · Houston</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed mb-6 font-light" style={{ color: 'rgba(250,247,242,0.32)' }}>
                Unparalleled construction excellence for residential and commercial projects across greater Houston.
              </p>
              <div className="h-px w-8 mb-4" style={{ backgroundColor: GOLD, opacity: 0.4 }} />
              <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: 'rgba(250,247,242,0.18)' }}>Houston, Texas</div>
            </div>

            {/* Services */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-5" style={{ color: GOLD }}>Services</div>
              {['Luxury Residences', 'Commercial', 'Shopping Centers', 'Custom Estates', 'Mixed-Use', 'Industrial'].map(s => (
                <div key={s} className="text-[11px] py-1.5 font-light" style={{ color: 'rgba(250,247,242,0.28)' }}>{s}</div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-5" style={{ color: GOLD }}>Company</div>
              {[
                { label: 'About',          to: '/about' },
                { label: 'Portfolio',      to: '/portfolio' },
                { label: 'Services',       to: '/services' },
                { label: 'Contact',        to: '/contact' },
                { label: 'Finance Sector', to: '/finance' },
              ].map(l => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="block text-[11px] py-1.5 font-light transition-colors"
                  style={{ color: 'rgba(250,247,242,0.28)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(250,247,242,0.28)')}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-5" style={{ color: GOLD }}>Contact</div>
              <div className="space-y-4">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(250,247,242,0.18)' }}>Address</div>
                  <div className="text-[11px] leading-relaxed font-light" style={{ color: 'rgba(250,247,242,0.28)' }}>2100 W Loop South<br />Suite #1115<br />Houston, TX 77027</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(250,247,242,0.18)' }}>Phone</div>
                  <div className="text-[11px] font-light" style={{ color: 'rgba(250,247,242,0.28)' }}>(281) 915-9595</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(250,247,242,0.18)' }}>Email</div>
                  <div className="text-[11px] font-light" style={{ color: 'rgba(250,247,242,0.28)' }}>Info@Houinc.com</div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="mt-14 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(250,247,242,0.08)' }}
          >
            <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(250,247,242,0.14)' }}>
              © {new Date().getFullYear()} HOU INC · All Rights Reserved
            </div>
            <div className="flex items-center gap-6">
              {['Privacy Policy', 'Terms', 'Accessibility'].map(l => (
                <span key={l} className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(250,247,242,0.14)' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
