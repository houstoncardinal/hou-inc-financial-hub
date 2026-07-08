import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, FileText, MessageSquare, Calendar, CheckCircle, Circle,
  FolderOpen, PlusCircle, Clock, AlertCircle, ChevronRight, TrendingUp,
  Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const BG     = '#F5F2EE';

const STATUS_STEPS = [
  { key: 'registered',             label: 'Account Created',         detail: 'You\'re in our system' },
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

const fade  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };

export default function PortalDashboard() {
  const { client, getBrief, getMessages, getDocuments, getMeetings } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, navigate]);
  if (!client || (client.status && client.status !== 'approved')) return null;

  const brief      = getBrief();
  const messages   = getMessages();
  const docs       = getDocuments();
  const meetings   = getMeetings();
  const stepIdx    = getStepIndex(brief);
  const recentMsgs = messages.slice(-4).reverse();
  const pendingDocs = docs.filter(d => d.status === 'pending').length;
  const nextMeeting = meetings.find(m => m.status === 'confirmed' || m.status === 'requested');
  const builderMsgs = messages.filter(m => m.sender === 'builder').length;

  const STATS = [
    {
      label: 'Project Phase',
      value: STATUS_STEPS[stepIdx]?.label ?? 'Getting Started',
      icon: TrendingUp,
      sub: `Step ${stepIdx + 1} of ${STATUS_STEPS.length}`,
      color: GOLD,
      bg: 'rgba(157,126,63,0.08)',
    },
    {
      label: 'Messages',
      value: String(messages.length),
      icon: MessageSquare,
      sub: `${builderMsgs} from your consultant`,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
    },
    {
      label: 'Documents',
      value: String(docs.length),
      icon: FolderOpen,
      sub: pendingDocs > 0 ? `${pendingDocs} awaiting upload` : 'All up to date',
      color: pendingDocs > 0 ? '#f59e0b' : '#10b981',
      bg: pendingDocs > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
    },
    {
      label: 'Next Meeting',
      value: nextMeeting ? nextMeeting.date : 'None Scheduled',
      icon: Calendar,
      sub: nextMeeting ? `${nextMeeting.format} · ${nextMeeting.time}` : 'Request one anytime',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)',
    },
  ];

  const QUICK_ACTIONS = [
    { to: '/portal/project',   Icon: FileText,      label: brief ? 'View Project Brief' : 'Complete Project Brief', sub: brief ? `Status: ${brief.status}` : '5 min · Unlock next steps', gold: !brief },
    { to: '/portal/messages',  Icon: MessageSquare, label: 'Message Your Consultant',  sub: `${messages.length} total messages`, gold: false },
    { to: '/portal/meetings',  Icon: Calendar,      label: 'Schedule a Meeting',       sub: nextMeeting ? 'View upcoming' : 'Request consultation', gold: false },
    { to: '/portal/documents', Icon: FolderOpen,    label: 'Upload Documents',         sub: pendingDocs > 0 ? `${pendingDocs} requested` : 'Manage your files', gold: pendingDocs > 0 },
    { to: '/portal/project',   Icon: PlusCircle,    label: 'Start New Project',        sub: 'Add another project', gold: false },
    { to: '/contact',          Icon: Building2,     label: 'Visit Our Office',         sub: '2100 W Loop South · Houston', gold: false },
  ];

  return (
    <PortalLayout>
      <motion.div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl" variants={stagger} initial="hidden" animate="show">

        {/* ── Greeting ── */}
        <motion.div variants={fade} className="mb-10">
          <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>
            {getGreeting()} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Welcome back, {client.name.split(' ')[0]}.
          </div>
          <p className="text-[13px] font-light mt-2" style={{ color: MUTED }}>
            Here's an overview of your project with HOU INC.
          </p>
        </motion.div>

        {/* ── Stat cards ── */}
        <motion.div variants={fade} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-5" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ color: MUTED }}>{s.label}</div>
                <div className="text-[15px] font-bold mb-0.5 leading-tight" style={{ color: DARK }}>{s.value}</div>
                <div className="text-[10px] font-light" style={{ color: MUTED }}>{s.sub}</div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Project timeline + Builder ── */}
        <motion.div variants={fade} className="grid md:grid-cols-3 gap-5 mb-8">

          {/* Project timeline */}
          <div className="md:col-span-2 p-7" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[9px] uppercase tracking-[0.34em] font-bold mb-0.5" style={{ color: GOLD }}>Project Timeline</div>
                <div className="text-[12px] font-light" style={{ color: MUTED }}>Your build journey from first brief to handover</div>
              </div>
              <div className="text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5"
                style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>
                Phase {stepIdx + 1}/{STATUS_STEPS.length}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6 h-1 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
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
              <div className="space-y-4">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < stepIdx;
                  const current = i === stepIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      <div className="shrink-0 mt-0.5 z-10 bg-white" style={{ width: 15, height: 15 }}>
                        {done ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.08 }}>
                            <CheckCircle className="w-[15px] h-[15px]" style={{ color: GOLD }} strokeWidth={2} />
                          </motion.div>
                        ) : current ? (
                          <motion.div className="w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: GOLD, backgroundColor: 'rgba(157,126,63,0.12)' }}
                            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
                          </motion.div>
                        ) : (
                          <Circle className="w-[15px] h-[15px]" style={{ color: BORDER }} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="text-[12px] font-bold flex items-center gap-2"
                          style={{ color: done || current ? DARK : 'rgba(26,20,16,0.28)' }}>
                          {step.label}
                          {current && (
                            <span className="text-[8px] uppercase tracking-[0.22em] font-bold px-2 py-0.5"
                              style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>Current</span>
                          )}
                        </div>
                        <div className="text-[10px] font-light" style={{ color: done || current ? MUTED : 'rgba(26,20,16,0.18)' }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!brief && (
              <div className="mt-6 pt-5 flex items-center justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
                <p className="text-[11px] font-light" style={{ color: MUTED }}>Complete your brief to unlock the next step (~5 min)</p>
                <Link to="/portal/project"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-black px-5 py-2.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                  Start Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>

          {/* Builder card */}
          <div className="flex flex-col" style={{ backgroundColor: '#0D0A06', border: '1px solid rgba(157,126,63,0.15)' }}>
            <div className="p-7 flex-1">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[8px] uppercase tracking-[0.34em] font-bold" style={{ color: GOLD }}>Your Consultant</div>
                <div className="flex items-center gap-1.5">
                  <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2ecc71' }}
                    animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
                  <span className="text-[8px] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>Available</span>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 flex items-center justify-center text-[14px] font-black shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(157,126,63,0.25) 0%, rgba(196,167,107,0.1) 100%)', border: '1.5px solid rgba(157,126,63,0.35)', color: GOLDF, fontFamily: SERIF }}>
                  {BUILDER.initials}
                </div>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: '#FAF7F2' }}>{BUILDER.name}</div>
                  <div className="text-[10px] font-light mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{BUILDER.title}</div>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed font-light mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {BUILDER.bio}
              </p>

              <div className="space-y-2.5">
                <a href={`tel:${BUILDER.phone}`} className="flex items-center gap-2 text-[10px] font-light transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLDF; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: GOLD }} />
                  {BUILDER.phone}
                </a>
                <a href={`mailto:${BUILDER.email}`} className="flex items-center gap-2 text-[10px] font-light transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLDF; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: GOLD }} />
                  {BUILDER.email}
                </a>
              </div>
            </div>

            <div className="p-5 space-y-2" style={{ borderTop: '1px solid rgba(157,126,63,0.12)' }}>
              <Link to="/portal/messages"
                className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] font-black py-3 transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD, color: '#0D0A06' }}>
                <MessageSquare className="w-3 h-3" strokeWidth={2} />
                Send Message
              </Link>
              <Link to="/portal/meetings"
                className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold py-3 transition-all"
                style={{ border: '1px solid rgba(157,126,63,0.3)', color: GOLDF }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(157,126,63,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,126,63,0.3)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                <Calendar className="w-3 h-3" strokeWidth={1.5} />
                Schedule Call
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Quick actions ── */}
        <motion.div variants={fade} className="mb-8">
          <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-4" style={{ color: GOLD }}>Quick Actions</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ to, Icon, label, sub, gold }) => (
              <Link key={to + label} to={to}
                className="group p-5 transition-all duration-200"
                style={{ backgroundColor: gold ? 'rgba(157,126,63,0.08)' : '#FFFFFF', border: `1px solid ${gold ? 'rgba(157,126,63,0.3)' : BORDER}` }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 6px 24px rgba(26,20,16,0.1)';
                  el.style.borderColor = gold ? GOLD : 'rgba(157,126,63,0.3)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = 'none';
                  el.style.borderColor = gold ? 'rgba(157,126,63,0.3)' : BORDER;
                  el.style.transform = 'none';
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: gold ? 'rgba(157,126,63,0.15)' : 'rgba(26,20,16,0.04)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: gold ? GOLD : MUTED }} strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: gold ? GOLD : MUTED }} strokeWidth={2} />
                </div>
                <div className="text-[12px] font-bold mb-0.5 leading-tight" style={{ color: DARK }}>{label}</div>
                <div className="text-[10px] font-light" style={{ color: MUTED }}>{sub}</div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Recent messages ── */}
        {recentMsgs.length > 0 && (
          <motion.div variants={fade} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[9px] uppercase tracking-[0.36em] font-bold" style={{ color: GOLD }}>Recent Messages</div>
              <Link to="/portal/messages" className="text-[9px] uppercase tracking-[0.22em] font-bold flex items-center gap-1"
                style={{ color: GOLD }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                View All <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              </Link>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              {recentMsgs.map((m, i) => (
                <div key={m.id} className="flex items-start gap-4 p-5"
                  style={{ borderBottom: i < recentMsgs.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div className="w-8 h-8 flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{
                      backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.12)' : 'rgba(26,20,16,0.06)',
                      color: m.sender === 'builder' ? GOLD : 'rgba(26,20,16,0.5)',
                      fontFamily: SERIF,
                    }}>
                    {m.senderName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                      <span className="text-[9px]" style={{ color: 'rgba(26,20,16,0.3)' }}>
                        {new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {m.sender === 'builder' && (
                        <span className="text-[8px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5"
                          style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>HOU INC</span>
                      )}
                    </div>
                    <p className="text-[11px] font-light truncate" style={{ color: MUTED }}>{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Documents at a glance ── */}
        {docs.length > 0 && (
          <motion.div variants={fade} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[9px] uppercase tracking-[0.36em] font-bold" style={{ color: GOLD }}>Documents</div>
              <Link to="/portal/documents" className="text-[9px] uppercase tracking-[0.22em] font-bold flex items-center gap-1"
                style={{ color: GOLD }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                Manage All <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {docs.slice(0, 3).map(doc => (
                <div key={doc.id} className="p-5 flex items-center gap-4"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: doc.status === 'uploaded' ? 'rgba(16,185,129,0.1)' : doc.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(26,20,16,0.06)',
                    }}>
                    {doc.status === 'uploaded'
                      ? <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={1.5} />
                      : doc.status === 'pending'
                        ? <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                        : <Clock className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: DARK }}>{doc.name}</div>
                    <div className="text-[9px] uppercase tracking-[0.18em] mt-0.5 font-semibold"
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
          <motion.div variants={fade} className="mb-8 p-6" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#8b5cf6' }} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.26em] font-bold mb-0.5" style={{ color: '#8b5cf6' }}>
                    Upcoming Meeting · {nextMeeting.status === 'confirmed' ? 'Confirmed' : 'Requested'}
                  </div>
                  <div className="text-[14px] font-bold" style={{ color: DARK }}>{nextMeeting.type}</div>
                  <div className="text-[11px] font-light mt-0.5" style={{ color: MUTED }}>
                    {nextMeeting.date} · {nextMeeting.time} · {nextMeeting.format}
                  </div>
                </div>
              </div>
              <Link to="/portal/meetings" className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-bold"
                style={{ color: '#8b5cf6' }}>
                Details <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </motion.div>
        )}

      </motion.div>
    </PortalLayout>
  );
}
