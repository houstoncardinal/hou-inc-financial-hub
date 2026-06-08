import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, FileText, MessageSquare, Calendar, CheckCircle, Clock, Circle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.1) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

const STATUS_STEPS = [
  { key: 'registered',             label: 'Account Created',          detail: 'You are in the system' },
  { key: 'brief_submitted',        label: 'Project Brief Submitted',  detail: 'Builder reviews your vision' },
  { key: 'consultation_scheduled', label: 'Consultation Scheduled',   detail: 'First call with your builder' },
  { key: 'proposal_sent',          label: 'Proposal Delivered',       detail: 'Review project scope & pricing' },
  { key: 'in_progress',            label: 'Build Underway',           detail: 'Construction has begun' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStepIndex(brief: ReturnType<ReturnType<typeof usePortal>['getBrief']>) {
  if (!brief) return 0;
  if (brief.status === 'in_progress') return 4;
  if (brief.status === 'consultation_scheduled') return 2;
  if (brief.status === 'reviewing' || brief.status === 'submitted') return 1;
  return 0;
}

export default function PortalDashboard() {
  const { client, getBrief, getMessages } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!client) navigate('/portal', { replace: true });
  }, [client, navigate]);

  if (!client) return null;

  const brief    = getBrief();
  const messages = getMessages();
  const stepIdx  = getStepIndex(brief);
  const recentMsgs = messages.slice(-3).reverse();

  return (
    <PortalLayout>
      <div className="p-6 md:p-10 max-w-5xl">

        {/* ── Greeting ── */}
        <div className="mb-10">
          <div className="text-[9px] uppercase tracking-[0.38em] font-semibold mb-1" style={{ color: GOLD }}>
            {getGreeting()}
          </div>
          <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 46px)', color: DARK, lineHeight: 1.05 }}>
            {client.name.split(' ')[0]}, welcome to your portal.
          </h1>
        </div>

        {/* ── Top row: Status + Quick actions ── */}
        <div className="grid md:grid-cols-3 gap-5 mb-6">

          {/* Status card */}
          <div
            className="md:col-span-2 p-6 md:p-8"
            style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 2px 18px rgba(28,24,20,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="text-[9px] uppercase tracking-[0.32em] font-bold" style={{ color: GOLD }}>Project Status</div>
            </div>

            {/* Step tracker */}
            <div className="space-y-3">
              {STATUS_STEPS.map((step, i) => {
                const done    = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {done    ? <CheckCircle className="w-4 h-4" style={{ color: GOLD }} strokeWidth={2} />
                               : current ? <Clock className="w-4 h-4" style={{ color: GOLD }} strokeWidth={2} />
                               : <Circle className="w-4 h-4" style={{ color: BORDER }} strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12px] font-bold"
                        style={{ color: done || current ? DARK : 'rgba(28,24,20,0.3)' }}
                      >
                        {step.label}
                        {current && (
                          <span className="ml-2 text-[8px] uppercase tracking-[0.22em] font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-light" style={{ color: done || current ? MUTED : 'rgba(28,24,20,0.2)' }}>{step.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!brief && (
              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${BORDER}` }}>
                <p className="text-[11px] font-light mb-4" style={{ color: MUTED }}>
                  Complete your project brief to unlock the next step. It takes about 5 minutes.
                </p>
                <Link
                  to="/portal/project"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black px-6 py-3 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: GOLD, color: DARK }}
                >
                  Complete Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>

          {/* Builder card */}
          <div
            className="p-6 flex flex-col justify-between"
            style={{ backgroundColor: DARK, ...DOT, boxShadow: '0 2px 18px rgba(28,24,20,0.08)' }}
          >
            <div>
              <div className="text-[8px] uppercase tracking-[0.32em] font-bold mb-4" style={{ color: GOLD }}>Your Builder</div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black shrink-0"
                  style={{ backgroundColor: 'rgba(157,126,63,0.2)', color: GOLD, border: '1px solid rgba(157,126,63,0.35)', fontFamily: SERIF }}
                >
                  {BUILDER.initials}
                </div>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: CREAM }}>{BUILDER.name}</div>
                  <div className="text-[10px] font-light" style={{ color: 'rgba(250,247,242,0.4)' }}>{BUILDER.title}</div>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed font-light" style={{ color: 'rgba(250,247,242,0.38)' }}>{BUILDER.bio}</p>
            </div>
            <Link
              to="/portal/messages"
              className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-black py-2.5 px-4 transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              <MessageSquare className="w-3 h-3" strokeWidth={2} />
              Message Now
            </Link>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { to: '/portal/project',  Icon: FileText,      label: brief ? 'View Brief' : 'Complete Brief',     sub: brief ? 'Review your submission' : '5 min · 4 steps' },
            { to: '/portal/messages', Icon: MessageSquare, label: 'Message Builder',                           sub: `${messages.length} message${messages.length !== 1 ? 's' : ''}` },
            { to: '/contact',         Icon: Calendar,      label: 'Request Meeting',                           sub: 'Schedule a consultation' },
          ].map(({ to, Icon, label, sub }) => (
            <Link
              key={to}
              to={to}
              className="p-5 transition-shadow duration-300 group"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(28,24,20,0.03)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(28,24,20,0.09)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 12px rgba(28,24,20,0.03)'; }}
            >
              <Icon className="w-4 h-4 mb-3" style={{ color: GOLD }} strokeWidth={1.5} />
              <div className="text-[12px] font-bold mb-0.5" style={{ color: DARK }}>{label}</div>
              <div className="text-[10px] font-light" style={{ color: MUTED }}>{sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Recent messages ── */}
        {recentMsgs.length > 0 && (
          <div
            className="p-6 md:p-8"
            style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 2px 18px rgba(28,24,20,0.04)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[9px] uppercase tracking-[0.32em] font-bold" style={{ color: GOLD }}>Recent Messages</div>
              <Link
                to="/portal/messages"
                className="text-[9px] uppercase tracking-[0.22em] font-bold transition-opacity hover:opacity-70"
                style={{ color: GOLD, borderBottom: `1px solid ${GOLD}` }}
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentMsgs.map(m => (
                <div key={m.id} className="flex items-start gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{
                      backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.12)' : 'rgba(28,24,20,0.06)',
                      color: m.sender === 'builder' ? GOLD : 'rgba(28,24,20,0.5)',
                      fontFamily: SERIF,
                    }}
                  >
                    {m.senderName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                      <span className="text-[9px]" style={{ color: 'rgba(28,24,20,0.3)' }}>
                        {new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] font-light truncate" style={{ color: MUTED }}>{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
