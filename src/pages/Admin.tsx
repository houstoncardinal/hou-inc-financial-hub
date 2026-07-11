import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, BarChart3, Settings, Image,
  ArrowUpRight, TrendingUp, CheckCircle, Clock, AlertCircle,
  Plus, Trash2, Edit3, LogOut, X, FileText, Calendar,
  Building2, Star, RefreshCw, Menu,
  ChevronRight, ChevronDown, Send, CheckCircle2, XCircle,
  Video, Phone, MapPin, FileCheck, Package,
  Layers, CreditCard, Inbox, DollarSign,
  ArrowLeft, ClipboardList, User, UserCheck, UserX, ShieldCheck,
  Map, Download,
} from 'lucide-react';
import ClientMap from '@/components/admin/ClientMap';
import { APPROVAL_DOCS } from '@/hooks/usePortal';
import { motion, AnimatePresence } from 'framer-motion';
import PortfolioManager from '@/components/admin/PortfolioManager';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const B     = '#0A0A0A';
const W     = '#FFFFFF';
const G50   = '#F5F4F2';
const G200  = '#E8E4DE';
const G500  = '#8A8580';
const AC    = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";

/* ── Supabase data loaders ───────────────────────────────────────────── */
async function loadPortalData() {
  const [clientsRes, briefsRes, msgsRes, docsRes, meetsRes] = await Promise.all([
    supabase.from('portal_clients').select('*').order('created_at', { ascending: false }),
    supabase.from('portal_briefs').select('*'),
    supabase.from('portal_messages').select('*').order('created_at', { ascending: true }),
    supabase.from('portal_documents').select('*'),
    supabase.from('portal_meetings').select('*').order('created_at', { ascending: false }),
  ]);

  const clients = (clientsRes.data ?? []).map((c: any) => ({
    ...c,
    projectType:     c.project_type,
    projectInterest: c.project_interest,
    createdAt:       c.created_at,
  }));

  const briefs: Record<string, any> = {};
  (briefsRes.data ?? []).forEach((b: any) => {
    briefs[b.client_id] = { ...b, submittedAt: b.submitted_at };
  });

  const allMsgs: Record<string, any[]> = {};
  (msgsRes.data ?? []).forEach((m: any) => {
    if (!allMsgs[m.client_id]) allMsgs[m.client_id] = [];
    allMsgs[m.client_id].push({ ...m, text: m.body, senderName: m.sender_name, timestamp: m.created_at });
  });

  const allDocs: Record<string, any[]> = {};
  (docsRes.data ?? []).forEach((d: any) => {
    if (!allDocs[d.client_id]) allDocs[d.client_id] = [];
    allDocs[d.client_id].push({ ...d, fileType: d.file_type, uploadedAt: d.uploaded_at, requestedBy: d.requested_by });
  });

  const allMeetings: Record<string, any[]> = {};
  (meetsRes.data ?? []).forEach((m: any) => {
    if (!allMeetings[m.client_id]) allMeetings[m.client_id] = [];
    allMeetings[m.client_id].push({ ...m, createdAt: m.created_at });
  });

  return { clients, briefs, allMsgs, allDocs, allMeetings };
}

async function loadLeadsData() {
  const [contactRes, startRes] = await Promise.all([
    supabase.from('contact_submissions').select('*').order('created_at', { ascending: false }),
    supabase.from('start_project_submissions').select('*').order('submitted_at', { ascending: false }),
  ]);
  return {
    contactForms: contactRes.data ?? [],
    startBriefs:  startRes.data ?? [],
  };
}

async function loadFinanceData() {
  const [projRes, chkRes, txnRes, vndRes] = await Promise.all([
    supabase.from('projects').select('*').is('deleted_at', null),
    supabase.from('checks').select('*').is('deleted_at', null),
    supabase.from('transactions').select('*').is('deleted_at', null),
    supabase.from('vendors').select('*').is('deleted_at', null),
  ]);
  return {
    finProjects: projRes.data ?? [],
    finChecks:   chkRes.data ?? [],
    finTxns:     txnRes.data ?? [],
    finVendors:  vndRes.data ?? [],
  };
}

/* ── Admin actions (Supabase writes) ────────────────────────────────── */
async function adminUpdateBriefStatus(clientId: string, status: string) {
  await supabase.from('portal_briefs').update({ status }).eq('client_id', clientId);
}

async function adminSendMessage(clientId: string, text: string) {
  await supabase.from('portal_messages').insert({
    client_id:   clientId,
    sender:      'builder',
    sender_name: 'Jeff Ali',
    body:        text,
  });
}

async function adminUpdateDocStatus(clientId: string, docId: string, status: 'approved' | 'rejected') {
  await supabase.from('portal_documents').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: 'Jeff Ali' }).eq('id', docId);
}

async function adminUpdateMeetingStatus(clientId: string, meetingId: string, status: 'confirmed' | 'cancelled') {
  await supabase.from('portal_meetings').update({ status }).eq('id', meetingId);
}

async function adminApproveClient(clientId: string, clientName: string) {
  await supabase.from('portal_clients').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', clientId);

  await supabase.from('portal_messages').insert({
    client_id:   clientId,
    sender:      'builder',
    sender_name: 'Jeff Ali',
    body:        `Welcome to the HOU INC Client Portal, ${clientName}. I'm Jeff Ali, Co-Founder and your dedicated project lead. Your account has been approved and I'm looking forward to learning about your vision. Please complete your Project Brief when you're ready — it gives me the context I need for our first consultation. You'll also find your required documents in the Documents tab. Feel free to message me anytime.`,
  });

  await supabase.from('portal_documents').insert(
    APPROVAL_DOCS.map((d: any) => ({
      client_id:    clientId,
      name:         d.name,
      file_type:    d.fileType,
      file_size:    d.size || null,
      category:     d.category,
      status:       d.status,
      requested_by: d.requestedBy,
      description:  d.description,
    }))
  );
}

async function adminRejectClient(clientId: string) {
  await supabase.from('portal_clients').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', clientId);
}

/* ── Types ───────────────────────────────────────────────────────────── */
const ADMIN_PIN = '011491';
const ADMIN_KEY = 'hou-admin-unlocked';

