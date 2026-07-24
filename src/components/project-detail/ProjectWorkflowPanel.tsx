/* ── Project Field Ops panel ──────────────────────────────────────────────
   Tasks, RFIs, submittals, punch-list items, inspections, and warranty
   claims for one project — filterable by type, with inline status
   transitions, assignment, due dates, and RFI-style responses. Feeds the
   executive snapshot's open-RFI / punch / failed-inspection counts. ── */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, ClipboardList, FileQuestion, FileStack, Hammer, ListChecks,
  Plus, ShieldCheck, Trash2,
} from 'lucide-react';
import {
  useDeleteWorkflowItem, useEmployees, useUpsertWorkflowItem, useWorkflowItems,
  type WorkflowItem,
} from '@/hooks/useErp';

const ITEM_TYPES = [
  { key: 'task', label: 'Tasks', icon: ListChecks },
  { key: 'rfi', label: 'RFIs', icon: FileQuestion },
  { key: 'submittal', label: 'Submittals', icon: FileStack },
  { key: 'punch_item', label: 'Punch List', icon: Hammer },
  { key: 'inspection', label: 'Inspections', icon: ShieldCheck },
  { key: 'warranty_claim', label: 'Warranty', icon: ClipboardList },
] as const;

/* Sensible status choices per item type — one table, type-appropriate flows */
const STATUSES_BY_TYPE: Record<WorkflowItem['item_type'], string[]> = {
  task:           ['open', 'in_progress', 'blocked', 'closed'],
  rfi:            ['open', 'answered', 'closed'],
  submittal:      ['open', 'approved', 'rejected', 'closed'],
  punch_item:     ['open', 'in_progress', 'closed'],
  inspection:     ['scheduled', 'passed', 'failed', 'closed'],
  warranty_claim: ['open', 'in_progress', 'closed'],
};

const STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  open:        { fg: '#2563EB', bg: '#2563EB12' },
  scheduled:   { fg: '#2563EB', bg: '#2563EB12' },
  in_progress: { fg: '#D97706', bg: '#D9770612' },
  blocked:     { fg: '#DC2626', bg: '#DC262612' },
  answered:    { fg: '#16A34A', bg: '#16A34A12' },
  approved:    { fg: '#16A34A', bg: '#16A34A12' },
  passed:      { fg: '#16A34A', bg: '#16A34A12' },
  rejected:    { fg: '#DC2626', bg: '#DC262612' },
  failed:      { fg: '#DC2626', bg: '#DC262612' },
  closed:      { fg: '#6B7280', bg: '#6B728012' },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: '#6B7280', normal: '#2563EB', high: '#D97706', critical: '#DC2626',
};

