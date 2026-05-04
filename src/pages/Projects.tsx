import { useMemo, useState } from 'react';
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
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const blank = { name: '', code: '', budget: '', status: 'active' as const, notes: '' };

export default function Projects() {
  const { data: projects = [] } = useProjects();
  const { data: checks = [] } = useChecks();
  const { data: income = [] } = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const upsert = useUpsert('projects', [['projects']]);
  const del = useDelete('projects', [['projects']]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);

  const enriched = useMemo(() => projects.map((p: any) => {
    const pChecks = checks.filter((c: any) => c.project_id === p.id);
    const pIn = income.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExp = expenses.filter((t: any) => t.project_id === p.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent = pExp + cleared;
    return { ...p, incoming: pIn, spent, outstanding, net: pIn - spent, used: Number(p.budget) > 0 ? Math.min(100, (spent / Number(p.budget)) * 100) : 0 };
  }), [projects, checks, income, expenses]);

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
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(blank); }}>
            <DialogTrigger asChild><Button className="rounded-none">New Project</Button></DialogTrigger>
            <DialogContent className="rounded-none max-w-lg">
              <DialogHeader><DialogTitle>{form.id ? 'Edit Project' : 'New Project'}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5"><Label className="micro-label">Name</Label><Input className="rounded-none" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="micro-label">Code</Label><Input className="rounded-none font-mono-tab" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="micro-label">Budget (USD)</Label><Input type="number" step="0.01" className="rounded-none font-mono-tab text-right" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="micro-label">Status</Label>
                    <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5"><Label className="micro-label">Notes</Label><Textarea className="rounded-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="rounded-none w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        } />

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border border border-border">
        {enriched.length === 0 ? <div className="bg-background col-span-full p-16 text-center text-sm text-muted-foreground">No projects defined.</div> :
          enriched.map((p: any) => (
            <div key={p.id} className="bg-background p-5 group">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="micro-label">{p.code || '—'} · {p.status}</div>
                  <div className="text-base font-semibold tracking-tight mt-1">{p.name}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs" onClick={() => { setForm({ id: p.id, name: p.name, code: p.code || '', budget: p.budget, status: p.status, notes: p.notes || '' }); setOpen(true); }}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-accent"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none">
                      <AlertDialogHeader><AlertDialogTitle>Archive project?</AlertDialogTitle><AlertDialogDescription>This unlinks all transactions from {p.name}.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel><AlertDialogAction className="rounded-none bg-accent" onClick={() => del.mutate(p.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
