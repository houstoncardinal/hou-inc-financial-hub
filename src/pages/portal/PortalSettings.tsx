import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, CheckCircle, AlertCircle, Save } from 'lucide-react';
import PhoneInput from '@/components/ui/smart/PhoneInput';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

const DARK   = '#111827';
const MUTED  = '#6B7280';
const ACCENT   = '#000000';
const BORDER = '#E5E7EB';
const CREAM  = '#F8FAFC';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{
            backgroundColor: msg.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {msg.ok
            ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#10b981' }} strokeWidth={2} />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#ef4444' }} strokeWidth={2} />}
          <span className="text-[11px] font-light" style={{ color: msg.ok ? '#10b981' : '#ef4444' }}>{msg.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function PortalSettings() {
  const { client, loaded } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');

  // Sync state once client data has loaded asynchronously
  useEffect(() => {
    if (client) {
      setName(prev => prev || (client.name ?? ''));
      setPhone(prev => prev || (client.phone ?? ''));
    }
  }, [client?.name, client?.phone]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [curPwd, setCurPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  if (!client || (client.status && client.status !== 'approved')) return null;

  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const saveProfile = async () => {
    if (!name.trim()) return;
    setProfileSaving(true);
    setProfileMsg(null);
    const { error } = await (supabase as any)
      .from('portal_clients')
      .update({ name: name.trim(), phone: phone.trim() })
      .eq('id', client.id);
    setProfileSaving(false);
    setProfileMsg(error
      ? { ok: false, text: error.message ?? 'Update failed. Please try again.' }
      : { ok: true,  text: 'Profile updated successfully.' }
    );
  };

  const changePassword = async () => {
    if (!curPwd || !newPwd || !confPwd) {
      setPwdMsg({ ok: false, text: 'All three fields are required.' }); return;
    }
    if (newPwd !== confPwd) {
      setPwdMsg({ ok: false, text: 'New passwords do not match.' }); return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ ok: false, text: 'New password must be at least 6 characters.' }); return;
    }
    setPwdSaving(true);
    setPwdMsg(null);

    // Confirm the current password by re-authenticating with it
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: client.email,
      password: curPwd,
    });
    if (verifyErr) {
      setPwdSaving(false);
      setPwdMsg({ ok: false, text: 'Current password is incorrect.' }); return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (updateErr) {
      setPwdMsg({ ok: false, text: `Password update unavailable — contact ${BUILDER.name} at ${BUILDER.email} to reset.` });
    } else {
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      setPwdMsg({ ok: true, text: 'Password changed successfully.' });
    }
  };

  const fieldCls = "w-full rounded-xl text-[13px] font-light px-4 py-3 outline-none transition-colors";
  const fieldStyle = { backgroundColor: CREAM, border: `1px solid ${BORDER}`, color: DARK };

  return (
    <PortalLayout>
      <motion.div
        className="px-6 md:px-10 py-8 md:py-12 max-w-2xl"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="mb-10">
          <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: ACCENT }}>Account</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Profile & Settings
          </div>
        </div>

        {/* Identity card */}
        <div className="mb-8 p-6 rounded-2xl flex items-center gap-5" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[18px] font-black shrink-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.1)', border: '1.5px solid rgba(0,0,0,0.3)', color: ACCENT, fontFamily: SERIF }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[15px] font-bold" style={{ color: DARK }}>{client.name}</div>
            <div className="text-[12px] font-light mt-0.5" style={{ color: MUTED }}>{client.email}</div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1.5"
              style={{ color: client.status === 'approved' ? '#10b981' : ACCENT }}>
              {client.status === 'approved' ? '● Active Client' : '● Pending Approval'}
            </div>
          </div>
        </div>

        {/* ── Profile form ── */}
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="px-7 py-5 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <User className="w-3.5 h-3.5" style={{ color: ACCENT }} strokeWidth={1.5} />
            <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: ACCENT }}>Profile Information</div>
          </div>
          <div className="p-7 space-y-5">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.24em] font-bold mb-2" style={{ color: MUTED }}>Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={fieldCls}
                style={fieldStyle}
                onFocus={e => (e.target.style.borderColor = ACCENT)}
                onBlur={e => (e.target.style.borderColor = BORDER)}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.24em] font-bold mb-2" style={{ color: MUTED }}>Phone Number</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                inputClassName={fieldCls}
                inputStyle={fieldStyle}
                focusBorderColor={ACCENT}
                defaultBorderColor={BORDER}
                iconColor={MUTED}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.24em] font-bold mb-2" style={{ color: MUTED }}>
                Email Address{' '}
                <span style={{ color: 'rgba(17,24,39,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em' }}>— cannot be changed</span>
              </label>
              <input
                value={client.email}
                readOnly
                className={fieldCls}
                style={{ backgroundColor: 'rgba(17,24,39,0.03)', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'default' }}
              />
            </div>

            <Feedback msg={profileMsg} />

            <button
              onClick={saveProfile}
              disabled={profileSaving || !name.trim()}
              className="flex items-center gap-2 rounded-full text-[9px] uppercase tracking-[0.26em] font-black px-6 py-3 transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: ACCENT, color: CREAM }}
            >
              <Save className="w-3 h-3" strokeWidth={2.5} />
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* ── Password form ── */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="px-7 py-5 flex items-center gap-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <Lock className="w-3.5 h-3.5" style={{ color: ACCENT }} strokeWidth={1.5} />
            <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: ACCENT }}>Change Password</div>
          </div>
          <div className="p-7 space-y-5">
            {[
              { label: 'Current Password',     value: curPwd,  set: setCurPwd  },
              { label: 'New Password',          value: newPwd,  set: setNewPwd  },
              { label: 'Confirm New Password',  value: confPwd, set: setConfPwd },
            ].map(field => (
              <div key={field.label}>
                <label className="block text-[9px] uppercase tracking-[0.24em] font-bold mb-2" style={{ color: MUTED }}>{field.label}</label>
                <input
                  type="password"
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  className={fieldCls}
                  style={fieldStyle}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
              </div>
            ))}

            <Feedback msg={pwdMsg} />

            <button
              onClick={changePassword}
              disabled={pwdSaving}
              className="flex items-center gap-2 rounded-full text-[9px] uppercase tracking-[0.26em] font-black px-6 py-3 transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: DARK, color: CREAM }}
            >
              <Lock className="w-3 h-3" strokeWidth={2.5} />
              {pwdSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
