import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, CheckCircle, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal } from '@/hooks/usePortal';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* ── Pipeline ────────────────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  'Brief Submitted',
  'Under Review',
  'Proposal Sent',
  'Contract Signed',
  'Build Underway',
];

const STATUS_TO_STEP: Record<string, number> = {
  submitted:               0,
  reviewing:               1,
  consultation_scheduled:  2,
  in_progress:             4,
};

const STATUS_LABELS: Record<string, string> = {
  draft:                   'Draft',
  submitted:               'Submitted',
  reviewing:               'Under Review',
  consultation_scheduled:  'Consultation Scheduled',
  in_progress:             'In Progress',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:                   { bg: 'rgba(122,110,100,0.1)',   text: MUTED },
  submitted:               { bg: 'rgba(157,126,63,0.12)',   text: GOLD },
  reviewing:               { bg: 'rgba(59,130,246,0.1)',    text: '#3b82f6' },
  consultation_scheduled:  { bg: 'rgba(139,92,246,0.1)',    text: '#8b5cf6' },
  in_progress:             { bg: 'rgba(16,185,129,0.1)',    text: '#10b981' },
};

const UPCOMING_TASKS = [
  'Review and sign project proposal',
  'Upload proof of funds documentation',
  'Schedule pre-construction site walkthrough',
];

export default function PortalProjects() {
  const { client, getBrief } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);
  if (!client) return null;

  const brief     = getBrief();
  const stepIdx   = brief ? (STATUS_TO_STEP[brief.status] ?? 0) : -1;
  const sc        = brief ? (STATUS_COLORS[brief.status] ?? STATUS_COLORS.submitted) : STATUS_COLORS.submitted;

  return (
    <PortalLayout>
      <motion.div
        className="px-6 md:px-10 py-8 md:py-12 max-w-6xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Header ── */}
        <div className="mb-10">
          <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>
            Client Portal
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            My Projects
          </div>
        </div>

        {!brief ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.18)` }}
            >
              <FolderOpen className="w-7 h-7" style={{ color: GOLDF }} strokeWidth={1} />
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: DARK }} className="mb-3">
              No active projects yet.
            </div>
            <p className="text-[13px] font-light mb-9 max-w-xs" style={{ color: MUTED }}>
              Submit your project brief and we'll build a custom plan tailored to your vision.
            </p>
            <Link
              to="/portal/project"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-7 py-3.5 transition-opacity hover:opacity-90"
              style={{ backgroundColor: GOLD, color: '#FAF7F2' }}
            >
              Submit Project Brief <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        ) : (
          <>
            {/* ── Project Card ── */}
            <div className="mb-6" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>

              {/* Card header */}
              <div className="p-7" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="text-[17px] font-bold" style={{ color: DARK }}>{brief.type}</div>
                      <span
                        className="text-[7px] uppercase tracking-[0.24em] font-bold px-2.5 py-1"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {STATUS_LABELS[brief.status] ?? brief.status}
                      </span>
                    </div>
                    <div className="text-[12px] font-light" style={{ color: MUTED }}>
                      {Array.isArray(brief.style) && brief.style.length > 0
                        ? brief.style.join(' · ')
                        : brief.style}{' '}
                      · {brief.sqft} sq ft
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline */}
              <div className="px-7 pt-7 pb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-7" style={{ color: GOLD }}>
                  Project Pipeline
                </div>
                <div className="flex">
                  {PIPELINE_STEPS.map((step, i) => {
                    const done    = i < stepIdx;
                    const current = i === stepIdx;
                    const isFirst = i === 0;
                    const isLast  = i === PIPELINE_STEPS.length - 1;
                    const leftGold  = !isFirst && i <= stepIdx;
                    const rightGold = !isLast  && i < stepIdx;

                    return (
                      <div key={step} className="flex-1 flex flex-col items-center">
                        {/* Connector + node row */}
                        <div className="flex items-center w-full" style={{ marginBottom: 8 }}>
                          {/* Left half-connector */}
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: isFirst ? 'transparent' : leftGold ? GOLD : BORDER }}
                          />
                          {/* Node */}
                          <div
                            className="w-5 h-5 flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: done ? GOLD : current ? 'rgba(157,126,63,0.08)' : WHITE,
                              border: done
                                ? `1px solid ${GOLD}`
                                : current
                                ? `2px solid ${GOLD}`
                                : `1px solid ${BORDER}`,
                            }}
                          >
                            {done && (
                              <CheckCircle className="w-3 h-3" style={{ color: WHITE }} strokeWidth={2.5} />
                            )}
                            {current && (
                              <div className="w-1.5 h-1.5" style={{ backgroundColor: GOLD }} />
                            )}
                          </div>
                          {/* Right half-connector */}
                          <div
                            className="flex-1 h-px"
                            style={{ backgroundColor: isLast ? 'transparent' : rightGold ? GOLD : BORDER }}
                          />
                        </div>
                        {/* Label */}
                        <div
                          className="text-center leading-tight px-1"
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: done || current ? (current ? GOLD : DARK) : 'rgba(26,20,16,0.3)',
                          }}
                        >
                          {step}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                {[
                  { label: 'Budget Range',    value: brief.budget },
                  { label: 'Square Footage',  value: `${brief.sqft} sq ft` },
                  { label: 'Timeline',        value: brief.timeline },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    className="p-6"
                    style={{ borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5"
                      style={{ color: GOLD }}
                    >
                      {stat.label}
                    </div>
                    <div className="text-[14px] font-bold" style={{ color: DARK }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Quick-action links */}
              <div className="px-7 py-5 flex items-center gap-6 flex-wrap">
                <div className="text-[9px] uppercase tracking-[0.36em] font-bold" style={{ color: MUTED }}>
                  Quick Actions
                </div>
                {[
                  { to: '/portal/project',   label: 'View Full Brief →' },
                  { to: '/portal/messages',  label: 'Messages →' },
                  { to: '/portal/documents', label: 'Documents →' },
                ].map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                    style={{ color: GOLD }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Upcoming Tasks ── */}
            <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
              <div className="px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>
                  Upcoming Tasks
                </div>
              </div>
              {UPCOMING_TASKS.map((task, i) => (
                <div
                  key={task}
                  className="flex items-center gap-4 px-7 py-4"
                  style={{ borderBottom: i < UPCOMING_TASKS.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                >
                  <div className="w-4 h-4 shrink-0" style={{ border: `1.5px solid ${BORDER}` }} />
                  <span className="text-[13px] font-light" style={{ color: DARK }}>{task}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </PortalLayout>
  );
}
