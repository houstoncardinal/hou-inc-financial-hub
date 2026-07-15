import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, History, FileClock, ShieldCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate } from '@/lib/format';

const ACTION_STYLES: Record<string, string> = {
  created: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  updated: 'border-blue-200 bg-blue-50 text-blue-700',
  deleted: 'border-red-200 bg-red-50 text-red-700',
  signature_edit: 'border-amber-200 bg-amber-50 text-amber-800',
  reconciled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reopened: 'border-zinc-200 bg-zinc-50 text-zinc-700',
};

export default function Changelog() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('all');
  const [action, setAction] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['finance-changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_changelog' as any)
        .select('*')
        .eq('dashboard', 'finance')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const entities = useMemo(() => Array.from(new Set(logs.map((l: any) => l.entity).filter(Boolean))).sort(), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l: any) => l.action).filter(Boolean))).sort(), [logs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((log: any) => {
      if (entity !== 'all' && log.entity !== entity) return false;
      if (action !== 'all' && log.action !== action) return false;
      if (!needle) return true;
      return [
        log.action, log.entity, log.entity_label, log.changed_by, log.entity_id,
        JSON.stringify(log.details ?? {}),
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [logs, q, entity, action]);

  const signedCount = logs.filter((l: any) => l.details?.signature).length;
  const updateCount = logs.filter((l: any) => ['updated', 'signature_edit'].includes(l.action)).length;
  const deleteCount = logs.filter((l: any) => l.action === 'deleted').length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Governance"
        title="Finance Changelog"
        description="Permanent record of finance changes, signed ledger corrections, reconciliations, deletes, and database-backed audit events."
      />

      <div className="border-t border-border/60 bg-secondary/15">
        <section className="px-4 sm:px-8 py-4 border-b border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'Logged Events', value: logs.length, icon: FileClock },
              { label: 'Signed Edits', value: signedCount, icon: ShieldCheck },
              { label: 'Updates / Deletes', value: `${updateCount} / ${deleteCount}`, icon: History },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="border border-border bg-background px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-foreground/55 font-bold">{item.label}</div>
                      <div className="text-xl font-bold font-mono-tab mt-1">{item.value}</div>
                    </div>
                    <span className="w-9 h-9 border border-border bg-secondary/35 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground/60" strokeWidth={1.6} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-4 sm:px-8 py-3 border-b border-border/60">
          <div className="border border-border bg-background p-3 flex flex-col lg:flex-row gap-2 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={1.5} />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search signature, record label, user, entity ID, or details..." className="rounded-none h-10 pl-9" />
            </div>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="rounded-none h-10 lg:w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All entities</SelectItem>{entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="rounded-none h-10 lg:w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </section>

        <section className="px-4 sm:px-8 py-4">
          <div className="border border-border bg-background overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/25 flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-foreground/60 font-bold">Audit Timeline</div>
                <div className="text-[10px] text-foreground/50 font-mono-tab mt-0.5">{filtered.length} visible events</div>
              </div>
            </div>
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading changelog...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No changelog events match.</div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((log: any) => {
                  const signature = log.details?.signature;
                  const cls = ACTION_STYLES[log.action] ?? 'border-zinc-200 bg-zinc-50 text-zinc-700';
                  return (
                    <article key={log.id} className="p-3 sm:p-4 hover:bg-secondary/20 transition-colors">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-1 border text-[9px] uppercase tracking-[0.14em] font-bold ${cls}`}>{log.action}</span>
                            <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-foreground/55">{log.entity}</span>
                            {signature && <span className="px-2 py-1 border border-amber-200 bg-amber-50 text-amber-800 text-[9px] uppercase tracking-[0.14em] font-bold">Signed</span>}
                          </div>
                          <div className="text-sm font-bold mt-2 truncate">{log.entity_label || log.entity_id || 'Finance record'}</div>
                          <div className="text-[11px] text-foreground/55 mt-1 font-mono-tab truncate">By {log.changed_by} · {log.created_at ? fmtDate(log.created_at) : 'Recorded'}</div>
                        </div>
                        <div className="lg:text-right text-[10px] text-foreground/55 font-mono-tab">
                          <div>ID: {log.entity_id || '—'}</div>
                          <div>{log.details?.table ? `Table: ${log.details.table}` : 'Finance dashboard'}</div>
                        </div>
                      </div>
                      {signature && (
                        <div className="mt-3 border border-border bg-secondary/25 px-3 py-2 text-[11px]">
                          <span className="font-bold">Digital signature:</span> {signature}
                          {log.details?.signed_at && <span className="text-foreground/55"> · {new Date(log.details.signed_at).toLocaleString()}</span>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
