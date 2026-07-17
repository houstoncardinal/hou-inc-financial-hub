/* ── Entity-specific analytics for /charts ────────────────────────────────────
   Rendered as the first row of the Charts screen when a non-construction
   entity is selected. All series come from real database-backed hooks:

   Houston Generator Pros
     · Margin by generator model — installed units' revenue vs COGS
       (equipment cost + install labor) from hgp_equipment_units
     · Revenue mix by month — service/maintenance vs emergency vs other
       income, using the same category tagging the visit sync trigger writes

   Houston Enterprise Holdings
     · Entity performance — income / outflow / net per entity from the
       get_holdings_entity_performance rollup (with client fallback)
     · Note balances — outstanding receivable vs payable balances per
       counterparty from holdings_notes
     · Capital flows by month — contributions in vs distributions/dividends
       out from holdings_capital_activity

   Houston Enterprise renders nothing here — its construction analytics are
   the existing shared charts below. ── */
import { useMemo } from 'react';
import { useEntity, ENTITIES } from '@/contexts/EntityContext';
import { financeProfileFor } from '@/lib/entityFinance';
import { useTransactions } from '@/hooks/useFinance';
import {
  useEquipmentUnits, useHoldingsNotes, useCapitalActivity, useConsolidatedEntityTotals,
} from '@/hooks/useEntityOps';
import { fmtUSD } from '@/lib/format';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';

const GOLD = '#9D7E3F';
const GREEN = '#16a34a';
const RED = '#dc2626';
const BLUE = '#2563eb';
const CYAN = '#0891b2';
const VIOLET = '#7c3aed';

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden border border-border bg-background shadow-[0_1px_3px_rgba(10,10,10,0.05)] hover:shadow-[0_10px_30px_rgba(10,10,10,0.08)] transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#9D7E3F] via-[#d7bd76] to-[#2563eb]" />
      <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-b from-secondary/25 to-transparent">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground/70">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-tab">{subtitle}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const usdTick = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);
const tooltipFmt = (v: number) => fmtUSD(v);

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="h-64 flex items-center justify-center text-xs text-muted-foreground text-center px-6">{children}</div>;
}

/* ── HGP ── */
function HgpCharts() {
  const { data: units = [] } = useEquipmentUnits();
  const { data: income = [] } = useTransactions('income');

  const marginByModel = useMemo(() => {
    const groups: Record<string, { model: string; revenue: number; cogs: number }> = {};
    for (const u of units as any[]) {
      if (u.status !== 'installed' || Number(u.sale_price || 0) <= 0) continue;
      const g = groups[u.model] ?? (groups[u.model] = { model: u.model, revenue: 0, cogs: 0 });
      g.revenue += Number(u.sale_price || 0);
      g.cogs += Number(u.unit_cost || 0) + Number(u.install_labor_cost || 0);
    }
    return Object.values(groups)
      .map(g => ({ ...g, margin: g.revenue - g.cogs }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 8);
  }, [units]);

  const revenueMix = useMemo(() => {
    const months: Record<string, { label: string; service: number; emergency: number; other: number }> = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = { label: d.toLocaleDateString('en-US', { month: 'short' }), service: 0, emergency: 0, other: 0 };
    }
    for (const t of income as any[]) {
      if ((t.status ?? '') === 'voided') continue;
      const d = new Date(t.transaction_date || t.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months[key];
      if (!bucket) continue;
      const amt = Number(t.total_amount ?? t.amount ?? 0);
      const hay = `${t.category ?? ''} ${t.description ?? ''}`;
      if (/emergency|after.?hours/i.test(hay)) bucket.emergency += amt;
      else if (/service|maintenance|plan/i.test(t.category ?? '')) bucket.service += amt;
      else bucket.other += amt;
    }
    return Object.values(months);
  }, [income]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Margin by Generator Model" subtitle="Installed units · revenue vs equipment + labor COGS">
        {marginByModel.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginByModel} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 9 }} interval={0} angle={-14} height={44} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={usdTick} width={52} />
                <RechartsTooltip formatter={tooltipFmt} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="revenue" name="Revenue" fill={BLUE} radius={[3, 3, 0, 0]} />
                <Bar dataKey="cogs" name="COGS" fill={RED} radius={[3, 3, 0, 0]} />
                <Bar dataKey="margin" name="Margin" fill={GREEN} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyNote>Mark units installed with a sale price on the Generator Ops dashboard to chart model-level margin.</EmptyNote>
        )}
      </Panel>

      <Panel title="Revenue Mix" subtitle="8 months · service & maintenance vs emergency vs equipment/other">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueMix} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={usdTick} width={52} />
              <RechartsTooltip formatter={tooltipFmt} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="service" name="Service / Maintenance" stackId="rev" fill={CYAN} />
              <Bar dataKey="emergency" name="Emergency" stackId="rev" fill={RED} />
              <Bar dataKey="other" name="Equipment / Other" stackId="rev" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

