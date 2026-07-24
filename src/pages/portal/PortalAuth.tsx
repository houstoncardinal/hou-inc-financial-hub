import { useState, useEffect } from 'react';
import PhoneInput from '@/components/ui/smart/PhoneInput';
import EmailInput from '@/components/ui/smart/EmailInput';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, ChevronDown, CheckCircle2, ArrowRight,
  Lock, Clock, XCircle, Home, Building2, Mail, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortal } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Design tokens — black accent everywhere on the light form panel;
   the dark brand panel keeps its own near-white accent since black-on-
   near-black would be invisible there. ── */
const DARK  = '#07060A';
const PANEL = '#FAFAF8';
const ACCENT      = '#000000';
const ACCENT_SOFT = '#404040';
const DARK_ACCENT = '#FFFFFF';
const INK   = '#111827';
const MUTED = '#6B7280';
const BDR   = '#E5E7EB';
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
  label, hint, value, onChange, placeholder, show, onToggle, required, invalid,
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
          onFocus={e => (e.target.style.borderBottomColor = invalid ? ERR : ACCENT)}
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
  const { client, register, login, completeRegistration, refreshClient } = usePortal();
  const navigate = useNavigate();

  /* ── UI state ── */
  const [mode,            setMode]            = useState<'login' | 'register'>('login');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [accountRejected, setAccountRejected] = useState(false);
  const [confirmSent,     setConfirmSent]     = useState(false);
  const [confirmEmail,    setConfirmEmail]    = useState('');

  /* ── Forgot password ── */
  const [showForgot,      setShowForgot]      = useState(false);
  const [forgotEmail,     setForgotEmail]     = useState('');
  const [forgotSent,      setForgotSent]      = useState(false);
  const [forgotLoading,   setForgotLoading]   = useState(false);

  /* ── Magic link login ── */
  const [magicMode,       setMagicMode]       = useState(false);
  const [magicEmail,      setMagicEmail]      = useState('');
  const [magicSent,       setMagicSent]       = useState(false);
  const [magicLoading,    setMagicLoading]    = useState(false);

  /* ── Password reset (returning from email link) ── */
  const [resetMode,       setResetMode]       = useState(false);
  const [resetEmail,      setResetEmail]      = useState('');
  const [resetPw,         setResetPw]         = useState('');
  const [resetPw2,        setResetPw2]        = useState('');
  const [resetShow,       setResetShow]       = useState(false);
  const [resetLoading,    setResetLoading]    = useState(false);
  const [resetDone,       setResetDone]       = useState(false);
  const [resetError,      setResetError]      = useState('');

  /* ── Verifying magic link on return ── */
  const [verifying,       setVerifying]       = useState(false);
  const [verifyError,     setVerifyError]     = useState('');

  /* ── Login fields ── */
  const [lEmail,  setLEmail]  = useState('');
  const [lPw,     setLPw]     = useState('');
  const [lShow,   setLShow]   = useState(false);

  /* ── Register fields ── */
  const [rName,    setRName]   = useState('');
  const [rEmail,   setREmail]  = useState('');
  const [rPhone,   setRPhone]  = useState('');
  const [rPw,      setRPw]     = useState('');
  const [rPw2,     setRPw2]    = useState('');
  const [rShow,    setRShow]   = useState(false);
  const [rType,    setRType]   = useState('');
  const [rNotes,   setRNotes]  = useState('');
  const [typeOpen, setTypeOpen] = useState(false);

  /* ── Detect returning magic link / reset link / registration confirmation ──
     PASSWORD_RECOVERY is the authoritative signal for a real Supabase reset-
     password link: it fires regardless of whether the link uses a hash
     access_token (implicit flow) or a ?code= param (PKCE flow), and regardless
     of who triggered the email (this app's "forgot password" form, or a
     recovery email sent directly from the Supabase dashboard) — so relying on
     it means the reset form always opens, instead of silently falling through
     to a normal login and dropping the user on the dashboard. The ?reset=true
     query flag is kept as a secondary signal for the same-tab case where the
     event fires before this effect has a listener attached. ── */
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const isReset    = params.get('reset') === 'true';
    const isRegister = params.get('register') === 'true';
    const recovery = { current: false };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user?.email) {
        recovery.current = true;
        window.history.replaceState({}, '', '/portal');
        setVerifying(false);
        setResetEmail(session.user.email);
        setResetMode(true);
      }
    });

    if (!hash.includes('access_token') && !isReset && !isRegister) {
      return () => sub.subscription.unsubscribe();
    }

    setVerifying(true);
    window.history.replaceState({}, '', '/portal');

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (recovery.current) return;
      if (!session?.user?.email) {
        setVerifying(false);
        setVerifyError('Your link has expired or is invalid. Please request a new one.');
        return;
      }
      const email = session.user.email;

      if (isReset) {
        setResetEmail(email);
        setVerifying(false);
        setResetMode(true);
        return;
      }

      if (isRegister) {
        // Confirmed via the registration email — create the profile row now
        // that a real session exists, then link any pending invite.
        const { ok, status, error: err, client: newClient } = await completeRegistration();
        const inviteToken = (session.user.user_metadata as any)?.invite_token;
        if (ok && inviteToken && newClient?.id) {
          await (supabase as any).rpc('consume_portal_invite', { p_token: inviteToken, p_client_id: newClient.id });
        }
        setVerifying(false);
        if (!ok) { setVerifyError(err ?? 'Could not finish setting up your account.'); return; }
        if (status === 'pending_approval') { setPendingApproval(true); return; }
        if (status === 'rejected') { setAccountRejected(true); return; }
        navigate('/portal/dashboard', { replace: true });
        return;
      }

      // Plain magic link login — bridge the confirmed Supabase session to the portal client
      const { ok, status, error: err } = await refreshClient();
      setVerifying(false);
      if (!ok) { setVerifyError(err ?? 'No portal account found for this email.'); return; }
      if (status === 'pending_approval') { setPendingApproval(true); return; }
      if (status === 'rejected') { setAccountRejected(true); return; }
      navigate('/portal/dashboard', { replace: true });
    });

    return () => sub.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Session redirect — in an effect, not during render, so this never
     fires a setState-on-a-different-component warning from calling
     navigate() synchronously while PortalAuth itself is rendering. ── */
  const shouldRedirectToDashboard =
    !!client && !pendingApproval && !accountRejected && !resetMode &&
    (!client.status || client.status === 'approved');

  useEffect(() => {
    if (shouldRedirectToDashboard) navigate('/portal/dashboard', { replace: true });
  }, [shouldRedirectToDashboard, navigate]);

  if (shouldRedirectToDashboard) return null;

  /* ── Helpers ── */
  const switchMode = (m: typeof mode) => {
    setMode(m); setError(''); setShowForgot(false); setMagicMode(false); setMagicSent(false);
  };
  const pwMismatch = !!rPw2 && rPw2 !== rPw;

  /* ── Handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { ok, status, error: err } = await login(lEmail.trim(), lPw);
    setLoading(false);
    if (!ok) { setError(err ?? 'Incorrect email or password.'); return; }
    if (status === 'pending_approval') { setPendingApproval(true); return; }
    if (status === 'rejected') { setAccountRejected(true); return; }
    navigate('/portal/dashboard');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rType) { setError('Please select a project type.'); return; }
    if (rPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (rPw !== rPw2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { ok, needsConfirmation, error: err } = await register(rName.trim(), rEmail.trim(), rPhone.trim(), rType, rNotes.trim(), rPw);
    setLoading(false);
    if (!ok) { setError(err ?? 'Registration failed — please try again.'); return; }
    if (needsConfirmation) { setConfirmEmail(rEmail.trim()); setConfirmSent(true); return; }
    setPendingApproval(true);
  };

  /* ── Forgot password → real Supabase password-recovery email. Using
     resetPasswordForEmail (not signInWithOtp) means: it never silently
     creates a new account for a mistyped/unregistered address, it fires the
     PASSWORD_RECOVERY event on return (see effect above) instead of a plain
     sign-in, and it sends Supabase's actual "Reset Password" email template. ── */
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/portal?reset=true`,
    });
    setForgotLoading(false);
    setForgotSent(true);
  };

  /* ── Magic link login → sends email, user clicks to auto-login ── */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.trim()) return;
    setMagicLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/portal`,
      },
    });
    setMagicLoading(false);
    if (err) { setError(err.message); return; }
    setMagicSent(true);
  };

  /* ── Password reset form ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetPw.length < 8) { setResetError('Password must be at least 8 characters.'); return; }
    if (resetPw !== resetPw2) { setResetError('Passwords do not match.'); return; }
    setResetLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: resetPw });
    setResetLoading(false);
    if (err) { setResetError('Failed to update password. Please try again.'); return; }
    setResetDone(true);
  };

  /* ── Current view key ── */
  type View = 'verifying' | 'reset' | 'form' | 'forgot' | 'pending' | 'rejected' | 'confirm';
  const view: View = verifying ? 'verifying'
    : resetMode ? 'reset'
    : confirmSent ? 'confirm'
    : pendingApproval ? 'pending'
    : accountRejected ? 'rejected'
    : showForgot ? 'forgot'
    : 'form';

  /* ════ RENDER ════ */
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: DARK }}>

      {/* ── LEFT BRAND PANEL (desktop only) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-[42%] shrink-0 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 35% 52%, rgba(255,255,255,0.05) 0%, transparent 62%)',
        }} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ backgroundColor: DARK_ACCENT, opacity: 0.18 }} />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-12">
          <Link to="/" className="inline-flex items-center gap-3 select-none">
            <div style={{ width: 2, height: 26, backgroundColor: DARK_ACCENT, opacity: 0.7 }} />
            <div>
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: '0.42em',
                textTransform: 'uppercase', color: '#FAF8F4', fontFamily: SF,
              }}>HOU INC</div>
              <div style={{
                fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.44em',
                fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: 2,
              }}>Client Portal</div>
            </div>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <div style={{
              fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.46em',
              fontWeight: 700, color: DARK_ACCENT, marginBottom: 22, opacity: 0.6,
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
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Your builder.</span>
            </h1>
            <p style={{
              fontSize: 13, fontWeight: 300, lineHeight: 1.74,
              color: 'rgba(255,255,255,0.32)', maxWidth: '30ch',
            }}>
              A direct, private line to your HOU INC project team — from first conversation to the day we hand you the keys.
            </p>
          </div>

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

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />

        <div className="relative flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-6 sm:px-10 py-12 lg:py-16">

            {/* Mobile brand mark */}
            <div className="lg:hidden self-start mb-10">
              <Link to="/" className="inline-flex items-center gap-3 select-none">
                <div style={{ width: 2, height: 22, backgroundColor: ACCENT }} />
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 900, letterSpacing: '0.36em',
                    textTransform: 'uppercase', color: INK, fontFamily: SF,
                  }}>HOU INC</div>
                  <div style={{
                    fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.36em',
                    fontWeight: 600, color: ACCENT,
                  }}>Client Portal</div>
                </div>
              </Link>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view === 'form' ? `form-${mode}${magicMode ? '-magic' : ''}` : view}
                className="w-full"
                style={{ maxWidth: 460 }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >

                {/* ════ VERIFYING LINK ════ */}
                {view === 'verifying' && (
                  <div style={{ textAlign: 'center', paddingTop: 40 }}>
                    {verifyError ? (
                      <>
                        <div style={{
                          width: 40, height: 40, margin: '0 auto 20px',
                          backgroundColor: 'rgba(185,68,68,0.08)',
                          border: '1px solid rgba(185,68,68,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <XCircle style={{ width: 16, height: 16, color: ERR }} strokeWidth={1.5} />
                        </div>
                        <h1 style={{
                          fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                          fontSize: 'clamp(24px, 3.5vw, 34px)', color: INK, marginBottom: 12,
                        }}>Link expired.</h1>
                        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 24 }}>
                          {verifyError}
                        </p>
                        <button onClick={() => { setVerifying(false); setVerifyError(''); setShowForgot(true); }}
                          style={{
                            backgroundColor: ACCENT, color: '#FFF', height: 50, width: '100%', borderRadius: 999,
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                            fontWeight: 700, border: 'none', cursor: 'pointer',
                          }}>
                          Request a new link
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: 40, height: 40, margin: '0 auto 20px',
                          backgroundColor: 'rgba(0,0,0,0.08)',
                          border: '1px solid rgba(0,0,0,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Zap style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
                        </div>
                        <p style={{ fontSize: 13, color: MUTED, fontWeight: 300 }}>Verifying your link…</p>
                      </>
                    )}
                  </div>
                )}

                {/* ════ SET NEW PASSWORD (returning from reset link) ════ */}
                {view === 'reset' && (
                  <div>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Lock style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 36px)', color: INK,
                      lineHeight: 1.08, marginBottom: 8,
                    }}>
                      {resetDone ? 'Password updated.' : 'Set a new password.'}
                    </h1>

                    {resetDone ? (
                      <>
                        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
                          Your password has been updated successfully. You can now sign in with your new password.
                        </p>
                        <button
                          onClick={() => { setResetMode(false); setResetDone(false); }}
                          className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85"
                          style={{
                            backgroundColor: ACCENT, color: '#FFF', height: 52, width: '100%', borderRadius: 999,
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                            fontWeight: 700, border: 'none', cursor: 'pointer',
                          }}>
                          <span>Sign In</span>
                          <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300, marginBottom: 28 }}>
                          Choose a new password for <strong style={{ color: INK, fontWeight: 500 }}>{resetEmail}</strong>.
                        </p>
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                          <PwFld
                            label="New Password" hint="min. 8 chars"
                            value={resetPw} onChange={setResetPw}
                            placeholder="Create new password"
                            show={resetShow} onToggle={() => setResetShow(v => !v)}
                            required
                          />
                          <PwFld
                            label="Confirm New Password"
                            value={resetPw2} onChange={setResetPw2}
                            placeholder="Re-enter password"
                            show={resetShow} onToggle={() => setResetShow(v => !v)}
                            required invalid={!!resetPw2 && resetPw2 !== resetPw}
                          />
                          {resetPw2 && resetPw2 !== resetPw && (
                            <p style={{ fontSize: 11, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -16 }}>
                              Passwords don't match
                            </p>
                          )}
                          <AnimatePresence>
                            {resetError && (
                              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{ fontSize: 12, color: ERR, fontFamily: SF, fontStyle: 'italic', marginTop: -8 }}>
                                {resetError}
                              </motion.p>
                            )}
                          </AnimatePresence>
                          <button type="submit" disabled={resetLoading}
                            className="flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                            style={{
                              backgroundColor: ACCENT, color: '#FFF', height: 52, width: '100%', borderRadius: 999,
                              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                              fontWeight: 700, border: 'none', cursor: resetLoading ? 'not-allowed' : 'pointer',
                            }}>
                            {resetLoading
                              ? 'Updating…'
                              : <><span>Update Password</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}

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
                              style={{ height: 2, backgroundColor: ACCENT }}
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
                      <>
                        {/* Magic link sent confirmation */}
                        {magicSent ? (
                          <div>
                            <div style={{
                              padding: 20,
                              backgroundColor: 'rgba(0,0,0,0.04)',
                              border: '1px solid rgba(0,0,0,0.18)',
                              marginBottom: 20,
                            }}>
                              <div style={{
                                fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em',
                                fontWeight: 700, color: ACCENT, marginBottom: 8,
                              }}>Check your inbox</div>
                              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300 }}>
                                We sent a sign-in link to <strong style={{ color: INK, fontWeight: 500 }}>{magicEmail}</strong>.
                                Click it to access your portal instantly — no password needed.
                              </p>
                            </div>
                            <button onClick={() => { setMagicSent(false); setMagicMode(false); setMagicEmail(''); }}
                              style={{
                                fontSize: 11, color: MUTED, fontFamily: SF, fontStyle: 'italic',
                                fontWeight: 300, background: 'none', border: 'none', cursor: 'pointer',
                              }}
                              className="transition-opacity hover:opacity-60">
                              ← Back to sign in
                            </button>
                          </div>
                        ) : magicMode ? (
                          /* Magic link email form */
                          <div>
                            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300 }}>
                                Enter your email and we'll send you a link that signs you in instantly.
                              </p>
                              <Fld label="Email Address">
                                <input required type="email" value={magicEmail}
                                  onChange={e => setMagicEmail(e.target.value)}
                                  placeholder="you@example.com"
                                  style={F}
                                  onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
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
                              <button type="submit" disabled={magicLoading || !magicEmail.trim()}
                                className="flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                                style={{
                                  backgroundColor: INK, color: PANEL, height: 52, width: '100%',
                                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                                  fontWeight: 700, border: 'none', cursor: magicLoading ? 'not-allowed' : 'pointer',
                                }}>
                                {magicLoading
                                  ? 'Sending…'
                                  : <><span>Send Magic Link</span><Zap style={{ width: 13, height: 13 }} strokeWidth={2} /></>}
                              </button>
                            </form>
                            <button onClick={() => { setMagicMode(false); setError(''); }}
                              style={{
                                fontSize: 11, color: MUTED, fontFamily: SF, fontStyle: 'italic',
                                fontWeight: 300, marginTop: 20, background: 'none',
                                border: 'none', cursor: 'pointer',
                              }}
                              className="transition-opacity hover:opacity-60">
                              ← Sign in with password instead
                            </button>
                          </div>
                        ) : (
                          /* Standard login form */
                          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                            <Fld label="Email Address">
                              <input required type="email" value={lEmail}
                                onChange={e => setLEmail(e.target.value)}
                                placeholder="you@example.com"
                                style={F}
                                onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                                onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                            </Fld>

                            <div>
                              <PwFld label="Password" value={lPw} onChange={setLPw}
                                placeholder="Your password" show={lShow}
                                onToggle={() => setLShow(v => !v)} required />
                              <button
                                type="button"
                                onClick={() => { setShowForgot(true); setForgotEmail(lEmail); setForgotSent(false); }}
                                style={{
                                  marginTop: 8, fontSize: 11, color: MUTED,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  padding: 0, fontStyle: 'italic', fontFamily: SF,
                                }}
                                className="transition-opacity hover:opacity-70">
                                Forgot password?
                              </button>
                            </div>

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
                                backgroundColor: ACCENT, color: '#FFF', borderRadius: 999,
                                height: 52, width: '100%', fontSize: 10,
                                textTransform: 'uppercase', letterSpacing: '0.32em', fontWeight: 700,
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                              }}>
                              {loading
                                ? 'Signing in…'
                                : <><span>Enter Portal</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                            </button>

                            {/* Magic link alternative */}
                            <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 20, textAlign: 'center' }}>
                              <button type="button"
                                onClick={() => { setMagicMode(true); setMagicEmail(lEmail); setError(''); }}
                                className="transition-opacity hover:opacity-70"
                                style={{
                                  fontSize: 11, color: MUTED, background: 'none', border: 'none',
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                }}>
                                <Zap style={{ width: 11, height: 11, color: ACCENT_SOFT }} strokeWidth={2} />
                                Sign in with a magic link instead
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}

                    {/* ── REGISTER FORM ── */}
                    {mode === 'register' && (
                      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                          <Fld label="Full Name">
                            <input required value={rName} onChange={e => setRName(e.target.value)}
                              placeholder="Jane Smith" style={F}
                              onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                              onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                          </Fld>
                          <Fld label="Phone">
                            <PhoneInput
                              value={rPhone}
                              onChange={setRPhone}
                              placeholder="(713) 555-0100"
                              inputStyle={F}
                              showIcon={false}
                              onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                              onBlur={e => (e.target.style.borderBottomColor = BDR)}
                              required
                            />
                          </Fld>
                        </div>

                        <Fld label="Email Address">
                          <EmailInput
                            value={rEmail}
                            onChange={setREmail}
                            placeholder="you@example.com"
                            inputStyle={F}
                            showIcon={false}
                            onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                            onBlur={e => (e.target.style.borderBottomColor = BDR)}
                            required
                          />
                        </Fld>

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

                        <Fld label="Project Type">
                          <div className="relative">
                            <button type="button" onClick={() => setTypeOpen(o => !o)}
                              className="w-full flex items-center justify-between"
                              style={{
                                ...F, display: 'flex', cursor: 'pointer',
                                borderBottomColor: typeOpen ? ACCENT : rType ? ACCENT : BDR,
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
                                    backgroundColor: '#FFF', borderRadius: 14,
                                    border: `1px solid ${BDR}`, overflow: 'hidden',
                                    boxShadow: '0 10px 36px rgba(0,0,0,0.09)',
                                  }}>
                                  {TYPES.map(pt => {
                                    const Icon = pt.icon;
                                    const active = rType === pt.value;
                                    return (
                                      <button key={pt.value} type="button"
                                        onClick={() => { setRType(pt.value); setTypeOpen(false); }}
                                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors"
                                        style={{ backgroundColor: active ? 'rgba(0,0,0,0.05)' : 'transparent' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.04)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? 'rgba(0,0,0,0.05)' : 'transparent'; }}>
                                        <Icon style={{ width: 12, height: 12, color: ACCENT, marginTop: 3, flexShrink: 0 }} strokeWidth={1.5} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{pt.value}</div>
                                          <div style={{ fontSize: 10, color: MUTED, fontWeight: 300, marginTop: 1 }}>{pt.desc}</div>
                                        </div>
                                        {active && <CheckCircle2 style={{ width: 13, height: 13, color: ACCENT, marginTop: 2, flexShrink: 0 }} strokeWidth={2} />}
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
                            onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
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
                            backgroundColor: INK, color: PANEL, borderRadius: 999,
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

                {/* ════ FORGOT PASSWORD ════ */}
                {view === 'forgot' && (
                  <div>
                    <button
                      onClick={() => { setShowForgot(false); setForgotSent(false); }}
                      style={{
                        fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em',
                        fontWeight: 700, color: MUTED, marginBottom: 28,
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      ← Back to sign in
                    </button>

                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Mail style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 36px)', color: INK,
                      lineHeight: 1.08, marginBottom: 8,
                    }}>
                      Reset your password.
                    </h1>

                    {forgotSent ? (
                      <>
                        <div style={{
                          padding: 20, marginBottom: 24,
                          backgroundColor: 'rgba(0,0,0,0.04)',
                          border: '1px solid rgba(0,0,0,0.14)',
                        }}>
                          <div style={{
                            fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em',
                            fontWeight: 700, color: ACCENT, marginBottom: 10,
                          }}>Check your inbox</div>
                          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300 }}>
                            If <strong style={{ color: INK, fontWeight: 500 }}>{forgotEmail}</strong> has a portal account, you'll receive a reset link shortly.
                            Click it to set a new password — the link expires in 1 hour.
                          </p>
                        </div>
                        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.65, marginBottom: 24, fontStyle: 'italic', fontFamily: SF }}>
                          Didn't receive it? Check your spam folder, or contact the HOU INC team directly.
                        </p>
                        <button
                          onClick={() => { setShowForgot(false); setForgotSent(false); }}
                          className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85"
                          style={{
                            backgroundColor: ACCENT, color: '#FFF', height: 52, width: '100%', borderRadius: 999,
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                            fontWeight: 700, border: 'none', cursor: 'pointer',
                          }}>
                          Back to Sign In
                        </button>
                      </>
                    ) : (
                      <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, fontWeight: 300 }}>
                          Enter your email address and we'll send you a secure link to reset your password.
                        </p>
                        <Fld label="Email Address">
                          <input required type="email" value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={F}
                            onFocus={e => (e.target.style.borderBottomColor = ACCENT)}
                            onBlur={e => (e.target.style.borderBottomColor = BDR)} />
                        </Fld>
                        <button type="submit" disabled={forgotLoading || !forgotEmail.trim()}
                          className="flex items-center justify-center gap-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                          style={{
                            backgroundColor: ACCENT, color: '#FFF', height: 52, width: '100%', borderRadius: 999,
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em',
                            fontWeight: 700, border: 'none', cursor: forgotLoading ? 'not-allowed' : 'pointer',
                          }}>
                          {forgotLoading
                            ? 'Sending…'
                            : <><span>Send Reset Link</span><ArrowRight style={{ width: 14, height: 14 }} strokeWidth={2} /></>}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* ════ PENDING APPROVAL ════ */}
                {view === 'confirm' && (
                  <div>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Mail style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
                    </div>

                    <div style={{
                      fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.44em',
                      fontWeight: 700, color: ACCENT, marginBottom: 14,
                    }}>
                      Confirm Your Email
                    </div>

                    <h1 style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(26px, 4vw, 38px)', color: INK,
                      lineHeight: 1.08, marginBottom: 12,
                    }}>
                      Check your inbox.
                    </h1>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
                      We sent a confirmation link to{' '}
                      <strong style={{ fontWeight: 600, color: INK }}>{confirmEmail}</strong>. Click it to
                      activate your account — you'll come right back here to continue.
                    </p>

                    <button onClick={() => { setConfirmSent(false); switchMode('login'); }}
                      style={{
                        fontSize: 11, color: MUTED, fontFamily: SF, fontStyle: 'italic',
                        fontWeight: 300, background: 'none',
                        border: 'none', cursor: 'pointer', display: 'block',
                      }}
                      className="transition-opacity hover:opacity-60">
                      ← Back to sign in
                    </button>
                  </div>
                )}

                {view === 'pending' && (
                  <div>
                    <div style={{
                      width: 40, height: 40,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}>
                      <Clock style={{ width: 16, height: 16, color: ACCENT }} strokeWidth={1.5} />
                    </div>

                    <div style={{
                      fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.44em',
                      fontWeight: 700, color: ACCENT, marginBottom: 14,
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
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      border: '1px solid rgba(0,0,0,0.14)',
                    }}>
                      <div style={{
                        fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.36em',
                        fontWeight: 700, color: ACCENT, marginBottom: 12,
                      }}>While you wait</div>
                      {[
                        'Check your inbox for a confirmation email from HOU INC',
                        'Gather property documents and financing pre-approval',
                        'Collect design references and inspiration images',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: 'rgba(0,0,0,0.14)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                          }}>
                            <span style={{ fontSize: 7, fontWeight: 800, color: ACCENT }}>{i + 1}</span>
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
