import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Info, Zap, ChevronRight } from 'lucide-react';
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
const SBG    = '#0D0A06';
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

/* ── Animated progress ring ─────────────────────────────────────────── */
function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const sw  = 6;
  const r   = (size - sw * 2) / 2;
  const c   = 2 * Math.PI * r;
  const arc = Math.min(pct, 100) / 100 * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(157,126,63,0.1)" strokeWidth={sw} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={GOLD} strokeWidth={sw} strokeLinecap="butt"
          strokeDasharray={`${arc} ${c - arc}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${arc} ${c - arc}` }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: SERIF, fontSize: size * 0.22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          {pct}%
        </div>
        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.18em', color: MUTED, fontWeight: 700, marginTop: 3 }}>
          done
        </div>
      </div>
    </div>
  );
}

/* ── Motion variants ── */
const fade    = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } };

export default function PortalMilestones() {
  const { client, loaded } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const [rows, setRows]             = useState<MilestoneRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [liveFlash, setLiveFlash]   = useState(false);

  const fetchMilestones = useCallback(async (clientId: string, isRealtime = false) => {
    // 1. Try admin_project_milestones via the portal RPC (preferred)
    const { data: rpcData } = await (supabase as any)
      .rpc('get_portal_project_data', { p_client_id: clientId });

    const rpcRows = Array.isArray(rpcData) ? rpcData : (rpcData ? [rpcData] : []);
    const adminMilestones = rpcRows.flatMap((proj: any) => {
      const ms = typeof proj.milestones === 'string' ? JSON.parse(proj.milestones) : (proj.milestones ?? []);
      return ms.map((m: any) => ({
        id:                m.id,
        sort_order:        m.sort_order ?? 0,
        phase_name:        m.title ?? '',
        phase_description: m.description ?? null,
        target_date:       m.target_date ?? null,
        completed_date:    m.completed_date ?? null,
        is_active:         m.is_active ?? false,
      } as MilestoneRow));
    });

    if (adminMilestones.length > 0) {
      setRows(adminMilestones);
      setDataLoaded(true);
      if (isRealtime) { setLiveFlash(true); setTimeout(() => setLiveFlash(false), 1800); }
      return;
    }

    // 2. Fall back to legacy project_milestones table
    const { data, error } = await (supabase as any)
      .from('project_milestones')
      .select('id, sort_order, phase_name, phase_description, target_date, completed_date, is_active')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setRows(data as MilestoneRow[]);
      setDataLoaded(true);
      if (isRealtime) { setLiveFlash(true); setTimeout(() => setLiveFlash(false), 1800); }
    }
  }, []);

  useEffect(() => {
    if (!client?.id) return;
    fetchMilestones(client.id);

    const channel = supabase
      .channel(`portal-milestones:${client.id}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'admin_project_milestones' },
        () => fetchMilestones(client.id, true),
      )
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
      <motion.div variants={stagger} initial="hidden" animate="show">

        {/* ══════════════════════════════════════
            HERO — dark full bleed
        ══════════════════════════════════════ */}
        <motion.div variants={fade}
          style={{ backgroundColor: SBG, position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(157,126,63,0.1)' }}>
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(157,126,63,0.06) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }} />
          {/* Gold top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD }} />

          <div className="px-5 sm:px-8 md:px-10 pt-8 pb-7">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                {/* Eyebrow + Live badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-[7px] uppercase tracking-[0.48em] font-bold" style={{ color: GOLD }}>
                    Project Schedule
                  </div>
                  <AnimatePresence>
                    {dataLoaded && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 px-2 py-0.5"
                        style={{
                          backgroundColor: liveFlash ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.07)',
                          border: `1px solid ${liveFlash ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.2)'}`,
                          transition: 'all 0.4s ease',
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: GREEN }} />
                        <span className="text-[7px] uppercase tracking-[0.2em] font-bold" style={{ color: GREEN }}>Live</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
                  fontSize: 'clamp(30px, 6vw, 52px)', color: WHITE,
                  lineHeight: 1.03, letterSpacing: '-0.012em',
                }}>
                  Construction<br className="hidden sm:block" /> Timeline.
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-0 mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                  {[
                    { n: completedCount, label: 'Complete',  color: GREEN },
                    { n: activeRow ? 1 : 0, label: 'Active', color: GOLDF },
                    { n: Math.max(0, total - completedCount - (activeRow ? 1 : 0)), label: 'Upcoming', color: 'rgba(255,255,255,0.28)' },
                  ].map(({ n, label, color }, i) => (
                    <div key={label} className="flex items-center">
                      {i > 0 && <div className="w-px h-6 mx-4 sm:mx-5" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />}
                      <div>
                        <div style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
                        <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.26em', color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginTop: 3 }}>
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress ring */}
              {total > 0 && (
                <div className="shrink-0">
                  <ProgressRing pct={pct} size={100} />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 max-w-3xl">

          {/* ── No milestones yet ── */}
          {dataLoaded && total === 0 && (
            <motion.div variants={fade}
              className="mb-6 p-6 flex items-center gap-4"
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(157,126,63,0.07)', border: '1px solid rgba(157,126,63,0.2)' }}>
                <Clock className="w-4 h-4" style={{ color: GOLDF }} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[12px] font-bold mb-0.5" style={{ color: DARK }}>Timeline coming soon</div>
                <p className="text-[11px] font-light" style={{ color: MUTED }}>
                  Your project manager is building your custom milestone plan. Check back after your consultation.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Active phase banner ── */}
          {activeRow && (
            <motion.div variants={fade}
              className="mb-5 p-4 flex items-center gap-4"
              style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.28)` }}>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: GOLD }} />
              <div className="flex-1 min-w-0">
                <div className="text-[7px] uppercase tracking-[0.32em] font-bold mb-0.5" style={{ color: GOLD }}>Currently In Progress</div>
                <div className="text-[13px] font-bold truncate" style={{ color: DARK, fontFamily: SERIF }}>
                  {activeRow.phase_name || 'Current Phase'}
                </div>
                {activeRow.target_date && (
                  <div className="text-[10px] font-light mt-0.5" style={{ color: MUTED }}>
                    Target completion: {fmtDate(activeRow.target_date)}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(157,126,63,0.4)' }} strokeWidth={2} />
            </motion.div>
          )}

          {/* ── Progress summary card ── */}
          {total > 0 && (
            <motion.div variants={fade}
              className="mb-6 p-6"
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(26,20,16,0.04)' }}>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.36em] font-bold mb-1" style={{ color: GOLD }}>Overall Progress</div>
                  <div className="text-[12px] font-light" style={{ color: MUTED }}>
                    {completedCount} of {total} milestone{total !== 1 ? 's' : ''} complete
                    {activeRow && ', 1 in progress'}
                  </div>
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 700, color: DARK, lineHeight: 1 }}>
                  {pct}<span style={{ fontSize: 18, color: MUTED }}>%</span>
                </div>
              </div>

              {/* Segmented bar */}
              <div className="flex gap-0.5 mb-3">
                {rows.map((r, i) => {
                  const s = rowStatus(r);
                  return (
                    <motion.div key={r.id} style={{ flex: 1, height: 5 }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1, backgroundColor: s === 'complete' ? GOLD : s === 'in-progress' ? GOLDF : 'rgba(26,20,16,0.07)' }}
                      transition={{ duration: 0.42, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    />
                  );
                })}
              </div>

              <div className="flex gap-5">
                {[
                  { label: 'Complete',    color: GOLD },
                  { label: 'In Progress', color: GOLDF },
                  { label: 'Pending',     color: 'rgba(26,20,16,0.12)' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] font-light" style={{ color: MUTED }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Milestone timeline ── */}
          {total > 0 && (
            <motion.div variants={fade}
              style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(26,20,16,0.04)' }}>
              <div className="px-6 sm:px-7 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>Milestones</div>
                <AnimatePresence>
                  {liveFlash && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3" style={{ color: GREEN }} strokeWidth={2} />
                      <span className="text-[8px] font-semibold" style={{ color: GREEN }}>Updated just now</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-6 sm:px-7 py-7">
                {rows.map((row, i) => {
                  const isLast = i === rows.length - 1;
                  const status = rowStatus(row);
                  const isGold = status === 'complete' || status === 'in-progress';
                  const dimmed = status === 'pending';
                  const label  = row.phase_name || `Milestone ${i + 1}`;
                  const desc   = row.phase_description;
                  const num    = String(i + 1).padStart(2, '0');

                  return (
                    <motion.div key={row.id} className="flex gap-5 sm:gap-6"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}>

                      {/* Node column */}
                      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                        {/* Number/node */}
                        <div style={{ width: 28, height: 28, flexShrink: 0, marginTop: 2 }}>
                          {status === 'complete' ? (
                            <motion.div
                              className="w-7 h-7 flex items-center justify-center"
                              style={{ backgroundColor: GOLD }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}>
                              <CheckCircle className="w-3.5 h-3.5" style={{ color: WHITE }} strokeWidth={2.5} />
                            </motion.div>
                          ) : status === 'in-progress' ? (
                            <motion.div
                              className="w-7 h-7 flex items-center justify-center text-[10px] font-black"
                              style={{ backgroundColor: WHITE, border: `2.5px solid ${GOLD}`, outline: `3px solid rgba(157,126,63,0.12)`, color: GOLD, fontFamily: SERIF }}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 18, delay: i * 0.04 }}>
                              {num}
                            </motion.div>
                          ) : (
                            <div className="w-7 h-7 flex items-center justify-center text-[10px] font-semibold"
                              style={{ backgroundColor: WHITE, border: `1.5px solid ${BORDER}`, color: 'rgba(26,20,16,0.2)', fontFamily: SERIF }}>
                              {num}
                            </div>
                          )}
                        </div>
                        {/* Connector */}
                        {!isLast && (
                          <div style={{ width: 2, flex: 1, minHeight: 24, marginTop: 3, backgroundColor: isGold ? GOLD : BORDER }} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 28 }}>
                        {/* Row header */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold" style={{
                            color: dimmed ? 'rgba(26,20,16,0.25)' : DARK,
                            fontFamily: SERIF,
                          }}>
                            {label}
                          </span>
                          {status === 'complete' && (
                            <span className="text-[7px] uppercase tracking-[0.22em] font-bold px-2 py-0.5"
                              style={{ backgroundColor: 'rgba(16,185,129,0.09)', color: GREEN }}>
                              Complete
                            </span>
                          )}
                          {status === 'in-progress' && (
                            <motion.span
                              className="text-[7px] uppercase tracking-[0.22em] font-bold px-2 py-0.5"
                              style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: GOLD }}
                              animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
                              In Progress
                            </motion.span>
                          )}
                        </div>

                        {/* Description */}
                        {desc && (
                          <div className="text-[11px] font-light leading-relaxed mb-2"
                            style={{ color: dimmed ? 'rgba(26,20,16,0.2)' : MUTED }}>
                            {desc}
                          </div>
                        )}

                        {/* Date line */}
                        <div className="text-[9px] uppercase tracking-[0.16em] font-semibold"
                          style={{ color: dimmed ? 'rgba(26,20,16,0.15)' : status === 'in-progress' ? GOLD : status === 'complete' ? GREEN : MUTED }}>
                          {status === 'pending'
                            ? (row.target_date ? `Target: ${fmtDate(row.target_date)}` : 'Scheduled')
                            : status === 'in-progress'
                            ? (row.target_date ? `In progress · Target ${fmtDate(row.target_date)}` : 'Currently in progress')
                            : (row.completed_date ? `Completed ${fmtDate(row.completed_date)}` : 'Completed')}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Footer note ── */}
          <motion.div variants={fade} className="mt-5 flex items-start gap-3 px-4 py-3.5"
            style={{ backgroundColor: SOFT, border: `1px solid ${BORDER}` }}>
            <Info className="w-3 h-3 shrink-0 mt-0.5" style={{ color: MUTED }} strokeWidth={1.5} />
            <p className="text-[10px] font-light leading-relaxed" style={{ color: MUTED }}>
              Your project manager updates this timeline in real time. Status changes, date confirmations, and milestone completions appear here instantly.
            </p>
          </motion.div>

        </div>
      </motion.div>
    </PortalLayout>
  );
}
