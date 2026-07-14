import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, FileText, MessageSquare, Calendar, CheckCircle,
  Circle, FolderOpen, Clock, AlertCircle, ChevronRight,
  Building2, Phone, Mail, GitBranch, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const SBG    = '#0D0A06';
const WHITE  = '#FFFFFF';
const BG     = '#F5F2EE';

const STATUS_STEPS = [
  { key: 'registered',             label: 'Account Created',         detail: "You're in our system" },
  { key: 'brief_submitted',        label: 'Project Brief Submitted', detail: 'Builder reviews your vision' },
  { key: 'consultation_scheduled', label: 'Consultation Scheduled',  detail: 'First call with your team' },
  { key: 'proposal_sent',          label: 'Proposal Delivered',      detail: 'Review scope & pricing' },
  { key: 'in_progress',            label: 'Build Underway',          detail: 'Construction has begun' },
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function getStepIndex(brief: ReturnType<ReturnType<typeof usePortal>['getBrief']>) {
  if (!brief) return 0;
  if (brief.status === 'in_progress') return 4;
  if (brief.status === 'consultation_scheduled') return 2;
  if (brief.status === 'reviewing' || brief.status === 'submitted') return 1;
  return 0;
}

/* ── SVG progress ring ──────────────────────────────────────────────── */
function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const sw  = 5;
  const r   = (size - sw * 2) / 2;
  const c   = 2 * Math.PI * r;
  const arc = Math.min(pct, 100) / 100 * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(157,126,63,0.14)" strokeWidth={sw} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={GOLD} strokeWidth={sw} strokeLinecap="butt"
          strokeDasharray={`${arc} ${c - arc}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${arc} ${c - arc}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: SERIF, fontSize: size * 0.22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          {pct}%
        </div>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.16em', color: MUTED, fontWeight: 700, marginTop: 3 }}>
          done
        </div>
      </div>
    </div>
  );
}

/* ── Motion variants ─────────────────────────────────────────────────── */
const fade    = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } } };

/* ════════════════════════════════════════════════════════════════════════
   PORTAL DASHBOARD
════════════════════════════════════════════════════════════════════════ */
export default function PortalDashboard() {
  const { client, loaded, getBrief, getMessages, getDocuments, getMeetings } = usePortal();
  const navigate = useNavigate();

  /* ── Milestone progress — must be before the early return (Rules of Hooks) ── */
  const [milestonePct, setMilestonePct]       = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  useEffect(() => {
    if (!client?.id) return;
    const si = getStepIndex(getBrief());
    (supabase as any)
      .from('project_milestones')
      .select('id, phase_name, completed_date, is_active')
      .eq('client_id', client.id)
      .order('sort_order', { ascending: true })
      .then(({ data }: any) => {
        if (!data || data.length === 0) {
          setMilestonePct(Math.round((si / (STATUS_STEPS.length - 1)) * 100));
          return;
        }
        const total     = data.length;
        const completed = data.filter((r: any) => r.completed_date).length;
        const active    = data.find((r: any) => r.is_active);
        setMilestonePct(Math.round(((completed + (active ? 0.5 : 0)) / total) * 100));
        if (active) setActiveMilestone(active.phase_name || null);
      });
  }, [client?.id]);

  if (!loaded || !client || (client.status && client.status !== 'approved')) return null;

  const brief       = getBrief();
  const messages    = getMessages();
  const docs        = getDocuments();
  const meetings    = getMeetings();
  const stepIdx     = getStepIndex(brief);
  const recentMsgs  = messages.slice(-3).reverse();
  const pendingDocs = docs.filter(d => d.status === 'pending').length;
  const nextMeeting = meetings.find(m => m.status === 'confirmed' || m.status === 'requested');
  const builderMsgs = messages.filter(m => m.sender === 'builder');
  const unreadCount = builderMsgs.length;

  const ringPct = milestonePct ?? Math.round((stepIdx / (STATUS_STEPS.length - 1)) * 100);

  const QUICK_ACTIONS = [
    {
      to: '/portal/project',    Icon: FileText,
      label: brief ? 'Project Brief' : 'Complete Brief',
      sub:   brief ? `Status: ${brief.status}` : '5 min · Unlock next steps',
      accent: !brief,
    },
    {
      to: '/portal/milestones', Icon: GitBranch,
      label: 'Timeline',
      sub:   activeMilestone ? `Active: ${activeMilestone}` : 'View project milestones',
      accent: false,
    },
    {
      to: '/portal/messages',   Icon: MessageSquare,
      label: 'Messages',
      sub:   messages.length > 0 ? `${messages.length} messages` : 'Contact your consultant',
      accent: false,
    },
    {
      to: '/portal/documents',  Icon: FolderOpen,
      label: 'Documents',
      sub:   pendingDocs > 0 ? `${pendingDocs} awaiting upload` : 'Manage your files',
      accent: pendingDocs > 0,
    },
  ];

  return (
    <PortalLayout>
      <motion.div variants={stagger} initial="hidden" animate="show">

        {/* ══════════════════════════════════════════════════
            HERO — compact, full-bleed
        ══════════════════════════════════════════════════ */}
        <motion.div variants={fade} style={{ backgroundColor: WHITE, position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD }} />
          <div className="px-5 sm:px-8 md:px-10 pt-6 pb-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-[7px] uppercase tracking-[0.44em] font-bold mb-1.5" style={{ color: GOLD }}>
                  {getGreeting()}
                </div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,6vw,46px)', color: DARK, lineHeight: 1.05 }}>
                  {client.name.split(' ')[0]}.
                </div>
                <span className="inline-block mt-2 text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1"
                  style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD, border: '1px solid rgba(157,126,63,0.22)' }}>
                  {STATUS_STEPS[stepIdx]?.label} · Phase {stepIdx + 1}/{STATUS_STEPS.length}
                </span>
              </div>
              <ProgressRing pct={ringPct} size={72} />
            </div>

            {/* Stats strip */}
            <div className="flex items-center mt-4" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, paddingBottom: 14 }}>
              {[
                { n: messages.length, label: 'Messages',  to: '/portal/messages',  color: '#3b82f6' },
                { n: docs.length,     label: 'Documents', to: '/portal/documents', color: pendingDocs > 0 ? '#f59e0b' : '#10b981' },
                { n: meetings.length, label: 'Meetings',  to: '/portal/meetings',  color: '#8b5cf6' },
              ].map(({ n, label, to, color }, i) => (
                <Link key={label} to={to} className="flex items-center transition-opacity hover:opacity-75">
                  {i > 0 && <div className="w-px h-6 mx-4 sm:mx-5" style={{ backgroundColor: BORDER }} />}
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 'clamp(18px,3.5vw,22px)', fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.22em', color: MUTED, fontWeight: 600, marginTop: 2 }}>{label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="px-4 sm:px-6 md:px-10 py-5 sm:py-6">

          {/* ── Unread alert + active milestone (collapsed into one row when both exist) ── */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div key="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                <Link to="/portal/messages"
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-opacity hover:opacity-90 active:opacity-75"
                  style={{ backgroundColor: 'rgba(157,126,63,0.07)', border: '1px solid rgba(157,126,63,0.24)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />
                      <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 flex items-center justify-center text-[7px] font-black"
                        style={{ backgroundColor: GOLD, color: WHITE }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: DARK }}>{unreadCount === 1 ? '1 message' : `${unreadCount} messages`} from {BUILDER.name}</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: GOLDF }} strokeWidth={2} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {activeMilestone && (
            <motion.div variants={fade} className="mb-3">
              <Link to="/portal/milestones"
                className="flex items-center justify-between gap-3 px-4 py-3 transition-all hover:shadow-sm"
                style={{ backgroundColor: 'rgba(157,126,63,0.04)', border: '1px solid rgba(157,126,63,0.18)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: GOLD }} />
                  <div>
                    <div className="text-[7px] uppercase tracking-[0.26em] font-bold" style={{ color: GOLD }}>Current Milestone</div>
                    <div className="text-[11px] font-semibold" style={{ color: DARK }}>{activeMilestone}</div>
                  </div>
                </div>
                <span className="text-[8px] uppercase tracking-[0.18em] font-bold shrink-0" style={{ color: GOLDF }}>Timeline →</span>
              </Link>
            </motion.div>
          )}

          {/* ── Quick actions (2-col mobile, 4-col desktop) ── */}
          <motion.div variants={fade} className="mb-5">
            <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-2.5" style={{ color: GOLD }}>Quick Access</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUICK_ACTIONS.map(({ to, Icon, label, sub, accent }) => (
                <Link key={to + label} to={to}
                  className="group p-3.5 flex flex-col gap-2.5 transition-all duration-200 active:scale-[0.97]"
                  style={{ backgroundColor: accent ? 'rgba(157,126,63,0.07)' : WHITE, border: `1px solid ${accent ? 'rgba(157,126,63,0.26)' : BORDER}`, boxShadow: '0 1px 3px rgba(26,20,16,0.04)' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 22px rgba(26,20,16,0.09)'; el.style.borderColor = accent ? GOLD : 'rgba(157,126,63,0.28)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 1px 3px rgba(26,20,16,0.04)'; el.style.borderColor = accent ? 'rgba(157,126,63,0.26)' : BORDER; }}>
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 flex items-center justify-center" style={{ backgroundColor: accent ? 'rgba(157,126,63,0.14)' : 'rgba(26,20,16,0.04)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: accent ? GOLD : MUTED }} strokeWidth={1.5} />
                    </div>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: DARK }} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold leading-tight mb-0.5" style={{ color: DARK, fontFamily: SERIF }}>{label}</div>
                    <div className="text-[9px] font-light" style={{ color: MUTED }}>{sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── Two-column: Timeline + Consultant card ── */}
          <motion.div variants={fade} className="grid md:grid-cols-3 gap-4 mb-5">

            {/* Timeline */}
            <div className="md:col-span-2" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 5px rgba(26,20,16,0.04)' }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-0.5" style={{ color: GOLD }}>Project Journey</div>
                    <div className="text-[10px] font-light" style={{ color: MUTED }}>From first brief to handover</div>
                  </div>
                  <span className="text-[7px] uppercase tracking-[0.16em] font-bold px-2 py-1 shrink-0"
                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: GOLD }}>{stepIdx + 1}/{STATUS_STEPS.length}</span>
                </div>
                <div className="mt-3 h-0.5 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
                  <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                    initial={{ width: 0 }} animate={{ width: `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="relative">
                  <div className="absolute left-[7px] top-3 bottom-3 w-px" style={{ backgroundColor: BORDER }} />
                  <motion.div className="absolute left-[7px] top-3 w-px" style={{ backgroundColor: GOLD }}
                    initial={{ height: 0 }}
                    animate={{ height: stepIdx === 0 ? 0 : `${Math.min((stepIdx / (STATUS_STEPS.length - 1)) * 100, 90)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }} />
                  <div className="space-y-3">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i < stepIdx, current = i === stepIdx;
                      return (
                        <div key={step.key} className="flex items-start gap-3.5 relative">
                          <div className="shrink-0 mt-0.5 z-10 bg-white" style={{ width: 15, height: 15 }}>
                            {done ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22, delay: i * 0.07 }}>
                                <CheckCircle className="w-[15px] h-[15px]" style={{ color: GOLD }} strokeWidth={2} />
                              </motion.div>
                            ) : current ? (
                              <motion.div className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                                style={{ borderColor: GOLD, backgroundColor: 'rgba(157,126,63,0.1)' }}
                                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }}
                                  animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                              </motion.div>
                            ) : (
                              <Circle className="w-[15px] h-[15px]" style={{ color: BORDER }} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2" style={{ color: done || current ? DARK : 'rgba(26,20,16,0.22)' }}>
                              <span className="text-[11px] font-bold">{step.label}</span>
                              {current && <span className="text-[7px] uppercase tracking-[0.2em] font-bold px-1.5 py-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>Current</span>}
                            </div>
                            <div className="text-[9px] font-light" style={{ color: done || current ? MUTED : 'rgba(26,20,16,0.14)' }}>{step.detail}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!brief && (
                  <div className="mt-4 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-[10px] font-light" style={{ color: MUTED }}>Complete your brief to unlock the next step (~5 min)</p>
                    <Link to="/portal/project"
                      className="inline-flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] font-black px-4 py-2.5 shrink-0 transition-opacity hover:opacity-85"
                      style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                      Start Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Luxury light consultant card ── */}
            <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 5px rgba(26,20,16,0.04)', position: 'relative', overflow: 'hidden' }}>
              {/* Gold top rail */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLDF} 100%)` }} />
              {/* Subtle pattern */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(157,126,63,0.045) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              <div className="p-5 relative">
                {/* Eyebrow */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[7px] uppercase tracking-[0.4em] font-bold" style={{ color: GOLD }}>Your Consultant</div>
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }}
                      animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
                    <span className="text-[7px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#22c55e' }}>Available</span>
                  </div>
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 flex items-center justify-center text-[13px] font-black shrink-0"
                    style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLDF} 100%)`, color: WHITE, fontFamily: SERIF, letterSpacing: '0.05em' }}>
                    {BUILDER.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold leading-tight" style={{ color: DARK, fontFamily: SERIF }}>{BUILDER.name}</div>
                    <div className="text-[9px] font-light mt-0.5 leading-snug" style={{ color: MUTED }}>{BUILDER.title}</div>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5" style={{ color: GOLD, fill: GOLD }} />
                  ))}
                  <span className="ml-1.5 text-[8px] font-semibold" style={{ color: MUTED }}>25+ Years · Houston</span>
                </div>

                <div className="h-px mb-3.5" style={{ backgroundColor: BORDER }} />

                <p className="text-[10px] leading-relaxed font-light mb-4" style={{ color: MUTED }}>{BUILDER.bio}</p>

                {/* Contact */}
                <div className="flex flex-col gap-1.5 mb-0">
                  <a href={`tel:${BUILDER.phone}`}
                    className="flex items-center gap-2.5 text-[10px] font-medium py-1.5 transition-colors"
                    style={{ color: DARK }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}>
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} strokeWidth={1.5} />
                    {BUILDER.phone}
                  </a>
                  <a href={`mailto:${BUILDER.email}`}
                    className="flex items-center gap-2.5 text-[10px] font-medium py-1.5 transition-colors"
                    style={{ color: DARK }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}>
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} strokeWidth={1.5} />
                    {BUILDER.email}
                  </a>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="px-5 pb-5 flex flex-col gap-2" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <Link to="/portal/messages"
                  className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black min-h-[44px] transition-opacity hover:opacity-85 active:opacity-70"
                  style={{ backgroundColor: GOLD, color: WHITE }}>
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} /> Send Message
                </Link>
                <Link to="/portal/meetings"
                  className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold min-h-[40px] transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: DARK }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = GOLD; el.style.color = GOLD; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BORDER; el.style.color = DARK; }}>
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} /> Schedule Call
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Recent messages + Documents in a compact two-panel row ── */}
          {(recentMsgs.length > 0 || docs.length > 0) && (
            <motion.div variants={fade} className="grid md:grid-cols-2 gap-4 mb-5">

              {/* Messages */}
              {recentMsgs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: GOLD }}>Recent Messages</div>
                    <Link to="/portal/messages" className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity" style={{ color: GOLD }}>All <ArrowUpRight className="w-3 h-3" strokeWidth={2} /></Link>
                  </div>
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(26,20,16,0.04)' }}>
                    {recentMsgs.map((m, i) => (
                      <Link key={m.id} to="/portal/messages"
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-stone-50 active:bg-stone-100"
                        style={{ borderBottom: i < recentMsgs.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                          style={{ backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.1)' : 'rgba(26,20,16,0.05)', color: m.sender === 'builder' ? GOLD : 'rgba(26,20,16,0.4)', fontFamily: SERIF }}>
                          {m.senderName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                            {m.sender === 'builder' && <span className="text-[6px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: GOLD }}>HOU INC</span>}
                            <span className="text-[8px] ml-auto" style={{ color: 'rgba(26,20,16,0.26)' }}>{new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <p className="text-[10px] font-light line-clamp-1" style={{ color: MUTED }}>{m.text}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {docs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[7px] uppercase tracking-[0.36em] font-bold" style={{ color: GOLD }}>Documents</div>
                    <Link to="/portal/documents" className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity" style={{ color: GOLD }}>Manage <ArrowUpRight className="w-3 h-3" strokeWidth={2} /></Link>
                  </div>
                  <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(26,20,16,0.04)' }}>
                    {docs.slice(0, 3).map((doc, i) => (
                      <Link key={doc.id} to="/portal/documents"
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50"
                        style={{ borderBottom: i < Math.min(docs.length, 3) - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div className="w-7 h-7 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: doc.status === 'uploaded' ? 'rgba(16,185,129,0.09)' : doc.status === 'pending' ? 'rgba(245,158,11,0.09)' : 'rgba(26,20,16,0.05)' }}>
                          {doc.status === 'uploaded' ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} strokeWidth={1.5} />
                            : doc.status === 'pending' ? <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                            : <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.5} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: DARK }}>{doc.name}</div>
                          <div className="text-[8px] uppercase tracking-[0.16em] mt-0.5 font-semibold"
                            style={{ color: doc.status === 'uploaded' ? '#10b981' : doc.status === 'pending' ? '#f59e0b' : MUTED }}>
                            {doc.status === 'pending' ? 'Upload Required' : doc.status === 'uploaded' ? 'Uploaded' : doc.status}
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'rgba(26,20,16,0.15)' }} strokeWidth={2} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Upcoming meeting ── */}
          {nextMeeting && (
            <motion.div variants={fade} className="mb-5">
              <Link to="/portal/meetings"
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-white"
                style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 5px rgba(26,20,16,0.04)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.09)' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#8b5cf6' }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] uppercase tracking-[0.24em] font-bold mb-0.5" style={{ color: '#8b5cf6' }}>
                      Upcoming · {nextMeeting.status === 'confirmed' ? 'Confirmed' : 'Requested'}
                    </div>
                    <div className="text-[13px] font-bold truncate" style={{ color: DARK, fontFamily: SERIF }}>{nextMeeting.type}</div>
                    <div className="text-[9px] font-light mt-0.5" style={{ color: MUTED }}>{nextMeeting.date} · {nextMeeting.time} · {nextMeeting.format}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(26,20,16,0.18)' }} strokeWidth={2} />
              </Link>
            </motion.div>
          )}

          {/* ── Projects shortcut (mobile only) ── */}
          <motion.div variants={fade} className="mb-4 md:hidden">
            <Link to="/portal/projects"
              className="flex items-center gap-3 p-4 transition-colors active:bg-stone-50"
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
              <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(26,20,16,0.04)' }}>
                <Building2 className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold" style={{ color: DARK }}>My Projects</div>
                <div className="text-[9px] font-light" style={{ color: MUTED }}>View all projects</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(26,20,16,0.18)' }} strokeWidth={2} />
            </Link>
          </motion.div>

        </div>
      </motion.div>
    </PortalLayout>
  );
}
