/* ── Houston Generator Pros · Inventory workspace ────────────────────────────
   Quantity-tracked parts & materials alongside the serialized generator
   register (which stays on Generator Ops). Backed by 20260717000008:
   every receive / consume / adjust / return is a row in the movement ledger;
   database triggers maintain part quantities, feed consumed parts into the
   named job's materials cost (job margin updates itself), and record
   serialized-unit lifecycle events into the same ledger. Low stock is
   anything at or below its reorder point; negative counts flag miscounts
   in red rather than hiding them. ── */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useVendors } from '@/hooks/useFinance';
import {
  useHgpParts, useInventoryMovements, useHgpInventoryPosition, useHgpJobs, useEquipmentUnits,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { Download, ShoppingCart, X } from 'lucide-react';
import { fmtUSD, todayLocalDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Package, PackagePlus, PackageMinus, SlidersHorizontal, Boxes, Zap,
  AlertTriangle, Plus, Pencil, Trash2, Search, History, Wrench,
  ScanLine, Video, VideoOff, ArrowRight,
} from 'lucide-react';

const HGP_BLUE = '#1B72B5';

const INV_CSS = `
.inv-shell{background:linear-gradient(180deg,rgba(27,114,181,0.05),transparent 180px);}
.inv-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.inv-kpi{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 10px;min-width:0;position:relative;overflow:hidden;}
.inv-kpi:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#1B72B5);}
.inv-k{font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.inv-v{font-size:15px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.inv-row{border-bottom:1px solid hsl(var(--border));padding:8px 12px;font-size:12px;}
.inv-row:hover{background:hsl(var(--secondary)/.35);}
.inv-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;gap:6px;}
.inv-action{height:26px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 7px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;display:inline-flex;align-items:center;gap:4px;}
.inv-action:hover{background:hsl(var(--secondary)/.55);}
.inv-field{height:38px;border-radius:0;font-size:12px;}
.dark .inv-panel,.dark .inv-kpi,.dark .inv-action{background:hsl(var(--card));}
@media(max-width:767px){.inv-v{font-size:13px}.inv-panel{padding:10px!important}.inv-action{min-height:34px}.inv-primary{min-height:38px}}
`;

const PART_CATEGORIES: Record<string, string> = {
  parts: 'Parts', batteries: 'Batteries', transfer_switches: 'Transfer Switches',
  electrical: 'Electrical', fuel_system: 'Fuel System', pads_enclosures: 'Pads & Enclosures',
  consumables: 'Consumables', other: 'Other',
};

const MOVEMENT_META: Record<string, { label: string; color: string }> = {
  received:     { label: 'Received',  color: '#059669' },
  consumed:     { label: 'Consumed',  color: '#dc2626' },
  adjusted:     { label: 'Adjusted',  color: '#d97706' },
  returned:     { label: 'Returned',  color: '#0891b2' },
  reserved:     { label: 'Reserved',  color: '#7c3aed' },
  released:     { label: 'Released',  color: '#64748b' },
  installed:    { label: 'Installed', color: '#1B72B5' },
  service_only: { label: 'Service',   color: '#8A8580' },
};

const num = (v: unknown) => Number(v || 0);

const BLANK_PART = {
  id: '', sku: '', name: '', category: 'parts', unit_cost: '',
  reorder_point: '', reorder_qty: '', vendor_id: '', location: '', notes: '',
};

const BLANK_MOVEMENT = {
  movement_type: 'received' as string, part_id: '', quantity: '', unit_cost: '',
  job_id: '', vendor_id: '', memo: '',
};

export default function HgpInventory() {
  const { user } = useAuth();
  useEntityOpsRealtime();

  const { data: parts = [], isLoading: partsLoading } = useHgpParts();
  const { data: movements = [] } = useInventoryMovements();
  const { data: position } = useHgpInventoryPosition();
  const { data: jobs = [] } = useHgpJobs();
  const { data: units = [] } = useEquipmentUnits();
  const { data: vendors = [] } = useVendors();

  const upsertPart = useEntityOpsUpsert('hgp_parts');
  const deletePart = useEntityOpsSoftDelete('hgp_parts');
  const insertMovement = useEntityOpsUpsert('hgp_inventory_movements');
  const voidMovement = useEntityOpsSoftDelete('hgp_inventory_movements');
  const upsertUnit = useEntityOpsUpsert('hgp_equipment_units');
  const upsertJob = useEntityOpsUpsert('hgp_jobs');
  const upsertPO = useEntityOpsUpsert('hgp_purchase_orders');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'alerts' | 'name' | 'qty' | 'value'>('alerts');
  const [detailPart, setDetailPart] = useState<any | null>(null);
  const [logPoOnReceive, setLogPoOnReceive] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [partDialog, setPartDialog] = useState(false);
  const [partForm, setPartForm] = useState({ ...BLANK_PART });
  const [movementDialog, setMovementDialog] = useState(false);
  const [movementForm, setMovementForm] = useState({ ...BLANK_MOVEMENT });

  /* ── Scan station: keyboard-wedge scanners type the code and send Enter;
     the camera path uses the browser BarcodeDetector where available. ── */
  const [scanDialog, setScanDialog] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scannedPart, setScannedPart] = useState<any | null>(null);
  const [scanMode, setScanMode] = useState<'received' | 'consumed'>('received');
  const [scanQty, setScanQty] = useState('1');
  const [scanJobId, setScanJobId] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stopCamera = () => {
    if (detectTimerRef.current) { clearInterval(detectTimerRef.current); detectTimerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const lookupSku = (code: string) => {
    const q = code.trim().toLowerCase();
    if (!q) return;
    const hit = livePartsAll.find(p => (p.sku ?? '').toLowerCase() === q)
      ?? livePartsAll.find(p => (p.sku ?? '').toLowerCase().includes(q));
    if (hit) {
      setScannedPart(hit);
      setScanQty('1');
      stopCamera();
    } else {
      toast.info(`No part with SKU "${code.trim()}" — creating it`);
      setScanDialog(false);
      stopCamera();
      setPartForm({ ...BLANK_PART, sku: code.trim() });
      setPartDialog(true);
    }
  };

  const startCamera = async () => {
    if (!hasBarcodeDetector) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        const Detector = (window as any).BarcodeDetector;
        const detector = new Detector({ formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] });
        detectTimerRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              const raw = codes[0].rawValue ?? '';
              if (raw) { setScanValue(raw); lookupSku(raw); }
            }
          } catch { /* detection frame failed — keep looping */ }
        }, 350);
      });
    } catch {
      toast.error('Camera unavailable — use a USB/Bluetooth scanner or type the SKU');
    }
  };

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (scanDialog && !scannedPart) {
      const t = setTimeout(() => scanInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [scanDialog, scannedPart]);

  const saveScanMovement = async () => {
    if (!user?.id || !scannedPart) return;
    const qty = Number(scanQty);
    if (!qty || qty <= 0) return toast.error('Enter a positive quantity');
    const unitCost = num(scannedPart.unit_cost);
    try {
      await insertMovement.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        part_id: scannedPart.id,
        job_id: scanMode === 'consumed' ? (scanJobId || null) : null,
        movement_type: scanMode,
        quantity: qty,
        unit_cost: unitCost || null,
        total_cost: unitCost ? qty * unitCost : null,
        memo: 'Scan station',
      });
      toast.success(`${scanMode === 'received' ? 'Received' : 'Consumed'} ${qty} × ${scannedPart.name}`);
      // Stay open for rapid back-to-back scanning.
      setScannedPart(null);
      setScanValue('');
      setScanJobId('');
    } catch (e: any) { toast.error(e.message); }
  };

  /* ── Deploy a serialized generator from stock onto a job ── */
  const [deployUnit, setDeployUnit] = useState<any | null>(null);
  const [deployJobId, setDeployJobId] = useState('');

  const saveDeploy = async () => {
    if (!user?.id || !deployUnit) return;
    const job = (jobs as any[]).find(j => j.id === deployJobId);
    if (!job) return toast.error('Pick a job to deploy onto');
    try {
      await upsertJob.mutateAsync({
        id: job.id, user_id: job.user_id, entity_id: job.entity_id,
        customer_name: job.customer_name, job_type: job.job_type, stage: job.stage,
        equipment_unit_id: deployUnit.id,
        generator_model: deployUnit.model ?? job.generator_model,
        serial_number: deployUnit.serial_number ?? job.serial_number,
        kw_rating: deployUnit.kw_rating ?? job.kw_rating,
        fuel_type: deployUnit.fuel_type ?? job.fuel_type,
        equipment_cost: num(deployUnit.unit_cost) || job.equipment_cost,
        equipment_status: 'delivered',
      });
      await upsertUnit.mutateAsync({
        id: deployUnit.id, user_id: deployUnit.user_id, entity_id: deployUnit.entity_id,
        model: deployUnit.model, status: 'reserved',
        customer_name: job.customer_name,
      });
      toast.success(`${deployUnit.model} deployed to ${job.customer_name} — install completion moves it out of stock`);
      setDeployUnit(null);
      setDeployJobId('');
    } catch (e: any) { toast.error(e.message); }
  };

  const stockUnits = useMemo(
    () => (units as any[]).filter(u => ['in_stock', 'reserved'].includes(u.status)),
    [units],
  );

  const livePartsAll = parts as any[];
  const isLow = (p: any) => num(p.qty_on_hand) <= num(p.reorder_point);

  const kpis = useMemo(() => {
    const unitsOnHand = (units as any[]).filter(u => ['in_stock', 'reserved'].includes(u.status));
    const fallback = {
      unitsOnHand: unitsOnHand.length,
      unitsValue: unitsOnHand.reduce((s, u) => s + num(u.unit_cost), 0),
      partSkus: livePartsAll.length,
      partsValue: livePartsAll.reduce((s, p) => s + Math.max(num(p.qty_on_hand), 0) * num(p.unit_cost), 0),
      lowStockCount: livePartsAll.filter(isLow).length,
      consumed30d: (movements as any[])
        .filter(m => m.movement_type === 'consumed' && Date.now() - new Date(m.created_at).getTime() <= 30 * 86400000)
        .reduce((s, m) => s + num(m.total_cost ?? num(m.quantity) * num(m.unit_cost)), 0),
    };
    return position ?? fallback;
  }, [position, units, livePartsAll, movements]);

  const filteredParts = useMemo(() => livePartsAll.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (lowOnly && !isLow(p)) return false;
    if (search) {
      const hay = [p.name, p.sku, p.location].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return String(a.name).localeCompare(String(b.name));
    if (sortBy === 'qty') return num(a.qty_on_hand) - num(b.qty_on_hand);
    if (sortBy === 'value') return num(b.qty_on_hand) * num(b.unit_cost) - num(a.qty_on_hand) * num(a.unit_cost);
    return Number(isLow(b)) - Number(isLow(a)) || String(a.name).localeCompare(String(b.name));
  }),
  [livePartsAll, categoryFilter, lowOnly, search, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: livePartsAll.length };
    for (const pt of livePartsAll) counts[pt.category] = (counts[pt.category] ?? 0) + 1;
    return counts;
  }, [livePartsAll]);

  /* Per-part movement stats for the detail drawer. */
  const partHistory = useMemo(() => {
    if (!detailPart) return { rows: [] as any[], receivedQty: 0, consumedQty: 0, receivedValue: 0, consumedValue: 0 };
    const rows = (movements as any[]).filter(m => m.part_id === detailPart.id);
    const sum = (type: string, field: 'q' | 'v') => rows
      .filter(m => m.movement_type === type)
      .reduce((acc, m) => acc + (field === 'q' ? num(m.quantity) : num(m.total_cost ?? num(m.quantity) * num(m.unit_cost))), 0);
    return {
      rows,
      receivedQty: sum('received', 'q'), consumedQty: sum('consumed', 'q'),
      receivedValue: sum('received', 'v'), consumedValue: sum('consumed', 'v'),
    };
  }, [detailPart, movements]);

  /* Low stock → one-click reorder PO at the preferred supplier. Expense
     posts via the PO trigger; stock adds when the delivery is received. */
  const reorderPart = async (pt: any) => {
    if (!user?.id) return;
    const qty = num(pt.reorder_qty) || Math.max(num(pt.reorder_point) * 2, 1);
    const total = qty * num(pt.unit_cost);
    try {
      await upsertPO.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        vendor_id: pt.vendor_id || null,
        order_date: todayLocalDate(),
        total_amount: total,
        status: 'ordered',
        memo: `Reorder ${qty} × ${pt.name}${pt.sku ? ` (${pt.sku})` : ''}`,
      });
      toast.success(`PO created for ${qty} × ${pt.name}${total > 0 ? ` — ${fmtUSD(total)} expense posted` : ''}. Receive stock when it arrives.`);
    } catch (e: any) {
      toast.error(e.message?.includes('hgp_purchase_orders') ? 'Run migration 20260718000002 to enable purchase orders' : e.message);
    }
  };

  const exportPartsCsv = () => {
    const header = 'Name,SKU,Category,Qty On Hand,Reorder Point,Unit Cost,Value,Bin,Supplier';
    const lines = filteredParts.map(pt => {
      const vendor = (vendors as any[]).find(v => v.id === pt.vendor_id);
      const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [cell(pt.name), cell(pt.sku), cell(PART_CATEGORIES[pt.category] ?? pt.category),
        num(pt.qty_on_hand), num(pt.reorder_point), num(pt.unit_cost).toFixed(2),
        (Math.max(num(pt.qty_on_hand), 0) * num(pt.unit_cost)).toFixed(2),
        cell(pt.location), cell(vendor?.name)].join(',');
    });
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hgp-parts-inventory-${todayLocalDate()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openPart = (p?: any) => {
    setPartForm(p ? {
      id: p.id, sku: p.sku ?? '', name: p.name ?? '', category: p.category ?? 'parts',
      unit_cost: num(p.unit_cost) ? String(p.unit_cost) : '',
      reorder_point: num(p.reorder_point) ? String(p.reorder_point) : '',
      reorder_qty: p.reorder_qty != null ? String(p.reorder_qty) : '',
      vendor_id: p.vendor_id ?? '', location: p.location ?? '', notes: p.notes ?? '',
    } : { ...BLANK_PART });
    setPartDialog(true);
  };

  const savePart = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!partForm.name.trim()) return toast.error('Part name is required');
    try {
      await upsertPart.mutateAsync({
        ...(partForm.id ? { id: partForm.id } : {}),
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        sku: partForm.sku.trim() || null,
        name: partForm.name.trim(),
        category: partForm.category,
        unit_cost: Number(partForm.unit_cost) || 0,
        reorder_point: Number(partForm.reorder_point) || 0,
        reorder_qty: partForm.reorder_qty ? Number(partForm.reorder_qty) : null,
        vendor_id: partForm.vendor_id || null,
        location: partForm.location.trim() || null,
        notes: partForm.notes.trim() || null,
      });
      toast.success(partForm.id ? 'Part updated' : 'Part added — receive stock to set quantity');
      setPartDialog(false);
    } catch (e: any) {
      toast.error(e.message?.includes('hgp_parts') ? 'Run migration 20260717000008 to enable the inventory system' : e.message);
    }
  };

  const openMovement = (type: string, part?: any) => {
    setMovementForm({
      ...BLANK_MOVEMENT,
      movement_type: type,
      part_id: part?.id ?? '',
      unit_cost: part && num(part.unit_cost) ? String(part.unit_cost) : '',
      vendor_id: part?.vendor_id ?? '',
    });
    setMovementDialog(true);
  };

  const saveMovement = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!movementForm.part_id) return toast.error('Select a part');
    const qty = Number(movementForm.quantity);
    if (!qty || (movementForm.movement_type !== 'adjusted' && qty <= 0)) {
      return toast.error(movementForm.movement_type === 'adjusted'
        ? 'Enter a non-zero adjustment (negative to reduce)'
        : 'Enter a positive quantity');
    }
    const unitCost = Number(movementForm.unit_cost) || 0;
    try {
      let poId: string | null = null;
      if (movementForm.movement_type === 'received' && logPoOnReceive && Math.abs(qty) * unitCost > 0) {
        try {
          const po: any = await upsertPO.mutateAsync({
            user_id: user.id,
            entity_id: 'houston-generator-pros',
            vendor_id: movementForm.vendor_id || null,
            po_number: poNumber.trim() || null,
            order_date: todayLocalDate(),
            total_amount: Math.abs(qty) * unitCost,
            status: 'received',
            memo: movementForm.memo.trim() || 'Parts receiving',
          });
          poId = po?.id ?? null;
        } catch { toast.info('Run migration 20260718000002 so receipts can post PO expenses.'); }
      }
      await insertMovement.mutateAsync({
        ...(poId ? { metadata: { po_id: poId } } : {}),
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        part_id: movementForm.part_id,
        job_id: movementForm.job_id || null,
        vendor_id: movementForm.vendor_id || null,
        movement_type: movementForm.movement_type,
        quantity: qty,
        unit_cost: unitCost || null,
        total_cost: unitCost ? Math.abs(qty) * unitCost : null,
        memo: movementForm.memo.trim() || null,
      });
      toast.success(
        movementForm.movement_type === 'consumed' && movementForm.job_id
          ? 'Stock consumed — cost added to the job\'s materials'
          : poId ? 'Stock received — purchase expense posted to HGP financials'
          : 'Movement recorded');
      setMovementDialog(false);
      setLogPoOnReceive(false);
      setPoNumber('');
    } catch (e: any) {
      toast.error(e.message?.includes('hgp_inventory_movements') ? 'Run migration 20260717000008 to enable the inventory system' : e.message);
    }
  };

  const activeJobs = (jobs as any[]).filter(j => !['completed', 'lost'].includes(j.stage));

  return (
    <AppShell>
      <style>{INV_CSS}</style>
      <PageHeader
        eyebrow="Houston Generator Pros"
        title="Inventory"
        description="Parts, materials, and generator stock — receive, consume to jobs, and audit every movement."
        actions={
          <div className="flex items-center gap-2">
            <button className="inv-action !h-8 px-3" onClick={() => { setScanValue(''); setScannedPart(null); setScanMode('received'); setScanDialog(true); }}>
              <ScanLine className="w-3 h-3" /> Scan
            </button>
            <button className="inv-action !h-8 px-3" onClick={() => openMovement('received')}><PackagePlus className="w-3 h-3" /> Receive</button>
            <button className="inv-primary" onClick={() => openPart()}><Plus className="w-3.5 h-3.5" /> New Part</button>
          </div>
        }
      />

      <div className="inv-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-3.5">
          {/* ── KPI rail ── */}
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-1.5">
            {[
              ['Generators On Hand', String(kpis.unitsOnHand), Zap, HGP_BLUE],
              ['Generator Value', fmtUSD(kpis.unitsValue), Boxes, '#7c3aed'],
              ['Part SKUs', String(kpis.partSkus), Package, '#0891b2'],
              ['Parts Value', fmtUSD(kpis.partsValue), Package, '#059669'],
              ['Low Stock', String(kpis.lowStockCount), AlertTriangle, kpis.lowStockCount ? '#dc2626' : '#64748b'],
              ['Consumed 30d', fmtUSD(kpis.consumed30d), PackageMinus, '#d97706'],
            ].map(([label, value, Icon, color]: any) => (
              <div key={label} className="inv-kpi" style={{ '--accent': color } as any}>
                <div className="flex items-center justify-between gap-1">
                  <div className="inv-k">{label}</div>
                  <Icon className="w-3 h-3 shrink-0" style={{ color }} strokeWidth={1.8} />
                </div>
                <div className="inv-v">{value}</div>
              </div>
            ))}
          </div>

          {/* ── Generator stock → deploy to jobs ── */}
          {stockUnits.length > 0 && (
            <div className="inv-panel p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="inv-k">Generator Stock · Deploy to Jobs</div>
                <span className="text-[9px] font-mono-tab text-muted-foreground">{stockUnits.length} unit{stockUnits.length === 1 ? '' : 's'} available</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {stockUnits.map(u => (
                  <div key={u.id} className="border border-border px-2.5 py-2 flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold truncate">{u.model}</div>
                      <div className="text-[9px] text-muted-foreground truncate font-mono-tab">
                        {u.serial_number ? `SN ${u.serial_number} · ` : ''}{fmtUSD(num(u.unit_cost))}
                        {u.status === 'reserved' ? ` · reserved${u.customer_name ? ` — ${u.customer_name}` : ''}` : ''}
                      </div>
                    </div>
                    <button className="inv-action shrink-0" onClick={() => { setDeployUnit(u); setDeployJobId(''); }}>
                      Deploy <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[170px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, SKU, bin…"
                className="w-full h-9 pl-7 pr-2.5 text-[16px] sm:text-[12px] border border-border bg-background outline-none focus:border-foreground/30" />
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="rounded-none h-9 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alerts">Alerts First</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="qty">Qty Low→High</SelectItem>
                <SelectItem value="value">Value High→Low</SelectItem>
              </SelectContent>
            </Select>
            <button className="inv-action !h-9 px-3" style={lowOnly ? { borderColor: '#dc262680', color: '#dc2626', background: '#dc262610' } : undefined}
              onClick={() => setLowOnly(v => !v)}>
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </button>
            <button className="inv-action !h-9 px-3" onClick={exportPartsCsv} title="Export the filtered register as CSV">
              <Download className="w-3 h-3" /> CSV
            </button>
            <Link to="/finance/dashboard" className="inv-action !h-9 px-3 ml-auto" title="Serialized generators live on the Generator Ops register">
              <Zap className="w-3 h-3" /> Generator Register
            </Link>
          </div>

          {/* ── Category chips ── */}
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:overflow-x-auto scrollbar-none pb-0.5 max-h-24 overflow-y-auto sm:max-h-none sm:overflow-y-visible">
            {[['all', 'All'], ...Object.entries(PART_CATEGORIES)].map(([k, l]) => (
              <button key={k} className="inv-action sm:shrink-0 !h-7"
                style={categoryFilter === k ? { borderColor: HGP_BLUE + '80', color: HGP_BLUE, background: HGP_BLUE + '0d' } : undefined}
                onClick={() => setCategoryFilter(k)}>
                {l} <span className="font-mono-tab opacity-70">{categoryCounts[k] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* ── Parts register ── */}
          <div className="inv-panel overflow-x-auto">
            <div className="min-w-[880px]">
              <div className="inv-row grid grid-cols-[1.6fr_.8fr_.9fr_.6fr_.6fr_.7fr_.8fr_.9fr_1fr] gap-2 bg-secondary/45 inv-k items-center">
                <div>Part</div><div>SKU</div><div>Category</div><div>On Hand</div><div>Reorder</div><div>Unit Cost</div><div>Value</div><div>Supplier</div><div className="text-right">Actions</div>
              </div>
              {filteredParts.map(p => {
                const low = isLow(p);
                const negative = num(p.qty_on_hand) < 0;
                const vendor = (vendors as any[]).find(v => v.id === p.vendor_id);
                return (
                  <div key={p.id} className="inv-row grid grid-cols-[1.6fr_.8fr_.9fr_.6fr_.6fr_.7fr_.8fr_.9fr_1fr] gap-2 items-center">
                    <button className="min-w-0 text-left group" onClick={() => setDetailPart(p)} title="Open part history">
                      <div className="font-bold truncate group-hover:underline underline-offset-2">{p.name}</div>
                      {p.location && <div className="text-[9px] text-muted-foreground">Bin {p.location}</div>}
                    </button>
                    <div className="font-mono-tab text-[10px] truncate">{p.sku || '—'}</div>
                    <div className="text-[10px]">{PART_CATEGORIES[p.category] ?? p.category}</div>
                    <div className={`font-mono-tab font-bold ${negative ? 'text-destructive' : low ? 'text-warning' : ''}`}>
                      {num(p.qty_on_hand)}
                      {negative && <span className="text-[8px] uppercase font-black ml-1">Miscount</span>}
                    </div>
                    <div className="font-mono-tab text-[10px] text-muted-foreground">{num(p.reorder_point) || '—'}</div>
                    <div className="font-mono-tab">{fmtUSD(num(p.unit_cost))}</div>
                    <div className="font-mono-tab font-bold">{fmtUSD(Math.max(num(p.qty_on_hand), 0) * num(p.unit_cost))}</div>
                    <div className="text-[10px] truncate">{vendor?.name || '—'}</div>
                    <div className="flex items-center gap-1 justify-end">
                      {low && (
                        <button className="inv-action !text-warning" title={`Reorder ${num(p.reorder_qty) || Math.max(num(p.reorder_point) * 2, 1)} from supplier (creates a PO expense)`}
                          onClick={() => reorderPart(p)}>
                          <ShoppingCart className="w-3 h-3" />
                        </button>
                      )}
                      <button className="inv-action" title="Receive stock" onClick={() => openMovement('received', p)}><PackagePlus className="w-3 h-3" /></button>
                      <button className="inv-action" title="Consume to a job" onClick={() => openMovement('consumed', p)}><Wrench className="w-3 h-3" /></button>
                      <button className="inv-action" title="Adjust count" onClick={() => openMovement('adjusted', p)}><SlidersHorizontal className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-foreground" title="Edit part" onClick={() => openPart(p)}><Pencil className="w-3 h-3" /></button>
                      <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove part"
                        onClick={() => { if (confirm('Remove this part? Its movement history is preserved.')) deletePart.mutate(p.id, { onSuccess: () => toast.success('Part removed') }); }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!partsLoading && !filteredParts.length && (
                <div className="py-12 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" strokeWidth={1.2} />
                  <div className="text-sm font-bold">{livePartsAll.length ? 'No parts match these filters' : 'No parts yet'}</div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {livePartsAll.length
                      ? 'Adjust the category or low-stock filter.'
                      : 'Add batteries, transfer switches, filters, and materials — then receive stock and consume it to jobs.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Movement ledger ── */}
          <div className="inv-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="inv-k">Movement Ledger</div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                {(movements as any[]).map(m => {
                  const meta = MOVEMENT_META[m.movement_type] ?? MOVEMENT_META.adjusted;
                  const item = m.hgp_parts?.name
                    ?? (m.hgp_equipment_units ? `${m.hgp_equipment_units.model}${m.hgp_equipment_units.serial_number ? ` · SN ${m.hgp_equipment_units.serial_number}` : ''}` : '—');
                  return (
                    <div key={m.id} className="inv-row grid grid-cols-[.8fr_1.6fr_.5fr_.8fr_1.1fr_1.2fr_.4fr] gap-2 items-center">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5" style={{ backgroundColor: meta.color + '16', color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="min-w-0 truncate font-bold text-[11px]">{item}</div>
                      <div className="font-mono-tab">{num(m.quantity)}</div>
                      <div className="font-mono-tab">{m.total_cost != null ? fmtUSD(num(m.total_cost)) : '—'}</div>
                      <div className="text-[10px] truncate text-muted-foreground">
                        {m.hgp_jobs?.customer_name ? `Job · ${m.hgp_jobs.customer_name}` : m.memo || '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono-tab">
                        {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="flex justify-end">
                        {!m.metadata?.source && (
                          <button className="p-1 text-muted-foreground hover:text-destructive" title="Void movement (reverses its effect)"
                            onClick={() => { if (confirm('Void this movement? Quantities and job costs will be reversed.')) voidMovement.mutate(m.id, { onSuccess: () => toast.success('Movement voided and reversed') }); }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!(movements as any[]).length && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Every receive, consume, adjustment, and unit lifecycle event lands here — a complete audit trail.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Part dialog ── */}
      <Dialog open={partDialog} onOpenChange={setPartDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{partForm.id ? 'Edit Part' : 'New Part'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="inv-k mb-1">Name *</div>
              <Input className="inv-field" placeholder="e.g. Group 26R Battery" value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">SKU</div>
              <Input className="inv-field font-mono-tab" value={partForm.sku} onChange={e => setPartForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">Category</div>
              <Select value={partForm.category} onValueChange={v => setPartForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="inv-field"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PART_CATEGORIES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="inv-k mb-1">Unit Cost</div>
              <Input className="inv-field" type="number" inputMode="decimal" value={partForm.unit_cost} onChange={e => setPartForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">Bin / Location</div>
              <Input className="inv-field" placeholder="e.g. A-3" value={partForm.location} onChange={e => setPartForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">Reorder Point</div>
              <Input className="inv-field" type="number" inputMode="decimal" value={partForm.reorder_point} onChange={e => setPartForm(f => ({ ...f, reorder_point: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">Reorder Qty</div>
              <Input className="inv-field" type="number" inputMode="decimal" value={partForm.reorder_qty} onChange={e => setPartForm(f => ({ ...f, reorder_qty: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="inv-k mb-1">Preferred Supplier</div>
              <Select value={partForm.vendor_id || '__none__'} onValueChange={v => setPartForm(f => ({ ...f, vendor_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="inv-field"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(vendors as any[]).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <div className="inv-k mb-1">Notes</div>
              <Textarea className="rounded-none text-xs" rows={2} value={partForm.notes} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button className="inv-primary w-full mt-2" onClick={savePart} disabled={upsertPart.isPending}>
            {partForm.id ? 'Save Part' : 'Add Part'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Movement dialog ── */}
      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {movementForm.movement_type === 'received' ? 'Receive Stock'
                : movementForm.movement_type === 'consumed' ? 'Consume to Job'
                : 'Adjust Count'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="inv-k mb-1">Part *</div>
              <Select value={movementForm.part_id || '__none__'} onValueChange={v => {
                const p = livePartsAll.find(x => x.id === v);
                setMovementForm(f => ({ ...f, part_id: v === '__none__' ? '' : v, unit_cost: p && num(p.unit_cost) ? String(p.unit_cost) : f.unit_cost }));
              }}>
                <SelectTrigger className="inv-field"><SelectValue placeholder="Select part" /></SelectTrigger>
                <SelectContent>
                  {livePartsAll.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ''} ({num(p.qty_on_hand)} on hand)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="inv-k mb-1">{movementForm.movement_type === 'adjusted' ? 'Delta (± allowed)' : 'Quantity *'}</div>
              <Input className="inv-field" type="number" inputMode="decimal" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <div className="inv-k mb-1">Unit Cost</div>
              <Input className="inv-field" type="number" inputMode="decimal" value={movementForm.unit_cost} onChange={e => setMovementForm(f => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            {movementForm.movement_type === 'consumed' && (
              <div className="col-span-2">
                <div className="inv-k mb-1">Consume to Job</div>
                <Select value={movementForm.job_id || '__none__'} onValueChange={v => setMovementForm(f => ({ ...f, job_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="inv-field"><SelectValue placeholder="No job — shop use" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No job — shop use</SelectItem>
                    {activeJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.job_type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-[9px] text-muted-foreground mt-1">
                  Naming a job adds the cost to that job's materials automatically — its margin updates itself.
                </div>
              </div>
            )}
            {movementForm.movement_type === 'received' && (
              <div className="col-span-2 border border-border px-2.5 py-2">
                <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4" checked={logPoOnReceive} onChange={e => setLogPoOnReceive(e.target.checked)} />
                  Log purchase order → HGP expense
                </label>
                {logPoOnReceive && (
                  <Input className="inv-field mt-2 font-mono-tab" placeholder="PO number (optional)" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
                )}
              </div>
            )}
            {movementForm.movement_type === 'received' && (
              <div className="col-span-2">
                <div className="inv-k mb-1">From Supplier</div>
                <Select value={movementForm.vendor_id || '__none__'} onValueChange={v => setMovementForm(f => ({ ...f, vendor_id: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="inv-field"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {(vendors as any[]).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2">
              <div className="inv-k mb-1">Memo</div>
              <Input className="inv-field" placeholder="PO #, reason…" value={movementForm.memo} onChange={e => setMovementForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
          </div>
          <button className="inv-primary w-full mt-2" onClick={saveMovement} disabled={insertMovement.isPending}>
            Record Movement
          </button>
        </DialogContent>
      </Dialog>
      {/* ── Scan station dialog ── */}
      <Dialog open={scanDialog} onOpenChange={open => { setScanDialog(open); if (!open) { stopCamera(); setScannedPart(null); setScanValue(''); } }}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Scan Station</DialogTitle></DialogHeader>

          <div className="flex gap-1.5">
            {(['received', 'consumed'] as const).map(m => (
              <button key={m} className="inv-action flex-1 !h-9 justify-center"
                style={scanMode === m ? { borderColor: (m === 'received' ? '#059669' : '#dc2626') + '80', color: m === 'received' ? '#059669' : '#dc2626', background: (m === 'received' ? '#059669' : '#dc2626') + '10' } : undefined}
                onClick={() => setScanMode(m)}>
                {m === 'received' ? <><PackagePlus className="w-3 h-3" /> Receive In</> : <><PackageMinus className="w-3 h-3" /> Consume Out</>}
              </button>
            ))}
          </div>

          {!scannedPart ? (
            <div className="space-y-2.5">
              <div>
                <div className="inv-k mb-1">Scan or type SKU, then Enter</div>
                <Input
                  ref={scanInputRef}
                  className="inv-field !h-12 !text-[16px] font-mono-tab tracking-wider"
                  placeholder="▌ waiting for scan…"
                  value={scanValue}
                  onChange={e => setScanValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') lookupSku(scanValue); }}
                />
              </div>
              {hasBarcodeDetector ? (
                <div>
                  {cameraOn ? (
                    <div className="space-y-1.5">
                      <video ref={videoRef} className="w-full h-44 object-cover border border-border bg-black" muted playsInline />
                      <button className="inv-action w-full justify-center !h-9" onClick={stopCamera}><VideoOff className="w-3 h-3" /> Stop Camera</button>
                    </div>
                  ) : (
                    <button className="inv-action w-full justify-center !h-9" onClick={startCamera}><Video className="w-3 h-3" /> Scan with Camera</button>
                  )}
                </div>
              ) : (
                <div className="text-[9px] text-muted-foreground">
                  Camera scanning needs a browser with BarcodeDetector (Chrome/Edge). USB and Bluetooth scanners work in the field above.
                </div>
              )}
              <div className="text-[9px] text-muted-foreground">
                Unknown SKUs open the New Part form pre-filled — scan once, catalog forever.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="border border-border p-2.5">
                <div className="text-[12px] font-bold">{scannedPart.name}</div>
                <div className="text-[9px] text-muted-foreground font-mono-tab">
                  SKU {scannedPart.sku || '—'} · {num(scannedPart.qty_on_hand)} on hand · {fmtUSD(num(scannedPart.unit_cost))} each
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="inv-k mb-1">Quantity</div>
                  <Input autoFocus className="inv-field !h-11 !text-[15px] font-mono-tab" type="number" inputMode="decimal"
                    value={scanQty} onChange={e => setScanQty(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveScanMovement(); }} />
                </div>
                <div className="flex items-end pb-0.5 text-[10px] text-muted-foreground">
                  {scanMode === 'received' ? 'Adds to stock at carrying cost.' : 'Pulls from stock — name a job to cost it.'}
                </div>
                {scanMode === 'consumed' && (
                  <div className="col-span-2">
                    <div className="inv-k mb-1">Consume to Job</div>
                    <Select value={scanJobId || '__none__'} onValueChange={v => setScanJobId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="inv-field"><SelectValue placeholder="No job — shop use" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No job — shop use</SelectItem>
                        {activeJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.job_type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="inv-action !h-10 px-4" onClick={() => { setScannedPart(null); setScanValue(''); }}>Rescan</button>
                <button className="inv-primary flex-1 !h-10" onClick={saveScanMovement} disabled={insertMovement.isPending}>
                  {scanMode === 'received' ? 'Receive' : 'Consume'} & Next Scan
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Deploy unit dialog ── */}
      <Dialog open={!!deployUnit} onOpenChange={open => { if (!open) setDeployUnit(null); }}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader><DialogTitle className="text-base">Deploy {deployUnit?.model}</DialogTitle></DialogHeader>
          <div className="text-[10px] text-muted-foreground -mt-1 mb-1 font-mono-tab">
            {deployUnit?.serial_number ? `SN ${deployUnit.serial_number} · ` : ''}{fmtUSD(num(deployUnit?.unit_cost))} cost
          </div>
          <div>
            <div className="inv-k mb-1">Deploy Onto Job *</div>
            <Select value={deployJobId || '__none__'} onValueChange={v => setDeployJobId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="inv-field"><SelectValue placeholder="Select an active job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select an active job</SelectItem>
                {activeJobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.job_type} · {j.stage.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-[9px] text-muted-foreground leading-relaxed">
            The job takes this unit's model, serial, kW, fuel, and equipment cost; the unit is reserved to the customer.
            When the job completes, the automation marks it installed and moves it out of stock for good.
          </div>
          <button className="inv-primary w-full mt-1" onClick={saveDeploy} disabled={!deployJobId || upsertJob.isPending}>
            Deploy to Job
          </button>
        </DialogContent>
      </Dialog>
      {/* ── Part detail drawer ── */}
      <Dialog open={!!detailPart} onOpenChange={open => { if (!open) setDetailPart(null); }}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {detailPart?.name}
              {detailPart && num(detailPart.qty_on_hand) <= num(detailPart.reorder_point) && (
                <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 bg-warning/15 text-warning">Low Stock</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailPart && (
            <>
              <div className="text-[10px] text-muted-foreground -mt-1 font-mono-tab">
                SKU {detailPart.sku || '—'} · {PART_CATEGORIES[detailPart.category] ?? detailPart.category}
                {detailPart.location ? ` · Bin ${detailPart.location}` : ''}
              </div>
              <div className="grid grid-cols-4 divide-x divide-border border border-border bg-secondary/25 text-center">
                {[
                  ['On Hand', String(num(detailPart.qty_on_hand)), num(detailPart.qty_on_hand) < 0 ? 'text-destructive' : ''],
                  ['Value', fmtUSD(Math.max(num(detailPart.qty_on_hand), 0) * num(detailPart.unit_cost)), ''],
                  ['Received', `${partHistory.receivedQty}`, 'text-positive'],
                  ['Consumed', `${partHistory.consumedQty}`, 'text-warning'],
                ].map(([label, value, cls]: any) => (
                  <div key={label} className="px-2 py-2">
                    <div className="inv-k">{label}</div>
                    <div className={`font-mono-tab font-black text-[14px] mt-0.5 ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button className="inv-action flex-1 justify-center !h-9" onClick={() => { const pt = detailPart; setDetailPart(null); openMovement('received', pt); }}>
                  <PackagePlus className="w-3 h-3" /> Receive
                </button>
                <button className="inv-action flex-1 justify-center !h-9" onClick={() => { const pt = detailPart; setDetailPart(null); openMovement('consumed', pt); }}>
                  <Wrench className="w-3 h-3" /> Consume
                </button>
                <button className="inv-action flex-1 justify-center !h-9" onClick={() => { const pt = detailPart; setDetailPart(null); openMovement('adjusted', pt); }}>
                  <SlidersHorizontal className="w-3 h-3" /> Adjust
                </button>
                <button className="inv-action flex-1 justify-center !h-9" onClick={() => { const pt = detailPart; setDetailPart(null); openPart(pt); }}>
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </div>
              <div>
                <div className="inv-k mb-1.5">Movement History</div>
                <div className="border border-border divide-y divide-border/60 max-h-56 overflow-y-auto">
                  {partHistory.rows.map(m => {
                    const meta = MOVEMENT_META[m.movement_type] ?? MOVEMENT_META.adjusted;
                    return (
                      <div key={m.id} className="px-2.5 py-1.5 flex items-center gap-2 text-[11px]">
                        <span className="text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 shrink-0"
                          style={{ backgroundColor: meta.color + '16', color: meta.color }}>{meta.label}</span>
                        <span className="font-mono-tab shrink-0">{num(m.quantity)}</span>
                        <span className="text-muted-foreground truncate flex-1">
                          {m.hgp_jobs?.customer_name ? `Job · ${m.hgp_jobs.customer_name}` : m.memo || '—'}
                        </span>
                        <span className="font-mono-tab text-muted-foreground shrink-0">
                          {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                  {!partHistory.rows.length && (
                    <div className="px-3 py-6 text-center text-[10px] text-muted-foreground">
                      No movements yet (ledger shows the most recent 60 movements across all parts).
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
