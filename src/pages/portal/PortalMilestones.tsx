import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
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

/* ── Phase data ──────────────────────────────────────────────────────── */
type PhaseStatus = 'complete' | 'in-progress' | 'pending';

interface Phase {
  id: number;
  name: string;
  status: PhaseStatus;
  date: string;
  description: string;
}

const PHASES: Phase[] = [
  {
    id: 1, name: 'Pre-Construction Planning',
    status: 'complete', date: 'Oct 2024',
    description: 'Site analysis, design finalization, and project schedule build-out.',
  },
  {
    id: 2, name: 'Permits & Approvals',
    status: 'complete', date: 'Dec 2024',
    description: 'City permit submission and formal approval from HSPD.',
  },
  {
    id: 3, name: 'Site Preparation',
    status: 'in-progress', date: 'Jan 2025',
    description: 'Land clearing, grading, and utility rough-in preparation.',
  },
  {
    id: 4, name: 'Foundation Work',
    status: 'pending', date: 'Mar 2025',
    description: 'Excavation, formwork, reinforcement, and concrete slab pour.',
  },
  {
    id: 5, name: 'Framing & Structure',
    status: 'pending', date: 'May 2025',
    description: 'Structural framing, roof trusses, and exterior sheathing.',
  },
  {
    id: 6, name: 'MEP Rough-In (Mechanical, Electrical, Plumbing)',
    status: 'pending', date: 'Jul 2025',
    description: 'All mechanical, electrical, and plumbing rough-in installations.',
  },
  {
    id: 7, name: 'Insulation & Drywall',
    status: 'pending', date: 'Sep 2025',
    description: 'Insulation installation followed by drywall hanging and taping.',
  },
  {
    id: 8, name: 'Interior Finishes',
    status: 'pending', date: 'Nov 2025',
    description: 'Flooring, cabinetry, millwork, tile, and paint throughout.',
  },
  {
    id: 9, name: 'Fixtures & Final Details',
    status: 'pending', date: 'Jan 2026',
    description: 'Fixture installations, hardware, and cosmetic touch-ups.',
  },
  {
    id: 10, name: 'Final Inspection & Handover',
    status: 'pending', date: 'Mar 2026',
    description: 'City final inspection, punch list completion, and key handover.',
  },
];

// Phases that are complete OR in-progress count toward "engaged" total shown in UI
const ENGAGED = PHASES.filter(p => p.status !== 'pending').length;
const TOTAL   = PHASES.length;

export default function PortalMilestones() {
  const { client, getBrief } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);
  if (!client) return null;

  const brief = getBrief();

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
            Project Schedule
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Construction Timeline
          </div>
        </div>

        {/* ── No brief notice ── */}
        {!brief && (
          <div
            className="mb-8 p-5 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(157,126,63,0.05)', border: `1px solid rgba(157,126,63,0.2)` }}
          >
            <Clock className="w-4 h-4 shrink-0" style={{ color: GOLDF }} strokeWidth={1.5} />
            <p className="text-[12px] font-light" style={{ color: MUTED }}>
              Submit your project brief to unlock your personalized construction timeline.
            </p>
          </div>
        )}

        {/* ── Progress summary card ── */}
        <div className="mb-8 p-7" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-1" style={{ color: GOLD }}>
                Overall Progress
              </div>
              <div className="text-[13px] font-light" style={{ color: MUTED }}>
                {ENGAGED} of {TOTAL} phases complete
              </div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: DARK }}>
              {Math.round((ENGAGED / TOTAL) * 100)}%
            </div>
          </div>
          <div className="h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
            <motion.div
              className="h-full"
              style={{ backgroundColor: GOLD }}
              initial={{ width: 0 }}
              animate={{ width: `${(ENGAGED / TOTAL) * 100}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
        </div>

        {/* ── Phase timeline ── */}
        <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>
              Build Phases
            </div>
          </div>

          <div className="px-7 py-8">
            <div className="space-y-0">
              {PHASES.map((phase, i) => {
                const { id, name, status, date, description } = phase;
                const isLast   = i === PHASES.length - 1;
                const lineGold = status === 'complete' || status === 'in-progress';
                const dimmed   = status === 'pending';

                return (
                  <div key={id} className="flex gap-5">
                    {/* Left: node + connecting line */}
                    <div className="flex flex-col items-center" style={{ width: 12 }}>
                      {/* Square node */}
                      <div
                        className="shrink-0 z-10 flex items-center justify-center"
                        style={{ width: 12, height: 12, marginTop: 2 }}
                      >
                        {status === 'complete' ? (
                          <motion.div
                            className="w-3 h-3 flex items-center justify-center"
                            style={{ backgroundColor: GOLD }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}
                          >
                            <CheckCircle className="w-2.5 h-2.5" style={{ color: WHITE }} strokeWidth={3} />
                          </motion.div>
                        ) : status === 'in-progress' ? (
                          <motion.div
                            className="w-3 h-3"
                            style={{
                              backgroundColor: WHITE,
                              border: `2px solid ${GOLD}`,
                              outline: `3px solid rgba(157,126,63,0.14)`,
                            }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}
                          />
                        ) : (
                          <div
                            className="w-3 h-3"
                            style={{ backgroundColor: WHITE, border: `1.5px solid ${BORDER}` }}
                          />
                        )}
                      </div>
                      {/* Connecting line */}
                      {!isLast && (
                        <div
                          className="flex-1 mt-1"
                          style={{
                            width: 2,
                            minHeight: 32,
                            backgroundColor: lineGold ? GOLD : BORDER,
                          }}
                        />
                      )}
                    </div>

                    {/* Right: content */}
                    <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 24 }}>
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="text-[12px] font-bold"
                          style={{ color: dimmed ? 'rgba(26,20,16,0.28)' : DARK }}
                        >
                          {String(id).padStart(2, '0')}. {name}
                        </span>
                        {status === 'complete' && (
                          <span
                            className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                          >
                            Complete
                          </span>
                        )}
                        {status === 'in-progress' && (
                          <span
                            className="text-[7px] uppercase tracking-[0.24em] font-bold px-2 py-0.5"
                            style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD }}
                          >
                            In Progress
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[11px] font-light mb-1 leading-relaxed"
                        style={{ color: dimmed ? 'rgba(26,20,16,0.22)' : MUTED }}
                      >
                        {description}
                      </div>
                      <div
                        className="text-[9px] uppercase tracking-[0.18em] font-semibold"
                        style={{
                          color: dimmed
                            ? 'rgba(26,20,16,0.18)'
                            : status === 'in-progress'
                            ? GOLD
                            : 'rgba(16,185,129,0.75)',
                        }}
                      >
                        Est. {date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </PortalLayout>
  );
}
