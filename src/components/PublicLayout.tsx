import { useState, useEffect, ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

const G = '#C4963C';

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
    <div style={{ backgroundColor: '#07070A', color: '#F4F2EE', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
        style={{
          borderBottom: scrolled ? '1px solid #1C1A22' : '1px solid transparent',
          backgroundColor: scrolled ? 'rgba(7,7,10,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <div className="w-px h-7" style={{ backgroundColor: G }} />
            <div>
              <div className="text-[11px] font-black tracking-[0.25em] uppercase text-white">HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.28em] font-medium" style={{ color: G }}>Construction · Houston</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-9">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors duration-200"
                style={({ isActive }) => ({ color: isActive ? G : 'rgba(244,242,238,0.45)' })}
                onMouseEnter={e => { if (e.currentTarget.style.color !== G) e.currentTarget.style.color = 'rgba(244,242,238,0.9)'; }}
                onMouseLeave={e => { /* handled by NavLink */ }}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Finance CTA */}
          <div className="hidden md:flex items-center">
            <Link
              to="/finance"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-5 py-2.5 transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: G, color: '#07070A' }}
            >
              Finance Sector <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-white/60 hover:text-white transition-colors" onClick={() => setOpen(o => !o)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden px-6 pb-8 pt-2" style={{ backgroundColor: '#07070A', borderTop: '1px solid #1C1A22' }}>
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className="flex items-center py-3.5 text-[11px] uppercase tracking-[0.2em] font-semibold border-b"
                style={({ isActive }) => ({ color: isActive ? G : 'rgba(244,242,238,0.5)', borderColor: '#1C1A22' })}
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/finance"
              className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black py-3.5"
              style={{ backgroundColor: G, color: '#07070A' }}
            >
              Finance Sector <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main>{children}</main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#050507', borderTop: '1px solid #1C1A22' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {/* Brand col */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-px h-7" style={{ backgroundColor: G }} />
                <div>
                  <div className="text-[11px] font-black tracking-[0.25em] uppercase text-white">HOU INC</div>
                  <div className="text-[7px] uppercase tracking-[0.28em]" style={{ color: G }}>Construction · Houston</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed mb-6" style={{ color: '#5A5860' }}>
                Houston's premier luxury construction firm. Building landmark residential and commercial properties since 1998.
              </p>
              <div className="h-px w-8 mb-4" style={{ backgroundColor: G }} />
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: '#3C3A42' }}>Houston, Texas · Est. 1998</div>
            </div>

            {/* Services */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: G }}>Services</div>
              {['Luxury Residences', 'Commercial', 'Shopping Centers', 'Custom Estates', 'Mixed-Use', 'Industrial'].map(s => (
                <div key={s} className="text-[11px] py-1.5" style={{ color: '#5A5860' }}>{s}</div>
              ))}
            </div>

            {/* Company */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: G }}>Company</div>
              {[
                { label: 'About', to: '/about' },
                { label: 'Portfolio', to: '/portfolio' },
                { label: 'Services', to: '/services' },
                { label: 'Contact', to: '/contact' },
                { label: 'Finance Sector', to: '/finance' },
              ].map(l => (
                <Link key={l.label} to={l.to} className="block text-[11px] py-1.5 transition-colors" style={{ color: '#5A5860' }}
                  onMouseEnter={e => (e.currentTarget.style.color = G)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#5A5860')}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: G }}>Contact</div>
              <div className="space-y-4">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: '#3C3A42' }}>Address</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: '#5A5860' }}>1200 Post Oak Blvd<br />Suite 300<br />Houston, TX 77056</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: '#3C3A42' }}>Phone</div>
                  <div className="text-[11px]" style={{ color: '#5A5860' }}>(713) 555-0190</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: '#3C3A42' }}>Email</div>
                  <div className="text-[11px]" style={{ color: '#5A5860' }}>info@houinc.com</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #1C1A22' }}>
            <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: '#2C2A30' }}>
              © {new Date().getFullYear()} HOU INC · All Rights Reserved
            </div>
            <div className="flex items-center gap-6">
              {['Privacy Policy', 'Terms', 'Accessibility'].map(l => (
                <span key={l} className="text-[9px] uppercase tracking-[0.18em]" style={{ color: '#2C2A30' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
