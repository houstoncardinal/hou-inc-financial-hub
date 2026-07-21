import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, TriangleAlert, CircleCheck, AlertOctagon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminPinGate } from '@/components/AdminPinGate';
import { fmtUSD } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

/* CTC Worksheet is explicitly Houston Enterprise-only (commitments/cost-code
   forecasting only exists for construction projects) — this page lives
   outside the entity-aware FinanceRoutes tree (no EntityProvider ancestor),
   so it queries directly against 'houston-enterprise' rather than relying on
   useEntity()-dependent hooks, which would silently never fetch here. */
const ENTITY_ID = 'houston-enterprise';

interface WorksheetRow {
  cost_code_id: string | null;
  code: string;
  name: string;
  original_budget: number;
  approved_changes: number;
  revised_budget: number;
  commitments: number;
  actual_cost: number;
  forecasted_cost_to_complete: number;
  projected_variance: number;
  flag: 'ok' | 'yellow' | 'red';
}

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function flagStyle(flag: string) {
  if (flag === 'red') return { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.35)', color: '#dc2626', Icon: AlertOctagon };
  if (flag === 'yellow') return { bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.32)', color: '#d97706', Icon: TriangleAlert };
  return { bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.24)', color: '#059669', Icon: CircleCheck };
}

function useDebouncedSave(fn: (val: number) => void, delay = 700) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return (val: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(val), delay);
  };
}

function BudgetInput({ initialValue, onSave }: { initialValue: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState(String(initialValue || ''));
  useEffect(() => { setValue(String(initialValue || '')); }, [initialValue]);
  const debouncedSave = useDebouncedSave(onSave);
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
      <input
        type="number" step="0.01" inputMode="decimal" value={value}
        onChange={e => { setValue(e.target.value); debouncedSave(num(e.target.value)); }}
        className="w-full h-9 pl-5 pr-2 border border-border bg-background text-[12px] font-mono-tab font-semibold focus:outline-none focus:border-accent"
        placeholder="0.00"
      />
    </div>
  );
}

