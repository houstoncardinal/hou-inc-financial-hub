/* ── Equipment & Purchasing ───────────────────────────────────────────────
   Two tabs: (1) Fleet & Tools — construction equipment for Houston
   Enterprise with check-out/in to a project + operator, maintenance and
   fuel logs, and a live hour meter; (2) Purchase Orders — vendor POs with
   line items, receive tracking, and project/cost-code linkage. ── */
import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShoppingCart, Trash2, Truck, Wrench } from 'lucide-react';
import { fmtUSD } from '@/lib/format';
import { useProjects, useVendors } from '@/hooks/useFinance';
import {
  poTotal, useDeleteEquipment, useDeletePurchaseOrder, useDeletePurchaseOrderLine,
  useEmployees, useEquipment, useEquipmentLogs, useLogEquipment, usePurchaseOrders,
  useUpsertEquipment, useUpsertPurchaseOrder, useUpsertPurchaseOrderLine,
  type EquipmentUnit, type PurchaseOrder,
} from '@/hooks/useErp';

const EQ_CATEGORIES = ['truck', 'trailer', 'heavy_equipment', 'vehicle', 'tool', 'other'];
const EQ_STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  available:   { fg: '#16A34A', bg: '#16A34A14' },
  checked_out: { fg: '#2563EB', bg: '#2563EB14' },
  maintenance: { fg: '#D97706', bg: '#D9770614' },
  retired:     { fg: '#6B7280', bg: '#6B728014' },
};
const PO_STATUSES = ['draft', 'sent', 'approved', 'partially_received', 'received', 'closed', 'cancelled'];
const PO_STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  draft: { fg: '#6B7280', bg: '#6B728014' }, sent: { fg: '#2563EB', bg: '#2563EB14' },
  approved: { fg: '#7C3AED', bg: '#7C3AED14' }, partially_received: { fg: '#D97706', bg: '#D9770614' },
  received: { fg: '#16A34A', bg: '#16A34A14' }, closed: { fg: '#0A0A0A', bg: '#0A0A0A10' },
  cancelled: { fg: '#DC2626', bg: '#DC262614' },
};

