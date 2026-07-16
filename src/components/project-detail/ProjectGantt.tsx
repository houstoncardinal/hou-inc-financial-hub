import { useMemo } from 'react';
import { Diamond, CircleDollarSign, CalendarRange } from 'lucide-react';
import { fmtUSD, fmtDate } from '@/lib/format';

/* ────────────────────────────────────────────────────────────────────
   ProjectGantt — reconciliation schedule visualized as a Gantt.
   Inspired by the 21st.dev / Kibo UI Gantt (sticky sidebar, month grid,
   today marker) but implemented dependency-free and tailored to the
   HOU reconciliation model:
     · Milestones  → time bars (planned start → completion, % fill)
     · SOV entries → completion lanes across the project window
     · Change orders / draws → date markers on their own lanes
   Scrolls horizontally on small screens with a pinned label column.
──────────────────────────────────────────────────────────────────── */

const GOLD  = '#9D7E3F';
const GREEN = '#10b981';
const STEEL = '#4C7FA3';
const COPPER = '#C4795A';
const VIRIDIAN = '#4E8A74';

const SIDEBAR = 132;           // px — pinned label column
const DAY = 86400000;

interface Props {
  milestones: any[];
  scopeItems: any[];
  changeOrders: any[];
  draws: any[];
  projectStart?: string | null;
  projectEnd?: string | null;
  onOpenReconciliation?: () => void;
}

const parse = (d: string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(String(d).length <= 10 ? `${d}T12:00:00` : d).getTime();
  return isNaN(t) ? null : t;
};

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex border-b border-border/60 bg-secondary/35">
      <div className="sticky left-0 z-10 shrink-0 px-3 py-1 bg-secondary/90 backdrop-blur-sm border-r border-border/60" style={{ width: SIDEBAR }}>
        <span className="text-[8px] uppercase tracking-[0.2em] font-black text-muted-foreground">{label}</span>
        <span className="ml-1.5 text-[8px] font-bold text-muted-foreground/60">{count}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

