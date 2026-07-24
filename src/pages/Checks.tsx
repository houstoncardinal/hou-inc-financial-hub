import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { useChecks, useDelete, useProjects, useQuickCreate, useUpsert } from '@/hooks/useFinance';
import { fmtDate, fmtUSD, todayLocalDate } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import DigitalCheck from '@/components/DigitalCheck';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import {
  Trash2, Eye, Pencil, Table2, FileText, AlertTriangle, Search, CheckCircle2,
  Clock3, PlusCircle, X, Landmark, ShieldCheck, CalendarDays, Building2,
  Settings2, CircleDollarSign, Ban, ReceiptText,
} from 'lucide-react';
import { generateCheckRegisterReport, savePDF, downloadCheckExcel } from '@/lib/reports';
import { toast } from 'sonner';
import { useEntity } from '@/contexts/EntityContext';
import { screenHeaderFor } from '@/lib/entityFinance';
import { FinanceRangePicker, financeRangeLabel, isInFinanceRange } from '@/lib/financeTime';
import { useFinanceChangelog } from '@/hooks/useFinanceChangelog';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';

const CHK_CSS = `
.chk-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.2),transparent 180px);}
.chk-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05);}
.chk-panel:hover{box-shadow:0 7px 24px rgba(10,10,10,0.075);}
.chk-metric{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05);position:relative;overflow:hidden;}
.chk-metric:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#9D7E3F,#d8bd73);}
.chk-intel-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;transition:box-shadow .18s,transform .18s,border-color .18s;position:relative;overflow:visible;background-image:linear-gradient(145deg,rgba(157,126,63,0.045),transparent 42%);}
.chk-intel-card:hover{box-shadow:0 8px 22px rgba(10,10,10,0.08),0 2px 8px rgba(10,10,10,0.035);transform:translateY(-1px);border-color:hsl(var(--foreground)/0.2);z-index:30;}
.chk-intel-card:before{content:"";position:absolute;inset:0;border:1px solid rgba(255,255,255,0.42);pointer-events:none;}
.chk-spark{height:46px;min-width:92px;}
.chk-card-foot{border-top:1px solid hsl(var(--border)/0.65);background:hsl(var(--secondary)/0.22);}
.chk-card-toggle{border:1px solid hsl(var(--border));background:hsl(var(--background));box-shadow:0 1px 0 rgba(255,255,255,0.45) inset;transition:background .16s,border-color .16s,transform .16s;}
.chk-card-toggle:hover{background:hsl(var(--secondary)/0.55);border-color:hsl(var(--foreground)/0.18);transform:translateY(-1px);}
.chk-card-toggle[data-active="true"]{border-color:rgba(157,126,63,0.45);background:rgba(157,126,63,0.08);}
.chk-row:hover{background-color:hsl(var(--secondary)/0.42)!important;}
.chk-mobile-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;background-image:linear-gradient(145deg,rgba(157,126,63,0.035),transparent 48%);}
.chk-mini-pill{height:21px;padding:0 7px;border:1px solid hsl(var(--border));background:hsl(var(--secondary)/0.36);display:inline-flex;align-items:center;font-size:8px;text-transform:uppercase;letter-spacing:.13em;font-weight:800;color:hsl(var(--foreground)/0.66);}
.chk-table-grid{min-width:1060px;grid-template-columns:.58fr 1.08fr 1fr .68fr .68fr .82fr .78fr .72fr .78fr .78fr 56px;}
.chk-action{border:1px solid hsl(var(--border));background:hsl(var(--background));height:34px;padding:0 10px;font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.chk-action:hover{background:hsl(var(--secondary)/0.55);}
.chk-inspector-backdrop{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.42);backdrop-filter:blur(2px);}
.chk-inspector{position:fixed;z-index:71;background:#fff;color:#111;border:1px solid #ddd;box-shadow:0 24px 90px rgba(0,0,0,.26);inset:auto 0 0 0;max-height:90vh;overflow:auto;}
.chk-inspector-header{position:sticky;top:0;z-index:2;background:linear-gradient(180deg,#fff,#fbfbfb);border-bottom:1px solid #e5e5e5;}
.chk-inspector-header:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:#9D7E3F;}
.chk-detail-card{border:1px solid #e4e4e4;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.035);}
.chk-detail-label{font-size:8px;text-transform:uppercase;letter-spacing:.18em;color:#777;font-weight:800;}
.chk-detail-value{font-size:12px;color:#111;font-weight:700;line-height:1.35;word-break:break-word;}
.chk-status-pill{display:inline-flex;align-items:center;height:24px;padding:0 9px;border:1px solid #ddd;background:#f7f7f7;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:#333;}
@media(min-width:768px){.chk-inspector{inset:0 0 0 auto;width:min(540px,42vw);max-height:none;border-top:0;border-bottom:0;}}
.dark .chk-panel,.dark .chk-metric,.dark .chk-mobile-card,.dark .chk-intel-card,.dark .chk-card-toggle{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
`;

