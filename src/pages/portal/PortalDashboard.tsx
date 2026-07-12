import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, FileText, MessageSquare, Calendar, CheckCircle, Circle,
  FolderOpen, PlusCircle, Clock, AlertCircle, ChevronRight, TrendingUp,
  Building2, Phone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';

/* ── Tokens ── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const STATUS_STEPS = [
  { key: 'registered',             label: 'Account Created',          detail: "You're in our system" },
  { key: 'brief_submitted',        label: 'Project Brief Submitted',  detail: 'Builder reviews your vision' },
  { key: 'consultation_scheduled', label: 'Consultation Scheduled',   detail: 'First call with your team' },
  { key: 'proposal_sent',          label: 'Proposal Delivered',       detail: 'Review scope & pricing' },
  { key: 'in_progress',            label: 'Build Underway',           detail: 'Construction has begun' },
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

const fade    = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };

export default function PortalDashboard() {
  const { client, loaded, getBrief, getMessages, getDocuments, getMeetings } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  if (!loaded || !client || (client.status && client.status !== 'approved')) return null;

  const brief        = getBrief();
  const messages     = getMessages();
  const docs         = getDocuments();
  const meetings     = getMeetings();
  const stepIdx      = getStepIndex(brief);
  const recentMsgs   = messages.slice(-3).reverse();
  const pendingDocs  = docs.filter(d => d.status === 'pending').length;
  const nextMeeting  = meetings.find(m => m.status === 'confirmed' || m.status === 'requested');
  const builderMsgs  = messages.filter(m => m.sender === 'builder');
  const unreadCount  = builderMsgs.length;

  const STATS = [
    {
      label: 'Project Phase',
      value: STATUS_STEPS[stepIdx]?.label ?? 'Getting Started',
      sub: `Step ${stepIdx + 1} of ${STATUS_STEPS.length}`,
      Icon: TrendingUp, color: GOLD, bg: 'rgba(157,126,63,0.08)',
    },
    {
      label: 'Messages',
      value: String(messages.length),
      sub: unreadCount > 0 ? `${unreadCount} from your consultant` : 'No messages yet',
      Icon: MessageSquare, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',
    },
    {
      label: 'Documents',
      value: String(docs.length),
      sub: pendingDocs > 0 ? `${pendingDocs} awaiting upload` : 'All up to date',
      Icon: FolderOpen,
      color: pendingDocs > 0 ? '#f59e0b' : '#10b981',
      bg: pendingDocs > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
    },
    {
      label: 'Next Meeting',
      value: nextMeeting ? nextMeeting.date : 'None Scheduled',
      sub: nextMeeting ? `${nextMeeting.format} · ${nextMeeting.time}` : 'Request one anytime',
      Icon: Calendar, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',
    },
  ];

  const QUICK_ACTIONS = [
    {
      to: '/portal/project',   Icon: FileText,
      label: brief ? 'View Project Brief' : 'Complete Project Brief',
      sub: brief ? `Status: ${brief.status}` : '5 min · Unlock next steps',
      gold: !brief,
    },
    {
      to: '/portal/messages',  Icon: MessageSquare,
      label: 'Message Consultant',
      sub: messages.length > 0 ? `${messages.length} total messages` : 'Send your first message',
      gold: false,
    },
    {
      to: '/portal/meetings',  Icon: Calendar,
      label: 'Schedule a Meeting',
      sub: nextMeeting ? 'View upcoming' : 'Request consultation',
      gold: false,
    },
    {
      to: '/portal/documents', Icon: FolderOpen,
      label: 'Upload Documents',
      sub: pendingDocs > 0 ? `${pendingDocs} requested` : 'Manage your files',
      gold: pendingDocs > 0,
    },
  ];

  return (
    <PortalLayout>
      <motion.div
        className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-12 max-w-5xl"
        variants={stagger} initial="hidden" animate="show">

        {/* ── Unread messages alert ── */}
        {unreadCount > 0 && (
          <motion.div variants={fade} className="mb-5">
            <Link to="/portal/messages"
              className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 transition-opacity hover:opacity-90 active:opacity-75"
              style={{ backgroundColor: 'rgba(157,126,63,0.09)', border: '1px solid rgba(157,126,63,0.28)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center shrink-0 relative"
                  style={{ backgroundColor: 'rgba(157,126,63,0.15)', border: '1px solid rgba(157,126,63,0.3)' }}>
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[8px] font-black"
                    style={{ backgroundColor: GOLD, color: '#FFF' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
                <div>
                  <div className="text-[12px] font-bold" style={{ color: DARK }}>
                    {unreadCount === 1 ? '1 message' : `${unreadCount} messages`} from {BUILDER.name}
                  </div>
                  <div className="text-[10px] font-light" style={{ color: MUTED }}>
                    Tap to view your conversation
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 shrink-0" style={{ color: GOLDF }} strokeWidth={2} />
            </Link>
          </motion.div>
        )}

        {/* ── Greeting ── */}
        <motion.div variants={fade} className="mb-7 sm:mb-10">
          <div className="text-[7px] sm:text-[8px] uppercase tracking-[0.42em] font-bold mb-2" style={{ color: GOLD }}>
            {getGreeting()} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(24px, 5vw, 44px)', color: DARK, lineHeight: 1.06,
          }}>
            Welcome back, {client.name.split(' ')[0]}.
          </div>
          <p className="text-[12px] sm:text-[13px] font-light mt-2" style={{ color: MUTED }}>
            Here's an overview of your project with HOU INC.
          </p>
        </motion.div>

        {/* ── Stat cards ── */}
        <motion.div variants={fade} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {STATS.map(s => {
            const Icon = s.Icon;
            return (
              <div key={s.label} className="p-4 sm:p-5"
                style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mb-3"
                  style={{ backgroundColor: s.bg }}>
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
                </div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] font-semibold mb-0.5"
                  style={{ color: MUTED }}>{s.label}</div>
                <div className="text-[13px] sm:text-[15px] font-bold leading-tight mb-0.5"
                  style={{ color: DARK }}>{s.value}</div>
                <div className="text-[9px] sm:text-[10px] font-light" style={{ color: MUTED }}>{s.sub}</div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Project timeline + Builder ── */}
        <motion.div variants={fade} className="grid md:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">

          {/* Timeline */}
          <div className="md:col-span-2 p-5 sm:p-7"
            style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
            <div className="flex items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-0.5" style={{ color: GOLD }}>
                  Project Timeline
                </div>
                <div className="text-[11px] sm:text-[12px] font-light" style={{ color: MUTED }}>
                  Your build journey from first brief to handover
                </div>
              </div>
              <div className="text-[8px] uppercase tracking-[0.16em] font-bold px-2.5 py-1.5 shrink-0"
                style={{ backgroundColor: 'rgba(157,126,63,0.09)', color: GOLD }}>
                Phase {stepIdx + 1}/{STATUS_STEPS.length}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5 h-0.5 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
              <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                initial={{ width: 0 }}
                animate={{ width: `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
            </div>

            {/* Steps */}
            <div className="relative">
              <div className="absolute left-[7px] top-4 bottom-4 w-px" style={{ backgroundColor: BORDER }} />
              <div className="absolute left-[7px] top-4 w-px transition-all duration-700"
                style={{ backgroundColor: GOLD, height: stepIdx === 0 ? 0 : `${Math.min((stepIdx / (STATUS_STEPS.length - 1)) * 100, 92)}%` }} />
              <div className="space-y-3 sm:space-y-4">
                {STATUS_STEPS.map((step, i) => {
                  const done    = i < stepIdx;
                  const current = i === stepIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-3 sm:gap-4 relative">
                      <div className="shrink-0 mt-0.5 z-10 bg-white" style={{ width: 15, height: 15 }}>
                        {done ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.08 }}>
                            <CheckCircle className="w-[15px] h-[15px]" style={{ color: GOLD }} strokeWidth={2} />
                          </motion.div>
                        ) : current ? (
                          <motion.div className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: GOLD, backgroundColor: 'rgba(157,126,63,0.12)' }}
                            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
                          </motion.div>
                        ) : (
                          <Circle className="w-[15px] h-[15px]" style={{ color: BORDER }} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="text-[11px] sm:text-[12px] font-bold flex flex-wrap items-center gap-2"
                          style={{ color: done || current ? DARK : 'rgba(26,20,16,0.25)' }}>
                          {step.label}
                          {current && (
                            <span className="text-[7px] uppercase tracking-[0.22em] font-bold px-1.5 py-0.5"
                              style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>Current</span>
                          )}
                        </div>
                        <div className="text-[9px] sm:text-[10px] font-light"
                          style={{ color: done || current ? MUTED : 'rgba(26,20,16,0.16)' }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!brief && (
              <div className="mt-5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ borderTop: `1px solid ${BORDER}` }}>
                <p className="text-[11px] font-light" style={{ color: MUTED }}>
                  Complete your brief to unlock the next step (~5 min)
                </p>
                <Link to="/portal/project"
                  className="inline-flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-5 py-2.5 transition-opacity hover:opacity-88 active:opacity-75"
                  style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                  Start Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>

          {/* Builder card */}
          <div style={{ backgroundColor: '#0D0A06', border: '1px solid rgba(157,126,63,0.15)' }}>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[7px] uppercase tracking-[0.34em] font-bold" style={{ color: GOLD }}>
                  Your Consultant
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2ecc71' }}
                    animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
                  <span className="text-[8px] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>Available</span>
                </div>
              </div>

              {/* Horizontal layout on mobile for compactness */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-[13px] font-black shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(157,126,63,0.25) 0%, rgba(196,167,107,0.1) 100%)',
                    border: '1.5px solid rgba(157,126,63,0.35)', color: GOLDF, fontFamily: SERIF,
                  }}>
                  {BUILDER.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-[14px] font-bold" style={{ color: '#FAF7F2' }}>
                    {BUILDER.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-light" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    {BUILDER.title}
                  </div>
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] leading-relaxed font-light mb-4"
                style={{ color: 'rgba(255,255,255,0.32)' }}>
                {BUILDER.bio}
              </p>

              {/* Contact links */}
              <div className="flex flex-col gap-2 mb-4">
                <a href={`tel:${BUILDER.phone}`}
                  className="flex items-center gap-2 text-[10px] font-light transition-colors active:opacity-60"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLDF; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'; }}>
                  <Phone className="w-3 h-3 shrink-0" style={{ color: GOLD }} strokeWidth={1.5} />
                  {BUILDER.phone}
                </a>
                <a href={`mailto:${BUILDER.email}`}
                  className="flex items-center gap-2 text-[10px] font-light transition-colors active:opacity-60"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLDF; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'; }}>
                  <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: GOLD }} />
                  </div>
                  {BUILDER.email}
                </a>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-2" style={{ borderTop: '1px solid rgba(157,126,63,0.1)', paddingTop: 16 }}>
              <Link to="/portal/messages"
                className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black py-3 transition-opacity hover:opacity-88 active:opacity-70"
                style={{ backgroundColor: GOLD, color: '#0D0A06' }}>
                <MessageSquare className="w-3 h-3" strokeWidth={2} />
                Send Message
              </Link>
              <Link to="/portal/meetings"
                className="w-full flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold py-3 transition-all active:opacity-70"
                style={{ border: '1px solid rgba(157,126,63,0.28)', color: GOLDF }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,126,63,0.28)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}>
                <Calendar className="w-3 h-3" strokeWidth={1.5} />
                Schedule Call
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Quick actions ── */}
        <motion.div variants={fade} className="mb-6 sm:mb-8">
          <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-3 sm:mb-4" style={{ color: GOLD }}>
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ to, Icon, label, sub, gold }) => (
              <Link key={to + label} to={to}
                className="group p-4 sm:p-5 transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: gold ? 'rgba(157,126,63,0.07)' : '#FFFFFF',
                  border: `1px solid ${gold ? 'rgba(157,126,63,0.28)' : BORDER}`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 6px 24px rgba(26,20,16,0.09)';
                  el.style.borderColor = gold ? GOLD : 'rgba(157,126,63,0.28)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = 'none';
                  el.style.borderColor = gold ? 'rgba(157,126,63,0.28)' : BORDER;
                  el.style.transform = 'none';
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"
                    style={{ backgroundColor: gold ? 'rgba(157,126,63,0.14)' : 'rgba(26,20,16,0.04)' }}>
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                      style={{ color: gold ? GOLD : MUTED }} strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: gold ? GOLD : MUTED }} strokeWidth={2} />
                </div>
                <div className="text-[11px] sm:text-[12px] font-bold mb-0.5 leading-tight" style={{ color: DARK }}>
                  {label}
                </div>
                <div className="text-[9px] sm:text-[10px] font-light" style={{ color: MUTED }}>{sub}</div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Recent messages ── */}
        {recentMsgs.length > 0 && (
          <motion.div variants={fade} className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-[8px] uppercase tracking-[0.34em] font-bold" style={{ color: GOLD }}>
                Recent Messages
              </div>
              <Link to="/portal/messages"
                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] font-bold transition-opacity hover:opacity-70"
                style={{ color: GOLD }}>
                View All <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              </Link>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              {recentMsgs.map((m, i) => (
                <Link key={m.id} to="/portal/messages"
                  className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition-colors hover:bg-stone-50 active:bg-stone-100"
                  style={{ borderBottom: i < recentMsgs.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0 mt-0.5"
                    style={{
                      backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.12)' : 'rgba(26,20,16,0.06)',
                      color: m.sender === 'builder' ? GOLD : 'rgba(26,20,16,0.45)',
                      fontFamily: SERIF,
                    }}>
                    {m.senderName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                      {m.sender === 'builder' && (
                        <span className="text-[7px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5"
                          style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>HOU INC</span>
                      )}
                      <span className="text-[9px] ml-auto" style={{ color: 'rgba(26,20,16,0.28)' }}>
                        {new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] font-light line-clamp-1" style={{ color: MUTED }}>
                      {m.text}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: 'rgba(26,20,16,0.18)' }} strokeWidth={2} />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Documents at a glance ── */}
        {docs.length > 0 && (
          <motion.div variants={fade} className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-[8px] uppercase tracking-[0.34em] font-bold" style={{ color: GOLD }}>Documents</div>
              <Link to="/portal/documents"
                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] font-bold transition-opacity hover:opacity-70"
                style={{ color: GOLD }}>
                Manage All <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {docs.slice(0, 3).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: doc.status === 'uploaded' ? 'rgba(16,185,129,0.1)'
                        : doc.status === 'pending' ? 'rgba(245,158,11,0.1)'
                        : 'rgba(26,20,16,0.06)',
                    }}>
                    {doc.status === 'uploaded'
                      ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#10b981' }} strokeWidth={1.5} />
                      : doc.status === 'pending'
                        ? <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                        : <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: MUTED }} strokeWidth={1.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: DARK }}>{doc.name}</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] mt-0.5 font-semibold"
                      style={{ color: doc.status === 'uploaded' ? '#10b981' : doc.status === 'pending' ? '#f59e0b' : MUTED }}>
                      {doc.status === 'pending' ? 'Upload Required' : doc.status === 'uploaded' ? 'Uploaded' : doc.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Next meeting ── */}
        {nextMeeting && (
          <motion.div variants={fade} className="mb-6 sm:mb-8">
            <Link to="/portal/meetings"
              className="flex items-center justify-between gap-4 p-4 sm:p-6 transition-colors hover:bg-white active:bg-stone-50"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#8b5cf6' }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] uppercase tracking-[0.24em] font-bold mb-0.5" style={{ color: '#8b5cf6' }}>
                    Upcoming · {nextMeeting.status === 'confirmed' ? 'Confirmed' : 'Requested'}
                  </div>
                  <div className="text-[13px] sm:text-[14px] font-bold truncate" style={{ color: DARK }}>
                    {nextMeeting.type}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-light mt-0.5" style={{ color: MUTED }}>
                    {nextMeeting.date} · {nextMeeting.time} · {nextMeeting.format}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(26,20,16,0.2)' }} strokeWidth={2} />
            </Link>
          </motion.div>
        )}

        {/* ── More actions on mobile ── */}
        <motion.div variants={fade} className="mb-6 sm:mb-8 md:hidden">
          <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-3" style={{ color: GOLD }}>
            More
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/portal/projects', Icon: Building2, label: 'My Projects',   sub: 'View all projects' },
              { to: '/portal/settings', Icon: PlusCircle, label: 'Account',      sub: 'Profile & settings' },
            ].map(({ to, Icon, label, sub }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-4 active:bg-stone-50 transition-colors"
                style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                <div className="w-7 h-7 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(26,20,16,0.04)' }}>
                  <Icon className="w-3 h-3" style={{ color: MUTED }} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate" style={{ color: DARK }}>{label}</div>
                  <div className="text-[9px] font-light" style={{ color: MUTED }}>{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </PortalLayout>
  );
}
