/* ── Houston Generator Pros · Storm Response (outage intelligence) ───────────
   Monitors Texas power-provider outages against HGP's customer equipment
   registry. Backed by 20260717000003: a seeded provider registry (CenterPoint
   / Oncor / AEP Texas / Entergy Texas / TNMP / ERCOT with source type,
   refresh cadence, and terms notes — map-only providers are deliberately fed
   through the manual event logger rather than scraped), outage events,
   zip/county/city impact matching (match_hgp_outage_impacts RPC), an
   outreach workflow on each impacted customer, and one-click emergency
   dispatch (create_hgp_emergency_job RPC → a real hgp_jobs row in the
   Install Jobs emergency queue). ── */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useCustomerSites, useOutageSources, useOutageEvents, useOutageImpacts, useHgpJobs,
  useEntityOpsUpsert, useEntityOpsSoftDelete, useEntityOpsRealtime,
} from '@/hooks/useEntityOps';
import { fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  CloudLightning, Plus, MapPin, Users, Siren, ExternalLink,
  RadioTower, Trash2, Zap, RefreshCw, ShieldCheck, Crosshair, X,
} from 'lucide-react';
import DispatchMap, { type MapPoint } from '@/components/hgp/DispatchMap';

const JOB_COLORS: Record<string, string> = {
  install: '#1B72B5', service: '#0891b2', maintenance: '#059669',
  emergency: '#dc2626', warranty: '#7c3aed', survey: '#d97706',
};

