import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowUpRight, Lock, Clock, CheckCircle2, XCircle, Building2, Home, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const CREAM  = '#FAF7F2';
const WHITE  = '#FFFFFF';
const DARK   = '#0E0A07';
const DARK2  = '#1C1814';
const GOLD   = '#9D7E3F';
const GOLD_L = '#C4A76B';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

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
  color: '#7A6E64',
};

const PROJECT_TYPES = [
  { value: 'Custom Residential',   icon: Home,      desc: 'Custom home, estate, or residential renovation' },
  { value: 'Commercial / Office',  icon: Building2, desc: 'Office, retail, mixed-use, or industrial' },
  { value: 'Multi-Family',         icon: Building2, desc: 'Apartments, condos, or townhomes' },
  { value: 'Renovation / Remodel', icon: Home,      desc: 'Interior or exterior renovation of existing structure' },
  { value: 'Other',                icon: Building2, desc: 'Custom or specialty project — describe below' },
];

const FEATURES = [
  { n: '01', text: 'Dedicated project consultant assigned the moment your account is approved' },
  { n: '02', text: 'Submit your complete project brief in under ten minutes' },
  { n: '03', text: 'Direct line to your builder team — message anytime' },
  { n: '04', text: 'Live milestone tracking from consultation through completion' },
];

