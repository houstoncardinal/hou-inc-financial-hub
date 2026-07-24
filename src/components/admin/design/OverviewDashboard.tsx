import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Area, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  ShieldCheck, ClipboardList, Inbox, FileCheck, Calendar,
  ChevronRight, ChevronDown, RefreshCw, ArrowUpRight, Bell,
  FileText, CheckCircle2, History, HardHat,
  ArrowUp, ArrowDown, TrendingUp, TrendingDown, Receipt, X,
  MessageSquare, FolderKanban, Layers, Activity, ZoomOut,
} from 'lucide-react';
import { MeetingsCalendar, type CalendarMeeting } from './MeetingsCalendar';
import { usePagination } from '@/hooks/usePagination';
import { ENTITIES } from '@/contexts/EntityContext';

const LEDGER_PAGE_SIZE = 8;

/* ── Monochrome luxury palette — black, white, subtle neutrals ── */
const BLACK   = '#0A0A0A';
const CHARCOAL = '#1A1A1A';
const STEEL   = '#6B7280';
const SILVER  = '#9CA3AF';
const BORDER   = '#E5E7EB';

/* Micro accent colors — used sparingly as small dots or thin lines */
const ACCENTS = {
  indigo: '#3B6E91',
  green:  '#16A34A',
  red:    '#DC2626',
  gold:   '#D97706',
};

const NET_POSITIVE = '#06B6D4';   // electric cyan — profit
const NET_NEGATIVE = '#DC2626';   // crimson — deficit
const RETAINAGE_COLOR = '#F59E0B';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const OV_CSS = `
.ov-card{position:relative;background:#fff;border-radius:20px;border:1px solid ${BORDER};box-shadow:0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.05);transition:box-shadow .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1),border-color .2s ease;}
.ov-card:hover{border-color:rgba(0,0,0,.16);box-shadow:0 6px 18px rgba(0,0,0,.05),0 18px 44px rgba(0,0,0,.08);}
.ov-crumb{font-size:11.5px;}
.ov-btn-outline{display:inline-flex;align-items:center;gap:6px;border:1px solid ${BORDER};background:#fff;color:#374151;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:600;transition:all .2s cubic-bezier(.16,1,.3,1);}
.ov-btn-outline:hover{border-color:#111;color:#111;transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.1);}
.ov-btn-outline:active{transform:translateY(0) scale(.96);}
.ov-btn-primary{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:8px 16px;font-size:12.5px;font-weight:700;color:#fff;background:${BLACK};box-shadow:0 9px 24px rgba(0,0,0,.18);transition:all .2s cubic-bezier(.16,1,.3,1);border:none;}
.ov-btn-primary:hover{transform:translateY(-2px);box-shadow:0 15px 34px rgba(0,0,0,.26);}
.ov-btn-primary:active{transform:translateY(0) scale(.96);}
.ov-premium{position:relative;overflow:hidden;border-radius:20px;background:${BLACK};color:#fff;border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 42px rgba(0,0,0,.22);transition:box-shadow .32s cubic-bezier(.16,1,.3,1),transform .32s cubic-bezier(.16,1,.3,1);}
.ov-premium::before{content:'';position:absolute;left:12%;right:12%;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);pointer-events:none;}
.ov-premium:hover{transform:translateY(-3px);box-shadow:0 28px 60px rgba(0,0,0,.32);}
.ov-title{font-size:11px;font-weight:700;letter-spacing:.04em;color:#111827;}
.ov-link{font-size:11.5px;font-weight:600;color:#111;white-space:nowrap;transition:opacity .15s ease;}
.ov-link:hover{opacity:.6;}
.ov-divide>*+*{border-top:1px solid ${BORDER};}
.ov-row{transition:background-color .2s ease;}
.ov-row:hover{background:#FAFAFF;}
.ov-chip{display:inline-flex;align-items:center;gap:5px;border-radius:9999px;border:1px solid ${BORDER};padding:4px 10px;font-size:9.5px;font-weight:700;letter-spacing:.04em;color:${STEEL};transition:all .2s cubic-bezier(.34,1.56,.64,1);cursor:pointer;}
.ov-chip.on{background:${BLACK};border-color:${BLACK};color:#fff;}
.ov-chip:hover:not(.on){border-color:#111;color:#111;transform:translateY(-1px);}
.shine-edge{position:relative;}
.shine-edge::after{content:'';position:absolute;inset:0;padding:1px;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(10,10,10,.5) 50%,transparent 65%);background-size:250% 100%;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:terminal-shine-sweep 3.2s linear infinite;}
@keyframes terminal-shine-sweep{0%{background-position:220% 0;}100%{background-position:-220% 0;}}
.ov-icon-pop{transition:transform .32s cubic-bezier(.34,1.56,.64,1);}
.group:hover .ov-icon-pop,.ov-row:hover .ov-icon-pop,.ov-premium:hover .ov-icon-pop{transform:scale(1.1) rotate(-3deg);}
.ov-avatar{transition:transform .28s cubic-bezier(.34,1.56,.64,1);}
.ov-row:hover .ov-avatar{transform:scale(1.08);}
.ov-badge-live{animation:ov-badge-breathe 2.4s ease-in-out infinite;}
@keyframes ov-badge-breathe{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
.ov-pipeline{background:#fff;border:1px solid rgba(0,0,0,.1);box-shadow:0 1px 2px rgba(0,0,0,.025),0 18px 46px rgba(0,0,0,.075);}
.ov-pipeline::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 92% -14%,rgba(0,0,0,.04),transparent 32%);}
.ov-pipeline-stage{scroll-snap-align:start;transition:background-color .25s ease,transform .3s cubic-bezier(.16,1,.3,1);}
.ov-pipeline-stage:hover{background:rgba(0,0,0,.02);transform:translateY(-2px);}
.ov-flow-node{animation:ov-flow-pulse 3.2s ease-in-out infinite;}
.ov-flow-line{position:absolute;left:34px;right:-18px;top:50%;height:1px;background:linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,.09));overflow:hidden;}
.ov-flow-line::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(10,10,10,.7) 48%,transparent 100%);background-size:35% 100%;background-repeat:no-repeat;animation:ov-flow-travel 2.8s linear infinite;}
@keyframes ov-flow-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,0,0,.1);}50%{box-shadow:0 0 0 6px rgba(0,0,0,0);}}
@keyframes ov-flow-travel{0%{background-position:-55% 0;}100%{background-position:155% 0;}}
@media (prefers-reduced-motion:reduce){.ov-flow-node,.ov-flow-line::after{animation:none!important;}}
.cal-day{border:1px solid transparent;color:#374151;transition:all .2s cubic-bezier(.34,1.56,.64,1);}
.cal-day:hover{background:#F9FAFB;transform:scale(1.06);}
.cal-today{border:1.5px solid ${BLACK};color:${BLACK};font-weight:800;}
.cal-selected{background:${BLACK};color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.18);transition:all .3s cubic-bezier(.34,1.56,.64,1);}
.cal-nav-btn{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid ${BORDER};color:${STEEL};transition:all .2s cubic-bezier(.16,1,.3,1);flex-shrink:0;}
.cal-nav-btn:hover{border-color:${BLACK};color:${BLACK};transform:translateY(-1px);box-shadow:0 4px 10px rgba(16,24,40,.06);}
.cal-nav-btn:active{transform:scale(.94);}
.cal-weekday{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${SILVER};text-align:center;}
`;

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—';
  const t = new Date(ts).getTime();
  if (isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const fmtMoney = (n: number, decimals = 2) =>
  Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const BRIEF_PILL: Record<string, { bg: string; fg: string }> = {
  in_progress:            { bg: 'rgba(22,163,74,0.08)', fg: ACCENTS.green },
  consultation_scheduled: { bg: 'rgba(59,110,145,0.08)', fg: ACCENTS.indigo },
  reviewing:              { bg: 'rgba(6,182,212,0.08)', fg: '#06B6D4' },
  submitted:              { bg: 'rgba(217,119,6,0.10)', fg: ACCENTS.gold },
};

const CHECK_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  cleared:  { bg: 'rgba(22,163,74,0.08)', fg: ACCENTS.green },
  pending:  { bg: 'rgba(217,119,6,0.10)', fg: ACCENTS.gold },
  voided:   { bg: 'rgba(107,114,128,0.10)', fg: STEEL },
};

