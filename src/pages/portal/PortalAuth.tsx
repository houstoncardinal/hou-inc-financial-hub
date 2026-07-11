import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, ChevronDown, CheckCircle2, ArrowRight,
  Lock, Clock, XCircle, Home, Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

/* ── Design tokens ─────────────────────────────────────────────── */
const DARK  = '#07060A';
const PANEL = '#FAFAF8';
const GOLD  = '#9D7E3F';
const GOLDF = '#C4A76B';
const INK   = '#1A1410';
const MUTED = '#8A7E74';
const BDR   = '#DDD4C4';
const ERR   = '#B94444';
const SF    = "'Cormorant Garamond', Georgia, serif";

/* ── Shared field styles ───────────────────────────────────────── */
const F: React.CSSProperties = {
  width: '100%', padding: '13px 0 9px',
  fontSize: 15, fontWeight: 300, letterSpacing: '0.01em',
  backgroundColor: 'transparent', border: 'none',
  borderBottom: `1px solid ${BDR}`, color: INK,
  outline: 'none', WebkitAppearance: 'none', transition: 'border-color 0.2s',
};
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 9, textTransform: 'uppercase',
  letterSpacing: '0.38em', fontWeight: 700, color: MUTED, marginBottom: 2,
};

/* ── Project types ─────────────────────────────────────────────── */
const TYPES = [
  { value: 'Custom Residential',   icon: Home,      desc: 'Custom home, estate, or residential renovation' },
  { value: 'Commercial / Office',  icon: Building2, desc: 'Office, retail, mixed-use, or industrial' },
  { value: 'Multi-Family',         icon: Building2, desc: 'Apartments, condos, or townhomes' },
  { value: 'Renovation / Remodel', icon: Home,      desc: 'Interior or exterior renovation of existing structure' },
  { value: 'Other',                icon: Building2, desc: 'Custom or specialty project — describe below' },
];

