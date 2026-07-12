import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProjects, useChecks, useTransactions } from '@/hooks/useFinance';
import { useRole } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD, fmtDate } from '@/lib/format';
import { generateProjectReport, savePDF, downloadCSV } from '@/lib/reports';
import { ArrowLeft, Download, FileText, ArrowUpRight, Plus, ExternalLink, Users, LayoutDashboard } from 'lucide-react';

const STATUS_META_DETAIL = {
  active:    { label: 'Active',    color: 'var(--positive)', cls: 'bg-positive/10 text-positive border-positive/30' },
  on_hold:   { label: 'On Hold',   color: 'var(--warning)',  cls: 'bg-warning/10 text-warning border-warning/30'   },
  completed: { label: 'Completed', color: '#3b82f6',         cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  archived:  { label: 'Archived',  color: 'var(--border)',   cls: 'bg-muted/50 text-muted-foreground border-border' },
} as const;
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const COST_TYPE_LABELS: Record<string, string> = {
  labor: 'Labor', material: 'Materials', subcontract: 'Subcontract',
  permit: 'Permits & Fees', equipment: 'Equipment', overhead: 'Overhead',
};

const PD_CSS = `
.pd-row:hover td,.pd-row:hover{background-color:rgba(157,126,63,0.032)!important;}
`;

export default function ProjectDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const role      = useRole();
  const isAdmin   = role === 'admin';
  const { entity } = useEntity();

  const { data: projects = [] } = useProjects();
  const { data: checks = [] }   = useChecks();
  const { data: income = [] }   = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');

  const [draws, setDraws] = useState<any[]>([]);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawForm, setDrawForm] = useState({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '' });
  const [drawSaving, setDrawSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (supabase as any).from('draw_schedules').select('*').eq('project_id', id).order('scheduled_date').then(({ data }: any) => {
      setDraws(data ?? []);
    });
  }, [id]);

  const saveDrawEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawForm.milestone_name || !drawForm.draw_amount) { toast.error('Milestone name and amount required'); return; }
    setDrawSaving(true);
    try {
      const { data } = await (supabase as any).from('draw_schedules').insert({
        project_id: id,
        milestone_name: drawForm.milestone_name,
        draw_amount: parseFloat(drawForm.draw_amount),
        scheduled_date: drawForm.scheduled_date || null,
        status: drawForm.status,
        notes: drawForm.notes || null,
      }).select().single();
      setDraws(d => [...d, data]);
      toast.success('Draw entry added');
      setDrawOpen(false);
      setDrawForm({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '' });
    } catch { toast.error('Failed to save draw entry'); }
    setDrawSaving(false);
  };

  const updateDrawStatus = async (drawId: string, status: string) => {
    try {
      const { error } = await (supabase as any).from('draw_schedules').update({ status }).eq('id', drawId);
      if (error) throw error;
      setDraws(d => d.map(x => x.id === drawId ? { ...x, status } : x));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update draw status');
    }
  };

  const project = useMemo(() => projects.find((p: any) => p.id === id), [projects, id]);

  const enriched = useMemo(() => {
    if (!project) return null;
    const pChecks = checks.filter((c: any) => c.project_id === project.id);
    const pIn = income.filter((t: any) => t.project_id === project.id);
    const pExp = expenses.filter((t: any) => t.project_id === project.id);
    const pInTotal = pIn.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExpTotal = pExp.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent = pExpTotal + cleared;
    const budget = Number(project.budget);
    return {
      ...project,
      incoming: pInTotal,
      spent,
      outstanding,
      net: pInTotal - spent,
      used: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
      checkCount: pChecks.length,
      txnCount: pIn.length + pExp.length,
      incomeList: pIn,
      expenseList: pExp,
      checksList: pChecks,
    };
  }, [project, checks, income, expenses]);

  const sortedActivity = useMemo(() => {
    if (!enriched) return [];
    const all = [
      ...enriched.incomeList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Income', ref: t.source_name || '—', amount: Number(t.amount) })),
      ...enriched.expenseList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Expense', ref: t.vendors?.name || t.category || '—', amount: -Number(t.amount) })),
      ...enriched.checksList.map((c: any) => ({ id: c.id, date: c.issue_date, type: 'Check', ref: `#${c.check_number} · ${c.payee_name}`, amount: -Number(c.amount) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return all;
  }, [enriched]);

  const costBreakdown = useMemo(() => {
    if (!enriched) return [];
    const byCat: Record<string, { category: string; actual: number; count: number }> = {};
    enriched.expenseList.forEach((t: any) => {
      // Prefer cost_type for construction job-costing; fall back to category
      const cat = (t.cost_type ? COST_TYPE_LABELS[t.cost_type] : null) || t.category || 'Uncategorized';
      if (!byCat[cat]) byCat[cat] = { category: cat, actual: 0, count: 0 };
      byCat[cat].actual += Number(t.amount);
      byCat[cat].count++;
    });
    if (enriched.checksList.length > 0) {
      byCat['Checks Issued'] = {
        category: 'Checks Issued',
        actual: enriched.checksList.reduce((s: number, c: any) => s + Number(c.amount), 0),
        count: enriched.checksList.length,
      };
    }
    return Object.values(byCat).sort((a, b) => b.actual - a.actual);
  }, [enriched]);

  const retainageHeld = useMemo(() => {
    if (!enriched) return 0;
    return enriched.checksList.reduce((s: number, c: any) => s + (Number(c.retainage_held) || 0), 0);
  }, [enriched]);

  /* ── Export ── */
  const exportPDF = () => {
    if (!enriched) return;
    const doc = generateProjectReport([enriched]);
    savePDF(doc, `hou-project-${enriched.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Project report exported');
  };

  const exportCSV = () => {
    if (!sortedActivity) return;
    downloadCSV(
      sortedActivity,
      `hou-project-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Type', 'Reference', 'Amount'],
      (r: any) => [r.date?.slice(0, 10), r.type, r.ref, r.amount]
    );
    toast.success('Activity exported');
  };

  if (!project) {
    return (
      <AppShell>
        <div className="p-8 text-center text-muted-foreground">Project not found.</div>
      </AppShell>
    );
  }

  if (!enriched) return null;

  const statusMeta = STATUS_META_DETAIL[enriched.status as keyof typeof STATUS_META_DETAIL] ?? STATUS_META_DETAIL.archived;

  return (
    <AppShell>
      <style>{PD_CSS}</style>
      <PageHeader
        eyebrow={
          <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Projects
          </button>
        }
        title={enriched.name}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            {enriched.code && <span className="font-mono-tab text-[10px] font-bold bg-secondary px-1.5 py-0.5">{enriched.code}</span>}
            <span className={`text-[8px] uppercase tracking-[0.22em] font-bold px-1.5 py-0.5 border ${statusMeta.cls}`}>{statusMeta.label}</span>
            {entity && <span className="text-[9px] text-muted-foreground">{entity.name}</span>}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-[9px] uppercase tracking-[0.18em] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
              >
                <LayoutDashboard className="w-3 h-3" /> Admin
              </button>
            )}
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
          </div>
        }
      />

      {/* Mobile export */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      {/* Snapshot stats */}
      <div className="border-b border-border">
        {/* Status accent bar */}
        <div className="h-[3px]" style={{ backgroundColor: statusMeta.color }} />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
          {[
            { label: 'Contract Budget',    value: fmtUSD(enriched.budget),   c: '' },
            { label: 'Deployed',           value: fmtUSD(enriched.spent),    c: '' },
            { label: 'Revenue',            value: fmtUSD(enriched.incoming), c: 'text-positive' },
            { label: 'Pending Checks',     value: fmtUSD(enriched.outstanding), c: enriched.outstanding > 0 ? 'text-warning' : '' },
            { label: 'Retainage Held',     value: fmtUSD(retainageHeld),     c: retainageHeld > 0 ? 'text-blue-400' : 'text-muted-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-background px-4 sm:px-5 py-3.5">
              <div className="text-[8px] uppercase tracking-[0.22em] font-bold text-muted-foreground mb-1 leading-tight">{s.label}</div>
              <div className={`text-base sm:text-[17px] font-bold font-mono-tab leading-tight ${s.c}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget utilization */}
          <div className="border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="micro-label">Budget Utilization</div>
              {enriched.used >= 100 && (
                <span className="text-[8px] uppercase tracking-[0.14em] px-2 py-1 border font-medium bg-accent/10 text-accent border-accent/30">
                  Over Budget · {fmtUSD(enriched.spent - enriched.budget)} excess
                </span>
              )}
              {enriched.used >= 80 && enriched.used < 100 && (
                <span className="text-[8px] uppercase tracking-[0.14em] px-2 py-1 border font-medium bg-warning/10 text-warning border-warning/30">
                  Near Limit · {(100 - enriched.used).toFixed(1)}% remaining
                </span>
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{fmtUSD(enriched.spent)} spent of {fmtUSD(enriched.budget)}</span>
              <span className={`font-mono-tab font-semibold ${enriched.used >= 100 ? 'text-accent' : enriched.used >= 80 ? 'text-warning' : ''}`}>
                {enriched.used.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-secondary">
              <div
                className={`h-full transition-all ${enriched.used >= 100 ? 'bg-accent' : enriched.used >= 80 ? 'bg-warning' : 'bg-foreground'}`}
                style={{ width: `${Math.min(enriched.used, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5 font-mono-tab">
              <div><div className="micro-label">Net Position</div><div className={`text-xl font-semibold mt-1 ${enriched.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(enriched.net)}</div></div>
              <div><div className="micro-label">Activity Count</div><div className="text-xl font-semibold mt-1">{sortedActivity.length} entries</div></div>
            </div>
            {enriched.notes && (
              <div className="mt-5 pt-4 border-t border-border">
                <div className="micro-label mb-1.5">Notes</div>
                <p className="text-sm text-muted-foreground">{enriched.notes}</p>
              </div>
            )}
          </div>

          {/* Budget vs. Actuals Line-Item Breakdown */}
          {costBreakdown.length > 0 && (
            <div className="border border-border">
              <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Budget vs. Actuals — Line Item Breakdown
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Category</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Items</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Actual</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">% of Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costBreakdown.map((row) => (
                      <tr key={row.category} className="border-b border-border last:border-b-0 pd-row">
                        <td className="px-4 py-3 font-medium">{row.category}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">{row.count}</td>
                        <td className="px-4 py-3 text-right font-semibold font-mono-tab">{fmtUSD(row.actual)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">
                          {enriched.spent > 0 ? ((row.actual / enriched.spent) * 100).toFixed(1) + '%' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/40">
                      <td className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">{enriched.expenseList.length + enriched.checksList.length}</td>
                      <td className="px-4 py-3 text-right font-bold font-mono-tab">{fmtUSD(enriched.spent)}</td>
                      <td className="px-4 py-3 text-right font-bold font-mono-tab">
                        <span className={enriched.budget > 0 && enriched.spent > enriched.budget ? 'text-accent' : 'text-positive'}>
                          {enriched.budget > 0 ? (enriched.budget > enriched.spent ? '+' : '−') + fmtUSD(Math.abs(enriched.budget - enriched.spent)) + ' vs budget' : '—'}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Draw Schedule */}
          <div className="border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium flex items-center justify-between">
              <span>Draw Schedule</span>
              <Dialog open={drawOpen} onOpenChange={setDrawOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1 text-[10px] text-accent hover:opacity-80 transition-opacity font-bold">
                    <Plus className="w-3 h-3" /> Add Draw
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-md w-[calc(100%-2rem)]">
                  <DialogHeader><DialogTitle>Add Draw Entry</DialogTitle></DialogHeader>
                  <form onSubmit={saveDrawEntry} className="space-y-4">
                    <div className="space-y-1.5"><Label className="micro-label">Milestone</Label><Input className="rounded-none h-10" required placeholder="e.g. Foundation Complete" value={drawForm.milestone_name} onChange={e => setDrawForm(f => ({ ...f, milestone_name: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="micro-label">Draw Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground z-10">$</span>
                          <Input type="number" step="0.01" className="pl-7 rounded-none h-10 font-mono-tab text-right" required value={drawForm.draw_amount} onChange={e => setDrawForm(f => ({ ...f, draw_amount: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-1.5"><Label className="micro-label">Scheduled Date</Label><Input type="date" className="rounded-none h-10" value={drawForm.scheduled_date} onChange={e => setDrawForm(f => ({ ...f, scheduled_date: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="micro-label">Status</Label>
                      <Select value={drawForm.status} onValueChange={v => setDrawForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="requested">Requested</SelectItem>
                          <SelectItem value="funded">Funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={drawSaving} className="rounded-none w-full h-10">Save Draw Entry</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {draws.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No draw entries — add milestones to track lender disbursements.</div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-secondary/20 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  <div className="col-span-4">Milestone</div><div className="col-span-2">Date</div><div className="col-span-2 text-right">Amount</div><div className="col-span-2">Status</div><div className="col-span-2" />
                </div>
                {draws.map((d: any) => (
                  <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 text-sm items-center hover:bg-secondary/10">
                    <div className="col-span-4 font-medium truncate">{d.milestone_name}</div>
                    <div className="col-span-2 text-xs text-muted-foreground font-mono-tab">{d.scheduled_date ? fmtDate(d.scheduled_date) : '—'}</div>
                    <div className="col-span-2 text-right font-semibold font-mono-tab">{fmtUSD(d.draw_amount)}</div>
                    <div className="col-span-4">
                      <Select value={d.status} onValueChange={v => updateDrawStatus(d.id, v)}>
                        <SelectTrigger className={`rounded-none h-7 text-[9px] uppercase tracking-wider px-2 ${d.status === 'funded' ? 'text-positive' : d.status === 'requested' ? 'text-warning' : 'text-muted-foreground'}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="requested">Requested</SelectItem>
                          <SelectItem value="funded">Funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 border-t-2 border-border bg-secondary/20 flex justify-between text-sm font-mono-tab">
                  <span className="text-muted-foreground font-medium">Total Draws</span>
                  <span className="font-bold">{fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0))}</span>
                </div>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div className="border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Activity History
            </div>
            {sortedActivity.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">No activity recorded for this project.</div>
            ) : (
              sortedActivity.map((a: any) => (
                <div key={a.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab pd-row items-center">
                  <div className="col-span-3 text-muted-foreground">{fmtDate(a.date)}</div>
                  <div className="col-span-2"><span className="text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{a.type}</span></div>
                  <div className="col-span-5 truncate">{a.ref}</div>
                  <div className={`col-span-2 text-right font-semibold ${a.amount >= 0 ? 'text-positive' : ''}`}>{a.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(a.amount))}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="border border-border p-5">
            <div className="micro-label mb-3">Details</div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium uppercase tracking-wider text-[10px]">{enriched.status}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Code</dt><dd className="font-semibold font-mono-tab">{enriched.code || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd className="font-mono-tab text-muted-foreground">{fmtDate(enriched.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Checks</dt><dd className="font-semibold">{enriched.checkCount}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Transactions</dt><dd className="font-semibold">{enriched.txnCount}</dd></div>
            </dl>
          </div>

          {/* Quick links */}
          <div className="border border-border p-5">
            <div className="micro-label mb-3">Quick Links</div>
            <div className="space-y-1.5">
              <button onClick={() => navigate('/checks/new')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Issue New Check</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => navigate('/income')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Log Income</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => navigate('/expenses')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Record Expense</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => navigate('/invoices/new')}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Create Invoice</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Admin cross-links */}
          {isAdmin && (
            <div className="border border-border p-5">
              <div className="micro-label mb-3">Admin Dashboard</div>
              <div className="space-y-1.5">
                <button onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">Admin Panel</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">Client Portal</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}