export interface OverviewProps {
  adminName: string;
  clients: any[];
  briefs: Record<string, any>;
  allMsgs: Record<string, any[]>;
  allDocs: Record<string, any[]>;
  allMeetings: Record<string, any[]>;
  contactForms: any[];
  startBriefs: any[];
  helpRequests: any[];
  projects: any[];
  checks: any[];
  transactions: any[];
  onSelectTab: (tab: string) => void;
  onOpenClient: (clientId: string, subTab?: string) => void;
  onRefresh: () => void;
  onOpenFinance: () => void;
  onOpenLedgerEntry: (kind: 'income' | 'expense' | 'check', id: string) => void;
  onOpenFinanceSection: (section: 'income' | 'expenses' | 'checks') => void;
  onOpenEntityFinance: (entityId: string) => void;
  onSaveMeeting: (input: {
    id?: string; clientId: string; type: string; date: string; time: string;
    format: 'In-Person' | 'Video Call' | 'Phone Call';
    status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
    notes: string;
  }) => Promise<void>;
  onDeleteMeeting: (clientId: string, meetingId: string, meetingType: string) => Promise<void>;
  onConfirmMeeting: (clientId: string, meetingId: string, meetingType: string, date: string, time: string) => Promise<void>;
  onCancelMeeting: (clientId: string, meetingId: string, meetingType: string) => Promise<void>;
  onOpenMobileNav: () => void;
  onViewDocument: (url: string) => void;
}

