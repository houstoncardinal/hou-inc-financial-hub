/* ── People & Payroll ─────────────────────────────────────────────────────
   Workforce roster (W-2 / 1099, trades, rates, burden) and payroll runs.
   Run items carry an optional project so labor lands in job costing; the
   "Mark Paid" action books the total as a Payroll expense transaction so
   cash on hand and the ledger stay truthful. ── */
import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeCheck, HardHat, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { fmtUSD } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useFinance';
import {
  useDeleteEmployee, useDeletePayrollItem, useDeletePayrollRun, useEmployees,
  useMarkPayrollPaid, usePayrollRealtime, usePayrollRuns, useUpsertEmployee,
  useUpsertPayrollItem, useUpsertPayrollRun, type Employee, type PayrollRun,
} from '@/hooks/useErp';

const EMPLOYMENT_TYPES = [
  ['w2_hourly', 'W-2 Hourly'], ['w2_salary', 'W-2 Salary'], ['contractor_1099', '1099 Contractor'],
] as const;
const CADENCES = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

const RUN_STATUS_STYLE: Record<PayrollRun['status'], { fg: string; bg: string }> = {
  draft:    { fg: '#6B7280', bg: '#6B728014' },
  approved: { fg: '#D97706', bg: '#D9770614' },
  paid:     { fg: '#16A34A', bg: '#16A34A14' },
};

function runTotal(run: PayrollRun): number {
  return (run.finance_payroll_items ?? []).reduce((s, i) => s + Number(i.gross_amount || 0) + Number(i.burden_amount || 0), 0);
}

