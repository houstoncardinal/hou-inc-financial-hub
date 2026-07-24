import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowRight, Shield, Lock, Mail, Clock, CheckCircle2, AlertCircle,
  LayoutGrid, FileText, BarChart3, Receipt, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMyAdminAccessRequests } from '@/hooks/useAdminAccessRequests';
import { ENTITIES } from '@/contexts/EntityContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

/* ── Same dark/light split, monochrome-accent, Cormorant-Garamond-serif
   design language as the client portal sign-in (PortalAuth.tsx) — reused
   here with finance/admin-specific copy and content, plus its own tablet
   breakpoint treatment (portal only splits at lg; this screen keeps three
   genuinely distinct layouts as previously established). ── */
const DARK   = '#07060A';
const PANEL  = '#FAFAF8';
const ACCENT = '#000000';
const INK    = '#111827';
const MUTED  = '#6B7280';
const BDR    = '#E5E7EB';
const ERR    = '#B94444';
const SF     = "'Cormorant Garamond', Georgia, serif";

const FEATURES = [
  { icon: LayoutGrid, label: 'Financial Overview',  sub: 'KPI stats, cash flow, and activity feed' },
  { icon: FileText,   label: 'Check Management',    sub: 'Digital checks, ledger, and PDF register' },
  { icon: Receipt,    label: 'Invoicing & Billing', sub: 'Branded invoices with payment links' },
  { icon: BarChart3,  label: 'Analytics & Charts',  sub: 'Eight chart types across all financial data' },
];

/* ── Shared underline-style field primitives (no boxes, no border-radius —
   matches the portal exactly) ─────────────────────────────────────── */
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

function PwFld({
  label, hint, value, onChange, placeholder, show, onToggle, required, invalid, id, autoComplete,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder: string; show: boolean; onToggle: () => void; required?: boolean; invalid?: boolean;
  id?: string; autoComplete?: string;
}) {
  return (
    <Fld label={label} hint={hint}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={{ ...F, paddingRight: 32, borderBottomColor: invalid ? ERR : BDR }}
          onFocus={e => (e.target.style.borderBottomColor = invalid ? ERR : ACCENT)}
          onBlur={e => (e.target.style.borderBottomColor = invalid ? ERR : BDR)}
        />
        <button type="button" onClick={onToggle} tabIndex={-1}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: MUTED,
            padding: 4, display: 'flex', alignItems: 'center',
          }}>
          {show
            ? <EyeOff style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            : <Eye style={{ width: 14, height: 14 }} strokeWidth={1.5} />}
        </button>
      </div>
    </Fld>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        fontSize: 12, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
      <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={2} />
      {message}
    </motion.p>
  );
}

function IconBadge({ icon: Icon }: { icon: React.ComponentType<any> }) {
  return (
    <div style={{
      width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.25)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    }}>
      <Icon style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 700, color: ACCENT, marginBottom: 14 }}>
      {children}
    </div>
  );
}

const pillBtn = (bg: string, disabled?: boolean): React.CSSProperties => ({
  backgroundColor: bg, color: '#fff', height: 52, width: '100%', borderRadius: 999,
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 700,
  border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 10,
});