function EquipmentDetail({ unit, onClose }: { unit: EquipmentUnit; onClose: () => void }) {
  const { data: logs = [] } = useEquipmentLogs(unit.id);
  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees();
  const logEquipment = useLogEquipment();
  const [logForm, setLogForm] = useState({ log_type: 'check_out' as const, project_id: '', employee_id: '', hours: 0, cost: 0, notes: '' });

  return (
    <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label className="micro-label">Action</Label>
          <Select value={logForm.log_type} onValueChange={v => setLogForm(f => ({ ...f, log_type: v as any }))}>
            <SelectTrigger className="rounded-none h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['check_out', 'check_in', 'maintenance', 'repair', 'fuel', 'inspection'].map(t =>
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select></div>
        {logForm.log_type === 'check_out' && (
          <>
            <div className="space-y-1"><Label className="micro-label">Project</Label>
              <Select value={logForm.project_id} onValueChange={v => setLogForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger className="rounded-none h-8 w-[150px] text-xs"><SelectValue placeholder="Project…" /></SelectTrigger>
                <SelectContent>{(projects as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="micro-label">Operator</Label>
              <Select value={logForm.employee_id} onValueChange={v => setLogForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger className="rounded-none h-8 w-[140px] text-xs"><SelectValue placeholder="Operator…" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select></div>
          </>
        )}
        <div className="space-y-1"><Label className="micro-label">Hours</Label>
          <Input type="number" className="rounded-none h-8 w-16 text-xs font-mono-tab" value={logForm.hours} onChange={e => setLogForm(f => ({ ...f, hours: Number(e.target.value) }))} /></div>
        <div className="space-y-1"><Label className="micro-label">Cost</Label>
          <Input type="number" className="rounded-none h-8 w-20 text-xs font-mono-tab" value={logForm.cost} onChange={e => setLogForm(f => ({ ...f, cost: Number(e.target.value) }))} /></div>
        <div className="flex-1 min-w-[120px] space-y-1"><Label className="micro-label">Notes</Label>
          <Input className="rounded-none h-8 text-xs" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} /></div>
        <Button size="sm" className="rounded-none h-8 text-[11px]" disabled={logEquipment.isPending}
          onClick={async () => {
            await logEquipment.mutateAsync({
              equipment: unit, log_type: logForm.log_type,
              project_id: logForm.project_id || null, employee_id: logForm.employee_id || null,
              hours: logForm.hours, cost: logForm.cost, notes: logForm.notes,
            });
            setLogForm({ log_type: 'check_out', project_id: '', employee_id: '', hours: 0, cost: 0, notes: '' });
          }}>Log</Button>
        <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px]" onClick={onClose}>Close</Button>
      </div>
      <div className="max-h-[180px] overflow-y-auto divide-y divide-border/60">
        {logs.length === 0 && <div className="py-4 text-center text-[11px] text-muted-foreground">No history yet.</div>}
        {(logs as any[]).map(l => (
          <div key={l.id} className="flex items-center gap-3 py-1.5 text-[11px]">
            <span className="font-mono-tab text-muted-foreground w-20 shrink-0">{l.log_date}</span>
            <span className="font-semibold uppercase tracking-wide text-[9px] w-24 shrink-0">{String(l.log_type).replace(/_/g, ' ')}</span>
            <span className="flex-1 min-w-0 truncate text-muted-foreground">{l.notes || '—'}</span>
            {Number(l.hours) > 0 && <span className="font-mono-tab shrink-0">{l.hours}h</span>}
            {Number(l.cost) > 0 && <span className="font-mono-tab font-semibold shrink-0">{fmtUSD(l.cost)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Equipment() {
  const [tab, setTab] = useState<'fleet' | 'purchasing'>('fleet');
  const { data: units = [] } = useEquipment();
  const { data: pos = [] } = usePurchaseOrders();
  const { data: vendors = [] } = useVendors();
  const { data: projects = [] } = useProjects();
  const upsertUnit = useUpsertEquipment();
  const deleteUnit = useDeleteEquipment();
  const upsertPO = useUpsertPurchaseOrder();
  const deletePO = useDeletePurchaseOrder();
  const upsertPOLine = useUpsertPurchaseOrderLine();
  const deletePOLine = useDeletePurchaseOrderLine();

  const [unitForm, setUnitForm] = useState<Partial<EquipmentUnit> | null>(null);
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [openPOId, setOpenPOId] = useState<string | null>(null);

  const openPO = useMemo(() => pos.find(p => p.id === openPOId) ?? null, [pos, openPOId]);
  const empProjName = (id: string | null) => (projects as any[]).find(p => p.id === id)?.name ?? null;

  const createPO = async () => {
    const seq = pos.length + 1;
    const created: any = await upsertPO.mutateAsync({
      po_number: `PO-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`,
      status: 'draft', order_date: new Date().toISOString().slice(0, 10), tax_amount: 0,
    });
    if (created?.id) setOpenPOId(created.id);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Equipment & Purchasing"
        description="Fleet check-out to projects with operator + hour tracking, and vendor purchase orders with receiving."
        actions={
          tab === 'fleet' ? (
            <Button className="rounded-none" onClick={() => setUnitForm({ category: 'tool', status: 'available', hourly_cost_rate: 0, purchase_price: 0, hours_used: 0 })}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Equipment
            </Button>
          ) : (
            <Button className="rounded-none" onClick={createPO} disabled={upsertPO.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Purchase Order
            </Button>
          )
        }
      />

      <div className="flex items-center gap-1 mb-4">
        {([['fleet', 'Fleet & Tools', Truck], ['purchasing', 'Purchase Orders', ShoppingCart]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] border transition-colors ${
              tab === key ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40'
            }`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {label}
          </button>
        ))}
      </div>

      {tab === 'fleet' && (
        <>
          {unitForm && (
            <div className="border border-border bg-secondary/30 p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1"><Label className="micro-label">Name</Label>
                <Input className="rounded-none h-9 text-sm" value={unitForm.name ?? ''} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="F-250 #2" /></div>
              <div className="space-y-1"><Label className="micro-label">Category</Label>
                <Select value={unitForm.category} onValueChange={v => setUnitForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-none h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{EQ_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1"><Label className="micro-label">VIN / Serial</Label>
                <Input className="rounded-none h-9 text-sm font-mono-tab" value={unitForm.identifier ?? ''} onChange={e => setUnitForm(f => ({ ...f, identifier: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="micro-label">Cost / hr</Label>
                <Input type="number" className="rounded-none h-9 text-sm font-mono-tab" value={unitForm.hourly_cost_rate ?? 0} onChange={e => setUnitForm(f => ({ ...f, hourly_cost_rate: Number(e.target.value) }))} /></div>
              <div className="flex items-end gap-2">
                <Button className="rounded-none h-9" disabled={!unitForm.name || upsertUnit.isPending}
                  onClick={async () => { await upsertUnit.mutateAsync(unitForm as any); setUnitForm(null); }}>Save</Button>
                <Button variant="outline" className="rounded-none h-9" onClick={() => setUnitForm(null)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="border border-border bg-background mb-8">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.4fr_1fr_.8fr_70px] gap-3 px-4 py-2.5 border-b border-border micro-label">
              <span>Unit</span><span>Category</span><span>Status</span><span>Assignment</span>
              <span className="text-right">Hours</span><span className="text-right">$/hr</span><span />
            </div>
            {units.length === 0 && <div className="px-4 py-12 text-center text-xs text-muted-foreground">No equipment yet — add your trucks, trailers, and tools.</div>}
            {units.map(u => {
              const st = EQ_STATUS_STYLE[u.status] ?? EQ_STATUS_STYLE.available;
              const isOpen = openUnitId === u.id;
              return (
                <div key={u.id} className="border-b border-border last:border-b-0">
                  <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1.4fr_1fr_.8fr_70px] gap-2 md:gap-3 px-4 py-3 items-center cursor-pointer hover:bg-secondary/40 transition-colors"
                    onClick={() => setOpenUnitId(isOpen ? null : u.id)}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{u.name}</span>
                      <span className="block text-[10px] text-muted-foreground font-mono-tab truncate">{u.identifier || '—'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground capitalize hidden md:block">{u.category.replace(/_/g, ' ')}</span>
                    <span><span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ color: st.fg, backgroundColor: st.bg }}>{u.status.replace(/_/g, ' ')}</span></span>
                    <span className="text-[11px] text-muted-foreground truncate hidden md:block">{empProjName(u.current_project_id) ?? '—'}</span>
                    <span className="text-xs font-mono-tab text-right hidden md:block">{Number(u.hours_used).toFixed(0)}h</span>
                    <span className="text-xs font-mono-tab text-right hidden md:block">{fmtUSD(u.hourly_cost_rate)}</span>
                    <span className="flex justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); setUnitForm(u); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Edit"><Wrench className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                      <button onClick={e => { e.stopPropagation(); if (window.confirm(`Remove ${u.name}?`)) deleteUnit.mutate(u.id); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                    </span>
                  </div>
                  {isOpen && <EquipmentDetail unit={u} onClose={() => setOpenUnitId(null)} />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'purchasing' && (
        <div className="border border-border bg-background mb-8">
          <div className="hidden md:grid grid-cols-[1fr_1.6fr_1.4fr_1fr_1fr_1fr_70px] gap-3 px-4 py-2.5 border-b border-border micro-label">
            <span>PO #</span><span>Vendor</span><span>Project</span><span>Status</span>
            <span>Ordered</span><span className="text-right">Total</span><span />
          </div>
          {pos.length === 0 && <div className="px-4 py-12 text-center text-xs text-muted-foreground">No purchase orders yet.</div>}
          {pos.map(po => {
            const st = PO_STATUS_STYLE[po.status] ?? PO_STATUS_STYLE.draft;
            const isOpen = openPOId === po.id;
            return (
              <div key={po.id} className="border-b border-border last:border-b-0">
                <div className="grid grid-cols-2 md:grid-cols-[1fr_1.6fr_1.4fr_1fr_1fr_1fr_70px] gap-2 md:gap-3 px-4 py-3 items-center cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => setOpenPOId(isOpen ? null : po.id)}>
                  <span className="text-xs font-bold font-mono-tab">{po.po_number}</span>
                  <span className="text-sm font-semibold truncate">{po.vendors?.name ?? 'No vendor'}</span>
                  <span className="text-[11px] text-muted-foreground truncate hidden md:block">{po.projects?.name ?? 'Overhead'}</span>
                  <span><span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wide" style={{ color: st.fg, backgroundColor: st.bg }}>{po.status.replace(/_/g, ' ')}</span></span>
                  <span className="text-xs font-mono-tab text-muted-foreground hidden md:block">{po.order_date}</span>
                  <span className="text-sm font-bold font-mono-tab text-right">{fmtUSD(poTotal(po))}</span>
                  <span className="flex justify-end">
                    <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete ${po.po_number}?`)) deletePO.mutate(po.id); }}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete PO">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </span>
                </div>
                {isOpen && openPO && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-3">
                    <div className="flex flex-wrap items-end gap-2.5">
                      <div className="space-y-1"><Label className="micro-label">Vendor</Label>
                        <Select value={openPO.vendor_id ?? ''} onValueChange={v => upsertPO.mutate({ id: openPO.id, vendor_id: v })}>
                          <SelectTrigger className="rounded-none h-8 w-[170px] text-xs"><SelectValue placeholder="Vendor…" /></SelectTrigger>
                          <SelectContent>{(vendors as any[]).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                        </Select></div>
                      <div className="space-y-1"><Label className="micro-label">Project</Label>
                        <Select value={openPO.project_id ?? 'overhead'} onValueChange={v => upsertPO.mutate({ id: openPO.id, project_id: v === 'overhead' ? null : v })}>
                          <SelectTrigger className="rounded-none h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overhead">Overhead</SelectItem>
                            {(projects as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select></div>
                      <div className="space-y-1"><Label className="micro-label">Status</Label>
                        <Select value={openPO.status} onValueChange={v => upsertPO.mutate({ id: openPO.id, status: v })}>
                          <SelectTrigger className="rounded-none h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select></div>
                      <div className="space-y-1"><Label className="micro-label">Expected</Label>
                        <Input type="date" className="rounded-none h-8 text-xs" defaultValue={openPO.expected_date ?? ''} onBlur={e => upsertPO.mutate({ id: openPO.id, expected_date: e.target.value || null })} /></div>
                      <span className="flex-1" />
                      <Button size="sm" variant="outline" className="rounded-none h-8 text-[11px]"
                        onClick={() => upsertPOLine.mutate({ po_id: openPO.id, description: 'New item', quantity: 1, unit: 'ea', unit_price: 0, received_qty: 0, sort_order: (openPO.finance_purchase_order_lines ?? []).length })}>
                        + Line
                      </Button>
                    </div>
                    <div className="divide-y divide-border/60">
                      {(openPO.finance_purchase_order_lines ?? []).map(l => (
                        <div key={l.id} className="grid grid-cols-[2fr_.6fr_.5fr_.9fr_.7fr_.9fr_30px] gap-2 py-1.5 items-center">
                          <Input className="rounded-none h-7 text-xs" defaultValue={l.description} onBlur={e => upsertPOLine.mutate({ ...l, description: e.target.value })} />
                          <Input type="number" className="rounded-none h-7 text-xs font-mono-tab px-1.5" defaultValue={l.quantity} onBlur={e => upsertPOLine.mutate({ ...l, quantity: Number(e.target.value) })} />
                          <Input className="rounded-none h-7 text-xs px-1.5" defaultValue={l.unit} onBlur={e => upsertPOLine.mutate({ ...l, unit: e.target.value })} />
                          <Input type="number" className="rounded-none h-7 text-xs font-mono-tab px-1.5" defaultValue={l.unit_price} onBlur={e => upsertPOLine.mutate({ ...l, unit_price: Number(e.target.value) })} />
                          <Input type="number" className="rounded-none h-7 text-xs font-mono-tab px-1.5" title="Received qty" defaultValue={l.received_qty} onBlur={e => upsertPOLine.mutate({ ...l, received_qty: Number(e.target.value) })} />
                          <span className="text-xs font-bold font-mono-tab text-right">{fmtUSD(Number(l.quantity) * Number(l.unit_price))}</span>
                          <button onClick={() => deletePOLine.mutate(l.id)} className="flex items-center justify-center text-muted-foreground hover:text-red-600" aria-label="Delete line">
                            <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                          </button>
                        </div>
                      ))}
                      {(openPO.finance_purchase_order_lines ?? []).length === 0 && (
                        <div className="py-4 text-center text-[11px] text-muted-foreground">No lines — add materials to this PO.</div>
                      )}
                    </div>
                    <div className="grid grid-cols-[2fr_.6fr_.5fr_.9fr_.7fr_.9fr_30px] gap-2 text-[9px] text-muted-foreground uppercase tracking-wide font-bold">
                      <span>Description</span><span>Qty</span><span>Unit</span><span>Price</span><span>Rcvd</span><span className="text-right">Total</span><span />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
