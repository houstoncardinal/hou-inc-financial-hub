import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Users, ClipboardList, Inbox, FileCheck, Calendar,
  ChevronRight, RefreshCw, ArrowUpRight, Bell, HelpCircle, Menu,
  FileText, UserCheck, CheckCircle2, FolderKanban,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const AC = '#9D7E3F';

/* ── Luxury palette — muted, harmonious, construction-finance grade ── */
const LUX = {
  gold:      '#C9A962',
  goldDeep:  '#9D7E3F',
  steel:     '#4C7FA3',
  copper:    '#C4795A',
  viridian:  '#4E8A74',
  violet:    '#8E7CB0',
  rose:      '#B26E85',
};

/* ── AV4 visual system: sharp luxury cards with inner light + gold wash ── */
const AV4_CSS = `
.av4-int{position:relative;border-radius:12px;background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,.05),0 1px 0 rgba(255,255,255,.45) inset;transition:box-shadow .2s ease,transform .2s ease,border-color .2s ease;}
.av4-int::before{content:'';position:absolute;inset:0;border-radius:12px;background:linear-gradient(145deg,rgba(157,126,63,.06),transparent 44%);pointer-events:none;}
.av4-int:hover{box-shadow:0 10px 26px rgba(10,10,10,.09);transform:translateY(-1px);border-color:hsl(var(--foreground)/.18);}
.dark .av4-int{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.05) inset;}
.av4-static:hover{transform:none;}
.av4-head{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid hsl(var(--border)/.65);}
.av4-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:hsl(var(--foreground));}
.av4-foot{border-top:1px solid hsl(var(--border)/.65);background:hsl(var(--secondary)/.24);border-radius:0 0 12px 12px;}
.av4-link{font-size:10.5px;font-weight:700;color:${AC};white-space:nowrap;transition:opacity .15s ease;}
.av4-link:hover{opacity:.72;}
.av4-chiprow{display:inline-flex;align-items:center;gap:6px;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:9px;padding:6px 10px;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:hsl(var(--muted-foreground));transition:color .18s ease,border-color .18s ease;}
button.av4-chiprow:hover{color:${AC};border-color:rgba(157,126,63,.5);}
.av4-seg{display:inline-flex;border:1px solid hsl(var(--border));border-radius:9px;background:hsl(var(--secondary)/.4);padding:2px;}
.av4-seg button{border-radius:7px;padding:4px 10px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:hsl(var(--muted-foreground));transition:all .18s ease;}
.av4-seg button.on{background:hsl(var(--background));color:hsl(var(--foreground));box-shadow:0 1px 3px rgba(10,10,10,.12);}
.av4-toggle{display:inline-flex;align-items:center;gap:5px;border-radius:9999px;border:1px solid hsl(var(--border));padding:3px 9px;font-size:9.5px;font-weight:700;color:hsl(var(--muted-foreground));transition:all .18s ease;cursor:pointer;}
.av4-toggle.off{opacity:.38;}
.av4-toggle:hover{border-color:hsl(var(--foreground)/.3);}
`;

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '—';
  const t = new Date(ts).getTime();
  if (isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BRIEF_PILL: Record<string, { bg: string; fg: string }> = {
  in_progress:            { bg: 'rgba(78,138,116,0.12)', fg: LUX.viridian },
  consultation_scheduled: { bg: 'rgba(142,124,176,0.12)', fg: LUX.violet },
  reviewing:              { bg: 'rgba(76,127,163,0.12)', fg: LUX.steel },
  submitted:              { bg: 'rgba(201,169,98,0.14)', fg: LUX.goldDeep },
};

export interface OverviewProps {
  adminName: string;
  clients: any[];
  briefs: Record<string, any>;
  allDocs: Record<string, any[]>;
  allMeetings: Record<string, any[]>;
  contactForms: any[];
  startBriefs: any[];
  helpRequests: any[];
  /** Houston Enterprise finance projects only — entity-scoped upstream. */
  projects: any[];
  onSelectTab: (tab: string) => void;
  onOpenClient: (clientId: string, subTab?: string) => void;
  onRefresh: () => void;
  onOpenFinance: () => void;
  onOpenMobileNav: () => void;
  onViewDocument: (url: string) => void;
}

/* ══ Luxury pipeline donut ══ */
function PipelineDonut({ slices, onSelect }: {
  slices: { label: string; value: number; color: string; tab: string }[];
  onSelect: (tab: string) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const data = slices.filter(s => s.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = active !== null && data[active] ? data[active] : null;

  const activeShape = (props: any) => (
    <g>
      <Sector cx={props.cx} cy={props.cy} innerRadius={props.innerRadius - 1.5} outerRadius={props.outerRadius + 5}
        startAngle={props.startAngle} endAngle={props.endAngle} fill={props.fill} cornerRadius={6} />
      <Sector cx={props.cx} cy={props.cy} innerRadius={props.outerRadius + 8} outerRadius={props.outerRadius + 9.5}
        startAngle={props.startAngle} endAngle={props.endAngle} fill={props.fill} opacity={0.35} />
    </g>
  );

  if (total === 0) {
    return <div className="flex-1 flex items-center justify-center py-8 text-[11.5px] text-muted-foreground">No pipeline activity yet.</div>;
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 flex-1 min-h-0">
      <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
        <ResponsiveContainer width={148} height={148}>
          <PieChart>
            <defs>
              {data.map((s, i) => (
                <linearGradient key={i} id={`pipe-g-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.62} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
              innerRadius={49} outerRadius={64} paddingAngle={data.length > 1 ? 3.5 : 0}
              cornerRadius={6} stroke="none" isAnimationActive
              activeIndex={active ?? undefined} activeShape={activeShape}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
              onClick={(_, i) => data[i] && onSelect(data[i].tab)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((s, i) => <Cell key={i} fill={`url(#pipe-g-${i})`} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[22px] font-bold font-mono-tab leading-none" style={{ color: shown ? shown.color : undefined }}>
            {shown ? shown.value : total}
          </div>
          <div className="text-[7.5px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-1 text-center px-3 leading-tight">
            {shown ? shown.label : 'Total Pipeline'}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {data.map((s, i) => {
          const pct = (s.value / total) * 100;
          const on = active === i;
          return (
            <button key={s.label} onClick={() => onSelect(s.tab)}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
              style={{ backgroundColor: on ? `${s.color}12` : 'transparent' }}>
              <span className="w-2 h-2 rounded-full shrink-0 transition-transform" style={{ backgroundColor: s.color, transform: on ? 'scale(1.35)' : undefined }} />
              <span className="flex-1 min-w-0 text-[10.5px] font-medium text-muted-foreground truncate">{s.label}</span>
              <span className="text-[11px] font-bold font-mono-tab text-foreground">{s.value}</span>
              <span className="text-[9px] font-bold font-mono-tab w-9 text-right shrink-0" style={{ color: s.color }}>{pct.toFixed(0)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══ Activity chart tooltip ══ */
function ActivityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5 shadow-xl min-w-[140px]">
      <div className="text-[9px] uppercase tracking-[0.16em] font-black text-muted-foreground mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.stroke }} />{p.dataKey}
          </span>
          <span className="text-[11px] font-bold font-mono-tab text-foreground">{p.value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-border">
        <span className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground">Total</span>
        <span className="text-[11px] font-bold font-mono-tab" style={{ color: AC }}>{total}</span>
      </div>
    </div>
  );
}

export function OverviewDashboard({
  adminName, clients, briefs, allDocs, allMeetings, contactForms, startBriefs,
  helpRequests, projects,
  onSelectTab, onOpenClient, onRefresh, onOpenFinance, onOpenMobileNav, onViewDocument,
}: OverviewProps) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  /* ── Derived data (Houston Enterprise scope) ── */
  const pendingApprovals = clients.filter((c: any) => c.status === 'pending_approval');
  const approvedClients  = clients.filter((c: any) => c.status === 'approved' || !c.status);
  const flatDocs  = Object.entries(allDocs).flatMap(([cId, ds]) => (ds ?? []).map((d: any) => ({ ...d, clientId: cId })));
  const flatMeets = Object.entries(allMeetings).flatMap(([cId, ms]) => (ms ?? []).map((m: any) => ({ ...m, clientId: cId })));
  const pendingDocs  = flatDocs.filter((d: any) => d.status === 'uploaded');
  const pendingMeets = flatMeets.filter((m: any) => m.status === 'requested');
  const openHelp = helpRequests.filter((r: any) => r.status !== 'resolved').length;
  const submittedBriefs = Object.values(briefs).filter((b: any) => b.status === 'submitted').length;
  const queueCount = pendingApprovals.length + pendingDocs.length + pendingMeets.length;
  const firstName = adminName.split(' ')[0];
  const briefsTotal = startBriefs.length + Object.keys(briefs).length;
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;

  /* Real insight computations */
  const DAY = 86400000;
  const within = (ts: any, days: number) => ts && Date.now() - new Date(ts).getTime() < days * DAY;
  const newClients30 = approvedClients.filter((c: any) => within(c.createdAt ?? c.created_at, 30)).length;
  const newBriefs7 = startBriefs.filter((s: any) => within(s.submitted_at ?? s.submittedAt, 7)).length
    + Object.values(briefs).filter((b: any) => within(b.submittedAt ?? b.submitted_at, 7)).length;
  const nextMeeting = flatMeets
    .filter((m: any) => (m.status === 'confirmed' || m.status === 'requested') && m.date && new Date(m.date + 'T23:59:59') >= new Date())
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))[0];

  /* ── Stat cards (finance proj-intel style, admin insights) ── */
  const STATS = [
    { label: 'Pending Approvals', value: pendingApprovals.length, icon: ShieldCheck, color: LUX.gold,
      sub: pendingApprovals.length > 0 ? 'Action required' : 'Queue clear',
      urgent: pendingApprovals.length > 0, foot: 'Account access', tab: 'approvals' },
    { label: 'Active Clients', value: approvedClients.length, icon: Users, color: LUX.steel,
      sub: newClients30 > 0 ? `+${newClients30} in 30 days` : 'No new this month', foot: 'Portal accounts', tab: 'clients' },
    { label: 'Project Briefs', value: briefsTotal, icon: ClipboardList, color: LUX.copper,
      sub: newBriefs7 > 0 ? `${newBriefs7} new this week` : 'None this week', foot: 'Web + portal', tab: 'leads' },
    { label: 'Projects', value: projects.length, icon: FolderKanban, color: LUX.viridian,
      sub: `${activeProjects} active now`, foot: 'Houston Enterprise', tab: 'projects' },
    { label: 'Pending Documents', value: pendingDocs.length, icon: FileCheck, color: LUX.violet,
      sub: pendingDocs.length > 0 ? 'Awaiting review' : 'Queue clear', foot: 'Client uploads', tab: 'documents' },
    { label: 'Meetings', value: pendingMeets.length, icon: Calendar, color: LUX.rose,
      sub: nextMeeting ? `Next ${new Date(nextMeeting.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'None scheduled',
      foot: 'Requests pending', tab: 'meetings' },
  ];

  /* ── Pipeline slices — HE only, matches the card taxonomy ── */
  const pipelineSlices = [
    { label: 'Portal Clients',   value: approvedClients.length,   color: LUX.steel,    tab: 'clients' },
    { label: 'Project Briefs',   value: briefsTotal,              color: LUX.gold,     tab: 'leads' },
    { label: 'Account Requests', value: pendingApprovals.length,  color: LUX.copper,   tab: 'approvals' },
    { label: 'Active Projects',  value: projects.length,          color: LUX.viridian, tab: 'projects' },
  ];

  /* ── Activity series (daily, real timestamps) ── */
  const activityData = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mk = () => new Array(range).fill(0);
    const series: Record<string, number[]> = { Leads: mk(), Clients: mk(), Documents: mk(), Meetings: mk() };
    const bump = (arr: number[], ts: string | null | undefined) => {
      if (!ts) return;
      const t = new Date(ts); if (isNaN(t.getTime())) return;
      t.setHours(0, 0, 0, 0);
      const idx = Math.floor((t.getTime() - today.getTime()) / DAY) + (range - 1);
      if (idx >= 0 && idx < range) arr[idx]++;
    };
    startBriefs.forEach((s: any) => bump(series.Leads, s.submitted_at ?? s.submittedAt));
    contactForms.forEach((f: any) => bump(series.Leads, f.created_at));
    clients.forEach((c: any) => bump(series.Clients, c.createdAt ?? c.created_at));
    flatDocs.forEach((d: any) => bump(series.Documents, d.uploadedAt ?? d.uploaded_at));
    flatMeets.forEach((m: any) => bump(series.Meetings, m.createdAt ?? m.created_at));
    return Array.from({ length: range }, (_, i) => {
      const d = new Date(today.getTime() - (range - 1 - i) * DAY);
      return {
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Leads: series.Leads[i], Clients: series.Clients[i],
        Documents: series.Documents[i], Meetings: series.Meetings[i],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, clients, startBriefs, contactForms, allDocs, allMeetings]);

  const CHART_SERIES = [
    { key: 'Leads',     color: LUX.viridian },
    { key: 'Clients',   color: LUX.steel },
    { key: 'Documents', color: LUX.violet },
    { key: 'Meetings',  color: LUX.gold },
  ];
  const toggleSeries = (key: string) => setHiddenSeries(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else if (next.size < CHART_SERIES.length - 1) next.add(key);
    return next;
  });

  /* ── Tasks ── */
  const tasks = [
    ...(pendingApprovals.length > 0 ? [{ id: 'approvals', icon: ShieldCheck, color: LUX.gold, title: `${pendingApprovals.length} account application${pendingApprovals.length > 1 ? 's' : ''}`, sub: 'Waiting for review', action: 'Review', tab: 'approvals' }] : []),
    ...(pendingDocs.length > 0 ? [{ id: 'docs', icon: FileCheck, color: LUX.violet, title: 'Verify client documents', sub: `${pendingDocs.length} pending review`, action: 'Review', tab: 'documents' }] : []),
    ...(submittedBriefs > 0 ? [{ id: 'briefs', icon: ClipboardList, color: LUX.copper, title: 'Review project briefs', sub: `${submittedBriefs} submitted`, action: 'View', tab: 'clients' }] : []),
    ...(pendingMeets.length > 0 ? [{ id: 'meets', icon: Calendar, color: LUX.rose, title: 'Confirm meeting requests', sub: `${pendingMeets.length} awaiting`, action: 'Schedule', tab: 'meetings' }] : []),
    ...(openHelp > 0 ? [{ id: 'help', icon: Bell, color: LUX.steel, title: 'Respond to help requests', sub: `${openHelp} open`, action: 'Reply', tab: 'notifications' }] : []),
  ];
  const visibleTasks = tasks.slice(0, 4);

  /* ── Feeds (capped — View all opens the detailed tab) ── */
  const activityFeed = useMemo(() => {
    const events: { id: string; ts: string; icon: any; color: string; title: string; sub: string }[] = [];
    clients.forEach((c: any) => {
      const created = c.createdAt ?? c.created_at;
      if (created) events.push({ id: `reg-${c.id}`, ts: created, icon: Users, color: LUX.steel, title: 'New account request', sub: c.name });
      if (c.approved_at) events.push({ id: `app-${c.id}`, ts: c.approved_at, icon: UserCheck, color: LUX.viridian, title: 'Portal client approved', sub: c.name });
    });
    flatDocs.forEach((d: any) => {
      const up = d.uploadedAt ?? d.uploaded_at;
      if (up) events.push({ id: `doc-${d.id}`, ts: up, icon: FileText, color: LUX.violet, title: 'Document uploaded', sub: d.name });
    });
    Object.entries(briefs).forEach(([cId, b]: [string, any]) => {
      const ts = b.submittedAt ?? b.submitted_at;
      if (ts) events.push({ id: `brf-${cId}`, ts, icon: ClipboardList, color: LUX.gold, title: 'Project brief submitted', sub: b.type || 'Project brief' });
    });
    [...startBriefs, ...contactForms].forEach((l: any, i: number) => {
      const ts = l.submitted_at ?? l.submittedAt ?? l.created_at;
      if (ts) events.push({ id: `lead-${l.id ?? i}`, ts, icon: Inbox, color: LUX.copper, title: 'Lead captured via website', sub: l.name ? `New lead — ${l.name}` : 'New lead' });
    });
    flatMeets.forEach((m: any) => {
      const ts = m.createdAt ?? m.created_at;
      if (ts) events.push({ id: `meet-${m.id}`, ts, icon: Calendar, color: LUX.rose, title: 'Meeting requested', sub: `${m.type ?? 'Meeting'} · ${m.date ?? ''}` });
    });
    return events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, briefs, allDocs, allMeetings, startBriefs, contactForms]);

  const recentDocs = flatDocs
    .filter((d: any) => d.uploadedAt ?? d.uploaded_at)
    .sort((a: any, b: any) => new Date(b.uploadedAt ?? b.uploaded_at).getTime() - new Date(a.uploadedAt ?? a.uploaded_at).getTime())
    .slice(0, 3);

  const recentClients = [...approvedClients]
    .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="space-y-3">
      <style>{AV4_CSS}</style>

      {/* ══ Header ══ */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden flex items-center justify-center w-9 h-9 shrink-0 rounded-xl border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
            onClick={onOpenMobileNav} aria-label="Open menu">
            <Menu className="w-4 h-4" strokeWidth={1.7} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[19px] sm:text-[23px] font-bold tracking-tight text-foreground leading-tight">
              Welcome back, {firstName} <span aria-hidden>👋</span>
            </h1>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">Houston Enterprise · client pipeline &amp; delivery, live.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden lg:inline-flex av4-chiprow">
            Live Data <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          </span>
          <button onClick={() => onSelectTab('notifications')} className="hidden sm:inline-flex av4-chiprow">
            <HelpCircle className="w-3 h-3" strokeWidth={2.2} /> {openHelp} Help
          </button>
          <button onClick={() => onSelectTab('approvals')} className="hidden sm:inline-flex av4-chiprow">
            <Bell className="w-3 h-3" strokeWidth={2.2} /> {queueCount} Queue
          </button>
          <button onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-background px-3 py-2 text-[11px] font-semibold text-foreground hover:border-accent/50 hover:text-accent transition-colors">
            <RefreshCw className="w-3 h-3" strokeWidth={1.8} /> Refresh
          </button>
          <button onClick={onOpenFinance}
            className="inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[11px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${LUX.goldDeep}, ${LUX.gold})` }}>
            Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ══ Stat intelligence rail ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {STATS.map(s => (
          <button key={s.label} onClick={() => onSelectTab(s.tab)} className="av4-int text-left min-w-0 group overflow-hidden">
            {/* Desktop / tablet: intel card */}
            <div className="hidden md:block">
              <div className="relative p-2.5 pb-2">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] font-bold text-foreground/60 min-w-0">
                    <s.icon className="w-3 h-3 shrink-0" style={{ color: s.color }} strokeWidth={1.9} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all" strokeWidth={2.2} />
                </div>
                <div className="text-[20px] font-bold font-mono-tab leading-tight text-foreground">{s.value}</div>
                <div className={`text-[9px] mt-0.5 truncate ${s.urgent ? 'font-bold' : 'text-muted-foreground'}`} style={s.urgent ? { color: LUX.copper } : undefined}>{s.sub}</div>
              </div>
              <div className="av4-foot relative px-2.5 py-1 flex items-center justify-between gap-2">
                <span className="text-[7.5px] uppercase tracking-[0.14em] font-bold text-foreground/45 truncate">{s.foot}</span>
                <ArrowUpRight className="w-2.5 h-2.5 shrink-0" style={{ color: s.color }} strokeWidth={2.4} />
              </div>
            </div>
            {/* Mobile: thin horizontal row */}
            <div className="md:hidden relative flex items-center gap-3 px-3 py-2">
              <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full" style={{ backgroundColor: s.color }} />
              <span className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}16` }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.9} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] font-bold text-foreground truncate leading-tight">{s.label}</span>
                <span className={`block text-[9.5px] truncate ${s.urgent ? 'font-bold' : 'text-muted-foreground'}`} style={s.urgent ? { color: LUX.copper } : undefined}>{s.sub}</span>
              </span>
              <span className="text-[18px] font-bold font-mono-tab text-foreground shrink-0">{s.value}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" strokeWidth={2} />
            </div>
            <span className="absolute inset-x-0 bottom-0 h-[2px] hidden md:block" style={{ backgroundColor: s.color }} />
          </button>
        ))}
      </div>

      {/* ══ Approval strip (slim) ══ */}
      {pendingApprovals.length > 0 && (
        <div className="av4-int av4-static flex items-center gap-3 px-3.5 py-2">
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: LUX.goldDeep }} strokeWidth={1.8} />
          <div className="flex-1 min-w-0 text-[11.5px] text-foreground truncate">
            <span className="font-bold">{pendingApprovals.length} account application{pendingApprovals.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground"> waiting — {pendingApprovals.map((c: any) => c.name).slice(0, 2).join(', ')}</span>
          </div>
          <button onClick={() => onSelectTab('approvals')}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${LUX.goldDeep}, ${LUX.gold})` }}>
            Review Now
          </button>
        </div>
      )}

      {/* ══ Pipeline · Activity · Tasks ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-3 items-stretch">

        {/* Pipeline */}
        <div className="av4-int av4-static flex flex-col overflow-hidden xl:col-span-4">
          <div className="av4-head">
            <div className="av4-title">Pipeline Overview</div>
            <button onClick={() => onSelectTab('analytics')} className="av4-link">Analytics →</button>
          </div>
          <PipelineDonut slices={pipelineSlices} onSelect={onSelectTab} />
        </div>

        {/* Activity */}
        <div className="av4-int av4-static flex flex-col overflow-hidden xl:col-span-5">
          <div className="av4-head flex-wrap">
            <div className="av4-title">Activity Overview</div>
            <div className="av4-seg">
              {([7, 14, 30] as const).map(r => (
                <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}D</button>
              ))}
            </div>
          </div>
          <div className="px-1.5 pt-2 flex-1 min-h-[168px]">
            <ResponsiveContainer width="100%" height={172}>
              <AreaChart data={activityData} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  {CHART_SERIES.map(s => (
                    <linearGradient key={s.key} id={`act-g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} strokeDasharray="3 5" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                  interval={range === 7 ? 0 : range === 14 ? 2 : 6} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ActivityTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
                {CHART_SERIES.filter(s => !hiddenSeries.has(s.key)).map(s => (
                  <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2}
                    fill={`url(#act-g-${s.key})`} dot={false} activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: 'hsl(var(--background))' }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 border-t border-border/65">
            {CHART_SERIES.map(s => {
              const off = hiddenSeries.has(s.key);
              return (
                <button key={s.key} onClick={() => toggleSeries(s.key)} className={`av4-toggle ${off ? 'off' : ''}`} title={off ? `Show ${s.key}` : `Hide ${s.key}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks */}
        <div className="av4-int av4-static flex flex-col overflow-hidden lg:col-span-2 xl:col-span-3">
          <div className="av4-head">
            <div className="av4-title">Tasks &amp; Alerts</div>
            <button onClick={() => onSelectTab('notifications')} className="av4-link">View all</button>
          </div>
          <div className="px-2.5 py-2.5 space-y-1.5 flex-1">
            {visibleTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-7 h-7 mb-2" style={{ color: LUX.viridian }} strokeWidth={1.3} />
                <div className="text-[12px] font-semibold text-foreground">All caught up</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">No pending tasks right now.</div>
              </div>
            ) : visibleTasks.map(t => (
              <button key={t.id} onClick={() => onSelectTab(t.tab)}
                className="w-full flex items-center gap-2.5 rounded-[10px] border border-border px-2.5 py-2 text-left hover:border-accent/45 hover:bg-secondary/30 transition-colors group">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.color}16` }}>
                  <t.icon className="w-3 h-3" style={{ color: t.color }} strokeWidth={1.9} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-bold text-foreground truncate leading-tight">{t.title}</span>
                  <span className="block text-[9.5px] text-muted-foreground truncate">{t.sub}</span>
                </span>
                <span className="av4-link inline-flex items-center gap-0.5 shrink-0">
                  {t.action} <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.6} />
                </span>
              </button>
            ))}
            {tasks.length > visibleTasks.length && (
              <button onClick={() => onSelectTab('notifications')} className="w-full text-center text-[9.5px] font-bold text-muted-foreground hover:text-accent transition-colors py-1">
                +{tasks.length - visibleTasks.length} more task{tasks.length - visibleTasks.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ Clients · Activity · Documents ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">

        {/* Recent clients */}
        <div className="av4-int av4-static flex flex-col overflow-hidden">
          <div className="av4-head">
            <div className="av4-title">Recent Clients</div>
            <button onClick={() => onSelectTab('clients')} className="av4-link">View all →</button>
          </div>
          <div className="divide-y divide-border/65 flex-1">
            {recentClients.length === 0 && <div className="px-4 py-8 text-center text-[11.5px] text-muted-foreground">No approved clients yet.</div>}
            {recentClients.map((c: any) => {
              const brief = briefs[c.id];
              const pill = brief ? (BRIEF_PILL[brief.status] ?? BRIEF_PILL.submitted) : null;
              return (
                <button key={c.id} onClick={() => onOpenClient(c.id, 'brief')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-secondary/40 transition-colors group">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[9.5px] font-black shrink-0"
                    style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: LUX.goldDeep }}>
                    {(c.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11.5px] font-bold text-foreground truncate leading-tight">{c.name}</span>
                    <span className="block text-[9.5px] text-muted-foreground truncate">{c.email}</span>
                  </span>
                  {pill ? (
                    <span className="rounded-full px-2 py-0.5 text-[8.5px] font-bold capitalize whitespace-nowrap" style={{ backgroundColor: pill.bg, color: pill.fg }}>
                      {String(brief.status).replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[8.5px] font-bold bg-secondary text-muted-foreground whitespace-nowrap">No Brief</span>
                  )}
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-accent transition-colors shrink-0" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="av4-int av4-static flex flex-col overflow-hidden">
          <div className="av4-head">
            <div className="av4-title">Recent Activity</div>
            <button onClick={() => onSelectTab('changelog')} className="av4-link">View all →</button>
          </div>
          <div className="divide-y divide-border/65 flex-1">
            {activityFeed.length === 0 && <div className="px-4 py-8 text-center text-[11.5px] text-muted-foreground">No activity yet.</div>}
            {activityFeed.map(e => (
              <div key={e.id} className="flex items-center gap-2.5 px-3.5 py-2">
                <span className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${e.color}14` }}>
                  <e.icon className="w-3 h-3" style={{ color: e.color }} strokeWidth={1.9} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-foreground truncate leading-tight">{e.title}</span>
                  <span className="block text-[9.5px] text-muted-foreground truncate">{e.sub}</span>
                </span>
                <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(e.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="av4-int av4-static flex flex-col overflow-hidden lg:col-span-2 xl:col-span-1">
          <div className="av4-head">
            <div className="av4-title">Documents</div>
            <button onClick={() => onSelectTab('documents')} className="av4-link">View all →</button>
          </div>
          <div className="divide-y divide-border/65 flex-1">
            {recentDocs.length === 0 && <div className="px-4 py-8 text-center text-[11.5px] text-muted-foreground">No documents uploaded yet.</div>}
            {recentDocs.map((d: any) => {
              const isPdf = String(d.fileType ?? d.file_type ?? '').toUpperCase().includes('PDF');
              const color = isPdf ? LUX.copper : LUX.steel;
              const up = d.uploadedAt ?? d.uploaded_at;
              return (
                <button key={d.id} onClick={() => d.file_url ? onViewDocument(d.file_url) : onSelectTab('documents')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-secondary/40 transition-colors">
                  <span className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}14` }}>
                    <FileText className="w-3 h-3" style={{ color }} strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 min-w-0 text-[11px] font-semibold text-foreground truncate">{d.name}</span>
                  <span className="text-[9px] text-muted-foreground shrink-0">{d.file_size || ''}</span>
                  <span className="text-[9px] text-muted-foreground shrink-0 w-12 text-right">
                    {up ? new Date(up).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