/* ── Small reusable field wrapper ──────────────────────────────── */
function Fld({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LBL}>
        {label}
        {hint && (
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, marginLeft: 6, opacity: 0.55 }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/* ── Password field with toggle ────────────────────────────────── */
function PwFld({
  label, hint, value, onChange, placeholder, show, onToggle, required,
  invalid,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder: string; show: boolean; onToggle: () => void; required?: boolean; invalid?: boolean;
}) {
  return (
    <Fld label={label} hint={hint}>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{ ...F, paddingRight: 32, borderBottomColor: invalid ? ERR : BDR }}
          onFocus={e => (e.target.style.borderBottomColor = invalid ? ERR : GOLD)}
          onBlur={e => (e.target.style.borderBottomColor = invalid ? ERR : BDR)}
        />
        <button type="button" onClick={onToggle}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: MUTED,
            padding: '4px', display: 'flex', alignItems: 'center',
          }}>
          {show
            ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            : <Eye style={{ width: 14, height: 14 }} strokeWidth={1.5} />}
        </button>
      </div>
    </Fld>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function PortalAuth() {
  const { client, register, login, loginBypass } = usePortal();
  const navigate = useNavigate();

  /* ── UI state ── */
  const [mode,            setMode]            = useState<'login' | 'register'>('login');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [pendingOtp,      setPendingOtp]      = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [accountRejected, setAccountRejected] = useState(false);
  const [otpCode,         setOtpCode]         = useState('');
  const [otpValue,        setOtpValue]        = useState('');
  const [otpError,        setOtpError]        = useState('');

  /* ── Login fields ── */
  const [lEmail,  setLEmail]  = useState('');
  const [lPw,     setLPw]     = useState('');
  const [lShow,   setLShow]   = useState(false);

  /* ── Register fields ── */
  const [rName,   setRName]   = useState('');
  const [rEmail,  setREmail]  = useState('');
  const [rPhone,  setRPhone]  = useState('');
  const [rPw,     setRPw]     = useState('');
  const [rPw2,    setRPw2]    = useState('');
  const [rShow,   setRShow]   = useState(false);
  const [rType,   setRType]   = useState('');
  const [rNotes,  setRNotes]  = useState('');
  const [typeOpen,setTypeOpen] = useState(false);

  /* ── Session redirect ── */
  if (client && !pendingOtp && !pendingApproval && !accountRejected) {
    if (!client.status || client.status === 'approved') {
      navigate('/portal/dashboard', { replace: true });
      return null;
    }
  }

  /* ── Helpers ── */
  const switchMode = (m: typeof mode) => { setMode(m); setError(''); };
  const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const pwMismatch = !!rPw2 && rPw2 !== rPw;

  /* ── Handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo bypass PIN
    if (lPw.trim() === '011491') {
      const { ok, error: err } = await loginBypass('011491');
      setLoading(false);
      if (!ok) { setError(err ?? 'Bypass failed — run portal-setup.sql first.'); return; }
      navigate('/portal/dashboard');
      return;
    }

    const { ok, status, error: err } = await login(lEmail.trim(), lPw);
    setLoading(false);
    if (!ok) { setError(err ?? 'Incorrect email or password.'); return; }
    if (status === 'pending_approval') { setPendingApproval(true); return; }
    if (status === 'rejected') { setAccountRejected(true); return; }
    const code = genCode();
    setOtpCode(code);
    setPendingOtp(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rType) { setError('Please select a project type.'); return; }
    if (rPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (rPw !== rPw2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { ok, error: err } = await register(rName.trim(), rEmail.trim(), rPhone.trim(), rType, rNotes.trim(), rPw);
    setLoading(false);
    if (!ok) { setError(err ?? 'Registration failed — please try again.'); return; }
    setPendingApproval(true);
  };

  const handleVerifyOtp = () => {
    if (otpValue.length < 6) return;
    if (otpValue === otpCode) {
      setPendingOtp(false);
      navigate('/portal/dashboard');
    } else {
      setOtpError('Incorrect code. Please try again.');
      setOtpValue('');
    }
  };

  /* ── Current view key ── */
  type View = 'form' | 'otp' | 'pending' | 'rejected';
  const view: View = pendingApproval ? 'pending'
    : accountRejected ? 'rejected'
    : pendingOtp ? 'otp'
    : 'form';

  /* ════════ RENDER ════════ */
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: DARK }}>

      {/* ── LEFT BRAND PANEL (desktop only) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-[42%] shrink-0 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Dot grid texture */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />
        {/* Warm radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 35% 52%, rgba(157,126,63,0.07) 0%, transparent 62%)',
        }} />
        {/* Gold hairline top */}
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.45 }} />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-12">

          {/* Brand mark */}
          <Link to="/" className="inline-flex items-center gap-3 select-none">
            <div style={{ width: 2, height: 26, backgroundColor: GOLD }} />
            <div>
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: '0.42em',
                textTransform: 'uppercase', color: '#FAF8F4', fontFamily: SF,
              }}>HOU INC</div>
              <div style={{
                fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.44em',
                fontWeight: 600, color: GOLDF, marginTop: 2,
              }}>Client Portal</div>
            </div>
          </Link>

          {/* Center headline */}
          <div className="flex-1 flex flex-col justify-center">
            <div style={{
              fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.46em',
              fontWeight: 700, color: GOLD, marginBottom: 22, opacity: 0.85,
            }}>
              Private Access
            </div>
            <h1 style={{
              fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(38px, 3.6vw, 58px)', color: '#FAF8F4',
              lineHeight: 1.07, letterSpacing: '-0.01em', marginBottom: 22,
            }}>
              Your project.<br />
              Your timeline.<br />
              <span style={{ color: GOLDF }}>Your builder.</span>
            </h1>
            <p style={{
              fontSize: 13, fontWeight: 300, lineHeight: 1.74,
              color: 'rgba(255,255,255,0.32)', maxWidth: '30ch',
            }}>
              A direct, private line to your HOU INC project team — from first conversation to the day we hand you the keys.
            </p>
          </div>

          {/* Bottom credentials */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22 }}>
            {[
              'Texas Licensed & Fully Insured',
              'A+ BBB Accredited  ·  Est. 1998',
              '$50M+ Bonding Capacity',
            ].map(line => (
              <div key={line} style={{
                fontSize: 10, fontWeight: 400, letterSpacing: '0.03em',
                color: 'rgba(255,255,255,0.2)', marginBottom: 7, lineHeight: 1.5,
              }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col" style={{ backgroundColor: PANEL }}>

        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(157,126,63,0.035) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />

        {/* Scrollable content area */}
        <div className="relative flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-6 sm:px-10 py-12 lg:py-16">

            {/* Mobile brand mark */}
            <div className="lg:hidden self-start mb-10">
              <Link to="/" className="inline-flex items-center gap-3 select-none">
                <div style={{ width: 2, height: 22, backgroundColor: GOLD }} />
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 900, letterSpacing: '0.36em',
                    textTransform: 'uppercase', color: INK, fontFamily: SF,
                  }}>HOU INC</div>
                  <div style={{
                    fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.36em',
                    fontWeight: 600, color: GOLD,
                  }}>Client Portal</div>
                </div>
              </Link>
            </div>

            {/* ── Animated view switcher ── */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view === 'form' ? `form-${mode}` : view}
                className="w-full"
                style={{ maxWidth: 460 }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >

                {/* ════ MAIN FORM VIEW ════ */}
                {view === 'form' && (
                  <>
                    {/* Tab switcher */}
                    <div className="flex gap-8 mb-9" style={{ borderBottom: `1px solid ${BDR}` }}>
                      {(['login', 'register'] as const).map(m => (
                        <button key={m} onClick={() => switchMode(m)}
                          className="relative pb-4 transition-colors"
                          style={{
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                            fontWeight: 700, color: mode === m ? INK : MUTED,
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px',
                          }}>
                          {m === 'login' ? 'Sign In' : 'New Account'}
                          {mode === m && (
                            <motion.div
                              layoutId="tab-bar"
                              className="absolute bottom-0 left-0 right-0"
                              style={{ height: 2, backgroundColor: GOLD }}
                              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 32 }}>
                      <h1 style={{
                        fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                        fontSize: 'clamp(28px, 4.5vw, 40px)', color: INK,
                        lineHeight: 1.08, marginBottom: 9,
                      }}>
                        {mode === 'login' ? 'Welcome back.' : 'Begin your project\njourney.'}
                      </h1>
                      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.66, fontWeight: 300 }}>
                        {mode === 'login'
                          ? 'Enter your email and password to access your project portal.'
                          : 'Tell us about yourself and your project. Our team reviews every application personally.'}
                      </p>
                    </div>

                    {/* ── LOGIN FORM ── */}
                    {mode === 'login' && (
                      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                        <Fld label="Email Address">
                          <input required type="email" value={lEmail}
                            onChange={e => setLEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={F}
                            onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                            onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                        </Fld>

                        <PwFld label="Password" value={lPw} onChange={setLPw}
                          placeholder="Your password" show={lShow}
                          onToggle={() => setLShow(v => !v)} required />

                        <AnimatePresence>
                          {error && (
                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              style={{ fontSize: 12, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -8 }}>
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <button type="submit" disabled={loading}
                          className="flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                          style={{
                            backgroundColor: GOLD, color: '#FFF',
                            height: 52, width: '100%', fontSize: 10,
                            textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 700,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                          }}>
                          {loading
                            ? 'Signing in…'
                            : <><span>Enter Portal</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                        </button>
                      </form>
                    )}

                    {/* ── REGISTER FORM ── */}
                    {mode === 'register' && (
                      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                        {/* Row: Name + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                          <Fld label="Full Name">
                            <input required value={rName} onChange={e => setRName(e.target.value)}
                              placeholder="Jane Smith" style={F}
                              onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                              onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                          </Fld>
                          <Fld label="Phone">
                            <input required type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)}
                              placeholder="(713) 555-0100" style={F}
                              onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                              onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                          </Fld>
                        </div>

                        <Fld label="Email Address">
                          <input required type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                            placeholder="you@example.com" style={F}
                            onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                            onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                        </Fld>

                        {/* Row: Password + Confirm */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                          <PwFld label="Password" hint="min. 8 chars" value={rPw} onChange={setRPw}
                            placeholder="Create password" show={rShow}
                            onToggle={() => setRShow(v => !v)} required />
                          <PwFld label="Confirm Password" value={rPw2} onChange={setRPw2}
                            placeholder="Re-enter" show={rShow} onToggle={() => setRShow(v => !v)}
                            required invalid={pwMismatch} />
                        </div>
                        {pwMismatch && (
                          <p style={{ fontSize: 11, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -10 }}>
                            Passwords don't match
                          </p>
                        )}

                        {/* Project type dropdown */}
                        <Fld label="Project Type">
                          <div className="relative">
                            <button type="button" onClick={() => setTypeOpen(o => !o)}
                              className="w-full flex items-center justify-between"
                              style={{
                                ...F, display: 'flex', cursor: 'pointer',
                                borderBottomColor: typeOpen ? GOLD : rType ? GOLD : BDR,
                              }}>
                              <span style={{ color: rType ? INK : '#9A8E85', fontWeight: 300 }}>
                                {rType || 'Select project type'}
                              </span>
                              <ChevronDown style={{
                                width: 14, height: 14, color: MUTED, flexShrink: 0,
                                transition: 'transform 0.2s',
                                transform: typeOpen ? 'rotate(180deg)' : 'none',
                              }} strokeWidth={1.5} />
                            </button>
                            <AnimatePresence>
                              {typeOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.16 }}
                                  className="absolute left-0 right-0 z-50 mt-0.5 py-1"
                                  style={{
                                    backgroundColor: '#FFF',
                                    border: `1px solid ${BDR}`,
                                    boxShadow: '0 10px 36px rgba(0,0,0,0.09)',
                                  }}>
                                  {TYPES.map(pt => {
                                    const Icon = pt.icon;
                                    const active = rType === pt.value;
                                    return (
                                      <button key={pt.value} type="button"
                                        onClick={() => { setRType(pt.value); setTypeOpen(false); }}
                                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors"
                                        style={{ backgroundColor: active ? 'rgba(157,126,63,0.05)' : 'transparent' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.04)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? 'rgba(157,126,63,0.05)' : 'transparent'; }}>
                                        <Icon style={{ width: 12, height: 12, color: GOLD, marginTop: 3, flexShrink: 0 }} strokeWidth={1.5} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{pt.value}</div>
                                          <div style={{ fontSize: 10, color: MUTED, fontWeight: 300, marginTop: 1 }}>{pt.desc}</div>
                                        </div>
                                        {active && <CheckCircle2 style={{ width: 13, height: 13, color: GOLD, marginTop: 2, flexShrink: 0 }} strokeWidth={2} />}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </Fld>

                        <Fld label="Project Notes" hint="optional">
                          <textarea value={rNotes} onChange={e => setRNotes(e.target.value)}
                            placeholder="Briefly describe your project — location, scope, timeline…"
                            rows={2}
                            style={{ ...F, resize: 'none', paddingTop: 12, lineHeight: 1.55 }}
                            onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                            onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                        </Fld>

                        <AnimatePresence>
                          {error && (
                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                              style={{ fontSize: 12, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -8 }}>
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <button type="submit" disabled={loading}
                          className="flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                          style={{
                            backgroundColor: INK, color: PANEL,
                            height: 52, width: '100%', fontSize: 10,
                            textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700,
                            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                          }}>
                          {loading
                            ? 'Submitting…'
                            : <><span>Submit Application</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                        </button>

                        <p style={{
                          fontSize: 10, color: MUTED, textAlign: 'center',
                          lineHeight: 1.65, marginTop: -6,
                        }}>
                          Our team reviews every application personally and will respond within 24–48 hours.
                        </p>
                      </form>
                    )}
                  </>
                )}

                {/* ════ OTP VERIFICATION ════ */}
                {view === 'otp' && (
                  <div>
                    <button
                      onClick={() => { setPendingOtp(false); setOtpValue(''); setOtpError(''); }}
                      style={{
                        fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em',
                        fontWeight: 700, color: MUTED, marginBottom: 28,
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      ← Back
                    </button>

                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(157,126,63,0.08)',
                      border: '1px solid rgba(157,126,63,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Lock style={{ width: 16, height: 16, color: GOLD }} strokeWidth={1.5} />
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 36px)', color: INK,
                      lineHeight: 1.08, marginBottom: 8,
                    }}>
                      Verify your identity.
                    </h1>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300, marginBottom: 24 }}>
                      Enter the 6-digit verification code sent to your email.
                    </p>

                    {/* Demo code reveal */}
                    <div style={{
                      marginBottom: 24, padding: '12px 16px',
                      backgroundColor: 'rgba(157,126,63,0.06)',
                      border: '1px solid rgba(157,126,63,0.16)',
                    }}>
                      <div style={{
                        fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.38em',
                        fontWeight: 700, color: GOLD, marginBottom: 6,
                      }}>Demo — your code</div>
                      <div style={{
                        fontFamily: SF, fontStyle: 'italic', fontSize: '1.85rem',
                        color: INK, letterSpacing: '0.22em', fontWeight: 300, lineHeight: 1,
                      }}>{otpCode}</div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={LBL}>6-Digit Code</label>
                      <div style={{ marginTop: 10 }}>
                        <InputOTP
                          maxLength={6}
                          value={otpValue}
                          onChange={v => { setOtpValue(v); setOtpError(''); }}
                          onComplete={handleVerifyOtp}
                          containerClassName="gap-2">
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map(i => (
                              <InputOTPSlot key={i} index={i}
                                className="rounded-none border-[#DDD4C4] data-[active]:border-[#9D7E3F] data-[active]:ring-[#9D7E3F]"
                                style={{
                                  width: 48, height: 56,
                                  fontFamily: SF, fontStyle: 'italic',
                                  fontSize: '1.25rem', color: INK,
                                }} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    <AnimatePresence>
                      {otpError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ fontSize: 12, color: ERR, fontFamily: SF, fontStyle: 'italic', marginBottom: 14 }}>
                          {otpError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button onClick={handleVerifyOtp} disabled={otpValue.length < 6}
                      className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                      style={{
                        backgroundColor: INK, color: PANEL,
                        height: 52, fontSize: 10,
                        textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700,
                        border: 'none', cursor: otpValue.length < 6 ? 'not-allowed' : 'pointer',
                      }}>
                      Verify & Enter Portal
                      <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* ════ PENDING APPROVAL ════ */}
                {view === 'pending' && (
                  <div>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(157,126,63,0.08)',
                      border: '1px solid rgba(157,126,63,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Clock style={{ width: 16, height: 16, color: GOLD }} strokeWidth={1.5} />
                    </div>

                    <div style={{
                      fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.44em',
                      fontWeight: 700, color: GOLD, marginBottom: 14,
                    }}>
                      Application Received
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 38px)', color: INK,
                      lineHeight: 1.08, marginBottom: 12,
                    }}>
                      Under review.
                    </h1>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
                      Our team personally reviews every portal application. You'll receive an email notification within{' '}
                      <strong style={{ fontWeight: 600, color: INK }}>24–48 hours</strong> once your account is approved.
                    </p>

                    <div style={{
                      marginBottom: 28, padding: 18,
                      backgroundColor: 'rgba(157,126,63,0.04)',
                      border: '1px solid rgba(157,126,63,0.14)',
                    }}>
                      <div style={{
                        fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em',
                        fontWeight: 700, color: GOLD, marginBottom: 12,
                      }}>While you wait</div>
                      {[
                        'Check your inbox for a confirmation email from HOU INC',
                        'Gather property documents and financing pre-approval',
                        'Collect design references and inspiration images',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: 'rgba(157,126,63,0.14)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                          }}>
                            <span style={{ fontSize: 7, fontWeight: 800, color: GOLD }}>{i + 1}</span>
                          </div>
                          <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.55, fontWeight: 300 }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <a href="tel:+12819159595"
                        className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{
                          border: `1px solid ${BDR}`, height: 48,
                          fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em',
                          fontWeight: 700, color: MUTED, textDecoration: 'none',
                        }}>
                        Call Us
                      </a>
                      <a href="mailto:Info@Houinc.com"
                        className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: INK, height: 48,
                          fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em',
                          fontWeight: 700, color: PANEL, textDecoration: 'none',
                        }}>
                        Email Us <ArrowRight style={{ width: 12, height: 12 }} strokeWidth={2} />
                      </a>
                    </div>

                    <button onClick={() => { setPendingApproval(false); switchMode('login'); }}
                      style={{
                        fontSize: 11, color: MUTED, fontFamily: SF, fontStyle: 'italic',
                        fontWeight: 300, marginTop: 22, background: 'none',
                        border: 'none', cursor: 'pointer', display: 'block',
                      }}
                      className="transition-opacity hover:opacity-60">
                      ← Back to sign in
                    </button>
                  </div>
                )}

                {/* ════ REJECTED ════ */}
                {view === 'rejected' && (
                  <div>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(239,68,68,0.07)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <XCircle style={{ width: 16, height: 16, color: '#ef4444' }} strokeWidth={1.5} />
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 38px)', color: INK,
                      lineHeight: 1.08, marginBottom: 12,
                    }}>
                      Application not approved.
                    </h1>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
                      We weren't able to approve your application at this time. This may be due to project scope, capacity, or other factors. Please contact our team directly.
                    </p>

                    <a href="tel:+12819159595"
                      className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: INK, height: 50, display: 'flex',
                        fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em',
                        fontWeight: 700, color: PANEL, textDecoration: 'none',
                      }}>
                      Call (281) 915-9595 <ArrowRight style={{ width: 12, height: 12 }} strokeWidth={2} />
                    </a>

                    <button onClick={() => { setAccountRejected(false); switchMode('login'); }}
                      style={{
                        fontSize: 11, color: MUTED, fontFamily: SF, fontStyle: 'italic',
                        fontWeight: 300, marginTop: 22, background: 'none',
                        border: 'none', cursor: 'pointer', display: 'block',
                      }}
                      className="transition-opacity hover:opacity-60">
                      ← Back to sign in
                    </button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Back to site */}
            <div className="mt-10 w-full" style={{ maxWidth: 460 }}>
              <Link to="/"
                style={{
                  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em',
                  fontWeight: 600, color: MUTED, textDecoration: 'none', opacity: 0.65,
                }}
                className="transition-opacity hover:opacity-100">
                ← Back to houinc.com
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