export default function Auth() {
  const { user, signIn, signUp, requestPasswordReset, updatePassword, passwordRecovery } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const defaultDest = user?.role === 'client' ? '/portal/dashboard' : '/finance/select';
  const from = (location.state as { from?: string } | null)?.from || defaultDest;

  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign in
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [pendingOtp, setPendingOtp] = useState(false);
  const [otpCode,    setOtpCode]    = useState('');
  const [otpValue,   setOtpValue]   = useState('');
  const [otpError,   setOtpError]   = useState('');

  // Sign up
  const [suName,     setSuName]     = useState('');
  const [suEmail,    setSuEmail]    = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm,  setSuConfirm]  = useState('');
  const [suShowPw,   setSuShowPw]   = useState(false);
  const [suError,    setSuError]    = useState('');
  const [suLoading,  setSuLoading]  = useState(false);
  const [suDone,     setSuDone]     = useState(false);

  // Forgot password
  const [fpEmail,   setFpEmail]   = useState('');
  const [fpError,   setFpError]   = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSent,    setFpSent]    = useState(false);

  // Reset password (arrived via recovery email link)
  const [newPw,        setNewPw]        = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [resetError,   setResetError]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone,    setResetDone]    = useState(false);

  /* Only auto-redirect once we're sure this session isn't waiting on OTP,
     isn't a password-recovery link, and isn't a 'pending' account still
     awaiting admin approval — all three render their own view in place
     instead of navigating anywhere. */
  useEffect(() => {
    if (user && !pendingOtp && !passwordRecovery && user.role !== 'pending') {
      const dest = user.role === 'client' ? '/portal/dashboard' : from;
      navigate(dest, { replace: true });
    }
  }, [user, pendingOtp, passwordRecovery, navigate, from]);

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
      const dest = user?.role === 'client' ? '/portal/dashboard' : from;
      navigate(dest, { replace: true });
    } else {
      setOtpError('Incorrect code. Please try again.');
      setOtpValue('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError('');
    if (suPassword.length < 6) { setSuError('Password must be at least 6 characters.'); return; }
    if (suPassword !== suConfirm) { setSuError('Passwords do not match.'); return; }
    setSuLoading(true);
    const { ok, error: err } = await signUp(suName, suEmail, suPassword);
    setSuLoading(false);
    if (!ok) { setSuError(err ?? 'Could not create your account.'); return; }
    setSuDone(true);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    const { ok, error: err } = await requestPasswordReset(fpEmail);
    setFpLoading(false);
    if (!ok) { setFpError(err ?? 'Could not send reset email.'); return; }
    setFpSent(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPw.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    if (newPw !== newPwConfirm) { setResetError('Passwords do not match.'); return; }
    setResetLoading(true);
    const { ok, error: err } = await updatePassword(newPw);
    setResetLoading(false);
    if (!ok) { setResetError(err ?? 'Could not update password.'); return; }
    setResetDone(true);
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setView(m); setError(''); setSuError('');
  };

  // ── Highest-priority view: arrived via a password-recovery email link ──
  if (passwordRecovery) {
    return (
      <AuthShell>
        <motion.div key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full" style={{ maxWidth: 440 }}>
          <IconBadge icon={Lock} />
          <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 36px)', color: INK, lineHeight: 1.08, marginBottom: 8 }}>
            {resetDone ? 'Password updated.' : 'Set a new password.'}
          </h1>
          {resetDone ? (
            <>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <button onClick={() => window.location.href = '/auth'} className="transition-opacity hover:opacity-85" style={pillBtn(ACCENT)}>
                <span>Continue to Sign In</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} />
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300, marginBottom: 28 }}>
                Choose a new password for your account.
              </p>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                <PwFld label="New Password" hint="min. 6 chars" value={newPw} onChange={setNewPw}
                  placeholder="Create new password" show={showPw} onToggle={() => setShowPw(s => !s)} required autoComplete="new-password" />
                <PwFld label="Confirm New Password" value={newPwConfirm} onChange={setNewPwConfirm}
                  placeholder="Re-enter password" show={showPw} onToggle={() => setShowPw(s => !s)} required autoComplete="new-password"
                  invalid={!!newPwConfirm && newPwConfirm !== newPw} />
                {newPwConfirm && newPwConfirm !== newPw && (
                  <p style={{ fontSize: 11, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -16 }}>Passwords don't match</p>
                )}
                <AnimatePresence>{resetError && <ErrorText message={resetError} />}</AnimatePresence>
                <button type="submit" disabled={resetLoading} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={pillBtn(ACCENT, resetLoading)}>
                  {resetLoading ? 'Updating…' : <><span>Update Password</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </AuthShell>
    );
  }

  // ── 'pending' accounts render in place instead of being routed anywhere ──
  if (user && !pendingOtp && user.role === 'pending') {
    return <PendingApprovalView />;
  }

  if (user && !pendingOtp) return null;

  return (
    <AuthShell>
      <AnimatePresence mode="wait" initial={false}>
        {pendingOtp ? (
          <motion.div key="otp" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-full" style={{ maxWidth: 440 }}>
            <button onClick={() => { setPendingOtp(false); setOtpValue(''); setOtpError(''); }}
              style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 28, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to sign in
            </button>
            <IconBadge icon={Shield} />
            <Eyebrow>Two-Factor Verification</Eyebrow>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 36px)', color: INK, lineHeight: 1.08, marginBottom: 8 }}>
              Confirm your identity.
            </h1>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300, marginBottom: 24 }}>
              Enter the 6-digit code to complete sign-in.
            </p>
            <div style={{ padding: 20, marginBottom: 24, backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.14)' }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: ACCENT, marginBottom: 8 }}>Demo — your code</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: INK, letterSpacing: '0.15em', fontVariantNumeric: 'tabular-nums' }}>{otpCode}</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={LBL}>Verification Code</label>
              <div style={{ marginTop: 10 }}>
                <InputOTP maxLength={6} value={otpValue} onChange={(v) => { setOtpValue(v); setOtpError(''); }} onComplete={handleVerifyOtp} containerClassName="gap-2">
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="rounded-none border-gray-300 text-gray-900 font-bold text-[18px]" style={{ width: 46, height: 48 }} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <AnimatePresence>{otpError && <ErrorText message={otpError} />}</AnimatePresence>
            <button onClick={handleVerifyOtp} disabled={otpValue.length < 6} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={{ ...pillBtn(ACCENT, otpValue.length < 6), marginTop: 12 }}>
              <span>Verify Access</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} />
            </button>
            <p style={{ fontSize: 10.5, textAlign: 'center', marginTop: 16, color: MUTED }}>In production, this code is sent to your registered email.</p>
          </motion.div>

        ) : view === 'forgot' ? (
          <motion.div key="forgot" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-full" style={{ maxWidth: 440 }}>
            <button onClick={() => { setView('signin'); setFpSent(false); setFpError(''); }}
              style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 28, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to sign in
            </button>
            <IconBadge icon={Mail} />
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 36px)', color: INK, lineHeight: 1.08, marginBottom: 8 }}>
              Reset your password.
            </h1>
            {fpSent ? (
              <>
                <div style={{ padding: 20, marginBottom: 24, backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.14)' }}>
                  <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: ACCENT, marginBottom: 10 }}>Check your inbox</div>
                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300 }}>
                    If <strong style={{ color: INK, fontWeight: 600 }}>{fpEmail}</strong> has an account, a password reset link is on its way — it expires in 1 hour.
                  </p>
                </div>
                <button onClick={() => { setView('signin'); setFpSent(false); }} className="transition-opacity hover:opacity-85" style={pillBtn(ACCENT)}>
                  Back to Sign In
                </button>
              </>
            ) : (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300 }}>
                  Enter your email and we'll send you a secure link to reset your password.
                </p>
                <Fld label="Email Address">
                  <input type="email" required value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                    placeholder="you@houinc.com" autoComplete="email" style={F}
                    onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                    onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                </Fld>
                <AnimatePresence>{fpError && <ErrorText message={fpError} />}</AnimatePresence>
                <button type="submit" disabled={fpLoading} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={pillBtn(ACCENT, fpLoading)}>
                  {fpLoading ? 'Sending…' : <><span>Send Reset Link</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                </button>
              </form>
            )}
          </motion.div>

        ) : suDone ? (
          <motion.div key="signup-done" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-full" style={{ maxWidth: 440 }}>
            <IconBadge icon={Mail} />
            <Eyebrow>Confirm Your Email</Eyebrow>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 38px)', color: INK, lineHeight: 1.08, marginBottom: 12 }}>
              Check your inbox.
            </h1>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
              We sent a confirmation link to <strong style={{ fontWeight: 600, color: INK }}>{suEmail}</strong>. Click it to activate
              your account, then come back here to sign in — an admin will still need to approve dashboard access afterward.
            </p>
            <button onClick={() => { setView('signin'); setSuDone(false); setEmail(suEmail); }} className="transition-opacity hover:opacity-85" style={pillBtn(ACCENT)}>
              <span>Continue to Sign In</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} />
            </button>
          </motion.div>

        ) : (
          <motion.div key={`form-${view}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-full" style={{ maxWidth: 440 }}>

            {/* Tab switcher */}
            <div className="flex gap-8 mb-9" style={{ borderBottom: `1px solid ${BDR}` }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className="relative pb-4 transition-colors"
                  style={{
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                    fontWeight: 700, color: view === m ? INK : MUTED,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 16px',
                  }}>
                  {m === 'signin' ? 'Sign In' : 'New Account'}
                  {view === m && (
                    <motion.div layoutId="tab-bar" className="absolute bottom-0 left-0 right-0"
                      style={{ height: 2, backgroundColor: ACCENT }}
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4.5vw, 40px)', color: INK, lineHeight: 1.08, marginBottom: 9 }}>
                {view === 'signin' ? 'Welcome back.' : 'Create your account.'}
              </h1>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.66, fontWeight: 300 }}>
                {view === 'signin'
                  ? 'Enter your HOU INC credentials to access the finance system.'
                  : 'New staff accounts start with no access — an admin approves your request before you can sign in to any dashboard.'}
              </p>
            </div>

            {view === 'signin' ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                <Fld label="Email Address">
                  <input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@houinc.com" autoComplete="email" style={F}
                    onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                    onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                </Fld>
                <div>
                  <PwFld id="auth-password" label="Password" value={password} onChange={setPassword}
                    placeholder="Your password" show={showPw} onToggle={() => setShowPw(s => !s)} required autoComplete="current-password" />
                  <button type="button" onClick={() => { setView('forgot'); setFpEmail(email); setFpSent(false); }}
                    style={{ marginTop: 8, fontSize: 11, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontStyle: 'italic', fontFamily: SF }}
                    className="transition-opacity hover:opacity-70">
                    Forgot password?
                  </button>
                </div>
                <AnimatePresence>{error && <ErrorText message={error} />}</AnimatePresence>
                <button type="submit" disabled={loading || !email || !password} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={pillBtn(ACCENT, loading)}>
                  {loading ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                      <span>Signing in…</span>
                    </>
                  ) : (<><span>Sign In</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>)}
                </button>
                <p style={{ fontSize: 10.5, textAlign: 'center', color: MUTED, opacity: 0.8 }}>Internal HOU INC system · Unauthorized access prohibited</p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <Fld label="Full Name">
                  <input type="text" required value={suName} onChange={e => setSuName(e.target.value)}
                    placeholder="Jane Smith" autoComplete="name" style={F}
                    onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                    onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                </Fld>
                <Fld label="Email Address">
                  <input type="email" required value={suEmail} onChange={e => setSuEmail(e.target.value)}
                    placeholder="you@houinc.com" autoComplete="email" style={F}
                    onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                    onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                </Fld>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                  <PwFld label="Password" hint="min. 6 chars" value={suPassword} onChange={setSuPassword}
                    placeholder="Create password" show={suShowPw} onToggle={() => setSuShowPw(s => !s)} required autoComplete="new-password" />
                  <PwFld label="Confirm Password" value={suConfirm} onChange={setSuConfirm}
                    placeholder="Re-enter" show={suShowPw} onToggle={() => setSuShowPw(s => !s)} required autoComplete="new-password"
                    invalid={!!suConfirm && suConfirm !== suPassword} />
                </div>
                {suConfirm && suConfirm !== suPassword && (
                  <p style={{ fontSize: 11, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -10 }}>Passwords don't match</p>
                )}
                <AnimatePresence>{suError && <ErrorText message={suError} />}</AnimatePresence>
                <button type="submit" disabled={suLoading} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={pillBtn(INK, suLoading)}>
                  {suLoading ? 'Creating account…' : <><span>Create Account</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                </button>
                <p style={{ fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 1.65, marginTop: -6 }}>
                  Your request is reviewed personally before any dashboard access is granted.
                </p>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

/* ── Page chrome: dark brand panel (desktop) / dark horizontal banner
   (tablet) / minimal light header (mobile) + the form panel. Three
   genuinely distinct breakpoint treatments sharing the portal's dark/light
   split and monochrome accent language. ── */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ backgroundColor: DARK }}>

      {/* Desktop dark brand panel — lg+ only */}
      <aside className="hidden lg:flex flex-col w-[44%] xl:w-[42%] shrink-0 relative overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 35% 52%, rgba(255,255,255,0.05) 0%, transparent 62%)' }} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: '#fff', opacity: 0.18 }} />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-12">
          <Link to="/" className="inline-flex items-center select-none">
            <img src="/helogo-white.png" alt="Houston Enterprise" className="h-7 w-auto object-contain" />
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.46em', fontWeight: 700, color: '#fff', marginBottom: 22, opacity: 0.6 }}>
              Staff &amp; Admin Access
            </div>
            <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(38px, 3.6vw, 58px)', color: '#FAF8F4', lineHeight: 1.07, letterSpacing: '-0.01em', marginBottom: 22 }}>
              The financial<br />command center<br /><span style={{ color: 'rgba(255,255,255,0.45)' }}>for HOU INC.</span>
            </h1>
            <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.74, color: 'rgba(255,255,255,0.32)', maxWidth: '30ch', marginBottom: 32 }}>
              End-to-end construction finance — from daily check management to executive-level analytics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {FEATURES.map((f, i) => (
                <motion.div key={f.label}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: 'easeOut' }}
                  className="flex items-start gap-3">
                  <div style={{ width: 26, height: 26, flexShrink: 0, border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <f.icon style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.6} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#FAF8F4' }}>{f.label}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', fontWeight: 300, marginTop: 1 }}>{f.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22 }}>
            {['Encrypted, role-based access', 'Every action logged & auditable', 'HOU INC · Finance v1.0'].map(line => (
              <div key={line} style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.03em', color: 'rgba(255,255,255,0.2)', marginBottom: 7, lineHeight: 1.5 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Tablet dark banner — md to lg only, genuinely different from both desktop and mobile */}
      <div className="hidden md:flex lg:hidden items-center justify-between px-8 py-5 relative overflow-hidden" style={{ backgroundColor: DARK, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-center gap-4">
          <img src="/helogo-white.png" alt="Houston Enterprise" className="h-6 w-auto object-contain" />
          <div className="w-px h-8" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>Staff &amp; Admin Access</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, marginTop: 2 }}>The financial command center for HOU INC.</div>
          </div>
        </div>
        <div className="relative hidden sm:flex items-center gap-1.5">
          <Lock style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }} strokeWidth={2} />
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Internal access only</span>
        </div>
      </div>

      {/* Mobile header — below md only, light */}
      <div className="md:hidden flex items-center px-5 py-4" style={{ backgroundColor: PANEL }}>
        <img src="/helogo.png" alt="Houston Enterprise" className="h-6 w-auto object-contain" />
      </div>

      {/* Form panel — always present */}
      <main className="flex-1 relative flex flex-col" style={{ backgroundColor: PANEL }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

        <div className="relative flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-6 sm:px-10 py-12 lg:py-16">
            {children}

            <div className="mt-10 w-full" style={{ maxWidth: 440 }}>
              <Link to="/"
                style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 600, color: MUTED, textDecoration: 'none', opacity: 0.65 }}
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

/* ── Rendered in place of the normal sign-in flow whenever the signed-in
   user's role is 'pending' — lets them submit/track an admin access request
   without ever touching a finance/admin route while unapproved. ── */
function PendingApprovalView() {
  const { user, signOut } = useAuth();
  const { requests, loading, submit } = useMyAdminAccessRequests();
  const [entityId, setEntityId] = useState(ENTITIES[0]?.id ?? '');
  const [reason, setReason]     = useState('');
  const [subError, setSubError] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  const pending = requests.find(r => r.status === 'pending');
  const latest = requests[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError('');
    setSubLoading(true);
    const { ok, error } = await submit(entityId, reason);
    setSubLoading(false);
    if (!ok) setSubError(error ?? 'Could not submit your request.');
  };

  return (
    <AuthShell>
      <div className="w-full" style={{ maxWidth: 440 }}>
        <IconBadge icon={Clock} />
        <Eyebrow>Awaiting Approval</Eyebrow>
        <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 36px)', color: INK, lineHeight: 1.1, marginBottom: 12 }}>
          Hi {user?.user_metadata?.full_name?.split(' ')[0] || 'there'} — your account is pending.
        </h1>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 26 }}>
          Your account was created but doesn't have dashboard access yet. Submit a request below and an admin will review it.
        </p>

        {loading ? (
          <div style={{ height: 90, marginBottom: 26, background: 'rgba(0,0,0,0.04)' }} className="animate-pulse" />
        ) : pending ? (
          <div style={{ padding: 18, marginBottom: 26, backgroundColor: 'rgba(217,119,6,0.05)', borderLeft: '2px solid #b45309' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Clock style={{ width: 13, height: 13, color: '#b45309' }} strokeWidth={2} />
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, color: '#b45309' }}>Request Pending</span>
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, fontWeight: 300 }}>
              Admin access to <strong style={{ color: INK, fontWeight: 600 }}>{ENTITIES.find(e => e.id === pending.entity_id)?.name ?? pending.entity_id}</strong> requested{' '}
              {new Date(pending.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. You'll get access as soon as it's approved.
            </p>
          </div>
        ) : latest?.status === 'denied' ? (
          <div style={{ padding: 18, marginBottom: 26, background: 'rgba(185,68,68,0.05)', borderLeft: `2px solid ${ERR}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertCircle style={{ width: 13, height: 13, color: ERR }} strokeWidth={2} />
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, color: ERR }}>Previous Request Declined</span>
            </div>
            {latest.review_notes && <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 4, fontWeight: 300 }}>{latest.review_notes}</p>}
            <p style={{ fontSize: 11.5, color: MUTED, fontWeight: 300 }}>You can submit a new request below.</p>
          </div>
        ) : null}

        {!pending && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 26 }}>
            <Fld label="Entity">
              <div style={{ position: 'relative' }}>
                <select value={entityId} onChange={e => setEntityId(e.target.value)}
                  style={{ ...F, appearance: 'none', paddingRight: 20, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                  onBlur={e => (e.target.style.borderBottomColor = BDR)}>
                  {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: MUTED, pointerEvents: 'none' }} strokeWidth={1.5} />
              </div>
            </Fld>
            <Fld label="Reason" hint="optional">
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                style={{ ...F, resize: 'none', paddingTop: 12, lineHeight: 1.55 }}
                placeholder="e.g. I'm the office manager for Houston Enterprise and need to manage client accounts."
                onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                onBlur={e => (e.target.style.borderBottomColor = BDR)} />
            </Fld>
            <AnimatePresence>{subError && <ErrorText message={subError} />}</AnimatePresence>
            <button type="submit" disabled={subLoading} className="transition-opacity hover:opacity-85 disabled:opacity-40" style={pillBtn(ACCENT, subLoading)}>
              {subLoading ? 'Submitting…' : <><span>Request Admin Access</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
            </button>
          </form>
        )}

        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${BDR}`, height: 48, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: MUTED, background: 'none', cursor: 'pointer' }}>
            Check Again
          </button>
          <button onClick={signOut} className="flex-1 flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ backgroundColor: INK, height: 48, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: PANEL, border: 'none', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