export default function ProjectForecasting() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [addCode, setAddCode] = useState('');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['forecasting-project', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name, budget, status').eq('id', id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: worksheet = [], isLoading: worksheetLoading } = useQuery({
    queryKey: ['ctc-worksheet', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_to_complete_worksheet' as any, { p_project_id: id });
      if (error) throw error;
      return (data ?? []) as WorksheetRow[];
    },
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['finance-cost-codes-he'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finance_cost_codes').select('id, code, name')
        .eq('entity_id', ENTITY_ID).eq('is_active', true).order('code');
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsertBudget = useMutation({
    mutationFn: async (vars: { cost_code_id: string; original_budget?: number; forecasted_cost_to_complete?: number }) => {
      const { error } = await supabase.rpc('upsert_project_cost_budget' as any, {
        p_project_id: id,
        p_cost_code_id: vars.cost_code_id,
        p_original_budget: vars.original_budget ?? null,
        p_forecasted_cost_to_complete: vars.forecasted_cost_to_complete ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ctc-worksheet', id] }),
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const availableCodes = costCodes.filter((c: any) => !worksheet.some(w => w.cost_code_id === c.id));

  const totals = worksheet.reduce((acc, r) => ({
    original: acc.original + num(r.original_budget),
    approved: acc.approved + num(r.approved_changes),
    revised: acc.revised + num(r.revised_budget),
    committed: acc.committed + num(r.commitments),
    actual: acc.actual + num(r.actual_cost),
    etc: acc.etc + num(r.forecasted_cost_to_complete),
    variance: acc.variance + num(r.projected_variance),
  }), { original: 0, approved: 0, revised: 0, committed: 0, actual: 0, etc: 0, variance: 0 });

  const overallFlag = worksheet.some(r => r.flag === 'red') ? 'red' : worksheet.some(r => r.flag === 'yellow') ? 'yellow' : 'ok';
  const overall = flagStyle(overallFlag);

  return (
    <AdminPinGate>
      <div className="min-h-screen bg-background">
        <style>{`
          .ctcf-grid{display:grid;grid-template-columns:1.6fr .95fr .95fr .95fr .95fr .95fr 1.05fr 1.05fr;gap:0;}
          .ctcf-row{border-bottom:1px solid hsl(var(--border));}
          .ctcf-cell{padding:10px 12px;display:flex;align-items:center;font-size:12px;}
          .ctcf-head{padding:8px 12px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:hsl(var(--muted-foreground));background:hsl(var(--secondary)/.5);}
        `}</style>

        <div className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/admin?tab=projects" className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-muted-foreground hover:text-foreground transition-colors mb-2">
              <ArrowLeft className="w-3 h-3" /> Back to Admin
            </Link>
            <div className="text-[9px] uppercase tracking-[0.28em] font-black text-accent">Cost-to-Complete Forecasting</div>
            <h1 className="text-xl sm:text-2xl font-bold mt-0.5 truncate">{projectLoading ? 'Loading…' : project?.name || 'Unknown Project'}</h1>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border" style={{ backgroundColor: overall.bg, borderColor: overall.border }}>
            <overall.Icon className="w-4 h-4" style={{ color: overall.color }} />
            <div>
              <div className="text-[8px] uppercase tracking-[0.16em] font-bold" style={{ color: overall.color }}>
                {overallFlag === 'red' ? 'Over Budget — Draws Blocked' : overallFlag === 'yellow' ? 'Minor Overrun' : 'On Track'}
              </div>
              <div className="text-sm font-black font-mono-tab" style={{ color: overall.color }}>{fmtUSD(totals.variance)}</div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              ['Original Budget', totals.original],
              ['Approved Changes', totals.approved],
              ['Revised Budget', totals.revised],
              ['Commitments', totals.committed],
              ['Actual Cost', totals.actual],
              ['Forecasted ETC', totals.etc],
              ['Projected Variance', totals.variance],
            ].map(([label, value]) => (
              <div key={label as string} className="border border-border p-2.5">
                <div className="text-[8px] uppercase tracking-[0.14em] font-bold text-muted-foreground">{label}</div>
                <div className="text-[13px] font-black font-mono-tab mt-1">{fmtUSD(value as number)}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Select value={addCode} onValueChange={v => { setAddCode(v); upsertBudget.mutate({ cost_code_id: v, original_budget: 0, forecasted_cost_to_complete: 0 }); setAddCode(''); }}>
              <SelectTrigger className="rounded-none h-9 w-72"><SelectValue placeholder="+ Add cost code to worksheet" /></SelectTrigger>
              <SelectContent>
                {availableCodes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
                {!availableCodes.length && <div className="px-3 py-2 text-[11px] text-muted-foreground">All cost codes already on this worksheet.</div>}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop dense grid */}
          <div className="hidden lg:block border border-border overflow-x-auto">
            <div className="ctcf-grid min-w-[1040px]">
              <div className="ctcf-head">Cost Code</div>
              <div className="ctcf-head text-right">Original Budget</div>
              <div className="ctcf-head text-right">Approved Changes</div>
              <div className="ctcf-head text-right">Revised Budget</div>
              <div className="ctcf-head text-right">Commitments</div>
              <div className="ctcf-head text-right">Actual Cost</div>
              <div className="ctcf-head">Forecasted ETC</div>
              <div className="ctcf-head text-right">Projected Variance</div>
            </div>
            {worksheetLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading worksheet…</div>}
            {!worksheetLoading && !worksheet.length && (
              <div className="p-10 text-center text-sm text-muted-foreground">No cost codes on this worksheet yet — add one above to start forecasting.</div>
            )}
            {worksheet.map(row => {
              const fs = flagStyle(row.flag);
              return (
                <div key={row.cost_code_id ?? row.code} className="ctcf-grid ctcf-row min-w-[1040px]" style={row.flag !== 'ok' ? { backgroundColor: fs.bg } : undefined}>
                  <div className="ctcf-cell font-bold">
                    <div className="min-w-0">
                      <div className="truncate">{row.code}</div>
                      <div className="text-[10px] text-muted-foreground truncate font-normal">{row.name}</div>
                    </div>
                  </div>
                  <div className="ctcf-cell">
                    {row.cost_code_id ? (
                      <BudgetInput initialValue={row.original_budget} onSave={v => upsertBudget.mutate({ cost_code_id: row.cost_code_id!, original_budget: v })} />
                    ) : <span className="w-full text-right font-mono-tab text-[11px]">{fmtUSD(row.original_budget)}</span>}
                  </div>
                  <div className="ctcf-cell justify-end font-mono-tab">{fmtUSD(row.approved_changes)}</div>
                  <div className="ctcf-cell justify-end font-mono-tab font-bold">{fmtUSD(row.revised_budget)}</div>
                  <div className="ctcf-cell justify-end font-mono-tab">{fmtUSD(row.commitments)}</div>
                  <div className="ctcf-cell justify-end font-mono-tab">{fmtUSD(row.actual_cost)}</div>
                  <div className="ctcf-cell">
                    {row.cost_code_id ? (
                      <BudgetInput initialValue={row.forecasted_cost_to_complete} onSave={v => upsertBudget.mutate({ cost_code_id: row.cost_code_id!, forecasted_cost_to_complete: v })} />
                    ) : <span className="text-muted-foreground text-[11px]">—</span>}
                  </div>
                  <div className="ctcf-cell justify-end font-mono-tab font-black" style={{ color: fs.color }}>{fmtUSD(row.projected_variance)}</div>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2.5">
            {worksheetLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading worksheet…</div>}
            {!worksheetLoading && !worksheet.length && (
              <div className="p-8 text-center text-sm text-muted-foreground border border-border">No cost codes on this worksheet yet — add one above to start forecasting.</div>
            )}
            {worksheet.map(row => {
              const fs = flagStyle(row.flag);
              return (
                <div key={row.cost_code_id ?? row.code} className="border p-3 space-y-2.5" style={{ borderColor: row.flag !== 'ok' ? fs.border : undefined, backgroundColor: row.flag !== 'ok' ? fs.bg : undefined }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{row.code}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{row.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[8px] uppercase tracking-[0.12em] font-bold text-muted-foreground">Variance</div>
                      <div className="font-mono-tab font-black text-sm" style={{ color: fs.color }}>{fmtUSD(row.projected_variance)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <div><div className="text-muted-foreground uppercase tracking-[0.1em] text-[8px]">Revised Budget</div><div className="font-mono-tab font-bold mt-0.5">{fmtUSD(row.revised_budget)}</div></div>
                    <div><div className="text-muted-foreground uppercase tracking-[0.1em] text-[8px]">Commitments</div><div className="font-mono-tab font-bold mt-0.5">{fmtUSD(row.commitments)}</div></div>
                    <div><div className="text-muted-foreground uppercase tracking-[0.1em] text-[8px]">Actual Cost</div><div className="font-mono-tab font-bold mt-0.5">{fmtUSD(row.actual_cost)}</div></div>
                  </div>
                  {row.cost_code_id && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-1">Original Budget</div>
                        <BudgetInput initialValue={row.original_budget} onSave={v => upsertBudget.mutate({ cost_code_id: row.cost_code_id!, original_budget: v })} />
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-1">Forecasted Cost to Complete</div>
                        <BudgetInput initialValue={row.forecasted_cost_to_complete} onSave={v => upsertBudget.mutate({ cost_code_id: row.cost_code_id!, forecasted_cost_to_complete: v })} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminPinGate>
  );
}
