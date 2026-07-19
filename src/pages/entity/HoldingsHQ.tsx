/* ── Houston Enterprise Holdings · Holdings HQ dashboard ─────────────────────
   Entity-custom overview for the holding company: consolidated cash position
   across all three entities, entity performance comparison, intercompany
   loans + external debt schedules with interest exposure, and a capital
   activity log (contributions, distributions, dividends, management fees,
   tax reserves, intercompany transfers). ── */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { ENTITIES } from '@/contexts/EntityContext';
import {
  useHoldingsNotes, useCapitalActivity, useConsolidatedEntityTotals, useNotePayments, useHoldingsCovenants,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate, fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Landmark, Banknote, Scale, PiggyBank, ArrowLeftRight, Percent,
  Plus, Pencil, Trash2, Building2, TrendingUp, FileText, ShieldCheck,
  CalendarRange, Loader2, ShieldAlert, Download, AlarmClock, X,
  Radar, Wand2, AlertTriangle, Workflow, Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceChangelog } from '@/hooks/useFinanceChangelog';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip as RechartsTooltip,
  XAxis, YAxis, ZAxis,
} from 'recharts';

const HEH_BLUE = '#2C5F8A';

const HQ_CSS = `
.heh-shell{background:linear-gradient(180deg,hsl(var(--secondary)/.35),transparent 260px);}
.heh-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;transition:box-shadow .2s ease-in-out,transform .2s ease-in-out,border-color .2s ease-in-out;}
.heh-panel:hover{box-shadow:0 5px 18px rgba(10,10,10,.08),0 1px 0 rgba(255,255,255,.45) inset;transform:translateY(-1px);border-color:hsl(var(--foreground)/.2);}
.heh-command{background:linear-gradient(135deg,rgba(44,95,138,.105),rgba(5,150,105,.055) 55%,hsl(var(--background)/.65));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.heh-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;position:relative;overflow:hidden;transition:transform .2s ease-in-out,box-shadow .2s ease-in-out,border-color .2s ease-in-out;}
.heh-card:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(10,10,10,.08);border-color:hsl(var(--foreground)/.2);}
.heh-card:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#2C5F8A);}
.heh-k{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:850;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.heh-v{font-size:17px;line-height:1.05;font-weight:850;margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.heh-sub{font-size:10px;color:hsl(var(--muted-foreground));margin-top:5px;line-height:1.25;}
.heh-mega{font-size:clamp(22px,4vw,42px);line-height:.95;font-weight:950;letter-spacing:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.heh-entity-tile{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.heh-mini-bar{height:4px;background:hsl(var(--secondary));overflow:hidden;}
.heh-mini-bar>span{display:block;height:100%;}
.heh-row{border-bottom:1px solid hsl(var(--border));padding:9px 12px;font-size:12px;}
.heh-row:hover{background:hsl(var(--secondary)/.35);}
.heh-primary{height:32px;background:#0f172a;color:white;padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background .2s ease-in-out,transform .2s ease-in-out,box-shadow .2s ease-in-out,opacity .2s ease-in-out;}
.heh-primary:hover{background:#020617;transform:translateY(-1px);box-shadow:0 10px 24px rgba(15,23,42,.18);}
.heh-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;}
.heh-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;transition:background .2s ease-in-out,border-color .2s ease-in-out,transform .2s ease-in-out,opacity .2s ease-in-out;}
.heh-action:hover{background:hsl(var(--secondary)/.55);border-color:hsl(var(--foreground)/.2);transform:translateY(-1px);}
.heh-action:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.heh-field{height:38px;border-radius:0;font-size:12px;}
.heh-dark-panel{background:#0f172a;color:#f8fafc;border:1px solid rgba(148,163,184,.28);box-shadow:0 18px 44px rgba(15,23,42,.18),0 1px 0 rgba(255,255,255,.08) inset;}
.heh-chart-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;transition:box-shadow .2s ease-in-out,transform .2s ease-in-out,border-color .2s ease-in-out;}
.heh-chart-card:hover{box-shadow:0 5px 18px rgba(10,10,10,.08);transform:translateY(-1px);border-color:hsl(var(--foreground)/.2);}
.heh-sankey-wrap{position:relative;min-height:360px;border:1px solid rgba(148,163,184,.25);background:radial-gradient(circle at 50% 50%,rgba(44,95,138,.24),transparent 32%),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));overflow:hidden;}
.heh-sankey-svg{width:100%;height:360px;display:block;}
.heh-sankey-path{fill:none;stroke-linecap:round;transition:opacity .18s ease-in-out,stroke-width .18s ease-in-out,filter .18s ease-in-out;}
.heh-sankey-node{position:absolute;min-width:142px;max-width:190px;border:1px solid rgba(226,232,240,.22);background:rgba(15,23,42,.72);backdrop-filter:blur(14px);padding:10px;color:white;box-shadow:0 14px 34px rgba(2,6,23,.22);}
.heh-sankey-tooltip{position:absolute;pointer-events:none;background:rgba(15,23,42,.82);border:1px solid rgba(226,232,240,.22);box-shadow:0 18px 42px rgba(2,6,23,.32);backdrop-filter:blur(16px);color:white;padding:9px 11px;font-size:11px;z-index:3;}
.heh-chart-tip{background:hsl(var(--background)/.92);border:1px solid hsl(var(--border));box-shadow:0 14px 34px rgba(10,10,10,.12);backdrop-filter:blur(16px);padding:9px 10px;font-size:11px;color:hsl(var(--foreground));}
.heh-heat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px;}
.heh-risk-cell{border:1px solid hsl(var(--border));padding:10px;min-height:86px;background:hsl(var(--background));transition:transform .16s,box-shadow .16s,border-color .16s;}
.heh-risk-cell:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(10,10,10,.08);}
.heh-risk-breach{background:linear-gradient(135deg,rgba(220,38,38,.14),rgba(245,158,11,.08));border-color:rgba(220,38,38,.35);}
.heh-risk-warning{background:linear-gradient(135deg,rgba(245,158,11,.13),rgba(44,95,138,.05));border-color:rgba(245,158,11,.32);}
.heh-drawer{position:fixed;inset:0 0 0 auto;width:min(420px,100vw);background:hsl(var(--background));border-left:1px solid hsl(var(--border));box-shadow:-18px 0 44px rgba(10,10,10,.14);z-index:80;overflow-y:auto;}
.heh-drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.22);z-index:70;}
.dark .heh-panel,.dark .heh-card,.dark .heh-action,.dark .heh-entity-tile,.dark .heh-chart-card{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
.dark .heh-command{background:linear-gradient(135deg,rgba(44,95,138,.18),rgba(5,150,105,.08));}
@media(max-width:900px){.heh-sankey-wrap{min-height:470px}.heh-sankey-svg{height:470px}.heh-sankey-node{min-width:126px;max-width:156px}}
@media(max-width:767px){.heh-v{font-size:14px}.heh-panel{padding:12px!important}.heh-drawer{width:100vw}.heh-sankey-node{font-size:10px;padding:8px}.heh-sankey-wrap{min-height:520px}.heh-sankey-svg{height:520px}}
`;

const NOTE_TYPES: Record<string, string> = {
  intercompany_loan: 'Intercompany Loan',
  bank_loan: 'Bank Loan',
  line_of_credit: 'Line of Credit',
  mortgage: 'Mortgage',
  other: 'Other',
};

const ACTIVITY_TYPES: Record<string, { label: string; color: string; sign: 1 | -1 }> = {
  capital_contribution: { label: 'Capital Contribution', color: '#059669', sign: 1 },
  distribution:         { label: 'Distribution',         color: '#dc2626', sign: -1 },
  dividend:             { label: 'Dividend',             color: '#d97706', sign: -1 },
  management_fee:       { label: 'Management Fee',       color: '#0891b2', sign: 1 },
  tax_reserve:          { label: 'Tax Reserve',          color: '#7c3aed', sign: -1 },
  intercompany_transfer:{ label: 'Intercompany Transfer',color: '#2C5F8A', sign: -1 },
};

const num = (v: unknown) => Number(v || 0);
const entityName = (id: string | null | undefined) =>
  ENTITIES.find(e => e.id === id)?.shortName ?? (id ? id : 'External');

