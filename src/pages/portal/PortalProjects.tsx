import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen, CheckCircle, ArrowUpRight, CalendarDays, DollarSign,
  Target, CheckCircle2, AlertCircle, Info, HelpCircle, X, Plus, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ─────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SOFT   = '#F7F5F2';
const GREEN  = '#10b981';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* ── Types ─────────────────────────────────────────────────────── */
interface AdminProjectData {
  project_id: string;
  title: string;
  type: string;
  address: string | null;
  city: string;
  state: string;
  status: string;
  progress_pct: number;
  start_date: string | null;
  estimated_completion: string | null;
  contract_amount: number | null;
  project_manager: string | null;
  superintendent: string | null;
  description: string | null;
  milestones: MilestoneItem[];
  updates: UpdateItem[];
}

interface MilestoneItem {
  id: string; title: string; description: string | null; sort_order: number;
  target_date: string | null; completed_date: string | null; is_active: boolean;
}

interface UpdateItem {
  id: string; title: string; body: string; update_type: string;
  pinned: boolean; created_by: string; created_at: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning:  { bg: 'rgba(139,92,246,0.1)',   text: '#8b5cf6' },
  active:    { bg: 'rgba(16,185,129,0.1)',    text: GREEN },
  on_hold:   { bg: 'rgba(245,158,11,0.1)',    text: '#f59e0b' },
  completed: { bg: 'rgba(157,126,63,0.12)',   text: GOLD },
  archived:  { bg: 'rgba(122,110,100,0.1)',   text: MUTED },
};
const STATUS_LABELS: Record<string, string> = { planning:'Planning', active:'Active', on_hold:'On Hold', completed:'Completed', archived:'Archived' };

const UPDATE_ICONS: Record<string, { Icon: any; color: string; label: string }> = {
  general:   { Icon: Info,         color: '#3b82f6', label: 'Update' },
  milestone: { Icon: CheckCircle2, color: GREEN,     label: 'Milestone' },
  alert:     { Icon: AlertCircle,  color: '#f59e0b', label: 'Action Required' },
  important: { Icon: AlertCircle,  color: '#ef4444', label: 'Important' },
};

const HELP_SUBJECTS = [
  'General Question',
  'Schedule / Timeline',
  'Budget / Billing',
  'Materials / Design',
  'Site Access / Coordination',
  'Milestone Update Request',
  'Document Request',
  'Other',
];

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}
function fmtUSD(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function ProgressRing({ pct, size = 88 }: { pct: number; size?: number }) {
  const sw = 5, r = (size - sw * 2) / 2, c = 2 * Math.PI * r, arc = Math.min(pct, 100) / 100 * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(157,126,63,0.12)" strokeWidth={sw} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={GOLD} strokeWidth={sw} strokeLinecap="butt"
          strokeDasharray={`${arc} ${c - arc}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${arc} ${c - arc}` }}
          transition={{ duration: 1.1, ease: [0.22,1,0.36,1], delay: 0.2 }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: size * 0.22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 6, textTransform: 'uppercase', letterSpacing: '0.18em', color: MUTED, fontWeight: 700, marginTop: 2 }}>done</div>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = ['Brief Submitted','Under Review','Proposal Sent','Contract Signed','Build Underway'];
const STEP_MAP: Record<string, number> = { submitted:0, reviewing:1, consultation_scheduled:2, proposal_sent:2, in_progress:3, contract_signed:3, build_underway:4 };

