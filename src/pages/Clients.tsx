import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { useFinanceClientAccounts, useProjects } from '@/hooks/useFinance';
import { useCustomerSites, useHgpJobs, useServiceVisits } from '@/hooks/useEntityOps';
import { supabase } from '@/integrations/supabase/client';
import { fmtDate, fmtUSD } from '@/lib/format';
import { toast } from 'sonner';
import {
  Building2, CalendarClock, CheckCircle2, ClipboardList, DownloadCloud, Edit3, Home,
  Link2, Mail, MapPin, Phone, Plus, Search, Trash2, UserRound, Zap,
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';

const CSS = `
.clients-shell{background:linear-gradient(180deg,hsl(var(--secondary)/.28),transparent 240px);}
.clients-card{border:1px solid hsl(var(--border));background:linear-gradient(180deg,rgba(255,255,255,.96),hsl(var(--background)));box-shadow:0 16px 42px rgba(15,23,42,.055);}
.clients-label{font-size:8px;text-transform:uppercase;letter-spacing:.18em;font-weight:900;color:hsl(var(--muted-foreground));}
.clients-input{height:38px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 10px;font-size:12px;outline:none;width:100%;min-width:0;}
.clients-input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.12);}
.clients-btn{height:38px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 12px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;transition:background .16s,border-color .16s,transform .16s;}
.clients-btn:hover{background:hsl(var(--secondary)/.55);border-color:hsl(var(--foreground)/.22);}
.clients-btn-primary{background:#111827;color:white;border-color:#111827;}
.clients-btn-danger{background:#991b1b;color:white;border-color:#991b1b;}
.clients-row{display:grid;grid-template-columns:minmax(190px,1.25fr) minmax(150px,.9fr) minmax(130px,.8fr) minmax(130px,.8fr) 110px;gap:12px;align-items:center;}
@media(max-width:860px){.clients-row{grid-template-columns:1fr;gap:7px}.clients-btn{width:100%;}}
`;

const HGP_ID = 'houston-generator-pros';
const HE_ID = 'houston-enterprise';

const blank = {
  id: '',
  name: '',
  company: '',
  client_type: 'residential',
  status: 'active',
  email: '',
  phone: '',
  secondary_phone: '',
  billing_address: '',
  site_address: '',
  city: 'Houston',
  county: '',
  state: 'TX',
  zip: '',
  preferred_contact_method: 'phone',
  project_id: '',
  hgp_site_id: '',
  construction_scope: '',
  property_type: '',
  project_stage: '',
  utility_provider: '',
  generator_model: '',
  generator_serial: '',
  kw_rating: '',
  fuel_type: 'natural_gas',
  install_status: '',
  next_visit_date: '',
  notes: '',
  tags: '',
};

const val = (v: unknown) => Number(v || 0);

function clientTitle(entityId?: string) {
  if (entityId === HGP_ID) {
    return {
      eyebrow: 'Houston Generator Pros',
      title: 'Client & Site Command Center',
      description: 'Manage generator customers, property locations, utility providers, equipment context, service history, emergency readiness, and future visits.',
    };
  }
  return {
    eyebrow: 'Houston Enterprise',
    title: 'Construction Client Accounts',
    description: 'Manage residential and commercial owners, linked projects, project scope, invoices, income, expenses, and client-level financial history.',
  };
}

export default function Clients() {
  const { user } = useAuth();
  const { entity } = useEntity();
  const qc = useQueryClient();
  const entityId = entity?.id ?? HE_ID;
  const isHgp = entityId === HGP_ID;
  const copy = clientTitle(entityId);
  const { data: clients = [], error } = useFinanceClientAccounts();
  const { data: projects = [] } = useProjects();
  const { data: hgpSites = [] } = useCustomerSites();
  const { data: hgpJobs = [] } = useHgpJobs();
  const { data: visits = [] } = useServiceVisits();
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => (clients as any[]).find(c => c.id === selectedId) ?? (clients as any[])[0] ?? null, [clients, selectedId]);
  const titleClient = selected?.name || (isHgp ? 'No generator client selected' : 'No construction client selected');

  const summary = useQuery({
    queryKey: ['finance-client-account-summary', entityId],
    enabled: !!user?.id && !error,
    queryFn: async () => {
      const { data, error: rpcError } = await (supabase as any).rpc('get_finance_client_account_summary', { p_entity_id: entityId });
      if (rpcError) throw rpcError;
      return data ?? [];
    },
  });

  const summaryRows = (summary.data ?? []) as any[];
  const selectedSummary = summaryRows.find(r => r.id === selected?.id) ?? null;

  /* ── Client Portal roster: every portal account, matched to finance accounts
     by stamped metadata.portal_client_id or email, importable in one click ── */
  const portalQuery = useQuery({
    queryKey: ['portal-clients-roster'],
    enabled: !isHgp,
    queryFn: async () => {
      const { data, error: pErr } = await (supabase as any)
        .from('portal_clients')
        .select('id, name, email, phone, status, project_type, created_at')
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;
      return data ?? [];
    },
  });
  const portalClients = (portalQuery.data ?? []) as any[];
  const financeIdByPortal = useMemo(() => {
    const map: Record<string, string> = {};
    (clients as any[]).forEach(c => {
      const pid = c.metadata?.portal_client_id;
      if (pid) map[pid] = c.id;
    });
    portalClients.forEach(p => {
      if (map[p.id]) return;
      const byEmail = p.email && (clients as any[]).find(c => c.email?.toLowerCase() === p.email.toLowerCase());
      if (byEmail) map[p.id] = byEmail.id;
    });
    return map;
  }, [clients, portalClients]);
  const unimportedPortal = useMemo(
    () => portalClients.filter(p => !financeIdByPortal[p.id]),
    [portalClients, financeIdByPortal],
  );
  const importPortal = useMutation({
    mutationFn: async (targets: any[]) => {
      const rows = targets.map(p => ({
        user_id: user?.id,
        entity_id: entityId,
        client_type: 'residential',
        status: p.status === 'approved' ? 'active' : 'prospect',
        name: p.name,
        email: p.email || null,
        phone: p.phone || null,
        construction_scope: p.project_type || null,
        notes: 'Imported from the client portal.',
        metadata: { portal_client_id: p.id, source: 'client-portal' },
      }));
      const { error: insErr } = await (supabase as any).from('finance_client_accounts').insert(rows);
      if (insErr) throw insErr;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['finance-client-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-client-account-summary'] });
      toast.success(`Imported ${n} portal client${n === 1 ? '' : 's'} into finance`);
    },
    onError: (e: any) => toast.error(`Import failed: ${e.message}`),
  });

  const selectedJobs = (hgpJobs as any[]).filter(j =>
    selected && (j.finance_client_id === selected.id || (!j.finance_client_id && j.customer_name?.toLowerCase() === selected.name?.toLowerCase())),
  );
  const selectedVisits = (visits as any[]).filter(v =>
    selected && (v.finance_client_id === selected.id || (!v.finance_client_id && v.customer_name?.toLowerCase() === selected.name?.toLowerCase())),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (clients as any[]).filter(c => !q || [c.name, c.company, c.email, c.phone, c.site_address, c.city, c.zip, c.project_name].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [clients, query]);
  const CLIENTS_PAGE_SIZE = 20;
  const { page: clientsPage, setPage: setClientsPage, pageCount: clientsPageCount, paged: pagedClients } =
    usePagination(filtered, CLIENTS_PAGE_SIZE, query);

  const reset = () => setForm(blank);

  const edit = (c: any) => {
    setSelectedId(c.id);
    setForm({
      ...blank,
      ...Object.fromEntries(Object.keys(blank).map(k => [k, c[k] ?? ''])),
      kw_rating: c.kw_rating ? String(c.kw_rating) : '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('You must be signed in');
      if (!form.name.trim()) throw new Error('Client name is required');
      const payload: Record<string, unknown> = {
        user_id: user.id,
        entity_id: entityId,
        name: form.name.trim(),
        company: form.company || null,
        client_type: form.client_type,
        status: form.status,
        email: form.email || null,
        phone: form.phone || null,
        secondary_phone: form.secondary_phone || null,
        billing_address: form.billing_address || null,
        site_address: form.site_address || null,
        city: form.city || null,
        county: form.county || null,
        state: form.state || 'TX',
        zip: form.zip || null,
        preferred_contact_method: form.preferred_contact_method,
        project_id: form.project_id || null,
        hgp_site_id: form.hgp_site_id || null,
        construction_scope: form.construction_scope || null,
        property_type: form.property_type || null,
        project_stage: form.project_stage || null,
        utility_provider: form.utility_provider || null,
        generator_model: form.generator_model || null,
        generator_serial: form.generator_serial || null,
        kw_rating: form.kw_rating ? Number(form.kw_rating) : null,
        fuel_type: form.fuel_type || null,
        install_status: form.install_status || null,
        next_visit_date: form.next_visit_date || null,
        notes: form.notes || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const query = form.id
        ? (supabase as any).from('finance_client_accounts').update(payload).eq('id', form.id).select('*').single()
        : (supabase as any).from('finance_client_accounts').insert(payload).select('*').single();
      const { data, error: saveError } = await query;
      if (saveError) throw saveError;
      if (isHgp && data?.id && (form.site_address || form.zip) && !form.hgp_site_id) {
        await (supabase as any).from('hgp_customer_sites').insert({
          user_id: user.id,
          entity_id: HGP_ID,
          finance_client_id: data.id,
          customer_name: form.name.trim(),
          customer_email: form.email || null,
          customer_phone: form.phone || null,
          site_address: form.site_address || null,
          city: form.city || null,
          county: form.county || null,
          zip: form.zip || null,
          utility_provider: form.utility_provider || null,
          notes: 'Created from HGP client account',
        });
      }
      return data;
    },
    onSuccess: data => {
      setSelectedId(data?.id ?? selectedId);
      reset();
      qc.invalidateQueries({ queryKey: ['finance-client-accounts'] });
      qc.invalidateQueries({ queryKey: ['finance-client-account-summary'] });
      qc.invalidateQueries({ queryKey: ['hgp-customer-sites'] });
      toast.success('Client account saved');
    },
    onError: (e: any) => toast.error(e.message || 'Could not save client'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await (supabase as any)
        .from('finance_client_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ['finance-client-accounts'] });
      toast.success('Client archived');
    },
  });

  const stats = {
    count: (clients as any[]).length,
    active: (clients as any[]).filter(c => c.status === 'active').length,
    revenue: summaryRows.reduce((s, r) => s + val(r.lifetime_income), 0),
    balance: summaryRows.reduce((s, r) => s + val(r.invoice_open_balance), 0),
  };

  if (error) {
    return (
      <AppShell>
        <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        <div className="p-6">
          <div className="clients-card p-5 max-w-3xl">
            <h2 className="text-lg font-black">Database migration required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Run `supabase/migrations/20260718000008_entity_client_accounts.sql`, then run `SELECT * FROM verify_entity_client_accounts();`.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{CSS}</style>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <div className="clients-shell px-4 sm:px-8 py-6 space-y-5">
        <section className="clients-card p-4 sm:p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Client Accounts', stats.count.toLocaleString(), UserRound],
              ['Active', stats.active.toLocaleString(), CheckCircle2],
              ['Lifetime Income', fmtUSD(stats.revenue), ClipboardList],
              ['Open Balance', fmtUSD(stats.balance), CalendarClock],
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="border border-border bg-background/80 p-3 min-w-0">
                <div className="clients-label flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</div>
                <div className="mt-2 text-lg sm:text-xl font-black font-mono-tab break-words">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[.78fr_1.22fr] gap-4">
          <div className="clients-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-slate-600" />
              <h3 className="font-black">{form.id ? 'Edit Client Account' : 'Add Client Account'}</h3>
            </div>
            <div className="space-y-3">
              <input className="clients-input" placeholder={isHgp ? 'Customer name' : 'Owner / client name'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className="clients-input" placeholder={isHgp ? 'Company / property manager' : 'Company / organization'} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="clients-input" value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
                  <option value="residential">Residential</option><option value="commercial">Commercial</option><option value="builder">Builder</option><option value="property_manager">Property Manager</option><option value="other">Other</option>
                </select>
                <select className="clients-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="lead">Lead</option><option value="active">Active</option><option value="proposal">Proposal</option><option value="scheduled">Scheduled</option><option value="on_hold">On hold</option><option value="completed">Completed</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="clients-input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <input className="clients-input" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <input className="clients-input" placeholder={isHgp ? 'Generator site address' : 'Project/site address'} value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input className="clients-input" placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                <input className="clients-input" placeholder="County" value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} />
                <input className="clients-input" placeholder="ZIP" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
              </div>
              <select className="clients-input" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">{isHgp ? 'Link install job/project later' : 'Link construction project'}</option>
                {(projects as any[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {isHgp ? (
                <>
                  <select className="clients-input" value={form.hgp_site_id} onChange={e => setForm(f => ({ ...f, hgp_site_id: e.target.value }))}>
                    <option value="">Link existing generator site</option>
                    {(hgpSites as any[]).map(s => <option key={s.id} value={s.id}>{s.customer_name} · {s.site_address || s.zip || 'site'}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="clients-input" placeholder="Utility provider" value={form.utility_provider} onChange={e => setForm(f => ({ ...f, utility_provider: e.target.value }))} />
                    <input className="clients-input" placeholder="Generator model" value={form.generator_model} onChange={e => setForm(f => ({ ...f, generator_model: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input className="clients-input" placeholder="Serial #" value={form.generator_serial} onChange={e => setForm(f => ({ ...f, generator_serial: e.target.value }))} />
                    <input className="clients-input" placeholder="kW" value={form.kw_rating} onChange={e => setForm(f => ({ ...f, kw_rating: e.target.value }))} />
                    <input className="clients-input" type="date" value={form.next_visit_date} onChange={e => setForm(f => ({ ...f, next_visit_date: e.target.value }))} />
                  </div>
                </>
              ) : (
                <>
                  <input className="clients-input" placeholder="Construction scope: kitchen remodel, commercial buildout..." value={form.construction_scope} onChange={e => setForm(f => ({ ...f, construction_scope: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="clients-input" placeholder="Property type" value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} />
                    <input className="clients-input" placeholder="Project stage" value={form.project_stage} onChange={e => setForm(f => ({ ...f, project_stage: e.target.value }))} />
                  </div>
                </>
              )}
              <textarea className="clients-input min-h-[84px] py-2" placeholder="Relationship notes, access notes, billing preferences..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2">
                <button className="clients-btn clients-btn-primary flex-1" onClick={() => save.mutate()} disabled={save.isPending}><CheckCircle2 className="w-3.5 h-3.5" /> Save Client</button>
                <button className="clients-btn" onClick={reset}>Clear</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            {/* ── Client Portal roster — every portal account, linked or one-click importable ── */}
            {!isHgp && portalClients.length > 0 && (
              <div className="clients-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="clients-label">Client Portal</div>
                    <h3 className="text-xl font-black">Portal accounts ({portalClients.length})</h3>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {portalClients.length - unimportedPortal.length} linked to finance · {unimportedPortal.length} not yet imported
                    </div>
                  </div>
                  {unimportedPortal.length > 0 && (
                    <button className="clients-btn clients-btn-primary" disabled={importPortal.isPending}
                      onClick={() => importPortal.mutate(unimportedPortal)}>
                      <DownloadCloud className="w-3.5 h-3.5" /> Import all {unimportedPortal.length}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {portalClients.map(p => {
                    const linkedId = financeIdByPortal[p.id];
                    return (
                      <div key={p.id}
                        className={`border p-3 flex flex-col gap-1.5 transition-colors ${linkedId ? 'border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40' : 'border-dashed border-border'}`}
                        onClick={() => linkedId && setSelectedId(linkedId)}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm truncate">{p.name}</span>
                          <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${p.status === 'approved' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                            {p.status || 'pending'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {[p.email, p.project_type].filter(Boolean).join(' · ') || '—'}
                        </div>
                        <div className="mt-auto pt-1">
                          {linkedId ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700">
                              <Link2 className="w-3 h-3" /> Linked to finance — view account →
                            </span>
                          ) : (
                            <button className="clients-btn h-7 px-2.5 text-[10px]" disabled={importPortal.isPending}
                              onClick={e => { e.stopPropagation(); importPortal.mutate([p]); }}>
                              <DownloadCloud className="w-3 h-3" /> Import
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="clients-card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="clients-label">Client Directory</div>
                  <h3 className="text-xl font-black">{isHgp ? 'Generator customers' : 'Construction clients'}</h3>
                </div>
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input className="clients-input pl-9" placeholder="Search clients..." value={query} onChange={e => setQuery(e.target.value)} />
                </div>
              </div>
              <div className="hidden md:grid clients-row clients-label border-b border-border pb-2">
                <div>Client</div><div>Location</div><div>Financials</div><div>{isHgp ? 'Service' : 'Project'}</div><div>Actions</div>
              </div>
              <div className="divide-y divide-border">
                {pagedClients.map((c: any) => {
                  const row = summaryRows.find(r => r.id === c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className={`clients-row w-full text-left py-3 transition-colors ${selected?.id === c.id ? 'bg-secondary/45' : 'hover:bg-secondary/25'}`}>
                      <div className="min-w-0">
                        <div className="font-black text-sm truncate flex items-center gap-1.5">
                          <span className="truncate">{c.name}</span>
                          {c.metadata?.portal_client_id && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-blue-700 bg-blue-50" title="Linked to a client-portal account">
                              <Link2 className="w-2.5 h-2.5" /> Portal
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{c.company || c.client_type} · {c.status}</div>
                      </div>
                      <div className="text-xs text-muted-foreground min-w-0"><MapPin className="w-3 h-3 inline mr-1" />{[c.city, c.zip].filter(Boolean).join(' ') || 'No location'}</div>
                      <div className="font-mono-tab text-xs">
                        <b>{fmtUSD(val(row?.lifetime_income))}</b><br /><span className="text-muted-foreground">Open {fmtUSD(val(row?.invoice_open_balance))}</span>
                      </div>
                      <div className="text-xs text-muted-foreground min-w-0 truncate">{isHgp ? `${row?.visit_count ?? 0} visits · next ${row?.next_visit_date ? fmtDate(row.next_visit_date) : 'not set'}` : (row?.project_name || c.construction_scope || 'Unlinked')}</div>
                      <div className="flex gap-1">
                        <span onClick={e => { e.stopPropagation(); edit(c); }} className="clients-btn h-8 px-2"><Edit3 className="w-3 h-3" /></span>
                        <span onClick={e => { e.stopPropagation(); remove.mutate(c.id); }} className="clients-btn clients-btn-danger h-8 px-2"><Trash2 className="w-3 h-3" /></span>
                      </div>
                    </button>
                  );
                })}
                {!filtered.length && <div className="py-10 text-center text-sm text-muted-foreground">No client accounts yet.</div>}
              </div>
              {filtered.length > CLIENTS_PAGE_SIZE && (
                <div className="pt-3 mt-1 border-t border-border">
                  <PaginationBar page={clientsPage} pageCount={clientsPageCount} total={filtered.length} pageSize={CLIENTS_PAGE_SIZE}
                    onPageChange={setClientsPage} itemLabel="clients" />
                </div>
              )}
            </div>

            <div className="clients-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="clients-label">Account Profile</div>
                  <h3 className="text-xl font-black">{titleClient}</h3>
                  <div className="text-xs text-muted-foreground mt-1">{selected?.company || selected?.client_type || 'Select a client to inspect history.'}</div>
                </div>
                {isHgp ? <Zap className="w-6 h-6 text-slate-600" /> : <Building2 className="w-6 h-6 text-slate-600" />}
              </div>
              {selected && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="border border-border p-3">
                    <div className="clients-label">Contact</div>
                    <div className="mt-2 text-xs space-y-2">
                      <div><Phone className="w-3 h-3 inline mr-1" />{selected.phone || 'No phone'}</div>
                      <div><Mail className="w-3 h-3 inline mr-1" />{selected.email || 'No email'}</div>
                      <div><Home className="w-3 h-3 inline mr-1" />{selected.site_address || selected.billing_address || 'No address'}</div>
                    </div>
                  </div>
                  <div className="border border-border p-3">
                    <div className="clients-label">{isHgp ? 'Generator Context' : 'Construction Context'}</div>
                    <div className="mt-2 text-xs space-y-2">
                      {isHgp ? (
                        <>
                          <div>Utility: <b>{selected.utility_provider || '—'}</b></div>
                          <div>Generator: <b>{selected.generator_model || '—'}</b></div>
                          <div>Serial: <b>{selected.generator_serial || '—'}</b></div>
                        </>
                      ) : (
                        <>
                          <div>Project: <b>{selectedSummary?.project_name || '—'}</b></div>
                          <div>Scope: <b>{selected.construction_scope || '—'}</b></div>
                          <div>Stage: <b>{selected.project_stage || selected.status}</b></div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border border-border p-3">
                    <div className="clients-label">Financial History</div>
                    <div className="mt-2 text-xs space-y-2">
                      <div>Income: <b>{fmtUSD(val(selectedSummary?.lifetime_income))}</b></div>
                      <div>Expenses: <b>{fmtUSD(val(selectedSummary?.lifetime_expense))}</b></div>
                      <div>Open AR: <b>{fmtUSD(val(selectedSummary?.invoice_open_balance))}</b></div>
                    </div>
                  </div>
                </div>
              )}
              {selected && isHgp && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="border border-border p-3">
                    <div className="clients-label mb-2">Job History</div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {selectedJobs.map((j: any) => <div key={j.id} className="text-xs border border-border p-2"><b>{j.job_type}</b> · {String(j.stage).replace(/_/g, ' ')} · {fmtUSD(val(j.quoted_amount))}</div>)}
                      {!selectedJobs.length && <div className="text-xs text-muted-foreground">No linked jobs yet.</div>}
                    </div>
                  </div>
                  <div className="border border-border p-3">
                    <div className="clients-label mb-2">Visit Timeline</div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {selectedVisits.map((v: any) => <div key={v.id} className="text-xs border border-border p-2"><b>{fmtDate(v.visit_date)}</b> · {v.visit_type} · {v.status}</div>)}
                      {!selectedVisits.length && <div className="text-xs text-muted-foreground">No linked visits yet.</div>}
                    </div>
                  </div>
                </div>
              )}
              {selected?.notes && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</p>}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
