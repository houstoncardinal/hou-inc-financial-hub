import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, LayoutGrid, FileText, BarChart3, Receipt, Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

/* ── Explicit tokens — never rely on CSS vars that flip on dark themes ── */
const DARK   = '#09080A';
const PANEL  = '#0F0D10';
const W      = '#FFFFFF';
const CREAM  = '#FAF9F7';
const AC     = '#9D7E3F';
const ACL    = '#C4A76B';
const MU     = '#6B7280';
const BORDER = '#E5E1DA';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const FEATURES = [
  { icon: LayoutGrid, label: 'Financial Overview',  sub: 'KPI stats, cash flow, and activity feed' },
  { icon: FileText,   label: 'Check Management',    sub: 'Digital checks, ledger, and PDF register' },
  { icon: Receipt,    label: 'Invoicing & Billing', sub: 'Branded invoices with payment links' },
  { icon: BarChart3,  label: 'Analytics & Charts',  sub: 'Eight chart types across all financial data' },
];

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as any)?.from || '/finance';

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [focused,    setFocused]    = useState<'email' | 'pw' | null>(null);
  const [pendingOtp, setPendingOtp] = useState(false);
  const [otpCode,    setOtpCode]    = useState('');
  const [otpValue,   setOtpValue]   = useState('');
  const [otpError,   setOtpError]   = useState('');

  /* Only redirect when not waiting on OTP */
  useEffect(() => { if (user && !pendingOtp) navigate(from, { replace: true }); }, [user, pendingOtp, navigate, from]);

  const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { ok, error: err } = await signIn(email, password);
    setLoading(false);
    if (!ok) { setError(err ?? 'Sign-in failed.'); return; }
    const code = generateCode();
    setOtpCode(code);
    setPendingOtp(true);
  };

  const handleVerifyOtp = () => {
    if (otpValue.length < 6) return;
    if (otpValue === otpCode) {
      setPendingOtp(false);
      navigate(from, { replace: true });
    } else {
      setOtpError('Incorrect code. Please try again.');
      setOtpValue('');
    }
  };

  if (user && !pendingOtp) return null;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: CREAM }}>

      {/* ── Left: branded dark panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[48%] xl:w-[44%] shrink-0 flex-col relative overflow-hidden"
        style={{ backgroundColor: PANEL }}>

        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        {/* Gold glow bottom-left */}
        <div className="absolute bottom-0 left-0 w-[480px] h-[480px] pointer-events-none"
          style={{ background: `radial-gradient(circle at bottom left, rgba(157,126,63,0.12) 0%, transparent 65%)` }} />

        {/* Gold line — top accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ backgroundColor: AC, opacity: 0.5 }} />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-14 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-px h-8" style={{ backgroundColor: AC }} />
            <div>
              <div className="font-black tracking-[0.3em] uppercase" style={{ color: W, fontSize: '13px', fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.4em] font-semibold" style={{ color: ACL, opacity: 0.7 }}>Finance Sector · Secure Access</div>
            </div>
          </div>

          {/* Centre */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-5" style={{ color: ACL }}>
              Finance Dashboard
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, color: W, fontSize: 'clamp(28px, 2.6vw, 40px)', lineHeight: 1.15, marginBottom: 16 }}>
              The financial command<br />center for HOU INC.
            </div>
            <p className="mb-10 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', lineHeight: 1.7, fontWeight: 300 }}>
              End-to-end construction finance — from daily check management to executive-level analytics.
            </p>

            {/* Features */}
            <div className="space-y-0">
              {FEATURES.map((f, i) => (
                <motion.div key={f.label}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                  className="flex items-start gap-4 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: '1px solid rgba(157,126,63,0.22)' }}>
                    <f.icon className="w-3.5 h-3.5" style={{ color: ACL }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.label}</div>
                    <div className="text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.28)' }}>{f.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.18)' }} strokeWidth={1.5} />
            <span className="text-[8px] uppercase tracking-[0.26em] font-medium" style={{ color: 'rgba(255,255,255,0.18)' }}>
              HOU INC · Finance v1.0 · Internal access only
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Divider ── */}
      <div className="hidden lg:block w-px shrink-0" style={{ backgroundColor: BORDER }} />

      {/* ── Right: login form / OTP ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex flex-col items-center justify-center relative px-6 sm:px-10 xl:px-16 py-10"
        style={{ backgroundColor: CREAM }}>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5 self-start">
          <div className="w-px h-7" style={{ backgroundColor: AC }} />
          <div>
            <div className="font-black tracking-[0.28em] uppercase" style={{ color: DARK, fontSize: '12px', fontFamily: SERIF }}>HOU INC</div>
            <div className="text-[7px] uppercase tracking-[0.3em]" style={{ color: MU }}>Finance Dashboard</div>
          </div>
        </div>

        {/* Back to website */}
        {!pendingOtp && (
          <div className="absolute top-5 left-6 lg:left-auto lg:right-6">
            <Link to="/" className="text-[9px] uppercase tracking-[0.24em] font-semibold transition-colors"
              style={{ color: MU }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MU; }}>
              ← Website
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {pendingOtp ? (
            /* ── OTP verification ── */
            <motion.div key="otp"
              initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="w-full" style={{ maxWidth: '400px' }}>

              {/* Back */}
              <button
                onClick={() => { setPendingOtp(false); setOtpValue(''); setOtpError(''); }}
                className="text-[9px] uppercase tracking-[0.3em] font-semibold transition-colors mb-8 flex items-center gap-1.5"
                style={{ color: MU }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MU; }}>
                ← Back to sign-in
              </button>

              {/* Badge */}
              <div className="flex items-center gap-2 mb-8 px-3 py-2 w-fit"
                style={{ backgroundColor: 'rgba(157,126,63,0.07)', border: `1px solid rgba(157,126,63,0.2)` }}>
                <Shield className="w-3 h-3 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                <span className="text-[8px] uppercase tracking-[0.32em] font-bold" style={{ color: AC }}>Two-Factor Verification</span>
              </div>

              {/* Heading */}
              <div className="mb-6">
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, color: DARK, fontSize: '30px', lineHeight: 1.1, marginBottom: 8 }}>
                  Confirm your identity.
                </div>
                <p className="text-[13px] font-light" style={{ color: MU, lineHeight: 1.6 }}>
                  Enter the 6-digit code to complete sign-in.
                </p>
              </div>

              {/* Demo code */}
              <div className="mb-6 px-4 py-3" style={{ border: `1px solid ${BORDER}`, backgroundColor: W }}>
                <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-1.5" style={{ color: AC }}>Demo — your code</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.8rem', color: DARK, letterSpacing: '0.2em' }}>
                  {otpCode}
                </div>
              </div>

              {/* OTP input */}
              <div className="mb-4">
                <label className="block text-[9px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: MU }}>
                  Verification Code
                </label>
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(v) => { setOtpValue(v); setOtpError(''); }}
                  onComplete={handleVerifyOtp}
                  containerClassName="gap-1.5"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="rounded-none border-[#E5E1DA]"
                        style={{ width: '48px', height: '48px', fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.2rem', color: DARK }}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <AnimatePresence>
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-semibold mb-3"
                    style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#dc2626' }} />
                    {otpError}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleVerifyOtp}
                disabled={otpValue.length < 6}
                className="w-full flex items-center justify-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black transition-all"
                style={{
                  height: 50, backgroundColor: DARK, color: W, borderRadius: 0,
                  opacity: otpValue.length < 6 ? 0.4 : 1,
                  cursor: otpValue.length < 6 ? 'not-allowed' : 'pointer',
                }}>
                Verify Access <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>

              <p className="text-[9px] text-center mt-4 font-light" style={{ color: 'rgba(107,114,128,0.5)' }}>
                In production, this code is sent to your registered email.
              </p>
            </motion.div>

          ) : (
            /* ── Login form ── */
            <motion.div key="form"
              initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="w-full" style={{ maxWidth: '400px' }}>

              {/* Security badge */}
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="flex items-center gap-2 mb-8 px-3 py-2 self-start w-fit"
                style={{ backgroundColor: 'rgba(157,126,63,0.07)', border: `1px solid rgba(157,126,63,0.2)` }}>
                <Shield className="w-3 h-3 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                <span className="text-[8px] uppercase tracking-[0.32em] font-bold" style={{ color: AC }}>Secure · Encrypted Access</span>
              </motion.div>

              {/* Heading */}
              <div className="mb-8">
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, color: DARK, fontSize: '34px', lineHeight: 1.1, marginBottom: 8 }}>
                  Finance Dashboard
                </div>
                <p className="text-[13px] font-light" style={{ color: MU, lineHeight: 1.6 }}>
                  Sign in with your HOU INC credentials to access the finance system.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: MU }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="admin@houinc.com"
                    autoComplete="email"
                    className="w-full text-[14px] outline-none transition-all"
                    style={{
                      height: 48,
                      padding: '0 14px',
                      borderRadius: 0,
                      backgroundColor: W,
                      border: `1px solid ${focused === 'email' ? AC : BORDER}`,
                      color: DARK,
                      boxShadow: focused === 'email' ? `0 0 0 3px rgba(157,126,63,0.08)` : 'none',
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: MU }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('pw')}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full text-[14px] outline-none transition-all"
                      style={{
                        height: 48,
                        padding: '0 44px 0 14px',
                        borderRadius: 0,
                        backgroundColor: W,
                        border: `1px solid ${focused === 'pw' ? AC : BORDER}`,
                        color: DARK,
                        boxShadow: focused === 'pw' ? `0 0 0 3px rgba(157,126,63,0.08)` : 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      tabIndex={-1}
                      style={{ color: MU }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MU; }}>
                      {showPw ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-semibold"
                      style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#dc2626' }} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full flex items-center justify-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black transition-all"
                  style={{
                    height: 50,
                    backgroundColor: loading ? 'rgba(10,8,10,0.7)' : DARK,
                    color: W,
                    borderRadius: 0,
                    opacity: !email || !password ? 0.4 : 1,
                    cursor: !email || !password ? 'not-allowed' : 'pointer',
                  }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                      Signing in…
                    </span>
                  ) : (
                    <>Sign In <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></>
                  )}
                </button>
              </form>


              <p className="text-[9px] text-center mt-6 font-light" style={{ color: 'rgba(107,114,128,0.6)' }}>
                Internal HOU INC system · Unauthorized access prohibited
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