/* ── Help Request Modal ─────────────────────────────────────────── */
function HelpRequestModal({
  project, clientId, onClose, onSuccess,
}: {
  project: AdminProjectData;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [subject, setSubject]   = useState(HELP_SUBJECTS[0]);
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]         = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await (supabase as any).rpc('submit_portal_help_request', {
        p_client_id:     clientId,
        p_project_id:    project.project_id,
        p_project_title: project.title,
        p_subject:       subject,
        p_message:       message.trim(),
      });
      setSent(true);
      setTimeout(() => { onClose(); onSuccess(); }, 2000);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(10,8,6,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom,0)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        style={{ backgroundColor: WHITE, width: '100%', maxWidth: 560, maxHeight: '90svh', overflowY: 'auto', borderTop: '3px solid #9D7E3F', borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.38em', fontWeight: 700, color: GOLD, marginBottom: 4 }}>Request Help</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DARK, lineHeight: 1.3 }}>{project.title}</div>
          </div>
          <button onClick={onClose} style={{ padding: 4, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}><X className="w-4 h-4" /></button>
        </div>

        {sent ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4" style={{ color: GREEN }} />
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: DARK, marginBottom: 8 }}>Request Sent</div>
            <p style={{ fontSize: 13, color: MUTED }}>Your project manager will follow up with you shortly.</p>
          </div>
        ) : (
          <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>What can we help you with?</label>
              <select
                value={subject} onChange={e => setSubject(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, fontSize: 13, color: DARK, backgroundColor: WHITE, outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A8580' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                {HELP_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 700, color: MUTED, marginBottom: 6 }}>Message</label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                rows={5} placeholder="Describe what you need help with…"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BORDER}`, fontSize: 13, color: DARK, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = GOLD; }}
                onBlur={e => { e.target.style.borderColor = BORDER; }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', backgroundColor: message.trim() && !submitting ? GOLD : 'rgba(157,126,63,0.35)', color: WHITE, border: 'none', cursor: message.trim() && !submitting ? 'pointer' : 'not-allowed', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', transition: 'background-color 0.18s' }}>
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Sending…' : 'Send Request'}
            </button>
            <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>
              Your request goes directly to {BUILDER.name}. Typical response within one business day.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */
export default function PortalProjects() {
  const { client, loaded, getBrief } = usePortal();
  const navigate = useNavigate();
  const [adminProjects, setAdminProjects]   = useState<AdminProjectData[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [helpProjectId, setHelpProjectId]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  useEffect(() => { if (!loaded) return; if (!client) navigate('/portal', { replace: true }); }, [client, loaded, navigate]);

  useEffect(() => {
    if (!client) return;
    setLoadingProjects(true);
    (supabase as any).rpc('get_portal_project_data', { p_client_id: client.id })
      .then(({ data }: { data: any }) => {
        const rows = Array.isArray(data) ? data : (data ? [data] : []);
        setAdminProjects(rows.map((r: any) => ({
          ...r,
          milestones: typeof r.milestones === 'string' ? JSON.parse(r.milestones) : (r.milestones ?? []),
          updates:    typeof r.updates    === 'string' ? JSON.parse(r.updates)    : (r.updates    ?? []),
        })));
        setLoadingProjects(false);
      });
  }, [client?.id]);

  if (!loaded || !client) return null;

  const brief    = getBrief();
  const hasAdmin = adminProjects.length > 0;
  const helpProject = helpProjectId ? adminProjects.find(p => p.project_id === helpProjectId) ?? null : null;

  function toggleMilestones(projectId: string) {
    setExpandedMilestones(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }

  return (
    <PortalLayout>
      <motion.div className="px-5 sm:px-10 py-8 md:py-12 max-w-4xl"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

        {/* Page header */}
        <div className="mb-8" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.44em', fontWeight: 700, color: GOLD, marginBottom: 8 }}>Client Portal</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px,4vw,44px)', color: DARK, lineHeight: 1.05 }}>My Projects</div>
          </div>
          {/* Add new project CTA */}
          <Link
            to="/portal/project?new=1"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, padding: '10px 18px', backgroundColor: DARK, color: WHITE, textDecoration: 'none', flexShrink: 0 }}>
            <Plus className="w-3 h-3" strokeWidth={2.5} />
            Add Project
          </Link>
        </div>

        {/* Success flash */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ marginBottom: 20, padding: '12px 16px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: GREEN, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: DARK }}>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} style={{ marginLeft: 'auto', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Admin-managed projects ── */}
        {hasAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {adminProjects.map((proj, projIdx) => {
              const sc = STATUS_COLORS[proj.status] ?? STATUS_COLORS.active;
              const completedMs  = proj.milestones.filter(m => m.completed_date).length;
              const activeMs     = proj.milestones.find(m => m.is_active && !m.completed_date);
              const showAllMs    = expandedMilestones[proj.project_id];
              const visibleMs    = showAllMs ? proj.milestones : proj.milestones.slice(0, 5);

              return (
                <motion.div key={proj.project_id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: projIdx * 0.06 }}
                  style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>

                  {/* Header */}
                  <div style={{ padding: '22px 24px', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: DARK }}>{proj.title}</div>
                          <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', padding: '3px 8px', backgroundColor: sc.bg, color: sc.text, flexShrink: 0 }}>{STATUS_LABELS[proj.status] ?? proj.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED }}>{proj.type}{proj.city ? ` · ${proj.city}, ${proj.state}` : ''}</div>
                      </div>
                      <ProgressRing pct={proj.progress_pct} />
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: `1px solid ${BORDER}` }}>
                    {([
                      ['Contract Value', fmtUSD(proj.contract_amount), DollarSign],
                      ['Start Date', fmtDate(proj.start_date), CalendarDays],
                      ['Est. Complete', fmtDate(proj.estimated_completion), Target],
                    ] as [string, string, any][]).map(([label, value, Icon], i, arr) => (
                      <div key={label} style={{ padding: '14px 16px', borderRight: i < arr.length-1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <Icon className="w-3 h-3" style={{ color: GOLD }} strokeWidth={1.5} />
                          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, color: MUTED }}>{label}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* In-progress milestone */}
                  {activeMs && (
                    <div style={{ padding: '12px 24px', borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(157,126,63,0.03)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GOLD, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, color: GOLD, marginBottom: 1 }}>Currently In Progress</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{activeMs.title}</div>
                      </div>
                      {activeMs.target_date && <div style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>Target: {fmtDate(activeMs.target_date)}</div>}
                    </div>
                  )}

                  {/* Milestones */}
                  {proj.milestones.length > 0 && (
                    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD }}>Milestones</div>
                        <div style={{ fontSize: 10, color: MUTED }}>{completedMs} of {proj.milestones.length} complete</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {visibleMs.map(m => {
                          const done = !!m.completed_date, active = m.is_active && !done;
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {done
                                ? <CheckCircle2 className="w-4 h-4" style={{ color: GREEN, flexShrink: 0 }} />
                                : active
                                ? <div style={{ width: 16, height: 16, border: `2px solid ${GOLD}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><div style={{ width: 5, height: 5, backgroundColor: GOLD, borderRadius: '50%' }} /></div>
                                : <div style={{ width: 16, height: 16, border: `1.5px solid ${BORDER}`, borderRadius: '50%', flexShrink: 0 }} />}
                              <span style={{ flex: 1, fontSize: 12, color: done ? MUTED : DARK, fontWeight: active ? 600 : 400, textDecoration: done ? 'line-through' : 'none' }}>{m.title}</span>
                              {m.target_date && !done && <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>{fmtDate(m.target_date)}</span>}
                              {m.completed_date && <span style={{ fontSize: 10, color: GREEN, flexShrink: 0 }}>{fmtDate(m.completed_date)}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {proj.milestones.length > 5 && (
                        <button
                          onClick={() => toggleMilestones(proj.project_id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 10, fontWeight: 700, color: GOLD, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {showAllMs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAllMs ? 'Show less' : `Show all ${proj.milestones.length} milestones`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Updates */}
                  {proj.updates.length > 0 && (
                    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD, marginBottom: 12 }}>Recent Updates</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {proj.updates.slice(0, 3).map(u => {
                          const { Icon, color, label } = UPDATE_ICONS[u.update_type] ?? UPDATE_ICONS.general;
                          return (
                            <div key={u.id}
                              style={{ padding: '11px 13px', border: `1px solid ${BORDER}`, backgroundColor: SOFT, cursor: 'pointer' }}
                              onClick={() => setExpandedUpdate(expandedUpdate === u.id ? null : u.id)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon className="w-3.5 h-3.5" style={{ color, flexShrink: 0 }} />
                                <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color }}>{label}</span>
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</span>
                                <span style={{ fontSize: 9, color: MUTED, flexShrink: 0 }}>{new Date(u.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                              </div>
                              <AnimatePresence>
                                {expandedUpdate === u.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                    <p style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{u.body}</p>
                                    <div style={{ fontSize: 9, color: MUTED, marginTop: 6 }}>Posted by {u.created_by}</div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {proj.description && (
                    <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>{proj.description}</p>
                    </div>
                  )}

                  {/* Footer — smart per-project links + request help */}
                  <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    {/* Team */}
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      {proj.project_manager && (
                        <div>
                          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.22em', color: MUTED, fontWeight: 700 }}>PM</div>
                          <div style={{ fontSize: 12, color: DARK }}>{proj.project_manager}</div>
                        </div>
                      )}
                      {proj.superintendent && (
                        <div>
                          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.22em', color: MUTED, fontWeight: 700 }}>Superintendent</div>
                          <div style={{ fontSize: 12, color: DARK }}>{proj.superintendent}</div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {/* Request Help */}
                      <button
                        onClick={() => setHelpProjectId(proj.project_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: MUTED, background: 'none', border: `1px solid ${BORDER}`, cursor: 'pointer', padding: '7px 12px', transition: 'border-color 0.15s, color 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD; (e.currentTarget as HTMLButtonElement).style.color = GOLD; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = MUTED; }}>
                        <HelpCircle className="w-3 h-3" />
                        Request Help
                      </button>

                      {/* Per-project smart links */}
                      <Link
                        to={`/portal/milestones?project=${proj.project_id}`}
                        style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: GOLD, textDecoration: 'none' }}>
                        Timeline →
                      </Link>
                      <Link
                        to={`/portal/messages?project=${encodeURIComponent(proj.title)}`}
                        style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: GOLD, textDecoration: 'none' }}>
                        Messages →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Add another project prompt */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', border: `1px dashed ${BORDER}`, gap: 12 }}>
              <FolderOpen className="w-4 h-4" style={{ color: GOLDF }} strokeWidth={1.5} />
              <span style={{ fontSize: 12, color: MUTED }}>Have another project in mind?</span>
              <Link
                to="/portal/project?new=1"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', padding: '8px 16px', backgroundColor: DARK, color: WHITE, textDecoration: 'none' }}>
                <Plus className="w-3 h-3" strokeWidth={2.5} />
                Add New Project
              </Link>
            </div>
          </div>
        )}

        {/* ── Brief-based fallback ── */}
        {!hasAdmin && brief && (
          <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>Your project brief has been submitted and is under review. Your project manager will link your full project details soon.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to={`/portal/project?id=${brief.id}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', padding: '10px 20px', backgroundColor: DARK, color: WHITE, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>View Brief <ArrowUpRight className="w-3.5 h-3.5" /></Link>
                <Link to="/portal/messages" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.24em', padding: '10px 20px', border: `1px solid ${BORDER}`, color: DARK, textDecoration: 'none' }}>Message Builder</Link>
              </div>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.36em', fontWeight: 700, color: GOLD, marginBottom: 20 }}>Project Pipeline</div>
              <div style={{ display: 'flex' }}>
                {PIPELINE_STEPS.map((step, i) => {
                  const stepIdx = STEP_MAP[brief.status] ?? 0;
                  const done = i < stepIdx, current = i === stepIdx;
                  return (
                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, backgroundColor: i===0?'transparent':i<=stepIdx?GOLD:BORDER }} />
                        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: done?GOLD:current?'rgba(157,126,63,0.08)':WHITE, border: done?`1px solid ${GOLD}`:current?`2px solid ${GOLD}`:`1px solid ${BORDER}` }}>
                          {done&&<CheckCircle className="w-3 h-3" style={{ color: WHITE }} />}
                          {current&&<div style={{ width: 6, height: 6, backgroundColor: GOLD }} />}
                        </div>
                        <div style={{ flex: 1, height: 1, backgroundColor: i===PIPELINE_STEPS.length-1?'transparent':i<stepIdx?GOLD:BORDER }} />
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: done||current?(current?GOLD:DARK):'rgba(26,20,16,0.3)', paddingInline: 4 }}>{step}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!hasAdmin && !brief && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBlock: 96, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.18)` }}>
              <FolderOpen className="w-7 h-7" style={{ color: GOLDF }} strokeWidth={1} />
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: DARK, marginBottom: 10 }}>No active projects yet.</div>
            <p style={{ fontSize: 13, fontWeight: 300, marginBottom: 28, maxWidth: 280, color: MUTED }}>Submit your project brief and we'll build a custom plan tailored to your vision.</p>
            <Link to="/portal/project?new=1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.28em', fontWeight: 900, padding: '14px 28px', backgroundColor: GOLD, color: '#FAF7F2', textDecoration: 'none' }}>
              Submit Project Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </motion.div>

      {/* Help Request Modal */}
      <AnimatePresence>
        {helpProjectId && helpProject && (
          <HelpRequestModal
            project={helpProject}
            clientId={client.id}
            onClose={() => setHelpProjectId(null)}
            onSuccess={() => {
              setHelpProjectId(null);
              setSuccessMsg(`Your request for "${helpProject.title}" has been sent. We'll follow up shortly.`);
            }}
          />
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