/* Mapbox forward geocode — same authorized pattern as the admin Client Map. */
async function geocodeAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (!token || !q.trim()) return null;
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&country=us&limit=1&proximity=-95.3698,29.7604`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  const center = data?.features?.[0]?.center;
  return center ? { lng: center[0], lat: center[1] } : null;
}

const STORM_CSS = `
.st-shell{background:linear-gradient(180deg,rgba(220,38,38,0.04),transparent 180px);}
.st-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;}
.st-kpi{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 10px;min-width:0;position:relative;overflow:hidden;}
.st-kpi:before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--accent,#dc2626);}
.st-k{font-size:7.5px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:hsl(var(--muted-foreground));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.st-v{font-size:15px;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:3px;}
.st-primary{height:32px;background:hsl(var(--foreground));color:hsl(var(--background));padding:0 12px;font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:900;display:inline-flex;align-items:center;gap:6px;}
.st-action{height:28px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;display:inline-flex;align-items:center;gap:5px;}
.st-action:hover{background:hsl(var(--secondary)/.55);}
.st-field{height:38px;border-radius:0;font-size:12px;}
.dark .st-panel,.dark .st-kpi,.dark .st-action{background:hsl(var(--card));}
@media(max-width:767px){.st-v{font-size:13px}.st-panel{padding:10px!important}}
`;

const OUTAGE_STATUS: Record<string, { label: string; color: string }> = {
  active:     { label: 'Active',     color: '#dc2626' },
  monitoring: { label: 'Monitoring', color: '#d97706' },
  restored:   { label: 'Restored',   color: '#059669' },
};

const OUTREACH_STATUSES = ['none', 'planned', 'contacted', 'scheduled', 'converted'];

const num = (v: unknown) => Number(v || 0);
const fmtWhen = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const BLANK_EVENT = {
  source_id: '', provider: '', status: 'active', affected_customers: '',
  outage_started_at: '', estimated_restoration_at: '', cause: '',
  county: '', city: '', zip: '',
};

const BLANK_SITE = {
  customer_name: '', customer_email: '', customer_phone: '',
  site_address: '', city: '', county: '', zip: '', utility_provider: '',
};

export default function StormResponse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEntityOpsRealtime();

  const { data: sources = [] } = useOutageSources();
  const { data: events = [] } = useOutageEvents();
  const { data: impacts = [] } = useOutageImpacts();
  const { data: sites = [] } = useCustomerSites();
  const { data: jobs = [] } = useHgpJobs();

  const upsertEvent = useEntityOpsUpsert('hgp_outage_events');
  const deleteEvent = useEntityOpsSoftDelete('hgp_outage_events');
  const upsertSite = useEntityOpsUpsert('hgp_customer_sites');
  const upsertImpact = useEntityOpsUpsert('hgp_outage_impacts');
  const upsertJob = useEntityOpsUpsert('hgp_jobs');

  /* ── Dispatch map state ── */
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [showSites, setShowSites] = useState(true);
  const [showJobs, setShowJobs] = useState(true);
  const [showOutages, setShowOutages] = useState(true);
  const [mapEmergencyOnly, setMapEmergencyOnly] = useState(false);
  const [locating, setLocating] = useState<string | null>(null);

  const activeJobs = useMemo(
    () => (jobs as any[]).filter(j => !['completed', 'lost'].includes(j.stage)),
    [jobs],
  );

  const mapPoints = useMemo<MapPoint[]>(() => {
    const pts: MapPoint[] = [];
    if (showSites && !mapEmergencyOnly) {
      for (const s of sites as any[]) {
        if (s.latitude == null || s.longitude == null) continue;
        pts.push({ id: `site-${s.id}`, kind: 'site', lat: Number(s.latitude), lng: Number(s.longitude), label: s.customer_name, sub: [s.city, s.zip].filter(Boolean).join(' '), color: '#64748b' });
      }
    }
    if (showJobs) {
      for (const j of activeJobs) {
        if (j.latitude == null || j.longitude == null) continue;
        if (mapEmergencyOnly && !j.emergency) continue;
        pts.push({
          id: `job-${j.id}`, kind: 'job', lat: Number(j.latitude), lng: Number(j.longitude),
          label: j.customer_name, sub: `${j.job_type} · ${j.stage}`,
          color: JOB_COLORS[j.job_type] ?? '#1B72B5', pulse: !!j.emergency,
        });
      }
    }
    if (showOutages) {
      for (const e of (events as any[]).filter(e => e.status !== 'restored')) {
        if (e.latitude == null || e.longitude == null) continue;
        pts.push({ id: `outage-${e.id}`, kind: 'outage', lat: Number(e.latitude), lng: Number(e.longitude), label: e.provider, sub: `${num(e.affected_customers).toLocaleString()} affected`, color: '#dc2626' });
      }
    }
    return pts;
  }, [sites, activeJobs, events, showSites, showJobs, showOutages, mapEmergencyOnly]);

  /* Records with an address but no coordinates — locate via Mapbox geocoding
     or enter coordinates manually. */
  const needsCoords = useMemo(() => {
    const rows: { key: string; kind: 'site' | 'job'; row: any; address: string }[] = [];
    for (const s of sites as any[]) {
      if (s.latitude != null || (!s.site_address && !s.zip)) continue;
      rows.push({ key: `site-${s.id}`, kind: 'site', row: s, address: [s.site_address, s.city, 'TX', s.zip].filter(Boolean).join(', ') });
    }
    for (const j of activeJobs) {
      if (j.latitude != null || (!j.site_address && !j.zip)) continue;
      rows.push({ key: `job-${j.id}`, kind: 'job', row: j, address: [j.site_address, j.city, 'TX', j.zip].filter(Boolean).join(', ') });
    }
    return rows;
  }, [sites, activeJobs]);

  const locate = async (entry: { key: string; kind: 'site' | 'job'; row: any; address: string }) => {
    setLocating(entry.key);
    try {
      const hit = await geocodeAddress(entry.address);
      if (!hit) { toast.error('No geocoding match — enter coordinates manually'); return; }
      const upsert = entry.kind === 'site' ? upsertSite : upsertJob;
      await upsert.mutateAsync({
        id: entry.row.id, user_id: entry.row.user_id, entity_id: entry.row.entity_id,
        ...(entry.kind === 'site' ? { customer_name: entry.row.customer_name } : { customer_name: entry.row.customer_name, job_type: entry.row.job_type, stage: entry.row.stage }),
        latitude: hit.lat, longitude: hit.lng,
      });
      toast.success(`${entry.row.customer_name} placed on the map`);
    } catch (e: any) {
      toast.error(e.message?.includes('latitude') ? 'Run migration 20260717000007 to enable job coordinates' : e.message);
    } finally { setLocating(null); }
  };

  const selectedJob = selectedPoint?.kind === 'job'
    ? (jobs as any[]).find(j => `job-${j.id}` === selectedPoint.id) ?? null : null;
  const selectedSite = selectedPoint?.kind === 'site'
    ? (sites as any[]).find(s => `site-${s.id}` === selectedPoint.id) ?? null : null;
  const selectedOutage = selectedPoint?.kind === 'outage'
    ? (events as any[]).find(e => `outage-${e.id}` === selectedPoint.id) ?? null : null;

  const updateJobDispatch = async (patch: Record<string, unknown>) => {
    if (!selectedJob) return;
    try {
      await upsertJob.mutateAsync({
        id: selectedJob.id, user_id: selectedJob.user_id, entity_id: selectedJob.entity_id,
        customer_name: selectedJob.customer_name, job_type: selectedJob.job_type, stage: selectedJob.stage,
        ...patch,
      });
      toast.success('Dispatch updated');
    } catch (e: any) { toast.error(e.message); }
  };

  const [eventDialog, setEventDialog] = useState(false);
  const [eventForm, setEventForm] = useState({ ...BLANK_EVENT });
  const [siteDialog, setSiteDialog] = useState(false);
  const [siteForm, setSiteForm] = useState({ ...BLANK_SITE });
  const [matching, setMatching] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);

  const activeEvents = (events as any[]).filter(e => e.status !== 'restored');
  const kpis = useMemo(() => {
    const affected = activeEvents.reduce((s, e) => s + num(e.affected_customers), 0);
    const impactedSites = new Set((impacts as any[]).filter(i => activeEvents.some(e => e.id === i.outage_event_id)).map(i => i.site_id)).size;
    const planCustomers = (impacts as any[]).filter(i => i.hgp_customer_sites?.agreement_id).length;
    const emergencyOpen = (jobs as any[]).filter(j => j.emergency && !['completed', 'lost'].includes(j.stage)).length;
    return { activeCount: activeEvents.length, affected, impactedSites, planCustomers, emergencyOpen, siteCount: (sites as any[]).length };
  }, [activeEvents, impacts, jobs, sites]);

  const impactsByEvent = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const i of impacts as any[]) (map[i.outage_event_id] ??= []).push(i);
    return map;
  }, [impacts]);

  const providerTrend = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events as any[]) counts[e.provider] = (counts[e.provider] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [events]);

  const saveEvent = async () => {
    if (!user?.id) return toast.error('Sign in required');
    const source = (sources as any[]).find(s => s.id === eventForm.source_id);
    const provider = source?.provider || eventForm.provider.trim();
    if (!provider) return toast.error('Select or name the provider');
    if (!eventForm.zip.trim() && !eventForm.county.trim() && !eventForm.city.trim()) {
      return toast.error('Give at least a ZIP, county, or city so customers can be matched');
    }
    try {
      // Best-effort geocode so the outage plots on the dispatch map.
      const hit = await geocodeAddress([eventForm.city, eventForm.county, 'TX', eventForm.zip].filter(Boolean).join(', '));
      await upsertEvent.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        source_id: eventForm.source_id || null,
        provider,
        ...(hit ? { latitude: hit.lat, longitude: hit.lng } : {}),
        status: eventForm.status,
        affected_customers: Number(eventForm.affected_customers) || 0,
        outage_started_at: eventForm.outage_started_at ? new Date(eventForm.outage_started_at).toISOString() : new Date().toISOString(),
        estimated_restoration_at: eventForm.estimated_restoration_at ? new Date(eventForm.estimated_restoration_at).toISOString() : null,
        cause: eventForm.cause.trim() || null,
        county: eventForm.county.trim() || null,
        city: eventForm.city.trim() || null,
        zip: eventForm.zip.trim() || null,
      });
      toast.success('Outage logged — run customer matching');
      setEventDialog(false);
      setEventForm({ ...BLANK_EVENT });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveSite = async () => {
    if (!user?.id) return toast.error('Sign in required');
    if (!siteForm.customer_name.trim()) return toast.error('Customer name required');
    try {
      await upsertSite.mutateAsync({
        user_id: user.id,
        entity_id: 'houston-generator-pros',
        customer_name: siteForm.customer_name.trim(),
        customer_email: siteForm.customer_email.trim() || null,
        customer_phone: siteForm.customer_phone.trim() || null,
        site_address: siteForm.site_address.trim() || null,
        city: siteForm.city.trim() || null,
        county: siteForm.county.trim() || null,
        zip: siteForm.zip.trim() || null,
        utility_provider: siteForm.utility_provider.trim() || null,
      });
      toast.success('Customer site added to the registry');
      setSiteDialog(false);
      setSiteForm({ ...BLANK_SITE });
    } catch (e: any) { toast.error(e.message); }
  };

  const runMatch = async (eventId: string) => {
    setMatching(eventId);
    try {
      const { data, error } = await (supabase as any).rpc('match_hgp_outage_impacts', { p_outage_event_id: eventId });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['hgp-outage-impacts'] });
      toast.success(Number(data) > 0 ? `${data} customer site${Number(data) === 1 ? '' : 's'} matched into this outage` : 'No new customer sites in this area');
    } catch (e: any) { toast.error(e.message); }
    finally { setMatching(null); }
  };

  const dispatchEmergency = async (eventId: string, siteId: string, customer: string) => {
    setDispatching(siteId);
    try {
      const { error } = await (supabase as any).rpc('create_hgp_emergency_job', { p_outage_event_id: eventId, p_site_id: siteId });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['hgp-jobs'] });
      qc.invalidateQueries({ queryKey: ['hgp-outage-impacts'] });
      toast.success(`Emergency job created for ${customer} — see the Install Jobs emergency queue`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDispatching(null); }
  };

  const setOutreach = async (impact: any, status: string) => {
    try {
      await upsertImpact.mutateAsync({ id: impact.id, user_id: impact.user_id, entity_id: impact.entity_id, outage_event_id: impact.outage_event_id, site_id: impact.site_id, outreach_status: status });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppShell>
      <style>{STORM_CSS}</style>
      <PageHeader
        eyebrow="Houston Generator Pros"
        title="Storm Response"
        description="Texas outage intelligence — match provider outages to customer equipment, run outreach, dispatch emergency service."
        actions={
          <div className="flex items-center gap-2">
            <button className="st-action" onClick={() => setSiteDialog(true)}><MapPin className="w-3 h-3" /> Add Site</button>
            <button className="st-primary" onClick={() => setEventDialog(true)}><Plus className="w-3.5 h-3.5" /> Log Outage</button>
          </div>
        }
      />

      <div className="st-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-3.5">
          {/* ── KPIs ── */}
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-1.5">
            {[
              ['Active Outages', String(kpis.activeCount), CloudLightning, kpis.activeCount ? '#dc2626' : '#64748b'],
              ['Customers Affected', kpis.affected.toLocaleString(), Users, '#d97706'],
              ['HGP Sites Impacted', String(kpis.impactedSites), MapPin, kpis.impactedSites ? '#dc2626' : '#059669'],
              ['Plan Customers Hit', String(kpis.planCustomers), ShieldCheck, '#7c3aed'],
              ['Emergency Jobs Open', String(kpis.emergencyOpen), Siren, kpis.emergencyOpen ? '#dc2626' : '#64748b'],
              ['Sites in Registry', String(kpis.siteCount), RadioTower, '#1B72B5'],
            ].map(([label, value, Icon, color]: any) => (
              <div key={label} className="st-kpi" style={{ '--accent': color } as any}>
                <div className="flex items-center justify-between gap-1">
                  <div className="st-k">{label}</div>
                  <Icon className="w-3 h-3 shrink-0" style={{ color }} strokeWidth={1.8} />
                </div>
                <div className="st-v">{value}</div>
              </div>
            ))}
          </div>

          {/* ── Dispatch map ── */}
          <section className="st-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="st-k">Dispatch Map</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  ['Sites', showSites, setShowSites, '#64748b'],
                  ['Jobs', showJobs, setShowJobs, '#1B72B5'],
                  ['Outages', showOutages, setShowOutages, '#dc2626'],
                ].map(([label, on, set, color]: any) => (
                  <button key={label} className="st-action" style={on ? { borderColor: color + '80', color } : undefined} onClick={() => set((v: boolean) => !v)}>
                    {label}
                  </button>
                ))}
                <button className="st-action" style={mapEmergencyOnly ? { borderColor: '#dc262680', color: '#dc2626', background: '#dc262610' } : undefined} onClick={() => setMapEmergencyOnly(v => !v)}>
                  <Siren className="w-3 h-3" /> Emergency
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-3">
              <DispatchMap points={mapPoints} selectedId={selectedPoint?.id ?? null} onSelect={setSelectedPoint} height={400} />
              <div className="space-y-2.5 min-w-0">
                {selectedPoint ? (
                  <div className="border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold truncate">{selectedPoint.label}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">{selectedPoint.kind}{selectedPoint.sub ? ` · ${selectedPoint.sub}` : ''}</div>
                      </div>
                      <button className="p-1 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSelectedPoint(null)}><X className="w-3.5 h-3.5" /></button>
                    </div>
                    {selectedJob && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground">{[selectedJob.site_address, selectedJob.city, selectedJob.zip].filter(Boolean).join(', ')}</div>
                        <div>
                          <div className="st-k mb-1">Technician</div>
                          <Input className="st-field !h-8 !text-[11px]" defaultValue={selectedJob.technician ?? ''} key={selectedJob.id}
                            onBlur={e => { if (e.target.value !== (selectedJob.technician ?? '')) updateJobDispatch({ technician: e.target.value.trim() || null }); }} />
                        </div>
                        <div>
                          <div className="st-k mb-1">Dispatch Status</div>
                          <Select value={selectedJob.dispatch_status ?? 'unassigned'} onValueChange={v => updateJobDispatch({ dispatch_status: v })}>
                            <SelectTrigger className="st-field !h-8 !text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['unassigned', 'assigned', 'en_route', 'on_site', 'done'].map(s => (
                                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Link to="/projects" className="st-action w-full justify-center">Open in Install Jobs</Link>
                      </div>
                    )}
                    {selectedSite && (
                      <div className="space-y-1.5 text-[10px] text-muted-foreground">
                        <div>{[selectedSite.site_address, selectedSite.city, selectedSite.zip].filter(Boolean).join(', ')}</div>
                        {selectedSite.utility_provider && <div>Utility: {selectedSite.utility_provider}</div>}
                        {selectedSite.agreement_id
                          ? <div className="text-positive font-bold uppercase text-[9px]">Maintenance plan customer</div>
                          : <div className="text-warning font-bold uppercase text-[9px]">No maintenance plan</div>}
                      </div>
                    )}
                    {selectedOutage && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground">
                          {num(selectedOutage.affected_customers).toLocaleString()} affected · {[selectedOutage.city, selectedOutage.county, selectedOutage.zip].filter(Boolean).join(' · ')}
                        </div>
                        <button className="st-action w-full justify-center" disabled={matching === selectedOutage.id} onClick={() => runMatch(selectedOutage.id)}>
                          <RefreshCw className={`w-3 h-3 ${matching === selectedOutage.id ? 'animate-spin' : ''}`} /> Match Customers
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-border p-3 text-[10px] text-muted-foreground leading-relaxed">
                    Click a marker to assign a technician, update dispatch status, or match an outage to customers.
                    Emergencies pulse red; grey dots are registered customer sites.
                  </div>
                )}

                {needsCoords.length > 0 && (
                  <div className="border border-warning/40 bg-warning/5 p-2.5">
                    <div className="st-k mb-1.5" style={{ color: '#d97706' }}>Needs Coordinates ({needsCoords.length})</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {needsCoords.slice(0, 12).map(entry => (
                        <div key={entry.key} className="flex items-center justify-between gap-2 text-[10.5px]">
                          <div className="min-w-0 truncate">
                            <span className="font-bold">{entry.row.customer_name}</span>
                            <span className="text-muted-foreground"> · {entry.kind}</span>
                          </div>
                          <button className="st-action shrink-0" disabled={locating === entry.key} onClick={() => locate(entry)}>
                            <Crosshair className={`w-3 h-3 ${locating === entry.key ? 'animate-pulse' : ''}`} /> Locate
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-3.5">
            {/* ── Outage events + impacts ── */}
            <section className="st-panel p-3 sm:p-4">
              <div className="st-k mb-2">Outage Events</div>
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {(events as any[]).map(ev => {
                  const meta = OUTAGE_STATUS[ev.status] ?? OUTAGE_STATUS.active;
                  const evImpacts = impactsByEvent[ev.id] ?? [];
                  return (
                    <div key={ev.id} className="border border-border">
                      <div className="px-3 py-2 flex items-start justify-between gap-2 bg-secondary/25">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[8px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5"
                              style={{ backgroundColor: meta.color + '16', color: meta.color }}>{meta.label}</span>
                            <span className="text-[12px] font-bold truncate">{ev.provider}</span>
                            <span className="text-[10px] text-muted-foreground">{[ev.city, ev.county, ev.zip].filter(Boolean).join(' · ')}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            {num(ev.affected_customers).toLocaleString()} affected · started {fmtWhen(ev.outage_started_at)}
                            {ev.estimated_restoration_at ? ` · est. restore ${fmtWhen(ev.estimated_restoration_at)}` : ''}
                            {ev.cause ? ` · ${ev.cause}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="st-action" disabled={matching === ev.id} onClick={() => runMatch(ev.id)}>
                            <RefreshCw className={`w-3 h-3 ${matching === ev.id ? 'animate-spin' : ''}`} /> Match
                          </button>
                          {ev.status !== 'restored' && (
                            <button className="st-action" title="Mark restored"
                              onClick={() => upsertEvent.mutate({ id: ev.id, user_id: ev.user_id, entity_id: ev.entity_id, provider: ev.provider, status: 'restored', resolved_at: new Date().toISOString() },
                                { onSuccess: () => toast.success('Marked restored') })}>
                              <Zap className="w-3 h-3" />
                            </button>
                          )}
                          <button className="p-1 text-muted-foreground hover:text-destructive" title="Remove event"
                            onClick={() => { if (confirm('Remove this outage event?')) deleteEvent.mutate(ev.id, { onSuccess: () => toast.success('Event removed') }); }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {evImpacts.length > 0 && (
                        <div className="divide-y divide-border/60">
                          {evImpacts.map(i => {
                            const site = i.hgp_customer_sites;
                            return (
                              <div key={i.id} className="px-3 py-1.5 flex items-center gap-2 text-[11px]">
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold">{site?.customer_name ?? 'Site'}</span>
                                  <span className="text-muted-foreground"> · {[site?.city, site?.zip].filter(Boolean).join(' ')} · matched by {i.match_basis}</span>
                                  {site?.agreement_id && <span className="text-[8px] font-black uppercase text-positive ml-1.5">Plan</span>}
                                </div>
                                <Select value={i.outreach_status} onValueChange={v => setOutreach(i, v)}>
                                  <SelectTrigger className="rounded-none h-7 w-[110px] text-[9px] uppercase font-bold"><SelectValue /></SelectTrigger>
                                  <SelectContent>{OUTREACH_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                                <button className="st-action !text-destructive" disabled={dispatching === i.site_id}
                                  onClick={() => dispatchEmergency(ev.id, i.site_id, site?.customer_name ?? 'customer')}>
                                  <Siren className="w-3 h-3" /> Dispatch
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!(events as any[]).length && (
                  <div className="py-12 text-center">
                    <CloudLightning className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" strokeWidth={1.2} />
                    <div className="text-sm font-bold">No outage events logged</div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      When a provider map shows an outage in your service area, log it here with the ZIP/county —
                      matching finds every customer generator in the zone.
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-3.5">
              {/* ── Provider registry ── */}
              <section className="st-panel p-3 sm:p-4">
                <div className="st-k mb-2">Provider Sources</div>
                <div className="space-y-1.5">
                  {(sources as any[]).map(s => (
                    <div key={s.id} className="border border-border px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-bold truncate">{s.provider}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5 bg-secondary/60 text-muted-foreground">{s.source_type}</span>
                          {s.polling_interval_minutes && <span className="text-[8px] text-muted-foreground font-mono-tab">{s.polling_interval_minutes}m</span>}
                          {s.source_url && (
                            <a href={s.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Open provider tracker">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      {s.terms_notes && <div className="text-[8.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2" title={s.terms_notes}>{s.terms_notes}</div>}
                    </div>
                  ))}
                  {!(sources as any[]).length && (
                    <div className="text-xs text-muted-foreground border border-border p-3">
                      Provider registry is seeded by migration 20260717000003 — run it to load CenterPoint, Oncor, AEP Texas, Entergy Texas, TNMP, and ERCOT.
                    </div>
                  )}
                </div>
              </section>

              {/* ── Outage history by provider ── */}
              <section className="st-panel p-3 sm:p-4">
                <div className="st-k mb-2">Outage History by Provider</div>
                {providerTrend.length ? (
                  <div className="space-y-1.5">
                    {providerTrend.map(([provider, count]) => {
                      const max = providerTrend[0][1];
                      return (
                        <div key={provider} className="flex items-center gap-2 text-[10px]">
                          <div className="w-28 truncate font-bold">{provider}</div>
                          <div className="flex-1 h-2.5 bg-secondary/50">
                            <div className="h-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: '#dc2626aa' }} />
                          </div>
                          <div className="font-mono-tab w-5 text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Logged outages build a provider reliability history for planning outreach and inventory.</div>
                )}
                <div className="mt-3 text-[9px] text-muted-foreground leading-relaxed border-t border-border pt-2">
                  Map-only providers are logged manually by design — no unofficial scraping. A server-side Edge Function
                  can automate polling later where terms allow; the registry stores cadence and terms notes per source.
                  Emergency dispatches land in <Link to="/projects" className="font-bold text-foreground">Install Jobs</Link> → Emergency Queue.
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* ── Log outage dialog ── */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Log Outage Event</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="st-k mb-1">Provider *</div>
              <Select value={eventForm.source_id || '__manual__'} onValueChange={v => setEventForm(f => ({ ...f, source_id: v === '__manual__' ? '' : v }))}>
                <SelectTrigger className="st-field"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {(sources as any[]).map(s => <SelectItem key={s.id} value={s.id}>{s.provider}</SelectItem>)}
                  <SelectItem value="__manual__">Other / manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!eventForm.source_id && (
              <div className="col-span-2">
                <div className="st-k mb-1">Provider Name</div>
                <Input className="st-field" value={eventForm.provider} onChange={e => setEventForm(f => ({ ...f, provider: e.target.value }))} />
              </div>
            )}
            <div>
              <div className="st-k mb-1">ZIP</div>
              <Input className="st-field" inputMode="numeric" value={eventForm.zip} onChange={e => setEventForm(f => ({ ...f, zip: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">County</div>
              <Input className="st-field" value={eventForm.county} onChange={e => setEventForm(f => ({ ...f, county: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">City</div>
              <Input className="st-field" value={eventForm.city} onChange={e => setEventForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Customers Affected</div>
              <Input className="st-field" type="number" inputMode="numeric" value={eventForm.affected_customers} onChange={e => setEventForm(f => ({ ...f, affected_customers: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Started</div>
              <Input className="st-field" type="datetime-local" value={eventForm.outage_started_at} onChange={e => setEventForm(f => ({ ...f, outage_started_at: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Est. Restoration</div>
              <Input className="st-field" type="datetime-local" value={eventForm.estimated_restoration_at} onChange={e => setEventForm(f => ({ ...f, estimated_restoration_at: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="st-k mb-1">Cause / Notes</div>
              <Input className="st-field" placeholder="Storm damage, equipment failure…" value={eventForm.cause} onChange={e => setEventForm(f => ({ ...f, cause: e.target.value }))} />
            </div>
          </div>
          <button className="st-primary w-full mt-2" onClick={saveEvent} disabled={upsertEvent.isPending}>Log Outage</button>
        </DialogContent>
      </Dialog>

      {/* ── Add site dialog ── */}
      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>
        <DialogContent className="max-w-md rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Add Customer Site</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <div className="st-k mb-1">Customer *</div>
              <Input className="st-field" value={siteForm.customer_name} onChange={e => setSiteForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <div className="st-k mb-1">Site Address</div>
              <Input className="st-field" value={siteForm.site_address} onChange={e => setSiteForm(f => ({ ...f, site_address: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">City</div>
              <Input className="st-field" value={siteForm.city} onChange={e => setSiteForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">ZIP</div>
              <Input className="st-field" inputMode="numeric" value={siteForm.zip} onChange={e => setSiteForm(f => ({ ...f, zip: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">County</div>
              <Input className="st-field" value={siteForm.county} onChange={e => setSiteForm(f => ({ ...f, county: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Utility</div>
              <Input className="st-field" placeholder="CenterPoint, Oncor…" value={siteForm.utility_provider} onChange={e => setSiteForm(f => ({ ...f, utility_provider: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Phone</div>
              <Input className="st-field" value={siteForm.customer_phone} onChange={e => setSiteForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div>
              <div className="st-k mb-1">Email</div>
              <Input className="st-field" type="email" value={siteForm.customer_email} onChange={e => setSiteForm(f => ({ ...f, customer_email: e.target.value }))} />
            </div>
          </div>
          <button className="st-primary w-full mt-2" onClick={saveSite} disabled={upsertSite.isPending}>Add to Registry</button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
