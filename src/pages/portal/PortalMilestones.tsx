import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SOFT   = '#F7F5F2';
const GREEN  = '#10b981';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

type PhaseStatus = 'complete' | 'in-progress' | 'pending';

interface MilestoneRow {
  id:                string;
  sort_order:        number;
  phase_name:        string | null;
  phase_description: string | null;
  target_date:       string | null;
  completed_date:    string | null;
  is_active:         boolean;
}

function fmtDate(d: string): string {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function rowStatus(r: MilestoneRow): PhaseStatus {
  if (r.completed_date) return 'complete';
  if (r.is_active)      return 'in-progress';
  return 'pending';
}

export default function PortalMilestones() {
  const { client, loaded } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const [rows, setRows]           = useState<MilestoneRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);

  const fetchMilestones = useCallback(async (clientId: string, isRealtime = false) => {
    const { data, error } = await (supabase as any)
      .from('project_milestones')
      .select('id, sort_order, phase_name, phase_description, target_date, completed_date, is_active')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setRows(data as MilestoneRow[]);
      setDataLoaded(true);
      if (isRealtime) {
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 1800);
      }
    }
  }, []);

  useEffect(() => {
    if (!client?.id) return;
    fetchMilestones(client.id);

    const channel = supabase
      .channel(`portal-milestones:${client.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'project_milestones', filter: `client_id=eq.${client.id}` },
        () => fetchMilestones(client.id, true),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [client?.id, fetchMilestones]);

  if (!client) return null;

  const total          = rows.length;
  const completedCount = rows.filter(r => r.completed_date).length;
  const activeRow      = rows.find(r => r.is_active);
  const pct            = total > 0
    ? Math.round(((completedCount + (activeRow ? 0.5 : 0)) / total) * 100)
    : 0;

  return (
    <PortalLayout>
      <motion.div
        className="px-6 md:px-10 py-8 md:py-12 max-w-3xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-[8px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>
              Project Schedule
            </div>
            <AnimatePresence>
              {dataLoaded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-2 py-0.5"
                  style={{
                    backgroundColor: liveFlash ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${liveFlash ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`,
                    transition: 'all 0.4s ease',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: GREEN }} />
                  <span className="text-[7px] uppercase tracking-[0.2em] font-bold" style={{ color: GREEN }}>Live</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Construction Timeline
          </div>
        </div>

        {/* ── No milestones yet notice ── */}
        {dataLoaded && total === 0 && (
          <div className="mb-6 p-5 flex items-center gap-3" style={{ backgroundColor: 'rgba(157,126,63,0.05)', border: `1px solid rgba(157,126,63,0.2)` }}>
            <Clock className="w-4 h-4 shrink-0" style={{ color: GOLDF }} strokeWidth={1.5} />
            <p className="text-[12px] font-light" style={{ color: MUTED }}>
              Your project manager is building your custom timeline. Check back soon.
            </p>
          </div>
        )}

        {/* ── Active phase banner ── */}
        {activeRow && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 p-4 flex items-center gap-4"
            style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.25)` }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: GOLD }} />
            <div>
              <div className="text-[7px] uppercase tracking-[0.32em] font-bold mb-0.5" style={{ color: GOLD }}>Currently In Progress</div>
              <div className="text-[12px] font-semibold" style={{ color: DARK }}>
                {activeRow.phase_name || 'Current Phase'}
              </div>
              {activeRow.target_date && (
                <div className="text-[10px] font-light mt-0.5" style={{ color: MUTED }}>
                  Target completion: {fmtDate(activeRow.target_date)}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Progress summary ── */}
        {total > 0 && (
          <div className="mb-6 p-6" style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-1" style={{ color: GOLD }}>Overall Progress</div>
                <div className="text-[12px] font-light" style={{ color: MUTED }}>
                  {completedCount} of {total} milestones complete
                  {activeRow && ', 1 in progress'}
                </div>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: DARK, lineHeight: 1 }}>
                {pct}%
              </div>
            </div>

            {/* Segmented progress bar */}
            <div className="flex gap-0.5">
              {rows.map((r, i) => {
                const s = rowStatus(r);
                return (
                  <motion.div
                    key={r.id}
                    style={{
                      flex: 1, height: 4,
                      backgroundColor: s === 'complete' ? GOLD : s === 'in-progress' ? GOLDF : 'rgba(26,20,16,0.07)',
                    }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3">
              {[
                { label: 'Complete',    color: GOLD },
                { label: 'In Progress', color: GOLDF },
                { label: 'Pending',     color: 'rgba(26,20,16,0.12)' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[9px] font-light" style={{ color: MUTED }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Milestone timeline ── */}
        {total > 0 && (
          <div style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
            <div className="px-7 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>Milestones</div>
              {liveFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3" style={{ color: GREEN }} strokeWidth={2} />
                  <span className="text-[8px] font-semibold" style={{ color: GREEN }}>Updated just now</span>
                </motion.div>
              )}
            </div>

            <div className="px-7 py-8">
              {rows.map((row, i) => {
                const isLast   = i === rows.length - 1;
                const status   = rowStatus(row);
                const isGold   = status === 'complete' || status === 'in-progress';
                const dimmed   = status === 'pending';
                const label    = row.phase_name || `Milestone ${i + 1}`;
                const desc     = row.phase_description;

                return (
                  <motion.div
                    key={row.id}
                    className="flex gap-5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                  >
                    {/* Node + connecting line */}
                    <div className="flex flex-col items-center shrink-0" style={{ width: 14 }}>
                      <div style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }}>
                        {status === 'complete' ? (
                          <motion.div
                            className="w-3.5 h-3.5 flex items-center justify-center"
                            style={{ backgroundColor: GOLD }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}
                          >
                            <CheckCircle className="w-2.5 h-2.5" style={{ color: WHITE }} strokeWidth={3} />
                          </motion.div>
                        ) : status === 'in-progress' ? (
                          <motion.div
                            className="w-3.5 h-3.5"
                            style={{ backgroundColor: WHITE, border: `2.5px solid ${GOLD}`, outline: `3px solid rgba(157,126,63,0.14)` }}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}
                          />
                        ) : (
                          <div className="w-3.5 h-3.5" style={{ backgroundColor: WHITE, border: `1.5px solid ${BORDER}` }} />
                        )}
                      </div>
                      {!isLast && (
                        <div style={{ width: 2, flex: 1, minHeight: 28, marginTop: 3, backgroundColor: isGold ? GOLD : BORDER }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 24 }}>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold" style={{ color: dimmed ? 'rgba(26,20,16,0.28)' : DARK }}>
                          {String(i + 1).padStart(2, '0')}. {label}
                        </span>
                        {status === 'complete' && (
                          <span className="text-[7px] uppercase tracking-[0.22em] font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(16,185,129,0.09)', color: GREEN }}>
                            Complete
                          </span>
                        )}
                        {status === 'in-progress' && (
                          <span className="text-[7px] uppercase tracking-[0.22em] font-bold px-2 py-0.5 animate-pulse" style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}>
                            In Progress
                          </span>
                        )}
                      </div>

                      {desc && (
                        <div className="text-[11px] font-light leading-relaxed mb-1.5" style={{ color: dimmed ? 'rgba(26,20,16,0.22)' : MUTED }}>
                          {desc}
                        </div>
                      )}

                      <div className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: dimmed ? 'rgba(26,20,16,0.18)' : status === 'in-progress' ? GOLD : GREEN }}>
                        {status === 'pending'
                          ? (row.target_date ? `Target: ${fmtDate(row.target_date)}` : 'Scheduled')
                          : status === 'in-progress'
                          ? (row.target_date ? `In progress — Target: ${fmtDate(row.target_date)}` : 'Currently in progress')
                          : (row.completed_date ? `Completed ${fmtDate(row.completed_date)}` : 'Completed')}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer note ── */}
        <div className="mt-6 flex items-start gap-2.5 p-4" style={{ backgroundColor: SOFT, border: `1px solid ${BORDER}` }}>
          <Info className="w-3 h-3 shrink-0 mt-0.5" style={{ color: MUTED }} strokeWidth={1.5} />
          <p className="text-[10px] font-light leading-relaxed" style={{ color: MUTED }}>
            Your project manager updates this timeline in real time. Any status changes, date confirmations, or milestone completions will appear here instantly — no page refresh needed.
          </p>
        </div>

      </motion.div>
    </PortalLayout>
  );
}