/* ── Holdings ── */
function HoldingsCharts() {
  const { data: consolidated = {} } = useConsolidatedEntityTotals();
  const { data: notes = [] } = useHoldingsNotes();
  const { data: activity = [] } = useCapitalActivity();

  const entityPerformance = useMemo(() =>
    ENTITIES.map(e => {
      const t = (consolidated as Record<string, { income: number; expense: number; clearedChecks: number }>)[e.id]
        ?? { income: 0, expense: 0, clearedChecks: 0 };
      const outflow = t.expense + t.clearedChecks;
      return { name: e.shortName, income: t.income, outflow, net: t.income - outflow, color: e.color };
    }), [consolidated]);

  const noteBalances = useMemo(() =>
    (notes as any[])
      .filter(n => n.status === 'active' && Number(n.outstanding_balance || 0) > 0)
      .map(n => ({
        name: n.counterparty_name,
        balance: Number(n.outstanding_balance || 0),
        direction: n.direction,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10), [notes]);

  const capitalFlows = useMemo(() => {
    const months: Record<string, { label: string; contributions: number; distributions: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${d.getMonth()}`] = {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        contributions: 0,
        distributions: 0,
      };
    }
    for (const a of activity as any[]) {
      const d = new Date(a.activity_date + 'T12:00:00');
      const bucket = months[`${d.getFullYear()}-${d.getMonth()}`];
      if (!bucket) continue;
      const amt = Number(a.amount || 0);
      if (a.activity_type === 'capital_contribution') bucket.contributions += amt;
      else if (a.activity_type === 'distribution' || a.activity_type === 'dividend') bucket.distributions += amt;
    }
    return Object.values(months);
  }, [activity]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Entity Performance" subtitle="Income vs outflow (expenses + cleared checks) per entity">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entityPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={usdTick} width={52} />
                <RechartsTooltip formatter={tooltipFmt} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="income" name="Income" fill={GREEN} radius={[3, 3, 0, 0]} />
                <Bar dataKey="outflow" name="Outflow" fill={RED} radius={[3, 3, 0, 0]} />
                <Bar dataKey="net" name="Net" fill={BLUE} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Note Balances" subtitle="Active notes · green = we hold (receivable), red = we owe (payable)">
          {noteBalances.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noteBalances} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-14} height={44} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={usdTick} width={52} />
                  <RechartsTooltip formatter={tooltipFmt} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="balance" name="Outstanding" radius={[3, 3, 0, 0]}>
                    {noteBalances.map((n, i) => (
                      <Cell key={i} fill={n.direction === 'receivable' ? GREEN : RED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyNote>Record intercompany loans and bank debt on Holdings HQ to chart outstanding balances.</EmptyNote>
          )}
        </Panel>
      </div>

      <Panel title="Capital Flows" subtitle="12 months · contributions in vs distributions + dividends out">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capitalFlows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={usdTick} width={52} />
              <RechartsTooltip formatter={tooltipFmt} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="contributions" name="Contributions" fill={VIOLET} radius={[3, 3, 0, 0]} />
              <Bar dataKey="distributions" name="Distributions" fill={RED} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}

export default function EntityInsightCharts() {
  const { entity } = useEntity();
  const variant = financeProfileFor(entity?.id).overview;
  if (variant === 'generator') return <HgpCharts />;
  if (variant === 'holdings') return <HoldingsCharts />;
  return null;
}