export default function People() {
  const { toast } = useToast();
  usePayrollRealtime();
  const { data: employees = [] } = useEmployees();
  const { data: runs = [] } = usePayrollRuns();
  const { data: projects = [] } = useProjects();
  const upsertEmployee = useUpsertEmployee();
  const deleteEmployee = useDeleteEmployee();
  const upsertRun = useUpsertPayrollRun();
  const deleteRun = useDeletePayrollRun();
  const upsertItem = useUpsertPayrollItem();
  const deleteItem = useDeletePayrollItem();
  const markPaid = useMarkPayrollPaid();

  const [empForm, setEmpForm] = useState<Partial<Employee> | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  const active = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);
  const openRun = useMemo(() => runs.find(r => r.id === openRunId) ?? null, [runs, openRunId]);
  const payrollDue = useMemo(() => runs.filter(r => r.status !== 'paid').reduce((s, r) => s + runTotal(r), 0), [runs]);

  /* ── Real-time payroll analytics: YTD per employee + labor landed per project ── */
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const ytdByEmployee = useMemo(() => {
    const map: Record<string, { gross: number; hours: number; runs: number }> = {};
    runs.filter(r => r.status === 'paid' && r.pay_date >= yearStart).forEach(r => {
      (r.finance_payroll_items ?? []).forEach(i => {
        const e = (map[i.employee_id] ??= { gross: 0, hours: 0, runs: 0 });
        e.gross += Number(i.gross_amount || 0) + Number(i.burden_amount || 0);
        e.hours += Number(i.hours || 0);
        e.runs += 1;
      });
    });
    return map;
  }, [runs, yearStart]);
  const laborByProject = useMemo(() => {
    const map: Record<string, number> = {};
    runs.filter(r => r.status === 'paid').forEach(r => {
      (r.finance_payroll_items ?? []).forEach(i => {
        const key = i.project_id ?? 'overhead';
        map[key] = (map[key] ?? 0) + Number(i.gross_amount || 0) + Number(i.burden_amount || 0);
      });
    });
    return Object.entries(map)
      .map(([id, amount]) => ({ id, name: id === 'overhead' ? 'Overhead (no project)' : ((projects as any[]).find(p => p.id === id)?.name ?? 'Unknown project'), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [runs, projects]);
  const ytdPaidTotal = useMemo(() =>
    runs.filter(r => r.status === 'paid' && r.pay_date >= yearStart).reduce((s, r) => s + runTotal(r), 0), [runs, yearStart]);
  const nextPay = useMemo(() => {
    const open = runs.filter(r => r.status !== 'paid').sort((a, b) => a.pay_date.localeCompare(b.pay_date));
    return open[0] ?? null;
  }, [runs]);

  const saveEmployee = async () => {
    if (!empForm?.name) return;
    await upsertEmployee.mutateAsync(empForm as any);
    setEmpForm(null);
  };

  const createRun = async () => {
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 13);
    const pay = new Date(today); pay.setDate(pay.getDate() + 5);
    const created: any = await upsertRun.mutateAsync({
      period_start: start.toISOString().slice(0, 10),
      period_end: today.toISOString().slice(0, 10),
      pay_date: pay.toISOString().slice(0, 10),
      status: 'draft',
    });
    if (created?.id) setOpenRunId(created.id);
  };

  const addItem = async (run: PayrollRun, emp: Employee) => {
    const hours = emp.employment_type === 'w2_salary' ? 80 : 40;
    const gross = emp.employment_type === 'w2_salary' ? emp.pay_rate : hours * emp.pay_rate;
    await upsertItem.mutateAsync({
      payroll_run_id: run.id, employee_id: emp.id, hours, rate: emp.pay_rate,
      gross_amount: gross, burden_amount: gross * (emp.burden_pct || 0) / 100,
    });
  };

  const handleMarkPaid = async (run: PayrollRun) => {
    await markPaid.mutateAsync(run);
    toast({ title: 'Payroll paid & booked to ledger', description: `${fmtUSD(runTotal(run))} posted as a Payroll-labeled expense (visible on the Expenses screen, dated ${run.pay_date}).` });
  };

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '—';
  const projName = (id: string | null) => (projects as any[]).find(p => p.id === id)?.name ?? 'Overhead';

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workforce"
        title="People & Payroll"
        description="Roster, rates, and payroll runs — labor lands in job costing per project, and paid runs post straight to the ledger."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setEmpForm({ employment_type: 'w2_hourly', pay_cadence: 'biweekly', status: 'active', pay_rate: 0, burden_pct: 22 })}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Employee
            </Button>
            <Button className="rounded-none" onClick={createRun} disabled={upsertRun.isPending}>
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> New Payroll Run
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active Workforce', value: String(active.length), sub: `${employees.length - active.length} inactive`, icon: Users, color: '#0A0A0A' },
          { label: 'Payroll Due', value: fmtUSD(payrollDue), sub: nextPay ? `Next pay date ${nextPay.pay_date}` : 'No open runs', icon: Wallet, color: payrollDue > 0 ? '#DC2626' : '#16A34A' },
          { label: 'Paid YTD', value: fmtUSD(ytdPaidTotal), sub: `${runs.filter(r => r.status === 'paid' && r.pay_date >= yearStart).length} runs booked to ledger`, icon: BadgeCheck, color: '#2563EB' },
          { label: 'Avg Burden', value: `${active.length ? (active.reduce((s, e) => s + Number(e.burden_pct || 0), 0) / active.length).toFixed(0) : 0}%`, sub: 'Taxes + insurance load', icon: BadgeCheck, color: '#D97706' },
        ].map(k => (
          <div key={k.label} className="border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="micro-label">{k.label}</span>
              <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} strokeWidth={1.8} />
            </div>
            <div className="text-lg font-bold font-mono-tab">{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Employee form */}
      {empForm && (
        <div className="border border-border bg-secondary/30 p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="micro-label">Name</Label>
            <Input className="rounded-none h-9 text-sm" value={empForm.name ?? ''} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="micro-label">Title / Trade</Label>
            <Input className="rounded-none h-9 text-sm" value={empForm.trade ?? ''} onChange={e => setEmpForm(f => ({ ...f, trade: e.target.value }))} placeholder="e.g. Framing Lead" /></div>
          <div className="space-y-1"><Label className="micro-label">Type</Label>
            <Select value={empForm.employment_type} onValueChange={v => setEmpForm(f => ({ ...f, employment_type: v as any }))}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{EMPLOYMENT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">{empForm.employment_type === 'w2_salary' ? 'Salary / period' : 'Hourly Rate'}</Label>
            <Input type="number" className="rounded-none h-9 text-sm font-mono-tab" value={empForm.pay_rate ?? 0} onChange={e => setEmpForm(f => ({ ...f, pay_rate: Number(e.target.value) }))} /></div>
          <div className="space-y-1"><Label className="micro-label">Burden %</Label>
            <Input type="number" className="rounded-none h-9 text-sm font-mono-tab" value={empForm.burden_pct ?? 0} onChange={e => setEmpForm(f => ({ ...f, burden_pct: Number(e.target.value) }))} /></div>
          <div className="space-y-1"><Label className="micro-label">Cadence</Label>
            <Select value={empForm.pay_cadence} onValueChange={v => setEmpForm(f => ({ ...f, pay_cadence: v as any }))}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CADENCES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">Phone</Label>
            <Input className="rounded-none h-9 text-sm" value={empForm.phone ?? ''} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div className="flex items-end gap-2">
            <Button className="rounded-none h-9" disabled={!empForm.name || upsertEmployee.isPending} onClick={saveEmployee}>Save</Button>
            <Button variant="outline" className="rounded-none h-9" onClick={() => setEmpForm(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8 items-start">
        {/* Roster */}
        <div className="border border-border bg-background">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <HardHat className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
            <span className="text-sm font-bold">Roster</span>
          </div>
          <div className="divide-y divide-border max-h-[460px] overflow-y-auto">
            {employees.length === 0 && <div className="px-4 py-10 text-center text-xs text-muted-foreground">No employees yet.</div>}
            {employees.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 group">
                <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-secondary text-[10px] font-black">
                  {e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{e.name} {e.status === 'inactive' && <span className="text-[9px] text-muted-foreground">(inactive)</span>}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {e.trade || e.title || '—'} · {EMPLOYMENT_TYPES.find(([v]) => v === e.employment_type)?.[1]} · {fmtUSD(e.pay_rate)}{e.employment_type !== 'w2_salary' ? '/hr' : '/period'} · {e.burden_pct}% burden
                  </span>
                </span>
                <span className="hidden sm:block text-right shrink-0 mr-1">
                  <span className="block text-xs font-bold font-mono-tab">{fmtUSD(ytdByEmployee[e.id]?.gross ?? 0)}</span>
                  <span className="block text-[9px] text-muted-foreground">{(ytdByEmployee[e.id]?.hours ?? 0).toFixed(0)}h YTD</span>
                </span>
                <button onClick={() => setEmpForm(e)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                <button onClick={() => window.confirm(`Remove ${e.name}?`) && deleteEmployee.mutate(e.id)} className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete employee">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payroll runs */}
        <div className="border border-border bg-background">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
            <span className="text-sm font-bold">Payroll Runs</span>
          </div>
          <div className="divide-y divide-border max-h-[460px] overflow-y-auto">
            {runs.length === 0 && <div className="px-4 py-10 text-center text-xs text-muted-foreground">No payroll runs yet.</div>}
            {runs.map(r => {
              const st = RUN_STATUS_STYLE[r.status];
              const isOpen = openRunId === r.id;
              return (
                <div key={r.id}>
                  <button onClick={() => setOpenRunId(isOpen ? null : r.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{r.period_start} → {r.period_end}</span>
                      <span className="block text-[10px] text-muted-foreground">Pay date {r.pay_date} · {(r.finance_payroll_items ?? []).length} entries</span>
                    </span>
                    <span className="text-sm font-bold font-mono-tab">{fmtUSD(runTotal(r))}</span>
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ color: st.fg, backgroundColor: st.bg }}>{r.status}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 bg-secondary/20">
                      {(r.finance_payroll_items ?? []).map(item => (
                        <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-border/60 last:border-b-0">
                          <span className="flex-1 min-w-0 text-xs font-semibold truncate">{empName(item.employee_id)}</span>
                          <span className="text-[10px] text-muted-foreground w-24 truncate">{projName(item.project_id)}</span>
                          <Input type="number" className="rounded-none h-7 w-16 text-xs font-mono-tab px-1.5" defaultValue={item.hours}
                            disabled={r.status === 'paid'}
                            onBlur={e => {
                              const hours = Number(e.target.value);
                              const gross = hours * Number(item.rate || 0);
                              upsertItem.mutate({ ...item, hours, gross_amount: gross, burden_amount: gross * ((employees.find(x => x.id === item.employee_id)?.burden_pct ?? 0) / 100) });
                            }} />
                          <Select value={item.project_id ?? 'overhead'} disabled={r.status === 'paid'}
                            onValueChange={v => upsertItem.mutate({ ...item, project_id: v === 'overhead' ? null : v })}>
                            <SelectTrigger className="rounded-none h-7 w-[130px] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="overhead">Overhead</SelectItem>
                              {(projects as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <span className="text-xs font-bold font-mono-tab w-20 text-right">{fmtUSD(Number(item.gross_amount) + Number(item.burden_amount))}</span>
                          {r.status !== 'paid' && (
                            <button onClick={() => deleteItem.mutate(item.id)} className="text-muted-foreground hover:text-red-600" aria-label="Remove entry">
                              <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                            </button>
                          )}
                        </div>
                      ))}
                      {(r.finance_payroll_items ?? []).length > 0 && (() => {
                        const gross = (r.finance_payroll_items ?? []).reduce((s, i) => s + Number(i.gross_amount || 0), 0);
                        const burden = (r.finance_payroll_items ?? []).reduce((s, i) => s + Number(i.burden_amount || 0), 0);
                        return (
                          <div className="flex items-center justify-end gap-4 pt-2 text-[10px] font-mono-tab">
                            <span className="text-muted-foreground">Gross <span className="font-bold text-foreground">{fmtUSD(gross)}</span></span>
                            <span className="text-muted-foreground">Burden <span className="font-bold text-foreground">{fmtUSD(burden)}</span></span>
                            <span className="text-muted-foreground">Total cost <span className="font-black text-foreground">{fmtUSD(gross + burden)}</span></span>
                          </div>
                        );
                      })()}
                      {r.status !== 'paid' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2.5">
                          <Select onValueChange={v => { const emp = employees.find(e => e.id === v); if (emp) addItem(r, emp); }}>
                            <SelectTrigger className="rounded-none h-8 w-[180px] text-xs"><SelectValue placeholder="+ Add employee…" /></SelectTrigger>
                            <SelectContent>
                              {active.filter(e => !(r.finance_payroll_items ?? []).some(i => i.employee_id === e.id))
                                .map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <span className="flex-1" />
                          {r.status === 'draft' && (
                            <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px]" onClick={() => upsertRun.mutate({ id: r.id, status: 'approved' })}>Approve</Button>
                          )}
                          {r.status === 'approved' && (
                            <Button size="sm" className="rounded-none h-8 text-[11px]" disabled={markPaid.isPending} onClick={() => handleMarkPaid(r)}>Mark Paid & Book</Button>
                          )}
                          <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px] text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => window.confirm('Delete this payroll run?') && deleteRun.mutate(r.id)}>Delete</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Labor landed per project (paid runs → job costing) ── */}
      {laborByProject.length > 0 && (
        <div className="border border-border bg-background mb-8">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-bold">Labor Cost by Project</span>
            <div className="text-[10px] text-muted-foreground">Where paid payroll actually landed — gross + burden from every paid run</div>
          </div>
          <div className="divide-y divide-border">
            {laborByProject.map(row => {
              const max = laborByProject[0]?.amount || 1;
              return (
                <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-44 md:w-64 shrink-0 text-xs font-semibold truncate">{row.name}</span>
                  <span className="flex-1 h-3 bg-secondary relative overflow-hidden">
                    <span className="absolute inset-y-0 left-0" style={{ width: `${(row.amount / max) * 100}%`, backgroundColor: row.id === 'overhead' ? '#9CA3AF' : '#D97706' }} />
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs font-bold font-mono-tab">{fmtUSD(row.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