export default function PortalAuth() {
  const { client, register, login, loginBypass } = usePortal();
  const navigate = useNavigate();

  const [mode,            setMode]            = useState<'register' | 'login'>('login');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [pendingOtp,      setPendingOtp]      = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [accountRejected, setAccountRejected] = useState(false);
  const [otpCode,         setOtpCode]         = useState('');
  const [otpValue,        setOtpValue]        = useState('');
  const [otpError,        setOtpError]        = useState('');

  // Register fields
  const [rName,     setRName]     = useState('');
  const [rEmail,    setREmail]    = useState('');
  const [rPhone,    setRPhone]    = useState('');
  const [rType,     setRType]     = useState('');
  const [rInterest, setRInterest] = useState('');
  const [typeOpen,  setTypeOpen]  = useState(false);

  // Login fields
  const [lEmail,    setLEmail]    = useState('');
  const [lPassword, setLPassword] = useState('');
  const [lShowPw,   setLShowPw]   = useState(false);

  // Register password fields
  const [rPassword,  setRPassword]  = useState('');
  const [rPassword2, setRPassword2] = useState('');
  const [rShowPw,    setRShowPw]    = useState(false);

  if (client && !pendingOtp && !pendingApproval && !accountRejected) {
    if (!client.status || client.status === 'approved') { navigate('/portal/dashboard', { replace: true }); return null; }
    if (client.status === 'pending_approval' && !pendingApproval) { /* shown via pendingApproval state */ }
    if (client.status === 'rejected' && !accountRejected) { /* shown via accountRejected state */ }
  }

  const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rType) { setError('Please select a project type.'); return; }
    if (rPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (rPassword !== rPassword2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { ok, error: err } = await register(rName.trim(), rEmail.trim(), rPhone.trim(), rType, rInterest.trim(), rPassword);
    setLoading(false);
    if (!ok) { setError(err ?? 'Registration failed.'); return; }
    setPendingApproval(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo bypass — PIN lets staff show the portal without the real password
    if (lPassword.trim() === '011491') {
      const { ok, error: err } = await loginBypass('011491');
      setLoading(false);
      if (!ok) { setError(err ?? 'Bypass failed.'); return; }
      navigate('/portal/dashboard');
      return;
    }

    const { ok, status, error: err } = await login(lEmail.trim(), lPassword);
    setLoading(false);
    if (!ok) { setError(err ?? 'Sign in failed.'); return; }
    if (status === 'pending_approval') { setPendingApproval(true); return; }
    if (status === 'rejected') { setAccountRejected(true); return; }
    const code = generateCode();
    setOtpCode(code);
    setPendingOtp(true);
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

  const switchMode = (m: 'register' | 'login') => { setMode(m); setError(''); setPendingApproval(false); setAccountRejected(false); };

  /* ── Pending approval screen ── */
  const PendingContent = (
    <div className="w-full" style={{ maxWidth: '420px' }}>
      <div className="w-12 h-12 flex items-center justify-center mb-7"
        style={{ backgroundColor: 'rgba(157,126,63,0.09)', border: '1px solid rgba(157,126,63,0.28)' }}>
        <Clock className="w-5 h-5" style={{ color: GOLD }} strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px w-6" style={{ backgroundColor: GOLD, opacity: 0.5 }} />
        <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 700, color: GOLD }}>Application Received</span>
      </div>
      <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', color: DARK2, lineHeight: 1.06, marginBottom: '0.75rem' }}>
        Your application<br />is under review.
      </h1>
      <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.7, fontWeight: 300, marginBottom: '2rem' }}>
        Our team personally reviews every portal application to ensure the best experience for our clients. You'll receive an email notification within <strong style={{ fontWeight: 600 }}>24–48 hours</strong> once your account has been approved.
      </p>

      <div className="mb-7 p-5" style={{ backgroundColor: 'rgba(157,126,63,0.05)', border: '1px solid rgba(157,126,63,0.18)' }}>
        <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD, marginBottom: '12px' }}>While you wait</div>
        {[
          'Check your inbox for a confirmation email from HOU INC',
          'Gather property documents and financing pre-approval',
          'Collect design references and inspiration images',
          'Reach out directly at (281) 915-9595 with any questions',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.15)', borderRadius: '50%' }}>
              <span style={{ fontSize: '7px', fontWeight: 800, color: GOLD }}>{i + 1}</span>
            </div>
            <span style={{ fontSize: '12px', color: '#6B5D52', lineHeight: 1.55, fontWeight: 300 }}>{item}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <a href="tel:+12819159595"
          className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ border: `1px solid ${BORDER}`, height: '44px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: '#6B5D52', textDecoration: 'none' }}>
          Call Us
        </a>
        <a href="mailto:Info@Houinc.com"
          className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ backgroundColor: DARK2, height: '44px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: CREAM, textDecoration: 'none' }}>
          Email Us <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      </div>

      <button onClick={() => { setPendingApproval(false); switchMode('login'); }}
        style={{ fontSize: '11px', color: '#9A8E85', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, marginTop: '1.5rem', display: 'block' }}
        className="transition-opacity hover:opacity-60">
        ← Back to sign in
      </button>
    </div>
  );

  /* ── Rejected screen ── */
  const RejectedContent = (
    <div className="w-full" style={{ maxWidth: '420px' }}>
      <div className="w-12 h-12 flex items-center justify-center mb-7"
        style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)' }}>
        <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} strokeWidth={1.5} />
      </div>
      <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', color: DARK2, lineHeight: 1.06, marginBottom: '0.75rem' }}>
        Application not<br />approved at this time.
      </h1>
      <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.7, fontWeight: 300, marginBottom: '2rem' }}>
        We weren't able to approve your portal application at this time. This may be due to project scope, capacity, or other factors. Please contact our team directly — we'd love to discuss how we can help.
      </p>
      <a href="tel:+12819159595"
        className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
        style={{ backgroundColor: DARK2, height: '50px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, color: CREAM, textDecoration: 'none' }}>
        Call (281) 915-9595 <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
      </a>
      <button onClick={() => { setAccountRejected(false); switchMode('login'); }}
        style={{ fontSize: '11px', color: '#9A8E85', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, marginTop: '1.5rem', display: 'block' }}
        className="transition-opacity hover:opacity-60">
        ← Back
      </button>
    </div>
  );

  /* ── OTP screen ── */
  const OtpContent = (
    <div className="w-full" style={{ maxWidth: '420px' }}>
      <button onClick={() => { setPendingOtp(false); setOtpValue(''); setOtpError(''); }}
        style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#9A8E85', fontWeight: 600, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        className="transition-opacity hover:opacity-60">
        ← Change account
      </button>
      <div className="flex items-center gap-4 mb-7">
        <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
        <span style={{ fontSize: '8px', color: GOLD, letterSpacing: '0.45em', fontWeight: 700, textTransform: 'uppercase' }}>Secure Verification</span>
        <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
      </div>
      <div className="mb-6 w-11 h-11 flex items-center justify-center"
        style={{ border: '1px solid rgba(157,126,63,0.35)', backgroundColor: 'rgba(157,126,63,0.07)' }}>
        <Lock className="w-4 h-4" style={{ color: GOLD }} strokeWidth={1.5} />
      </div>
      <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: DARK2, lineHeight: 1.06, marginBottom: '0.5rem' }}>
        Confirm your<br />identity.
      </h1>
      <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.65, marginBottom: '1.75rem', fontWeight: 300 }}>
        Enter the 6-digit code sent to your registered email or phone.
      </p>
      <div className="mb-6 p-4" style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: '1px solid rgba(157,126,63,0.22)' }}>
        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.38em', color: GOLD, fontWeight: 700, marginBottom: '5px' }}>Demo — your code</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '2rem', color: DARK2, letterSpacing: '0.25em', fontWeight: 300, lineHeight: 1 }}>{otpCode}</div>
      </div>
      <div className="mb-5">
        <label style={lbl}>Verification Code</label>
        <div className="mt-3">
          <InputOTP maxLength={6} value={otpValue} onChange={v => { setOtpValue(v); setOtpError(''); }} onComplete={handleVerifyOtp} containerClassName="gap-1.5">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <InputOTPSlot key={i} index={i}
                  className="rounded-none border-[#DDD4C4] data-[active]:border-[#9D7E3F] data-[active]:ring-[#9D7E3F]"
                  style={{ width: '48px', height: '56px', fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.3rem', color: DARK2 }} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <AnimatePresence>
        {otpError && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '13px', color: '#b94a38', marginBottom: '1rem' }}>
            {otpError}
          </motion.p>
        )}
      </AnimatePresence>
      <button onClick={handleVerifyOtp} disabled={otpValue.length < 6}
        className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ backgroundColor: DARK2, color: CREAM, height: '54px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
        <span>Verify &amp; Enter Portal</span>
        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );

  /* ── Form content ── */
  const FormContent = (
    <div className="w-full" style={{ maxWidth: '420px' }}>

      {/* Tab switcher */}
      <div className="flex mb-8" style={{ border: `1px solid ${BORDER}` }}>
        {(['login', 'register'] as const).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className="flex-1 flex items-center justify-center gap-2 transition-all"
            style={{
              height: '40px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700,
              backgroundColor: mode === m ? DARK2 : 'transparent',
              color: mode === m ? CREAM : '#9A8E85',
            }}>
            {m === 'login' ? 'Sign In' : 'New Account'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

          {/* Login */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(2rem, 5vw, 3rem)', color: DARK2, lineHeight: 1.06, marginBottom: '0.5rem' }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.65, marginBottom: '2rem', fontWeight: 300 }}>
                Enter your email and password to access your project portal.
              </p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div>
                  <label style={lbl}>Email Address *</label>
                  <input required type="email" value={lEmail} onChange={e => setLEmail(e.target.value)}
                    placeholder="jane@example.com" style={field}
                    onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                </div>
                <div>
                  <label style={lbl}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input required type={lShowPw ? 'text' : 'password'} value={lPassword}
                      onChange={e => setLPassword(e.target.value)}
                      placeholder="Your password" style={{ ...field, paddingRight: '36px' }}
                      onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                      onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                    <button type="button" onClick={() => setLShowPw(v => !v)}
                      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9A8E85', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      {lShowPw ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: '#b94a38', marginTop: '-0.75rem' }}>{error}</motion.p>}
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ backgroundColor: GOLD, color: WHITE, height: '54px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
                  {loading ? 'Signing in…' : <><span>Enter Portal</span><ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} /></>}
                </button>
              </form>
              <p style={{ fontSize: '11px', color: '#9A8E85', lineHeight: 1.65, marginTop: '1.25rem', fontWeight: 300 }}>
                Don't have an account?{' '}
                <button onClick={() => switchMode('register')} style={{ color: GOLD, fontWeight: 600, fontFamily: SERIF, fontStyle: 'italic' }}>
                  Apply for access →
                </button>
              </p>
            </>
          )}

          {/* Register */}
          {mode === 'register' && (
            <>
              <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(2rem, 5vw, 3rem)', color: DARK2, lineHeight: 1.06, marginBottom: '0.5rem' }}>
                Begin your<br />project journey.
              </h1>
              <p style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.65, marginBottom: '2rem', fontWeight: 300 }}>
                Tell us about yourself and your project. Our team reviews every application personally and will be in touch within 24–48 hours.
              </p>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                <div>
                  <label style={lbl}>Full Name *</label>
                  <input required value={rName} onChange={e => setRName(e.target.value)}
                    placeholder="Jane Smith" style={field}
                    onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                </div>
                <div>
                  <label style={lbl}>Email Address *</label>
                  <input required type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                    placeholder="jane@example.com" style={field}
                    onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                </div>
                <div>
                  <label style={lbl}>Phone Number *</label>
                  <input required type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)}
                    placeholder="(713) 555-0100" style={field}
                    onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                </div>
                <div>
                  <label style={lbl}>Create Password * <span style={{ opacity: 0.55, fontSize: '8px', textTransform: 'none', letterSpacing: '0' }}>min. 8 characters</span></label>
                  <div style={{ position: 'relative' }}>
                    <input required type={rShowPw ? 'text' : 'password'} value={rPassword}
                      onChange={e => setRPassword(e.target.value)} minLength={8}
                      placeholder="Create a secure password" style={{ ...field, paddingRight: '36px' }}
                      onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                      onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                    <button type="button" onClick={() => setRShowPw(v => !v)}
                      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9A8E85', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      {rShowPw ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Confirm Password *</label>
                  <input required type={rShowPw ? 'text' : 'password'} value={rPassword2}
                    onChange={e => setRPassword2(e.target.value)}
                    placeholder="Re-enter your password"
                    style={{ ...field, borderBottomColor: rPassword2 && rPassword2 !== rPassword ? '#b94a38' : BORDER }}
                    onFocus={e => (e.target.style.borderBottomColor = rPassword2 !== rPassword ? '#b94a38' : GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = rPassword2 && rPassword2 !== rPassword ? '#b94a38' : BORDER)} />
                  {rPassword2 && rPassword2 !== rPassword && (
                    <p style={{ fontSize: '11px', color: '#b94a38', marginTop: '4px', fontFamily: SERIF, fontStyle: 'italic' }}>Passwords don't match</p>
                  )}
                </div>

                {/* Project type dropdown */}
                <div>
                  <label style={lbl}>Project Type *</label>
                  <div className="relative mt-1">
                    <button type="button" onClick={() => setTypeOpen(o => !o)}
                      className="w-full flex items-center justify-between transition-colors"
                      style={{ ...field, padding: '16px 0 10px', display: 'flex', cursor: 'pointer', borderBottomColor: typeOpen ? GOLD : rType ? GOLD : BORDER }}>
                      <span style={{ color: rType ? DARK2 : '#9A8E85', fontWeight: rType ? 300 : 300 }}>
                        {rType || 'Select project type'}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#9A8E85', transform: typeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} strokeWidth={1.5} />
                    </button>
                    <AnimatePresence>
                      {typeOpen && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-0 right-0 z-50 mt-1 py-1"
                          style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
                          {PROJECT_TYPES.map(pt => (
                            <button key={pt.value} type="button"
                              onClick={() => { setRType(pt.value); setTypeOpen(false); }}
                              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAF7F2'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                              <div className="w-5 h-5 flex items-center justify-center mt-0.5 shrink-0"
                                style={{ backgroundColor: rType === pt.value ? 'rgba(157,126,63,0.1)' : 'transparent' }}>
                                <pt.icon className="w-3 h-3" style={{ color: GOLD }} strokeWidth={1.5} />
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: DARK2, lineHeight: 1.3 }}>{pt.value}</div>
                                <div style={{ fontSize: '10px', color: '#9A8E85', fontWeight: 300, lineHeight: 1.4, marginTop: '1px' }}>{pt.desc}</div>
                              </div>
                              {rType === pt.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0 mt-0.5" style={{ color: GOLD }} strokeWidth={2} />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Project Description <span style={{ opacity: 0.55, fontSize: '8px' }}>Brief overview</span></label>
                  <textarea value={rInterest} onChange={e => setRInterest(e.target.value)}
                    placeholder="Briefly describe your project — location, scope, timeline, and any key details that will help us understand your vision."
                    rows={3}
                    style={{ ...field, resize: 'none', paddingTop: '12px', lineHeight: '1.55', fontSize: '15px' }}
                    onFocus={e => (e.target.style.borderBottomColor = GOLD)}
                    onBlur={e => (e.target.style.borderBottomColor = BORDER)} />
                </div>

                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '14px', color: '#b94a38', marginTop: '-0.5rem' }}>{error}</motion.p>}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ backgroundColor: DARK2, color: CREAM, height: '54px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700 }}>
                  {loading ? 'Submitting…' : <><span>Submit Application</span><ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} /></>}
                </button>

                <p style={{ fontSize: '10px', color: '#9A8E85', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.65, marginTop: '-0.5rem' }}>
                  By submitting you consent to being contacted by a HOU INC consultant. Your information is kept strictly confidential.
                </p>
              </form>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 pt-5 flex items-center justify-end" style={{ borderTop: `1px solid ${BORDER}` }}>
        <Link to="/" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.26em', color: '#9A8E85', fontWeight: 600, textDecoration: 'none' }}
          className="transition-opacity hover:opacity-60">
          ← Back to Site
        </Link>
      </div>
    </div>
  );

  /* ── Determine which right-panel content to show ── */
  const rightContent = pendingApproval
    ? PendingContent
    : accountRejected
    ? RejectedContent
    : pendingOtp
    ? OtpContent
    : FormContent;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: DARK }}>

      {/* Mobile header */}
      <div className="lg:hidden relative overflow-hidden" style={{ backgroundColor: DARK }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.6 }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.15) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 80%, rgba(157,126,63,0.1) 0%, transparent 55%)' }} />
        <div className="absolute inset-0 flex items-center justify-end overflow-hidden pointer-events-none select-none" style={{ opacity: 0.04 }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '55vw', color: GOLD_L, lineHeight: 1, marginRight: '-5vw' }}>H</span>
        </div>
        <div className="relative z-10 px-6 sm:px-10 pt-8 pb-9">
          <Link to="/" className="inline-flex items-center gap-3 select-none mb-7">
            <div className="w-px h-7" style={{ backgroundColor: GOLD }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.38em', textTransform: 'uppercase', color: CREAM, fontFamily: SERIF }}>HOU INC</div>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.42em', fontWeight: 500, color: GOLD, marginTop: '2px' }}>
                Construction · Houston · Est. 1998
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-6" style={{ backgroundColor: GOLD, opacity: 0.5 }} />
            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 700, color: GOLD }}>Client Portal</span>
          </div>
          <h2 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 6.5vw, 42px)', color: CREAM, lineHeight: 1.1, marginBottom: '0.9rem' }}>
            Your dream home<br />
            <span style={{ color: GOLD_L }}>deserves a builder</span><br />
            who is always present.
          </h2>
          <p style={{ fontSize: '13px', color: '#C8BFB4', fontWeight: 300, lineHeight: 1.62, maxWidth: '460px' }}>
            A direct, private line to your HOU INC project team — from first conversation to the day we hand you the keys.
          </p>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.25 }} />
      </div>

      {/* Desktop left panel */}
      <div className="hidden lg:flex flex-col w-[46%] shrink-0 relative overflow-hidden" style={{ backgroundColor: DARK }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 40% 58%, rgba(157,126,63,0.08) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.14) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" style={{ opacity: 0.03 }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '34vw', color: GOLD_L, lineHeight: 1 }}>H</span>
        </div>
        <div className="absolute left-0 inset-y-0 w-px" style={{ backgroundColor: GOLD, opacity: 0.4 }} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.55 }} />

        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-14 py-12">
          <Link to="/" className="inline-flex flex-col gap-1 select-none">
            <div className="flex items-center gap-3">
              <div className="w-px h-6" style={{ backgroundColor: GOLD }} />
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.42em', textTransform: 'uppercase', color: CREAM, fontFamily: SERIF }}>HOU INC</span>
            </div>
            <div style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.46em', fontWeight: 500, color: GOLD, marginLeft: '16px' }}>
              Construction · Houston · Est. 1998
            </div>
          </Link>

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
              The HOU INC Client Portal gives you a direct, private line to your project team — from first consultation to the moment we hand you the keys.
            </p>
            <div style={{ borderTop: '1px solid rgba(157,126,63,0.22)' }}>
              {FEATURES.map(f => (
                <div key={f.n} className="flex items-start gap-5 py-3.5" style={{ borderBottom: '1px solid rgba(157,126,63,0.14)' }}>
                  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1rem', color: GOLD_L, lineHeight: 1, marginTop: '2px', minWidth: '22px' }}>{f.n}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 300, color: '#C4B9AE', lineHeight: 1.6 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="h-px mb-7" style={{ backgroundColor: 'rgba(157,126,63,0.22)' }} />
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '4.5rem', color: GOLD_L, lineHeight: 0.7, marginBottom: '6px', opacity: 0.45 }}>"</div>
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

      <div className="hidden lg:block w-px shrink-0" style={{ backgroundColor: GOLD, opacity: 0.22 }} />

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0" style={{ backgroundColor: WHITE }}>
        <div className="hidden lg:block absolute top-0 inset-x-0 h-px" style={{ backgroundColor: GOLD, opacity: 0.38 }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <motion.div className="relative z-10 w-full flex flex-col items-center px-6 sm:px-10 md:px-14 lg:px-12 xl:px-16 py-10 md:py-14"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pendingApproval ? 'pending' : accountRejected ? 'rejected' : pendingOtp ? 'otp' : mode}
              className="w-full flex flex-col items-center"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              {rightContent}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
