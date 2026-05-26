import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChecks, useProjects, useUpsert, useVendors, useQuickCreate } from '@/hooks/useFinance';
import { QuickCreateSelect } from '@/components/QuickCreateSelect';
import DigitalCheck from '@/components/DigitalCheck';
import { toast } from 'sonner';

export default function CheckNew() {
  const nav = useNavigate();
  const { data: vendors = [] } = useVendors();
  const { data: projects = [] } = useProjects();
  const { data: checks = [] } = useChecks();
  const upsert = useUpsert('checks', [['checks']]);
  const createVendor = useQuickCreate('vendors');
  const createProject = useQuickCreate('projects');

  const nextNumber = useMemo(() => {
    const nums = checks.map((c: any) => parseInt(c.check_number, 10)).filter(n => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 1000) + 1);
  }, [checks]);

  const [form, setForm] = useState({
    check_number: nextNumber, payee_vendor_id: '', payee_name: '', amount: '',
    issue_date: new Date().toISOString().slice(0, 10), memo: '', project_id: '', status: 'pending' as const,
  });

  // sync default check #
  useMemo(() => { if (form.check_number === '1001' || !form.check_number) setForm(f => ({ ...f, check_number: nextNumber })); }, [nextNumber]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.payee_name || !form.amount || !form.check_number) { toast.error('Payee, amount and check number required'); return; }
    try {
      await upsert.mutateAsync({
        ...form,
        amount: parseFloat(form.amount),
        payee_vendor_id: form.payee_vendor_id || null,
        project_id: form.project_id || null,
      } as any);
      toast.success(`Check #${form.check_number} issued`);
      nav('/checks');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to issue check. Check your connection and try again.');
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Issue Instrument" title="Create Check" description="Initiate a financial instrument against the operating account." />

      <div className="px-4 sm:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 max-w-7xl">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="micro-label">Check Number</Label>
              <Input className="rounded-none h-10 font-mono-tab" value={form.check_number} onChange={e => setForm({ ...form, check_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="micro-label">Issue Date</Label>
              <Input type="date" className="rounded-none h-10" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
          </div>

          <div className="space-y-1.5"><Label className="micro-label">Payee · Vendor</Label>
            <QuickCreateSelect
              value={form.payee_vendor_id}
              onValueChange={v => {
                const ven = vendors.find((x: any) => x.id === v);
                setForm({ ...form, payee_vendor_id: v, payee_name: ven?.name || form.payee_name });
              }}
              options={vendors}
              placeholder="Select vendor (optional)"
              entityLabel="Vendor"
              onCreateNew={async (name) => {
                const result = await createVendor.mutateAsync({ name });
                toast.success(`Vendor "${name}" created`);
                return result;
              }}
            />
          </div>

          <div className="space-y-1.5"><Label className="micro-label">Payee Name</Label>
            <Input className="rounded-none h-10" value={form.payee_name} onChange={e => setForm({ ...form, payee_name: e.target.value })} required /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="micro-label">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono-tab text-muted-foreground pointer-events-none select-none z-10">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = raw.split('.');
                    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
                    setForm({ ...form, amount: cleaned });
                  }}
                  className="pl-7 rounded-none h-10 font-mono-tab text-right"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5"><Label className="micro-label">Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="cleared">Cleared</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5"><Label className="micro-label">Project Assignment</Label>
            <QuickCreateSelect
              value={form.project_id}
              onValueChange={v => setForm({ ...form, project_id: v })}
              options={projects}
              placeholder="Assign to project"
              entityLabel="Project"
              onCreateNew={async (name) => {
                const result = await createProject.mutateAsync({ name });
                toast.success(`Project "${name}" created`);
                return result;
              }}
            />
          </div>

          <div className="space-y-1.5"><Label className="micro-label">Memo</Label>
            <Textarea className="rounded-none" rows={2} value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} /></div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" className="rounded-none h-10 px-6 w-full sm:w-auto">Issue Check</Button>
            <Button type="button" variant="ghost" className="rounded-none h-10 w-full sm:w-auto" onClick={() => nav('/checks')}>Cancel</Button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="micro-label">Live Preview</div>
          <DigitalCheck
            checkNumber={form.check_number}
            payee={form.payee_name}
            amount={parseFloat(form.amount) || 0}
            date={form.issue_date}
            memo={form.memo}
            status={form.status}
          />
          <div className="text-[10px] text-muted-foreground tracking-wider">Instrument is generated upon issuance. Verify all fields before submission.</div>
        </div>
      </div>
    </AppShell>
  );
}