/* ── Enterprise‑grade chart tooltip — magnetic pop‑in, detailed multi‑layer breakdown ── */
function FinanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const income    = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0;
  const expense   = payload.find((p: any) => p.dataKey === 'expense')?.value ?? 0;
  const retainage = payload.find((p: any) => p.dataKey === 'retainage')?.value ?? 0;
  const net       = income - expense;
  const margin    = income > 0 ? ((net / income) * 100) : null;
  const netColor  = net >= 0 ? NET_POSITIVE : NET_NEGATIVE;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border px-4 py-3 shadow-2xl min-w-[190px]"
      style={{ borderColor: BORDER, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b" style={{ borderColor: BORDER }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: SILVER }}>{label}</span>
        <span className="text-[7px] font-bold uppercase tracking-[0.16em] bg-gray-100 px-2 py-0.5 rounded" style={{ color: STEEL }}>Click to drill</span>
      </div>
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#10B981' }} />
          <span className="text-[10.5px] font-medium" style={{ color: STEEL }}>Revenue</span>
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: '#10B981' }}>+${income.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
      </div>
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-[10.5px] font-medium" style={{ color: STEEL }}>Expenses</span>
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: '#EF4444' }}>-${expense.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
      </div>
      {retainage > 0 && (
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
            <span className="text-[10.5px] font-medium" style={{ color: STEEL }}>Retainage</span>
          </div>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>${retainage.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-[2px] rounded-full" style={{ backgroundColor: netColor, boxShadow: `0 0 6px ${netColor}99` }} />
          <span className="text-[10.5px] font-bold" style={{ color: BLACK }}>Net</span>
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: netColor }}>
          {net < 0 ? '-' : '+'}${Math.abs(net).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>
      {margin !== null && (
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-[10.5px] font-medium" style={{ color: STEEL }}>Margin</span>
          <span className="text-[10.5px] font-bold tabular-nums" style={{ color: margin >= 0 ? '#10B981' : '#EF4444' }}>{margin.toFixed(1)}%</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Multi‑layered finance chart — revenue/expense glass panels + a split‑gradient
   zero‑baseline Net area/line (electric cyan above zero, crimson below), a magnetic
   glow crosshair, and a click‑to‑toggle legend. ── */
const FIN_SERIES = [
  { key: 'income',    label: 'Revenue',   color: '#10B981' },
  { key: 'expense',   label: 'Expenses',  color: '#EF4444' },
  { key: 'net',       label: 'Net',       color: NET_POSITIVE, split: true },
  { key: 'retainage', label: 'Retainage', color: RETAINAGE_COLOR },
] as const;

/* Custom Recharts tooltip cursor — a soft glowing vertical line that snaps to the
   nearest data column, giving the "magnetic scrub" feel as the user scans the chart. */
function MagneticCursor(props: any) {
  const { points, height } = props;
  const x = points?.[0]?.x;
  if (x == null || !height) return null;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={0} x2={x} y2={height} stroke="url(#magnetic-glow)" strokeWidth={10} />
      <line x1={x} y1={0} x2={x} y2={height} stroke={BLACK} strokeOpacity={0.16} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={x} cy={height} r={2.5} fill={BLACK} fillOpacity={0.25} />
    </g>
  );
}

function FinanceChart({ data, timeframe, onTimeframeChange }: {
  data: { label: string; income: number; expense: number; retainage: number; net: number }[];
  timeframe: string;
  onTimeframeChange: (t: string) => void;
}) {
  const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y'];
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string) => setHiddenSeries(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  /* Scroll‑to‑zoom — hovering the chart and scrolling compresses (fewer, wider‑spaced points)
     or widens (more, denser points) the visible window, independent of the 1D…1Y buckets.
     Uses a native listener (not React's onWheel) so preventDefault actually stops page scroll. */
  const MIN_WINDOW = 4;
  const [windowSize, setWindowSize] = useState<number | null>(null);
  useEffect(() => { setWindowSize(null); }, [data.length, timeframe]);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setWindowSize(prev => {
        const current = prev ?? data.length;
        const step = Math.max(1, Math.round(current * 0.15));
        const next = current + (e.deltaY < 0 ? -step : step);
        return Math.min(data.length, Math.max(MIN_WINDOW, next));
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [data.length]);
  const visibleData = useMemo(() => data.slice(-(windowSize ?? data.length)), [data, windowSize]);
  const isZoomed = windowSize !== null && windowSize < data.length;
  const hasRetainage = data.some(d => Math.abs(d.retainage) > 0);

  /* Split‑gradient zero baseline — compute the shared domain ourselves (rather than
     leaving it to Recharts' "auto") so the gradient's color switch lands exactly on
     the pixel row where value === 0, for every series sharing this axis. */
  const { domainMin, domainMax, zeroPct } = useMemo(() => {
    const values = visibleData.flatMap(d => [d.income, d.expense, d.net, d.retainage]);
    let max = Math.max(0, ...values);
    let min = Math.min(0, ...values);
    if (max === min) max = min + 1;
    const pad = (max - min) * 0.08;
    max += pad; min -= pad;
    const pct = Math.min(96, Math.max(4, (max / (max - min)) * 100));
    return { domainMin: min, domainMax: max, zeroPct: pct };
  }, [visibleData]);

  return (
    <div className="relative flex flex-col h-full">
      {/* Time‑range selector — positioned top‑right of the chart area */}
      <div className="relative flex items-center justify-end gap-1.5 mb-1 flex-wrap">
        {isZoomed && (
          <button
            onClick={() => setWindowSize(null)}
            className="flex items-center gap-1 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.06em] rounded-md text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <ZoomOut className="w-2.5 h-2.5" strokeWidth={2.5} /> Reset zoom
          </button>
        )}
        {TIMEFRAMES.map(t => (
          <button
            key={t}
            onClick={() => onTimeframeChange(t)}
            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] rounded-md transition-all duration-150 ${
              timeframe === t
                ? 'bg-black text-white shadow-[0_2px_8px_rgba(0,0,0,.15)]'
                : 'text-gray-400 hover:text-black hover:bg-gray-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div ref={chartWrapRef} className="relative flex-1 min-h-[150px]" title="Scroll to zoom the timeline">
        {/* Glass backdrop — a faint frosted ambiance behind the plotted series */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
          background: `radial-gradient(120% 90% at 50% ${zeroPct}%, rgba(6,182,212,.06), transparent 65%)`,
          backdropFilter: 'blur(1.5px)',
        }} />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 6, right: 8, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id="fin-income-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fin-expense-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
              {/* Split‑gradient net fill: glowing cyan above the zero line, fading
                  to near‑transparent AT the axis, then crimson building below it. */}
              <linearGradient id="net-split-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NET_POSITIVE} stopOpacity={0.5} />
                <stop offset={`${Math.max(0, zeroPct - 14)}%`} stopColor={NET_POSITIVE} stopOpacity={0.07} />
                <stop offset={`${zeroPct}%`} stopColor={NET_POSITIVE} stopOpacity={0} />
                <stop offset={`${zeroPct}%`} stopColor={NET_NEGATIVE} stopOpacity={0} />
                <stop offset={`${Math.min(100, zeroPct + 14)}%`} stopColor={NET_NEGATIVE} stopOpacity={0.14} />
                <stop offset="100%" stopColor={NET_NEGATIVE} stopOpacity={0.5} />
              </linearGradient>
              {/* Split‑gradient net stroke: a hard cyan→crimson switch exactly at zero */}
              <linearGradient id="net-split-stroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NET_POSITIVE} />
                <stop offset={`${zeroPct}%`} stopColor={NET_POSITIVE} />
                <stop offset={`${zeroPct}%`} stopColor={NET_NEGATIVE} />
                <stop offset="100%" stopColor={NET_NEGATIVE} />
              </linearGradient>
              {/* Magnetic crosshair glow */}
              <linearGradient id="magnetic-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NET_POSITIVE} stopOpacity={0} />
                <stop offset="50%" stopColor={NET_POSITIVE} stopOpacity={0.16} />
                <stop offset="100%" stopColor={NET_POSITIVE} stopOpacity={0} />
              </linearGradient>
              {/* Soft bloom filter — reused source graphic blurred behind itself */}
              <filter id="net-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke={BORDER} strokeDasharray="3 3" strokeOpacity={0.6} />
            <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: SILVER, fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            {/* One shared currency scale for every series, explicitly computed so the
                split‑gradient's zero crossing lines up exactly with this axis' zero. */}
            <YAxis hide domain={[domainMin, domainMax]} />
            <Tooltip content={<FinanceTooltip />} cursor={<MagneticCursor />} />
            <ReferenceLine y={0} stroke={SILVER} strokeOpacity={0.7} strokeDasharray="2 3" />
            {!hiddenSeries.has('income') && (
              <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#fin-income-fill)"
                style={{ mixBlendMode: 'multiply' }}
                dot={{ r: 2.5, strokeWidth: 0, fill: '#10B981' }} isAnimationActive animationDuration={900} animationEasing="ease-out"
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            )}
            {!hiddenSeries.has('expense') && (
              <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#fin-expense-fill)"
                style={{ mixBlendMode: 'multiply' }}
                dot={{ r: 2.5, strokeWidth: 0, fill: '#EF4444' }} isAnimationActive animationDuration={900} animationEasing="ease-out"
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            )}
            {!hiddenSeries.has('net') && (
              <Area type="monotone" dataKey="net" stroke="url(#net-split-stroke)" strokeWidth={2.75} fill="url(#net-split-fill)"
                style={{ filter: 'url(#net-glow)' }}
                dot={{ r: 2.5, strokeWidth: 0, fill: NET_POSITIVE }} isAnimationActive animationDuration={900} animationEasing="ease-out"
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#fff' }} />
            )}
            {!hiddenSeries.has('retainage') && (
              <Line type="monotone" dataKey="retainage" stroke={RETAINAGE_COLOR} strokeWidth={1.75} strokeDasharray="4 3"
                dot={{ r: 2.5, strokeWidth: 0, fill: RETAINAGE_COLOR }} isAnimationActive animationDuration={900} animationEasing="ease-out"
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Interactive legend — click any series to isolate/hide it */}
      <div className="flex items-center justify-center gap-3 sm:gap-5 mt-2.5 pt-2.5 border-t flex-wrap" style={{ borderColor: BORDER }}>
        {FIN_SERIES.map(item => {
          const off = hiddenSeries.has(item.key);
          const faint = item.key === 'retainage' && !hasRetainage;
          return (
            <button
              key={item.key}
              onClick={() => toggleSeries(item.key)}
              className="flex items-center gap-1.5 transition-opacity duration-150"
              style={{ opacity: off ? 0.3 : faint ? 0.55 : 1 }}
              title={faint ? 'No retainage held in this period' : `Toggle ${item.label}`}
            >
              <span
                className="w-2.5 h-[3px] rounded-full"
                style={'split' in item && item.split
                  ? { background: `linear-gradient(90deg, ${NET_POSITIVE}, ${NET_NEGATIVE})` }
                  : { backgroundColor: item.color }}
              />
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: STEEL, textDecoration: off ? 'line-through' : 'none' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bullet graph row — measure (contract value) against a target (budget), with qualitative bands ── */
function BulletBar({ label, sub, value, target, max, color }: {
  label: string; sub?: string | null; value: number; target: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const targetPct = target > 0 && max > 0 ? Math.min(100, (target / max) * 100) : null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[92px] shrink-0 min-w-0">
        <div className="text-[9.5px] font-bold text-black truncate">{label}</div>
        {sub && <div className="text-[8px] font-semibold truncate" style={{ color: sub.startsWith('+') ? ACCENTS.green : ACCENTS.red }}>{sub}</div>}
      </div>
      <div className="relative flex-1 h-4">
        {/* Qualitative bands — 60 / 85 / 100% reference zones */}
        <div className="absolute inset-0 top-1 bottom-1 rounded-sm overflow-hidden flex">
          <div className="h-full" style={{ width: '60%', background: '#EEF0F2' }} />
          <div className="h-full" style={{ width: '25%', background: '#E5E7EB' }} />
          <div className="h-full" style={{ width: '15%', background: '#DADDE1' }} />
        </div>
        {/* Measure bar */}
        <div className="absolute top-[5px] bottom-[5px] left-0 rounded-sm transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        {/* Target marker (budget) */}
        {targetPct !== null && (
          <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: `calc(${targetPct}% - 1px)`, background: BLACK }} />
        )}
      </div>
      <div className="w-[58px] shrink-0 text-right text-[9.5px] font-bold tabular-nums text-black">${fmtMoney(value, 0)}</div>
    </div>
  );
}

/* ── "Open Finance" luxury flyout — hover reveals it on desktop, a tap reveals it on
   mobile (tap again to pick), sliding out from underneath the primary button. Each
   row is branded in that entity's own accent color. ── */
function OpenFinanceMenu({ onOpenEntityFinance }: { onOpenEntityFinance: (entityId: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('touchstart', onClickAway);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('touchstart', onClickAway);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="ov-btn-primary"
      >
        Open Finance
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={2.6} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2.5 w-[248px] rounded-2xl overflow-hidden z-30"
            style={{
              background: 'rgba(255,255,255,.94)',
              backdropFilter: 'blur(18px) saturate(180%)',
              border: '1px solid rgba(0,0,0,.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,.22), 0 4px 14px rgba(0,0,0,.08)',
            }}
          >
            <div className="px-4 pt-3 pb-2 text-[8.5px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Select Finance Dashboard
            </div>
            <div className="pb-1.5">
              {ENTITIES.map(e => (
                <button
                  key={e.id}
                  role="menuitem"
                  onClick={() => { onOpenEntityFinance(e.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.035] group/item"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover/item:scale-125"
                    style={{ backgroundColor: e.color, boxShadow: `0 0 9px ${e.color}90` }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-bold text-gray-900 truncate">{e.name}</span>
                    <span className="block text-[9px] text-gray-400 truncate">{e.category}</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-gray-300 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0" strokeWidth={2.4} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OverviewDashboard({
  adminName, clients, briefs, allMsgs, allDocs, allMeetings, contactForms, startBriefs,
  helpRequests, projects, checks, transactions,
  onSelectTab, onOpenClient, onRefresh, onOpenFinance, onOpenLedgerEntry, onOpenFinanceSection, onOpenEntityFinance,
  onSaveMeeting, onDeleteMeeting, onConfirmMeeting, onCancelMeeting,
  onOpenMobileNav, onViewDocument,
}: OverviewProps) {
  const [timeframe, setTimeframe] = useState('1Y');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'income' | 'expense' | 'check'>('all');
  // Color picker removed — card uses fixed black/white aesthetic

  /* ── Derived data ── */
  const pendingApprovals = clients.filter((c: any) => c.status === 'pending_approval');
  const flatDocs  = Object.entries(allDocs).flatMap(([cId, ds]) => (ds ?? []).map((d: any) => ({ ...d, clientId: cId })));
  const flatMeets = Object.entries(allMeetings).flatMap(([cId, ms]) => (ms ?? []).map((m: any) => ({ ...m, clientId: cId })));
  const pendingDocs  = flatDocs.filter((d: any) => d.status === 'uploaded');
  const pendingMeets = flatMeets.filter((m: any) => m.status === 'requested');
  const openHelp = helpRequests.filter((r: any) => r.status !== 'resolved').length;
  const submittedBriefs = Object.values(briefs).filter((b: any) => b.status === 'submitted').length;
  const firstName = adminName.split(' ')[0];
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;
  const totalProjects = projects.length;
  const totalLeads = startBriefs.length + contactForms.length;
  const lifecycleCounts = useMemo(() => {
    const rows = [...startBriefs, ...contactForms];
    const count = (status: string) => rows.filter((lead: any) => (lead.lead_status || 'lead_capture') === status).length;
    return {
      lead_capture: count('lead_capture'), site_audit: count('site_audit'),
      estimation: count('estimation'), client_review: count('client_review'),
      awarded: count('awarded'), lost: count('lost'), contracting: count('contracting'),
    };
  }, [startBriefs, contactForms]);
  const clientName = (id: string) => clients.find((c: any) => c.id === id)?.name ?? 'Client';

  const totalMessages = Object.values(allMsgs).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);
  const totalNotifications = pendingApprovals.length + pendingDocs.length + pendingMeets.length + openHelp + submittedBriefs;

  /* ── Time-scoped finance data ── */
  const now = Date.now();
  const DAY = 86400000;
  const timeframeDays = timeframe === '1D' ? 1 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365;
  const bucketCount = timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 12 : timeframe === '6M' ? 24 : 12;

  const chartData = useMemo(() => {
    const buckets = new Array(bucketCount).fill(0).map(() => ({ income: 0, expense: 0 }));
    const bucketMs = (timeframeDays * DAY) / bucketCount;

    transactions.forEach((t: any) => {
      const ts = new Date(t.transaction_date).getTime();
      if (isNaN(ts) || ts < now - timeframeDays * DAY || ts > now) return;
      const idx = Math.min(bucketCount - 1, Math.floor((now - ts) / bucketMs));
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') buckets[idx].income += amt;
      else buckets[idx].expense += amt;
    });

    checks.forEach((c: any) => {
      const ts = new Date(c.issue_date).getTime();
      if (isNaN(ts) || ts < now - timeframeDays * DAY || ts > now) return;
      const idx = Math.min(bucketCount - 1, Math.floor((now - ts) / bucketMs));
      buckets[idx].expense += Number(c.amount) || 0;
    });

    // Reverse so oldest is first, and format labels
    const reversed = buckets.reverse();
    return reversed.map((b, i) => {
      const bucketEnd = new Date(now - (bucketCount - 1 - i) * bucketMs);
      const label = timeframe === '1D'
        ? bucketEnd.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
        : timeframe === '1W' || timeframe === '1M'
          ? bucketEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const retainageForBucket = checks.filter((c: any) => {
        const ts = new Date(c.issue_date).getTime();
        if (isNaN(ts) || ts < now - timeframeDays * DAY || ts > now) return false;
        const idx = Math.min(bucketCount - 1, Math.floor((now - ts) / bucketMs));
        return idx === bucketCount - 1 - i;
      }).reduce((sum: number, c: any) => sum + (Number(c.retainage_held) || 0), 0);
      return { label, income: b.income, expense: b.expense, retainage: retainageForBucket, net: b.income - b.expense };
    });
  }, [transactions, checks, timeframe, timeframeDays, bucketCount, now]);

  /* ── Finance summary totals for the selected timeframe ── */
  const periodTotalRevenue  = chartData.reduce((s, b) => s + b.income, 0);
  const periodTotalExpenses = chartData.reduce((s, b) => s + b.expense, 0);
  const periodNet           = periodTotalRevenue - periodTotalExpenses;

  /* ── Checks ── */
  const outstandingChecks = checks.filter((c: any) => c.status === 'pending').length;
  const openChecksValue = checks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);

  const activeContractValue = projects
    .filter((p: any) => p.status === 'active')
    .reduce((s: number, p: any) => s + (Number(p.current_contract_value) || 0), 0);

  /* ── Contract vs. budget bullet graph — real per‑project figures, largest active contracts first ── */
  const contractBullets = useMemo(() => {
    return projects
      .filter((p: any) => p.status === 'active' && Number(p.current_contract_value) > 0)
      .slice()
      .sort((a: any, b: any) => Number(b.current_contract_value) - Number(a.current_contract_value))
      .slice(0, 3)
      .map((p: any) => {
        const contract = Number(p.current_contract_value) || 0;
        const budget = Number(p.budget) || 0;
        const marginPct = budget > 0 ? ((contract - budget) / budget) * 100 : null;
        return { id: p.id, name: p.name || p.code || 'Project', contract, budget, marginPct };
      });
  }, [projects]);
  const bulletScaleMax = useMemo(() => {
    const vals = contractBullets.flatMap(b => [b.contract, b.budget]);
    return Math.max(...vals, 1) * 1.15;
  }, [contractBullets]);
  const totalEstCostToComplete = useMemo(() => projects
    .filter((p: any) => p.status === 'active')
    .reduce((s: number, p: any) => s + (Number(p.estimated_cost_to_complete) || 0), 0), [projects]);
  const PROJECT_COLORS = [BLACK, ACCENTS.indigo, ACCENTS.gold, STEEL];

  /* ── Luxury bento items — monochrome, minimal ── */
  const bentoItems = useMemo(() => [
    {
      key: 'projects',
      icon: FolderKanban,
      label: 'Active Projects',
      value: `${activeProjects}`,
      sub: `${totalProjects} total`,
      accent: BLACK,
      detail: `$${fmtMoney(activeContractValue, 0)} contract value`,
      onClick: () => onSelectTab('projects'),
    },
    {
      key: 'meetings',
      icon: Calendar,
      label: 'Meetings',
      value: `${flatMeets.length}`,
      sub: `${flatMeets.filter(m => m.status === 'confirmed').length} upcoming`,
      accent: ACCENTS.indigo,
      detail: `${pendingMeets.length} pending confirmation`,
      onClick: () => onSelectTab('meetings'),
    },
    {
      key: 'messages',
      icon: MessageSquare,
      label: 'Messages',
      value: `${totalMessages}`,
      sub: `${Object.keys(allMsgs).length} conversations`,
      accent: ACCENTS.gold,
      detail: `${Math.ceil(totalMessages / Math.max(1, Object.keys(allMsgs).length))} avg per thread`,
      onClick: () => onSelectTab('clients'),
    },
    {
      key: 'notifications',
      icon: Bell,
      label: 'Notifications',
      value: `${totalNotifications}`,
      sub: totalNotifications > 0 ? `${openHelp} help · ${pendingApprovals.length} approvals` : 'All clear',
      accent: totalNotifications > 0 ? ACCENTS.red : ACCENTS.green,
      detail: totalNotifications > 0 ? 'Requires attention' : 'No pending items',
      onClick: () => onSelectTab('notifications'),
    },
  ], [activeProjects, totalProjects, activeContractValue, flatMeets.length, pendingMeets.length, totalMessages, allMsgs, totalNotifications, openHelp, pendingApprovals.length, onSelectTab]);

  /* ── Ledger feed ── */
  const ledgerFeed = useMemo(() => {
    const rows: { id: string; rawId: string; kind: 'income' | 'expense' | 'check'; label: string; amount: number; status?: string; ts: string }[] = [];
    transactions.forEach((t: any) => rows.push({
      id: `t-${t.id}`, rawId: t.id, kind: t.type === 'income' ? 'income' : 'expense',
      label: t.description || t.category || (t.type === 'income' ? 'Income' : 'Expense'),
      amount: Number(t.amount) || 0, status: t.status, ts: t.transaction_date,
    }));
    checks.forEach((c: any) => rows.push({
      id: `c-${c.id}`, rawId: c.id, kind: 'check', label: `Check #${c.check_number ?? '—'} · ${c.payee_name ?? 'Payee'}`,
      amount: Number(c.amount) || 0, status: c.status, ts: c.issue_date,
    }));
    return rows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [transactions, checks]);
  const filteredLedger = ledgerFeed.filter(r => {
    if (ledgerFilter !== 'all' && r.kind !== ledgerFilter) return false;
    return true;
  });
  const ledgerPagination = usePagination(filteredLedger, LEDGER_PAGE_SIZE, ledgerFilter);

  /* ── Calendar ── */
  const calendarMeetings: CalendarMeeting[] = useMemo(() => flatMeets.map((m: any) => ({
    id: m.id, clientId: m.clientId, clientName: clientName(m.clientId),
    type: m.type, date: m.date, time: m.time, format: m.format, status: m.status, notes: m.notes ?? '',
  })), [flatMeets, clients]);
  const clientOptions = useMemo(() => clients
    .map((c: any) => ({ id: c.id, name: c.name ?? 'Client' }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name)), [clients]);

  /* ── Tasks ── */
  const tasks = [
    ...(pendingApprovals.length > 0 ? [{ id: 'approvals', icon: ShieldCheck, title: `${pendingApprovals.length} account application${pendingApprovals.length > 1 ? 's' : ''}`, sub: 'Waiting for review', action: 'Review', tab: 'approvals' }] : []),
    ...(pendingDocs.length > 0 ? [{ id: 'docs', icon: FileCheck, title: 'Verify client documents', sub: `${pendingDocs.length} pending review`, action: 'Review', tab: 'documents' }] : []),
    ...(submittedBriefs > 0 ? [{ id: 'briefs', icon: ClipboardList, title: 'Review project briefs', sub: `${submittedBriefs} submitted`, action: 'View', tab: 'clients' }] : []),
    ...(pendingMeets.length > 0 ? [{ id: 'meets', icon: Calendar, title: 'Confirm meeting requests', sub: `${pendingMeets.length} awaiting`, action: 'Schedule', tab: 'meetings' }] : []),
    ...(openHelp > 0 ? [{ id: 'help', icon: Bell, title: 'Respond to help requests', sub: `${openHelp} open`, action: 'Reply', tab: 'notifications' }] : []),
  ];
  const visibleTasks = tasks.slice(0, 3);

  const recentDocs = flatDocs
    .filter((d: any) => d.uploadedAt ?? d.uploaded_at)
    .sort((a: any, b: any) => new Date(b.uploadedAt ?? b.uploaded_at).getTime() - new Date(a.uploadedAt ?? a.uploaded_at).getTime())
    .slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="space-y-4">
      <style>{OV_CSS}</style>

      {/* ══ Header ══ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <div className="ov-crumb flex items-center gap-1.5 text-gray-400 font-medium mb-1">
              <span>Admin</span><span className="text-gray-300 mx-0.5">/</span><span style={{ color: BLACK }} className="font-bold">Overview</span>
            </div>
            <h1 className="text-[21px] sm:text-[25px] font-bold tracking-tight text-gray-900 leading-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">Houston Enterprise · financial command center</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onRefresh} className="ov-btn-outline"><RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />Refresh</button>
          <button onClick={() => onSelectTab('changelog')} className="ov-btn-outline"><History className="w-3.5 h-3.5" strokeWidth={2} />Changelog</button>
          <OpenFinanceMenu onOpenEntityFinance={onOpenEntityFinance} />
        </div>
      </div>

      {/* ══ Finance hero — enterprise‑grade, time‑scoped, multi‑layered ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="ov-card xl:col-span-8 p-4 sm:p-5 flex flex-col overflow-hidden h-full">
          {/* Top row: Net Income hero + timeframe selector */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 flex-wrap">
            <div className="flex items-baseline gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: STEEL }}>Net Income</span>
                </div>
                <span className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-none text-black tabular-nums">
                  {periodNet < 0 ? '−$' : '$'}{fmtMoney(periodNet)}
                </span>
              </div>
            </div>
          </div>

          {/* KPI stat row — clean, professional, color‑coded, click‑through to the live finance section */}
          <div className="grid grid-cols-3 gap-4 mt-3 pb-3 border-b" style={{ borderColor: BORDER }}>
            {[
              { label: 'Revenue', value: `+$${fmtMoney(periodTotalRevenue, 0)}`, color: '#10B981', dot: true, section: 'income' as const },
              { label: 'Expenses', value: `−$${fmtMoney(periodTotalExpenses, 0)}`, color: '#EF4444', dot: true, section: 'expenses' as const },
              { label: 'Open Checks', value: `${outstandingChecks} · $${fmtMoney(openChecksValue, 0)}`, color: '#F59E0B', dot: false, section: 'checks' as const },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={() => onOpenFinanceSection(stat.section)}
                className="group flex flex-col items-start text-left rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-black/[0.03]"
                title={`Open ${stat.label} in the finance dashboard`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {stat.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />}
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: STEEL }}>{stat.label}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 text-gray-300 opacity-0 -translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" strokeWidth={2.5} />
                </div>
                <span className="text-[14px] sm:text-[16px] font-bold tabular-nums text-black">{stat.value}</span>
              </button>
            ))}
          </div>

          {/* Chart with integrated timeframe selector */}
          <div className="mt-3 flex-1 flex flex-col min-h-0">
            <FinanceChart data={chartData} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          </div>
        </div>

        {/* Right column: Active Contract Value + compact bento */}
        <div className="xl:col-span-4 flex flex-col gap-2">
          {/* Active Contract Value — professional light theme */}
          <motion.button
            onClick={() => onSelectTab('projects')}
            className="relative overflow-hidden rounded-2xl p-3.5 text-left group"
            style={{
              background: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
              transition: 'all .3s cubic-bezier(.16,1,.3,1)',
            }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#6B7280' }}>Active Contract Value</span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                  <HardHat className="w-3.5 h-3.5" style={{ color: '#0A0A0A' }} strokeWidth={2} />
                </span>
              </div>
              <div className="text-[21px] font-bold tracking-tight tabular-nums mb-2.5 text-black">${fmtMoney(activeContractValue, 0)}</div>

              {/* Bullet graph — contracted value vs. cost budget, largest active projects first */}
              <div className="mb-2 rounded-lg p-2.5" style={{ background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8.5px] font-bold uppercase tracking-[0.1em]" style={{ color: '#9CA3AF' }}>Contract vs. Budget</span>
                  <span className="flex items-center gap-1 text-[8px] font-semibold" style={{ color: '#9CA3AF' }}>
                    <span className="w-2 h-[2px]" style={{ background: '#0A0A0A' }} /> Budget target
                  </span>
                </div>
                {contractBullets.length === 0 ? (
                  <div className="py-3 text-center text-[10px]" style={{ color: '#9CA3AF' }}>No active contracted projects yet.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {contractBullets.map((b, i) => (
                      <BulletBar
                        key={b.id}
                        label={b.name}
                        sub={b.marginPct !== null ? `${b.marginPct >= 0 ? '+' : ''}${b.marginPct.toFixed(0)}% margin` : null}
                        value={b.contract}
                        target={b.budget}
                        max={bulletScaleMax}
                        color={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[9px] pt-2 border-t" style={{ borderColor: '#F3F4F6' }}>
                <div>
                  <div style={{ color: '#9CA3AF' }} className="text-[8px] font-medium mb-0.5">Entity</div>
                  <div className="font-semibold text-black truncate">Houston Enterprise</div>
                </div>
                <div>
                  <div style={{ color: '#9CA3AF' }} className="text-[8px] font-medium mb-0.5">Projects</div>
                  <div className="font-semibold tabular-nums text-black">{activeProjects} Active</div>
                </div>
                <div className="text-right">
                  <div style={{ color: '#9CA3AF' }} className="text-[8px] font-medium mb-0.5">Est. Cost to Complete</div>
                  <div className="font-semibold tabular-nums text-black">${fmtMoney(totalEstCostToComplete, 0)}</div>
                </div>
              </div>
            </div>
          </motion.button>

          {/* Modern metric cards — compact, tinted, 3-up on desktop, extra-compact on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {[
              { key: 'messages', icon: MessageSquare, label: 'Messages', value: totalMessages, sub: `${Object.keys(allMsgs).length} conversations`, color: ACCENTS.indigo, tab: 'clients' },
              { key: 'meetings', icon: Calendar, label: 'Meetings', value: flatMeets.length, sub: `${pendingMeets.length} pending`, color: ACCENTS.gold, tab: 'meetings' },
              { key: 'notifications', icon: Bell, label: 'Notifications', value: totalNotifications, sub: totalNotifications > 0 ? 'Needs attention' : 'All clear', color: totalNotifications > 0 ? ACCENTS.red : ACCENTS.green, tab: 'notifications' },
            ].map(card => (
              <motion.button
                key={card.key}
                onClick={() => onSelectTab(card.tab)}
                className="relative overflow-hidden rounded-xl p-2.5 sm:p-2 text-left group"
                style={{
                  background: `linear-gradient(160deg, ${hexToRgba(card.color, 0.08)}, #ffffff 58%)`,
                  border: `1px solid ${hexToRgba(card.color, 0.18)}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)',
                  transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                }}>
                {/* Mobile — icon + label side‑by‑side, number centered vertically inside the card */}
                <div className="relative flex sm:hidden items-center gap-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: hexToRgba(card.color, 0.14), border: `1px solid ${hexToRgba(card.color, 0.26)}` }}>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-black truncate">{card.label}</div>
                    <div className="text-[8.5px] font-semibold truncate" style={{ color: '#6B7280' }}>{card.sub}</div>
                  </div>
                  <span className="text-[19px] font-bold tracking-tight tabular-nums text-black shrink-0">{card.value}</span>
                </div>
                {/* Desktop / tablet — compact vertical layout for the 3‑up grid */}
                <div className="relative hidden sm:flex sm:flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: hexToRgba(card.color, 0.14), border: `1px solid ${hexToRgba(card.color, 0.26)}` }}>
                      <card.icon className="w-3 h-3" style={{ color: card.color }} strokeWidth={2} />
                    </span>
                    <span className="text-[15px] font-bold tracking-tight tabular-nums text-black">{card.value}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-black truncate">{card.label}</div>
                    <div className="text-[8px] font-semibold truncate" style={{ color: '#6B7280' }}>{card.sub}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Construction pursuit lifecycle ══ */}
      <div className="ov-pipeline relative overflow-hidden rounded-[20px] text-gray-900">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-black/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold text-black/55">
              <span className="w-6 h-px bg-black/60" /> Preconstruction Pipeline
            </div>
            <div className="text-[15px] sm:text-[17px] font-bold mt-1 text-gray-900">From inquiry to contract</div>
            <div className="text-[10px] text-gray-500 mt-1">{totalLeads} opportunities in pipeline</div>
          </div>
          <button onClick={() => onSelectTab('leads')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/15 bg-black px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all w-full sm:w-auto">
            Manage <ArrowUpRight className="w-3 h-3" strokeWidth={2.4} />
          </button>
        </div>
        
        {/* Mobile: 2x3 grid layout to show all 6 cards */}
        <div className="sm:hidden grid grid-cols-3 gap-2.5 px-4 py-3">
          {[
            { n: '01', label: 'Lead Capture', value: lifecycleCounts.lead_capture, icon: Inbox, color: '#6B7280', accent: 'rgba(107,114,128,0.12)' },
            { n: '02', label: 'Site Audit', value: lifecycleCounts.site_audit, icon: HardHat, color: '#2563EB', accent: 'rgba(37,99,235,0.12)' },
            { n: '03', label: 'Estimate & Bid', value: lifecycleCounts.estimation, icon: Receipt, color: '#7C3AED', accent: 'rgba(124,58,237,0.12)' },
            { n: '04', label: 'Client Review', value: lifecycleCounts.client_review, icon: ClipboardList, color: '#D97706', accent: 'rgba(217,119,6,0.12)' },
            { n: '05', label: 'Award Decision', value: lifecycleCounts.awarded + lifecycleCounts.lost, icon: CheckCircle2, color: '#059669', accent: 'rgba(5,150,105,0.12)' },
            { n: '06', label: 'Contracting', value: lifecycleCounts.contracting, icon: FileCheck, color: '#16A34A', accent: 'rgba(22,163,74,0.12)' },
          ].map((stage, index) => (
            <button key={stage.n} onClick={() => onSelectTab('leads')}
              className="rounded-lg p-2.5 text-left transition-all active:scale-95"
              style={{ 
                background: `linear-gradient(135deg, ${stage.accent} 0%, transparent 100%)`,
                border: `1px solid ${stage.color}25`,
                boxShadow: `0 1px 2px ${stage.color}10`
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: `${stage.color}30`, color: stage.color }}>
                  <stage.icon className="w-2.5 h-2.5" strokeWidth={2} />
                </span>
                <span className="text-[6px] font-bold tracking-wider" style={{ color: stage.color }}>{stage.n}</span>
              </div>
              <div className="text-[16px] font-bold tabular-nums mb-0.5" style={{ color: stage.color }}>{stage.value}</div>
              <div className="text-[8px] font-semibold text-gray-800 leading-tight">{stage.label}</div>
            </button>
          ))}
        </div>

        {/* Desktop: Full grid layout */}
        <div className="hidden sm:relative sm:flex sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:grid sm:grid-cols-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { n: '01', label: 'Lead Capture', sub: 'New briefs', value: lifecycleCounts.lead_capture, icon: Inbox, color: '#6B7280', accent: 'rgba(107,114,128,0.08)' },
            { n: '02', label: 'Site Audit', sub: 'Field assessed', value: lifecycleCounts.site_audit, icon: HardHat, color: '#2563EB', accent: 'rgba(37,99,235,0.08)' },
            { n: '03', label: 'Estimate & Bid', sub: 'Pricing prepared', value: lifecycleCounts.estimation, icon: Receipt, color: '#7C3AED', accent: 'rgba(124,58,237,0.08)' },
            { n: '04', label: 'Client Review', sub: 'Under review', value: lifecycleCounts.client_review, icon: ClipboardList, color: '#D97706', accent: 'rgba(217,119,6,0.08)' },
            { n: '05', label: 'Award Decision', sub: `${lifecycleCounts.awarded} won · ${lifecycleCounts.lost} lost`, value: lifecycleCounts.awarded + lifecycleCounts.lost, icon: CheckCircle2, color: '#059669', accent: 'rgba(5,150,105,0.08)' },
            { n: '06', label: 'Contracting', sub: 'Mobilization ready', value: lifecycleCounts.contracting, icon: FileCheck, color: '#16A34A', accent: 'rgba(22,163,74,0.08)' },
          ].map((stage, index) => (
            <button key={stage.n} onClick={() => onSelectTab('leads')}
              className="ov-pipeline-stage group relative min-w-0 min-h-[140px] p-4 text-left border-r border-black/[0.07] last:border-r-0"
              style={{ background: `linear-gradient(135deg, ${stage.accent} 0%, transparent 100%)` }}>
              <div className="relative h-8 flex items-center justify-between gap-2">
                <span className="ov-flow-node relative z-10 w-7 h-7 rounded-full flex items-center justify-center border bg-white" style={{ borderColor: `${stage.color}30`, color: stage.color, animationDelay: `${index * 180}ms` }}>
                  <stage.icon className="w-3.5 h-3.5" strokeWidth={1.6} />
                </span>
                {index < 5 && <span className="ov-flow-line" style={{ animationDelay: `${index * 160}ms` }} />}
                <span className="text-[8px] font-bold tracking-[0.18em] text-black/20">{stage.n}</span>
              </div>
              <div className="text-[22px] font-bold mt-2 tabular-nums" style={{ color: stage.color }}>{stage.value}</div>
              <div className="text-[10px] font-semibold leading-tight text-gray-800 mt-1">{stage.label}</div>
              <div className="text-[8.5px] text-gray-400 mt-0.5 leading-tight">{stage.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ Meetings & Ledger Activity ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
      <div className="xl:col-span-5">
        <MeetingsCalendar
          meetings={calendarMeetings}
          onOpenMeeting={(clientId) => onOpenClient(clientId, 'meetings')}
          clientOptions={clientOptions}
          onSaveMeeting={onSaveMeeting}
          onDeleteMeeting={onDeleteMeeting}
          onConfirmMeeting={onConfirmMeeting}
          onCancelMeeting={onCancelMeeting}
          compact
        />
      </div>

      <div className="ov-card xl:col-span-7 flex flex-col overflow-hidden h-full">
        <div className="border-b shrink-0" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <div className="ov-title shrink-0">Ledger Activity</div>
            <button onClick={onOpenFinance} className="ov-link text-[10px] whitespace-nowrap shrink-0">View Ledger →</button>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto px-4 py-2.5">
            {(['all', 'income', 'expense', 'check'] as const).map(f => (
              <button key={f} className={`ov-chip shrink-0 ${ledgerFilter === f ? 'on' : ''}`} onClick={() => setLedgerFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="ov-divide flex-1 overflow-y-auto">
          {filteredLedger.length === 0 && (
            <div className="px-4 py-10 text-center text-[11.5px] text-gray-400">No activity for this filter.</div>
          )}
          {ledgerPagination.paged.map((r, i) => {
            const IconCmp = r.kind === 'income' ? TrendingUp : r.kind === 'expense' ? TrendingDown : Receipt;
            const color = r.kind === 'income' ? ACCENTS.green : r.kind === 'expense' ? ACCENTS.red : STEEL;
            const statusMeta = r.status ? (CHECK_STATUS_COLORS[String(r.status).toLowerCase()] ?? { bg: '#F3F4F6', fg: STEEL }) : null;
            return (
              <button key={r.id} onClick={() => onOpenLedgerEntry(r.kind, r.rawId)}
                title="View this entry in the Ledger"
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ov-row group">
                <span className={`ov-icon-pop w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === 0 && ledgerPagination.page === 1 ? 'shine-edge' : ''}`} style={{ backgroundColor: `${color}12` }}>
                  <IconCmp className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.6} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-gray-900 truncate">{r.label}</span>
                    {statusMeta && (
                      <span className="rounded-full px-1.5 py-[1px] text-[7.5px] font-bold uppercase tracking-[0.03em] whitespace-nowrap shrink-0" style={{ backgroundColor: statusMeta.bg, color: statusMeta.fg }}>
                        {r.status}
                      </span>
                    )}
                  </span>
                  <span className="text-[8.5px] text-gray-400">{r.ts ? new Date(r.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11.5px] font-bold tabular-nums" style={{ color: r.kind === 'income' ? ACCENTS.green : (r.kind === 'expense' ? ACCENTS.red : '#111827') }}>
                    {r.kind === 'income' ? '+' : '-'}${fmtMoney(r.amount, 0)}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" strokeWidth={2.2} />
                </span>
              </button>
            );
          })}
        </div>
        {ledgerPagination.pageCount > 1 && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t" style={{ borderColor: BORDER }}>
            <span className="text-[9.5px] font-semibold text-gray-400">
              {(ledgerPagination.page - 1) * ledgerPagination.pageSize + 1}–{Math.min(ledgerPagination.page * ledgerPagination.pageSize, ledgerPagination.total)} of {ledgerPagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => ledgerPagination.setPage(p => Math.max(1, p - 1))}
                disabled={ledgerPagination.page === 1}
                className="ov-chip disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-[9.5px] font-bold text-gray-500 px-1.5 whitespace-nowrap">{ledgerPagination.page} / {ledgerPagination.pageCount}</span>
              <button
                onClick={() => ledgerPagination.setPage(p => Math.min(ledgerPagination.pageCount, p + 1))}
                disabled={ledgerPagination.page === ledgerPagination.pageCount}
                className="ov-chip disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ══ Tasks & Documents ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="ov-card xl:col-span-7 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <div className="ov-title">Tasks & Alerts</div>
            <button onClick={() => onSelectTab('notifications')} className="ov-link text-[10px]">View all</button>
          </div>
          <div className="p-3 space-y-2">
            {visibleTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-6 h-6 mb-2" style={{ color: ACCENTS.green }} strokeWidth={1.2} />
                <div className="text-[12px] font-semibold text-gray-900">All caught up</div>
                <div className="text-[10px] text-gray-400 mt-0.5">No pending tasks.</div>
              </div>
            ) : visibleTasks.map(t => (
              <button key={t.id} onClick={() => onSelectTab(t.tab)}
                className="w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors group" style={{ borderColor: BORDER }}>
                <span className="ov-icon-pop w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${BLACK}05` }}>
                  <t.icon className="w-3.5 h-3.5 text-gray-600" strokeWidth={1.5} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-gray-900 truncate">{t.title}</span>
                  <span className="block text-[9px] text-gray-500 truncate">{t.sub}</span>
                </span>
                <span className="text-[9.5px] font-semibold text-gray-700 shrink-0">
                  {t.action} <ChevronRight className="w-2.5 h-2.5 inline group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ov-card xl:col-span-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <div className="ov-title">Documents</div>
            <button onClick={() => onSelectTab('documents')} className="ov-link text-[10px]">View all →</button>
          </div>
          <div className="ov-divide">
            {recentDocs.length === 0 && <div className="px-4 py-6 text-center text-[11.5px] text-gray-400">No documents yet.</div>}
            {recentDocs.map((d: any) => {
              const isPdf = String(d.fileType ?? d.file_type ?? '').toUpperCase().includes('PDF');
              const color = isPdf ? ACCENTS.gold : STEEL;
              const up = d.uploadedAt ?? d.uploaded_at;
              return (
                <button key={d.id} onClick={() => d.file_url ? onViewDocument(d.file_url) : onSelectTab('documents')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ov-row">
                  <span className="ov-icon-pop w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
                    <FileText className="w-3 h-3" style={{ color }} strokeWidth={1.5} />
                  </span>
                  <span className="flex-1 min-w-0 text-[11px] font-semibold text-gray-900 truncate">{d.name}</span>
                  <span className="text-[8.5px] text-gray-400 shrink-0">
                    {up ? new Date(up).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}