function Metric({ label, value, sub, icon: Icon, color = HEH_BLUE }: any) {
  return (
    <div className="heh-card p-3 min-w-0" style={{ '--accent': color } as any}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="heh-k">{label}</div>
          <div className="heh-v">{value}</div>
          <div className="heh-sub">{sub}</div>
        </div>
        <div className="w-8 h-8 border border-border bg-secondary/35 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="heh-chart-tip">
      <div className="font-black text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 font-mono-tab tabular-nums">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-black">{typeof p.value === 'number' ? fmtUSD(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function BubbleTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="heh-chart-tip">
      <div className="font-black">{row.name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 font-mono-tab tabular-nums">
        <span className="text-muted-foreground">ROI</span><span className="font-black">{row.roi.toFixed(1)}%</span>
        <span className="text-muted-foreground">Margin</span><span className="font-black">{row.margin.toFixed(1)}%</span>
        <span className="text-muted-foreground">Volume</span><span className="font-black">{fmtUSD(row.volume)}</span>
      </div>
    </div>
  );
}

function CapitalSankey({
  sources,
  destinations,
  poolValue,
  hovered,
  onHover,
}: {
  sources: Array<{ label: string; value: number; color: string }>;
  destinations: Array<{ label: string; value: number; color: string }>;
  poolValue: number;
  hovered: string | null;
  onHover: (value: string | null) => void;
}) {
  const left = sources.length ? sources : [{ label: 'Awaiting subsidiary distributions', value: 0, color: '#64748b' }];
  const right = destinations.length ? destinations : [{ label: 'No outgoing allocations logged', value: 0, color: '#64748b' }];
  const max = Math.max(1, ...left.map(x => x.value), ...right.map(x => x.value));
  const total = Math.max(1, left.reduce((s, x) => s + x.value, 0) + right.reduce((s, x) => s + x.value, 0));
  const leftY = (idx: number) => 62 + idx * (236 / Math.max(1, left.length - 1 || 1));
  const rightY = (idx: number) => 62 + idx * (236 / Math.max(1, right.length - 1 || 1));
  const stroke = (v: number) => Math.max(7, Math.min(26, (Math.abs(v) / max) * 26));

  return (
    <div className="heh-sankey-wrap">
      <svg className="heh-sankey-svg" viewBox="0 0 1000 360" preserveAspectRatio="none">
        <defs>
          {[...left, ...right].map((f, i) => (
            <linearGradient key={`${f.label}-${i}`} id={`heh-flow-${i}`} x1="0%" x2="100%">
              <stop offset="0%" stopColor={f.color} stopOpacity=".95" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity=".52" />
            </linearGradient>
          ))}
          <filter id="heh-flow-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {left.map((f, i) => {
          const id = `source-${f.label}`;
          const active = !hovered || hovered === id;
          return (
            <path
              key={id}
              className="heh-sankey-path"
              d={`M 185 ${leftY(i)} C 340 ${leftY(i)} 370 180 500 180`}
              stroke={`url(#heh-flow-${i})`}
              strokeWidth={stroke(f.value)}
              opacity={active ? .92 : .16}
              filter={active ? 'url(#heh-flow-glow)' : undefined}
              onMouseEnter={() => onHover(id)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
        {right.map((f, i) => {
          const grad = left.length + i;
          const id = `destination-${f.label}`;
          const active = !hovered || hovered === id;
          return (
            <path
              key={id}
              className="heh-sankey-path"
              d={`M 500 180 C 635 180 660 ${rightY(i)} 815 ${rightY(i)}`}
              stroke={`url(#heh-flow-${grad})`}
              strokeWidth={stroke(f.value)}
              opacity={active ? .92 : .16}
              filter={active ? 'url(#heh-flow-glow)' : undefined}
              onMouseEnter={() => onHover(id)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </svg>
      <div className="heh-sankey-node" style={{ left: 16, top: 18 }}>
        <div className="heh-k !text-slate-300">Sources</div>
        <div className="space-y-2 mt-2">
          {left.map((f, i) => {
            const id = `source-${f.label}`;
            return (
              <div key={f.label} onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)} className={`${hovered && hovered !== id ? 'opacity-40' : ''} transition-opacity`}>
                <div className="text-[10px] font-black truncate">{f.label}</div>
                <div className="font-mono-tab tabular-nums text-sm font-black" style={{ color: f.color }}>{fmtUSD(f.value)}</div>
                <div className="text-[9px] text-white/55">{((f.value / total) * 100).toFixed(1)}% of mapped movement</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="heh-sankey-node text-center" style={{ left: '50%', top: 132, transform: 'translateX(-50%)' }}>
        <div className="heh-k !text-slate-300">Consolidated Net Pool</div>
        <div className="font-mono-tab tabular-nums text-xl font-black mt-1">{fmtUSD(poolValue)}</div>
      </div>
      <div className="heh-sankey-node" style={{ right: 16, top: 18 }}>
        <div className="heh-k !text-slate-300">Destinations</div>
        <div className="space-y-2 mt-2">
          {right.map((f, i) => {
            const id = `destination-${f.label}`;
            return (
              <div key={f.label} onMouseEnter={() => onHover(id)} onMouseLeave={() => onHover(null)} className={`${hovered && hovered !== id ? 'opacity-40' : ''} transition-opacity`}>
                <div className="text-[10px] font-black truncate">{f.label}</div>
                <div className="font-mono-tab tabular-nums text-sm font-black" style={{ color: f.color }}>{fmtUSD(f.value)}</div>
                <div className="text-[9px] text-white/55">{((f.value / total) * 100).toFixed(1)}% of mapped movement</div>
              </div>
            );
          })}
        </div>
      </div>
      {hovered && (
        <div className="heh-sankey-tooltip" style={{ left: '50%', bottom: 18, transform: 'translateX(-50%)' }}>
          Hovered flow isolated. Other capital paths are dimmed for visual tracing.
        </div>
      )}
    </div>
  );
}

const BLANK_NOTE = {
  id: '', direction: 'receivable', note_type: 'intercompany_loan', counterparty_name: '',
  counterparty_entity_id: '', principal: '', outstanding_balance: '', interest_rate: '',
  payment_amount: '', payment_frequency: 'monthly', status: 'active',
  origination_date: '', maturity_date: '', collateral: '', notes: '',
};

const BLANK_ACTIVITY = {
  id: '', activity_type: 'distribution', related_entity_id: '', amount: '',
  activity_date: todayLocalDate(), memo: '', approval_status: 'approved',
};

const BLANK_PAYMENT = {
  note_id: '', payment_date: todayLocalDate(),
  amount: '', principal_portion: '', interest_portion: '', memo: '',
};

/* Suggested interest for one period at the note's APR: monthly = balance ×
   rate/12, quarterly ÷4, annual/interest-only/balloon = full year. */
function suggestedInterest(note: any): number {
  const balance = Number(note?.outstanding_balance || 0);
  const rate = Number(note?.interest_rate || 0) / 100;
  if (balance <= 0 || rate <= 0) return 0;
  const perYear = note?.payment_frequency === 'monthly' ? 12
    : note?.payment_frequency === 'quarterly' ? 4
    : 1;
  return Math.round((balance * rate / perYear) * 100) / 100;
}

export default function HoldingsHQ() {
  const { user } = useAuth();
  const logFinanceChange = useFinanceChangelog();
  useEntityOpsRealtime();

  const { data: notes = [], isLoading: notesLoading } = useHoldingsNotes();
  const { data: activity = [], isLoading: activityLoading } = useCapitalActivity();
  const { data: payments = [] } = useNotePayments();
  const { data: consolidated = {} } = useConsolidatedEntityTotals();

  const upsertNote = useEntityOpsUpsert('holdings_notes');
  const deleteNote = useEntityOpsSoftDelete('holdings_notes');
  const upsertActivity = useEntityOpsUpsert('holdings_capital_activity');
  const deleteActivity = useEntityOpsSoftDelete('holdings_capital_activity');
  const upsertPayment = useEntityOpsUpsert('holdings_note_payments');
  const deletePayment = useEntityOpsSoftDelete('holdings_note_payments');

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ ...BLANK_NOTE });
  const [activityDialog, setActivityDialog] = useState(false);
  const [activityForm, setActivityForm] = useState({ ...BLANK_ACTIVITY });
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ ...BLANK_PAYMENT });
  const [amortNote, setAmortNote] = useState<any | null>(null);
  const [amortRows, setAmortRows] = useState<any[]>([]);
  const [amortLoading, setAmortLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [mitigationTarget, setMitigationTarget] = useState<any | null>(null);
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);

  const { data: covenants = [] } = useHoldingsCovenants();
  const upsertCovenant = useEntityOpsUpsert('holdings_covenants');
  const deleteCovenant = useEntityOpsSoftDelete('holdings_covenants');
  const [covenantDialog, setCovenantDialog] = useState(false);
  const [covenantForm, setCovenantForm] = useState({
    id: '', name: '', covenant_type: 'financial', requirement: '', status: 'compliant',
    note_id: '', next_review_date: '', notes: '',
  });

  const covenantStats = useMemo(() => {
    const live = covenants as any[];
    const breached = live.filter(c => c.status === 'breached').length;
    const warning = live.filter(c => c.status === 'warning').length;
    const dueSoon = live.filter(c => {
      if (!c.next_review_date || ['waived'].includes(c.status)) return false;
      const d = Math.ceil((new Date(c.next_review_date + 'T12:00:00').getTime() - Date.now()) / 86400000);
      return d <= 30;
    }).length;
    return { total: live.length, breached, warning, dueSoon };
  }, [covenants]);

  /* Notes maturing within 12 months — refinance/payoff runway. */
  const maturityRisk = useMemo(() => {
    const horizon = Date.now() + 365 * 86400000;
    return (notes as any[])
      .filter(n => n.status === 'active' && n.maturity_date)
      .map(n => ({ ...n, daysToMaturity: Math.ceil((new Date(n.maturity_date + 'T12:00:00').getTime() - Date.now()) / 86400000) }))
      .filter(n => new Date(n.maturity_date + 'T12:00:00').getTime() <= horizon)
      .sort((a, b) => a.daysToMaturity - b.daysToMaturity);
  }, [notes]);

  const openCovenant = (c?: any) => {
    setCovenantForm(c ? {
      id: c.id, name: c.name ?? '', covenant_type: c.covenant_type ?? 'financial',
      requirement: c.requirement ?? '', status: c.status ?? 'compliant',
      note_id: c.note_id ?? '', next_review_date: c.next_review_date ?? '', notes: c.notes ?? '',
    } : { id: '', name: '', covenant_type: 'financial', requirement: '', status: 'compliant', note_id: '', next_review_date: '', notes: '' });
    setCovenantDialog(true);
  };

  const saveCovenant = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!covenantForm.name.trim()) return toast.error('Covenant name is required');
    try {
      await upsertCovenant.mutateAsync({
        ...(covenantForm.id ? { id: covenantForm.id } : {}),
        user_id: user.id,
        entity_id: 'houston-enterprise-holdings',
        name: covenantForm.name.trim(),
        covenant_type: covenantForm.covenant_type,
        requirement: covenantForm.requirement.trim() || null,
        status: covenantForm.status,
        note_id: covenantForm.note_id || null,
        next_review_date: covenantForm.next_review_date || null,
        last_reviewed_date: covenantForm.id ? todayLocalDate() : null,
        notes: covenantForm.notes.trim() || null,
      });
      toast.success(covenantForm.id ? 'Covenant updated' : 'Covenant added');
      setCovenantDialog(false);
    } catch (e: any) {
      toast.error(e.message?.includes('holdings_covenants') ? 'Run migration 20260717000005 to enable covenant tracking' : e.message);
    }
  };

  const exportAmortizationCsv = () => {
    if (!amortNote || !amortRows.length) return;
    const header = 'Period,Due Date,Payment,Interest,Principal,Ending Balance';
    const lines = amortRows.map((r: any) =>
      [r.period, r.due_date, num(r.payment).toFixed(2), num(r.interest).toFixed(2), num(r.principal).toFixed(2), num(r.ending_balance).toFixed(2)].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amortization-${amortNote.counterparty_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openAmortization = async (note: any) => {
    setAmortNote(note);
    setAmortRows([]);
    setAmortLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_holdings_note_amortization', { p_note_id: note.id, p_max_periods: 60 });
      if (error) throw error;
      setAmortRows(data ?? []);
    } catch (e: any) {
      toast.error(e.message?.includes('function') ? 'Run migration 20260717000004 to enable amortization schedules' : e.message);
    } finally {
      setAmortLoading(false);
    }
  };

  /* Scheduled debt service over the next 12 months, from each active note's
     stated payment amount and frequency. */
  const debtService = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() + i + 1, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), inflow: 0, outflow: 0 };
    });
    const hits = (freq: string, monthIdx: number) =>
      freq === 'monthly' ? 1 : freq === 'quarterly' ? (monthIdx % 3 === 0 ? 1 : 0) : freq === 'annual' ? (monthIdx === 0 ? 1 : 0) : 0;
    for (const n of notes as any[]) {
      if (n.status !== 'active' || !num(n.payment_amount)) continue;
      months.forEach((m, idx) => {
        const count = hits(n.payment_frequency, idx);
        if (!count) return;
        if (n.direction === 'receivable') m.inflow += num(n.payment_amount) * count;
        else m.outflow += num(n.payment_amount) * count;
      });
    }
    const totalIn = months.reduce((s, m) => s + m.inflow, 0);
    const totalOut = months.reduce((s, m) => s + m.outflow, 0);
    const max = Math.max(1, ...months.map(m => Math.max(m.inflow, m.outflow)));
    return { months, totalIn, totalOut, max, any: totalIn + totalOut > 0 };
  }, [notes]);

  const stats = useMemo(() => {
    const live = (notes as any[]).filter(n => n.status === 'active');
    const receivable = live.filter(n => n.direction === 'receivable');
    const payable = live.filter(n => n.direction === 'payable');
    const notesReceivable = receivable.reduce((s, n) => s + num(n.outstanding_balance), 0);
    const notesPayable = payable.reduce((s, n) => s + num(n.outstanding_balance), 0);
    const annualInterestIn = receivable.reduce((s, n) => s + num(n.outstanding_balance) * num(n.interest_rate) / 100, 0);
    const annualInterestOut = payable.reduce((s, n) => s + num(n.outstanding_balance) * num(n.interest_rate) / 100, 0);

    const year = new Date().getFullYear();
    const isApproved = (a: any) => !a.approval_status || a.approval_status === 'approved';
    const ytd = (activity as any[]).filter(a => isApproved(a) && new Date(a.activity_date + 'T12:00:00').getFullYear() === year);
    const ytdBy = (type: string) => ytd.filter(a => a.activity_type === type).reduce((s, a) => s + num(a.amount), 0);

    const consolidatedNet = Object.values(consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)
      .reduce((s, e) => s + e.income - e.expense - e.clearedChecks, 0);

    return {
      notesReceivable, notesPayable, netNotes: notesReceivable - notesPayable,
      annualInterestIn, annualInterestOut,
      ytdContributions: ytdBy('capital_contribution'),
      ytdDistributions: ytdBy('distribution') + ytdBy('dividend'),
      ytdManagementFees: ytdBy('management_fee'),
      ytdTaxReserves: ytdBy('tax_reserve'),
      consolidatedNet,
    };
  }, [notes, activity, consolidated]);

  const entityRows = useMemo(() =>
    ENTITIES.map(e => {
      const t = (consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)[e.id]
        ?? { income: 0, expense: 0, clearedChecks: 0 };
      const outflow = t.expense + t.clearedChecks;
      const net = t.income - outflow;
      const margin = t.income > 0 ? (net / t.income) * 100 : 0;
      const roi = outflow > 0 ? (net / outflow) * 100 : margin;
      return { ...e, income: t.income, outflow, net, margin, roi, volume: t.income + outflow };
    }), [consolidated]);

  const treasuryFlow = useMemo(() => {
    const he = entityRows.find(e => e.id === 'houston-enterprise');
    const hgp = entityRows.find(e => e.id === 'houston-generator-pros');
    const positiveNet = entityRows.filter(e => e.net > 0).reduce((s, e) => s + e.net, 0);
    const max = Math.max(1, positiveNet, stats.ytdDistributions, stats.ytdTaxReserves, stats.ytdContributions, stats.annualInterestIn);
    const width = (v: number) => `${Math.max(6, Math.min(34, (Math.abs(v) / max) * 34))}px`;
    const sources = [
      { label: 'HE Construction Distributions', value: Math.max(0, he?.net ?? 0), color: '#0f766e' },
      { label: 'HGP Energy Services Distributions', value: Math.max(0, hgp?.net ?? 0), color: '#475569' },
      { label: 'Notes Receivable Interest', value: stats.annualInterestIn, color: '#059669' },
    ].filter(x => x.value > 0);
    const destinations = [
      { label: 'Owner Distributions YTD', value: stats.ytdDistributions, color: '#dc2626' },
      { label: 'Tax Reserves YTD', value: stats.ytdTaxReserves, color: '#7c3aed' },
      { label: 'Subsidiary Contributions YTD', value: stats.ytdContributions, color: '#0891b2' },
      { label: 'Debt Service Interest Run-Rate', value: stats.annualInterestOut, color: '#f59e0b' },
    ].filter(x => x.value > 0);
    return { sources, destinations, max, width };
  }, [entityRows, stats]);

  const runway = useMemo(() => {
    let pool = stats.consolidatedNet;
    const rows = debtService.months.map(m => {
      const subsidiaryCoverage = Math.max(0, entityRows.filter(e => e.id !== 'houston-enterprise-holdings' && e.net > 0).reduce((s, e) => s + e.net, 0) / 12);
      const inflow = m.inflow + subsidiaryCoverage;
      const outflow = m.outflow;
      const start = pool;
      pool = pool + inflow - outflow;
      return { ...m, start, inflow, outflow, end: pool, warning: outflow > inflow };
    });
    const maxAbs = Math.max(1, ...rows.flatMap(r => [Math.abs(r.start), Math.abs(r.end), r.inflow, r.outflow]));
    const warnings = rows.filter(r => r.warning || r.end < 0);
    return { rows, maxAbs, warnings };
  }, [debtService.months, entityRows, stats.consolidatedNet]);

  const covenantMatrix = useMemo(() => {
    return (covenants as any[]).map(c => {
      const note = (notes as any[]).find(n => n.id === c.note_id);
      const days = c.next_review_date
        ? Math.ceil((new Date(c.next_review_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
        : 999;
      const exposure = num(note?.outstanding_balance || note?.principal || 0);
      const statusRisk = c.status === 'breached' ? 80 : c.status === 'warning' ? 55 : c.status === 'waived' ? 8 : 18;
      const proximityRisk = days <= 7 ? 20 : days <= 30 ? 12 : days <= 90 ? 6 : 0;
      const risk = Math.min(100, statusRisk + proximityRisk + Math.min(20, exposure / 100000));
      return { ...c, note, days, exposure, risk };
    }).sort((a, b) => b.risk - a.risk);
  }, [covenants, notes]);

  const debtCascadeData = useMemo(() => runway.rows.map(m => ({
    month: m.label,
    receivable: m.inflow,
    payable: -m.outflow,
    runway: m.end,
    warning: m.warning || m.end < 0,
  })), [runway.rows]);

  const bubbleDomain = useMemo(() => {
    const rois = entityRows.map(e => e.roi);
    const margins = entityRows.map(e => e.margin);
    const pad = 12;
    return {
      x: [Math.min(-25, Math.floor(Math.min(...rois) - pad)), Math.max(75, Math.ceil(Math.max(...rois) + pad))],
      y: [Math.min(-25, Math.floor(Math.min(...margins) - pad)), Math.max(75, Math.ceil(Math.max(...margins) + pad))],
    };
  }, [entityRows]);

  const simulateMitigation = (c: any) => {
    const exposure = num(c.exposure);
    const required = Math.max(25000, Math.round((exposure * 0.08) / 1000) * 1000);
    setMitigationTarget({
      ...c,
      simulatedContribution: required,
      simulatedDscr: '1.28x',
      action: c.note?.direction === 'payable' ? 'capital contribution to debt-service reserve' : 'intercompany receivable acceleration',
    });
  };

  const openNote = (n?: any) => {
    setNoteForm(n ? {
      id: n.id, direction: n.direction, note_type: n.note_type,
      counterparty_name: n.counterparty_name ?? '', counterparty_entity_id: n.counterparty_entity_id ?? '',
      principal: n.principal != null ? String(n.principal) : '',
      outstanding_balance: n.outstanding_balance != null ? String(n.outstanding_balance) : '',
      interest_rate: n.interest_rate != null ? String(n.interest_rate) : '',
      payment_amount: n.payment_amount != null ? String(n.payment_amount) : '',
      payment_frequency: n.payment_frequency ?? 'monthly', status: n.status ?? 'active',
      origination_date: n.origination_date ?? '', maturity_date: n.maturity_date ?? '',
      collateral: n.collateral ?? '', notes: n.notes ?? '',
    } : { ...BLANK_NOTE });
    setNoteDialog(true);
  };

  const saveNote = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!noteForm.counterparty_name.trim()) return toast.error('Counterparty is required');
    const row: any = {
      ...(noteForm.id ? { id: noteForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-enterprise-holdings',
      direction: noteForm.direction,
      note_type: noteForm.note_type,
      counterparty_name: noteForm.counterparty_name.trim(),
      counterparty_entity_id: noteForm.counterparty_entity_id || null,
      principal: Number(noteForm.principal) || 0,
      outstanding_balance: Number(noteForm.outstanding_balance || noteForm.principal) || 0,
      interest_rate: Number(noteForm.interest_rate) || 0,
      payment_amount: noteForm.payment_amount ? Number(noteForm.payment_amount) : null,
      payment_frequency: noteForm.payment_frequency,
      status: noteForm.status,
      origination_date: noteForm.origination_date || null,
      maturity_date: noteForm.maturity_date || null,
      collateral: noteForm.collateral.trim() || null,
      notes: noteForm.notes.trim() || null,
    };
    try {
      const saved = await upsertNote.mutateAsync(row);
      await logFinanceChange({
        action: noteForm.id ? 'holdings_note_resolution_updated' : 'holdings_note_resolution_drafted',
        entity: 'holdings_note',
        entityId: saved?.id ?? noteForm.id ?? null,
        entityLabel: row.counterparty_name,
        details: {
          governance_packet: {
            packet_type: 'standard_intercompany_note_resolution',
            counterparty: row.counterparty_name,
            direction: row.direction,
            principal: row.principal,
            maturity_date: row.maturity_date,
            signoff_status: 'drafted_for_owner_review',
            signoff_link: '/changelog',
          },
        },
      });
      toast.success(noteForm.id ? 'Note updated' : 'Note recorded');
      setNoteDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const openPayment = (note: any) => {
    const interest = suggestedInterest(note);
    const paymentAmt = Number(note.payment_amount || 0);
    const principal = paymentAmt > interest ? Math.round((paymentAmt - interest) * 100) / 100 : 0;
    setPaymentForm({
      note_id: note.id,
      payment_date: todayLocalDate(),
      amount: paymentAmt ? String(paymentAmt) : '',
      principal_portion: principal ? String(principal) : '',
      interest_portion: interest ? String(interest) : '',
      memo: '',
    });
    setPaymentDialog(true);
  };

  const savePayment = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!paymentForm.note_id) return toast.error('No note selected');
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a positive payment amount');
    const principal = Number(paymentForm.principal_portion) || 0;
    const interest = Number(paymentForm.interest_portion) || 0;
    if (principal + interest > amount + 0.01) {
      return toast.error('Principal + interest cannot exceed the payment amount');
    }
    try {
      await upsertPayment.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-enterprise-holdings',
        note_id: paymentForm.note_id,
        payment_date: paymentForm.payment_date,
        amount,
        principal_portion: principal,
        interest_portion: interest,
        memo: paymentForm.memo.trim() || null,
      });
      toast.success(interest > 0
        ? 'Payment logged — balance updated, interest posted to the ledger'
        : 'Payment logged — balance updated');
      setPaymentDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const pendingApprovals = (activity as any[]).filter(a => a.approval_status === 'pending');

  const decideApproval = async (a: any, decision: 'approved' | 'rejected') => {
    try {
      await upsertActivity.mutateAsync({
        id: a.id, user_id: a.user_id, entity_id: a.entity_id,
        activity_type: a.activity_type, amount: a.amount, activity_date: a.activity_date,
        approval_status: decision,
        approved_by: user?.email ?? null,
        approved_at: new Date().toISOString(),
      });
      await logFinanceChange({
        action: `holdings_capital_activity_${decision}`,
        entity: 'holdings_capital_activity',
        entityId: a.id,
        entityLabel: `${a.activity_type} · ${fmtUSD(num(a.amount))}`,
        details: {
          governance_packet: {
            packet_type: 'capital_activity_owner_resolution',
            approval_decision: decision,
            approved_by: user?.email ?? user?.id ?? 'finance_app',
            signoff_status: decision === 'approved' ? 'approved' : 'rejected',
          },
        },
      });
      toast.success(decision === 'approved' ? 'Capital activity approved' : 'Capital activity rejected');
    } catch (e: any) {
      toast.error(e.message?.includes('approval_status') ? 'Run migration 20260717000006 to enable approvals' : e.message);
    }
  };

  const paymentNote = (notes as any[]).find(n => n.id === paymentForm.note_id) ?? null;

  const saveActivity = async () => {
    if (!user?.id) return toast.error('Sign in required');
    const amount = Number(activityForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a positive amount');
    const row: any = {
      ...(activityForm.id ? { id: activityForm.id } : {}),
      user_id: user.id,
      entity_id: 'houston-enterprise-holdings',
      activity_type: activityForm.activity_type,
      related_entity_id: activityForm.related_entity_id || null,
      amount,
      activity_date: activityForm.activity_date,
      memo: activityForm.memo.trim() || null,
    };
    try {
      const saved = await upsertActivity.mutateAsync(row);
      await logFinanceChange({
        action: 'holdings_capital_resolution_drafted',
        entity: 'holdings_capital_activity',
        entityId: saved?.id ?? activityForm.id ?? null,
        entityLabel: `${ACTIVITY_TYPES[activityForm.activity_type]?.label ?? activityForm.activity_type} · ${fmtUSD(amount)}`,
        details: {
          governance_packet: {
            packet_type: 'capital_activity_resolution',
            activity_type: activityForm.activity_type,
            related_entity: activityForm.related_entity_id ? entityName(activityForm.related_entity_id) : 'External / owners',
            amount,
            activity_date: activityForm.activity_date,
            approval_status: activityForm.approval_status,
            signoff_status: activityForm.approval_status === 'pending' ? 'queued_for_owner_review' : 'recorded_as_approved',
            signoff_link: '/changelog',
          },
        },
      });
      toast.success('Capital activity logged');
      setActivityDialog(false);
      setActivityForm({ ...BLANK_ACTIVITY });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <style>{HQ_CSS}</style>
      <PageHeader
        eyebrow="Houston Enterprise Holdings"
        title="Holdings HQ"
        description="Consolidated portfolio, intercompany capital, debt schedules, and owner activity."
        actions={
          <div className="flex items-center gap-2">
            <button className="heh-action" onClick={() => { setActivityForm({ ...BLANK_ACTIVITY }); setActivityDialog(true); }}>
              <ArrowLeftRight className="w-3 h-3" /> Log Capital
            </button>
            <button className="heh-primary" onClick={() => openNote()}><Plus className="w-3.5 h-3.5" /> New Note</button>
          </div>
        }
      />

      <div className="heh-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          <section className="heh-command p-3 sm:p-4">
            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.5fr] gap-4">
              <div className="min-w-0">
                <div className="heh-k" style={{ color: HEH_BLUE }}>Corporate Command View</div>
                <div className={`heh-mega mt-2 ${stats.consolidatedNet >= 0 ? 'text-positive' : 'text-destructive'}`}>
                  {fmtUSD(stats.consolidatedNet)}
                </div>
                <div className="text-xs text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  Consolidated management position across Houston Enterprise, Houston Generator Pros, and Houston Enterprise Holdings. Drill into ledgers, checks, inflows, and expenses from the sidebar to see each row labeled by entity.
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="heh-entity-tile p-2.5">
                    <div className="heh-k">Net Notes</div>
                    <div className={`text-base font-black font-mono-tab mt-1 ${stats.netNotes >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(stats.netNotes)}</div>
                  </div>
                  <div className="heh-entity-tile p-2.5">
                    <div className="heh-k">YTD Capital</div>
                    <div className="text-base font-black font-mono-tab mt-1">{fmtUSD(stats.ytdContributions - stats.ytdDistributions)}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {entityRows.map(e => {
                  const maxAbs = Math.max(1, ...entityRows.map(row => Math.abs(row.net)));
                  const pct = Math.min(100, Math.round((Math.abs(e.net) / maxAbs) * 100));
                  return (
                    <div key={e.id} className="heh-entity-tile p-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 border flex items-center justify-center shrink-0" style={{ borderColor: `${e.color}40`, backgroundColor: `${e.color}10` }}>
                          <Building2 className="w-4 h-4" style={{ color: e.color }} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <div className="font-black text-sm truncate">{e.shortName}</div>
                          <div className="text-[8px] uppercase tracking-[0.16em] font-bold text-muted-foreground truncate">{e.category}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className={`text-lg font-black font-mono-tab ${e.net >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(e.net)}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 truncate">{fmtUSD(e.income)} in · {fmtUSD(e.outflow)} out</div>
                      </div>
                      <div className="heh-mini-bar mt-2"><span style={{ width: `${pct}%`, backgroundColor: e.net >= 0 ? '#059669' : '#dc2626' }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="heh-dark-panel p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-4">
              <div>
                <div className="heh-k !text-slate-300">Multi-Entity Treasury Flow</div>
                <h2 className="text-xl font-black mt-1">Consolidated Capital Pipeline</h2>
              </div>
              <div className="text-[10px] text-slate-300 max-w-lg">
                Live management-basis flow from operating entities and notes into the Holdings cash pool, then out to owners, reserves, debt service, and subsidiary capital allocation.
              </div>
            </div>
            <CapitalSankey
              sources={treasuryFlow.sources}
              destinations={treasuryFlow.destinations}
              poolValue={stats.consolidatedNet}
              hovered={hoveredFlow}
              onHover={setHoveredFlow}
            />
          </section>

          <div className="grid grid-cols-1 2xl:grid-cols-[1.15fr_.85fr] gap-3.5">
            <section className="heh-panel p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  <div className="heh-k">Cash Runway Waterfall</div>
                  <h2 className="text-lg font-black mt-1">12-Month Debt Cascade</h2>
                </div>
                {runway.warnings.length > 0 ? (
                  <button className="heh-action !text-destructive !border-destructive/30 !bg-destructive/5" onClick={() => setRebalanceOpen(true)}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Simulate Capital Rebalancing
                  </button>
                ) : (
                  <span className="heh-action !text-positive"><ShieldCheck className="w-3.5 h-3.5" /> Runway Stable</span>
                )}
              </div>
              {runway.warnings.length > 0 && (
                <div className="mb-3 border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                  Liquidity warning: {runway.warnings.length} month{runway.warnings.length === 1 ? '' : 's'} show debt obligations outpacing scheduled receivable coverage or pool balance.
                </div>
              )}
              <div className="h-[285px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={debtCascadeData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={5}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="cash" tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={52} />
                    <YAxis yAxisId="runway" orientation="right" tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={52} />
                    <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(44,95,138,.06)' }} />
                    <ReferenceLine yAxisId="cash" y={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar yAxisId="cash" dataKey="receivable" name="Notes Receivable + Coverage" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="cash" dataKey="payable" name="Notes Payable" fill="#dc2626" radius={[0, 0, 3, 3]} maxBarSize={28} />
                    <Line yAxisId="runway" type="monotone" dataKey="runway" name="Net Runway" stroke="#2C5F8A" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: 'hsl(var(--background))' }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                <div className="border border-border bg-secondary/25 p-2"><div className="heh-k">Receivable Coverage</div><div className="font-mono-tab font-black mt-1 text-positive">{fmtUSD(debtService.totalIn)}</div></div>
                <div className="border border-border bg-secondary/25 p-2"><div className="heh-k">Payable Load</div><div className="font-mono-tab font-black mt-1 text-destructive">{fmtUSD(debtService.totalOut)}</div></div>
                <div className="border border-border bg-secondary/25 p-2"><div className="heh-k">Warning Months</div><div className="font-mono-tab font-black mt-1">{runway.warnings.length}</div></div>
              </div>
            </section>

            <section className="heh-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="heh-k">Subsidiary Portfolio Grid</div>
                  <h2 className="text-lg font-black mt-1">ROI / Margin Quadrant</h2>
                </div>
                <Radar className="w-5 h-5" style={{ color: HEH_BLUE }} />
              </div>
              <div className="h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 12, bottom: 18, left: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="roi" name="ROI" domain={bubbleDomain.x as [number, number]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="margin" name="Margin" domain={bubbleDomain.y as [number, number]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} axisLine={false} tickLine={false} />
                    <ZAxis type="number" dataKey="volume" range={[360, 1400]} />
                    <RechartsTooltip content={<BubbleTooltip />} cursor={{ stroke: '#2C5F8A', strokeDasharray: '4 4' }} />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    {hoveredBubble && (
                      <>
                        <ReferenceLine x={entityRows.find(e => e.id === hoveredBubble)?.roi ?? 0} stroke="hsl(var(--foreground))" strokeDasharray="3 3" />
                        <ReferenceLine y={entityRows.find(e => e.id === hoveredBubble)?.margin ?? 0} stroke="hsl(var(--foreground))" strokeDasharray="3 3" />
                      </>
                    )}
                    <Scatter data={entityRows} onClick={(d: any) => setSelectedEntity(d)} onMouseEnter={(d: any) => setHoveredBubble(d.id)} onMouseLeave={() => setHoveredBubble(null)}>
                      {entityRows.map(e => (
                        <Cell key={e.id} fill={e.color} fillOpacity={0.82} stroke="hsl(var(--background))" strokeWidth={1.5} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Bubble size follows total cash volume. Click any entity to inspect its micro-ledger metrics without leaving Holdings HQ.
              </div>
            </section>
          </div>

          <section className="heh-panel p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="heh-k">Covenant Mitigation Radar</div>
                <h2 className="text-lg font-black mt-1">High-Density Compliance Risk Matrix</h2>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em]">
                <span className="text-destructive">{covenantStats.breached} breached</span>
                <span className="text-warning">{covenantStats.warning} warning</span>
                <span className="text-muted-foreground">{covenantStats.dueSoon} due ≤30d</span>
              </div>
            </div>
            <div className="heh-heat-grid">
              {(covenantMatrix.length ? covenantMatrix : [{ id: 'none', name: 'No Active Covenant Risk', status: 'compliant', covenant_type: 'financial', risk: 0, exposure: 0, days: 999, requirement: 'All tracked covenants are clear.' }]).slice(0, 16).map((c: any) => {
                const risky = c.status === 'breached' || c.risk >= 75;
                const warning = c.status === 'warning' || c.risk >= 45;
                return (
                  <div key={c.id} className={`heh-risk-cell ${risky ? 'heh-risk-breach' : warning ? 'heh-risk-warning' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-[0.14em] font-black text-muted-foreground truncate">{c.covenant_type}</div>
                        <div className="font-bold text-xs truncate mt-1">{c.name}</div>
                      </div>
                      <div className={`font-mono-tab font-black text-sm ${risky ? 'text-destructive' : warning ? 'text-warning' : 'text-positive'}`}>{Math.round(c.risk)}%</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2 line-clamp-2">{c.requirement || c.note?.counterparty_name || 'No requirement text'}</div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="text-[9px] font-mono-tab">{fmtUSD(c.exposure)} · {c.days > 998 ? 'no review' : `${c.days}d`}</div>
                      {c.id !== 'none' && (
                        <button className="heh-action !h-7" onClick={() => simulateMitigation(c)}>
                          <Wand2 className="w-3 h-3" /> Mitigate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── KPI rail ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Consolidated Net" value={fmtUSD(stats.consolidatedNet)} sub="Income − outflow across all entities" icon={Landmark} color={stats.consolidatedNet >= 0 ? '#059669' : '#dc2626'} />
            <Metric label="Notes Receivable" value={fmtUSD(stats.notesReceivable)} sub={`${fmtUSD(stats.annualInterestIn)} est. annual interest in`} icon={Banknote} color="#059669" />
            <Metric label="Notes Payable" value={fmtUSD(stats.notesPayable)} sub={`${fmtUSD(stats.annualInterestOut)} est. annual interest out`} icon={Scale} color="#dc2626" />
            <Metric label="Net Note Position" value={fmtUSD(stats.netNotes)} sub="Receivable minus payable balances" icon={Percent} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <Metric label="Contributions YTD" value={fmtUSD(stats.ytdContributions)} sub="Capital into subsidiaries" icon={PiggyBank} color="#059669" />
            <Metric label="Distributions YTD" value={fmtUSD(stats.ytdDistributions)} sub="Distributions + dividends out" icon={ArrowLeftRight} color="#dc2626" />
            <Metric label="Mgmt Fees YTD" value={fmtUSD(stats.ytdManagementFees)} sub="Fees charged to subsidiaries" icon={FileText} color="#0891b2" />
            <Metric label="Tax Reserves YTD" value={fmtUSD(stats.ytdTaxReserves)} sub="Set aside for tax obligations" icon={ShieldCheck} color="#7c3aed" />
          </div>

          {/* ── Debt service — next 12 months ── */}
          {debtService.any && (
            <section className="heh-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="heh-k">Debt Service · Next 12 Months</div>
                <div className="text-[9px] font-mono-tab text-muted-foreground">
                  <span className="text-positive font-bold">{fmtUSD(debtService.totalIn)} in</span>
                  {' · '}
                  <span className="text-destructive font-bold">{fmtUSD(debtService.totalOut)} out</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {debtService.months.map(m => (
                  <div key={m.key} className="min-w-0" title={`${m.label}: ${fmtUSD(m.inflow)} in · ${fmtUSD(m.outflow)} out`}>
                    <div className="h-14 flex items-end gap-[2px] justify-center">
                      <div className="w-2 bg-[#059669]/75" style={{ height: `${(m.inflow / debtService.max) * 100}%` }} />
                      <div className="w-2 bg-[#dc2626]/70" style={{ height: `${(m.outflow / debtService.max) * 100}%` }} />
                    </div>
                    <div className="text-[7px] font-bold text-center text-muted-foreground uppercase mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-[8.5px] text-muted-foreground mt-1.5">
                Scheduled from each active note's stated payment and frequency — green receivable collections, red payable obligations.
              </div>
            </section>
          )}

          {/* ── Covenant compliance + maturity risk ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            <section className="heh-panel p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="heh-k">Covenant Compliance</div>
                <div className="flex items-center gap-2">
                  {covenantStats.breached > 0 && <span className="text-[9px] font-black uppercase text-destructive">{covenantStats.breached} breached</span>}
                  {covenantStats.warning > 0 && <span className="text-[9px] font-black uppercase text-warning">{covenantStats.warning} at risk</span>}
                  {covenantStats.dueSoon > 0 && <span className="text-[9px] font-mono-tab text-muted-foreground">{covenantStats.dueSoon} reviews ≤30d</span>}
                  <button className="heh-action" onClick={() => openCovenant()}><Plus className="w-3 h-3" /> Add</button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(covenants as any[]).map(c => {
                  const color = c.status === 'breached' ? '#dc2626' : c.status === 'warning' ? '#d97706' : c.status === 'waived' ? '#8A8580' : '#059669';
                  const note = (notes as any[]).find(n => n.id === c.note_id);
                  return (
                    <div key={c.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-secondary/30" onClick={() => openCovenant(c)}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: color + '16', color }}>{c.status}</span>
                          <span className="font-bold truncate">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">{c.covenant_type}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                          {note ? `${note.counterparty_name} · ` : ''}{c.requirement || 'No requirement text'}
                          {c.next_review_date ? ` · review ${fmtDate(c.next_review_date)}` : ''}
                        </div>
                      </div>
                      <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove covenant"
                        onClick={e => { e.stopPropagation(); if (confirm('Remove this covenant?')) deleteCovenant.mutate(c.id, { onSuccess: () => toast.success('Covenant removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {!(covenants as any[]).length && (
                  <div className="text-xs text-muted-foreground border border-border p-3 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HEH_BLUE }} />
                    Track lender covenants — DSCR minimums, reporting deadlines, insurance requirements — with status and review dates. Requires migration 20260717000005.
                  </div>
                )}
              </div>
            </section>

            <section className="heh-panel p-3 sm:p-4">
              <div className="heh-k mb-2">Maturity Risk · Next 12 Months</div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {maturityRisk.map((n: any) => (
                  <div key={n.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{n.counterparty_name}</div>
                      <div className="text-[9px] text-muted-foreground">{fmtUSD(num(n.outstanding_balance))} · {n.direction === 'receivable' ? 'we hold' : 'we owe'} · matures {fmtDate(n.maturity_date)}</div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap flex items-center gap-1 ${n.daysToMaturity <= 90 ? 'text-destructive' : 'text-warning'}`}>
                      <AlarmClock className="w-3 h-3" />{n.daysToMaturity <= 0 ? 'Matured' : `${n.daysToMaturity}d`}
                    </span>
                  </div>
                ))}
                {!maturityRisk.length && (
                  <div className="text-xs text-muted-foreground border border-border p-3">No active notes mature within 12 months.</div>
                )}
              </div>
            </section>
          </div>

          {/* ── Entity performance comparison ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="heh-k mb-2">Entity Portfolio</div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="heh-row grid grid-cols-[1.5fr_.9fr_.9fr_.9fr] gap-2 bg-secondary/45 heh-k items-center">
                  <div>Entity</div><div>Income</div><div>Outflow</div><div>Net</div>
                </div>
                {entityRows.map(e => (
                  <div key={e.id} className="heh-row grid grid-cols-[1.5fr_.9fr_.9fr_.9fr] gap-2 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 flex items-center justify-center shrink-0 border" style={{ borderColor: `${e.color}40`, backgroundColor: `${e.color}0d` }}>
                        <Building2 className="w-3 h-3" style={{ color: e.color }} strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{e.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{e.category}</div>
                      </div>
                    </div>
                    <div className="font-mono-tab">{fmtUSD(e.income)}</div>
                    <div className="font-mono-tab">{fmtUSD(e.outflow)}</div>
                    <div className={`font-mono-tab font-bold ${e.net >= 0 ? 'text-positive' : 'text-destructive'}`}>{fmtUSD(e.net)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Outflow = expenses + cleared checks per entity. Open an entity from the sidebar switcher for its full dashboard.
            </div>
          </section>

          {/* ── Notes / debt schedule ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="heh-k">Debt & Intercompany</div>
                <h2 className="text-base font-bold mt-0.5">Note Schedule</h2>
              </div>
              <button className="heh-action" onClick={() => openNote()}><Plus className="w-3 h-3" /> New Note</button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[880px]">
                <div className="heh-row grid grid-cols-[1.3fr_.9fr_.7fr_.9fr_.9fr_.6fr_.8fr_.9fr_.5fr] gap-2 bg-secondary/45 heh-k items-center">
                  <div>Counterparty</div><div>Type</div><div>Direction</div><div>Principal</div><div>Outstanding</div><div>Rate</div><div>Payment</div><div>Maturity</div><div></div>
                </div>
                {(notes as any[]).map(n => (
                  <div key={n.id} className="heh-row grid grid-cols-[1.3fr_.9fr_.7fr_.9fr_.9fr_.6fr_.8fr_.9fr_.5fr] gap-2 items-center">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{n.counterparty_name}</div>
                      {n.counterparty_entity_id && (
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{entityName(n.counterparty_entity_id)}</div>
                      )}
                    </div>
                    <div className="text-[11px]">{NOTE_TYPES[n.note_type] ?? n.note_type}</div>
                    <div>
                      <span className={`text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 ${n.direction === 'receivable' ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
                        {n.direction === 'receivable' ? 'We Hold' : 'We Owe'}
                      </span>
                    </div>
                    <div className="font-mono-tab">{fmtUSD(num(n.principal))}</div>
                    <div className="font-mono-tab font-bold">{fmtUSD(num(n.outstanding_balance))}</div>
                    <div className="font-mono-tab">{num(n.interest_rate).toFixed(2)}%</div>
                    <div className="text-[11px] whitespace-nowrap">
                      {n.payment_amount ? `${fmtUSD(num(n.payment_amount))} / ${String(n.payment_frequency).replace('_', ' ')}` : String(n.payment_frequency).replace('_', ' ')}
                    </div>
                    <div className="text-[11px] whitespace-nowrap">{n.maturity_date ? fmtDate(n.maturity_date) : '—'}</div>
                    <div className="flex items-center gap-1 justify-end">
                      {n.status === 'active' && (
                        <button className="p-1 text-positive hover:opacity-70" onClick={() => openPayment(n)} title="Log a payment on this note">
                          <Banknote className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openAmortization(n)} title="Projected amortization schedule">
                        <CalendarRange className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => openNote(n)} title="Edit note"><Pencil className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove note"
                        onClick={() => { if (confirm('Remove this note?')) deleteNote.mutate(n.id, { onSuccess: () => toast.success('Note removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {!notesLoading && !(notes as any[]).length && (
                  <div className="py-10 text-center text-xs text-muted-foreground">No notes yet — record intercompany loans and bank debt to track exposure and interest.</div>
                )}
              </div>
            </div>

            {(payments as any[]).length > 0 && (
              <>
                <div className="heh-k mt-4 mb-2">Recent Note Payments</div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {(payments as any[]).slice(0, 8).map(p => {
                    const note = (notes as any[]).find(n => n.id === p.note_id);
                    return (
                      <div key={p.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{note?.counterparty_name ?? 'Note payment'}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {fmtDate(p.payment_date)} · principal {fmtUSD(num(p.principal_portion))} · interest {fmtUSD(num(p.interest_portion))}
                          </div>
                        </div>
                        <span className="font-mono-tab font-bold whitespace-nowrap">{fmtUSD(num(p.amount))}</span>
                        <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove payment (restores balance, voids interest entry)"
                          onClick={() => { if (confirm('Remove this payment? The note balance will be restored and any interest ledger entry voided.')) deletePayment.mutate(p.id, { onSuccess: () => toast.success('Payment removed') }); }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Capital activity ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="heh-k">Owner & Intercompany Capital</div>
                <h2 className="text-base font-bold mt-0.5">Capital Activity</h2>
              </div>
              <button className="heh-action" onClick={() => { setActivityForm({ ...BLANK_ACTIVITY }); setActivityDialog(true); }}>
                <Plus className="w-3 h-3" /> Log Activity
              </button>
            </div>
            {pendingApprovals.length > 0 && (
              <div className="mb-3 border border-warning/40 bg-warning/5 p-2.5">
                <div className="heh-k mb-1.5" style={{ color: '#d97706' }}>Pending Approval ({pendingApprovals.length})</div>
                <div className="space-y-1.5">
                  {pendingApprovals.map(a => {
                    const meta = ACTIVITY_TYPES[a.activity_type] ?? ACTIVITY_TYPES.distribution;
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-bold">{meta.label}</span>
                          {a.related_entity_id ? <span className="text-muted-foreground"> → {entityName(a.related_entity_id)}</span> : null}
                          <span className="font-mono-tab font-bold ml-1.5">{fmtUSD(num(a.amount))}</span>
                          {a.memo ? <span className="text-muted-foreground"> · {a.memo}</span> : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="heh-action !text-positive" onClick={() => decideApproval(a, 'approved')}>Approve</button>
                          <button className="heh-action !text-destructive" onClick={() => decideApproval(a, 'rejected')}>Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {(activity as any[]).filter(a => a.approval_status !== 'pending').map(a => {
                const meta = ACTIVITY_TYPES[a.activity_type] ?? ACTIVITY_TYPES.distribution;
                return (
                  <div key={a.id} className="border border-border px-2.5 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: meta.color + '16', color: meta.color }}>
                          {meta.label}
                        </span>
                        {a.related_entity_id && (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">→ {entityName(a.related_entity_id)}</span>
                        )}
                        {a.approval_status === 'rejected' && (
                          <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 bg-destructive/10 text-destructive">Rejected</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">{fmtDate(a.activity_date)}{a.memo ? ` · ${a.memo}` : ''}</div>
                    </div>
                    <div className={`font-mono-tab font-bold whitespace-nowrap ${meta.sign > 0 ? 'text-positive' : 'text-destructive'}`}>
                      {meta.sign > 0 ? '+' : '−'}{fmtUSD(num(a.amount))}
                    </div>
                    <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Remove entry"
                      onClick={() => { if (confirm('Remove this capital entry?')) deleteActivity.mutate(a.id, { onSuccess: () => toast.success('Entry removed') }); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {!activityLoading && !(activity as any[]).length && (
                <div className="text-xs text-muted-foreground border border-border p-3">
                  No capital activity yet — log contributions, distributions, dividends, management fees, and tax reserves for board-ready records.
                </div>
              )}
            </div>
          </section>

          {/* ── Reporting note ── */}
          <section className="heh-panel p-3 sm:p-4">
            <div className="heh-k mb-2">Board Reporting</div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: HEH_BLUE }} />
              <span>
                Corporate overhead runs through <Link to="/expenses" className="font-bold" style={{ color: HEH_BLUE }}>Corporate Expenses</Link> and
                interest/fee income through <Link to="/income" className="font-bold" style={{ color: HEH_BLUE }}>Inflows</Link> for this entity.
                The <Link to="/charts" className="font-bold" style={{ color: HEH_BLUE }}>Charts</Link> screen provides period analytics, and the entity
                switcher gives each subsidiary's full dashboard for drill-down.
              </span>
            </div>
          </section>
        </div>
      </div>

      {selectedEntity && (
        <>
          <div className="heh-drawer-backdrop" onClick={() => setSelectedEntity(null)} />
          <aside className="heh-drawer">
            <div className="p-4 border-b border-border flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="heh-k">Entity Micro-Ledger</div>
                <h2 className="text-lg font-black truncate mt-1">{selectedEntity.name}</h2>
                <div className="text-xs text-muted-foreground mt-1">{selectedEntity.category}</div>
              </div>
              <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => setSelectedEntity(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Gross Income" value={fmtUSD(selectedEntity.income)} sub="Entity inflow" icon={TrendingUp} color={selectedEntity.color} />
                <Metric label="Outflow" value={fmtUSD(selectedEntity.outflow)} sub="Expenses + cleared checks" icon={ArrowLeftRight} color="#dc2626" />
                <Metric label="Net Position" value={fmtUSD(selectedEntity.net)} sub="Management basis" icon={Landmark} color={selectedEntity.net >= 0 ? '#059669' : '#dc2626'} />
                <Metric label="Margin / ROI" value={`${selectedEntity.margin.toFixed(1)}%`} sub={`${selectedEntity.roi.toFixed(1)}% ROI`} icon={Target} color="#7c3aed" />
              </div>
              <div className="heh-panel p-3">
                <div className="heh-k mb-2">Recommended Drill-Down</div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2"><Workflow className="w-3.5 h-3.5 mt-0.5" style={{ color: selectedEntity.color }} /> Use the entity switcher for the full operating dashboard, or stay here for consolidated ledger/check/inflow/expense review.</div>
                  <div className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 mt-0.5" style={{ color: selectedEntity.color }} /> Holdings rows in shared finance pages are labeled by entity for clean board review.</div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!mitigationTarget} onOpenChange={open => { if (!open) setMitigationTarget(null); }}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader><DialogTitle className="text-base">Quick Mitigation Model</DialogTitle></DialogHeader>
          {mitigationTarget && (
            <div className="space-y-3">
              <div className="border border-destructive/30 bg-destructive/5 p-3">
                <div className="heh-k text-destructive mb-1">Covenant at Risk</div>
                <div className="font-bold">{mitigationTarget.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Exposure {fmtUSD(mitigationTarget.exposure)} · review {mitigationTarget.days > 998 ? 'not scheduled' : `${mitigationTarget.days} days`}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="heh-card p-3"><div className="heh-k">Modeled Injection</div><div className="heh-v">{fmtUSD(mitigationTarget.simulatedContribution)}</div><div className="heh-sub">{mitigationTarget.action}</div></div>
                <div className="heh-card p-3"><div className="heh-k">Post-Action DSCR</div><div className="heh-v text-positive">{mitigationTarget.simulatedDscr}</div><div className="heh-sub">Target minimum 1.25x</div></div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                This is a planning model, not an accounting entry. Use Log Capital or New Note to record the actual approved transaction; the action will draft a governance packet in the changelog.
              </div>
              <button
                className="heh-primary w-full"
                onClick={() => {
                  setActivityForm({
                    ...BLANK_ACTIVITY,
                    activity_type: 'capital_contribution',
                    related_entity_id: mitigationTarget.note?.counterparty_entity_id || '',
                    amount: String(mitigationTarget.simulatedContribution),
                    memo: `Mitigation model for ${mitigationTarget.name}: restore DSCR above 1.25x`,
                    approval_status: 'pending',
                  });
                  setMitigationTarget(null);
                  setActivityDialog(true);
                }}
              >
                Draft Capital Call For Approval
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rebalanceOpen} onOpenChange={setRebalanceOpen}>
        <DialogContent className="max-w-lg rounded-none">
          <DialogHeader><DialogTitle className="text-base">Capital Rebalancing Simulation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="heh-card p-3"><div className="heh-k">Warning Months</div><div className="heh-v text-destructive">{runway.warnings.length}</div><div className="heh-sub">Debt exceeds coverage</div></div>
              <div className="heh-card p-3"><div className="heh-k">Coverage Gap</div><div className="heh-v">{fmtUSD(runway.warnings.reduce((s, m) => s + Math.max(0, m.outflow - m.inflow), 0))}</div><div className="heh-sub">Modeled shortfall</div></div>
              <div className="heh-card p-3"><div className="heh-k">Reserve Ask</div><div className="heh-v text-warning">{fmtUSD(Math.max(0, runway.warnings.reduce((s, m) => s + Math.max(0, m.outflow - m.inflow), 0) * 1.15))}</div><div className="heh-sub">15% buffer</div></div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              The model compares scheduled receivable/payable note activity plus estimated operating-entity distribution coverage. Use it to draft a capital call, reserve transfer, or intercompany note adjustment for owner review.
            </div>
            <button
              className="heh-primary w-full"
              onClick={() => {
                const reserve = Math.max(0, runway.warnings.reduce((s, m) => s + Math.max(0, m.outflow - m.inflow), 0) * 1.15);
                setActivityForm({
                  ...BLANK_ACTIVITY,
                  activity_type: 'capital_contribution',
                  amount: String(Math.round(reserve)),
                  memo: 'Liquidity runway rebalancing reserve drafted from Holdings HQ simulation',
                  approval_status: 'pending',
                });
                setRebalanceOpen(false);
                setActivityDialog(true);
              }}
            >
              Draft Rebalancing Capital Call
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Note dialog ── */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{noteForm.id ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="heh-k mb-1">Direction</div>
              <Select value={noteForm.direction} onValueChange={v => setNoteForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">Receivable — we hold the note</SelectItem>
                  <SelectItem value="payable">Payable — we owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Type</div>
              <Select value={noteForm.note_type} onValueChange={v => setNoteForm(f => ({ ...f, note_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Counterparty *</div>
              <Input className="heh-field" placeholder="Bank, lender, or entity name" value={noteForm.counterparty_name} onChange={e => setNoteForm(f => ({ ...f, counterparty_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Related HOU Entity (if intercompany)</div>
              <Select value={noteForm.counterparty_entity_id || '__none__'} onValueChange={v => setNoteForm(f => ({ ...f, counterparty_entity_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="External counterparty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">External counterparty</SelectItem>
                  {ENTITIES.filter(e => e.id !== 'houston-enterprise-holdings').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Principal</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={noteForm.principal} onChange={e => setNoteForm(f => ({ ...f, principal: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Outstanding Balance</div>
              <Input className="heh-field" type="number" inputMode="decimal" placeholder="Defaults to principal" value={noteForm.outstanding_balance} onChange={e => setNoteForm(f => ({ ...f, outstanding_balance: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Interest Rate % (APR)</div>
              <Input className="heh-field" type="number" inputMode="decimal" step="0.01" value={noteForm.interest_rate} onChange={e => setNoteForm(f => ({ ...f, interest_rate: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Status</div>
              <Select value={noteForm.status} onValueChange={v => setNoteForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid_off">Paid Off</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Payment Amount</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={noteForm.payment_amount} onChange={e => setNoteForm(f => ({ ...f, payment_amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Frequency</div>
              <Select value={noteForm.payment_frequency} onValueChange={v => setNoteForm(f => ({ ...f, payment_frequency: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="interest_only">Interest Only</SelectItem>
                  <SelectItem value="balloon">Balloon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Origination</div>
              <Input className="heh-field" type="date" value={noteForm.origination_date} onChange={e => setNoteForm(f => ({ ...f, origination_date: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Maturity</div>
              <Input className="heh-field" type="date" value={noteForm.maturity_date} onChange={e => setNoteForm(f => ({ ...f, maturity_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Collateral</div>
              <Input className="heh-field" value={noteForm.collateral} onChange={e => setNoteForm(f => ({ ...f, collateral: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={noteForm.notes} onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveNote} disabled={upsertNote.isPending}>
            {noteForm.id ? 'Save Note' : 'Record Note'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Capital activity dialog ── */}
      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader><DialogTitle className="text-base">Log Capital Activity</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="heh-k mb-1">Type</div>
              <Select value={activityForm.activity_type} onValueChange={v => setActivityForm(f => ({ ...f, activity_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPES).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Related Entity</div>
              <Select value={activityForm.related_entity_id || '__none__'} onValueChange={v => setActivityForm(f => ({ ...f, related_entity_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="None / external" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None / external</SelectItem>
                  {ENTITIES.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Amount *</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={activityForm.amount} onChange={e => setActivityForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Date</div>
              <Input className="heh-field" type="date" value={activityForm.activity_date} onChange={e => setActivityForm(f => ({ ...f, activity_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Approval</div>
              <Select value={activityForm.approval_status} onValueChange={v => setActivityForm(f => ({ ...f, approval_status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved — post immediately</SelectItem>
                  <SelectItem value="pending">Pending — route for approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Memo</div>
              <Input className="heh-field" placeholder="e.g. Q3 distribution to owners" value={activityForm.memo} onChange={e => setActivityForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveActivity} disabled={upsertActivity.isPending}>
            Log Activity
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Note payment dialog ── */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base">
              Log Payment{paymentNote ? ` — ${paymentNote.counterparty_name}` : ''}
            </DialogTitle>
          </DialogHeader>
          {paymentNote && (
            <div className="text-[10px] text-muted-foreground -mt-1 mb-1">
              {paymentNote.direction === 'receivable' ? 'Receivable — payment coming in' : 'Payable — payment going out'} ·
              balance {fmtUSD(num(paymentNote.outstanding_balance))} at {num(paymentNote.interest_rate).toFixed(2)}%
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="heh-k mb-1">Payment Date</div>
              <Input className="heh-field" type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Total Amount *</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Principal Portion</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.principal_portion} onChange={e => setPaymentForm(f => ({ ...f, principal_portion: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Interest Portion</div>
              <Input className="heh-field" type="number" inputMode="decimal" value={paymentForm.interest_portion} onChange={e => setPaymentForm(f => ({ ...f, interest_portion: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Memo</div>
              <Input className="heh-field" placeholder="e.g. July installment" value={paymentForm.memo} onChange={e => setPaymentForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
            <div className="col-span-2 text-[10px] text-muted-foreground leading-relaxed">
              The principal portion reduces the note's outstanding balance automatically. The interest portion posts to the
              ledger as {paymentNote?.direction === 'receivable' ? 'Interest Income' : 'Interest Expense'} — principal
              movement is a balance-sheet event and is intentionally not booked as income or expense.
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={savePayment} disabled={upsertPayment.isPending}>
            Log Payment
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Amortization schedule dialog ── */}
      <Dialog open={!!amortNote} onOpenChange={open => { if (!open) setAmortNote(null); }}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Amortization — {amortNote?.counterparty_name}</DialogTitle>
          </DialogHeader>
          {amortNote && (
            <div className="text-[10px] text-muted-foreground -mt-1 mb-1">
              {fmtUSD(num(amortNote.outstanding_balance))} at {num(amortNote.interest_rate).toFixed(2)}% ·
              {' '}{String(amortNote.payment_frequency).replace('_', ' ')}
              {amortNote.maturity_date ? ` · matures ${fmtDate(amortNote.maturity_date)}` : ''}
            </div>
          )}
          {amortLoading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Projecting schedule…
            </div>
          ) : amortRows.length ? (
            <div className="overflow-x-auto border border-border">
              <div className="min-w-[440px]">
                <div className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1.5 bg-secondary/45 heh-k">
                  <div>#</div><div>Due</div><div>Payment</div><div>Interest</div><div>Principal</div><div>Balance</div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {amortRows.map((r: any) => (
                    <div key={r.period} className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1 border-t border-border/60 text-[10.5px] font-mono-tab">
                      <div className="text-muted-foreground">{r.period}</div>
                      <div>{fmtDate(r.due_date)}</div>
                      <div>{fmtUSD(num(r.payment))}</div>
                      <div className="text-warning">{fmtUSD(num(r.interest))}</div>
                      <div className="text-positive">{fmtUSD(num(r.principal))}</div>
                      <div className="font-bold">{fmtUSD(num(r.ending_balance))}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[.4fr_.9fr_.9fr_.9fr_.9fr_1fr] gap-2 px-2.5 py-1.5 bg-secondary/30 border-t border-border text-[10.5px] font-mono-tab font-bold">
                  <div /><div>Total</div>
                  <div>{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.payment), 0))}</div>
                  <div className="text-warning">{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.interest), 0))}</div>
                  <div className="text-positive">{fmtUSD(amortRows.reduce((s: number, r: any) => s + num(r.principal), 0))}</div>
                  <div />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground border border-border p-4">
              No schedule could be projected — set a payment amount (or a maturity date for a derived level payment) on this note.
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[9px] text-muted-foreground flex-1">
              Projection from the current balance, APR, and payment terms. Logged payments (principal/interest split) remain the source of truth for the actual balance.
            </div>
            {amortRows.length > 0 && (
              <button className="heh-action shrink-0" onClick={exportAmortizationCsv}>
                <Download className="w-3 h-3" /> CSV
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Covenant dialog ── */}
      <Dialog open={covenantDialog} onOpenChange={setCovenantDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{covenantForm.id ? 'Edit Covenant' : 'Add Covenant'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="heh-k mb-1">Name *</div>
              <Input className="heh-field" placeholder="e.g. Minimum DSCR 1.25x" value={covenantForm.name} onChange={e => setCovenantForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Type</div>
              <Select value={covenantForm.covenant_type} onValueChange={v => setCovenantForm(f => ({ ...f, covenant_type: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['financial', 'reporting', 'insurance', 'operational', 'other'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="heh-k mb-1">Status</div>
              <Select value={covenantForm.status} onValueChange={v => setCovenantForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="heh-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['compliant', 'warning', 'breached', 'waived'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Linked Note</div>
              <Select value={covenantForm.note_id || '__none__'} onValueChange={v => setCovenantForm(f => ({ ...f, note_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="heh-field"><SelectValue placeholder="Standalone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standalone</SelectItem>
                  {(notes as any[]).map(n => <SelectItem key={n.id} value={n.id}>{n.counterparty_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Requirement</div>
              <Input className="heh-field" placeholder="What the lender requires" value={covenantForm.requirement} onChange={e => setCovenantForm(f => ({ ...f, requirement: e.target.value }))} />
            </div>
            <div>
              <div className="heh-k mb-1">Next Review</div>
              <Input className="heh-field" type="date" value={covenantForm.next_review_date} onChange={e => setCovenantForm(f => ({ ...f, next_review_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="heh-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={covenantForm.notes} onChange={e => setCovenantForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="heh-primary w-full mt-2" onClick={saveCovenant} disabled={upsertCovenant.isPending}>
            {covenantForm.id ? 'Save Covenant' : 'Add Covenant'}
          </button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