export function ProjectWorkflowPanel({ projectId }: { projectId: string }) {
  const { data: items = [] } = useWorkflowItems(projectId);
  const { data: employees = [] } = useEmployees();
  const upsert = useUpsertWorkflowItem();
  const remove = useDeleteWorkflowItem();

  const [typeFilter, setTypeFilter] = useState<WorkflowItem['item_type']>('task');
  const [showClosed, setShowClosed] = useState(false);
  const [form, setForm] = useState<Partial<WorkflowItem> | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of ITEM_TYPES) {
      c[t.key] = items.filter(i => i.item_type === t.key && !['closed', 'answered', 'approved', 'passed'].includes(i.status)).length;
    }
    return c;
  }, [items]);

  const visible = useMemo(() =>
    items
      .filter(i => i.item_type === typeFilter)
      .filter(i => showClosed || i.status !== 'closed')
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
    [items, typeFilter, showClosed]);

  const startNew = () => setForm({
    item_type: typeFilter, title: '', priority: 'normal',
    status: typeFilter === 'inspection' ? 'scheduled' : 'open',
  });

  const save = async () => {
    if (!form?.title) return;
    await upsert.mutateAsync({ ...form, project_id: projectId } as any);
    setForm(null);
  };

  const setStatus = (item: WorkflowItem, status: string) => {
    const patch: Partial<WorkflowItem> = { status };
    if (['closed', 'answered', 'approved', 'passed'].includes(status)) patch.closed_at = new Date().toISOString();
    upsert.mutate({ ...item, ...patch });
  };

  const submitResponse = (item: WorkflowItem) => {
    upsert.mutate({ ...item, response: responseDraft, responded_at: new Date().toISOString(), status: 'answered' });
    setRespondingId(null);
    setResponseDraft('');
  };

  return (
    <div className="pdv2-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide">Field Operations</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Tasks · RFIs · submittals · punch list · inspections · warranty</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="accent-black" />
            Show closed
          </label>
          <Button size="sm" className="rounded-none h-8 text-[11px]" onClick={startNew}>
            <Plus className="w-3 h-3 mr-1" /> New {ITEM_TYPES.find(t => t.key === typeFilter)?.label.replace(/s$/, '')}
          </Button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex overflow-x-auto border-b border-border">
        {ITEM_TYPES.map(t => (
          <button key={t.key} onClick={() => setTypeFilter(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] whitespace-nowrap border-b-2 transition-colors ${
              typeFilter === t.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="w-3.5 h-3.5" strokeWidth={2} />
            {t.label}
            {counts[t.key] > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-secondary text-[8px] font-black flex items-center justify-center">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      {form && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-secondary/30 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1"><Label className="micro-label">Title</Label>
            <Input className="rounded-none h-9 text-sm" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus /></div>
          <div className="space-y-1"><Label className="micro-label">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{['low', 'normal', 'high', 'critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">Due Date</Label>
            <Input type="date" className="rounded-none h-9 text-sm" value={form.due_date ?? ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="micro-label">Assignee</Label>
            <Select value={form.assignee_employee_id ?? 'unassigned'} onValueChange={v => setForm(f => ({ ...f, assignee_employee_id: v === 'unassigned' ? null : v }))}>
              <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div className="space-y-1"><Label className="micro-label">Location</Label>
            <Input className="rounded-none h-9 text-sm" value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. 2nd floor master bath" /></div>
          <div className="col-span-2 space-y-1"><Label className="micro-label">Details</Label>
            <Input className="rounded-none h-9 text-sm" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
            <Button variant="outline" className="rounded-none h-9" onClick={() => setForm(null)}>Cancel</Button>
            <Button className="rounded-none h-9" disabled={!form.title || upsert.isPending} onClick={save}>Create</Button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="divide-y divide-border">
        {visible.length === 0 && (
          <div className="px-5 py-12 text-center">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-muted-foreground/40" strokeWidth={1.2} />
            <div className="text-xs text-muted-foreground">No open {ITEM_TYPES.find(t => t.key === typeFilter)?.label.toLowerCase()} on this project.</div>
          </div>
        )}
        {visible.map(item => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.open;
          const overdue = item.due_date && item.due_date < new Date().toISOString().slice(0, 10) && !['closed', 'answered', 'approved', 'passed'].includes(item.status);
          const assignee = employees.find(e => e.id === item.assignee_employee_id)?.name ?? item.assignee_name;
          return (
            <div key={item.id} className="px-4 sm:px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="w-1 self-stretch shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[item.priority] }} title={`${item.priority} priority`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{item.title}</span>
                    <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide" style={{ color: st.fg, backgroundColor: st.bg }}>{item.status.replace(/_/g, ' ')}</span>
                    {overdue && <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-red-600 bg-red-50">Overdue</span>}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground mt-0.5">
                    {[item.location, assignee && `→ ${assignee}`, item.due_date && `Due ${item.due_date}`, item.ball_in_court && `Ball in court: ${item.ball_in_court}`]
                      .filter(Boolean).join(' · ') || item.description || '—'}
                  </div>
                  {item.response && (
                    <div className="mt-1.5 text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                      <span className="font-bold text-emerald-700">Response:</span> {item.response}
                    </div>
                  )}
                  {respondingId === item.id && (
                    <div className="mt-2 flex items-end gap-2">
                      <Textarea className="rounded-none text-xs min-h-[52px] flex-1" value={responseDraft} onChange={e => setResponseDraft(e.target.value)} placeholder="Answer / disposition…" autoFocus />
                      <div className="flex flex-col gap-1.5">
                        <Button size="sm" className="rounded-none h-7 text-[10px]" disabled={!responseDraft.trim()} onClick={() => submitResponse(item)}>Submit</Button>
                        <Button size="sm" variant="outline" className="rounded-none h-7 text-[10px]" onClick={() => setRespondingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.item_type === 'rfi' && item.status === 'open' && respondingId !== item.id && (
                    <button onClick={() => { setRespondingId(item.id); setResponseDraft(item.response ?? ''); }}
                      className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide border border-border hover:border-foreground/40 transition-colors">
                      Answer
                    </button>
                  )}
                  <Select value={item.status} onValueChange={v => setStatus(item, v)}>
                    <SelectTrigger className="rounded-none h-7 w-[112px] text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES_BY_TYPE[item.item_type].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => window.confirm('Delete this item?') && remove.mutate(item.id)}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete item">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