const CHECK_CARD_STORAGE_KEY = 'hou-finance-check-card-selection';
const DEFAULT_CHECK_CARDS = ['issued', 'open', 'cleared', 'reconcile'] as const;

function CheckSpark({
  data,
  dataKey,
  color,
  type = 'area',
  label,
}: {
  data: any[];
  dataKey: string;
  color: string;
  type?: 'area' | 'bar';
  label: string;
}) {
  const gradientId = `chk-${dataKey.replace(/[^a-z0-9]/gi, '-')}`;
  return (
    <div className="chk-spark shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data}>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <RechartsTooltip
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              cursor={{ fill: `${color}14` }}
              formatter={(value: number) => [dataKey.includes('amount') ? fmtUSD(value) : value, label]}
              labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <RechartsTooltip
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              cursor={{ stroke: `${color}55`, strokeWidth: 1 }}
              formatter={(value: number) => [dataKey.includes('amount') ? fmtUSD(value) : value, label]}
              labelStyle={{ color: '#111827', fontSize: 11, fontWeight: 700 }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradientId})`} strokeWidth={2} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

const fieldValue = (value: any) => {
  if (value === undefined || value === null || value === '') return '—';
  return value;
};

function DetailField({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="chk-detail-card px-3 py-2 min-w-0">
      <div className="chk-detail-label">{label}</div>
      <div className={`chk-detail-value mt-1 ${mono ? 'font-mono-tab' : ''}`}>{fieldValue(value)}</div>
    </div>
  );
}

function CheckTransactionInspector({
  check,
  onClose,
  onEdit,
  onStatus,
}: {
  check: any;
  onClose: () => void;
  onEdit: (check: any) => void;
  onStatus: (check: any, status: string) => void;
}) {
  if (!check) return null;
  const retainagePct = Number(check.retainage_pct || 0);
  const amount = Number(check.amount || 0);
  const retainageHeld = Number(check.retainage_held || (retainagePct > 0 ? amount * retainagePct / 100 : 0));
  const netReleased = amount - retainageHeld;

  return (
    <>
      <div className="chk-inspector-backdrop" onClick={onClose} />
      <aside className="chk-inspector" role="dialog" aria-label="Transaction Inspector">
        <div className="chk-inspector-header px-4 sm:px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[8px] uppercase tracking-[0.24em] font-black text-[#9D7E3F]">Transaction Inspector</div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-1 truncate">Check #{check.check_number || 'Draft'}</h2>
              <p className="text-[11px] text-[#666] mt-1 truncate">{check.payee_name || 'Unassigned payee'} · {check.projects?.name || 'No project assigned'}</p>
            </div>
            <button className="h-9 w-9 border border-[#ddd] bg-white flex items-center justify-center shrink-0" onClick={onClose} aria-label="Close inspector">
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="chk-detail-card px-3 py-2">
              <div className="chk-detail-label">Amount</div>
              <div className="text-base font-black font-mono-tab mt-1">{fmtUSD(amount)}</div>
            </div>
            <div className="chk-detail-card px-3 py-2">
              <div className="chk-detail-label">Status</div>
              <div className="mt-1"><span className="chk-status-pill">{check.status || 'pending'}</span></div>
            </div>
            <div className="chk-detail-card px-3 py-2">
              <div className="chk-detail-label">Net</div>
              <div className="text-base font-black font-mono-tab mt-1">{fmtUSD(netReleased)}</div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-[#9D7E3F]" strokeWidth={1.6} />
              <div className="text-[9px] uppercase tracking-[0.24em] font-black text-[#555]">Instrument Details</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Check Number" value={check.check_number} mono />
              <DetailField label="Payee" value={check.payee_name} />
              <DetailField label="Vendor Record" value={check.vendors?.name} />
              <DetailField label="Reference" value={check.external_reference} mono />
              <DetailField label="Memo" value={check.memo} />
              <DetailField label="Bank Account" value={check.bank_account_id || check.bank_account} mono />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-[#9D7E3F]" strokeWidth={1.6} />
              <div className="text-[9px] uppercase tracking-[0.24em] font-black text-[#555]">Dates & Workflow</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Issue Date" value={fmtDate(check.issue_date)} />
              <DetailField label="Posting Date" value={fmtDate(check.posting_date)} />
              <DetailField label="Cleared Date" value={fmtDate(check.cleared_date)} />
              <DetailField label="Void Date" value={fmtDate(check.void_date)} />
              <DetailField label="Approval" value={check.approval_status} />
              <DetailField label="Reconciliation" value={check.reconciliation_status} />
              <DetailField label="Print" value={check.print_status} />
              <DetailField label="Delivery" value={check.delivery_status} />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-[#9D7E3F]" strokeWidth={1.6} />
              <div className="text-[9px] uppercase tracking-[0.24em] font-black text-[#555]">Project Costing</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Project" value={check.projects?.name} />
              <DetailField label="Cost Code" value={check.cost_code_id} mono />
              <DetailField label="Division" value={check.construction_division_id} mono />
              <DetailField label="Phase" value={check.project_phase_id} mono />
              <DetailField label="Scope / SOV" value={check.scope_item_id} mono />
              <DetailField label="Change Order" value={check.change_order_id} mono />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9D7E3F]" strokeWidth={1.6} />
              <div className="text-[9px] uppercase tracking-[0.24em] font-black text-[#555]">Compliance</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Lien Waiver" value={check.lien_waiver_status || 'not_required'} />
              <DetailField label="Retainage %" value={retainagePct ? `${retainagePct}%` : '—'} mono />
              <DetailField label="Retainage Held" value={retainageHeld ? fmtUSD(retainageHeld) : '—'} mono />
              <DetailField label="Attachment Count" value={check.attachment_count} mono />
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 sm:-mx-5 -mb-5 border-t border-[#ddd] bg-white/95 backdrop-blur px-4 sm:px-5 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button className="rounded-none bg-foreground text-background" onClick={() => onEdit(check)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
              </Button>
              <Button variant="outline" className="rounded-none" onClick={() => onStatus(check, 'cleared')}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Clear
              </Button>
              <Button variant="outline" className="rounded-none" onClick={() => onStatus(check, 'pending')}>
                <Clock3 className="w-3.5 h-3.5 mr-1.5" />Open
              </Button>
              <Button variant="outline" className="rounded-none" onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Checks() {
  const navigate = useNavigate();
  const { entity } = useEntity();
  const isHoldings = entity?.id === 'houston-enterprise-holdings';
  const logFinanceChange = useFinanceChangelog();
  const { data: checks = [] } = useChecks();
  const { data: projects = [] } = useProjects();
  const upsert = useUpsert('checks', [['checks']]);
  const del = useDelete('checks', [['checks']]);
  const createProject = useQuickCreate('projects');

  const updateStatus = async (check: any, newStatus: string) => {
    try {
      const now = todayLocalDate();
      await upsert.mutateAsync({
        ...check,
        status: newStatus,
        reconciliation_status: newStatus === 'cleared' ? 'reconciled' : newStatus === 'voided' ? check.reconciliation_status : 'unreconciled',
        cleared_date: newStatus === 'cleared' ? (check.cleared_date || now) : null,
      });
      toast.success(`Check #${check.check_number} → ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };
  const [q, setQ] = useState(''); const [statusFilter, setStatusFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [detailRow, setDetailRow] = useState<any>(null);
  const [editCheck, setEditCheck] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSignature, setCorrectionSignature] = useState('');
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [selectedCheckCardIds, setSelectedCheckCardIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_CHECK_CARDS];
    const saved = window.localStorage.getItem(CHECK_CARD_STORAGE_KEY);
    if (!saved) return [...DEFAULT_CHECK_CARDS];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_CHECK_CARDS];
    } catch {
      return [...DEFAULT_CHECK_CARDS];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CHECK_CARD_STORAGE_KEY, JSON.stringify(selectedCheckCardIds));
  }, [selectedCheckCardIds]);

  const openEdit = (c: any) => {
    setDetailRow(null);
    setEditCheck(c);
    setCorrectionReason('');
    setCorrectionSignature('');
    setEditForm({
      check_number: c.check_number || '',
      amount: c.amount,
      payee_name: c.payee_name,
      issue_date: c.issue_date || '',
      posting_date: c.posting_date || c.issue_date || '',
      cleared_date: c.cleared_date || '',
      memo: c.memo || '',
      project_id: c.project_id || '',
      retainage_pct: c.retainage_pct ?? 0,
      lien_waiver_status: c.lien_waiver_status || 'not_required',
      approval_status: c.approval_status || 'approved',
      reconciliation_status: c.reconciliation_status || 'unreconciled',
      print_status: c.print_status || 'not_printed',
      delivery_status: c.delivery_status || 'not_delivered',
    });
  };

  const saveEdit = async () => {
    if (!editCheck) return;
    if (!correctionReason.trim()) {
      toast.error('Correction reason is required');
      return;
    }
    if (!correctionSignature.trim()) {
      toast.error('Digital signature is required');
      return;
    }
    const retainagePct = parseFloat(editForm.retainage_pct) || 0;
    if (retainagePct < 0 || retainagePct > 100) {
      toast.error('Retainage must be between 0% and 100%');
      return;
    }
    const signedAt = new Date().toISOString();
    try {
      const corrected = {
        ...editCheck,
        ...editForm,
        amount: parseFloat(editForm.amount) || 0,
        retainage_pct: retainagePct,
        retainage_held: retainagePct && editForm.amount
          ? (parseFloat(editForm.amount) || 0) * (retainagePct / 100)
          : 0,
        project_id: editForm.project_id || null,
        posting_date: editForm.posting_date || editForm.issue_date || null,
        cleared_date: editForm.cleared_date || null,
      };
      await upsert.mutateAsync(corrected);
      await logFinanceChange({
        action: 'signed_check_correction',
        entity: 'check',
        entityId: editCheck.id,
        entityLabel: `Check #${editCheck.check_number || editForm.check_number || editCheck.id}`,
        details: {
          reason: correctionReason.trim(),
          signature: correctionSignature.trim(),
          signed_at: signedAt,
          previous: editCheck,
          current: corrected,
        },
      });
      toast.success(`Check #${editCheck.check_number} updated`);
      setEditCheck(null);
      setDetailRow(null);
    } catch (e: any) { toast.error(e?.message || 'Failed to save'); }
  };

  const filtered = useMemo(() => checks.filter((c: any) => {
    if (!isInFinanceRange(c.issue_date, timePeriod)) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.check_number?.toLowerCase().includes(s)
      || c.payee_name?.toLowerCase().includes(s)
      || c.entity_label?.toLowerCase().includes(s)
      || c.projects?.name?.toLowerCase().includes(s);
  }), [checks, q, statusFilter, timePeriod]);
  const CHECKS_PAGE_SIZE = 20;
  const { page: checksPage, setPage: setChecksPage, pageCount: checksPageCount, paged: pagedChecks } =
    usePagination(filtered, CHECKS_PAGE_SIZE, `${q}|${statusFilter}|${timePeriod}`);
  const payeeLabel = (c: any) => {
    const base = c.payee_name || 'Unassigned payee';
    return isHoldings && c.entity_label ? `${c.entity_label} · ${base}` : base;
  };
  const projectLabel = (c: any) => {
    const base = c.projects?.name || 'Unassigned project';
    return isHoldings && c.entity_label ? `${c.entity_label} portfolio · ${base}` : base;
  };

  const selectedRangeLabel = financeRangeLabel(timePeriod);
  const metrics = useMemo(() => {
    const pending = filtered.filter((c: any) => c.status === 'pending');
    const cleared = filtered.filter((c: any) => c.status === 'cleared');
    const voided = filtered.filter((c: any) => c.status === 'voided');
    const totalAmount = filtered.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const pendingAmount = pending.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const clearedAmount = cleared.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const voidedAmount = voided.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const retainageAmount = filtered.reduce((s: number, c: any) => s + Number(c.retainage_held || 0), 0);
    const lienPending = filtered.filter((c: any) => c.lien_waiver_status === 'pending').length;
    /* Must match reconciliation_status alone — the per-row badge a few lines
       down in the JSX shows this same raw field, so counting "cleared" as
       reconciled here (clearing and reconciling are separate steps) made the
       KPI% claim more checks were reconciled than the row badges agreed with. */
    const reconciled = filtered.filter((c: any) => c.reconciliation_status === 'reconciled');
    const avgAmount = filtered.length ? totalAmount / filtered.length : 0;
    const reconciliationRate = filtered.length ? Math.round((reconciled.length / filtered.length) * 100) : 0;
    const oldestOpenDays = pending.reduce((max: number, c: any) => {
      if (!c.issue_date) return max;
      const days = Math.max(0, Math.floor((Date.now() - new Date(c.issue_date).getTime()) / 86400000));
      return Math.max(max, days);
    }, 0);
    return {
      pending, cleared, voided, totalAmount, pendingAmount, clearedAmount,
      voidedAmount, retainageAmount, lienPending, reconciled,
      avgAmount, reconciliationRate, oldestOpenDays,
    };
  }, [filtered]);

  const checkTrend = useMemo(() => {
    const buckets = new Map<string, any>();
    filtered.forEach((c: any) => {
      const key = String(c.issue_date || c.created_at || '').slice(0, 10) || 'Unscheduled';
      const existing = buckets.get(key) || {
        date: key,
        label: key === 'Unscheduled' ? '—' : new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount: 0,
        pending: 0,
        cleared: 0,
        lien: 0,
        voided: 0,
        retainage: 0,
        reconciled: 0,
        count: 0,
      };
      const amount = Number(c.amount || 0);
      existing.amount += amount;
      existing.count += 1;
      existing.retainage += Number(c.retainage_held || 0);
      if (c.status === 'pending') existing.pending += 1;
      if (c.status === 'cleared') existing.cleared += 1;
      if (c.status === 'voided') existing.voided += 1;
      if (c.lien_waiver_status === 'pending') existing.lien += 1;
      if (c.reconciliation_status === 'reconciled') existing.reconciled += 1;
      buckets.set(key, existing);
    });
    const sorted = Array.from(buckets.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return sorted.length ? sorted.slice(-8) : [{ label: 'No data', amount: 0, pending: 0, cleared: 0, lien: 0, voided: 0, retainage: 0, reconciled: 0, count: 0 }];
  }, [filtered]);

  const checkCardCatalog = useMemo(() => ([
    {
      id: 'issued',
      label: 'Issued Value',
      value: fmtUSD(metrics.totalAmount),
      sub: `${filtered.length} checks in ${selectedRangeLabel}`,
      icon: FileText,
      color: '#9D7E3F',
      chartKey: 'amount',
      chartType: 'area' as const,
      chartLabel: 'Issued value',
      aux: `${metrics.voided.length} voided · ${fmtUSD(metrics.avgAmount)} avg`,
    },
    {
      id: 'open',
      label: 'Open Checks',
      value: String(metrics.pending.length),
      sub: `${fmtUSD(metrics.pendingAmount)} awaiting clearance`,
      icon: Clock3,
      color: '#f59e0b',
      chartKey: 'pending',
      chartType: 'bar' as const,
      chartLabel: 'Open checks',
      aux: `${metrics.oldestOpenDays}d oldest open`,
    },
    {
      id: 'cleared',
      label: 'Cleared',
      value: String(metrics.cleared.length),
      sub: `${fmtUSD(metrics.clearedAmount)} bank matched`,
      icon: CheckCircle2,
      color: '#10b981',
      chartKey: 'cleared',
      chartType: 'bar' as const,
      chartLabel: 'Cleared checks',
      aux: `${metrics.reconciliationRate}% reconciliation coverage`,
    },
    {
      id: 'reconcile',
      label: 'Reconciliation',
      value: `${metrics.reconciliationRate}%`,
      sub: `${metrics.reconciled.length} checks reconciled`,
      icon: ShieldCheck,
      color: '#2563eb',
      chartKey: 'reconciled',
      chartType: 'area' as const,
      chartLabel: 'Reconciled checks',
      aux: `${filtered.length - metrics.reconciled.length} remaining`,
    },
    {
      id: 'lien',
      label: 'Lien Follow-Up',
      value: String(metrics.lienPending),
      sub: 'Waivers pending',
      icon: AlertTriangle,
      color: '#ef4444',
      chartKey: 'lien',
      chartType: 'bar' as const,
      chartLabel: 'Pending lien waivers',
      aux: 'Compliance queue',
    },
    {
      id: 'average',
      label: 'Average Check',
      value: fmtUSD(metrics.avgAmount),
      sub: 'Mean instrument value',
      icon: CircleDollarSign,
      color: '#111827',
      chartKey: 'amount',
      chartType: 'area' as const,
      chartLabel: 'Issued value',
      aux: `${filtered.length} instrument sample`,
    },
    {
      id: 'retainage',
      label: 'Retainage Held',
      value: fmtUSD(metrics.retainageAmount),
      sub: 'Subcontractor holdback',
      icon: ReceiptText,
      color: '#7c3aed',
      chartKey: 'retainage',
      chartType: 'area' as const,
      chartLabel: 'Retainage',
      aux: 'Held against issued checks',
    },
    {
      id: 'voided',
      label: 'Voided Checks',
      value: String(metrics.voided.length),
      sub: `${fmtUSD(metrics.voidedAmount)} removed from active flow`,
      icon: Ban,
      color: '#6b7280',
      chartKey: 'voided',
      chartType: 'bar' as const,
      chartLabel: 'Voided checks',
      aux: 'Audit-sensitive instruments',
    },
  ]), [filtered.length, metrics, selectedRangeLabel]);

  const visibleCheckCards = selectedCheckCardIds
    .map(id => checkCardCatalog.find(card => card.id === id))
    .filter(Boolean);

  const updateSelectedCards = (nextIds: string[], reason: string) => {
    if (!nextIds.length) {
      toast.error('Keep at least one checks card visible.');
      return;
    }
    const previous = selectedCheckCardIds;
    setSelectedCheckCardIds(nextIds);
    void logFinanceChange({
      action: 'preference_updated',
      entity: 'checks_dashboard',
      entityId: 'checks_metric_cards',
      entityLabel: 'Checks dashboard metric cards',
      details: {
        reason,
        previous,
        current: nextIds,
      },
    });
  };

  /* ── PDF Export ── */
  const exportPDF = () => {
    const doc = generateCheckRegisterReport(filtered, statusFilter !== 'all' ? `${statusFilter} · ${selectedRangeLabel}` : selectedRangeLabel, entity?.name);
    savePDF(doc, `hou-check-register-${todayLocalDate()}.pdf`);
    toast.success(`Check register exported as PDF · ${selectedRangeLabel}`);
  };

  /* ── Excel Export ── */
  const exportExcel = () => {
    downloadCheckExcel(filtered);
    toast.success(`Check register exported as Excel · ${selectedRangeLabel}`);
  };

  return (
    <AppShell>
      <style>{CHK_CSS}</style>
      <PageHeader eyebrow="Instruments"
        title={screenHeaderFor(entity?.id, 'checks', { title: 'Check Ledger', description: 'Issued instruments, payee assignment, and clearance state.' }).title}
        description={screenHeaderFor(entity?.id, 'checks', { title: 'Check Ledger', description: 'Issued instruments, payee assignment, and clearance state.' }).description}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} />
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportExcel}><Table2 className="w-4 h-4" /></Button>
            </div>
            <Button className="rounded-none bg-foreground text-background hover:bg-foreground/90" onClick={() => navigate(entity?.id === 'houston-generator-pros' ? '/concierge?start=check&memo=HGP%20supplier%20payment' : '/concierge?start=check')}>
              <PlusCircle className="w-4 h-4 mr-1.5" /> New Check
            </Button>
          </div>
        } />

      <div className="chk-shell border-t border-border/50">
      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border grid grid-cols-2 gap-2">
        <FinanceRangePicker value={timePeriod} onChange={setTimePeriod} accentColor={entity?.color} className="col-span-2" />
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportExcel}><Table2 className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
      </div>

      <div className="px-4 sm:px-8 py-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] font-black text-foreground/55">Checks Intelligence · {selectedRangeLabel}</div>
            <div className="text-sm font-semibold tracking-tight mt-0.5">Customize the operational cards that matter most to check control.</div>
          </div>
          <button
            type="button"
            className="h-8 px-1 text-[10px] uppercase tracking-[0.16em] font-black self-start sm:self-auto text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            onClick={() => setCardPickerOpen(open => !open)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Customize
          </button>
        </div>

        {cardPickerOpen && (
          <div className="chk-panel p-2.5 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {checkCardCatalog.map(card => {
                const active = selectedCheckCardIds.includes(card.id);
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    data-active={active}
                    onClick={() => {
                      const next = active
                        ? selectedCheckCardIds.filter(id => id !== card.id)
                        : [...selectedCheckCardIds, card.id];
                      updateSelectedCards(next, active ? `hid ${card.label}` : `showed ${card.label}`);
                    }}
                    className="chk-card-toggle p-2 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 border border-border bg-secondary/35 flex items-center justify-center shrink-0" style={{ color: card.color }}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold truncate">{card.label}</div>
                        <div className="text-[8px] uppercase tracking-[0.16em] text-foreground/50 font-bold">{active ? 'Visible' : 'Hidden'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none h-7 text-[10px]"
                onClick={() => updateSelectedCards([...DEFAULT_CHECK_CARDS], 'reset checks card selection')}
              >
                Reset cards
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {visibleCheckCards.map((card: any) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="chk-intel-card min-w-0">
                <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: card.color }} />
                <div className="relative flex items-start justify-between gap-3 p-2.5 sm:p-3 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] font-bold text-foreground/60 mb-1">
                      <Icon className="w-3 h-3" strokeWidth={1.7} /> {card.label}
                    </div>
                    <div className="text-lg font-bold font-mono-tab leading-tight truncate">{card.value}</div>
                    <div className="text-[9px] text-foreground/60 mt-1 truncate">{card.sub}</div>
                  </div>
                  <CheckSpark data={checkTrend} dataKey={card.chartKey} color={card.color} type={card.chartType} label={card.chartLabel} />
                </div>
                <div className="chk-card-foot relative px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/48 truncate">{card.chartLabel}</span>
                  <span className="text-[9px] font-mono-tab font-semibold text-foreground/68 truncate">{card.aux}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-3 border-b border-border/60">
        <div className="chk-panel p-3 flex flex-col lg:flex-row gap-2 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={1.5} />
            <Input placeholder="Search check #, payee, project…" value={q} onChange={e => setQ(e.target.value)} className="rounded-none h-10 w-full pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-none w-full lg:w-44 h-10"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
          </Select>
          <div className="lg:ml-auto text-[10px] text-muted-foreground font-mono-tab">{filtered.length} of {checks.length} · {selectedRangeLabel}</div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4">
        {/* Mobile card view */}
        <div className="lg:hidden space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No checks issued.</div>
          ) : pagedChecks.map((c: any) => (
            <div key={c.id} className="chk-mobile-card p-2.5 space-y-2 cursor-pointer" onClick={() => setDetailRow(c)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-foreground/45 font-bold">Check #{c.check_number || 'Draft'}</div>
                  <div className="text-sm font-bold truncate mt-0.5">{payeeLabel(c)}</div>
                  <div className="text-[10px] text-foreground/55 truncate">{projectLabel(c)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-mono-tab">{fmtUSD(c.amount)}</div>
                  <span className="chk-mini-pill mt-1">{c.status || 'pending'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.retainage_pct > 0 && (
                    <span className="chk-mini-pill text-blue-500 border-blue-500/20 bg-blue-500/10">
                      {c.retainage_pct}% retained
                    </span>
                  )}
                  {c.lien_waiver_status === 'pending' && (
                    <span className="chk-mini-pill text-warning border-warning/20 bg-warning/10">Lien pending</span>
                  )}
                </div>
                <span className="text-[10px] text-foreground/55 font-mono-tab">{fmtDate(c.issue_date)}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="uppercase tracking-[0.14em] text-foreground/45">Reconcile</div>
                  <div className="truncate text-foreground/75">{(c.reconciliation_status || 'unreconciled').replace(/_/g, ' ')}</div>
                </div>
                <div className="border border-border/70 bg-secondary/25 px-2 py-1 min-w-0">
                  <div className="uppercase tracking-[0.14em] text-foreground/45">Approval</div>
                  <div className="truncate text-foreground/75">{(c.approval_status || 'approved').replace(/_/g, ' ')}</div>
                </div>
              </div>
              <div className="hidden items-center justify-between text-xs text-muted-foreground">
                <span>{c.projects?.name || '—'}</span>
                <span>{fmtDate(c.issue_date)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <Select value={c.status} onValueChange={v => updateStatus(c, v)}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border w-[calc(100%-2rem)]">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="rounded-none h-7 flex-1 text-[10px]" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="rounded-none h-7 w-7 text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Void this check?</AlertDialogTitle><AlertDialogDescription>This permanently removes check #{c.check_number} from the ledger.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={() => del.mutate(c.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        <PaginationBar page={checksPage} pageCount={checksPageCount} total={filtered.length} pageSize={CHECKS_PAGE_SIZE}
          onPageChange={setChecksPage} itemLabel="checks" className="lg:hidden mt-3" />

        {/* Desktop table */}
        <div className="hidden lg:block chk-panel overflow-x-auto">
          <div className="chk-table-grid grid gap-2 px-3 py-2 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
            <div>Check #</div>
            <div>Payee</div>
            <div>Project</div>
            <div>Issue</div>
            <div>Cleared</div>
            <div>Compliance</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Retainage</div>
            <div>Workflow</div>
            <div>Reconcile</div>
            <div className="text-right">—</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">No checks issued.</div>
          ) : pagedChecks.map((c: any) => (
            <div key={c.id} className="chk-table-grid grid gap-2 px-3 py-2 border-b border-border last:border-b-0 text-[12px] font-mono-tab chk-row items-center cursor-pointer" onClick={() => setDetailRow(c)}>
              <div className="font-semibold truncate text-[11px]">#{c.check_number || 'Draft'}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{payeeLabel(c)}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.vendors?.name || c.external_reference || c.memo || 'No vendor reference'}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-foreground/85">{projectLabel(c)}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.cost_code_id ? `Cost ${c.cost_code_id}` : 'No cost code'}</div>
              </div>
              <div className="text-muted-foreground text-[11px]">{fmtDate(c.issue_date)}</div>
              <div className="text-muted-foreground text-[11px]">{fmtDate(c.cleared_date)}</div>
              <div className="flex items-center gap-1.5">
                {c.lien_waiver_status === 'pending' && (
                  <span title="Lien waiver pending"><AlertTriangle className="w-3.5 h-3.5 text-warning" /></span>
                )}
                {c.lien_waiver_status === 'received' && (
                  <span className="text-[8px] font-bold text-positive">✓</span>
                )}
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground truncate">{(c.lien_waiver_status || 'not_required').replace(/_/g, ' ')}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{fmtUSD(c.amount)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{Number(c.retainage_pct || 0) > 0 ? `${c.retainage_pct}%` : '—'}</div>
                <div className="text-[9px] text-muted-foreground">{Number(c.retainage_held || 0) > 0 ? fmtUSD(c.retainage_held) : ''}</div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <Select value={c.status} onValueChange={v => updateStatus(c, v)}>
                  <SelectTrigger className="rounded-none h-7 text-[10px] uppercase tracking-wider px-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground truncate">{(c.reconciliation_status || 'unreconciled').replace(/_/g, ' ')}</div>
                <div className="text-[9px] text-muted-foreground truncate">{(c.approval_status || 'approved').replace(/_/g, ' ')}</div>
              </div>
              <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none"><Eye className="w-3.5 h-3.5" /></Button></DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-none p-0 border-border">
                    <DigitalCheck checkNumber={c.check_number} payee={c.payee_name} amount={Number(c.amount)} date={c.issue_date} memo={c.memo} status={c.status} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none">
                    <AlertDialogHeader><AlertDialogTitle>Void this check?</AlertDialogTitle><AlertDialogDescription>This permanently removes check #{c.check_number} from the ledger.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground" onClick={() => del.mutate(c.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {filtered.length > CHECKS_PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-border">
              <PaginationBar page={checksPage} pageCount={checksPageCount} total={filtered.length} pageSize={CHECKS_PAGE_SIZE}
                onPageChange={setChecksPage} itemLabel="checks" />
            </div>
          )}
        </div>
      </div>

      <CheckTransactionInspector
        check={detailRow}
        onClose={() => setDetailRow(null)}
        onEdit={openEdit}
        onStatus={updateStatus}
      />

      {/* Edit check dialog */}
      <Dialog open={!!editCheck} onOpenChange={open => { if (!open) { setEditCheck(null); setCorrectionReason(''); setCorrectionSignature(''); } }}>
        <DialogContent className="rounded-none max-w-3xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-[8px] uppercase tracking-[0.28em] font-black text-[#9D7E3F]">Signed Check Correction</div>
            <DialogTitle className="text-base font-semibold tracking-tight">Correct Check #{editCheck?.check_number}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Edits to issued checks require a reason, digital signature, and timestamp. The correction is written to the finance changelog.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-border bg-secondary/25 p-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Original amount</div>
                <div className="text-sm font-black font-mono-tab mt-1">{fmtUSD(Number(editCheck?.amount || 0))}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Current status</div>
                <div className="text-sm font-black mt-1 capitalize">{editCheck?.status || 'pending'}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Timestamp</div>
                <div className="text-sm font-black font-mono-tab mt-1">{new Date().toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Check Number</Label>
                <Input value={editForm.check_number || ''} onChange={e => setEditForm((f: any) => ({ ...f, check_number: e.target.value }))} className="rounded-none h-9 text-sm font-mono-tab" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Payee Name</Label>
                <Input value={editForm.payee_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, payee_name: e.target.value }))} className="rounded-none h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Amount</Label>
                <CurrencyInput value={editForm.amount || ''} onValueChange={v => setEditForm((f: any) => ({ ...f, amount: v }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Issue Date</Label>
                <DateInput value={editForm.issue_date || ''} onChange={e => setEditForm((f: any) => ({ ...f, issue_date: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Posting Date</Label>
                <DateInput value={editForm.posting_date || ''} onChange={e => setEditForm((f: any) => ({ ...f, posting_date: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Cleared Date</Label>
                <DateInput value={editForm.cleared_date || ''} onChange={e => setEditForm((f: any) => ({ ...f, cleared_date: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Project Assignment</Label>
              <QuickCreateSelect
                value={editForm.project_id || ''}
                onValueChange={v => setEditForm((f: any) => ({ ...f, project_id: v }))}
                options={projects}
                placeholder="Assign to project"
                entityLabel="Project"
                onCreateNew={async name => {
                  const result = await createProject.mutateAsync({ name });
                  toast.success(`Project "${name}" created`);
                  return result;
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Memo</Label>
              <Input value={editForm.memo || ''} onChange={e => setEditForm((f: any) => ({ ...f, memo: e.target.value }))} className="rounded-none h-9 text-sm" placeholder="Optional memo" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="micro-label">Retainage %</Label>
                <Input type="number" step="0.5" min="0" max="100" value={editForm.retainage_pct || ''} onChange={e => setEditForm((f: any) => ({ ...f, retainage_pct: e.target.value }))} className="rounded-none h-9 text-sm font-mono-tab" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Lien Waiver Status</Label>
                <Select value={editForm.lien_waiver_status || 'not_required'} onValueChange={v => setEditForm((f: any) => ({ ...f, lien_waiver_status: v }))}>
                  <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Reconciliation</Label>
                <Select value={editForm.reconciliation_status || 'unreconciled'} onValueChange={v => setEditForm((f: any) => ({ ...f, reconciliation_status: v }))}>
                  <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Approval</Label>
                <Select value={editForm.approval_status || 'approved'} onValueChange={v => setEditForm((f: any) => ({ ...f, approval_status: v }))}>
                  <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border border-border bg-background p-3 space-y-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-black text-foreground">Correction Authorization</div>
                <p className="text-xs text-muted-foreground mt-1">Explain why the check record changed and sign before saving.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Correction reason *</Label>
                <Input
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  className="rounded-none h-9 text-sm"
                  placeholder="e.g. Corrected project assignment and cleared date after bank reconciliation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Digital signature *</Label>
                <Input
                  value={correctionSignature}
                  onChange={e => setCorrectionSignature(e.target.value)}
                  className="rounded-none h-9 text-sm"
                  placeholder="Type your full name"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="rounded-none h-9 text-xs">Cancel</Button></DialogClose>
            <Button onClick={saveEdit} disabled={upsert.isPending} className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90">
              {upsert.isPending ? 'Saving…' : 'Sign & Save Correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppShell>
  );
}
