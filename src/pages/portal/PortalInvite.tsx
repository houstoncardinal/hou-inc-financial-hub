import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { usePortal } from '@/hooks/usePortal';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, FolderKanban } from 'lucide-react';

/* ── Tokens ─────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SOFT   = '#F7F5F2';
const SBG    = '#0D0A06';
const WHITE  = '#FFFFFF';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

interface InviteData {
  id: string;
  token: string;
  email: string;
  name: string | null;
  project_id: string | null;
  project_title: string | null;
  expires_at: string;
  is_valid: boolean;
}

export default function PortalInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = usePortal();
  const token = params.get('token') ?? '';

  const [invite,   setInvite]   = useState<InviteData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [invalid,  setInvalid]  = useState(false);

  /* Form state */
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  /* ── Validate token ─────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    (supabase as any).rpc('validate_portal_invite', { p_token: token })
      .then(({ data }: { data: any }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.is_valid) { setInvalid(true); }
        else {
          setInvite(row);
          setEmail(row.email ?? '');
          setName(row.name ?? '');
        }
        setLoading(false);
      });
  }, [token]);

  /* ── Register ───────────────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSaving(true);
    const result = await register(name.trim(), email.trim().toLowerCase(), phone.trim(), undefined, undefined, password);
    if (!result.ok) { setError(result.error ?? 'Registration failed.'); setSaving(false); return; }

    /* Consume the invite — links portal client to admin project */
    if (invite?.is_valid) {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      // Find the newly created portal_client by email
      const { data: clientRow } = await (supabase as any).rpc('get_portal_client_by_email', { p_email: email.trim().toLowerCase() });
      const clientId = (Array.isArray(clientRow) ? clientRow[0] : clientRow)?.id;
      if (clientId) {
        await (supabase as any).rpc('consume_portal_invite', { p_token: token, p_client_id: clientId });
      }
    }

    setDone(true);
    setSaving(false);
    setTimeout(() => navigate('/portal/dashboard', { replace: true }), 2500);
  };

  /* ─────────────── RENDER ─────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: SOFT, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ backgroundColor: SBG, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, backgroundColor: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, fontWeight: 700, color: SBG }}>H</span>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: WHITE }}>Houston Enterprise</div>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.4em', color: GOLD }}>Client Portal</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 480 }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 80 }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
              <p style={{ fontSize: 13, color: MUTED }}>Validating your invite…</p>
            </div>
          ) : invalid ? (
            /* Invalid / expired invite */
            <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, padding: '48px 40px', textAlign: 'center' }}>
              <AlertCircle className="w-12 h-12 mx-auto mb-6" style={{ color: '#ef4444' }} strokeWidth={1} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: DARK, marginBottom: 12 }}>
                Invite Not Found
              </div>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 28 }}>
                This invite link is invalid or has expired. Please contact your project manager for a new invite link.
              </p>
              <button onClick={() => navigate('/portal')}
                style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', padding: '12px 28px', backgroundColor: DARK, color: WHITE, border: 'none', cursor: 'pointer' }}>
                Go to Portal Login
              </button>
            </div>
          ) : done ? (
            /* Success */
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, padding: '48px 40px', textAlign: 'center' }}>
              <CheckCircle2 className="w-14 h-14 mx-auto mb-6" style={{ color: '#10b981' }} strokeWidth={1.5} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: DARK, marginBottom: 10 }}>
                Welcome aboard!
              </div>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                Your portal account is set up. Redirecting you to your project dashboard…
              </p>
            </motion.div>
          ) : (
            /* Registration form */
            <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
              <div style={{ height: 3, backgroundColor: GOLD }} />
              <div style={{ padding: '32px 36px 36px' }}>
                {/* Project info banner */}
                {invite?.project_title && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', backgroundColor: GOLD + '0E', border: `1px solid ${GOLD}30`, marginBottom: 28 }}>
                    <FolderKanban className="w-4 h-4" style={{ color: GOLD, flexShrink: 0 }} strokeWidth={1.5} />
                    <div>
                      <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.28em', color: GOLD, fontWeight: 700 }}>You're invited to</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{invite.project_title}</div>
                    </div>
                  </div>
                )}

                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: DARK, lineHeight: 1.1, marginBottom: 6 }}>
                  Create Your Account
                </div>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>
                  Set up your client portal to track project progress, milestones, and real-time updates from your team.
                </p>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Full Name *</label>
                    <input
                      value={name} onChange={e => setName(e.target.value)} required autoFocus
                      style={{ width: '100%', height: 44, padding: '0 14px', border: `1px solid ${BORDER}`, fontSize: 14, color: DARK, outline: 'none', fontFamily: 'inherit', backgroundColor: WHITE }}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Email Address *</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      style={{ width: '100%', height: 44, padding: '0 14px', border: `1px solid ${BORDER}`, fontSize: 14, color: DARK, outline: 'none', fontFamily: 'inherit', backgroundColor: invite?.email ? '#fafafa' : WHITE }}
                      placeholder="your@email.com"
                      readOnly={!!invite?.email}
                    />
                    {invite?.email && <p style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Email pre-filled from your invite</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Phone</label>
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ width: '100%', height: 44, padding: '0 14px', border: `1px solid ${BORDER}`, fontSize: 14, color: DARK, outline: 'none', fontFamily: 'inherit' }}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Create Password *</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                      style={{ width: '100%', height: 44, padding: '0 14px', border: `1px solid ${BORDER}`, fontSize: 14, color: DARK, outline: 'none', fontFamily: 'inherit' }}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Confirm Password *</label>
                    <input
                      type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                      style={{ width: '100%', height: 44, padding: '0 14px', border: `1px solid ${confirm && confirm !== password ? '#ef4444' : BORDER}`, fontSize: 14, color: DARK, outline: 'none', fontFamily: 'inherit' }}
                      placeholder="Re-enter password"
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: '#991b1b' }}>{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={saving}
                    style={{ width: '100%', height: 48, backgroundColor: DARK, color: WHITE, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.28em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, opacity: saving ? 0.7 : 1 }}>
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</>
                      : <><span>Activate Portal Access</span><ArrowRight className="w-3.5 h-3.5" /></>
                    }
                  </button>
                </form>

                <p style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 16 }}>
                  Already have an account?{' '}
                  <button onClick={() => navigate('/portal')} style={{ color: GOLD, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
