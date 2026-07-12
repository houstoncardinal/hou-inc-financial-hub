import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useChecks, useDelete, useProjects, useTransactions, useUpsert } from '@/hooks/useFinance';
import { fmtUSD } from '@/lib/format';
import { Trash2, Table2, FileText, ArrowUpRight, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateProjectReport, savePDF, downloadProjectExcel } from '@/lib/reports';

const blank = { name: '', code: '', budget: '', status: 'active' as const, notes: '' };

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const upsert = useUpsert('projects', [['projects']]);
  const del = useDelete('projects', [['projects']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [showWIP, setShowWIP] = useState(false);

  const enriched = useMemo(() => projects.map((p: any) => {
    const pChecks = checks.filter((c: any) => c.project_id === p.id);
    const pIn = income.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExp = expenses.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent = pExp + cleared;
    return { ...p, incoming: pIn, spent, outstanding, net: pIn - spent, used: Number(p.budget) > 0 ? Math.min(100, (spent / Number(p.budget)) * 100) : 0 };
  }), [projects, checks, income, expenses]);

  /* ── PDF Export ── */
  const exportPDF = () => {
    const doc = generateProjectReport(enriched);
    savePDF(doc, `hou-project-portfolio-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Project portfolio exported as PDF');
  };

  /* ── Excel Export ── */
  const exportExcel = () => {
    downloadProjectExcel(enriched);
    toast.success('Projects exported as Excel');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await upsert.mutateAsync({ ...form, budget: parseFloat(form.budget) || 0 });
    toast.success('Project saved');
    setOpen(false); setForm(blank);
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Capital Containers" title="Projects" description="Each project tracks budget allocation, capital deployed, and outstanding obligations."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setShowWIP(w => !w)}
                className={`flex items-center gap-1.5 px-3 h-9 text-[10px] uppercase tracking-[0.1em] font-medium border transition-colors ${showWIP ? 'bg-accent/10 text-accent border-accent/30' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> WIP Report
              </button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="rounded-none h-9 w-9" onClick={exportExcel}><Table2 className="w-4 h-4" /></Button>
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
              <DialogTrigger asChild><Button className="rounded-none">New Project</Button></DialogTrigger>
              <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{form.id ? 'Edit Project' : 'New Project'}</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5"><Label className="micro-label">Name</Label><Input className="rounded-none h-10" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="micro-label">Code</Label><Input className="rounded-none h-10 font-mono-tab" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="micro-label">Budget (USD)</Label><Input type="number" step="0.01" className="rounded-none h-10 font-mono-tab text-right" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="micro-label">Status</Label>
                      <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="micro-label">Notes</Label><Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button type="submit" className="rounded-none w-full h-10">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        } />

      {/* Mobile export bar */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportExcel}><Table2 className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
      </div>

      {showWIP && enriched.length > 0 && (
        <div className="px-4 sm:px-8 py-6">
          <div className="border border-border">
            <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5" /> WIP Schedule — Work in Progress Report
              </div>
              <div className="text-[9px] text-muted-foreground">As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {['Project', 'Contract Value', 'Costs Incurred', '% Complete', 'Revenue Earned', 'Billed to Date', 'Over / Under'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((p: any) => {
                    const pctComplete = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0;
                    const revenueEarned = p.budget > 0 ? p.incoming * (pctComplete / 100) : p.incoming;
                    const billedToDate = p.incoming;
                    const overUnder = billedToDate - revenueEarned;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-secondary/20">
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/projects/${p.id}`)} className="font-medium hover:text-accent transition-colors text-left">{p.name}</button>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{p.code || p.status}</div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab font-semibold">{fmtUSD(p.budget)}</td>
                        <td className="px-4 py-3 font-mono-tab">{fmtUSD(p.spent)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary"><div className="h-full bg-foreground" style={{ width: `${pctComplete}%` }} /></div>
                            <span className="font-mono-tab text-xs font-semibold">{pctComplete.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono-tab text-positive">{fmtUSD(revenueEarned)}</td>
                        <td className="px-4 py-3 font-mono-tab">{fmtUSD(billedToDate)}</td>
                        <td className={`px-4 py-3 font-mono-tab font-semibold ${overUnder > 0 ? 'text-positive' : overUnder < 0 ? 'text-accent' : ''}`}>
                          {overUnder > 0 ? '+' : ''}{fmtUSD(overUnder)}
                          <div className="text-[8px] font-normal text-muted-foreground">{overUnder > 0 ? 'Overbilled' : overUnder < 0 ? 'Underbilled' : 'On track'}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/40">
                    <td className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Totals</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(enriched.reduce((s: number, p: any) => s + Number(p.budget), 0))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(enriched.reduce((s: number, p: any) => s + p.spent, 0))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">—</td>
                    <td className="px-4 py-3 font-bold font-mono-tab text-positive">{fmtUSD(enriched.reduce((s: number, p: any) => s + p.incoming, 0))}</td>
                    <td className="px-4 py-3 font-bold font-mono-tab">{fmtUSD(enriched.reduce((s: number, p: any) => s + p.incoming, 0))}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-border border border-border">
        {enriched.length === 0 ? <div className="bg-background col-span-full p-16 text-center text-sm text-muted-foreground">No projects defined.</div> :
          enriched.map((p: any) => (
            <div key={p.id} className="bg-background p-5 group relative">
              <button
                onClick={() => navigate(`/projects/${p.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="micro-label">{p.code || '—'} · {p.status}</div>
                    <div className="text-base font-semibold tracking-tight mt-1 truncate">{p.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {p.used >= 100 && (
                      <span className="text-[8px] uppercase tracking-[0.14em] px-1.5 py-0.5 border font-medium bg-accent/10 text-accent border-accent/30">
                        Over Budget
                      </span>
                    )}
                    {p.used >= 80 && p.used < 100 && (
                      <span className="text-[8px] uppercase tracking-[0.14em] px-1.5 py-0.5 border font-medium bg-warning/10 text-warning border-warning/30">
                        Near Limit
                      </span>
                    )}
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </button>
              <div className="flex gap-1 absolute top-3 right-3 z-10">
                <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs" onClick={() => { setForm({ id: p.id, name: p.name, code: p.code || '', budget: p.budget, status: p.status, notes: p.notes || '' }); setOpen(true); }}>Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
                    <AlertDialogHeader><AlertDialogTitle>Archive project?</AlertDialogTitle><AlertDialogDescription>This will archive {p.name} and hide it from active views. Transactions linked to this project are preserved.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2"><AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent w-full sm:w-auto" onClick={() => del.mutate(p.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 font-mono-tab">
                <div><div className="micro-label">Budget</div><div className="text-sm font-semibold mt-0.5">{fmtUSD(p.budget)}</div></div>
                <div><div className="micro-label">Spent</div><div className="text-sm font-semibold mt-0.5">{fmtUSD(p.spent)}</div></div>
                <div><div className="micro-label">Incoming</div><div className="text-sm font-semibold text-positive mt-0.5">{fmtUSD(p.incoming)}</div></div>
                <div><div className="micro-label">Outstanding</div><div className="text-sm font-semibold mt-0.5">{fmtUSD(p.outstanding)}</div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5"><span>Budget Utilization</span><span className="font-mono-tab">{p.used.toFixed(1)}%</span></div>
                <div className="h-1 bg-secondary"><div className={`h-full ${p.used >= 100 ? 'bg-accent' : 'bg-foreground'}`} style={{ width: `${p.used}%` }} /></div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs">
                <span className="text-muted-foreground">Net Position</span>
                <span className={`font-semibold font-mono-tab ${p.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(p.net)}</span>
              </div>
            </div>
          ))}
      </div>
    </AppShell>
  );
}