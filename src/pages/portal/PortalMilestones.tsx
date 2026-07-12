import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

/* ── Phase definitions ───────────────────────────────────────────────── */
type PhaseStatus = 'complete' | 'in-progress' | 'pending';

interface Phase {
  id: number;
  name: string;
  description: string;
}

const PHASE_DEFS: Phase[] = [
  { id: 1,  name: 'Pre-Construction Planning',             description: 'Site analysis, design finalization, and project schedule build-out.' },
  { id: 2,  name: 'Permits & Approvals',                   description: 'City permit submission and formal approval from HSPD.' },
  { id: 3,  name: 'Site Preparation',                      description: 'Land clearing, grading, and utility rough-in preparation.' },
  { id: 4,  name: 'Foundation Work',                       description: 'Excavation, formwork, reinforcement, and concrete slab pour.' },
  { id: 5,  name: 'Framing & Structure',                   description: 'Structural framing, roof trusses, and exterior sheathing.' },
  { id: 6,  name: 'MEP Rough-In',                          description: 'All mechanical, electrical, and plumbing rough-in installations.' },
  { id: 7,  name: 'Insulation & Drywall',                  description: 'Insulation installation followed by drywall hanging and taping.' },
  { id: 8,  name: 'Interior Finishes',                     description: 'Flooring, cabinetry, millwork, tile, and paint throughout.' },
  { id: 9,  name: 'Fixtures & Final Details',              description: 'Fixture installations, hardware, and cosmetic touch-ups.' },
  { id: 10, name: 'Final Inspection & Handover',           description: 'City final inspection, punch list completion, and key handover.' },
];

// How many phases are complete/in-progress per brief status
const STATUS_PHASE_IDX: Record<string, number> = {
  draft:                   -1,  // nothing started
  submitted:                0,  // pre-construction planning begins
  reviewing:                0,  // still in planning
  consultation_scheduled:   1,  // permits underway
  in_progress:              3,  // through permits + site prep, foundation next
};

function buildPhases(briefStatus: string | undefined): Array<Phase & { status: PhaseStatus }> {
  const activeIdx = briefStatus ? (STATUS_PHASE_IDX[briefStatus] ?? -1) : -1;
  return PHASE_DEFS.map((p, i) => {
    let status: PhaseStatus = 'pending';
    if (i < activeIdx) status = 'complete';
    else if (i === activeIdx) status = 'in-progress';
    return { ...p, status };
  });
}

interface MilestoneDate {
  phase_index: number;
  target_date?: string;
  completed_date?: string;
}

function fmtDate(d: string) {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

export default function PortalMilestones() {
  const { client, loaded, getBrief } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!loaded) return; if (!client) navigate("/portal", { replace: true }); }, [client, loaded, navigate]);

  const [milestoneDates, setMilestoneDates] = useState<Record<number, MilestoneDate>>({});

  useEffect(() => {
    if (!client) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('project_milestones')
          .select('phase_index, target_date, completed_date')
          .eq('client_id', client.id);
        if (data && data.length > 0) {
          const map: Record<number, MilestoneDate> = {};
          (data as MilestoneDate[]).forEach(row => { map[row.phase_index] = row; });
          setMilestoneDates(map);
        }
      } catch { /* table not yet created — fallback to indicative text */ }
    })();
  }, [client?.id]);

  if (!client) return null;

  const brief  = getBrief();
  const phases = buildPhases(brief?.status);
  const engaged = phases.filter(p => p.status !== 'pending').length;
  const total   = phases.length;
  const pct     = Math.round((engaged / total) * 100);

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

        {/* ── Indicative notice ── */}
        <div
          className="mb-8 p-4 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(26,20,16,0.025)', border: `1px solid ${BORDER}` }}
        >
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: MUTED }} strokeWidth={1.5} />
          <p className="text-[11px] font-light leading-relaxed" style={{ color: MUTED }}>
            <span style={{ color: DARK, fontWeight: 600 }}>Indicative timeline.</span>{' '}
            This schedule reflects the standard HOU INC build sequence. Your confirmed project dates will be set after the consultation and contract signing.
          </p>
        </div>

        {/* ── Progress summary card ── */}
        <div className="mb-8 p-7" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-1" style={{ color: GOLD }}>
                Overall Progress
              </div>
              <div className="text-[13px] font-light" style={{ color: MUTED }}>
                {engaged} of {total} phases {engaged === 0 ? 'started' : 'underway'}
              </div>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: DARK }}>
              {pct}%
            </div>
          </div>
          <div className="h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
            <motion.div
              className="h-full"
              style={{ backgroundColor: GOLD }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
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
              {phases.map((phase, i) => {
                const { id, name, status, description } = phase;
                const isLast   = i === phases.length - 1;
                const lineGold = status === 'complete' || status === 'in-progress';
                const dimmed   = status === 'pending';

                return (
                  <div key={id} className="flex gap-5">
                    {/* Left: node + connecting line */}
                    <div className="flex flex-col items-center" style={{ width: 12 }}>
                      <div className="shrink-0 z-10 flex items-center justify-center" style={{ width: 12, height: 12, marginTop: 2 }}>
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
                            style={{ backgroundColor: WHITE, border: `2px solid ${GOLD}`, outline: `3px solid rgba(157,126,63,0.14)` }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}
                          />
                        ) : (
                          <div className="w-3 h-3" style={{ backgroundColor: WHITE, border: `1.5px solid ${BORDER}` }} />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className="flex-1 mt-1"
                          style={{ width: 2, minHeight: 32, backgroundColor: lineGold ? GOLD : BORDER }}
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
                        style={{ color: dimmed ? 'rgba(26,20,16,0.18)' : status === 'in-progress' ? GOLD : 'rgba(16,185,129,0.75)' }}
                      >
                        {status === 'pending'
                          ? (milestoneDates[i]?.target_date
                              ? `Target: ${fmtDate(milestoneDates[i].target_date!)}`
                              : 'Scheduled after consultation')
                          : status === 'in-progress'
                          ? (milestoneDates[i]?.target_date
                              ? `Currently Active — Target: ${fmtDate(milestoneDates[i].target_date!)}`
                              : 'Currently Active')
                          : (milestoneDates[i]?.completed_date
                              ? `Completed ${fmtDate(milestoneDates[i].completed_date!)}`
                              : 'Completed')}
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