export function ProjectGantt({ milestones, scopeItems, changeOrders, draws, projectStart, projectEnd, onOpenReconciliation }: Props) {

  const model = useMemo(() => {
    const pStart = parse(projectStart);
    const pEnd   = parse(projectEnd);

    /* Milestone bars — need at least one date */
    const msRows = milestones.map((m: any) => {
      const start = parse(m.planned_start_date) ?? parse(m.actual_start_date);
      const end   = parse(m.actual_completion_date) ?? parse(m.planned_completion_date);
      return {
        id: m.id, title: m.title ?? m.phase_name ?? 'Milestone',
        start: start ?? end, end: end ?? start,
        pct: m.status === 'completed' ? 100 : Math.min(100, Math.max(0, Number(m.percent_complete) || 0)),
        status: (m.status === 'completed' ? 'completed' : m.status === 'in_progress' ? 'active' : 'pending') as 'completed' | 'active' | 'pending',
      };
    }).filter(r => r.start !== null);

    const coRows = changeOrders.map((c: any) => ({
      id: c.id, title: c.co_number ? `${c.co_number} — ${c.title}` : c.title,
      at: parse(c.approved_date) ?? parse(c.requested_date) ?? parse(c.created_at),
      amount: Number(c.amount) || 0,
      done: c.status === 'approved',
      statusLabel: c.status,
    })).filter(r => r.at !== null);

    const drawRows = draws.map((d: any) => ({
      id: d.id, title: d.milestone_name || 'Draw',
      at: parse(d.scheduled_date),
      amount: Number(d.draw_amount) || 0,
      done: ['funded', 'paid', 'released'].includes(String(d.status)),
      statusLabel: d.status,
    })).filter(r => r.at !== null);

    /* Time domain */
    const points: number[] = [];
    if (pStart) points.push(pStart);
    if (pEnd) points.push(pEnd);
    msRows.forEach(r => { if (r.start) points.push(r.start); if (r.end) points.push(r.end); });
    coRows.forEach(r => points.push(r.at!));
    drawRows.forEach(r => points.push(r.at!));
    if (points.length === 0) return null;

    let t0 = Math.min(...points);
    let t1 = Math.max(...points);
    if (t1 - t0 < 30 * DAY) t1 = t0 + 30 * DAY;      // never tighter than a month
    t0 -= 12 * DAY; t1 += 12 * DAY;                   // breathing room

    /* Month ticks */
    const months: { t: number; label: string }[] = [];
    const cursor = new Date(t0); cursor.setDate(1); cursor.setHours(0, 0, 0, 0);
    if (cursor.getTime() < t0) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor.getTime() < t1) {
      months.push({
        t: cursor.getTime(),
        label: cursor.toLocaleDateString('en-US', months.length === 0 || cursor.getMonth() === 0 ? { month: 'short', year: '2-digit' } : { month: 'short' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const pct = (t: number) => ((t - t0) / (t1 - t0)) * 100;
    const monthCount = Math.max(1, Math.round((t1 - t0) / (30.4 * DAY)));
    const monthWidth = monthCount > 18 ? 58 : monthCount > 10 ? 72 : 92;

    /* SOV lanes span the project window (or full domain fallback) */
    const sovStart = pStart ?? t0 + 12 * DAY;
    const sovEnd   = pEnd ?? t1 - 12 * DAY;
    const sovRows = scopeItems.map((s: any) => ({
      id: s.id, title: s.name,
      pct: Math.min(100, Math.max(0, Number(s.percent_complete) || 0)),
      amount: (Number(s.contract_amount) || 0) + (Number(s.change_order_amount) || 0),
    }));

    const now = Date.now();
    return {
      t0, t1, pct, months,
      minWidth: SIDEBAR + monthCount * monthWidth,
      todayPct: now >= t0 && now <= t1 ? pct(now) : null,
      msRows, sovRows, coRows, drawRows,
      sovLeft: pct(sovStart), sovWidth: Math.max(pct(sovEnd) - pct(sovStart), 4),
    };
  }, [milestones, scopeItems, changeOrders, draws, projectStart, projectEnd]);

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <CalendarRange className="w-8 h-8 text-muted-foreground/35 mb-3" strokeWidth={1.2} />
        <div className="text-[13px] font-semibold">No schedule data yet</div>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[300px]">
          Add planned dates to milestones, draws, or change orders in Reconciliation and the Gantt builds itself.
        </p>
        {onOpenReconciliation && (
          <button onClick={onOpenReconciliation} className="pdv2-link mt-4">Open reconciliation →</button>
        )}
      </div>
    );
  }

  const { pct, months, minWidth, todayPct, msRows, sovRows, coRows, drawRows, sovLeft, sovWidth } = model;

  const msColor = (s: 'completed' | 'active' | 'pending') =>
    s === 'completed' ? GREEN : s === 'active' ? GOLD : 'hsl(var(--muted-foreground))';

  /* One marker lane (change orders / draws) */
  const MarkerRow = ({ title, at, amount, done, statusLabel, color }: any) => (
    <div className="flex border-b border-border/40 last:border-b-0 group" style={{ height: 34 }}>
      <div className="sticky left-0 z-10 shrink-0 flex items-center px-3 bg-background group-hover:bg-secondary/60 transition-colors border-r border-border/60" style={{ width: SIDEBAR }}>
        <span className="text-[10px] font-medium text-foreground truncate">{title}</span>
      </div>
      <div className="relative flex-1">
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${pct(at)}%` }}
          title={`${title} · ${fmtUSD(amount)} · ${statusLabel} · ${fmtDate(new Date(at).toISOString().slice(0, 10))}`}>
          <Diamond className="w-3 h-3 transition-transform group-hover:scale-125"
            style={{ color, fill: done ? color : 'hsl(var(--background))' }} strokeWidth={2} />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 z-10 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${pct(at)}% + 10px)` }}>
          <span className="text-[8.5px] font-mono-tab font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-background border border-border shadow-sm" style={{ color }}>
            {fmtUSD(amount)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="overflow-auto overscroll-x-contain" style={{ maxHeight: 430, WebkitOverflowScrolling: 'touch' }}>
        <div className="relative" style={{ minWidth }}>

          {/* ── Month header ── */}
          <div className="sticky top-0 z-20 flex bg-background border-b border-border">
            <div className="sticky left-0 z-30 shrink-0 flex items-center px-3 py-2 bg-background border-r border-border" style={{ width: SIDEBAR }}>
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-muted-foreground">Schedule</span>
            </div>
            <div className="relative flex-1 h-8">
              {months.map(m => (
                <span key={m.t} className="absolute top-1/2 -translate-y-1/2 pl-1.5 text-[8.5px] font-bold text-muted-foreground border-l border-border/60 h-full flex items-center"
                  style={{ left: `${pct(m.t)}%` }}>
                  {m.label}
                </span>
              ))}
              {todayPct !== null && (
                <span className="absolute top-0 -translate-x-1/2 z-10 rounded-b px-1 py-px text-[7px] font-black uppercase tracking-wide text-white" style={{ left: `${todayPct}%`, backgroundColor: GOLD }}>
                  Today
                </span>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="relative">
            {/* Grid + today line spanning all rows */}
            <div className="absolute inset-y-0 z-0 pointer-events-none" style={{ left: SIDEBAR, right: 0 }}>
              {months.map(m => (
                <span key={m.t} className="absolute inset-y-0 border-l border-border/40" style={{ left: `${pct(m.t)}%` }} />
              ))}
              {todayPct !== null && (
                <span className="absolute inset-y-0 w-px z-10" style={{ left: `${todayPct}%`, background: `linear-gradient(180deg, ${GOLD}, ${GOLD}55)` }} />
              )}
            </div>

            {/* Milestones */}
            {msRows.length > 0 && <GroupHeader label="Milestones" count={msRows.length} />}
            {msRows.map(r => {
              const left = pct(r.start!);
              const width = Math.max(pct(r.end!) - left, 1.25);
              const color = msColor(r.status);
              return (
                <div key={r.id} className="flex border-b border-border/40 group" style={{ height: 38 }}>
                  <div className="sticky left-0 z-10 shrink-0 flex flex-col justify-center px-3 bg-background group-hover:bg-secondary/60 transition-colors border-r border-border/60" style={{ width: SIDEBAR }}>
                    <span className="text-[10px] font-semibold text-foreground truncate leading-tight">{r.title}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wide leading-tight" style={{ color }}>
                      {r.status === 'completed' ? 'Complete' : r.status === 'active' ? `${r.pct.toFixed(0)}% done` : 'Planned'}
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute top-1/2 -translate-y-1/2 h-[16px] rounded-full overflow-hidden transition-all group-hover:h-[20px]"
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: `${color === 'hsl(var(--muted-foreground))' ? 'hsl(var(--muted-foreground) / 0.18)' : color + '26'}`, boxShadow: `inset 0 0 0 1px ${color === 'hsl(var(--muted-foreground))' ? 'hsl(var(--border))' : color + '55'}` }}
                      title={`${r.title} · ${fmtDate(new Date(r.start!).toISOString().slice(0, 10))} → ${fmtDate(new Date(r.end!).toISOString().slice(0, 10))} · ${r.pct.toFixed(0)}%`}>
                      <span className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${r.pct}%`, background: r.status === 'pending' ? 'transparent' : `linear-gradient(90deg, ${color}, ${color}CC)` }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Schedule of Values — completion lanes */}
            {sovRows.length > 0 && <GroupHeader label="Schedule of Values · % complete" count={sovRows.length} />}
            {sovRows.map(r => (
              <div key={r.id} className="flex border-b border-border/40 group" style={{ height: 34 }}>
                <div className="sticky left-0 z-10 shrink-0 flex items-center px-3 bg-background group-hover:bg-secondary/60 transition-colors border-r border-border/60" style={{ width: SIDEBAR }}>
                  <span className="text-[10px] font-medium text-foreground truncate">{r.title}</span>
                </div>
                <div className="relative flex-1">
                  <div className="absolute top-1/2 -translate-y-1/2 h-[12px] rounded-full overflow-hidden"
                    style={{ left: `${sovLeft}%`, width: `${sovWidth}%`, backgroundColor: `${STEEL}1e`, boxShadow: `inset 0 0 0 1px ${STEEL}40` }}
                    title={`${r.title} · ${r.pct.toFixed(0)}% complete · ${fmtUSD(r.amount)}`}>
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.pct}%`, background: `linear-gradient(90deg, ${STEEL}, ${STEEL}B8)` }} />
                  </div>
                  <span className="absolute top-1/2 -translate-y-1/2 text-[8.5px] font-mono-tab font-bold hidden sm:inline"
                    style={{ left: `calc(${sovLeft + sovWidth}% + 8px)`, color: STEEL }}>
                    {r.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}

            {/* Change orders */}
            {coRows.length > 0 && <GroupHeader label="Change Orders" count={coRows.length} />}
            {coRows.map(r => <MarkerRow key={r.id} {...r} color={COPPER} />)}

            {/* Draws */}
            {drawRows.length > 0 && <GroupHeader label="Draw Schedule" count={drawRows.length} />}
            {drawRows.map(r => <MarkerRow key={r.id} {...r} color={VIRIDIAN} />)}
          </div>
        </div>
      </div>

      {/* ── Legend / footer ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 border-t border-border bg-secondary/20">
        {[
          ['Complete', GREEN], ['In Progress', GOLD], ['SOV Line', STEEL],
        ].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground">
            <span className="w-4 h-[6px] rounded-full" style={{ backgroundColor: `${c}` }} /> {l}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground">
          <Diamond className="w-2.5 h-2.5" style={{ color: COPPER, fill: COPPER }} strokeWidth={2} /> Change Order
        </span>
        <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-muted-foreground">
          <CircleDollarSign className="w-2.5 h-2.5" style={{ color: VIRIDIAN }} strokeWidth={2} /> Draw
        </span>
        {onOpenReconciliation && (
          <button onClick={onOpenReconciliation} className="pdv2-link ml-auto">Open reconciliation →</button>
        )}
      </div>
    </div>
  );
}
