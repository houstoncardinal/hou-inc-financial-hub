import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useChecks, useLedgerPage, useProjects, useTransactions, useUpsert, useDelete, useQuickCreate, useVendors } from '@/hooks/useFinance';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fmtDate, fmtUSD } from '@/lib/format';
import { generateLedgerReport, generateLedgerRecordReport, savePDF, downloadLedgerExcel } from '@/lib/reports';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { buildFinanceBuckets, FinanceRangePicker, financeRangeLabel, isInFinanceRange, parseFinanceDate } from '@/lib/financeTime';
import {
  FileText, Table2, Trash2, CheckSquare,
  Search, SlidersHorizontal, ArrowDownToLine, ArrowUpFromLine,
  Activity, Eye, ChevronRight, CircleDollarSign,
  AlertTriangle, Receipt, Layers, X, Copy as CopyIcon, PencilLine,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import {
  AreaChart, Area, BarChart, Bar, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';

const EXPENSE_CATEGORIES = [
  'Materials & Supplies', 'Labor & Subcontractors', 'Permits & Fees',
  'Equipment Rental', 'Transportation & Freight', 'Office & Admin',
  'Insurance', 'Utilities', 'Marketing & Advertising',
  'Professional Services', 'Travel & Meals', 'Software & Subscriptions',
  'Maintenance & Repairs', 'Taxes & Licenses', 'Miscellaneous',
];

const INCOME_CATEGORIES = [
  'Client Payment', 'Retainer', 'Project Milestone', 'Consulting Fee',
  'Reimbursement', 'Interest Income', 'Grant', 'Investment', 'Refund', 'Other Income',
];

const COST_PHASES = [
  'Phase 1: Site Prep & Demo', 'Phase 2: Foundation & Concrete', 'Phase 3: Framing & Structure',
  'Phase 4: Rough-Ins (MEP)', 'Phase 5: Exterior & Roofing', 'Phase 6: Insulation & Drywall',
  'Phase 7: Finishes & Fixtures', 'Phase 8: Landscaping & Final', 'General / Overhead',
];

const INCOME_METHODS  = [{ v:'check',label:'Check' },{ v:'ach_wire',label:'ACH / Wire' },{ v:'credit_card',label:'Credit Card' },{ v:'financing_draw',label:'Financing Draw' },{ v:'cash',label:'Cash' },{ v:'other',label:'Other' }];
const EXPENSE_METHODS = [{ v:'check',label:'Check' },{ v:'credit_card',label:'Credit Card' },{ v:'ach',label:'ACH' },{ v:'net_30',label:'NET 30' },{ v:'net_60',label:'NET 60' },{ v:'net_90',label:'NET 90' },{ v:'cash',label:'Cash' },{ v:'wire',label:'Wire' },{ v:'other',label:'Other' }];
const REF_METHODS = new Set(['check','ach_wire','ach','wire']);
const PAGE_SIZE_OPTIONS = [7, 10, 15, 25, 50] as const;
type LedgerQueueKey = 'all' | 'needs_review' | 'missing_receipts' | 'uncategorized' | 'duplicates' | 'pending_approval' | 'large_transactions' | 'imported_today' | 'open_checks';

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-start my-5">
      {labels.map((label, i) => (
        <div key={i} className={`flex items-start ${i < labels.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold border-2 transition-all
              ${i + 1 < current ? 'bg-foreground border-foreground text-background' :
                i + 1 === current ? 'border-foreground text-foreground bg-transparent' :
                'border-border text-muted-foreground bg-transparent'}`}>
              {i + 1 < current ? '✓' : i + 1}
            </div>
            <span className={`text-[9px] uppercase tracking-[0.1em] font-medium text-center leading-tight max-w-[52px]
              ${i + 1 === current ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-px mx-2 mt-3.5 transition-colors ${current > i + 1 ? 'bg-foreground/40' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FormNav({ step, total, onBack, onNext, submitLabel, isPending }: {
  step: number; total: number; onBack: () => void; onNext: () => void; submitLabel: string; isPending?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-5 mt-5 border-t border-border">
      {step > 1 ? (
        <Button type="button" variant="outline" className="rounded-none h-10 flex-1" onClick={onBack}>← Back</Button>
      ) : <div className="flex-1" />}
      {step < total ? (
        <Button type="button" className="rounded-none h-10 flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={onNext}>Next →</Button>
      ) : (
        <Button type="submit" className="rounded-none h-10 flex-1 bg-foreground text-background hover:bg-foreground/90" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      )}
    </div>
  );
}

const LDG_CSS = `
.ldg-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.22),transparent 170px);}
.ldg-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.ldg-panel:hover{box-shadow:0 5px 20px rgba(10,10,10,0.07),0 2px 5px rgba(10,10,10,0.04);}
.ldg-stat{background:hsl(var(--background))!important;transition:box-shadow 0.18s,transform 0.18s,border-color 0.18s;box-shadow:0 1px 3px rgba(10,10,10,0.05);position:relative;overflow:visible;}
.ldg-stat:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(157,126,63,0.075),transparent 46%);pointer-events:none;}
.ldg-stat:hover{box-shadow:0 6px 20px rgba(10,10,10,0.08);transform:translateY(-1px);border-color:hsl(var(--foreground)/0.18);z-index:30;}
.ldg-row{transition:background-color 0.16s,box-shadow 0.16s;}
.ldg-row:hover{background-color:hsl(var(--secondary)/0.45)!important;box-shadow:inset 2px 0 0 rgba(90,90,90,0.22);}
.ldg-badge{border-radius:0!important;padding:2px 7px!important;font-weight:800!important;letter-spacing:.15em!important;}
.ldg-type-check,.ldg-type-income,.ldg-type-expense{background:hsl(var(--secondary)/0.42)!important;border-color:hsl(var(--border))!important;color:hsl(var(--foreground)/0.74)!important;}
.ldg-action{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 0 rgba(255,255,255,0.45) inset,0 1px 3px rgba(10,10,10,0.035);transition:background 0.16s,border-color 0.16s,transform 0.16s,box-shadow 0.16s;}
.ldg-action:hover{background:hsl(var(--secondary)/0.56);border-color:hsl(var(--foreground)/0.22);transform:translateY(-1px);box-shadow:0 6px 18px rgba(10,10,10,0.075),0 1px 0 rgba(255,255,255,0.45) inset;}
.ldg-export{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 0 rgba(255,255,255,0.45) inset,0 1px 3px rgba(10,10,10,0.04);transition:background 0.16s,border-color 0.16s,transform 0.16s,box-shadow 0.16s;}
.ldg-export:hover{background:hsl(var(--secondary)/0.62);border-color:hsl(var(--foreground)/0.24);transform:translateY(-1px);box-shadow:0 6px 18px rgba(10,10,10,0.08),0 1px 0 rgba(255,255,255,0.45) inset;}
.ldg-recon-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;position:relative;overflow:hidden;}
.ldg-recon-panel:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#10b981,#34d399,#9D7E3F);}
.ldg-recon-panel:after{content:"";position:absolute;inset:3px 0 auto 0;height:42px;background:linear-gradient(180deg,rgba(16,185,129,0.07),transparent);pointer-events:none;}
.ldg-recon-ring{width:54px;height:54px;border:1px solid hsl(var(--border));background:conic-gradient(#10b981 var(--recon-pct),hsl(var(--secondary)) 0);display:grid;place-items:center;position:relative;box-shadow:0 1px 3px rgba(10,10,10,.06) inset;}
.ldg-recon-ring:before{content:"";position:absolute;inset:6px;background:hsl(var(--background));border:1px solid hsl(var(--border));}
.ldg-recon-ring span{position:relative;font-size:12px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.ldg-recon-metric{border:1px solid hsl(var(--border));background:hsl(var(--background)/.72);padding:7px 8px;min-width:0;}
.ldg-recon-metric .k{font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;color:hsl(var(--foreground)/.45);font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ldg-recon-metric .v{font-size:13px;font-weight:900;line-height:1.05;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ldg-recon-action{height:34px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:8px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:background .16s,border-color .16s,transform .16s,color .16s;}
.ldg-recon-action:hover{background:hsl(var(--secondary)/.54);border-color:hsl(var(--foreground)/.22);transform:translateY(-1px);}
.ldg-recon-action.primary{background:hsl(var(--foreground));color:hsl(var(--background));border-color:hsl(var(--foreground));}
.ldg-recon-action.positive{border-color:rgba(16,185,129,.35);color:#059669;background:rgba(16,185,129,.08);}
.ldg-recon-action.warning{border-color:rgba(245,158,11,.38);color:#b45309;background:rgba(245,158,11,.08);}
.ldg-live-dot{width:7px;height:7px;border-radius:999px;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.13);}
.ldg-recon-row-action{height:30px;min-width:30px;border:1px solid hsl(var(--border));background:hsl(var(--background));display:inline-flex;align-items:center;justify-content:center;color:hsl(var(--foreground)/.58);transition:background .16s,border-color .16s,color .16s;}
.ldg-recon-row-action:hover{background:hsl(var(--secondary)/.55);border-color:hsl(var(--foreground)/.22);color:hsl(var(--foreground));}
.ldg-op-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.045);transition:background .16s,border-color .16s,box-shadow .16s;}
.ldg-op-card:hover{background:hsl(var(--secondary)/0.22);border-color:hsl(var(--foreground)/0.18);box-shadow:0 4px 14px rgba(10,10,10,0.06);}
.ldg-op-card.active{background:hsl(var(--secondary)/0.45);border-color:hsl(var(--foreground)/0.26);box-shadow:inset 0 0 0 1px hsl(var(--foreground)/0.08),0 4px 14px rgba(10,10,10,0.07);}
.ldg-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;}
.ldg-inspector{background:#fff;border-left:1px solid #d8d8d8;box-shadow:-18px 0 54px rgba(10,10,10,0.16);position:fixed;right:0;top:0;bottom:0;width:min(440px,calc(100vw - 24px));z-index:60;color:#111;overflow:hidden;}
.ldg-inspector-body{padding:12px;display:grid;gap:9px;max-height:calc(100vh - 132px);overflow-y:auto;}
.ldg-inspector-section{border:1px solid #e4e4e4;background:#fff;padding:10px;}
.ldg-inspector-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;}
.ldg-inspector-kv{min-width:0;border-bottom:1px solid #efefef;padding-bottom:4px;}
.ldg-inspector-kv dt{font-size:8px;line-height:1.1;text-transform:uppercase;letter-spacing:.14em;color:#777;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ldg-inspector-kv dd{font-size:12px;line-height:1.28;color:#141414;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;}
.ldg-table-head{position:sticky;top:0;z-index:10;}
.ldg-status-badge{border:1px solid hsl(var(--border));background:hsl(var(--secondary)/0.36);color:hsl(var(--foreground)/0.72);}
.ldg-record-card{border:1px solid #e2e2e2;background:#fff;box-shadow:0 1px 3px rgba(10,10,10,0.04);}
.ldg-record-band{background:linear-gradient(180deg,#fff,#fafafa);color:#111;border-bottom:1px solid #dedede;position:relative;}
.ldg-record-band:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:#9D7E3F;}
.ldg-record-modal{background:#fff;color:#111;}
.ldg-record-summary{border:1px solid #dedede;background:#fafafa;padding:9px 10px;min-width:0;}
.ldg-record-row{display:grid;grid-template-columns:minmax(86px,.75fr) minmax(0,1fr);gap:10px;align-items:start;border-bottom:1px solid #ededed;padding:7px 0;}
.ldg-record-row:last-child{border-bottom:0;}
.ldg-record-label{font-size:7px;line-height:1.2;text-transform:uppercase;letter-spacing:.18em;color:#777;font-weight:800;}
.ldg-record-value{font-size:11px;line-height:1.35;color:#151515;font-weight:650;min-width:0;overflow-wrap:anywhere;}
.ldg-record-note{border:1px solid #e3e3e3;background:#fafafa;color:#242424;padding:10px 12px;font-size:11px;line-height:1.55;}
.ldg-page-btn{height:34px;min-width:34px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:10px;font-weight:800;letter-spacing:.08em;transition:background .16s,border-color .16s,color .16s;}
.ldg-page-btn:hover:not(:disabled){background:hsl(var(--secondary)/0.6);border-color:hsl(var(--foreground)/0.22);}
.ldg-page-btn:disabled{opacity:.38;cursor:not-allowed;}
.ldg-mobile-sheet{border-radius:18px 18px 0 0;}
.ldg-mobile-chip{border:1px solid #e0e0e0;background:#fafafa;padding:7px 8px;min-width:0;}
.ldg-mobile-chip-label{font-size:7px;text-transform:uppercase;letter-spacing:.16em;color:#777;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ldg-mobile-chip-value{font-size:11px;color:#111;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.ldg-correction-modal{background:#fff;color:#111;}
.ldg-correction-header{background:linear-gradient(180deg,#fff,#fafafa);border-bottom:1px solid #dedede;position:relative;}
.ldg-correction-header:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:#9D7E3F;}
.ldg-correction-section{border:1px solid #e2e2e2;background:#fff;padding:12px;box-shadow:0 1px 3px rgba(10,10,10,0.035);}
.ldg-correction-title{font-size:8px;text-transform:uppercase;letter-spacing:.22em;color:#9D7E3F;font-weight:900;margin-bottom:10px;}
.dark .ldg-panel,.dark .ldg-stat,.dark .ldg-action{background:hsl(var(--card))!important;box-shadow:0 1px 4px rgba(0,0,0,0.28);}
.dark .ldg-export{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
.dark .ldg-recon-panel{background:hsl(var(--card));}
.dark .ldg-record-card{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,0.10),0 1px 0 rgba(255,255,255,0.6) inset;}
.dark .ldg-stat:hover{background:hsl(var(--secondary))!important;box-shadow:0 4px 22px rgba(0,0,0,0.25);}
.dark .ldg-row:hover{background-color:hsl(var(--accent) / 0.07)!important;}
@media(max-width:767px){
  .ldg-recon-ring{width:44px;height:44px;}
  .ldg-recon-panel>.grid{gap:7px;}
  .ldg-recon-metric{padding:5px 7px;}
  .ldg-recon-metric .v{font-size:12px;}
  .ldg-recon-ring:before{inset:6px;}
  .ldg-recon-ring span{font-size:11px;}
  .ldg-recon-action{height:32px;font-size:7.5px;}
}
`;

function LedgerMiniTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 border border-border px-2.5 py-1.5 text-[10px] shadow-md">
      <div className="text-foreground/55 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 font-mono-tab">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-semibold">{p.name}: {fmtUSD(Number(p.value || 0))}</span>
        </div>
      ))}
    </div>
  );
}

function LedgerSparkline({
  data, dataKey, color, gradientId,
}: { data: any[]; dataKey: string; color: string; gradientId: string }) {
  return (
    <div className="h-10 sm:h-11 mt-1.5 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <RechartsTooltip content={<LedgerMiniTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }} cursor={{ stroke: 'var(--border)', strokeDasharray: '2 2' }} />
          <Area type="monotone" dataKey={dataKey} name={dataKey} stroke={color} fill={`url(#${gradientId})`} strokeWidth={1.8} dot={false} activeDot={{ r: 3, fill: color, stroke: 'var(--background)', strokeWidth: 1.5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReconcileBars({ open, done }: { open: number; done: number }) {
  const data = [
    { label: 'Done', value: done, color: '#10b981' },
    { label: 'Open', value: open, color: '#f59e0b' },
  ];
  return (
    <div className="h-10 sm:h-11 mt-1.5 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <RechartsTooltip allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 80, pointerEvents: 'none' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-background/95 border border-border px-2.5 py-1.5 text-[10px] shadow-md">
                <div className="font-semibold">{d.label}: {d.value}</div>
              </div>
            );
          }} cursor={{ fill: 'var(--border)', fillOpacity: 0.12 }} />
          <Bar dataKey="value" radius={[1, 1, 0, 0]} maxBarSize={18}>
            {data.map((d) => <Cell key={d.label} fill={d.color} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LedgerMetric({
  label, value, detail, tone, icon: Icon, chart, accent,
}: { label: string; value: string; detail: string; tone: string; icon: ComponentType<any>; chart?: ReactNode; accent: string }) {
  return (
    <div className="ldg-stat border border-border p-2.5 sm:p-3 min-w-0 overflow-visible">
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: accent }} />
      <div className="relative flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-foreground/60 font-bold truncate">{label}</div>
          <div className={`text-[15px] sm:text-lg font-bold font-mono-tab mt-1 leading-tight truncate ${tone}`}>{value}</div>
          <div className="text-[9px] text-foreground/58 mt-1 font-mono-tab truncate">{detail}</div>
        </div>
        <div className="w-7 h-7 flex items-center justify-center border border-border bg-secondary/35 shrink-0">
          <Icon className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
      <div className="relative">{chart}</div>
    </div>
  );
}

function LedgerQuickAction({
  label, detail, icon: Icon, color, onClick,
}: { label: string; detail: string; icon: ComponentType<any>; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ldg-action group relative overflow-hidden flex items-center gap-2 p-2.5 text-left min-w-0">
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: color }} />
      <span className="w-8 h-8 flex items-center justify-center border border-border bg-secondary/35 shrink-0">
        <Icon className="w-4 h-4 transition-transform group-hover:scale-105" style={{ color }} strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold truncate">{label}</span>
        <span className="block text-[8px] text-foreground/55 font-mono-tab truncate mt-0.5">{detail}</span>
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-foreground/35 ml-auto shrink-0" strokeWidth={1.5} />
    </button>
  );
}

function ExportButton({
  label, detail, icon: Icon, color, onClick,
}: { label: string; detail: string; icon: ComponentType<any>; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ldg-export relative overflow-hidden flex items-center gap-2 px-3 h-10 text-left min-w-[126px]">
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: color }} />
      <span className="w-7 h-7 flex items-center justify-center border border-border bg-secondary/35 shrink-0">
        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.14em] font-bold leading-tight">{label}</span>
        <span className="block text-[8px] text-foreground/55 font-mono-tab truncate mt-0.5">{detail}</span>
      </span>
    </button>
  );
}

function OperationalMetric({
  label, value, detail, icon: Icon, tone = 'text-foreground', active, onClick,
}: { label: string; value: string; detail: string; icon: ComponentType<any>; tone?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`ldg-op-card p-2.5 min-w-0 w-full text-left ${active ? 'active' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] uppercase tracking-[0.18em] text-foreground/55 font-bold truncate">{label}</div>
          <div className={`text-base font-bold font-mono-tab leading-tight mt-1 ${tone}`}>{value}</div>
          <div className="text-[9px] text-foreground/48 mt-1 truncate">{detail}</div>
        </div>
        <div className="w-7 h-7 flex items-center justify-center border border-border bg-secondary/35 shrink-0">
          <Icon className="w-3.5 h-3.5 text-foreground/62" strokeWidth={1.55} />
        </div>
      </div>
    </button>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value?: ReactNode; tone?: string }) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  return (
    <div className="ldg-record-summary">
      <div className="text-[7px] uppercase tracking-[0.18em] text-[#777] font-bold mb-1 truncate">{label}</div>
      <div className={`text-[11px] sm:text-xs font-semibold truncate ${tone ?? 'text-[#151515]'}`}>{value}</div>
    </div>
  );
}

function RecordPair({ label, value, tone }: { label: string; value?: ReactNode; tone?: string }) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  return (
    <div className="ldg-record-row">
      <div className="ldg-record-label">{label}</div>
      <div className={`ldg-record-value ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

function RecordGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ldg-record-card p-3 sm:p-4 min-w-0">
      <div className="text-[8px] uppercase tracking-[0.24em] text-[#9D7E3F] font-bold mb-2.5">{title}</div>
      {children}
    </div>
  );
}

function LedgerDetailDialog({
  row, onClose, onToggleReconcile, onExport,
}: { row: any; onClose: () => void; onToggleReconcile: (r: any) => void; onExport: (r: any) => void }) {
  const raw = row?.raw ?? {};
  const isCredit = Number(row?.amount ?? 0) >= 0;
  const amountColor = isCredit ? 'text-positive' : 'text-destructive';
  const status = row?.reconciled ? 'Reconciled' : 'Open';
  const date = row?.date || raw.transaction_date || raw.issue_date;
  const displayAmount = `${isCredit ? '+' : '−'}${fmtUSD(Math.abs(Number(row?.amount || 0)))}`;
  const ref = row?.ref || raw.check_reference || raw.external_reference || raw.check_number;
  const method = raw.payment_method?.replace?.(/_/g, ' ') || raw.delivery_status?.replace?.(/_/g, ' ');
  const memo = raw.description || raw.notes || raw.memo || raw.internal_memo || raw.public_memo;
  const paymentIdentifierLabel = raw.payment_method === 'check' || row?.type === 'Check'
    ? 'Check Number'
    : raw.payment_method === 'ach' || raw.payment_method === 'ach_wire'
      ? 'ACH / Wire Confirmation'
      : raw.payment_method === 'wire'
        ? 'Wire Confirmation'
        : raw.payment_method === 'credit_card'
          ? 'Card / Processor Reference'
          : 'Payment Reference';
  const externalInvoiceUrl = raw.external_invoice_url || raw.stripe_payment_link || raw.invoice_url;
  const externalInvoiceProvider = raw.external_invoice_provider?.replace?.(/_/g, ' ') || (externalInvoiceUrl?.includes?.('stripe') ? 'Stripe' : externalInvoiceUrl?.includes?.('quickbooks') ? 'QuickBooks' : undefined);
  const invoiceLink = externalInvoiceUrl ? (
    <a href={externalInvoiceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#9D7E3F]">
      {externalInvoiceProvider ? `${externalInvoiceProvider} invoice` : 'Open invoice link'}
    </a>
  ) : raw.invoice_id ? (
    <a href={`/invoices/${raw.invoice_id}`} className="underline underline-offset-2 hover:text-[#9D7E3F]">
      Open linked invoice
    </a>
  ) : undefined;

  return (
    <Dialog open={!!row} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="ldg-record-modal rounded-none w-[calc(100%-0.75rem)] sm:max-w-4xl max-h-[calc(100vh-0.75rem)] overflow-hidden p-0 border-[#d9d9d9]">
        <div className="ldg-record-band px-3 sm:px-5 py-4">
          <DialogHeader>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-px w-8 bg-[#9D7E3F]" />
                  <div className="text-[8px] uppercase tracking-[0.3em] text-[#777] font-bold">Houston Enterprise Ledger Record</div>
                </div>
                <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight truncate text-[#111]">{row?.party || 'Ledger entry'}</DialogTitle>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`ldg-badge border ${row?.type==='Check'?'ldg-type-check':row?.type==='Income'?'ldg-type-income':'ldg-type-expense'}`}>{row?.type}</span>
                  <span className="text-[8px] uppercase tracking-[0.14em] font-bold px-2 py-1 border border-[#d8d8d8] bg-[#f8f8f8] text-[#444]">{status}</span>
                  <span className="text-[10px] font-mono-tab text-[#666]">{fmtDate(date)}</span>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] lg:block gap-3 items-end">
                <div className={`text-2xl sm:text-3xl font-bold font-mono-tab whitespace-nowrap ${isCredit ? 'text-[#12643a]' : 'text-[#8b1e1e]'}`}>
                  {displayAmount}
                </div>
                <button
                  onClick={() => onExport(row)}
                  className="mt-0 lg:mt-2 h-9 px-3 border border-[#cfcfcf] bg-[#111] text-white hover:bg-[#2a2a2a] text-[9px] uppercase tracking-[0.16em] font-bold transition-colors whitespace-nowrap"
                >
                  Export Record PDF
                </button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-3 sm:p-5 space-y-3 bg-white text-[#111] overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <SummaryTile label="Project" value={row?.project || raw.projects?.name || 'Unassigned'} />
            <SummaryTile label="Reference" value={ref} />
            <SummaryTile label="Entry Date" value={fmtDate(date)} />
            <SummaryTile label="Reconciliation" value={status} tone={row?.reconciled ? 'text-[#12643a]' : 'text-[#6f5b16]'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RecordGroup title="Financial Control">
              <RecordPair label="Signed Amount" value={<span className={isCredit ? 'text-[#12643a]' : 'text-[#8b1e1e]'}>{displayAmount}</span>} />
              <RecordPair label="Amount Before Tax" value={raw.amount_before_tax !== undefined ? fmtUSD(Number(raw.amount_before_tax)) : undefined} />
              <RecordPair label="Tax Amount" value={raw.tax_amount !== undefined ? fmtUSD(Number(raw.tax_amount)) : undefined} />
              <RecordPair label="Total Amount" value={raw.total_amount !== undefined ? fmtUSD(Number(raw.total_amount)) : fmtUSD(Math.abs(Number(row?.amount || 0)))} />
              <RecordPair label="Net Amount" value={raw.net_amount !== undefined ? fmtUSD(Number(raw.net_amount)) : undefined} />
              <RecordPair label="Currency" value={raw.currency || 'USD'} />
            </RecordGroup>

            <RecordGroup title="Workflow & Payment">
              <RecordPair label="Payment Method" value={method} />
              <RecordPair label={paymentIdentifierLabel} value={raw.check_reference || raw.external_reference || raw.check_number || ref} />
              <RecordPair label="External Reference" value={raw.external_reference} />
              <RecordPair label="Invoice Link" value={invoiceLink} />
              <RecordPair label="Invoice Number" value={raw.external_invoice_number || raw.invoice_number} />
              <RecordPair label="Payment Status" value={raw.payment_status?.replace?.(/_/g, ' ')} />
              <RecordPair label="Approval Status" value={raw.approval_status?.replace?.(/_/g, ' ')} />
              <RecordPair label="Record Status" value={raw.status || row?.status || status} />
              <RecordPair label="Posting Date" value={raw.posting_date ? fmtDate(raw.posting_date) : undefined} />
              <RecordPair label="Cleared Date" value={raw.cleared_date ? fmtDate(raw.cleared_date) : undefined} />
            </RecordGroup>
          </div>

          <RecordGroup title="Construction & Accounting Context">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <RecordPair label="Category" value={raw.category || row?.ref} />
              <RecordPair label="Cost Type" value={raw.cost_type?.replace?.(/_/g, ' ')} />
              <RecordPair label="Cost Phase" value={raw.cost_phase} />
              <RecordPair label="Due Date" value={raw.due_date ? fmtDate(raw.due_date) : undefined} />
              <RecordPair label="Accounting Period" value={raw.accounting_period} />
              <RecordPair label="Fiscal Year" value={raw.fiscal_year} />
              <RecordPair label="Attachment Count" value={raw.attachment_count} />
              <RecordPair label="Database ID" value={row?.id} />
            </div>
          </RecordGroup>

          {memo && (
            <RecordGroup title="Memo & Record Notes">
              <div className="ldg-record-note">{memo}</div>
            </RecordGroup>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => onToggleReconcile(row)}
              className="h-9 border border-[#d8d8d8] bg-[#f8f8f8] text-[#222] hover:bg-[#f0f0f0] text-[9px] uppercase tracking-[0.15em] font-bold transition-colors"
            >
              {row?.reconciled ? 'Mark As Open' : 'Mark Reconciled'}
            </button>
            <button
              onClick={() => onExport(row)}
              className="h-9 border border-[#111] bg-[#111] text-white hover:bg-[#2a2a2a] text-[9px] uppercase tracking-[0.15em] font-bold transition-colors"
            >
              Export PDF
            </button>
            <Button variant="outline" className="rounded-none h-9 text-[9px] uppercase tracking-[0.15em] font-bold border-[#d8d8d8] text-[#222] hover:bg-[#f5f5f5]" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LedgerInspector({
  row, onClose, onToggleReconcile, onExport, onExportExcel, onEdit,
}: { row: any; onClose: () => void; onToggleReconcile: (r: any) => void; onExport: (r: any) => void; onExportExcel: (r: any) => void; onEdit: (r: any) => void }) {
  if (!row) return null;

  const raw = row.raw ?? {};
  const isCredit = Number(row.amount ?? 0) >= 0;
  const amount = `${isCredit ? '+' : '-'}${fmtUSD(Math.abs(Number(row.amount || 0)))}`;
  const date = row.date || raw.transaction_date || raw.issue_date;
  const method = raw.payment_method?.replace?.(/_/g, ' ') || raw.delivery_status?.replace?.(/_/g, ' ') || '—';
  const ref = row.ref || raw.check_reference || raw.external_reference || raw.check_number || '—';
  const memo = raw.description || raw.notes || raw.memo || raw.internal_memo || raw.public_memo;
  const paymentIdentifierLabel = raw.payment_method === 'check' || row.type === 'Check'
    ? 'Check #'
    : raw.payment_method === 'ach' || raw.payment_method === 'ach_wire'
      ? 'ACH / Wire'
      : 'Payment Ref';
  const detailGroups = [
    {
      title: 'Record',
      items: [
        ['Project', row.project || raw.projects?.name || 'Unassigned'],
        ['Reference', ref],
        ['Date', date ? fmtDate(date) : '—'],
        ['Status', row.reconciled ? 'Reconciled' : (row.status || 'Open')],
        ['Type', row.type],
        ['Category', raw.category || 'Uncategorized'],
      ],
    },
    {
      title: 'Payment',
      items: [
        ['Method', method],
        [paymentIdentifierLabel, raw.check_reference || raw.external_reference || raw.check_number || ref],
        ['Payment', raw.payment_status?.replace?.(/_/g, ' ') || row.status],
        ['Approval', raw.approval_status?.replace?.(/_/g, ' ') || 'approved'],
        ['Posting', raw.posting_date ? fmtDate(raw.posting_date) : date ? fmtDate(date) : '—'],
        ['Cleared', raw.cleared_date ? fmtDate(raw.cleared_date) : row.reconciled ? 'Cleared' : 'Open'],
      ],
    },
    {
      title: 'Job Cost',
      items: [
        ['Cost Phase', raw.cost_phase],
        ['Cost Type', raw.cost_type?.replace?.(/_/g, ' ')],
        ['Budget Cat.', raw.budget_category],
        ['Cost Code', raw.cost_code_id],
        ['Invoice', raw.external_invoice_number || raw.invoice_number || raw.invoice_id],
        ['Attachments', raw.attachment_count],
      ],
    },
  ];

  return (
    <aside className="hidden xl:block ldg-inspector">
      <div className="px-4 py-3 border-b border-[#e4e4e4] bg-[#fafafa]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[8px] uppercase tracking-[0.24em] font-bold text-[#9D7E3F]">Transaction Inspector</div>
            <div className="text-sm font-bold text-[#111] truncate mt-1">{row.party || 'Ledger Entry'}</div>
            <div className="text-[9px] text-[#777] font-mono-tab mt-0.5">{row.type} · {date ? fmtDate(date) : '—'}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center border border-[#ddd] bg-white text-[#555] hover:text-[#111]">
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <div className={`text-2xl font-bold font-mono-tab mt-3 ${isCredit ? 'text-[#12643a]' : 'text-[#8b1e1e]'}`}>{amount}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="text-[8px] uppercase tracking-[0.14em] font-bold px-2 py-1 border border-[#ddd] bg-white text-[#555]">{row.type}</span>
          <span className={`text-[8px] uppercase tracking-[0.14em] font-bold px-2 py-1 border ${row.reconciled ? 'border-[#b9d8c6] bg-[#f0f8f3] text-[#12643a]' : 'border-[#e2d5a8] bg-[#fbf7e8] text-[#6f5b16]'}`}>{row.reconciled ? 'Reconciled' : 'Open'}</span>
        </div>
      </div>

      <div className="ldg-inspector-body">
        {detailGroups.map(group => (
          <section key={group.title} className="ldg-inspector-section">
            <div className="text-[7px] uppercase tracking-[0.22em] font-bold text-[#9D7E3F] mb-2">{group.title}</div>
            <div className="ldg-inspector-grid">
              {group.items.map(([label, value]) => value ? (
                <dl key={String(label)} className="ldg-inspector-kv">
                  <dt>{label}</dt>
                  <dd title={String(value)}>{value}</dd>
                </dl>
              ) : null)}
            </div>
          </section>
        ))}

        <section className="ldg-inspector-section">
          <div className="text-[7px] uppercase tracking-[0.22em] font-bold text-[#9D7E3F] mb-2">Memo</div>
          <p className="text-[10px] leading-snug text-[#333] line-clamp-3">{memo || 'No memo recorded for this ledger entry.'}</p>
        </section>

        <section className="ldg-inspector-section">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[7px] uppercase tracking-[0.16em] text-[#777] font-bold">Created</div>
              <div className="text-[10px] font-semibold text-[#111] mt-0.5">{raw.created_at ? fmtDate(raw.created_at) : 'Captured'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase tracking-[0.16em] text-[#777] font-bold">Updated</div>
              <div className="text-[10px] font-semibold text-[#111] mt-0.5">{raw.updated_at ? fmtDate(raw.updated_at) : 'No update'}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onEdit(row)} className="h-9 border border-[#d8d8d8] bg-[#fff] text-[#222] hover:bg-[#f0f0f0] text-[9px] uppercase tracking-[0.15em] font-bold">
            Edit
          </button>
          <button onClick={() => onToggleReconcile(row)} className="h-9 border border-[#d8d8d8] bg-[#f8f8f8] text-[#222] hover:bg-[#f0f0f0] text-[9px] uppercase tracking-[0.15em] font-bold">
            {row.reconciled ? 'Reopen' : 'Reconcile'}
          </button>
          <button onClick={() => onExport(row)} className="h-9 border border-[#111] bg-[#111] text-white hover:bg-[#2a2a2a] text-[9px] uppercase tracking-[0.15em] font-bold">
            Export PDF
          </button>
          <button onClick={() => onExportExcel(row)} className="h-9 border border-[#d8d8d8] bg-white text-[#222] hover:bg-[#f0f0f0] text-[9px] uppercase tracking-[0.15em] font-bold">
            Export XLS
          </button>
        </div>
      </div>
    </aside>
  );
}

function LedgerMobileSheet({
  row, onClose, onToggleReconcile, onExport, onExportExcel, onEdit,
}: { row: any; onClose: () => void; onToggleReconcile: (r: any) => void; onExport: (r: any) => void; onExportExcel: (r: any) => void; onEdit: (r: any) => void }) {
  if (!row) return null;

  const raw = row.raw ?? {};
  const isCredit = Number(row.amount ?? 0) >= 0;
  const date = row.date || raw.transaction_date || raw.issue_date;
  const method = raw.payment_method?.replace?.(/_/g, ' ') || raw.delivery_status?.replace?.(/_/g, ' ') || '—';
  const ref = row.ref || raw.check_reference || raw.external_reference || raw.check_number || '—';
  const memo = raw.description || raw.notes || raw.memo || raw.internal_memo || raw.public_memo;
  const paymentIdentifierLabel = raw.payment_method === 'check' || row.type === 'Check'
    ? 'Check #'
    : raw.payment_method === 'ach' || raw.payment_method === 'ach_wire'
      ? 'ACH / Wire'
      : 'Payment Ref';
  const detailGroups = [
    {
      title: 'Record',
      items: [
        ['Project', row.project || raw.projects?.name || 'Unassigned'],
        ['Reference', ref],
        ['Date', date ? fmtDate(date) : '—'],
        ['Status', row.reconciled ? 'Reconciled' : (row.status || 'Open')],
      ],
    },
    {
      title: 'Payment',
      items: [
        ['Method', method],
        [paymentIdentifierLabel, raw.check_reference || raw.external_reference || raw.check_number || ref],
        ['Payment', raw.payment_status?.replace?.(/_/g, ' ') || row.status || '—'],
        ['Approval', raw.approval_status?.replace?.(/_/g, ' ') || 'approved'],
      ],
    },
    {
      title: 'Job Cost',
      items: [
        ['Category', raw.category || 'Uncategorized'],
        ['Cost Phase', raw.cost_phase || '—'],
        ['Cost Type', raw.cost_type?.replace?.(/_/g, ' ') || '—'],
        ['Invoice', raw.external_invoice_number || raw.invoice_number || raw.invoice_id || '—'],
      ],
    },
  ];

  return (
    <div className="xl:hidden fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]" onClick={onClose}>
      <section
        className="ldg-mobile-sheet absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto bg-white text-[#111] border-t border-[#d9d9d9] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-[#e5e5e5] px-4 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[8px] uppercase tracking-[0.24em] font-bold text-[#9D7E3F]">Transaction Inspector</div>
              <div className="text-base font-bold truncate mt-1">{row.party || 'Ledger Entry'}</div>
              <div className="text-[10px] text-[#777] font-mono-tab mt-0.5">{row.type} · {date ? fmtDate(date) : '—'}</div>
            </div>
            <button onClick={onClose} className="w-8 h-8 border border-[#ddd] bg-[#fafafa] flex items-center justify-center">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className={`text-2xl font-bold font-mono-tab mt-3 ${isCredit ? 'text-[#12643a]' : 'text-[#8b1e1e]'}`}>
            {isCredit ? '+' : '-'}{fmtUSD(Math.abs(Number(row.amount || 0)))}
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          {detailGroups.map(group => (
            <section key={group.title} className="ldg-inspector-section">
              <div className="text-[7px] uppercase tracking-[0.22em] font-bold text-[#9D7E3F] mb-2">{group.title}</div>
              <div className="ldg-inspector-grid">
                {group.items.map(([label, value]) => (
                  <dl key={String(label)} className="ldg-inspector-kv">
                    <dt>{label}</dt>
                    <dd title={String(value)}>{value}</dd>
                  </dl>
                ))}
              </div>
            </section>
          ))}
          {memo && <div className="ldg-record-note text-[10px] leading-snug line-clamp-3">{memo}</div>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onEdit(row)}
              className="h-11 border border-[#d8d8d8] bg-white text-[10px] uppercase tracking-[0.13em] font-bold"
            >
              Edit
            </button>
            <button
              onClick={() => onToggleReconcile(row)}
              className="h-11 border border-[#d8d8d8] bg-[#f8f8f8] text-[10px] uppercase tracking-[0.13em] font-bold"
            >
              {row.reconciled ? 'Mark Open' : 'Reconcile'}
            </button>
            <button
              onClick={() => onExport(row)}
              className="h-11 border border-[#111] bg-[#111] text-white text-[10px] uppercase tracking-[0.13em] font-bold"
            >
              Export PDF
            </button>
            <button
              onClick={() => onExportExcel(row)}
              className="h-11 border border-[#d8d8d8] bg-white text-[10px] uppercase tracking-[0.13em] font-bold"
            >
              Export XLS
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Ledger() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { entity } = useEntity();
  const { user } = useAuth();
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const deleteCheck = useDelete('checks', [['checks']]);
  const deleteTxn   = useDelete('transactions', [['transactions']]);
  const txnUpsert   = useUpsert('transactions', [['transactions']]);
  const checkUpsert = useUpsert('checks', [['checks']]);
  const createVendor  = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const [q, setQ] = useState('');
  const [project, setProject] = useState('all');
  const [type, setType] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [queueFilter, setQueueFilter] = useState<LedgerQueueKey>('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState<'income' | 'expense' | 'check' | null>(null);
  const [detailRow, setDetailRow] = useState<any>(null);
  const [editRow, setEditRow] = useState<any>(null);
  const [editSignature, setEditSignature] = useState('');
  const [editForm, setEditForm] = useState({
    amount: '', amount_before_tax: '', tax_amount: '', date: '', posting_date: '', due_date: '', cleared_date: '',
    party: '', ref: '', transaction_number: '', external_reference: '', category: '', project_id: '', vendor_id: '', payee_vendor_id: '', payment_method: '', cost_phase: '', cost_type: '',
    status: '', payment_status: '', approval_status: '', reconciliation_status: '', receipt_status: '',
    print_status: '', delivery_status: '', void_reason: '',
    billable_status: '', reimbursable_status: '', external_invoice_url: '', external_invoice_provider: '',
    external_invoice_number: '', currency: 'USD', notes: '', internal_memo: '', public_memo: '', department: '', location: '',
  });
  const [reconcileMode, setReconcileMode] = useState(false);
  const [lastLedgerSync, setLastLedgerSync] = useState<Date | null>(null);
  const serverPagedEnabled = timePeriod === 'all' && queueFilter === 'all';
  const { data: ledgerPageRows = [] } = useLedgerPage({
    page,
    pageSize,
    search: q,
    projectId: project,
    type,
  });

  useEffect(() => {
    if (!entity?.id) return;
    const refreshLedger = () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['checks'] });
      setLastLedgerSync(new Date());
    };
    const channel = supabase
      .channel(`ledger-reconcile-${entity.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `entity_id=eq.${entity.id}` }, refreshLedger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `entity_id=eq.${entity.id}` }, refreshLedger)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [entity?.id, qc]);

  /* ── Per-form step state ── */
  const [incomeStep,  setIncomeStep]  = useState(1);
  const [expenseStep, setExpenseStep] = useState(1);
  const [checkStep,   setCheckStep]   = useState(1);

  const blankIncome  = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), source_name: '', project_id: '', category: '', notes: '', payment_method: '', check_reference: '', retainage_percent: '', retainage_amount: '', cost_phase: '' };
  const blankExpense = { amount: '', transaction_date: new Date().toISOString().slice(0, 10), vendor_id: '', project_id: '', category: '', notes: '', payment_method: '', cost_type: '', check_reference: '', cost_phase: '' };
  const blankCheck   = { amount: '', issue_date: new Date().toISOString().slice(0, 10), payee_name: '', check_number: '', memo: '', project_id: '' };

  const [formIncome,  setFormIncome]  = useState(blankIncome);
  const [formExpense, setFormExpense] = useState(blankExpense);
  const [formCheck,   setFormCheck]   = useState(blankCheck);

  const openAdd = (kind: 'income' | 'expense' | 'check') => {
    if (kind === 'income')  { setFormIncome(blankIncome);   setIncomeStep(1); }
    if (kind === 'expense') { setFormExpense(blankExpense); setExpenseStep(1); }
    if (kind === 'check')   { setFormCheck(blankCheck);     setCheckStep(1); }
    setAddOpen(kind);
  };

  const closeAdd = () => setAddOpen(null);

  const openEdit = (row: any) => {
    const raw = row?.raw ?? {};
    const amount = Math.abs(Number(row?.amount || raw.total_amount || raw.amount || 0));
    setDetailRow(null);
    setEditRow(row);
    setEditSignature('');
    setEditForm({
      amount: String(amount),
      amount_before_tax: raw.amount_before_tax != null ? String(raw.amount_before_tax) : String(amount),
      tax_amount: raw.tax_amount != null ? String(raw.tax_amount) : '0',
      date: row?._kind === 'check' ? (raw.issue_date || row?.date || '') : (raw.transaction_date || row?.date || ''),
      posting_date: raw.posting_date || raw.issue_date || row?.date || '',
      due_date: raw.due_date || '',
      cleared_date: raw.cleared_date || '',
      party: row?._kind === 'check' ? (raw.payee_name || row?.party || '') : (raw.source_name || row?.party || ''),
      ref: raw.check_reference || raw.external_reference || raw.check_number || row?.ref || '',
      transaction_number: raw.transaction_number || '',
      external_reference: raw.external_reference || '',
      category: raw.category || '',
      project_id: row?.project_id || raw.project_id || '',
      vendor_id: raw.vendor_id || '',
      payee_vendor_id: raw.payee_vendor_id || '',
      payment_method: raw.payment_method || '',
      cost_type: raw.cost_type || '',
      cost_phase: raw.cost_phase || '',
      status: row?.status || raw.status || '',
      payment_status: raw.payment_status || '',
      approval_status: raw.approval_status || '',
      reconciliation_status: raw.reconciliation_status || '',
      print_status: raw.print_status || '',
      delivery_status: raw.delivery_status || '',
      void_reason: raw.void_reason || '',
      receipt_status: raw.receipt_status || '',
      billable_status: raw.billable_status || '',
      reimbursable_status: raw.reimbursable_status || '',
      external_invoice_url: raw.external_invoice_url || '',
      external_invoice_provider: raw.external_invoice_provider || '',
      external_invoice_number: raw.external_invoice_number || raw.invoice_number || '',
      currency: raw.currency || 'USD',
      notes: raw.description || raw.notes || raw.memo || raw.internal_memo || '',
      internal_memo: raw.internal_memo || '',
      public_memo: raw.public_memo || '',
      department: raw.department || '',
      location: raw.location || '',
    });
  };

  const writeAuditSignature = async (row: any, action: string, before: any, after: Record<string, unknown>, signature: string) => {
    await supabase.from('admin_changelog' as any).insert({
      action,
      entity: row?._kind || 'ledger',
      dashboard: 'finance',
      entity_id: row?.id,
      entity_label: `${row?.type || 'Ledger'} ${row?.ref || row?.party || row?.id || ''}`.trim(),
      changed_by: user?.email || user?.id || 'finance_admin',
      details: {
        source: 'ledger_screen',
        signature,
        signed_at: new Date().toISOString(),
        before,
        after,
      },
    });
  };

  const duplicateRefs = useMemo(() => {
    const refs = new Map<string, number>();
    [...checks, ...income, ...expenses].forEach((item: any) => {
      const ref = String(item.check_number || item.check_reference || item.external_reference || item.transaction_number || '').trim().toLowerCase();
      if (ref && ref !== '—') refs.set(ref, (refs.get(ref) ?? 0) + 1);
    });
    return refs;
  }, [checks, income, expenses]);

  const queueMatches = (r: any, key: LedgerQueueKey) => {
    if (key === 'all') return true;
    const status = String(r.raw?.approval_status || r.status || '').toLowerCase();
    const refKey = String(r.ref || '').trim().toLowerCase();
    if (key === 'needs_review') return !r.reconciled || ['draft', 'submitted', 'under_review', 'pending_approval'].includes(status);
    if (key === 'missing_receipts') return r._kind === 'expense' && !['attached', 'verified'].includes(String(r.raw?.receipt_status || '').toLowerCase());
    if (key === 'uncategorized') return r._kind !== 'check' && !r.raw?.category;
    if (key === 'duplicates') return refKey && refKey !== '—' && (duplicateRefs.get(refKey) ?? 0) > 1;
    if (key === 'pending_approval') return ['draft', 'submitted', 'under_review', 'pending_approval'].includes(status);
    if (key === 'large_transactions') return Math.abs(Number(r.amount || 0)) >= 10000;
    if (key === 'imported_today') return String(r.raw?.created_at || '').slice(0, 10) === new Date().toISOString().slice(0, 10) && r.raw?.import_batch_id;
    if (key === 'open_checks') return r._kind === 'check' && !r.reconciled && r.status !== 'voided';
    return true;
  };

  /* Business context for trigger-mirrored rows (visit/note/draw/invoice
     syncs). The server-paged path returns a richer joined label from
     get_ledger_page's context_label; this is the client-side fallback for
     the filtered/time-ranged path. */
  const ledgerContextOf = (raw: any): string | null => {
    const ref = String(raw?.external_reference || '');
    if (ref.startsWith('hgp_visit:')) return raw?.category === 'Emergency Service' ? 'Emergency service visit' : 'Service visit';
    if (ref.startsWith('note_payment:')) return raw?.category ? `Note payment · ${raw.category}` : 'Note payment';
    if (ref.startsWith('draw_schedule:')) return 'Funded draw';
    if (ref.startsWith('invoice:')) return raw?.external_invoice_number ? `Invoice ${raw.external_invoice_number}` : 'Invoice payment';
    return null;
  };

  const scopedRows = useMemo(() => {
    const a = [
      ...checks.map((c: any) => ({
        id: c.id, rowId: 'c'+c.id, date: c.issue_date, type: 'Check',
        ref: c.check_number || c.external_reference || '—',
        party: c.payee_name, project: c.projects?.name, project_id: c.project_id,
        amount: -Number(c.amount), status: c.status, reconciled: c.reconciled || c.reconciliation_status === 'reconciled',
        context: null as string | null,
        _kind: 'check' as const, raw: c,
      })),
      ...income.map((t: any) => ({
        id: t.id, rowId: 'i'+t.id, date: t.transaction_date, type: 'Income',
        ref: t.check_reference || t.external_reference || t.transaction_number || '—',
        party: t.source_name || t.vendors?.name || '—', project: t.projects?.name, project_id: t.project_id,
        amount: Number(t.total_amount ?? t.amount), status: t.status || t.payment_status || 'posted',
        reconciled: t.reconciled || t.reconciliation_status === 'reconciled',
        context: ledgerContextOf(t),
        _kind: 'income' as const, raw: t,
      })),
      ...expenses.map((t: any) => ({
        id: t.id, rowId: 'e'+t.id, date: t.transaction_date, type: 'Expense',
        ref: t.check_reference || t.external_reference || t.transaction_number || t.category || '—',
        party: t.vendors?.name || t.source_name || '—', project: t.projects?.name, project_id: t.project_id,
        amount: -Number(t.total_amount ?? t.amount), status: t.status || t.payment_status || 'posted',
        reconciled: t.reconciled || t.reconciliation_status === 'reconciled',
        context: ledgerContextOf(t),
        _kind: 'expense' as const, raw: t,
      })),
    ];
    return a.filter(r => {
      if (!isInFinanceRange(r.date, timePeriod)) return false;
      if (project !== 'all' && r.project_id !== project) return false;
      if (type !== 'all' && r.type.toLowerCase() !== type) return false;
      if (q) {
        const haystack = [
          r.party, r.ref, r.project, r.status, r.raw?.category,
          r.raw?.description, r.raw?.notes, r.raw?.memo, r.raw?.cost_phase,
          r.raw?.transaction_number, r.raw?.external_reference,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q.toLowerCase())) return false;
      }
      return true;
    }).sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
  }, [checks, income, expenses, project, type, q, timePeriod]);

  const rows = useMemo(() => scopedRows.filter(r => queueMatches(r, queueFilter)), [scopedRows, queueFilter, duplicateRefs]);

  const totals = useMemo(() => {
    const inflow  = rows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const outflow = rows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
    const reconciled = rows.filter(r => r.reconciled);
    const unreconciled = rows.filter(r => !r.reconciled);
    const largest = rows.reduce((max, r) => Math.abs(r.amount) > Math.abs(max.amount) ? r : max, rows[0] ?? { amount: 0, party: '—', type: '—' });
    const incomeCount = rows.filter(r => r._kind === 'income').length;
    const expenseCount = rows.filter(r => r._kind === 'expense').length;
    const checkCount = rows.filter(r => r._kind === 'check').length;
    const unreconciledAmount = unreconciled.reduce((s, r) => s + Math.abs(r.amount), 0);
    const reconciledAmount = reconciled.reduce((s, r) => s + Math.abs(r.amount), 0);
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      reconciledCount: reconciled.length,
      unreconciledCount: unreconciled.length,
      reconcilePct: rows.length ? (reconciled.length / rows.length) * 100 : 0,
      largest,
      incomeCount,
      expenseCount,
      checkCount,
      unreconciledAmount,
      reconciledAmount,
    };
  }, [rows]);

  const operationalMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const duplicateCount = scopedRows.filter(r => {
      const key = String(r.ref || '').trim().toLowerCase();
      return key && key !== '—' && (duplicateRefs.get(key) ?? 0) > 1;
    }).length;
    const openRecon = scopedRows.filter(r => !r.reconciled).length;
    const missingReceipts = scopedRows.filter(r => r._kind === 'expense' && !['attached', 'verified'].includes(String(r.raw?.receipt_status || '').toLowerCase())).length;
    const uncategorized = scopedRows.filter(r => !r.raw?.category && r._kind !== 'check').length;
    const pendingApproval = scopedRows.filter(r => ['draft', 'submitted', 'under_review', 'pending_approval'].includes(String(r.raw?.approval_status || r.status || '').toLowerCase())).length;
    const largeTransactions = scopedRows.filter(r => Math.abs(Number(r.amount || 0)) >= 10000).length;
    const importedToday = scopedRows.filter(r => String(r.raw?.created_at || '').slice(0, 10) === today && r.raw?.import_batch_id).length;
    const openChecks = scopedRows.filter(r => r._kind === 'check' && !r.reconciled && r.status !== 'voided').length;
    return [
      { key: 'needs_review' as LedgerQueueKey, label: 'Needs Review', value: String(openRecon + pendingApproval), detail: 'Open, draft, or submitted records', icon: AlertTriangle, tone: openRecon ? 'text-warning' : 'text-positive' },
      { key: 'missing_receipts' as LedgerQueueKey, label: 'Missing Docs', value: String(missingReceipts), detail: 'Receipts or invoices needed', icon: Receipt, tone: missingReceipts ? 'text-warning' : 'text-foreground' },
      { key: 'uncategorized' as LedgerQueueKey, label: 'Job-Cost Coding', value: String(uncategorized), detail: 'Needs category or cost code', icon: Layers, tone: uncategorized ? 'text-warning' : 'text-foreground' },
      { key: 'duplicates' as LedgerQueueKey, label: 'Duplicate Refs', value: String(duplicateCount), detail: 'Possible duplicate entries', icon: CopyIcon, tone: duplicateCount ? 'text-destructive' : 'text-foreground' },
      { key: 'large_transactions' as LedgerQueueKey, label: 'High Value', value: String(largeTransactions), detail: '$10k+ audit review', icon: CircleDollarSign, tone: largeTransactions ? 'text-foreground' : 'text-foreground' },
      { key: 'open_checks' as LedgerQueueKey, label: 'Open Checks', value: String(openChecks), detail: 'Uncleared instruments', icon: FileText, tone: openChecks ? 'text-warning' : 'text-foreground' },
    ];
  }, [scopedRows, duplicateRefs]);

  const selectedProjectName = project === 'all'
    ? 'All projects'
    : projects.find((p: any) => p.id === project)?.name ?? 'Selected project';
  const selectedTypeLabel = type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1);
  const selectedRangeLabel = financeRangeLabel(timePeriod);
  const selectedQueueLabel = queueFilter === 'all'
    ? 'All Ledger'
    : operationalMetrics.find(m => m.key === queueFilter)?.label ?? 'Filtered Queue';
  const serverRows = useMemo(() => (ledgerPageRows as any[]).map((r: any) => {
    const kind = r.row_kind === 'check' ? 'check' : r.ledger_type;
    const amount = Number(r.amount || 0);
    return {
      id: r.source_id,
      rowId: `${kind}-${r.source_id}`,
      date: r.ledger_date,
      type: kind === 'check' ? 'Check' : kind === 'income' ? 'Income' : 'Expense',
      ref: r.reference || '—',
      party: r.counterparty || '—',
      project: r.project_name,
      project_id: r.project_id,
      amount,
      status: r.status || (r.reconciled ? 'reconciled' : 'open'),
      reconciled: Boolean(r.reconciled || r.reconciliation_status === 'reconciled'),
      context: (r.context_label as string | null) ?? null,
      _kind: kind === 'check' ? 'check' as const : kind === 'income' ? 'income' as const : 'expense' as const,
      raw: {
        id: r.source_id,
        project_id: r.project_id,
        projects: { name: r.project_name },
        transaction_date: r.row_kind === 'transaction' ? r.ledger_date : undefined,
        issue_date: r.row_kind === 'check' ? r.ledger_date : undefined,
        check_number: r.row_kind === 'check' ? r.reference : undefined,
        check_reference: r.row_kind !== 'check' ? r.reference : undefined,
        source_name: r.row_kind !== 'check' ? r.counterparty : undefined,
        payee_name: r.row_kind === 'check' ? r.counterparty : undefined,
        amount: Math.abs(amount),
        total_amount: Math.abs(amount),
        status: r.status,
        reconciliation_status: r.reconciliation_status,
        cleared_date: r.cleared_date,
      },
      total_count: Number(r.total_count || 0),
    };
  }), [ledgerPageRows]);
  const visibleRows = serverPagedEnabled && serverRows.length ? serverRows : rows;
  const visibleTotalCount = serverPagedEnabled && serverRows.length ? Number(serverRows[0]?.total_count || serverRows.length) : rows.length;
  const totalPages = Math.max(1, Math.ceil(visibleTotalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = visibleTotalCount ? (safePage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(visibleTotalCount, safePage * pageSize);
  const pagedRows = useMemo(
    () => (serverPagedEnabled && serverRows.length ? serverRows : rows.slice((safePage - 1) * pageSize, safePage * pageSize)),
    [serverPagedEnabled, serverRows, rows, safePage, pageSize],
  );

  const activateQueue = (metricKey: LedgerQueueKey) => {
    const next = queueFilter === metricKey ? 'all' : metricKey;
    setQueueFilter(next);
    setDetailRow(null);
    if (next !== 'all') {
      const matches = scopedRows.filter(r => queueMatches(r, next));
      if (matches.length === 1) setDetailRow(matches[0]);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q, project, type, pageSize, timePeriod, queueFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const ledgerTrend = useMemo(() => {
    const allDates = [...checks.map((c: any) => c.issue_date), ...income.map((t: any) => t.transaction_date), ...expenses.map((t: any) => t.transaction_date)];
    const buckets = buildFinanceBuckets(timePeriod, allDates);
    return buckets.map(({ label, start, end }) => {
      const bucketRows = rows.filter(r => {
        const dt = parseFinanceDate(r.date);
        return dt && dt >= start && dt < end;
      });
      const inflow = bucketRows.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
      const outflow = bucketRows.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);
      return { label, Inflow: inflow, Outflow: outflow, Net: inflow - outflow };
    });
  }, [rows, checks, income, expenses, timePeriod]);

  const pageOpenCount = pagedRows.filter(r => !r.reconciled).length;
  const nextReviewRow = rows.find(r => !r.reconciled) ?? rows.find(r => ['draft', 'submitted', 'under_review', 'pending_approval'].includes(String(r.raw?.approval_status || r.status || '').toLowerCase())) ?? null;

  const exportPDF = () => {
    const proj = project !== 'all' ? projects.find((p: any) => p.id === project)?.name : undefined;
    const visibleIncome = rows.filter(r => r._kind === 'income').map(r => r.raw);
    const visibleExpenses = rows.filter(r => r._kind === 'expense').map(r => r.raw);
    const visibleChecks = rows.filter(r => r._kind === 'check').map(r => r.raw);
    const doc = generateLedgerReport(visibleIncome, visibleExpenses, visibleChecks, proj, `${type !== 'all' ? type : 'all'} · ${selectedRangeLabel}`);
    savePDF(doc, `hou-general-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  const exportExcel = () => {
    const visibleIncome = rows.filter(r => r._kind === 'income').map(r => r.raw);
    const visibleExpenses = rows.filter(r => r._kind === 'expense').map(r => r.raw);
    const visibleChecks = rows.filter(r => r._kind === 'check').map(r => r.raw);
    downloadLedgerExcel(visibleIncome, visibleExpenses, visibleChecks);
    toast.success(`Ledger exported as Excel · ${selectedRangeLabel}`);
  };

  const exportLedgerRecord = (row: any) => {
    if (!row) return;
    const doc = generateLedgerRecordReport(row);
    const label = `${row.type || 'ledger'}-${row.ref || row.id || 'record'}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    savePDF(doc, `hou-ledger-record-${label}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Ledger record PDF exported');
  };

  const exportLedgerRecordExcel = (row: any) => {
    if (!row) return;
    downloadLedgerExcel(
      row._kind === 'income' ? [row.raw] : [],
      row._kind === 'expense' ? [row.raw] : [],
      row._kind === 'check' ? [row.raw] : [],
    );
    toast.success('Ledger record spreadsheet exported');
  };

  const submitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIncome.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({
      type: 'income', amount: parseFloat(formIncome.amount),
      amount_before_tax: parseFloat(formIncome.amount),
      total_amount: parseFloat(formIncome.amount),
      net_amount: Math.max(0, parseFloat(formIncome.amount) - (formIncome.retainage_amount ? parseFloat(formIncome.retainage_amount) : 0)),
      transaction_date: formIncome.transaction_date, posting_date: formIncome.transaction_date,
      source_name: formIncome.source_name || null, project_id: formIncome.project_id || null,
      category: formIncome.category || null, description: formIncome.category || formIncome.source_name || formIncome.notes || null, notes: formIncome.notes || null,
      payment_method: formIncome.payment_method || null, check_reference: formIncome.check_reference || null,
      retainage_percent: formIncome.retainage_percent ? parseFloat(formIncome.retainage_percent) : null,
      retainage_amount:  formIncome.retainage_amount  ? parseFloat(formIncome.retainage_amount)  : null,
      cost_phase: formIncome.cost_phase || null,
      status: 'posted', approval_status: 'approved', payment_status: 'paid', reconciliation_status: 'unreconciled',
      fiscal_year: new Date(formIncome.transaction_date).getFullYear(), accounting_period: formIncome.transaction_date.slice(0, 7),
    } as any);
    toast.success('Income logged'); closeAdd();
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExpense.amount) { toast.error('Amount required'); return; }
    await txnUpsert.mutateAsync({
      type: 'expense', amount: parseFloat(formExpense.amount),
      amount_before_tax: parseFloat(formExpense.amount),
      total_amount: parseFloat(formExpense.amount),
      net_amount: parseFloat(formExpense.amount),
      transaction_date: formExpense.transaction_date, posting_date: formExpense.transaction_date,
      vendor_id: formExpense.vendor_id || null, project_id: formExpense.project_id || null,
      category: formExpense.category || null, description: formExpense.category || formExpense.notes || null, notes: formExpense.notes || null,
      payment_method: formExpense.payment_method || null, cost_type: formExpense.cost_type || null,
      check_reference: formExpense.check_reference || null, cost_phase: formExpense.cost_phase || null,
      subcontractor_id: formExpense.cost_type === 'subcontract' ? formExpense.vendor_id || null : null,
      status: 'posted', approval_status: 'approved', payment_status: 'paid', reconciliation_status: 'unreconciled',
      fiscal_year: new Date(formExpense.transaction_date).getFullYear(), accounting_period: formExpense.transaction_date.slice(0, 7),
    } as any);
    toast.success('Expense recorded'); closeAdd();
  };

  const submitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCheck.amount || !formCheck.payee_name) { toast.error('Amount and payee required'); return; }
    await checkUpsert.mutateAsync({
      amount: parseFloat(formCheck.amount), payee_name: formCheck.payee_name, issue_date: formCheck.issue_date,
      posting_date: formCheck.issue_date, check_number: formCheck.check_number || null, memo: formCheck.memo || null,
      project_id: formCheck.project_id || null, status: 'pending', approval_status: 'approved',
      print_status: 'not_printed', delivery_status: 'not_delivered', reconciliation_status: 'unreconciled',
    } as any);
    toast.success('Check created'); closeAdd();
  };

  const toggleReconcile = async (r: any) => {
    const now = new Date().toISOString();
    const nextReconciled = !r.reconciled;
    const payload = {
      id: r.id,
      reconciled: nextReconciled,
      reconciled_at: nextReconciled ? now : null,
      reconciliation_status: nextReconciled ? 'reconciled' : 'unreconciled',
      cleared_date: nextReconciled ? now.slice(0, 10) : null,
    };
    try {
      if (r._kind === 'check') await checkUpsert.mutateAsync(payload as any);
      else await txnUpsert.mutateAsync({ ...payload, type: r.type.toLowerCase(), __mode: 'update' } as any);
      await writeAuditSignature(r, nextReconciled ? 'reconciled' : 'reopened', r.raw, payload, 'Ledger reconciliation control');
      toast.success(nextReconciled ? 'Marked reconciled' : 'Marked open');
    } catch { toast.error('Failed to update'); }
  };

  const submitLedgerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    if (!editSignature.trim()) {
      toast.error('Digital signature required before updating this ledger record');
      return;
    }
    const amount = Number(editForm.amount || 0);
    const amountBeforeTax = Number(editForm.amount_before_tax || amount);
    const taxAmount = Number(editForm.tax_amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const common = {
      id: editRow.id,
      __mode: 'update' as const,
      project_id: editForm.project_id || null,
      status: editForm.status || null,
    };
    try {
      if (editRow._kind === 'check') {
        const payload = {
          id: editRow.id,
          amount,
          issue_date: editForm.date || editRow.date,
          posting_date: editForm.posting_date || editForm.date || editRow.date,
          cleared_date: editForm.cleared_date || null,
          payee_name: editForm.party || null,
          check_number: editForm.ref || null,
          payee_vendor_id: editForm.payee_vendor_id || null,
          memo: editForm.notes || null,
          project_id: editForm.project_id || null,
          status: editForm.status || editRow.status || 'pending',
          approval_status: editForm.approval_status || undefined,
          print_status: editForm.print_status || undefined,
          delivery_status: editForm.delivery_status || undefined,
          reconciliation_status: editForm.reconciliation_status || undefined,
          external_reference: editForm.external_reference || undefined,
          void_reason: editForm.void_reason || undefined,
          __mode: 'update' as const,
        };
        await checkUpsert.mutateAsync(payload as any);
        await writeAuditSignature(editRow, 'signature_edit', editRow.raw, payload, editSignature.trim());
      } else {
        const payload = {
          ...common,
          type: editRow._kind,
          amount,
          amount_before_tax: Number.isFinite(amountBeforeTax) ? amountBeforeTax : amount,
          tax_amount: Number.isFinite(taxAmount) ? taxAmount : 0,
          total_amount: amount,
          net_amount: amount - (Number.isFinite(taxAmount) ? 0 : 0),
          currency: editForm.currency || 'USD',
          transaction_date: editForm.date || editRow.date,
          transaction_number: editForm.transaction_number || undefined,
          external_reference: editForm.external_reference || undefined,
          posting_date: editForm.posting_date || editForm.date || editRow.date,
          due_date: editForm.due_date || null,
          cleared_date: editForm.cleared_date || null,
          source_name: editRow._kind === 'income'
            ? (editForm.party || null)
            : editRow._kind === 'expense' && !editForm.vendor_id
              ? (editForm.party || null)
              : undefined,
          vendor_id: editRow._kind === 'expense' ? (editForm.vendor_id || null) : undefined,
          check_reference: editForm.ref || null,
          category: editForm.category || null,
          description: editForm.notes || editForm.category || editForm.party || null,
          notes: editForm.notes || null,
          payment_method: editForm.payment_method || null,
          cost_phase: editForm.cost_phase || null,
          cost_type: editForm.cost_type || undefined,
          payment_status: editForm.payment_status || undefined,
          approval_status: editForm.approval_status || undefined,
          reconciliation_status: editForm.reconciliation_status || undefined,
          receipt_status: editForm.receipt_status || undefined,
          billable_status: editForm.billable_status || undefined,
          reimbursable_status: editForm.reimbursable_status || undefined,
          external_invoice_url: editForm.external_invoice_url || undefined,
          external_invoice_provider: editForm.external_invoice_provider || undefined,
          external_invoice_number: editForm.external_invoice_number || undefined,
          internal_memo: editForm.internal_memo || undefined,
          public_memo: editForm.public_memo || undefined,
          department: editForm.department || undefined,
          location: editForm.location || undefined,
          accounting_period: (editForm.date || editRow.date || '').slice(0, 7) || undefined,
          fiscal_year: editForm.date ? new Date(editForm.date).getFullYear() : undefined,
        };
        await txnUpsert.mutateAsync(payload as any);
        await writeAuditSignature(editRow, 'signature_edit', editRow.raw, payload, editSignature.trim());
      }
      toast.success('Ledger record updated and signed');
      setEditRow(null);
      setDetailRow(null);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update ledger record');
    }
  };

  const bulkReconcileVisible = async (nextReconciled: boolean) => {
    const targetRows = pagedRows.filter(r => Boolean(r.reconciled) !== nextReconciled);
    if (!targetRows.length) {
      toast.info(nextReconciled ? 'All visible entries are already reconciled' : 'All visible entries are already open');
      return;
    }
    const now = new Date().toISOString();
    const payload = {
      reconciled: nextReconciled,
      reconciled_at: nextReconciled ? now : null,
      reconciliation_status: nextReconciled ? 'reconciled' : 'unreconciled',
      cleared_date: nextReconciled ? now.slice(0, 10) : null,
    };
    try {
      await Promise.all(targetRows.map(r => (
        r._kind === 'check'
          ? checkUpsert.mutateAsync({ id: r.id, ...payload } as any)
          : txnUpsert.mutateAsync({ id: r.id, type: r.type.toLowerCase(), __mode: 'update', ...payload } as any)
      )));
      toast.success(nextReconciled ? `Reconciled ${targetRows.length} visible entries` : `Reopened ${targetRows.length} visible entries`);
    } catch {
      toast.error('Bulk reconciliation failed');
    }
  };

  const fld = (label: string) => <Label className="micro-label mb-1.5 block">{label}</Label>;

  return (
    <AppShell>
      <style>{LDG_CSS}</style>
      <PageHeader eyebrow="Financial Operations" title="Transaction Ledger" description="Complete chronological record of every financial movement within the company."
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} className="w-[9.25rem] sm:w-auto" />
            <div className="hidden sm:contents">
              <button onClick={() => navigate('/finance/controls')} className="h-10 px-3 border border-border bg-background text-[10px] uppercase tracking-[0.14em] font-bold text-foreground/70 hover:text-foreground">Import</button>
              <ExportButton label="PDF" detail="Audit report" icon={FileText} color="#9D7E3F" onClick={exportPDF} />
              <ExportButton label="Excel" detail="Workbook" icon={Table2} color="#0891b2" onClick={exportExcel} />
              <button onClick={() => navigate('/concierge')} className="h-10 px-3 border border-foreground bg-foreground text-background text-[10px] uppercase tracking-[0.14em] font-bold">New Transaction</button>
            </div>
          </div>
        } />

      <div className="ldg-shell border-t border-border/50">
        {/* Mobile export controls */}
        <div className="sm:hidden px-4 py-2.5 border-b border-border bg-background/95">
          <div className="grid grid-cols-2 gap-2">
          <ExportButton label="PDF" detail="Audit report" icon={FileText} color="#7c3aed" onClick={exportPDF} />
          <ExportButton label="Excel" detail="Workbook" icon={Table2} color="#0891b2" onClick={exportExcel} />
          </div>
        </div>

        <div className="px-4 sm:px-8 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-foreground/60 font-bold">Operational Queue</div>
              <div className="text-[10px] text-foreground/48 hidden sm:block">Accounting work signals for review, classification, documentation, and reconciliation.</div>
            </div>
            <div className="text-[10px] text-foreground/50 font-mono-tab hidden sm:block">{selectedRangeLabel}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            {operationalMetrics.map(({ key: metricKey, ...metric }) => (
              <OperationalMetric
                key={metricKey}
                {...metric}
                active={queueFilter === metricKey}
                onClick={() => activateQueue(metricKey)}
              />
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-8 pt-3 pb-3 border-b border-border/60">
          <div className="ldg-panel p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-foreground/60 font-bold">Search Toolbar</div>
                <div className="text-[10px] text-foreground/45 sm:hidden">{selectedQueueLabel} · {selectedRangeLabel}</div>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[9px] text-foreground/45 font-mono-tab">
                <span className="px-2 py-1 border border-border bg-secondary/25">Saved View: {selectedQueueLabel}</span>
                <span className="px-2 py-1 border border-border bg-secondary/25">Density: Comfortable</span>
                <span className="px-2 py-1 border border-border bg-secondary/25">Columns: Core</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 lg:items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={1.5} />
                <Input placeholder="Search ledger…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none h-9 sm:h-10 w-full text-sm pl-9 bg-background" />
              </div>
              <div className="grid grid-cols-2 lg:flex gap-2">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="rounded-none w-full lg:w-36 h-9 sm:h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="check">Checks</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expenses</SelectItem></SelectContent>
                </Select>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger className="rounded-none w-full lg:w-56 h-9 sm:h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All projects</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="rounded-none w-full lg:w-32 h-9 sm:h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between lg:justify-end gap-2 lg:ml-auto">
                <div className="flex items-center gap-1.5 text-[10px] text-foreground/60 font-mono-tab">
                  <SlidersHorizontal className="w-3 h-3" />
                  {pageStart}-{pageEnd} of {visibleTotalCount}
                </div>
                {(q || type !== 'all' || project !== 'all' || queueFilter !== 'all') && (
                  <button onClick={() => { setQ(''); setType('all'); setProject('all'); setQueueFilter('all'); }} className="text-[10px] uppercase tracking-[0.14em] text-foreground/60 hover:text-foreground font-bold">
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 pt-3 pb-3 border-b border-border/60">
          <div className="ldg-recon-panel p-2.5">
            <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(220px,.95fr)_minmax(360px,1.05fr)_minmax(420px,1.1fr)] gap-2.5 xl:items-center">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="ldg-recon-ring shrink-0" style={{ '--recon-pct': `${Math.min(100, Math.max(0, totals.reconcilePct))}%` } as any}>
                  <span>{totals.reconcilePct.toFixed(0)}%</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <div className="text-[8px] uppercase tracking-[0.2em] text-foreground/60 font-black">Reconciliation Center</div>
                    <span className="inline-flex items-center gap-1 text-[7px] uppercase tracking-[0.12em] font-black text-positive border border-positive/25 bg-positive/5 px-1.5 py-0.5">
                      <span className="ldg-live-dot" /> Live
                    </span>
                  </div>
                  <div className="text-[16px] font-black leading-tight text-foreground">
                    {totals.unreconciledCount} open · {fmtUSD(totals.unreconciledAmount)}
                  </div>
                  <div className="text-[9px] text-foreground/50 truncate">
                    {selectedQueueLabel} queue · {lastLedgerSync ? `updated ${lastLedgerSync.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'waiting for activity'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 font-mono-tab">
                {[
                  ['Cleared', totals.reconciledCount, 'text-positive'],
                  ['Page Open', pageOpenCount, pageOpenCount ? 'text-warning' : 'text-positive'],
                  ['Cleared $', fmtUSD(totals.reconciledAmount), 'text-foreground'],
                ].map(([label, value, cls]) => (
                  <div key={String(label)} className="ldg-recon-metric compact">
                    <div className="k">{label}</div>
                    <div className={`v ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={() => setReconcileMode(m => !m)} className={`ldg-recon-action ${reconcileMode ? 'primary' : ''}`}>
                  <CheckSquare className="w-3.5 h-3.5" /> {reconcileMode ? 'Exit' : 'Review'}
                </button>
                <button onClick={() => bulkReconcileVisible(true)} className="ldg-recon-action positive">
                  <CheckSquare className="w-3.5 h-3.5" /> Clear Page
                </button>
                <button onClick={() => bulkReconcileVisible(false)} className="ldg-recon-action warning">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
                <button onClick={() => nextReviewRow && setDetailRow(nextReviewRow)} disabled={!nextReviewRow} className="ldg-recon-action disabled:opacity-40 disabled:cursor-not-allowed">
                  <Eye className="w-3.5 h-3.5" /> Next
                </button>
              </div>
            </div>
          </div>
        </div>

      <div className="px-4 sm:px-8 py-4 ldg-workspace">
        <div className="min-w-0">
        {/* Mobile card view */}
        <div className="sm:hidden space-y-2.5">
          {visibleTotalCount === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No entries match.</div>
          ) : pagedRows.map(r => (
            <div key={r.rowId} role="button" tabIndex={0} onClick={() => setDetailRow(r)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setDetailRow(r); }} className={`ldg-panel relative w-full p-2 space-y-1.5 text-left cursor-pointer overflow-hidden ${r.reconciled ? 'opacity-75' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type==='Check'?'ldg-type-check':r.type==='Income'?'ldg-type-income':'ldg-type-expense'}`}>{r.type}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold font-mono-tab ${r.amount>=0?'text-positive':'text-destructive'}`}>{r.amount>=0?'+':'−'}{fmtUSD(Math.abs(r.amount))}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><button type="button" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                      <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={async () => { try { if (r._kind==='check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch(err:any){toast.error(err.message);} }}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="text-sm font-semibold truncate">{r.party}</div>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-tab">
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="text-foreground/45 uppercase tracking-[0.14em]">Project</div>
                  <div className="truncate text-foreground/75">{r.project || 'Unassigned'}</div>
                </div>
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="text-foreground/45 uppercase tracking-[0.14em]">Date</div>
                  <div className="text-foreground/75">{fmtDate(r.date)}</div>
                </div>
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="text-foreground/45 uppercase tracking-[0.14em]">Method</div>
                  <div className="truncate text-foreground/75">{r.raw?.payment_method?.replace?.(/_/g, ' ') || r.raw?.delivery_status?.replace?.(/_/g, ' ') || '—'}</div>
                </div>
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="text-foreground/45 uppercase tracking-[0.14em]">Recon</div>
                  <div className={r.reconciled ? 'truncate text-positive font-bold' : 'truncate text-warning font-bold'}>{r.reconciled ? 'Reconciled' : 'Open'}</div>
                </div>
              </div>
              {r.context && (
                <div className="text-[10px] font-bold px-2 py-1 border border-accent/25 bg-accent/5 text-accent truncate">
                  {r.context}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[10px] text-foreground/55">
                <span className="truncate">Ref: {r.ref}</span>
                <span className="flex items-center gap-1 uppercase tracking-[0.14em] font-bold">Inspector <ChevronRight className="w-3 h-3" /></span>
              </div>
              <div className="grid grid-cols-2 gap-1.5" onClick={e => e.stopPropagation()}>
                <button className="h-8 border border-border bg-background text-[10px] uppercase tracking-[0.14em] font-bold" onClick={() => setDetailRow(r)}>View</button>
                <button className="h-8 border border-border bg-background text-[10px] uppercase tracking-[0.14em] font-bold" onClick={() => openEdit(r)}>Edit</button>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleReconcile(r)}
                  className={`w-full h-9 border text-[10px] uppercase tracking-[0.14em] font-bold ${r.reconciled ? 'border-warning/30 bg-warning/10 text-warning' : 'border-positive/30 bg-positive/10 text-positive'}`}
                >
                  {r.reconciled ? 'Reopen Entry' : 'Mark Reconciled'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block ldg-panel overflow-x-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-secondary/20">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-foreground/60 font-bold">Ledger Register</div>
              <div className="text-[10px] text-foreground/50 mt-0.5 font-mono-tab">
                {selectedQueueLabel} · Click any row to inspect the full finance record.
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono-tab text-foreground/60">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-positive" />In</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-destructive" />Out</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500" />Check</span>
            </div>
          </div>
          {reconcileMode && (
            <div className="px-4 py-2 border-b border-border bg-positive/5 text-[10px] font-bold text-positive flex items-center gap-2 uppercase tracking-[0.14em]">
              <CheckSquare className="w-3 h-3" /> Reconcile mode — click the checkbox to mark entries as reconciled
            </div>
          )}
          {queueFilter !== 'all' && (
            <div className="px-4 py-1.5 border-b border-border bg-secondary/30 flex items-center justify-between gap-3">
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-foreground/60">Work view: <span className="text-foreground">{selectedQueueLabel}</span></div>
              <button onClick={() => setQueueFilter('all')} className="text-[9px] uppercase tracking-[0.14em] font-bold text-foreground/50 hover:text-foreground">Show all</button>
            </div>
          )}
          <div className="min-w-[1240px] grid grid-cols-[.9fr_.7fr_1fr_1.65fr_1.25fr_.95fr_.9fr_1fr_1fr_1.05fr_110px] gap-2 px-4 py-2 border-b border-border bg-secondary/45 text-[9px] uppercase tracking-[0.14em] text-foreground/55 font-bold items-center">
            <div>Date</div><div>Type</div><div>Reference</div><div>Counterparty</div><div>Project</div><div>Method</div><div>Status</div><div className="text-right">Debit</div><div className="text-right">Credit</div><div className="text-right">Balance</div><div className="text-right">Action</div>
          </div>
          {visibleTotalCount === 0 ? <div className="px-4 py-16 text-center text-sm text-muted-foreground">No entries match.</div> :
            pagedRows.map((r, index) => {
              const absoluteIndex = (safePage - 1) * pageSize + index;
              const runningBalance = (serverPagedEnabled ? pagedRows.slice(index) : visibleRows.slice(absoluteIndex)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
              const debit = r.amount < 0 ? Math.abs(r.amount) : 0;
              const credit = r.amount >= 0 ? r.amount : 0;
              return (
                <div key={r.rowId} className={`min-w-[1240px] relative grid grid-cols-[.9fr_.7fr_1fr_1.65fr_1.25fr_.95fr_.9fr_1fr_1fr_1.05fr_110px] gap-2 px-4 py-2 border-b border-border last:border-b-0 text-sm font-mono-tab items-center group ldg-row cursor-pointer overflow-hidden ${r.reconciled ? 'opacity-70' : ''}`} onClick={() => setDetailRow(r)}>
                <div className="text-foreground/62 text-[11px]">{r.date ? fmtDate(r.date) : '—'}</div>
                  <div><span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border ldg-badge ${r.type==='Check'?'ldg-type-check':r.type==='Income'?'ldg-type-income':'ldg-type-expense'}`}>{r.type}</span></div>
                  <div className="truncate text-foreground/55 text-[11px]">{r.ref}</div>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-foreground">{r.party}</div>
                    {r.context ? (
                      <div className="text-[9px] font-bold text-accent mt-0.5 truncate" title={r.context}>{r.context}</div>
                    ) : (
                      <div className="text-[9px] text-foreground/45 mt-0.5 truncate">{r.status && r.status !== '—' ? `Status: ${r.status}` : r.reconciled ? 'Reconciled' : 'Open ledger entry'}</div>
                    )}
                  </div>
                  <div className="truncate text-foreground/58 text-[11px]">{r.project||'Unassigned'}</div>
                  <div className="truncate text-foreground/58 text-[11px] capitalize">{r.raw?.payment_method?.replace?.(/_/g, ' ') || r.raw?.delivery_status?.replace?.(/_/g, ' ') || '—'}</div>
                  <div className={r.reconciled ? 'truncate text-positive text-[10px] font-bold uppercase tracking-[0.08em]' : 'truncate text-warning text-[10px] font-bold uppercase tracking-[0.08em]'}>
                    {r.reconciled ? 'Reconciled' : (r.status || 'Open')}
                  </div>
                  <div className="text-right font-bold text-[12px] text-destructive">{debit ? fmtUSD(debit) : '—'}</div>
                  <div className="text-right font-bold text-[12px] text-positive">{credit ? fmtUSD(credit) : '—'}</div>
                  <div className={`text-right font-bold text-[12px] ${runningBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{fmtUSD(runningBalance)}</div>
                  <div className="flex justify-end items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleReconcile(r)} className={`ldg-recon-row-action ${r.reconciled ? 'text-warning' : 'text-positive'}`} title={r.reconciled ? 'Reopen entry' : 'Mark reconciled'}>
                      {r.reconciled ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setDetailRow(r)} className="ldg-recon-row-action" title="View details">
                      <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => openEdit(r)} className="ldg-recon-row-action" title="Edit with signature">
                      <PencilLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><button className="ldg-recon-row-action hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button></AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none">
                        <AlertDialogHeader><AlertDialogTitle>Delete this {r.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                          <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={async () => { try { if (r._kind==='check') await deleteCheck.mutateAsync(r.id); else await deleteTxn.mutateAsync(r.id); toast.success('Deleted'); } catch(err:any){toast.error(err.message);} }}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
        </div>

        {visibleTotalCount > 0 && (
          <div className="ldg-panel mt-3 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="text-[10px] font-mono-tab text-foreground/60">
                Showing <span className="font-bold text-foreground">{pageStart}-{pageEnd}</span> of <span className="font-bold text-foreground">{visibleTotalCount}</span>
              </div>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="rounded-none w-28 h-8 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[34px_1fr_34px] sm:flex sm:items-center gap-2">
              <button className="ldg-page-btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
              <div className="h-[34px] border border-border bg-secondary/25 px-3 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/65">
                Page {safePage} / {totalPages}
              </div>
              <button className="ldg-page-btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const pageNumber = start + i;
                  return (
                    <button
                      key={pageNumber}
                      className={`ldg-page-btn ${pageNumber === safePage ? 'bg-foreground text-background border-foreground' : ''}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
        <LedgerInspector row={detailRow} onClose={() => setDetailRow(null)} onToggleReconcile={toggleReconcile} onExport={exportLedgerRecord} onExportExcel={exportLedgerRecordExcel} onEdit={openEdit} />
      </div>
      </div>

      <Dialog open={!!editRow} onOpenChange={o => { if (!o) setEditRow(null); }}>
        <DialogContent className="z-[100] rounded-none sm:max-w-5xl w-[calc(100%-2rem)] max-h-[92vh] overflow-y-auto p-0 border-[#d8d8d8]">
          <div className="ldg-correction-modal">
            <div className="ldg-correction-header px-5 py-4">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight">Signed Ledger Correction</DialogTitle>
              </DialogHeader>
              <p className="text-[11px] text-[#666] mt-1 max-w-2xl">Edit the ledger record, sign the correction, and preserve a permanent changelog footprint with previous and current values.</p>
            </div>
            <form onSubmit={submitLedgerEdit} className="p-4 sm:p-5 space-y-3 bg-[#f7f7f7]">
              {editRow && (
                <div className="ldg-correction-section grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    ['Record Type', editRow.type],
                    ['Existing Ref', editRow.ref],
                    ['Existing Project', editRow.project || 'Unassigned'],
                    ['Database ID', editRow.id],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-[#dedede] bg-[#fafafa] px-3 py-2 min-w-0">
                      <div className="text-[7px] uppercase tracking-[0.18em] text-[#777] font-bold">{label}</div>
                      <div className="text-[11px] font-semibold truncate mt-1" title={String(value)}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              <section className="ldg-correction-section">
                <div className="ldg-correction-title">Amounts & Dates</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  {fld('Total Amount')}
                  <CurrencyInput value={editForm.amount} onValueChange={v => setEditForm(f => ({ ...f, amount: v }))} />
                </div>
                <div>
                  {fld('Before Tax')}
                  <CurrencyInput value={editForm.amount_before_tax} onValueChange={v => setEditForm(f => ({ ...f, amount_before_tax: v }))} />
                </div>
                <div>
                  {fld('Tax')}
                  <CurrencyInput value={editForm.tax_amount} onValueChange={v => setEditForm(f => ({ ...f, tax_amount: v }))} />
                </div>
                <div>
                  {fld('Currency')}
                  <Input className="rounded-none h-10" value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  {fld(editRow?._kind === 'check' ? 'Issue Date' : 'Transaction Date')}
                  <DateInput className="h-10" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  {fld('Posting Date')}
                  <DateInput className="h-10" value={editForm.posting_date} onChange={e => setEditForm(f => ({ ...f, posting_date: e.target.value }))} />
                </div>
                <div>
                  {fld('Due Date')}
                  <DateInput className="h-10" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} disabled={editRow?._kind === 'check'} />
                </div>
                <div>
                  {fld('Cleared / Paid Date')}
                  <DateInput className="h-10" value={editForm.cleared_date} onChange={e => setEditForm(f => ({ ...f, cleared_date: e.target.value }))} />
                </div>
              </div>
              </section>
              <section className="ldg-correction-section">
                <div className="ldg-correction-title">Status & Counterparty</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  {fld('Status')}
                  <Input className="rounded-none h-10" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} />
                </div>
                <div>
                  {fld('Payment Status')}
                  <Input className="rounded-none h-10" value={editForm.payment_status} onChange={e => setEditForm(f => ({ ...f, payment_status: e.target.value }))} disabled={editRow?._kind === 'check'} />
                </div>
                <div>
                  {fld('Approval Status')}
                  <Input className="rounded-none h-10" value={editForm.approval_status} onChange={e => setEditForm(f => ({ ...f, approval_status: e.target.value }))} />
                </div>
              </div>
              {editRow?._kind === 'check' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>{fld('Print Status')}<Input className="rounded-none h-10" value={editForm.print_status} onChange={e => setEditForm(f => ({ ...f, print_status: e.target.value }))} /></div>
                  <div>{fld('Delivery Status')}<Input className="rounded-none h-10" value={editForm.delivery_status} onChange={e => setEditForm(f => ({ ...f, delivery_status: e.target.value }))} /></div>
                  <div>{fld('Void Reason')}<Input className="rounded-none h-10" value={editForm.void_reason} onChange={e => setEditForm(f => ({ ...f, void_reason: e.target.value }))} /></div>
                </div>
              )}
              <div className={`grid grid-cols-1 ${editRow?._kind !== 'income' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 mt-3`}>
                <div>
                  {fld(editRow?._kind === 'check' ? 'Payee' : 'Counterparty / Source')}
                  <Input className="rounded-none h-10" value={editForm.party} onChange={e => setEditForm(f => ({ ...f, party: e.target.value }))} />
                </div>
                {editRow?._kind !== 'income' && (
                  <div>
                    {fld(editRow?._kind === 'check' ? 'Linked Payee Vendor' : 'Vendor')}
                    <QuickCreateSelect
                      value={editRow?._kind === 'check' ? editForm.payee_vendor_id : editForm.vendor_id}
                      onValueChange={v => setEditForm(f => editRow?._kind === 'check' ? ({ ...f, payee_vendor_id: v }) : ({ ...f, vendor_id: v }))}
                      options={vendors}
                      placeholder="Select or create vendor"
                      entityLabel="Vendor"
                      onCreateNew={async name => { const r = await createVendor.mutateAsync({ name }); toast.success(`Vendor "${name}" created`); return r; }}
                    />
                    <button type="button" className="text-[9px] uppercase tracking-[0.14em] text-[#777] hover:text-[#111] mt-1" onClick={() => setEditForm(f => editRow?._kind === 'check' ? ({ ...f, payee_vendor_id: '' }) : ({ ...f, vendor_id: '' }))}>Clear vendor</button>
                  </div>
                )}
                <div>
                  {fld(editRow?._kind === 'check' ? 'Check / Reference #' : 'Payment Reference')}
                  <Input className="rounded-none h-10" value={editForm.ref} onChange={e => setEditForm(f => ({ ...f, ref: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>{fld('Transaction Number')}<Input className="rounded-none h-10" value={editForm.transaction_number} onChange={e => setEditForm(f => ({ ...f, transaction_number: e.target.value }))} disabled={editRow?._kind === 'check'} /></div>
                <div>{fld('External Reference')}<Input className="rounded-none h-10" value={editForm.external_reference} onChange={e => setEditForm(f => ({ ...f, external_reference: e.target.value }))} /></div>
              </div>
              </section>
              <section className="ldg-correction-section">
                <div className="ldg-correction-title">Project & Classification</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  {fld('Project')}
                  <QuickCreateSelect
                    value={editForm.project_id}
                    onValueChange={v => setEditForm(f => ({ ...f, project_id: v }))}
                    options={projects}
                    placeholder="Select or create project"
                    entityLabel="Project"
                    onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }}
                  />
                  <button type="button" className="text-[9px] uppercase tracking-[0.14em] text-[#777] hover:text-[#111] mt-1" onClick={() => setEditForm(f => ({ ...f, project_id: '' }))}>Clear project</button>
                </div>
                <div>
                  {fld('Category')}
                  <Input className="rounded-none h-10" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} disabled={editRow?._kind === 'check'} />
                </div>
                <div>
                  {fld('Payment Method')}
                  <Input className="rounded-none h-10" value={editForm.payment_method} onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))} disabled={editRow?._kind === 'check'} />
                </div>
                <div>
                  {fld('Cost Type')}
                  <Input className="rounded-none h-10" value={editForm.cost_type} onChange={e => setEditForm(f => ({ ...f, cost_type: e.target.value }))} disabled={editRow?._kind === 'check'} />
                </div>
              </div>
              <div>
                {fld('Cost Phase / Memo')}
                <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1.2fr] gap-3">
                  <Input className="rounded-none h-10" value={editForm.cost_phase} onChange={e => setEditForm(f => ({ ...f, cost_phase: e.target.value }))} disabled={editRow?._kind === 'check'} />
                  <Input className="rounded-none h-10" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              </section>
              {editRow?._kind !== 'check' && (
                <section className="ldg-correction-section">
                  <div className="ldg-correction-title">Documentation & Invoice Links</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      {fld('Receipt Status')}
                      <Input className="rounded-none h-10" value={editForm.receipt_status} onChange={e => setEditForm(f => ({ ...f, receipt_status: e.target.value }))} />
                    </div>
                    <div>
                      {fld('Billable Status')}
                      <Input className="rounded-none h-10" value={editForm.billable_status} onChange={e => setEditForm(f => ({ ...f, billable_status: e.target.value }))} />
                    </div>
                    <div>
                      {fld('Reimbursable Status')}
                      <Input className="rounded-none h-10" value={editForm.reimbursable_status} onChange={e => setEditForm(f => ({ ...f, reimbursable_status: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      {fld('External Invoice URL')}
                      <Input className="rounded-none h-10" value={editForm.external_invoice_url} onChange={e => setEditForm(f => ({ ...f, external_invoice_url: e.target.value }))} placeholder="Stripe, QuickBooks, or external invoice link" />
                    </div>
                    <div>
                      {fld('Invoice Provider')}
                      <Input className="rounded-none h-10" value={editForm.external_invoice_provider} onChange={e => setEditForm(f => ({ ...f, external_invoice_provider: e.target.value }))} />
                    </div>
                    <div>
                      {fld('Invoice Number')}
                      <Input className="rounded-none h-10" value={editForm.external_invoice_number} onChange={e => setEditForm(f => ({ ...f, external_invoice_number: e.target.value }))} />
                    </div>
                  </div>
                </section>
              )}
              {editRow?._kind !== 'check' && (
                <section className="ldg-correction-section">
                  <div className="ldg-correction-title">Operational Metadata</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>{fld('Department')}<Input className="rounded-none h-10" value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} /></div>
                    <div>{fld('Location')}<Input className="rounded-none h-10" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>{fld('Internal Memo')}<Input className="rounded-none h-10" value={editForm.internal_memo} onChange={e => setEditForm(f => ({ ...f, internal_memo: e.target.value }))} /></div>
                    <div>{fld('Public Memo')}<Input className="rounded-none h-10" value={editForm.public_memo} onChange={e => setEditForm(f => ({ ...f, public_memo: e.target.value }))} /></div>
                  </div>
                </section>
              )}
              <div className="border border-[#d9c896] bg-[#fffdf6] p-3 shadow-sm">
                {fld('Digital Signature Required')}
                <Input className="rounded-none h-10 bg-white" placeholder="Type your full name to approve this correction" value={editSignature} onChange={e => setEditSignature(e.target.value)} />
                <p className="text-[10px] text-[#666] mt-2">Signature timestamp will be recorded as {new Date().toLocaleString()}.</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-none" onClick={() => setEditRow(null)}>Cancel</Button>
                <Button type="submit" className="rounded-none bg-foreground text-background" disabled={txnUpsert.isPending || checkUpsert.isPending || !editSignature.trim()}>
                  Save Signed Correction
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add dialogs ── */}
      <Dialog open={!!addOpen} onOpenChange={o => { if (!o) closeAdd(); }}>
        <DialogContent className="rounded-none sm:max-w-xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-6">

          {/* ══ INCOME FORM ══ */}
          {addOpen === 'income' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Log Income</DialogTitle>
              </DialogHeader>
              <StepIndicator current={incomeStep} labels={['Core Details', 'Payment', 'Classification']} />
              <form onSubmit={submitIncome}>

                {incomeStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formIncome.amount} onValueChange={v => setFormIncome(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<DateInput className="h-10" value={formIncome.transaction_date} onChange={e => setFormIncome(f => ({...f, transaction_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Source / Client')}
                      <Input placeholder="Client name or funding source" className="rounded-none h-10" value={formIncome.source_name} onChange={e => setFormIncome(f => ({...f, source_name: e.target.value}))} />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Enter the gross amount received. Retainage details can be added in the final step.</p>
                    </div>
                  </div>
                )}

                {incomeStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Payment Method')}
                      <Select value={formIncome.payment_method} onValueChange={v => setFormIncome(f => ({...f, payment_method: v, check_reference: ''}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>{INCOME_METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {REF_METHODS.has(formIncome.payment_method) && (
                      <div>
                        {fld(formIncome.payment_method === 'check' ? 'Check Number' : 'Reference / Trace #')}
                        <Input className="rounded-none h-10" placeholder={formIncome.payment_method === 'check' ? 'e.g. 1042' : 'Wire / ACH trace #'} value={formIncome.check_reference} onChange={e => setFormIncome(f => ({...f, check_reference: e.target.value}))} />
                      </div>
                    )}
                    {!formIncome.payment_method && (
                      <div className="bg-secondary/30 border border-border px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">Payment method is optional — you can skip this step.</p>
                      </div>
                    )}
                  </div>
                )}

                {incomeStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Category')}
                      <Select value={formIncome.category} onValueChange={v => setFormIncome(f => ({...f, category: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{INCOME_CATEGORIES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Cost Phase / Code (optional)')}
                      <Select value={formIncome.cost_phase} onValueChange={v => setFormIncome(f => ({...f, cost_phase: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                        <SelectContent>{COST_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formIncome.project_id} onValueChange={v => setFormIncome(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Retainage / Holdback (optional)')}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <Input type="number" min="0" max="100" step="0.1" className="rounded-none h-10 pr-7" placeholder="e.g. 10" value={formIncome.retainage_percent}
                            onChange={e => { const pct = e.target.value; const computed = pct && formIncome.amount ? String(Math.round(parseFloat(formIncome.amount)*parseFloat(pct)/100*100)/100) : ''; setFormIncome(f => ({...f, retainage_percent: pct, retainage_amount: computed})); }} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                          <CurrencyInput className="h-10" placeholder="e.g. 10,000" value={formIncome.retainage_amount}
                            onValueChange={amt => { const computed = amt && formIncome.amount ? String(Math.round(parseFloat(amt)/parseFloat(formIncome.amount)*100*100)/100) : ''; setFormIncome(f => ({...f, retainage_amount: amt, retainage_percent: computed})); }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Enter % or $ — the other calculates automatically.</p>
                    </div>
                    <div>
                      {fld('Notes')}
                      <Textarea className="rounded-none" rows={3} value={formIncome.notes} onChange={e => setFormIncome(f => ({...f, notes: e.target.value}))} />
                    </div>
                  </div>
                )}

                <FormNav step={incomeStep} total={3} onBack={() => setIncomeStep(s => s-1)} onNext={() => { if (incomeStep===1 && !formIncome.amount){toast.error('Amount required');return;} setIncomeStep(s=>s+1); }} submitLabel="Save Income" isPending={txnUpsert.isPending} />
              </form>
            </>
          )}

          {/* ══ EXPENSE FORM ══ */}
          {addOpen === 'expense' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Record Expense</DialogTitle>
              </DialogHeader>
              <StepIndicator current={expenseStep} labels={['Core Details', 'Payment', 'Classification']} />
              <form onSubmit={submitExpense}>

                {expenseStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formExpense.amount} onValueChange={v => setFormExpense(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<DateInput className="h-10" value={formExpense.transaction_date} onChange={e => setFormExpense(f => ({...f, transaction_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Vendor')}
                      <QuickCreateSelect value={formExpense.vendor_id} onValueChange={v => setFormExpense(f => ({...f, vendor_id: v}))} options={vendors} placeholder="Select vendor" entityLabel="Vendor" onCreateNew={async name => { const r = await createVendor.mutateAsync({ name }); toast.success(`Vendor "${name}" created`); return r; }} />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Enter the total amount. Category and project details follow in the next steps.</p>
                    </div>
                  </div>
                )}

                {expenseStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Payment Method')}
                      <Select value={formExpense.payment_method} onValueChange={v => setFormExpense(f => ({...f, payment_method: v, check_reference: ''}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>{EXPENSE_METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {REF_METHODS.has(formExpense.payment_method) && (
                      <div>
                        {fld(formExpense.payment_method === 'check' ? 'Check Number' : 'Trace / Reference #')}
                        <Input className="rounded-none h-10" placeholder={formExpense.payment_method === 'check' ? 'e.g. 1024' : 'ACH/wire trace #'} value={formExpense.check_reference} onChange={e => setFormExpense(f => ({...f, check_reference: e.target.value}))} />
                      </div>
                    )}
                    {!formExpense.payment_method && (
                      <div className="bg-secondary/30 border border-border px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">Payment method is optional — you can skip this step.</p>
                      </div>
                    )}
                  </div>
                )}

                {expenseStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Category')}
                      <Select value={formExpense.category} onValueChange={v => setFormExpense(f => ({...f, category: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Cost Type')}
                      <Select value={formExpense.cost_type} onValueChange={v => setFormExpense(f => ({...f, cost_type: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Labor / Material / …" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labor">Labor</SelectItem>
                          <SelectItem value="material">Materials</SelectItem>
                          <SelectItem value="subcontract">Subcontract</SelectItem>
                          <SelectItem value="permit">Permits & Fees</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="overhead">Overhead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Cost Phase / Code (optional)')}
                      <Select value={formExpense.cost_phase} onValueChange={v => setFormExpense(f => ({...f, cost_phase: v}))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select phase (optional)" /></SelectTrigger>
                        <SelectContent>{COST_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formExpense.project_id} onValueChange={v => setFormExpense(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Notes')}
                      <Textarea className="rounded-none" rows={3} value={formExpense.notes} onChange={e => setFormExpense(f => ({...f, notes: e.target.value}))} />
                    </div>
                  </div>
                )}

                <FormNav step={expenseStep} total={3} onBack={() => setExpenseStep(s => s-1)} onNext={() => { if (expenseStep===1 && !formExpense.amount){toast.error('Amount required');return;} setExpenseStep(s=>s+1); }} submitLabel="Save Expense" isPending={txnUpsert.isPending} />
              </form>
            </>
          )}

          {/* ══ CHECK FORM ══ */}
          {addOpen === 'check' && (
            <>
              <DialogHeader className="pb-0">
                <DialogTitle className="text-base font-semibold">Create Check</DialogTitle>
              </DialogHeader>
              <StepIndicator current={checkStep} labels={['Payment Details', 'Reference & Project']} />
              <form onSubmit={submitCheck}>

                {checkStep === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>{fld('Amount *')}<CurrencyInput value={formCheck.amount} onValueChange={v => setFormCheck(f => ({...f, amount: v}))} /></div>
                      <div>{fld('Date')}<DateInput className="h-10" value={formCheck.issue_date} onChange={e => setFormCheck(f => ({...f, issue_date: e.target.value}))} /></div>
                    </div>
                    <div>
                      {fld('Payee *')}
                      <Input required className="rounded-none h-10" value={formCheck.payee_name} onChange={e => setFormCheck(f => ({...f, payee_name: e.target.value}))} placeholder="Payee name" />
                    </div>
                    <div className="bg-secondary/30 border border-border px-4 py-3">
                      <p className="text-[11px] text-muted-foreground">Checks are created with a pending status. Mark them cleared once they have been processed by the bank.</p>
                    </div>
                  </div>
                )}

                {checkStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      {fld('Check Number')}
                      <Input className="rounded-none h-10" value={formCheck.check_number} onChange={e => setFormCheck(f => ({...f, check_number: e.target.value}))} placeholder="e.g. 1024" />
                    </div>
                    <div>
                      {fld('Project')}
                      <QuickCreateSelect value={formCheck.project_id} onValueChange={v => setFormCheck(f => ({...f, project_id: v}))} options={projects} placeholder="Assign to project (optional)" entityLabel="Project" onCreateNew={async name => { const r = await createProject.mutateAsync({ name }); toast.success(`Project "${name}" created`); return r; }} />
                    </div>
                    <div>
                      {fld('Memo')}
                      <Input className="rounded-none h-10" value={formCheck.memo} onChange={e => setFormCheck(f => ({...f, memo: e.target.value}))} placeholder="Optional memo" />
                    </div>
                  </div>
                )}

                <FormNav step={checkStep} total={2} onBack={() => setCheckStep(s => s-1)} onNext={() => { if (!formCheck.amount || !formCheck.payee_name){toast.error('Amount and payee required');return;} setCheckStep(s=>s+1); }} submitLabel="Create Check" isPending={checkUpsert.isPending} />
              </form>
            </>
          )}

        </DialogContent>
      </Dialog>

      <LedgerMobileSheet row={detailRow} onClose={() => setDetailRow(null)} onToggleReconcile={toggleReconcile} onExport={exportLedgerRecord} onExportExcel={exportLedgerRecordExcel} onEdit={openEdit} />
    </AppShell>
  );
}