/* ── Status helpers ──────────────────────────────────────────────────── */
const BRIEF_STATUSES = ['submitted', 'reviewing', 'consultation_scheduled', 'in_progress'] as const;
function briefStatusColor(s: string) {
  if (s === 'in_progress')             return { bg: 'rgba(16,185,129,0.08)',  color: '#10b981' };
  if (s === 'consultation_scheduled')  return { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6' };
  if (s === 'reviewing')               return { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' };
  if (s === 'submitted')               return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
  return { bg: 'rgba(138,133,128,0.08)', color: G500 };
}
function docStatusColor(s: string) {
  if (s === 'approved') return { bg: 'rgba(16,185,129,0.08)',  color: '#10b981' };
  if (s === 'rejected') return { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' };
  if (s === 'uploaded') return { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' };
  return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
}
function meetStatusColor(s: string) {
  if (s === 'confirmed')  return { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' };
  if (s === 'completed')  return { bg: 'rgba(16,185,129,0.08)', color: '#10b981' };
  if (s === 'cancelled')  return { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444' };
  return { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
}
function StatusBadge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

type AdminTab = 'overview' | 'approvals' | 'clients' | 'leads' | 'documents' | 'meetings' | 'portfolio' | 'map' | 'finance' | 'analytics';

export default function Admin() {
  /* ── Auth ── */
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === '1');
  const [pin, setPin]           = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  /* ── Nav ── */
  const [tab, setTab] = useState<AdminTab>('overview');

  /* ── Portal data state ── */
  const [clients,      setClients]      = useState<any[]>([]);
  const [briefs,       setBriefs]       = useState<Record<string, any>>({});
  const [allMsgs,      setAllMsgs]      = useState<Record<string, any[]>>({});
  const [allDocs,      setAllDocs]      = useState<Record<string, any[]>>({});
  const [allMeetings,  setAllMeetings]  = useState<Record<string, any[]>>({});
  const [contactForms, setContactForms] = useState<any[]>([]);
  const [startBriefs,  setStartBriefs]  = useState<any[]>([]);
  const [finProjects,  setFinProjects]  = useState<any[]>([]);
  const [finChecks,    setFinChecks]    = useState<any[]>([]);
  const [finTxns,      setFinTxns]      = useState<any[]>([]);
  const [finVendors,   setFinVendors]   = useState<any[]>([]);
  const [finReports]                    = useState<any[]>([]);

  const refreshData = useCallback(async () => {
    const [portal, leads, finance] = await Promise.all([
      loadPortalData(),
      loadLeadsData(),
      loadFinanceData(),
    ]);
    setClients(portal.clients);
    setBriefs(portal.briefs);
    setAllMsgs(portal.allMsgs);
    setAllDocs(portal.allDocs);
    setAllMeetings(portal.allMeetings);
    setContactForms(leads.contactForms);
    setStartBriefs(leads.startBriefs);
    setFinProjects(finance.finProjects);
    setFinChecks(finance.finChecks);
    setFinTxns(finance.finTxns);
    setFinVendors(finance.finVendors);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  /* ── Portfolio count (for analytics) ── */
  const [portfolioCount, setPortfolioCount] = useState(0);

  /* ── Client detail state ── */
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSubTab, setClientSubTab] = useState<'brief' | 'messages' | 'docs' | 'meetings'>('brief');
  const [replyDraft, setReplyDraft] = useState('');

  /* ── Leads state ── */
  const [leadsSubTab, setLeadsSubTab] = useState<'startproject' | 'contact'>('startproject');
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  /* ── Finance entity filter ── */
  const [finEntityTab, setFinEntityTab] = useState<string>('all');


  /* ── Computed ── */
  const totalMsgs       = Object.values(allMsgs).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);
  const pendingDocs     = Object.entries(allDocs).flatMap(([cId, docs]) =>
    (docs ?? []).filter((d: any) => d.status === 'uploaded').map((d: any) => ({ ...d, clientId: cId })));
  const pendingMeets    = Object.entries(allMeetings).flatMap(([cId, meets]) =>
    (meets ?? []).filter((m: any) => m.status === 'requested').map((m: any) => ({ ...m, clientId: cId })));
  const allLeads        = [...startBriefs, ...contactForms].length;
  const pendingApprovals = clients.filter((c: any) => c.status === 'pending_approval');
  const approvedClients  = clients.filter((c: any) => c.status === 'approved' || !c.status);

  const clientName = (id: string) => clients.find((c: any) => c.id === id)?.name ?? '—';

  /* ── PIN handlers ── */
  const handlePinDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...pin]; next[idx] = digit; setPin(next); setPinError('');
    if (digit && idx < 5) pinRefs[idx + 1].current?.focus();
    if (next.every(d => d !== '')) {
      const entered = next.join('');
      if (entered === ADMIN_PIN) { localStorage.setItem(ADMIN_KEY, '1'); setUnlocked(true); }
      else { setPinError('Incorrect PIN. Please try again.'); setPin(['', '', '', '', '', '']); setTimeout(() => pinRefs[0].current?.focus(), 50); }
    }
  };
  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (pin[idx]) { const next = [...pin]; next[idx] = ''; setPin(next); }
      else if (idx > 0) pinRefs[idx - 1].current?.focus();
    }
  };
  const handleLogout = () => { localStorage.removeItem(ADMIN_KEY); setUnlocked(false); setPin(['', '', '', '', '', '']); };

  /* ── Client detail actions ── */
  const handleSendReply = async () => {
    if (!selectedClientId || !replyDraft.trim()) return;
    await adminSendMessage(selectedClientId, replyDraft.trim());
    setReplyDraft('');
    await refreshData();
  };

  /* ── Nav items ── */
  const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ComponentType<any>; badge?: number; urgent?: boolean }[] = [
    { key: 'overview',   label: 'Overview',          icon: BarChart3 },
    { key: 'approvals',  label: 'Account Requests',  icon: ShieldCheck, badge: pendingApprovals.length || undefined, urgent: pendingApprovals.length > 0 },
    { key: 'clients',    label: 'Portal Clients',     icon: Users,       badge: approvedClients.length },
    { key: 'leads',      label: 'Inbound Leads',      icon: Inbox,       badge: allLeads },
    { key: 'documents',  label: 'Documents',          icon: FileCheck,   badge: pendingDocs.length || undefined },
    { key: 'meetings',   label: 'Meetings',           icon: Calendar,    badge: pendingMeets.length || undefined },
    { key: 'portfolio',  label: 'Portfolio',          icon: Image },
    { key: 'map',        label: 'Client Map',         icon: Map },
    { key: 'finance',    label: 'Finance Data',       icon: DollarSign },
    { key: 'analytics',  label: 'Analytics',          icon: TrendingUp },
  ];

  /* ════════ LOCK SCREEN ════════ */
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: B, backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <motion.div className="w-full max-w-sm relative" style={{ backgroundColor: W, border: '1px solid rgba(157,126,63,0.22)' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ height: 3, backgroundColor: AC }} />
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-9">
              <div className="w-px h-8" style={{ backgroundColor: AC }} />
              <div>
                <div className="text-[11px] font-black tracking-[0.34em] uppercase" style={{ color: B, fontFamily: SERIF }}>HOU INC</div>
                <div className="text-[7px] uppercase tracking-[0.42em]" style={{ color: AC }}>Admin Dashboard · Secure Access</div>
              </div>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '28px', color: B, lineHeight: 1.1, marginBottom: 6 }}>Admin Access</div>
            <p className="text-[12px] font-light mb-8" style={{ color: G500 }}>Enter your 6-digit PIN to access the dashboard.</p>
            <div className="mb-2">
              <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-4" style={{ color: G500 }}>Admin PIN</label>
              <div className="flex gap-2 justify-between">
                {pin.map((digit, i) => (
                  <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={digit} autoFocus={i === 0}
                    onChange={e => handlePinDigit(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)}
                    className="outline-none text-center text-[20px] font-bold"
                    style={{ width: 44, height: 52, flexShrink: 0, border: `1px solid ${digit ? AC : G200}`, color: B, backgroundColor: digit ? 'rgba(157,126,63,0.04)' : W, transition: 'border-color 0.18s ease, background-color 0.18s ease', caretColor: 'transparent' }}
                    onFocus={e => { e.target.style.borderColor = AC; }}
                    onBlur={e => { if (!e.target.value) e.target.style.borderColor = G200; }}
                  />
                ))}
              </div>
            </div>
            {pinError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] mt-3 mb-0" style={{ color: '#ef4444' }}>{pinError}</motion.p>}
            <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${G200}` }}>
              <Link to="/" className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: G500 }}>← Back to Website</Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════ OVERVIEW STATS ════════ */
  const OVERVIEW_STATS = [
    { label: 'Pending Approvals', value: pendingApprovals.length,                  icon: ShieldCheck,   color: '#f59e0b', sub: 'Accounts awaiting review', urgent: true },
    { label: 'Active Clients',    value: approvedClients.length,                   icon: Users,         color: '#3b82f6', sub: 'Approved portal accounts' },
    { label: 'Project Briefs',    value: Object.keys(briefs).length,               icon: ClipboardList, color: AC,        sub: 'Submitted via portal' },
    { label: 'Inbound Leads',     value: allLeads,                                 icon: Inbox,         color: '#10b981', sub: 'Website form submissions' },
    { label: 'Pending Documents', value: pendingDocs.length,                       icon: FileCheck,     color: '#8b5cf6', sub: 'Awaiting review' },
    { label: 'Meeting Requests',  value: pendingMeets.length,                      icon: Calendar,      color: '#ec4899', sub: 'Awaiting confirmation' },
  ];

  /* ════════ DASHBOARD ════════ */
  return (
    <div className="flex" style={{ backgroundColor: G50, height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 w-[240px]"
        style={{ backgroundColor: B, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-px h-6" style={{ backgroundColor: AC }} />
            <div>
              <div className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.38em]" style={{ color: AC }}>Admin Dashboard</div>
            </div>
          </div>
          <div className="mt-3 px-2 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.2)' }}>
            <Settings className="w-3 h-3" style={{ color: AC }} strokeWidth={1.5} />
            <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>System Control</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ key, label, icon: Icon, badge, urgent }) => (
            <button key={key} onClick={() => { setTab(key); setSelectedClientId(null); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-left transition-all"
              style={{ color: tab === key ? AC : urgent ? 'rgba(255,200,100,0.75)' : 'rgba(255,255,255,0.45)', backgroundColor: tab === key ? 'rgba(157,126,63,0.1)' : 'transparent', borderLeft: tab === key ? `2px solid ${AC}` : '2px solid transparent' }}>
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold flex-1">{label}</span>
              {badge ? <span className="text-[8px] font-black px-1.5 py-0.5" style={{ backgroundColor: urgent ? 'rgba(245,158,11,0.25)' : 'rgba(157,126,63,0.2)', color: urgent ? '#f59e0b' : AC }}>{badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" className="w-full flex items-center gap-3 px-3 py-2.5 mt-3 text-[11px] font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} /> Back to Website
          </Link>
          <Link to="/portal" className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} /> Client Portal
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-semibold transition-colors mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} /> Lock Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-[240px] flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: W, borderBottom: `1px solid ${G200}`, boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            {selectedClientId && tab === 'clients' && (
              <button onClick={() => setSelectedClientId(null)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-semibold px-3 py-2 transition-all"
                style={{ border: `1px solid ${G200}`, color: G500 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.color = G500; }}>
                <ArrowLeft className="w-3 h-3" strokeWidth={2} /> All Clients
              </button>
            )}
            <div>
              <div className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>HOU INC · Admin</div>
              <div className="text-[16px] font-bold" style={{ color: B }}>
                {selectedClientId && tab === 'clients' ? clients.find((c: any) => c.id === selectedClientId)?.name : NAV_ITEMS.find(n => n.key === tab)?.label}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refreshData} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-semibold px-3 py-2 transition-all"
              style={{ border: `1px solid ${G200}`, color: G500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.color = G500; }}>
              <RefreshCw className="w-3 h-3" strokeWidth={2} /> Refresh
            </button>
            <Link to="/finance" className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2 transition-opacity hover:opacity-85"
              style={{ backgroundColor: AC, color: W }}>
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {tab === 'map' && (
          <div className="flex-1" style={{ overflow: 'hidden' }}>
            <ClientMap />
          </div>
        )}

        {tab !== 'map' && <div className="px-6 py-7">

          {/* ══════ OVERVIEW ══════ */}
          {tab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
                {OVERVIEW_STATS.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="p-5 cursor-pointer transition-all"
                      style={{ backgroundColor: W, border: s.urgent && s.value > 0 ? '1px solid rgba(245,158,11,0.35)' : `1px solid ${G200}`, backgroundColor: s.urgent && s.value > 0 ? 'rgba(245,158,11,0.03)' : W }}
                      onClick={() => s.urgent ? setTab('approvals') : undefined}>
                      <div className="w-8 h-8 flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}14` }}>
                        <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
                      </div>
                      <div className="text-[26px] font-black mb-0.5" style={{ color: s.urgent && s.value > 0 ? '#f59e0b' : B, fontFamily: SERIF }}>{s.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: B }}>{s.label}</div>
                      <div className="text-[10px] font-light" style={{ color: G500 }}>{s.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Pending approvals alert */}
              {pendingApprovals.length > 0 && (
                <div className="mb-5 p-5 flex items-center gap-5" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.28)' }}>
                  <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                    <ShieldCheck className="w-4.5 h-4.5" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold" style={{ color: B }}>
                      {pendingApprovals.length} account application{pendingApprovals.length > 1 ? 's' : ''} waiting for review
                    </div>
                    <div className="text-[10px] font-light mt-0.5" style={{ color: G500 }}>
                      {pendingApprovals.map((c: any) => c.name).join(', ')}
                    </div>
                  </div>
                  <button onClick={() => setTab('approvals')}
                    className="text-[9px] uppercase tracking-[0.2em] font-bold px-4 py-2 whitespace-nowrap transition-all"
                    style={{ backgroundColor: '#f59e0b', color: W }}>
                    Review Now
                  </button>
                </div>
              )}

              {/* Pending actions */}
              {(pendingDocs.length > 0 || pendingMeets.length > 0) && (
                <div className="mb-7" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                    <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Needs Your Attention</div>
                  </div>
                  {pendingDocs.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${G200}` }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#8b5cf6' }} strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold" style={{ color: B }}>{clientName(d.clientId)}</span>
                        <span className="text-[11px] font-light ml-2" style={{ color: G500 }}>uploaded <strong>{d.name}</strong> — awaiting review</span>
                      </div>
                      <button onClick={() => { setTab('clients'); setSelectedClientId(d.clientId); setClientSubTab('docs'); }}
                        className="text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-colors"
                        style={{ border: `1px solid ${G200}`, color: G500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = AC; (e.currentTarget as HTMLElement).style.borderColor = AC; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; (e.currentTarget as HTMLElement).style.borderColor = G200; }}>
                        Review
                      </button>
                    </div>
                  ))}
                  {pendingMeets.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: `1px solid ${G200}` }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold" style={{ color: B }}>{clientName(m.clientId)}</span>
                        <span className="text-[11px] font-light ml-2" style={{ color: G500 }}>requested <strong>{m.type}</strong> on {m.date} at {m.time}</span>
                      </div>
                      <button onClick={() => { setTab('clients'); setSelectedClientId(m.clientId); setClientSubTab('meetings'); }}
                        className="text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-colors"
                        style={{ border: `1px solid ${G200}`, color: G500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = AC; (e.currentTarget as HTMLElement).style.borderColor = AC; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; (e.currentTarget as HTMLElement).style.borderColor = G200; }}>
                        Confirm
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent approved clients */}
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Recent Active Clients</div>
                  <button onClick={() => setTab('clients')} className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: G500 }}>View All →</button>
                </div>
                {approvedClients.slice(-5).reverse().map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors"
                    style={{ borderBottom: i < Math.min(approvedClients.length, 5) - 1 ? `1px solid ${G200}` : 'none' }}
                    onClick={() => { setTab('clients'); setSelectedClientId(c.id); setClientSubTab('brief'); }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = G50; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    <div className="w-8 h-8 flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                      {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold" style={{ color: B }}>{c.name}</div>
                      <div className="text-[10px] font-light" style={{ color: G500 }}>{c.email}</div>
                    </div>
                    <StatusBadge label={briefs[c.id] ? briefs[c.id].status : 'no brief'} style={briefStatusColor(briefs[c.id]?.status ?? 'none')} />
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: G500 }} strokeWidth={1.5} />
                  </div>
                ))}
                {approvedClients.length === 0 && <div className="px-5 py-10 text-center text-[12px] font-light" style={{ color: G500 }}>No approved clients yet.</div>}
              </div>
            </motion.div>
          )}

          {/* ══════ APPROVALS ══════ */}
          {tab === 'approvals' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

              {/* Header + stats strip */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Pending Review',  value: pendingApprovals.length,                                        color: '#f59e0b' },
                  { label: 'Approved',         value: clients.filter((c: any) => c.status === 'approved').length,     color: '#10b981' },
                  { label: 'Not Approved',     value: clients.filter((c: any) => c.status === 'rejected').length,     color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="p-4" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="text-[22px] font-black" style={{ color: s.color, fontFamily: SERIF }}>{s.value}</div>
                    <div className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1" style={{ color: B }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pending applications */}
              <div className="mb-6" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}`, backgroundColor: 'rgba(245,158,11,0.03)' }}>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: '#f59e0b' }}>Pending Review</div>
                    <div className="text-[11px] font-light mt-0.5" style={{ color: G500 }}>Review each application and approve or decline access</div>
                  </div>
                  {pendingApprovals.length > 0 && (
                    <span className="text-[8px] font-black px-2 py-0.5" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      {pendingApprovals.length} waiting
                    </span>
                  )}
                </div>

                {pendingApprovals.length === 0 && (
                  <div className="py-14 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: '#10b981' }} strokeWidth={1} />
                    <div className="text-[13px] font-semibold" style={{ color: B }}>All caught up</div>
                    <div className="text-[11px] font-light mt-1" style={{ color: G500 }}>No pending applications at this time.</div>
                  </div>
                )}

                {pendingApprovals.map((c: any, i: number) => (
                  <div key={c.id} style={{ borderBottom: i < pendingApprovals.length - 1 ? `1px solid ${G200}` : 'none' }}>
                    <div className="px-5 py-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 flex items-center justify-center text-[12px] font-black shrink-0"
                          style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontFamily: SERIF }}>
                          {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="text-[14px] font-bold" style={{ color: B }}>{c.name}</span>
                            <span className="text-[7.5px] uppercase tracking-[0.2em] font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                              Pending Review
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3">
                            <span className="text-[11px] font-light" style={{ color: G500 }}>{c.email}</span>
                            {c.phone && <span className="text-[11px] font-light" style={{ color: G500 }}>{c.phone}</span>}
                            <span className="text-[10px] font-light" style={{ color: G500 }}>
                              Applied {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Project type + description */}
                          {c.projectType && (
                            <div className="mb-3">
                              <span className="text-[8px] uppercase tracking-[0.3em] font-bold px-2 py-0.5 mr-2"
                                style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC }}>
                                {c.projectType}
                              </span>
                            </div>
                          )}
                          {c.projectInterest && (
                            <div className="p-3.5 mb-4" style={{ backgroundColor: G50, borderLeft: `2px solid ${G200}` }}>
                              <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: G500 }}>Project Description</div>
                              <p className="text-[12px] font-light leading-relaxed" style={{ color: B }}>{c.projectInterest}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={async () => { await adminApproveClient(c.id, c.name); await refreshData(); }}
                              className="flex items-center gap-2 px-5 py-2.5 transition-opacity hover:opacity-85"
                              style={{ backgroundColor: '#10b981', color: W, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700 }}>
                              <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                              Approve Access
                            </button>
                            <button
                              onClick={async () => { await adminRejectClient(c.id); await refreshData(); }}
                              className="flex items-center gap-2 px-5 py-2.5 transition-opacity hover:opacity-85"
                              style={{ border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.04)' }}>
                              <UserX className="w-3.5 h-3.5" strokeWidth={2} />
                              Decline
                            </button>
                            <a href={`mailto:${c.email}`}
                              className="flex items-center gap-1.5 px-4 py-2.5 transition-opacity hover:opacity-70"
                              style={{ border: `1px solid ${G200}`, color: G500, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.24em', fontWeight: 700, textDecoration: 'none' }}>
                              Email Applicant
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All clients with status */}
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>All Applications ({clients.length})</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                        {['Applicant', 'Project Type', 'Applied', 'Status', ''].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.26em] font-bold" style={{ color: G500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...clients].reverse().map((c: any, i: number) => {
                        const statusColor = c.status === 'approved' ? { bg: 'rgba(16,185,129,0.08)', color: '#10b981' }
                          : c.status === 'rejected' ? { bg: 'rgba(239,68,68,0.08)', color: '#ef4444' }
                          : { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
                        return (
                          <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? `1px solid ${G200}` : 'none' }}>
                            <td className="px-5 py-3.5">
                              <div className="text-[12px] font-semibold" style={{ color: B }}>{c.name}</div>
                              <div className="text-[10px] font-light" style={{ color: G500 }}>{c.email}</div>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>{c.projectType || '—'}</td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge label={c.status?.replace('_', ' ') ?? 'pending'} style={statusColor} />
                            </td>
                            <td className="px-5 py-3.5">
                              {c.status === 'pending_approval' && (
                                <div className="flex items-center gap-2">
                                  <button onClick={async () => { await adminApproveClient(c.id, c.name); await refreshData(); }}
                                    className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 transition-colors"
                                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    Approve
                                  </button>
                                  <button onClick={async () => { await adminRejectClient(c.id); await refreshData(); }}
                                    className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 transition-colors"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    Decline
                                  </button>
                                </div>
                              )}
                              {c.status === 'approved' && (
                                <button onClick={() => { setTab('clients'); setSelectedClientId(c.id); }}
                                  className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 transition-colors"
                                  style={{ border: `1px solid ${G200}`, color: G500 }}>
                                  View Profile
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {clients.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No applications yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════ CLIENTS ══════ */}
          {tab === 'clients' && !selectedClientId && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Active Portal Clients ({approvedClients.length})</div>
                  {pendingApprovals.length > 0 && (
                    <button onClick={() => setTab('approvals')} className="text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 flex items-center gap-1.5"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                      {pendingApprovals.length} pending approval
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                        {['Client', 'Contact', 'Approved', 'Brief Status', 'Docs', 'Msgs', ''].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.26em] font-bold" style={{ color: G500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {approvedClients.map((c: any, i: number) => {
                        const brief = briefs[c.id];
                        const msgs = (allMsgs[c.id] ?? []).length;
                        const docs = (allDocs[c.id] ?? []).length;
                        return (
                          <tr key={c.id} className="cursor-pointer transition-colors"
                            style={{ borderBottom: i < approvedClients.length - 1 ? `1px solid ${G200}` : 'none' }}
                            onClick={() => { setSelectedClientId(c.id); setClientSubTab('brief'); }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = G50; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0"
                                  style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                                  {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-[12px] font-semibold" style={{ color: B }}>{c.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="text-[11px] font-light" style={{ color: G500 }}>{c.email}</div>
                              <div className="text-[10px] font-light" style={{ color: G500 }}>{c.phone || '—'}</div>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge label={brief ? brief.status : 'no brief'} style={briefStatusColor(brief?.status ?? 'none')} />
                            </td>
                            <td className="px-5 py-3.5 text-[12px] font-semibold" style={{ color: B }}>{docs}</td>
                            <td className="px-5 py-3.5 text-[12px] font-semibold" style={{ color: B }}>{msgs}</td>
                            <td className="px-5 py-3.5"><ChevronRight className="w-3.5 h-3.5" style={{ color: G500 }} strokeWidth={1.5} /></td>
                          </tr>
                        );
                      })}
                      {approvedClients.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No approved clients yet. <button onClick={() => setTab('approvals')} className="underline" style={{ color: AC }}>Review pending applications →</button></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════ CLIENT DETAIL ══════ */}
          {tab === 'clients' && selectedClientId && (() => {
            const client = clients.find((c: any) => c.id === selectedClientId);
            if (!client) return null;
            const brief    = briefs[selectedClientId];
            const messages = allMsgs[selectedClientId] ?? [];
            const docs     = allDocs[selectedClientId] ?? [];
            const meets    = allMeetings[selectedClientId] ?? [];
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {/* Client header */}
                <div className="flex items-center gap-5 p-5 mb-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  <div className="w-14 h-14 flex items-center justify-center text-[16px] font-black shrink-0"
                    style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                    {client.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[18px] font-bold mb-0.5" style={{ color: B }}>{client.name}</div>
                    <div className="flex flex-wrap gap-4 text-[11px] font-light" style={{ color: G500 }}>
                      <span>{client.email}</span>
                      {client.phone && <span>· {client.phone}</span>}
                      <span>· Joined {new Date(client.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                      {messages.length} msgs
                    </span>
                    <span className="text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
                      {docs.length} docs
                    </span>
                    <span className="text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                      {meets.length} meetings
                    </span>
                  </div>
                </div>

                {/* Sub-tab pills */}
                <div className="flex gap-1 mb-5">
                  {([['brief', 'Project Brief'], ['messages', 'Messages'], ['docs', 'Documents'], ['meetings', 'Meetings']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setClientSubTab(k)}
                      className="text-[9px] uppercase tracking-[0.22em] font-bold px-4 py-2 transition-all"
                      style={{ backgroundColor: clientSubTab === k ? B : W, color: clientSubTab === k ? W : G500, border: `1px solid ${clientSubTab === k ? B : G200}` }}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* Brief sub-tab */}
                {clientSubTab === 'brief' && (
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    {brief ? (
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Project Brief</div>
                          <StatusBadge label={brief.status} style={briefStatusColor(brief.status)} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          {[
                            ['Type', brief.type],
                            ['Location', brief.location],
                            ['Sq Ft', brief.sqft],
                            ['Budget', brief.budget],
                            ['Timeline', brief.timeline],
                            ['Style', (brief.style ?? []).join(', ') || '—'],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1" style={{ color: G500 }}>{l}</div>
                              <div className="text-[12px] font-semibold" style={{ color: B }}>{v || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {brief.description && (
                          <div className="mb-6 p-4" style={{ backgroundColor: G50, border: `1px solid ${G200}` }}>
                            <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G500 }}>Description</div>
                            <div className="text-[12px] font-light leading-relaxed" style={{ color: B }}>{brief.description}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-3" style={{ color: G500 }}>Update Status</div>
                          <div className="flex flex-wrap gap-2">
                            {BRIEF_STATUSES.map(s => {
                              const c = briefStatusColor(s);
                              return (
                                <button key={s} onClick={async () => { await adminUpdateBriefStatus(selectedClientId, s); await refreshData(); }}
                                  className="text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-2 transition-all"
                                  style={{ backgroundColor: brief.status === s ? c.color : 'transparent', color: brief.status === s ? W : c.color, border: `1px solid ${c.color}` }}>
                                  {s.replace(/_/g, ' ')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-14 text-center">
                        <ClipboardList className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                        <div className="text-[12px] font-light" style={{ color: G500 }}>No brief submitted yet.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages sub-tab */}
                {clientSubTab === 'messages' && (
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="max-h-[400px] overflow-y-auto p-5 space-y-3">
                      {messages.map((m: any) => (
                        <div key={m.id} className={`flex gap-3 ${m.sender === 'builder' ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.1)' : G50, color: m.sender === 'builder' ? AC : G500, fontFamily: SERIF }}>
                            {m.senderName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                          </div>
                          <div className="max-w-[70%]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-bold" style={{ color: m.sender === 'builder' ? AC : B }}>{m.senderName}</span>
                              <span className="text-[9px] font-light" style={{ color: G500 }}>{new Date(m.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-[12px] font-light leading-relaxed p-3"
                              style={{ backgroundColor: m.sender === 'builder' ? 'rgba(157,126,63,0.06)' : G50, border: `1px solid ${m.sender === 'builder' ? 'rgba(157,126,63,0.15)' : G200}`, color: B }}>
                              {m.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && <div className="text-center py-8 text-[12px] font-light" style={{ color: G500 }}>No messages yet.</div>}
                    </div>
                    <div className="p-5" style={{ borderTop: `1px solid ${G200}` }}>
                      <div className="flex gap-3">
                        <textarea
                          value={replyDraft}
                          onChange={e => setReplyDraft(e.target.value)}
                          placeholder="Reply as Jeff Ali…"
                          rows={2}
                          className="flex-1 text-[12px] font-light outline-none resize-none"
                          style={{ padding: '10px 13px', border: `1px solid ${G200}`, color: B }}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendReply(); }}
                        />
                        <button onClick={handleSendReply} disabled={!replyDraft.trim()}
                          className="flex items-center gap-2 px-5 text-[9px] uppercase tracking-[0.22em] font-black transition-opacity"
                          style={{ backgroundColor: replyDraft.trim() ? B : G200, color: replyDraft.trim() ? W : G500 }}>
                          <Send className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents sub-tab */}
                {clientSubTab === 'docs' && (
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    {docs.map((d: any, i: number) => (
                      <div key={d.id} className="flex items-center gap-4 px-5 py-4"
                        style={{ borderBottom: i < docs.length - 1 ? `1px solid ${G200}` : 'none' }}>
                        <FileText className="w-4 h-4 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold" style={{ color: B }}>{d.name}</div>
                          <div className="text-[10px] font-light" style={{ color: G500 }}>{d.fileType} · {d.category} {d.uploadedAt ? `· Uploaded ${new Date(d.uploadedAt).toLocaleDateString()}` : ''}</div>
                        </div>
                        <StatusBadge label={d.status} style={docStatusColor(d.status)} />
                        <div className="flex gap-2 ml-2 flex-wrap">
                          {d.file_url && (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-opacity hover:opacity-75"
                              style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)`, textDecoration: 'none' }}>
                              <Download className="w-3 h-3" strokeWidth={2} /> View
                            </a>
                          )}
                          {d.status === 'uploaded' && (
                            <>
                              <button onClick={async () => { await adminUpdateDocStatus(selectedClientId, d.id, 'approved'); await refreshData(); }}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Approve
                              </button>
                              <button onClick={async () => { await adminUpdateDocStatus(selectedClientId, d.id, 'rejected'); await refreshData(); }}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <XCircle className="w-3 h-3" strokeWidth={2} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {docs.length === 0 && <div className="px-5 py-14 text-center text-[12px] font-light" style={{ color: G500 }}>No documents yet.</div>}
                  </div>
                )}

                {/* Meetings sub-tab */}
                {clientSubTab === 'meetings' && (
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    {meets.map((m: any, i: number) => {
                      const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                      return (
                        <div key={m.id} className="flex items-center gap-4 px-5 py-4"
                          style={{ borderBottom: i < meets.length - 1 ? `1px solid ${G200}` : 'none' }}>
                          <FmtIcon className="w-4 h-4 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold" style={{ color: B }}>{m.type}</div>
                            <div className="text-[10px] font-light" style={{ color: G500 }}>{m.date} at {m.time} · {m.format}</div>
                            {m.notes && <div className="text-[10px] font-light mt-0.5" style={{ color: G500 }}>{m.notes}</div>}
                          </div>
                          <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                          {m.status === 'requested' && (
                            <div className="flex gap-2 ml-2">
                              <button onClick={async () => { await adminUpdateMeetingStatus(selectedClientId, m.id, 'confirmed'); await refreshData(); }}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Confirm
                              </button>
                              <button onClick={async () => { await adminUpdateMeetingStatus(selectedClientId, m.id, 'cancelled'); await refreshData(); }}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <XCircle className="w-3 h-3" strokeWidth={2} /> Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {meets.length === 0 && <div className="px-5 py-14 text-center text-[12px] font-light" style={{ color: G500 }}>No meetings yet.</div>}
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* ══════ LEADS ══════ */}
          {tab === 'leads' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              {/* Sub-tab toggle */}
              <div className="flex gap-1 mb-5">
                {([['startproject', `Start Project (${startBriefs.length})`], ['contact', `Contact Forms (${contactForms.length})`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setLeadsSubTab(k); setExpandedLeadId(null); }}
                    className="text-[9px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 transition-all"
                    style={{ backgroundColor: leadsSubTab === k ? B : W, color: leadsSubTab === k ? W : G500, border: `1px solid ${leadsSubTab === k ? B : G200}` }}>
                    {l}
                  </button>
                ))}
              </div>

              {leadsSubTab === 'startproject' && (
                <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  {startBriefs.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <Inbox className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                      <div className="text-[12px] font-light" style={{ color: G500 }}>No project brief submissions yet.</div>
                      <p className="text-[11px] mt-1 font-light" style={{ color: G500 }}>Submissions from the Start Project flow will appear here.</p>
                    </div>
                  ) : startBriefs.slice().reverse().map((s: any, i: number) => (
                    <div key={s.id}>
                      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
                        style={{ borderBottom: `1px solid ${G200}` }}
                        onClick={() => setExpandedLeadId(expandedLeadId === s.id ? null : s.id)}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = G50; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                        <div className="w-8 h-8 flex items-center justify-center text-[9px] font-black shrink-0"
                          style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                          {(s.name || 'SP').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold" style={{ color: B }}>{s.name || 'Anonymous'}</div>
                          <div className="text-[10px] font-light" style={{ color: G500 }}>{s.email} · {s.type} · {s.budget}</div>
                        </div>
                        <div className="text-[9px] font-light shrink-0" style={{ color: G500 }}>
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                        <span className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1 shrink-0" style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }}>Start Project</span>
                        {expandedLeadId === s.id ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: G500 }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: G500 }} />}
                      </div>
                      <AnimatePresence>
                        {expandedLeadId === s.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div className="px-5 py-5" style={{ backgroundColor: G50, borderBottom: `1px solid ${G200}` }}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {[['Type', s.type], ['Scope', s.scope?.replace(/_/g, ' ')], ['Sq Ft', s.sqft?.replace(/_/g, ' ')], ['Location', s.location], ['Budget', s.budget?.replace(/_/g, ' ')], ['Timeline', s.startTimeline?.replace(/_/g, ' ')], ['Phone', s.phone || '—'], ['Priorities', (s.priorities ?? []).join(', ') || '—']].map(([l, v]) => (
                                  <div key={l}>
                                    <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1" style={{ color: G500 }}>{l}</div>
                                    <div className="text-[11px] font-semibold" style={{ color: B }}>{v || '—'}</div>
                                  </div>
                                ))}
                              </div>
                              {s.description && (
                                <div className="p-3 text-[12px] font-light leading-relaxed" style={{ backgroundColor: W, border: `1px solid ${G200}`, color: B }}>{s.description}</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {leadsSubTab === 'contact' && (
                <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  {contactForms.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                      <div className="text-[12px] font-light" style={{ color: G500 }}>No contact form submissions yet.</div>
                    </div>
                  ) : contactForms.slice().reverse().map((f: any, i: number) => (
                    <div key={i} className="px-5 py-5" style={{ borderBottom: i < contactForms.length - 1 ? `1px solid ${G200}` : 'none' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[12px] font-bold mb-0.5" style={{ color: B }}>{f.name}</div>
                          <div className="text-[10px] font-light mb-2" style={{ color: G500 }}>{f.email}{f.phone ? ` · ${f.phone}` : ''}</div>
                          <div className="text-[11px] font-light leading-relaxed" style={{ color: G500 }}>{f.message || f.description || '—'}</div>
                        </div>
                        <div className="text-[9px] shrink-0" style={{ color: G500 }}>
                          {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ DOCUMENTS ══════ */}
          {tab === 'documents' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
                    All Portal Documents — {Object.values(allDocs).flatMap(d => d ?? []).length} total · {pendingDocs.length} pending review
                  </div>
                </div>
                {Object.entries(allDocs).flatMap(([cId, docs]) => (docs ?? []).map((d: any) => ({ ...d, clientId: cId }))).length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <FileCheck className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[12px] font-light" style={{ color: G500 }}>No documents yet.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                          {['Client', 'Document', 'Category', 'Type', 'Status', 'Date', 'Actions'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.26em] font-bold" style={{ color: G500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(allDocs).flatMap(([cId, docs]) =>
                          (docs ?? []).map((d: any) => ({ ...d, clientId: cId }))
                        ).sort((a: any, b: any) => {
                          const order: Record<string, number> = { uploaded: 0, pending: 1, approved: 2, rejected: 3 };
                          return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                        }).map((d: any, i: number, arr) => (
                          <tr key={`${d.clientId}-${d.id}`} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${G200}` : 'none' }}>
                            <td className="px-5 py-3.5">
                              <button onClick={() => { setTab('clients'); setSelectedClientId(d.clientId); setClientSubTab('docs'); }}
                                className="text-[11px] font-semibold transition-colors" style={{ color: AC }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}>
                                {clientName(d.clientId)}
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] font-semibold" style={{ color: B }}>{d.name}</td>
                            <td className="px-5 py-3.5 text-[10px] font-light" style={{ color: G500 }}>{d.category}</td>
                            <td className="px-5 py-3.5 text-[10px] font-light" style={{ color: G500 }}>{d.fileType}</td>
                            <td className="px-5 py-3.5"><StatusBadge label={d.status} style={docStatusColor(d.status)} /></td>
                            <td className="px-5 py-3.5 text-[10px] font-light" style={{ color: G500 }}>{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1.5 flex-wrap">
                                {d.file_url && (
                                  <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1 flex items-center gap-1 transition-opacity hover:opacity-75"
                                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)`, textDecoration: 'none' }}>
                                    <Download className="w-2.5 h-2.5" strokeWidth={2} /> View
                                  </a>
                                )}
                                {d.status === 'uploaded' && (
                                  <>
                                    <button onClick={async () => { await adminUpdateDocStatus(d.clientId, d.id, 'approved'); await refreshData(); }}
                                      className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1"
                                      style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                      Approve
                                    </button>
                                    <button onClick={async () => { await adminUpdateDocStatus(d.clientId, d.id, 'rejected'); await refreshData(); }}
                                      className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1"
                                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════ MEETINGS ══════ */}
          {tab === 'meetings' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
                    All Scheduled Meetings — {pendingMeets.length} awaiting confirmation
                  </div>
                </div>
                {Object.entries(allMeetings).flatMap(([cId, meets]) => (meets ?? []).map((m: any) => ({ ...m, clientId: cId }))).length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[12px] font-light" style={{ color: G500 }}>No meetings yet.</div>
                  </div>
                ) : (
                  Object.entries(allMeetings)
                    .flatMap(([cId, meets]) => (meets ?? []).map((m: any) => ({ ...m, clientId: cId })))
                    .sort((a: any, b: any) => {
                      const order: Record<string, number> = { requested: 0, confirmed: 1, completed: 2, cancelled: 3 };
                      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                    })
                    .map((m: any, i: number, arr) => {
                      const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                      return (
                        <div key={`${m.clientId}-${m.id}`} className="flex items-center gap-4 px-5 py-4"
                          style={{ borderBottom: i < arr.length - 1 ? `1px solid ${G200}` : 'none' }}>
                          <FmtIcon className="w-4 h-4 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[12px] font-bold" style={{ color: B }}>{m.type}</span>
                              <span className="text-[10px] font-light" style={{ color: G500 }}>with</span>
                              <button onClick={() => { setTab('clients'); setSelectedClientId(m.clientId); setClientSubTab('meetings'); }}
                                className="text-[11px] font-semibold transition-colors" style={{ color: AC }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}>
                                {clientName(m.clientId)}
                              </button>
                            </div>
                            <div className="text-[10px] font-light" style={{ color: G500 }}>{m.date} at {m.time} · {m.format}</div>
                          </div>
                          <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                          {m.status === 'requested' && (
                            <div className="flex gap-2">
                              <button onClick={async () => { await adminUpdateMeetingStatus(m.clientId, m.id, 'confirmed'); await refreshData(); }}
                                className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                Confirm
                              </button>
                              <button onClick={async () => { await adminUpdateMeetingStatus(m.clientId, m.id, 'cancelled'); await refreshData(); }}
                                className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          )}

          {/* ══════ PORTFOLIO ══════ */}
          {tab === 'portfolio' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <PortfolioManager onCountChange={setPortfolioCount} />
            </motion.div>
          )}

          {/* ══════ FINANCE DATA ══════ */}
          {tab === 'finance' && (() => {
            const ENTITY_DEFS: { id: string; name: string; short: string; color: string }[] = [
              { id: 'houston-enterprise',          name: 'Houston Enterprise',          short: 'HE',  color: '#9D7E3F' },
              { id: 'houston-generator-pros',      name: 'Houston Generator Pros',      short: 'HGP', color: '#1B72B5' },
              { id: 'houston-enterprise-holdings', name: 'Houston Enterprise Holdings', short: 'HEH', color: '#2C5F8A' },
            ];

            const activeEntities = finEntityTab === 'all' ? ENTITY_DEFS.map(e => e.id) : [finEntityTab];

            const entityIncome  = (id: string) => finTxns.filter((t: any) => t.entity_id === id && t.kind === 'income').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const entityExpense = (id: string) => finTxns.filter((t: any) => t.entity_id === id && t.kind === 'expense').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const entityChecks  = (id: string) => finChecks.filter((c: any) => c.entity_id === id);
            const entityProjects = (id: string) => finProjects.filter((p: any) => p.entity_id === id);

            const filteredProjects = finProjects.filter((p: any) => activeEntities.includes(p.entity_id));
            const filteredChecks   = finChecks.filter((c: any) => activeEntities.includes(c.entity_id));
            const filteredTxns     = finTxns.filter((t: any) => activeEntities.includes(t.entity_id));

            const fmt = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {/* Finance Hub link + quick-access row */}
                <div className="flex flex-wrap items-center gap-3 p-4 mb-6" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(157,126,63,0.1)' }}>
                    <DollarSign className="w-4 h-4" style={{ color: AC }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold mb-0.5" style={{ color: B }}>HOU INC Finance Hub</div>
                    <div className="text-[10px] font-light" style={{ color: G500 }}>Live entity-aware financial data — multi-company P&amp;L, projects, checks, and transactions.</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ENTITY_DEFS.map(e => (
                      <Link key={e.id} to={`/finance/dashboard`}
                        className="text-[8px] uppercase tracking-[0.2em] font-black px-3 py-1.5 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: e.color + '18', color: e.color, border: `1px solid ${e.color}40` }}>
                        {e.short}
                      </Link>
                    ))}
                    <Link to="/finance" className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.22em] font-black px-4 py-1.5"
                      style={{ backgroundColor: AC, color: W }}>
                      Open Hub <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>

                {/* Entity tabs */}
                <div className="flex items-center gap-1 mb-5 overflow-x-auto">
                  {[{ id: 'all', name: 'All Entities', short: 'All', color: AC }, ...ENTITY_DEFS].map(e => (
                    <button key={e.id} onClick={() => setFinEntityTab(e.id)}
                      className="text-[8px] uppercase tracking-[0.24em] font-black px-4 py-2 shrink-0 transition-all"
                      style={{
                        backgroundColor: finEntityTab === e.id ? e.color : 'transparent',
                        color: finEntityTab === e.id ? W : G500,
                        border: `1px solid ${finEntityTab === e.id ? e.color : G200}`,
                      }}>
                      {e.short}
                    </button>
                  ))}
                </div>

                {/* Per-entity P&L summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {ENTITY_DEFS.filter(e => finEntityTab === 'all' || e.id === finEntityTab).map(e => {
                    const income  = entityIncome(e.id);
                    const expense = entityExpense(e.id);
                    const net     = income - expense;
                    const checks  = entityChecks(e.id).length;
                    const projects = entityProjects(e.id).length;
                    return (
                      <div key={e.id} style={{ backgroundColor: W, border: `1px solid ${G200}`, borderTop: `3px solid ${e.color}` }}>
                        <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${G200}` }}>
                          <div className="text-[8px] font-black uppercase tracking-[0.38em] mb-1" style={{ color: e.color }}>{e.short}</div>
                          <div className="text-[13px] font-semibold" style={{ color: B }}>{e.name}</div>
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: G500 }}>Income</span>
                            <span className="text-[15px] font-black" style={{ color: '#10b981', fontFamily: SERIF }}>{fmt(income)}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: G500 }}>Expenses</span>
                            <span className="text-[15px] font-black" style={{ color: '#ef4444', fontFamily: SERIF }}>{fmt(expense)}</span>
                          </div>
                          <div style={{ height: 1, backgroundColor: G200 }} />
                          <div className="flex justify-between items-baseline">
                            <span className="text-[9px] uppercase tracking-[0.2em] font-black" style={{ color: B }}>Net Balance</span>
                            <span className="text-[17px] font-black" style={{ color: net >= 0 ? '#10b981' : '#ef4444', fontFamily: SERIF }}>{fmt(Math.abs(net))}</span>
                          </div>
                          <div className="flex gap-4 pt-1">
                            <div>
                              <span className="text-[18px] font-black" style={{ color: B, fontFamily: SERIF }}>{projects}</span>
                              <div className="text-[7.5px] uppercase tracking-[0.2em] font-bold" style={{ color: G500 }}>Projects</div>
                            </div>
                            <div>
                              <span className="text-[18px] font-black" style={{ color: B, fontFamily: SERIF }}>{checks}</span>
                              <div className="text-[7.5px] uppercase tracking-[0.2em] font-bold" style={{ color: G500 }}>Checks</div>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-3" style={{ borderTop: `1px solid ${G200}` }}>
                          <Link to="/finance/dashboard"
                            className="flex items-center gap-1 text-[8px] uppercase tracking-[0.22em] font-black hover:opacity-70 transition-opacity"
                            style={{ color: e.color }}>
                            Open Dashboard <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Aggregate stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Projects',      value: filteredProjects.length, icon: Layers,    color: '#3b82f6' },
                    { label: 'Checks',        value: filteredChecks.length,   icon: CreditCard, color: AC },
                    { label: 'Transactions',  value: filteredTxns.length,     icon: FileText,  color: '#8b5cf6' },
                    { label: 'Vendors',       value: finVendors.length,       icon: Package,   color: '#10b981' },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center gap-3 p-4" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                        <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}12` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="text-[20px] font-black leading-none" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                          <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] mt-0.5" style={{ color: G500 }}>{s.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Projects table */}
                {filteredProjects.length > 0 && (
                  <div className="mb-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${G200}` }}>
                      <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Projects</div>
                      <Link to="/projects" className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] font-black hover:opacity-70 transition-opacity" style={{ color: AC }}>
                        Manage <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                          {['Entity', 'Project', 'Status', 'Budget', 'Created'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[8.5px] uppercase tracking-[0.24em] font-bold" style={{ color: G500 }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredProjects.slice(0, 10).map((p: any, i: number) => {
                            const eDef = ENTITY_DEFS.find(e => e.id === p.entity_id);
                            return (
                              <tr key={p.id} style={{ borderBottom: i < Math.min(filteredProjects.length, 10) - 1 ? `1px solid ${G200}` : 'none' }}>
                                <td className="px-4 py-3">
                                  {eDef && <span className="text-[7.5px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5" style={{ backgroundColor: eDef.color + '16', color: eDef.color }}>{eDef.short}</span>}
                                </td>
                                <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: B }}>{p.name || '—'}</td>
                                <td className="px-4 py-3"><span className="text-[7.5px] uppercase tracking-[0.18em] font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC }}>{p.status || '—'}</span></td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{p.budget ? fmt(Number(p.budget)) : '—'}</td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Checks table */}
                {filteredChecks.length > 0 && (
                  <div className="mb-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${G200}` }}>
                      <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Recent Checks</div>
                      <Link to="/checks" className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] font-black hover:opacity-70 transition-opacity" style={{ color: AC }}>
                        View All <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                          {['Entity', 'Check #', 'Amount', 'Payee', 'Date', 'Status'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[8.5px] uppercase tracking-[0.24em] font-bold" style={{ color: G500 }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredChecks.slice(0, 8).map((c: any, i: number) => {
                            const eDef = ENTITY_DEFS.find(e => e.id === c.entity_id);
                            return (
                              <tr key={c.id} style={{ borderBottom: i < Math.min(filteredChecks.length, 8) - 1 ? `1px solid ${G200}` : 'none' }}>
                                <td className="px-4 py-3">
                                  {eDef && <span className="text-[7.5px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5" style={{ backgroundColor: eDef.color + '16', color: eDef.color }}>{eDef.short}</span>}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{c.check_number || '—'}</td>
                                <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: B }}>{c.amount ? fmt(Number(c.amount)) : '—'}</td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{c.payee_name || '—'}</td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{c.issue_date || '—'}</td>
                                <td className="px-4 py-3"><span className="text-[7.5px] uppercase tracking-[0.18em] font-bold px-2 py-0.5" style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }}>{c.status || 'issued'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent transactions */}
                {filteredTxns.length > 0 && (
                  <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${G200}` }}>
                      <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Recent Transactions</div>
                      <Link to="/ledger" className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] font-black hover:opacity-70 transition-opacity" style={{ color: AC }}>
                        Full Ledger <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                          {['Entity', 'Type', 'Description', 'Amount', 'Date'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[8.5px] uppercase tracking-[0.24em] font-bold" style={{ color: G500 }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredTxns.slice(0, 8).map((t: any, i: number) => {
                            const eDef = ENTITY_DEFS.find(e => e.id === t.entity_id);
                            const isIncome = t.kind === 'income';
                            return (
                              <tr key={t.id} style={{ borderBottom: i < Math.min(filteredTxns.length, 8) - 1 ? `1px solid ${G200}` : 'none' }}>
                                <td className="px-4 py-3">
                                  {eDef && <span className="text-[7.5px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5" style={{ backgroundColor: eDef.color + '16', color: eDef.color }}>{eDef.short}</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[7.5px] font-bold uppercase tracking-[0.18em] px-2 py-0.5" style={{ backgroundColor: isIncome ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: isIncome ? '#10b981' : '#ef4444' }}>
                                    {t.kind || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-light max-w-[180px] truncate" style={{ color: B }}>{t.description || t.memo || '—'}</td>
                                <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: isIncome ? '#10b981' : '#ef4444' }}>
                                  {isIncome ? '+' : '-'}{t.amount ? fmt(Number(t.amount)) : '—'}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {filteredProjects.length === 0 && filteredChecks.length === 0 && filteredTxns.length === 0 && (
                  <div className="text-center py-16" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <DollarSign className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[12px] font-light mb-1" style={{ color: G500 }}>No financial data yet for this entity.</div>
                    <Link to="/finance" className="text-[9px] uppercase tracking-[0.24em] font-black" style={{ color: AC }}>Open Finance Hub →</Link>
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* ══════ ANALYTICS ══════ */}
          {tab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-7">
                {[
                  { label: 'Portal Registrations',  value: clients.length,                              trend: 'Total',    color: '#3b82f6' },
                  { label: 'Briefs Submitted',       value: Object.keys(briefs).length,                 trend: 'Portal',   color: AC },
                  { label: 'Start Project Leads',    value: startBriefs.length,                         trend: 'Website',  color: '#10b981' },
                  { label: 'Contact Form Leads',     value: contactForms.length,                        trend: 'Website',  color: '#f59e0b' },
                  { label: 'Portfolio Projects',     value: portfolioCount,                              trend: 'Active',   color: '#8b5cf6' },
                  { label: 'Avg Messages / Client',  value: clients.length > 0 ? Math.round(totalMsgs / clients.length) : 0, trend: 'Avg', color: '#ec4899' },
                ].map(s => (
                  <div key={s.label} className="p-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="text-[30px] font-black mb-0.5" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: B }}>{s.label}</div>
                    <div className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 inline-block" style={{ backgroundColor: `${s.color}12`, color: s.color }}>{s.trend}</div>
                  </div>
                ))}
              </div>

              <div className="p-7 mb-6" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: AC }}>Portal Conversion Funnel</div>
                <div className="space-y-4">
                  {[
                    { label: 'Registered Accounts',  count: clients.length,                color: '#3b82f6' },
                    { label: 'Brief Submitted',       count: Object.keys(briefs).length,    color: AC },
                    { label: 'Messaging Active',      count: Object.keys(allMsgs).filter(k => (allMsgs[k]?.length ?? 0) > 1).length, color: '#8b5cf6' },
                  ].map((s, i, arr) => {
                    const pct = arr[0].count > 0 ? Math.round((s.count / arr[0].count) * 100) : 0;
                    return (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: B }}>{s.label}</span>
                          <span className="text-[11px] font-bold" style={{ color: B }}>{s.count} <span className="text-[10px] font-light" style={{ color: G500 }}>({pct}%)</span></span>
                        </div>
                        <div className="h-2 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
                          <motion.div className="h-full" style={{ backgroundColor: s.color }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-7" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-5" style={{ color: AC }}>Lead Sources</div>
                <div className="flex gap-6">
                  {[
                    { label: 'Start Project Form', count: startBriefs.length, color: '#10b981' },
                    { label: 'Contact Form',       count: contactForms.length, color: '#f59e0b' },
                    { label: 'Portal Sign-up',     count: clients.length,      color: '#3b82f6' },
                  ].map(s => {
                    const total = startBriefs.length + contactForms.length + clients.length;
                    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                    return (
                      <div key={s.label} className="flex-1 text-center">
                        <div className="text-[28px] font-black mb-1" style={{ color: B, fontFamily: SERIF }}>{pct}%</div>
                        <div className="text-[10px] font-semibold mb-1" style={{ color: B }}>{s.label}</div>
                        <div className="text-[11px] font-light" style={{ color: G500 }}>{s.count} submissions</div>
                        <div className="h-1 mt-3" style={{ backgroundColor: s.color, width: `${pct}%`, margin: '12px auto 0' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </div>}
      </main>
    </div>
  );
}
