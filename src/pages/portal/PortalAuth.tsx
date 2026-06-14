import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const WHITE  = '#FFFFFF';
const DARK   = '#0E0A07';
const DARK2  = '#1C1814';
const GOLD   = '#9D7E3F';
const GOLD_L = '#C4A76B';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

/* Underline-only field — 16 px font prevents iOS auto-zoom */
const field: React.CSSProperties = {
  width: '100%',
  padding: '16px 0 10px',
  fontSize: '16px',
  fontWeight: 300,
  fontFamily: SERIF,
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${BORDER}`,
  color: DARK2,
  outline: 'none',
  transition: 'border-color 0.22s',
  letterSpacing: '0.01em',
  WebkitAppearance: 'none',
};

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.36em',
  fontWeight: 700,
  marginBottom: '2px',
  color: '#7A6E64',            /* solid colour, not opacity — much more legible */
};

const FEATURES = [
  { n: '01', text: 'Dedicated project consultant assigned the moment you register' },
  { n: '02', text: 'Submit your complete project brief in under ten minutes' },
  { n: '03', text: 'Direct line to your builder team — message anytime' },
  { n: '04', text: 'Live milestone tracking from consultation through completion' },
];

/* ─────────────────────────────────────────────────── */

export default function PortalAuth() {
  const { client, register, login } = usePortal();
  const navigate = useNavigate();
  const [mode,    setMode]    = useState<'register' | 'login'>('register');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const [rName,  setRName]  = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [lEmail, setLEmail] = useState('');

  if (client) { navigate('/portal/dashboard', { replace: true }); return null; }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const { ok, error: err } = register(rName.trim(), rEmail.trim(), rPhone.trim());
      setLoading(false);
      if (!ok) { setError(err ?? 'Registration failed.'); return; }
      navigate('/portal/dashboard');
    }, 420);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const { ok, error: err } = login(lEmail.trim());
      setLoading(false);
      if (!ok) { setError(err ?? 'Sign in failed.'); return; }
      navigate('/portal/dashboard');
    }, 380);
  };

  const switchMode = () => { setMode(m => m === 'register' ? 'login' : 'register'); setError(''); };
  const isRegister = mode === 'register';

  /* ────────────────────────────────────────────────
     Shared: form content (used in both layouts)
  ──────────────────────────────────────────────── */
  const FormContent = (
    <div className="w-full" style={{ maxWidth: '420px' }}>

      {/* Ornamental rule */}
      <div className="flex items-center gap-4 mb-7">
        <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
        <span style={{ fontSize: '8px', color: GOLD, letterSpacing: '0.45em', fontWeight: 700, textTransform: 'uppercase' }}>
          {isRegister ? 'New Member' : 'Welcome Back'}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
      </div>

      {/* Heading */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 style={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            color: DARK2, lineHeight: 1.06, letterSpacing: '-0.01em',
            marginBottom: '0.6rem',
          }}>
            {isRegister ? <>Begin your<br />project journey.</> : <>Return to<br />your project.</>}
          </h1>

          <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.65, marginBottom: '2.25rem', fontWeight: 300 }}>
            {isRegister
              ? 'Create your account and connect directly with a dedicated HOU INC project consultant.'
              : 'Enter your email to access your portal and builder communications.'}
          </p>

          {/* Register */}
          {isRegister && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input required value={rName} onChange={e => setRName(e.target.value)}
                  placeholder="Jane Smith" style={field}
                  onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)} />
              </div>
              <div>
                <label style={lbl}>Email Address *</label>
                <input required type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                  placeholder="jane@example.com" style={field}
                  onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)} />
              </div>
              <div>
                <label style={lbl}>Phone &nbsp;<span style={{ opacity: 0.55 }}>Optional</span></label>
                <input type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)}
                  placeholder="(713) 555-0100" style={field}
                  onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)} />
              </div>

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: '#b94a38' }}>{error}</motion.p>}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ backgroundColor: DARK2, color: CREAM, height: '54px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
                {loading ? 'Creating account…' : <><span>Create Account</span><ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} /></>}
              </button>

              <p style={{ fontSize: '10px', color: '#9A8E85', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.65 }}>
                By creating an account you consent to being contacted by a HOU INC project consultant.
              </p>
            </form>
          )}

          {/* Login */}
          {!isRegister && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div>
                <label style={lbl}>Email Address *</label>
                <input required type="email" value={lEmail} onChange={e => setLEmail(e.target.value)}
                  placeholder="jane@example.com" style={field}
                  onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)} />
              </div>

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: '#b94a38' }}>{error}</motion.p>}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ backgroundColor: GOLD, color: WHITE, height: '54px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
                {loading ? 'Signing in…' : <><span>Enter Portal</span><ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} /></>}
              </button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="mt-8 pt-6 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button onClick={switchMode}
          style={{ fontSize: '12px', color: '#6B5D52', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300 }}
          className="transition-opacity hover:opacity-70">
          {isRegister ? 'Already a member? Sign in →' : 'New to HOU INC? Create an account →'}
        </button>
        <Link to="/"
          style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.26em', color: '#9A8E85', fontWeight: 600 }}
          className="transition-opacity hover:opacity-60">
          ← Site
        </Link>
      </div>
    </div>
  );

  /* ────────────────────────────────────────────────
     MOBILE + TABLET  (< lg / 1024 px)
     Dark branded hero → white form stacked vertically
  ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: DARK }}>

      {/* ── Mobile / tablet: dark branded header ── */}
      <div className="lg:hidden relative overflow-hidden" style={{ backgroundColor: DARK }}>
        {/* Gold top hairline */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.6 }} />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.15) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 80%, rgba(157,126,63,0.1) 0%, transparent 55%)' }} />
        {/* Watermark H */}
        <div className="absolute inset-0 flex items-center justify-end overflow-hidden pointer-events-none select-none"
          style={{ opacity: 0.04 }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '55vw', color: GOLD_L, lineHeight: 1, marginRight: '-5vw' }}>H</span>
        </div>

        <div className="relative z-10 px-6 sm:px-10 pt-8 pb-9">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 select-none mb-7">
            <div className="w-px h-7" style={{ backgroundColor: GOLD }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.38em', textTransform: 'uppercase', color: CREAM, fontFamily: SERIF }}>HOU INC</div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.42em', fontWeight: 500, color: GOLD, marginTop: '2px' }}>
                Construction · Houston · Est. 1998
              </div>
            </div>
          </Link>

          {/* Ornamental rule */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ backgroundColor: GOLD, opacity: 0.5 }} />
            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 700, color: GOLD }}>Client Portal</span>
          </div>

          {/* Headline */}
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 6.5vw, 42px)', color: CREAM, lineHeight: 1.1, marginBottom: '0.9rem' }}>
            Your dream home<br />
            <span style={{ color: GOLD_L }}>deserves a builder</span><br />
            who is always present.
          </h2>

          <p style={{ fontSize: '13px', color: '#C8BFB4', fontWeight: 300, lineHeight: 1.62, maxWidth: '460px' }}>
            A direct, private line to your HOU INC project team — from first conversation to the day we hand you the keys.
          </p>
        </div>

        {/* Gold bottom hairline */}
        <div className="absolute bottom-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.25 }} />
      </div>

      {/* ── Desktop: full left panel ── */}
      <div className="hidden lg:flex flex-col w-[46%] shrink-0 relative overflow-hidden" style={{ backgroundColor: DARK }}>
        {/* Decorative layers */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 40% 58%, rgba(157,126,63,0.08) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.14) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" style={{ opacity: 0.03 }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '34vw', color: GOLD_L, lineHeight: 1 }}>H</span>
        </div>
        {/* Left gold border */}
        <div className="absolute left-0 inset-y-0 w-px" style={{ backgroundColor: GOLD, opacity: 0.4 }} />
        {/* Top gold hairline */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.55 }} />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-14 py-12">

          {/* Logo */}
          <Link to="/" className="inline-flex flex-col gap-1 select-none">
            <div className="flex items-center gap-3">
              <div className="w-px h-6" style={{ backgroundColor: GOLD }} />
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.42em', textTransform: 'uppercase', color: CREAM, fontFamily: SERIF }}>HOU INC</span>
            </div>
            <div style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.46em', fontWeight: 500, color: GOLD, marginLeft: '16px' }}>
              Construction · Houston · Est. 1998
            </div>
          </Link>

          {/* Centre block */}
          <div>
            <div className="flex items-center gap-4 mb-9">
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.28)' }} />
              <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.48em', fontWeight: 700, color: GOLD }}>Client Portal</span>
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(157,126,63,0.28)' }} />
            </div>

            <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px, 3.6vw, 58px)', color: CREAM, lineHeight: 1.07, letterSpacing: '-0.01em', marginBottom: '1.6rem' }}>
              Your dream home<br />
              <span style={{ color: GOLD_L }}>deserves a builder</span><br />
              who is always present.
            </h1>

            <p style={{ fontSize: '13.5px', color: '#C4B9AE', fontWeight: 300, lineHeight: 1.68, maxWidth: '355px', marginBottom: '2.25rem' }}>
              The HOU INC Client Portal gives you a direct, private line to your project team — from first conversation to the moment we hand you the keys.
            </p>

            {/* Feature list */}
            <div style={{ borderTop: '1px solid rgba(157,126,63,0.22)' }}>
              {FEATURES.map(f => (
                <div key={f.n} className="flex items-start gap-5 py-3.5" style={{ borderBottom: '1px solid rgba(157,126,63,0.14)' }}>
                  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1rem', color: GOLD_L, lineHeight: 1, marginTop: '2px', minWidth: '22px' }}>
                    {f.n}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 300, color: '#C4B9AE', lineHeight: 1.6 }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <div className="h-px mb-7" style={{ backgroundColor: 'rgba(157,126,63,0.22)' }} />
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '4.5rem', color: GOLD_L, lineHeight: 0.7, marginBottom: '6px', opacity: 0.45 }}>
              "
            </div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.05rem', color: '#C8BFB4', lineHeight: 1.58, marginBottom: '0.9rem' }}>
              The portal made the entire process feel seamless and transparent. I always knew where we stood — and I always felt like a priority.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-4 h-px" style={{ backgroundColor: GOLD, opacity: 0.6 }} />
              <span style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 600, color: GOLD }}>
                Sarah M. &nbsp;·&nbsp; River Oaks Estate &nbsp;·&nbsp; 2024
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Thin gold column divider (desktop only) ── */}
      <div className="hidden lg:block w-px shrink-0" style={{ backgroundColor: GOLD, opacity: 0.22 }} />

      {/* ═══════════════════════════════════════════
          FORM PANEL — all screen sizes
      ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0"
        style={{ backgroundColor: WHITE }}>

        {/* Gold top hairline (visible on desktop; mobile has it on the dark header) */}
        <div className="hidden lg:block absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.38 }} />

        {/* Subtle cream dot tint */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Form wrapper — centred, responsive padding */}
        <motion.div
          className="relative z-10 w-full flex flex-col items-center px-6 sm:px-10 md:px-14 lg:px-12 xl:px-16 py-10 md:py-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {FormContent}
        </motion.div>
      </div>

    </div>
  );
}
