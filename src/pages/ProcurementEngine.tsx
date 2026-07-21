import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useVendors } from '@/hooks/useFinance';
import { supabase } from '@/integrations/supabase/client';
import { scrapeUrl } from '@/integrations/firecrawl';
import { fmtUSD, fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';
import {
  AlertTriangle, ArrowRight, Brain, Building2, CheckCircle2, ClipboardList,
  ExternalLink, FileText, Mail, Plus, RefreshCw, Search, Send, ShoppingCart,
  Sparkles, TrendingDown,
} from 'lucide-react';

const ENTITY_ID = 'houston-enterprise';

const CSS = `
.proc-shell{background:linear-gradient(180deg,hsl(var(--secondary)/.32),transparent 240px);}
.proc-card{border:1px solid hsl(var(--border));background:linear-gradient(180deg,rgba(255,255,255,.96),hsl(var(--background)));box-shadow:0 18px 42px rgba(15,23,42,.055);}
.proc-label{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));}
.proc-input{height:38px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 10px;font-size:12px;outline:none;width:100%;min-width:0;}
.proc-input:focus{border-color:#9D7E3F;box-shadow:0 0 0 3px rgba(157,126,63,.12);}
.proc-btn{height:38px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 12px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;transition:background .16s,border-color .16s,transform .16s;}
.proc-btn:hover{background:hsl(var(--secondary)/.55);border-color:hsl(var(--foreground)/.22);}
.proc-btn:active{transform:scale(.98);}
.proc-btn-primary{background:#111827;color:white;border-color:#111827;}
.proc-btn-gold{background:#9D7E3F;color:white;border-color:#9D7E3F;}
.proc-grid-row{display:grid;grid-template-columns:minmax(160px,1.25fr) 90px 90px minmax(130px,.9fr) 120px;gap:10px;align-items:center;}
.proc-risk-safe{background:rgba(5,150,105,.08);color:#047857;border-color:rgba(5,150,105,.18);}
.proc-risk-watch{background:rgba(217,119,6,.09);color:#B45309;border-color:rgba(217,119,6,.2);}
.proc-risk-hot{background:rgba(220,38,38,.08);color:#B91C1C;border-color:rgba(220,38,38,.22);}
@media(max-width:760px){
  .proc-grid-row{grid-template-columns:1fr;gap:6px;}
  .proc-btn{width:100%;}
}
`;

type Requirement = {
  id: string;
  material_name: string;
  category: string;
  quantity: number;
  unit: string;
  target_unit_price?: number | null;
  required_by?: string | null;
  priority: string;
  status: string;
  notes?: string | null;
  project_id?: string | null;
  scope_item_id?: string | null;
  projects?: { name?: string | null } | null;
  project_scope_items?: { name?: string | null } | null;
};

type SupplierSource = {
  id: string;
  supplier_name: string;
  source_url?: string | null;
  contact_email?: string | null;
  source_type: string;
  active: boolean;
  last_scraped_at?: string | null;
};

type Quote = {
  id: string;
  material_name: string;
  unit: string;
  unit_price: number;
  quote_source: string;
  confidence: number;
  captured_at: string;
  quote_url?: string | null;
  supplier_source_id?: string | null;
  procurement_supplier_sources?: { supplier_name?: string | null } | null;
};

type HedgeRow = {
  normalized_material: string;
  display_material: string;
  category: string;
  unit: string;
  open_quantity: number;
  project_count: number;
  requirement_count: number;
  earliest_required_by?: string | null;
  avg_target_unit_price?: number | null;
  best_supplier_name?: string | null;
  best_unit_price?: number | null;
  estimated_cost: number;
  estimated_savings: number;
};

type Rfq = {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  supplier_count: number;
  project_count: number;
  total_estimated_cost: number;
  estimated_savings: number;
  due_date?: string | null;
  sent_at?: string | null;
  created_at: string;
};

const emptyReq = {
  project_id: '',
  material_name: '',
  category: 'Materials',
  quantity: '1',
  unit: 'ea',
  target_unit_price: '',
  required_by: '',
  priority: 'normal',
  notes: '',
};

const emptySource = {
  supplier_name: '',
  source_url: '',
  contact_email: '',
  source_type: 'firecrawl',
  preferred_categories: 'Materials',
};

const emptyQuote = {
  material_name: '',
  unit_price: '',
  unit: 'ea',
  supplier_source_id: '',
  quote_url: '',
};

const num = (v: unknown) => Number(v || 0);

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractLikelyPrice(markdown: string, material: string) {
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  const terms = normalize(material).split(' ').filter(t => t.length > 2);
  const candidates = lines.filter(line => {
    const hay = normalize(line);
    return terms.some(t => hay.includes(t)) && /\$\s?\d/.test(line);
  }).slice(0, 10);
  const fallback = candidates.length ? candidates : lines.filter(l => /\$\s?\d/.test(l)).slice(0, 10);
  for (const line of fallback) {
    const match = line.match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
    if (match) return { price: Number(match[1].replace(/,/g, '')), excerpt: line.slice(0, 500) };
  }
  return { price: 0, excerpt: candidates[0] || lines[0] || '' };
}

function riskTone(row: HedgeRow) {
  if (!row.best_unit_price) return 'hot';
  if (num(row.estimated_savings) > 2500 || num(row.project_count) >= 3) return 'safe';
  if (num(row.open_quantity) > 100 || num(row.project_count) > 1) return 'watch';
  return 'safe';
}

function rfqText(rfq: Rfq | null, lines: any[], sources: SupplierSource[]) {
  if (!rfq) return '';
  const materialLines = lines.map(l => `- ${l.material_name}: ${Number(l.total_quantity).toLocaleString()} ${l.unit}${l.best_unit_price ? ` (best observed ${fmtUSD(Number(l.best_unit_price))}/${l.unit})` : ''}`).join('\n');
  const supplierList = sources.filter(s => s.active && s.contact_email).map(s => `${s.supplier_name} <${s.contact_email}>`).join(', ');
  return [
    `RFQ: ${rfq.rfq_number} · ${rfq.title}`,
    `Due: ${rfq.due_date ? fmtDate(rfq.due_date) : 'Please provide best available lead time'}`,
    '',
    'Houston Enterprise is requesting volume pricing for the following construction material package:',
    materialLines || '- No lines loaded',
    '',
    'Please include unit pricing, availability, delivery terms, expiration date, and any volume discount tiers.',
    '',
    `Suggested suppliers: ${supplierList || 'Add supplier contact emails in the Procurement Engine.'}`,
  ].join('\n');
}

export default function ProcurementEngine() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const { data: vendors = [] } = useVendors();
  const [reqForm, setReqForm] = useState(emptyReq);
  const [sourceForm, setSourceForm] = useState(emptySource);
  const [quoteForm, setQuoteForm] = useState(emptyQuote);
  const [query, setQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqDue, setRfqDue] = useState('');
  const [activeRfqId, setActiveRfqId] = useState<string | null>(null);

  const baseEnabled = !!user?.id;

  const { data: requirements = [], error: reqError } = useQuery({
    queryKey: ['procurement-requirements'],
    enabled: baseEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_material_requirements' as any)
        .select('*, projects:project_id(name), project_scope_items:scope_item_id(name)')
        .eq('entity_id', ENTITY_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Requirement[];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['procurement-supplier-sources'],
    enabled: baseEnabled && !reqError,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_supplier_sources' as any)
        .select('*')
        .eq('entity_id', ENTITY_ID)
        .is('deleted_at', null)
        .order('supplier_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupplierSource[];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['procurement-price-quotes'],
    enabled: baseEnabled && !reqError,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_price_quotes' as any)
        .select('*, procurement_supplier_sources:supplier_source_id(supplier_name)')
        .eq('entity_id', ENTITY_ID)
        .is('deleted_at', null)
        .order('captured_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  const { data: hedge = [] } = useQuery({
    queryKey: ['procurement-hedge-summary'],
    enabled: baseEnabled && !reqError,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_procurement_hedge_summary' as any, { p_entity_id: ENTITY_ID });
      if (error) throw error;
      return (data ?? []) as HedgeRow[];
    },
  });

  const { data: rfqs = [] } = useQuery({
    queryKey: ['procurement-rfqs'],
    enabled: baseEnabled && !reqError,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_rfq_batches' as any)
        .select('*')
        .eq('entity_id', ENTITY_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Rfq[];
    },
  });

  const activeRfq = rfqs.find(r => r.id === activeRfqId) ?? rfqs[0] ?? null;

  const { data: rfqLines = [] } = useQuery({
    queryKey: ['procurement-rfq-lines', activeRfq?.id ?? 'none'],
    enabled: !!activeRfq?.id && !reqError,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_rfq_lines' as any)
        .select('*')
        .eq('rfq_batch_id', activeRfq!.id)
        .order('material_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    ['procurement-requirements', 'procurement-supplier-sources', 'procurement-price-quotes', 'procurement-hedge-summary', 'procurement-rfqs', 'procurement-rfq-lines'].forEach(k => {
      qc.invalidateQueries({ queryKey: [k] });
    });
  };

  const addRequirement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('You must be signed in');
      if (!reqForm.material_name.trim()) throw new Error('Material name is required');
      const payload = {
        user_id: user.id,
        entity_id: ENTITY_ID,
        project_id: reqForm.project_id || null,
        material_name: reqForm.material_name.trim(),
        category: reqForm.category || 'Materials',
        quantity: Number(reqForm.quantity || 0),
        unit: reqForm.unit || 'ea',
        target_unit_price: reqForm.target_unit_price ? Number(reqForm.target_unit_price) : null,
        required_by: reqForm.required_by || null,
        priority: reqForm.priority,
        notes: reqForm.notes || null,
      };
      const { error } = await supabase.from('procurement_material_requirements' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { setReqForm(emptyReq); invalidate(); toast.success('Material requirement added'); },
    onError: (e: any) => toast.error(e.message || 'Could not save requirement'),
  });

  const addSource = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('You must be signed in');
      if (!sourceForm.supplier_name.trim()) throw new Error('Supplier name is required');
      const payload = {
        user_id: user.id,
        entity_id: ENTITY_ID,
        supplier_name: sourceForm.supplier_name.trim(),
        source_url: sourceForm.source_url || null,
        contact_email: sourceForm.contact_email || null,
        source_type: sourceForm.source_type,
        preferred_categories: sourceForm.preferred_categories.split(',').map(s => s.trim()).filter(Boolean),
      };
      const { error } = await supabase.from('procurement_supplier_sources' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { setSourceForm(emptySource); invalidate(); toast.success('Supplier source added'); },
    onError: (e: any) => toast.error(e.message || 'Could not save supplier source'),
  });

  const addQuote = useMutation({
    mutationFn: async (extra?: Partial<typeof quoteForm> & { quote_source?: string; raw_excerpt?: string; confidence?: number }) => {
      if (!user?.id) throw new Error('You must be signed in');
      const form = { ...quoteForm, ...(extra ?? {}) };
      if (!form.material_name.trim()) throw new Error('Material is required');
      if (!form.unit_price || Number(form.unit_price) <= 0) throw new Error('Unit price is required');
      const source = sources.find(s => s.id === form.supplier_source_id);
      const payload = {
        user_id: user.id,
        entity_id: ENTITY_ID,
        supplier_source_id: form.supplier_source_id || null,
        vendor_id: null,
        material_name: form.material_name.trim(),
        unit: form.unit || 'ea',
        unit_price: Number(form.unit_price),
        quote_url: form.quote_url || source?.source_url || null,
        quote_source: extra?.quote_source || 'manual',
        confidence: extra?.confidence ?? 78,
        raw_excerpt: extra?.raw_excerpt || null,
      };
      const { error } = await supabase.from('procurement_price_quotes' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { setQuoteForm(emptyQuote); invalidate(); toast.success('Price quote captured'); },
    onError: (e: any) => toast.error(e.message || 'Could not save quote'),
  });

  const scrapeQuote = useMutation({
    mutationFn: async (source: SupplierSource) => {
      if (!selectedMaterial.trim()) throw new Error('Select a material to scrape first');
      if (!source.source_url) throw new Error('This supplier needs a source URL');
      const res = await scrapeUrl({ url: source.source_url, formats: ['markdown', 'links'], onlyMainContent: true, waitFor: 1200 });
      if (!res.success) throw new Error(res.error || 'Firecrawl scrape failed');
      const found = extractLikelyPrice(res.data?.markdown || '', selectedMaterial);
      if (!found.price) throw new Error('Scraped the page, but no clear price was found. Add this quote manually or use a more specific product URL.');
      const { error } = await supabase.from('procurement_price_quotes' as any).insert({
        user_id: user!.id,
        entity_id: ENTITY_ID,
        supplier_source_id: source.id,
        material_name: selectedMaterial,
        unit: quoteForm.unit || 'ea',
        unit_price: found.price,
        quote_url: source.source_url,
        quote_source: 'firecrawl',
        confidence: 72,
        raw_excerpt: found.excerpt,
        metadata: { page_title: res.data?.metadata?.title, source_url: res.data?.metadata?.sourceURL },
      });
      if (error) throw error;
      await supabase.from('procurement_supplier_sources' as any).update({ last_scraped_at: new Date().toISOString() }).eq('id', source.id);
    },
    onSuccess: () => { invalidate(); toast.success('Supplier price scraped and captured'); },
    onError: (e: any) => toast.error(e.message || 'Scrape failed'),
  });

  const createRfq = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_procurement_rfq_from_open' as any, {
        p_title: rfqTitle || null,
        p_due_date: rfqDue || null,
        p_requirement_ids: null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: id => { setActiveRfqId(id); setRfqTitle(''); setRfqDue(''); invalidate(); toast.success('Bulk RFQ drafted from open material demand'); },
    onError: (e: any) => toast.error(e.message || 'Could not draft RFQ'),
  });

  const markSent = useMutation({
    mutationFn: async (rfq: Rfq) => {
      const { error } = await supabase.from('procurement_rfq_batches' as any).update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', rfq.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('RFQ marked sent'); },
  });

  const filteredHedge = useMemo(() => {
    const q = query.toLowerCase().trim();
    return hedge.filter(row => !q || [row.display_material, row.category, row.best_supplier_name].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [hedge, query]);
  const HEDGE_PAGE_SIZE = 20;
  const { page: hedgePage, setPage: setHedgePage, pageCount: hedgePageCount, paged: pagedHedge } =
    usePagination(filteredHedge, HEDGE_PAGE_SIZE, query);

  const kpis = useMemo(() => {
    const openReqs = requirements.filter(r => ['open', 'quoted'].includes(r.status));
    const totalDemand = openReqs.reduce((s, r) => s + num(r.quantity) * num(r.target_unit_price), 0);
    const savings = hedge.reduce((s, h) => s + num(h.estimated_savings), 0);
    const multiJob = hedge.filter(h => num(h.project_count) >= 2).length;
    const quoted = hedge.filter(h => !!h.best_unit_price).length;
    return { openReqs: openReqs.length, totalDemand, savings, multiJob, quoted };
  }, [requirements, hedge]);

  const rfqBody = rfqText(activeRfq, rfqLines, sources);
  const mailtoHref = activeRfq
    ? `mailto:${sources.filter(s => s.active && s.contact_email).map(s => s.contact_email).join(',')}?subject=${encodeURIComponent(`RFQ ${activeRfq.rfq_number} · Houston Enterprise`)}&body=${encodeURIComponent(rfqBody)}`
    : '#';

  if (reqError) {
    return (
      <AppShell>
        <PageHeader eyebrow="HE Beta Tools" title="Procurement Hedge Engine" />
        <div className="p-6">
          <div className="proc-card p-5 max-w-3xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div>
                <h2 className="text-lg font-black">Database migration required</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Run `supabase/migrations/20260718000007_he_procurement_hedge_engine.sql`, then run `SELECT * FROM verify_he_procurement_hedge_engine();`.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{CSS}</style>
      <PageHeader
        eyebrow="HE Beta Tools"
        title="Automated Procurement & Material Hedge Engine"
        description="Aggregate project material demand, capture supplier pricing, identify volume-discount opportunities, and draft RFQs from real Houston Enterprise project data."
      />
      <div className="proc-shell px-4 sm:px-8 py-6 space-y-5">
        <section className="proc-card p-4 sm:p-5">
          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-5 items-stretch">
            <div>
              <div className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1 proc-label">
                <Sparkles className="w-3 h-3 text-[#9D7E3F]" /> Smart Purchase Routing
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Bulk demand, quote intelligence, RFQ control.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-4xl">
                This beta engine turns scattered project material needs into a consolidated buying desk. It watches material requirements, compares captured supplier prices, highlights hedge/savings opportunities, and prepares supplier-ready RFQs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Open Requirements', kpis.openReqs.toLocaleString(), ClipboardList],
                ['Demand at Target', fmtUSD(kpis.totalDemand), ShoppingCart],
                ['Estimated Savings', fmtUSD(kpis.savings), TrendingDown],
                ['Multi-Job Buys', kpis.multiJob.toLocaleString(), Building2],
              ].map(([label, value, Icon]: any) => (
                <button key={label} type="button" className="border border-border bg-background/80 p-3 text-left min-w-0">
                  <div className="flex items-center gap-2 proc-label"><Icon className="w-3.5 h-3.5 text-[#9D7E3F]" />{label}</div>
                  <div className="mt-2 text-lg font-black font-mono-tab break-words">{value}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="proc-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-[#9D7E3F]" />
              <h3 className="font-black">Add Material Demand</h3>
            </div>
            <div className="space-y-3">
              <select className="proc-input" value={reqForm.project_id} onChange={e => setReqForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">No project selected</option>
                {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className="proc-input" placeholder="Material: premium lumber, structural steel, concrete..." value={reqForm.material_name} onChange={e => setReqForm(f => ({ ...f, material_name: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input className="proc-input" placeholder="Qty" value={reqForm.quantity} onChange={e => setReqForm(f => ({ ...f, quantity: e.target.value }))} />
                <input className="proc-input" placeholder="Unit" value={reqForm.unit} onChange={e => setReqForm(f => ({ ...f, unit: e.target.value }))} />
                <input className="proc-input" placeholder="Target $" value={reqForm.target_unit_price} onChange={e => setReqForm(f => ({ ...f, target_unit_price: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="proc-input" type="date" value={reqForm.required_by} onChange={e => setReqForm(f => ({ ...f, required_by: e.target.value }))} />
                <select className="proc-input" value={reqForm.priority} onChange={e => setReqForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea className="proc-input min-h-[76px] py-2" placeholder="Notes, spec, grade, delivery constraints..." value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} />
              <button className="proc-btn proc-btn-primary w-full" onClick={() => addRequirement.mutate()} disabled={addRequirement.isPending}>
                <Plus className="w-3.5 h-3.5" /> Add Requirement
              </button>
            </div>
          </div>

          <div className="proc-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-[#9D7E3F]" />
              <h3 className="font-black">Supplier Scrape Targets</h3>
            </div>
            <div className="space-y-3">
              <input className="proc-input" placeholder="Supplier name" value={sourceForm.supplier_name} onChange={e => setSourceForm(f => ({ ...f, supplier_name: e.target.value }))} />
              <input className="proc-input" placeholder="Product/catalog URL for Firecrawl" value={sourceForm.source_url} onChange={e => setSourceForm(f => ({ ...f, source_url: e.target.value }))} />
              <input className="proc-input" placeholder="RFQ contact email" value={sourceForm.contact_email} onChange={e => setSourceForm(f => ({ ...f, contact_email: e.target.value }))} />
              <input className="proc-input" placeholder="Preferred categories, comma separated" value={sourceForm.preferred_categories} onChange={e => setSourceForm(f => ({ ...f, preferred_categories: e.target.value }))} />
              <button className="proc-btn w-full" onClick={() => addSource.mutate()} disabled={addSource.isPending}>
                <Plus className="w-3.5 h-3.5" /> Add Supplier Source
              </button>
              <div className="border-t border-border pt-3">
                <select className="proc-input mb-2" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
                  <option value="">Select material to scrape</option>
                  {hedge.map(h => <option key={h.normalized_material} value={h.display_material}>{h.display_material}</option>)}
                </select>
                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {sources.map(source => (
                    <div key={source.id} className="border border-border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{source.supplier_name}</div>
                          <div className="text-[9px] text-muted-foreground truncate">{source.source_url || 'No URL'}</div>
                        </div>
                        <button className="proc-btn h-8 px-2" onClick={() => scrapeQuote.mutate(source)} disabled={scrapeQuote.isPending || !source.source_url}>
                          <RefreshCw className="w-3 h-3" /> Scrape
                        </button>
                      </div>
                    </div>
                  ))}
                  {!sources.length && <div className="text-xs text-muted-foreground py-4 text-center">No supplier sources yet.</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="proc-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#9D7E3F]" />
              <h3 className="font-black">Manual Quote Capture</h3>
            </div>
            <div className="space-y-3">
              <input className="proc-input" placeholder="Material name" value={quoteForm.material_name} onChange={e => setQuoteForm(f => ({ ...f, material_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="proc-input" placeholder="Unit price" value={quoteForm.unit_price} onChange={e => setQuoteForm(f => ({ ...f, unit_price: e.target.value }))} />
                <input className="proc-input" placeholder="Unit" value={quoteForm.unit} onChange={e => setQuoteForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <select className="proc-input" value={quoteForm.supplier_source_id} onChange={e => setQuoteForm(f => ({ ...f, supplier_source_id: e.target.value }))}>
                <option value="">Unassigned supplier</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
              <input className="proc-input" placeholder="Quote/product URL" value={quoteForm.quote_url} onChange={e => setQuoteForm(f => ({ ...f, quote_url: e.target.value }))} />
              <button className="proc-btn proc-btn-gold w-full" onClick={() => addQuote.mutate()} disabled={addQuote.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Save Quote
              </button>
              <div className="text-[10px] leading-4 text-muted-foreground">
                Firecrawl scraping needs `VITE_FIRECRAWL_API_KEY`. Manual quotes still power the hedge engine and RFQ recommendations.
              </div>
            </div>
          </div>
        </section>

        <section className="proc-card p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <div className="proc-label">Hedge Opportunities</div>
              <h3 className="text-xl font-black">Aggregated material demand across active jobs</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="proc-input sm:w-64" placeholder="Search materials/suppliers..." value={query} onChange={e => setQuery(e.target.value)} />
              <input className="proc-input sm:w-64" placeholder="RFQ title" value={rfqTitle} onChange={e => setRfqTitle(e.target.value)} />
              <input className="proc-input sm:w-40" type="date" value={rfqDue} onChange={e => setRfqDue(e.target.value)} />
              <button className="proc-btn proc-btn-primary" onClick={() => createRfq.mutate()} disabled={createRfq.isPending || !hedge.length}>
                <Brain className="w-3.5 h-3.5" /> Draft Bulk RFQ
              </button>
            </div>
          </div>
          <div className="hidden md:grid proc-grid-row proc-label border-b border-border pb-2">
            <div>Material Package</div><div>Demand</div><div>Projects</div><div>Best Price</div><div>Signal</div>
          </div>
          <div className="divide-y divide-border">
            {pagedHedge.map(row => {
              const tone = riskTone(row);
              return (
                <button key={`${row.normalized_material}-${row.unit}`} type="button" className="proc-grid-row w-full text-left py-3 hover:bg-secondary/30 transition-colors" onClick={() => setSelectedMaterial(row.display_material)}>
                  <div className="min-w-0">
                    <div className="font-black text-sm truncate">{row.display_material}</div>
                    <div className="text-[10px] text-muted-foreground">{row.category} · Required {row.earliest_required_by ? fmtDate(row.earliest_required_by) : 'date open'}</div>
                  </div>
                  <div className="font-mono-tab font-bold">{Number(row.open_quantity).toLocaleString()} {row.unit}</div>
                  <div className="font-mono-tab">{Number(row.project_count).toLocaleString()}</div>
                  <div>
                    <div className="font-black">{row.best_unit_price ? `${fmtUSD(Number(row.best_unit_price))}/${row.unit}` : 'Needs quote'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{row.best_supplier_name || 'No supplier captured'}</div>
                  </div>
                  <div className={`border px-2 py-1 text-[9px] uppercase tracking-[0.1em] font-black ${tone === 'hot' ? 'proc-risk-hot' : tone === 'watch' ? 'proc-risk-watch' : 'proc-risk-safe'}`}>
                    {tone === 'hot' ? 'Quote Gap' : tone === 'watch' ? 'Bundle Watch' : `${fmtUSD(Number(row.estimated_savings || 0))} Save`}
                  </div>
                </button>
              );
            })}
            {!filteredHedge.length && <div className="py-10 text-center text-sm text-muted-foreground">No open material requirements match this search.</div>}
          </div>
          {filteredHedge.length > HEDGE_PAGE_SIZE && (
            <div className="pt-3 mt-1 border-t border-border">
              <PaginationBar page={hedgePage} pageCount={hedgePageCount} total={filteredHedge.length} pageSize={HEDGE_PAGE_SIZE}
                onPageChange={setHedgePage} itemLabel="materials" />
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[.9fr_1.1fr] gap-4">
          <div className="proc-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="proc-label">RFQ Packages</div>
                <h3 className="font-black">Drafts and sent batches</h3>
              </div>
              <ShoppingCart className="w-5 h-5 text-[#9D7E3F]" />
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {rfqs.map(rfq => (
                <button key={rfq.id} type="button" onClick={() => setActiveRfqId(rfq.id)} className={`w-full border p-3 text-left transition-colors ${activeRfq?.id === rfq.id ? 'border-[#9D7E3F] bg-[#9D7E3F]/5' : 'border-border hover:bg-secondary/35'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black text-sm">{rfq.rfq_number}</div>
                    <div className="proc-label">{rfq.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{rfq.title}</div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                    <div><span className="text-muted-foreground">Cost</span><br /><b>{fmtUSD(Number(rfq.total_estimated_cost || 0))}</b></div>
                    <div><span className="text-muted-foreground">Savings</span><br /><b>{fmtUSD(Number(rfq.estimated_savings || 0))}</b></div>
                    <div><span className="text-muted-foreground">Projects</span><br /><b>{rfq.project_count}</b></div>
                  </div>
                </button>
              ))}
              {!rfqs.length && <div className="text-sm text-muted-foreground text-center py-8">No RFQ packages yet. Draft one from open demand.</div>}
            </div>
          </div>

          <div className="proc-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="proc-label">Supplier-Ready RFQ</div>
                <h3 className="font-black">{activeRfq ? `${activeRfq.rfq_number} · ${activeRfq.title}` : 'No RFQ selected'}</h3>
              </div>
              <div className="flex gap-2">
                <a className="proc-btn" href={mailtoHref} onClick={() => activeRfq && markSent.mutate(activeRfq)}>
                  <Mail className="w-3.5 h-3.5" /> Email Package
                </a>
                {activeRfq && (
                  <button className="proc-btn proc-btn-gold" onClick={() => { navigator.clipboard.writeText(rfqBody); toast.success('RFQ copied'); }}>
                    <FileText className="w-3.5 h-3.5" /> Copy
                  </button>
                )}
              </div>
            </div>
            <div className="border border-border bg-secondary/20 p-3 max-h-[360px] overflow-auto">
              <pre className="text-xs leading-5 whitespace-pre-wrap font-mono">{rfqBody || 'Draft an RFQ to generate a supplier package.'}</pre>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {rfqLines.map((line: any) => (
                <div key={line.id} className="border border-border p-2">
                  <div className="font-black text-xs">{line.material_name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{Number(line.total_quantity).toLocaleString()} {line.unit} · {line.project_count} project(s)</div>
                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                    <span>{line.best_supplier_name || 'No supplier'}</span>
                    <ArrowRight className="w-3 h-3" />
                    <b>{line.best_unit_price ? fmtUSD(Number(line.best_unit_price)) : 'Quote needed'}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="proc-card p-4">
            <div className="proc-label mb-2">Recent Requirements</div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {requirements.slice(0, 12).map(r => (
                <div key={r.id} className="border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm truncate">{r.material_name}</div>
                    <div className="text-[9px] uppercase tracking-[0.12em] font-black text-muted-foreground">{r.status}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {Number(r.quantity).toLocaleString()} {r.unit} · {r.projects?.name || 'Unassigned project'} · {r.required_by ? fmtDate(r.required_by) : 'no due date'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="proc-card p-4">
            <div className="proc-label mb-2">Recent Price Intelligence</div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {quotes.slice(0, 12).map(q => (
                <div key={q.id} className="border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm truncate">{q.material_name}</div>
                    <div className="font-black font-mono-tab">{fmtUSD(Number(q.unit_price))}/{q.unit}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{q.procurement_supplier_sources?.supplier_name || q.quote_source}</span>
                    {q.quote_url && <a href={q.quote_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><ExternalLink className="w-3 h-3" /> source</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="text-[10px] text-muted-foreground leading-5">
          Supplier scraping must comply with supplier terms. For restricted catalogs, move scraping to a server-side Edge Function with approved credentials. This beta tool stores the source, excerpt, confidence, and captured timestamp for auditability.
        </div>
      </div>
    </AppShell>
  );
}
