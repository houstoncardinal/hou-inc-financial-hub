import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, BarChart3, Settings, Image,
  ArrowUpRight, TrendingUp, CheckCircle, Clock, AlertCircle,
  Plus, Trash2, Edit3, LogOut, X, FileText, Calendar,
  RefreshCw,
  ChevronRight, ChevronDown, Send, CheckCircle2, XCircle,
  Video, Phone, MapPin, FileCheck, Package,
  CreditCard, Inbox, DollarSign,
  ArrowLeft, ClipboardList, User, UserCheck, UserX, ShieldCheck,
  Map, Download, Mail, Search, StickyNote, LayoutList, CalendarDays,
  Receipt, FilePlus, FileUp,
  Filter, MoreVertical, Copy, Archive, RotateCcw,
} from 'lucide-react';
import ClientMap from '@/components/admin/ClientMap';
import { APPROVAL_DOCS } from '@/hooks/usePortal';
import { motion, AnimatePresence } from 'framer-motion';
import PortfolioManager from '@/components/admin/PortfolioManager';
import MilestoneManager from '@/components/admin/MilestoneManager';
import { toast } from '@/hooks/use-toast';

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
  const [projRes, chkRes, txnRes, vndRes, portRes] = await Promise.all([
    supabase.from('projects').select('*').is('deleted_at', null),
    supabase.from('checks').select('*').is('deleted_at', null),
    supabase.from('transactions').select('*').is('deleted_at', null),
    supabase.from('vendors').select('*').is('deleted_at', null),
    supabase.from('portfolio_projects').select('id', { count: 'exact', head: true }),
  ]);
  return {
    finProjects:    projRes.data ?? [],
    finChecks:      chkRes.data ?? [],
    finTxns:        txnRes.data ?? [],
    finVendors:     vndRes.data ?? [],
    portfolioCount: portRes.count ?? 0,
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

/* Check if the portal-documents storage bucket exists, then open the URL.
   Shows a clear toast if the bucket hasn't been created yet. */
async function viewDocument(url: string, showToast: (opts: { title: string; description?: string }) => void) {
  const { error } = await supabase.storage.from('portal-documents').list('', { limit: 1 });
  if (error) {
    showToast({
      title: 'Storage bucket not configured',
      description: "Run portal-setup.sql in the Supabase dashboard to create the 'portal-documents' bucket.",
    });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
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

/* ── #14 Audit log ─────────────────────────────────────────────────── */
async function logAdminAction(action: string, clientId: string, details: string) {
  try {
    await (supabase as any).from('portal_admin_log').insert({
      action, client_id: clientId, actor: 'Jeff Ali', details,
    });
  } catch { /* table may not exist yet */ }
}

/* ── #9 Admin notes ────────────────────────────────────────────────── */
async function loadAdminNotes(clientId: string): Promise<any[]> {
  try {
    const { data } = await (supabase as any)
      .from('portal_admin_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch { return []; }
}

async function adminSaveNote(clientId: string, body: string) {
  await (supabase as any).from('portal_admin_notes').insert({
    client_id: clientId, body, author: 'Jeff Ali',
  });
}

/* ── #10 Request document ──────────────────────────────────────────── */
async function adminRequestDocument(clientId: string, name: string, description: string) {
  await (supabase as any).from('portal_documents').insert({
    client_id: clientId, name, description,
    file_type: 'PDF', category: 'required',
    status: 'pending', requested_by: 'Jeff Ali',
  });
}

/* ── #11 CSV export helper ─────────────────────────────────────────── */
function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
}

/* ── Types ───────────────────────────────────────────────────────────── */
const ADMIN_PIN = '011491';
const ADMIN_KEY = 'hou-admin-unlocked';

/* ── Glass card helpers ──────────────────────────────────────────────── */
const ADMIN_CSS = `
  .agl{background:rgba(255,255,255,0.80)!important;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,0.90)!important;box-shadow:0 2px 20px rgba(10,10,10,0.055),inset 0 1px 0 rgba(255,255,255,0.98)!important;}
  .agl-h{transition:box-shadow .32s cubic-bezier(.22,1,.36,1),transform .32s cubic-bezier(.22,1,.36,1)!important;}
  .agl-h:hover{box-shadow:0 14px 52px rgba(10,10,10,0.11),0 4px 14px rgba(10,10,10,0.055),inset 0 1px 0 rgba(255,255,255,1)!important;transform:translateY(-3px);}
  .agl-stat{background:rgba(255,255,255,0.82)!important;backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid rgba(255,255,255,0.92)!important;box-shadow:0 3px 18px rgba(10,10,10,0.05),inset 0 1px 0 rgba(255,255,255,1)!important;transition:box-shadow .35s cubic-bezier(.22,1,.36,1),transform .35s cubic-bezier(.22,1,.36,1),border-color .35s ease!important;}
  .agl-stat:hover{box-shadow:0 22px 68px rgba(10,10,10,0.13),0 6px 20px rgba(10,10,10,0.07),inset 0 1px 0 rgba(255,255,255,1)!important;transform:translateY(-5px);border-color:rgba(157,126,63,0.28)!important;}
  .agl-urg{background:rgba(245,158,11,0.06)!important;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(245,158,11,0.38)!important;box-shadow:0 3px 20px rgba(245,158,11,0.07),inset 0 1px 0 rgba(255,255,255,0.9)!important;transition:box-shadow .35s cubic-bezier(.22,1,.36,1),transform .35s cubic-bezier(.22,1,.36,1)!important;}
  .agl-urg:hover{box-shadow:0 20px 60px rgba(245,158,11,0.14),inset 0 1px 0 rgba(255,255,255,1)!important;transform:translateY(-4px);}
  .agl-tbl tr:hover td{background-color:rgba(157,126,63,0.032)!important;transition:background-color .18s ease;}
  .agl-tbl thead tr:hover th,.agl-tbl thead tr:hover td{background-color:rgba(245,244,242,0.7)!important;}
  .agl-row:hover{background-color:rgba(157,126,63,0.04)!important;transition:background-color .18s ease;}
  .snav-item{position:relative;transition:color .22s ease,background-color .22s ease!important;}
  .snav-item::after{content:'';position:absolute;inset:0;opacity:0;background:linear-gradient(90deg,rgba(157,126,63,0.14) 0%,transparent 80%);transition:opacity .25s ease;pointer-events:none;}
  .snav-item:hover::after{opacity:1;}
  .snav-active::after{opacity:1;background:linear-gradient(90deg,rgba(157,126,63,0.20) 0%,transparent 80%)!important;}
  .status-pill{border-radius:9999px!important;padding:2px 10px!important;font-size:8px!important;letter-spacing:.18em!important;font-weight:700!important;}
`;

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
    <span className="status-pill whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color, display: 'inline-block' }}>
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

  const navigate = useNavigate();

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
    setPortfolioCount(finance.portfolioCount);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  /* ── Portfolio count (for analytics) ── */
  const [portfolioCount, setPortfolioCount] = useState(0);

  /* ── Client detail state ── */
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSubTab, setClientSubTab] = useState<'brief' | 'messages' | 'docs' | 'meetings' | 'notes' | 'milestones'>('brief');
  const [replyDraft, setReplyDraft] = useState('');

  /* ── #9 Admin notes ── */
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  /* ── #10 Request document ── */
  const [reqDocOpen, setReqDocOpen] = useState(false);
  const [reqDocName, setReqDocName] = useState('');
  const [reqDocDesc, setReqDocDesc] = useState('');
  const [reqDocSaving, setReqDocSaving] = useState(false);

  /* ── #8 Client search/filter ── */
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');

  /* ── #12 Meetings view ── */
  const [meetingsView, setMeetingsView] = useState<'list' | 'calendar'>('list');

  /* ── #15 Change Orders ── */
  const [coOpen, setCoOpen] = useState(false);
  const [coNumber, setCoNumber] = useState('');
  const [coDesc, setCoDesc] = useState('');
  const [coAmount, setCoAmount] = useState('');
  const [coSaving, setCoSaving] = useState(false);

  /* ── Leads state ── */
  const [leadsSubTab, setLeadsSubTab] = useState<'startproject' | 'contact'>('startproject');
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  /* ── Finance entity filter ── */
  const [finEntityTab, setFinEntityTab] = useState<string>('all');

  /* ── Mobile nav ── */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);


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

  /* ── #9 Load notes when client changes ── */
  useEffect(() => {
    if (!selectedClientId) { setAdminNotes([]); return; }
    loadAdminNotes(selectedClientId).then(setAdminNotes);
  }, [selectedClientId]);

  /* ── Client detail actions ── */
  const handleSendReply = async () => {
    if (!selectedClientId || !replyDraft.trim()) return;
    await adminSendMessage(selectedClientId, replyDraft.trim());
    await logAdminAction('message_sent', selectedClientId, replyDraft.trim().slice(0, 80));
    setReplyDraft('');
    await refreshData();
  };

  /* ── #9 Save note ── */
  const handleSaveNote = async () => {
    if (!selectedClientId || !noteDraft.trim()) return;
    setNoteSaving(true);
    await adminSaveNote(selectedClientId, noteDraft.trim());
    await logAdminAction('note_added', selectedClientId, noteDraft.trim().slice(0, 80));
    setNoteDraft('');
    const notes = await loadAdminNotes(selectedClientId);
    setAdminNotes(notes);
    setNoteSaving(false);
  };

  /* ── #15 Create Change Order ── */
  const handleCreateCO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !coDesc.trim() || !coAmount) return;
    setCoSaving(true);
    try {
      await (supabase as any).from('change_orders').insert({
        client_id: selectedClientId,
        number: coNumber.trim() || null,
        description: coDesc.trim(),
        amount: parseFloat(coAmount),
        status: 'pending',
        created_by: 'Jeff Ali',
      });
      await logAdminAction('change_order_created', selectedClientId, coDesc.trim().slice(0, 80));
      await adminSendMessage(selectedClientId, `A change order has been issued: "${coDesc.trim()}" for $${parseFloat(coAmount).toLocaleString()}. Please review in your payments portal. — Jeff Ali`);
      toast({ title: 'Change order created and client notified' });
      setCoDesc(''); setCoNumber(''); setCoAmount(''); setCoOpen(false);
    } catch { toast({ title: 'Failed to create change order', description: 'Please try again.' }); }
    setCoSaving(false);
  };

  /* ── #10 Request document ── */
  const handleRequestDoc = async () => {
    if (!selectedClientId || !reqDocName.trim()) return;
    setReqDocSaving(true);
    await adminRequestDocument(selectedClientId, reqDocName.trim(), reqDocDesc.trim());
    await logAdminAction('doc_requested', selectedClientId, reqDocName.trim());
    setReqDocName(''); setReqDocDesc(''); setReqDocOpen(false);
    setReqDocSaving(false);
    await refreshData();
  };

  /* ── #13 Doc actions with auto-message ── */
  const handleDocApprove = async (clientId: string, docId: string, docName: string) => {
    await adminUpdateDocStatus(clientId, docId, 'approved');
    await adminSendMessage(clientId, `Your document "${docName}" has been reviewed and approved. — Jeff Ali`);
    await logAdminAction('doc_approved', clientId, docName);
    await refreshData();
  };
  const handleDocReject = async (clientId: string, docId: string, docName: string) => {
    await adminUpdateDocStatus(clientId, docId, 'rejected');
    await adminSendMessage(clientId, `Your document "${docName}" requires revision. Please re-upload with the requested changes. — Jeff Ali`);
    await logAdminAction('doc_rejected', clientId, docName);
    await refreshData();
  };

  /* ── #13 Meeting actions with auto-message ── */
  const handleMeetingConfirm = async (clientId: string, meetId: string, meetType: string, date: string, time: string) => {
    await adminUpdateMeetingStatus(clientId, meetId, 'confirmed');
    await adminSendMessage(clientId, `Your ${meetType} on ${date} at ${time} has been confirmed. Looking forward to it! — Jeff Ali`);
    await logAdminAction('meeting_confirmed', clientId, `${meetType} on ${date}`);
    await refreshData();
  };
  const handleMeetingCancel = async (clientId: string, meetId: string, meetType: string) => {
    await adminUpdateMeetingStatus(clientId, meetId, 'cancelled');
    await logAdminAction('meeting_cancelled', clientId, meetType);
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
  const OVERVIEW_STATS: { label: string; value: number; icon: React.ComponentType<any>; color: string; sub: string; urgent?: boolean; navKey: AdminTab }[] = [
    { label: 'Pending Approvals', value: pendingApprovals.length,    icon: ShieldCheck,   color: '#f59e0b', sub: 'Accounts awaiting review',  urgent: true, navKey: 'approvals' },
    { label: 'Active Clients',    value: approvedClients.length,     icon: Users,         color: '#3b82f6', sub: 'Approved portal accounts',               navKey: 'clients'   },
    { label: 'Project Briefs',    value: Object.keys(briefs).length, icon: ClipboardList, color: AC,        sub: 'Submitted via portal',                   navKey: 'clients'   },
    { label: 'Inbound Leads',     value: allLeads,                   icon: Inbox,         color: '#10b981', sub: 'Website form submissions',               navKey: 'leads'     },
    { label: 'Pending Documents', value: pendingDocs.length,         icon: FileCheck,     color: '#8b5cf6', sub: 'Awaiting review',                        navKey: 'documents' },
    { label: 'Meeting Requests',  value: pendingMeets.length,        icon: Calendar,      color: '#ec4899', sub: 'Awaiting confirmation',                  navKey: 'meetings'  },
  ];

  /* ════════ DASHBOARD ════════ */
  return (
    <div className="flex" style={{ background: 'linear-gradient(160deg,#FAF9F7 0%,#EDE9E2 52%,#F5F4F1 100%)', height: '100vh', overflow: 'hidden' }}>
      <style>{ADMIN_CSS}</style>

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
              className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-left snav-item${tab === key ? ' snav-active' : ''}`}
              style={{ color: tab === key ? AC : urgent ? 'rgba(255,200,100,0.8)' : 'rgba(255,255,255,0.48)', backgroundColor: 'transparent', borderLeft: tab === key ? `2px solid ${AC}` : '2px solid transparent', outline: 'none' }}>
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold flex-1">{label}</span>
              {badge ? (
                <span className="text-[7.5px] font-black px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: urgent ? 'rgba(245,158,11,0.28)' : 'rgba(157,126,63,0.22)', color: urgent ? '#f59e0b' : AC, letterSpacing: '0.06em' }}>
                  {badge}
                </span>
              ) : null}
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

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[240px] flex flex-col"
            style={{ backgroundColor: B, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-px h-6" style={{ backgroundColor: AC }} />
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
                  <div className="text-[7px] uppercase tracking-[0.38em]" style={{ color: AC }}>Admin Dashboard</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              {NAV_ITEMS.map(({ key, label, icon: Icon, badge, urgent }) => (
                <button key={key} onClick={() => { setTab(key); setSelectedClientId(null); setMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-left snav-item${tab === key ? ' snav-active' : ''}`}
                  style={{ color: tab === key ? AC : urgent ? 'rgba(255,200,100,0.8)' : 'rgba(255,255,255,0.48)', backgroundColor: 'transparent', borderLeft: tab === key ? `2px solid ${AC}` : '2px solid transparent', outline: 'none' }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold flex-1">{label}</span>
                  {badge ? <span className="text-[7.5px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: urgent ? 'rgba(245,158,11,0.28)' : 'rgba(157,126,63,0.22)', color: urgent ? '#f59e0b' : AC }}>{badge}</span> : null}
                </button>
              ))}
            </nav>
            <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 mt-3 text-[11px] font-semibold"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
                <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} /> Lock Dashboard
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-[240px] flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(26px)', WebkitBackdropFilter: 'blur(26px)', borderBottom: '1px solid rgba(232,228,222,0.65)', boxShadow: '0 1px 20px rgba(10,10,10,0.07), inset 0 -1px 0 rgba(255,255,255,0.75)' }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden flex items-center justify-center w-8 h-8 shrink-0"
              style={{ border: `1px solid ${G200}`, color: G500 }}
              onClick={() => setMobileNavOpen(true)}>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="0" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
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
          <div className="flex items-center gap-2">
            <button onClick={refreshData} className="hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-semibold px-3 py-2 transition-all"
              style={{ border: `1px solid ${G200}`, color: G500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.color = G500; }}>
              <RefreshCw className="w-3 h-3" strokeWidth={2} /> Refresh
            </button>
            <button onClick={refreshData} className="sm:hidden flex items-center justify-center w-8 h-8 shrink-0 transition-all"
              style={{ border: `1px solid ${G200}`, color: G500 }}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <Link to="/finance" className="hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2 transition-opacity hover:opacity-85"
              style={{ backgroundColor: AC, color: W }}>
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
            <Link to="/finance" className="sm:hidden flex items-center justify-center w-8 h-8 shrink-0 transition-opacity hover:opacity-85"
              style={{ backgroundColor: AC, color: W }}>
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {tab === 'map' && (
          <div className="flex-1" style={{ overflow: 'hidden' }}>
            <ClientMap />
          </div>
        )}

        {tab !== 'map' && <div className="px-4 md:px-6 py-5 md:py-7">

          {/* ══════ OVERVIEW ══════ */}
          {tab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
                {OVERVIEW_STATS.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className={`p-5 cursor-pointer ${s.urgent && s.value > 0 ? 'agl-urg' : 'agl-stat'}`}
                      onClick={() => setTab(s.navKey)}>
                      <div className="w-9 h-9 flex items-center justify-center mb-4 rounded-lg" style={{ backgroundColor: `${s.color}14`, boxShadow: `0 2px 8px ${s.color}22` }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: s.color }} strokeWidth={1.5} />
                      </div>
                      <div className="text-[28px] font-black mb-0.5 leading-none" style={{ color: s.urgent && s.value > 0 ? '#f59e0b' : B, fontFamily: SERIF }}>{s.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] mb-0.5 mt-1.5" style={{ color: B }}>{s.label}</div>
                      <div className="text-[10px] font-light" style={{ color: G500 }}>{s.sub}</div>
                      {s.urgent && s.value > 0 && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f59e0b' }} />
                          <span className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: '#f59e0b' }}>Action Required</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pending approvals alert */}
              {pendingApprovals.length > 0 && (
                <div className="mb-5 p-5 flex items-center gap-5 agl-urg" style={{ borderRadius: 0 }}>
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
                <div className="mb-7 agl">
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
              <div className="agl agl-h">
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Recent Active Clients</div>
                  <button onClick={() => setTab('clients')} className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: G500 }}>View All →</button>
                </div>
                {approvedClients.slice(-5).reverse().map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 cursor-pointer agl-row"
                    style={{ borderBottom: i < Math.min(approvedClients.length, 5) - 1 ? '1px solid rgba(232,228,222,0.5)' : 'none' }}
                    onClick={() => { setTab('clients'); setSelectedClientId(c.id); setClientSubTab('brief'); }}>
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
                  <div key={s.label} className="p-4 agl-stat">
                    <div className="text-[24px] font-black leading-none" style={{ color: s.color, fontFamily: SERIF }}>{s.value}</div>
                    <div className="text-[9px] uppercase tracking-[0.2em] font-bold mt-2" style={{ color: B }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pending applications */}
              <div className="mb-6 agl">
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
              <div className="agl agl-tbl">
                <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(232,228,222,0.6)' }}>
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
          {tab === 'clients' && !selectedClientId && (() => {
            const briefStatuses = ['all', 'submitted', 'reviewing', 'consultation_scheduled', 'in_progress', 'no brief'];
            const filteredClients = approvedClients.filter((c: any) => {
              const q = clientSearch.toLowerCase();
              const matchesSearch = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
              const brief = briefs[c.id];
              const bStatus = brief ? brief.status : 'no brief';
              const matchesStatus = clientStatusFilter === 'all' || bStatus === clientStatusFilter;
              return matchesSearch && matchesStatus;
            });
            return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="agl agl-tbl">
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(232,228,222,0.6)' }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold flex-1" style={{ color: AC }}>
                    Active Portal Clients ({filteredClients.length}{filteredClients.length !== approvedClients.length ? ` of ${approvedClients.length}` : ''})
                  </div>
                  {/* #8 Search */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 w-3 h-3 pointer-events-none" style={{ color: G500 }} strokeWidth={2} />
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="text-[11px] outline-none"
                      style={{ paddingLeft: 26, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: `1px solid ${G200}`, color: B, width: 180, backgroundColor: W }} />
                  </div>
                  {/* #8 Status filter */}
                  <select value={clientStatusFilter} onChange={e => setClientStatusFilter(e.target.value)}
                    className="text-[10px] outline-none"
                    style={{ padding: '6px 10px', border: `1px solid ${G200}`, color: G500, backgroundColor: W }}>
                    {briefStatuses.map(s => (
                      <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {/* #11 Export */}
                  <button onClick={() => exportCSV('clients.csv',
                    ['Name', 'Email', 'Phone', 'Joined', 'Brief Status', 'Docs', 'Messages'],
                    approvedClients.map((c: any) => {
                      const brief = briefs[c.id];
                      return [c.name, c.email, c.phone || '', new Date(c.createdAt).toLocaleDateString(), brief?.status || 'no brief', (allDocs[c.id] ?? []).length, (allMsgs[c.id] ?? []).length];
                    }))}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 transition-opacity hover:opacity-75"
                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                    <Download className="w-3 h-3" strokeWidth={2} /> Export CSV
                  </button>
                  {pendingApprovals.length > 0 && (
                    <button onClick={() => setTab('approvals')} className="text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 flex items-center gap-1.5"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                      {pendingApprovals.length} pending
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
                      {filteredClients.map((c: any, i: number) => {
                        const brief = briefs[c.id];
                        const msgs = (allMsgs[c.id] ?? []).length;
                        const docs = (allDocs[c.id] ?? []).length;
                        return (
                          <tr key={c.id} className="cursor-pointer agl-row"
                            style={{ borderBottom: i < approvedClients.length - 1 ? '1px solid rgba(232,228,222,0.5)' : 'none' }}
                            onClick={() => { setSelectedClientId(c.id); setClientSubTab('brief'); }}>
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
                      {filteredClients.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>
                          {approvedClients.length === 0
                            ? <><span>No approved clients yet. </span><button onClick={() => setTab('approvals')} className="underline" style={{ color: AC }}>Review pending applications →</button></>
                            : 'No clients match your search.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
            );
          })()}

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
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 mb-5 agl">
                  <div className="flex items-center gap-3 sm:contents">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-[14px] sm:text-[16px] font-black shrink-0"
                      style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                      {client.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 sm:flex-1">
                      <div className="text-[16px] sm:text-[18px] font-bold mb-0.5" style={{ color: B }}>{client.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] font-light" style={{ color: G500 }}>
                        <span>{client.email}</span>
                        {client.phone && <span>{client.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center sm:shrink-0">
                    <span className="text-[9px] px-2 py-1 font-bold uppercase tracking-[0.14em]" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>
                      {messages.length} msgs
                    </span>
                    <span className="text-[9px] px-2 py-1 font-bold uppercase tracking-[0.14em]" style={{ backgroundColor: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
                      {docs.length} docs
                    </span>
                    <span className="text-[9px] px-2 py-1 font-bold uppercase tracking-[0.14em]" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                      {meets.length} meets
                    </span>
                    <button
                      onClick={() => navigate('/invoices/new', { state: { clientName: client.name, clientEmail: client.email } })}
                      className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] font-bold px-3 py-2 transition-opacity hover:opacity-75"
                      style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, border: `1px solid rgba(157,126,63,0.3)` }}>
                      <Receipt className="w-3 h-3" strokeWidth={2} /> Invoice
                    </button>
                    <button
                      onClick={() => setCoOpen(true)}
                      className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] font-bold px-3 py-2 transition-opacity hover:opacity-75"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <FilePlus className="w-3 h-3" strokeWidth={2} /> Change Order
                    </button>
                  </div>
                </div>

                {/* #15 Change Order dialog */}
                {coOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="w-full max-w-md mx-4 p-6 agl" style={{ boxShadow: '0 24px 80px rgba(10,10,10,0.22)!important' }}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: B }}>Create Change Order</div>
                        <button onClick={() => setCoOpen(false)} className="text-xs" style={{ color: G500 }}>✕</button>
                      </div>
                      <form onSubmit={handleCreateCO} className="space-y-4">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: G500 }}>CO Number (optional)</div>
                          <input
                            type="text" placeholder="e.g. CO-001"
                            value={coNumber} onChange={e => setCoNumber(e.target.value)}
                            className="w-full border px-3 h-10 text-sm font-mono rounded-none outline-none"
                            style={{ borderColor: G200, color: B }}
                          />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: G500 }}>Description *</div>
                          <textarea
                            required rows={3} placeholder="Scope change description…"
                            value={coDesc} onChange={e => setCoDesc(e.target.value)}
                            className="w-full border px-3 py-2 text-sm rounded-none outline-none resize-none"
                            style={{ borderColor: G200, color: B }}
                          />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5" style={{ color: G500 }}>Amount (USD) *</div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: G500 }}>$</span>
                            <input
                              type="number" step="0.01" required placeholder="0.00"
                              value={coAmount} onChange={e => setCoAmount(e.target.value)}
                              className="w-full border pl-7 pr-3 h-10 text-sm font-mono rounded-none outline-none text-right"
                              style={{ borderColor: G200, color: B }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button type="button" onClick={() => setCoOpen(false)} className="flex-1 h-10 text-[10px] uppercase tracking-[0.2em] font-bold border" style={{ borderColor: G200, color: G500 }}>Cancel</button>
                          <button type="submit" disabled={coSaving || !coDesc.trim() || !coAmount} className="flex-1 h-10 text-[10px] uppercase tracking-[0.2em] font-bold transition-opacity hover:opacity-80" style={{ backgroundColor: '#f59e0b', color: W }}>
                            {coSaving ? 'Saving…' : 'Issue Change Order'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub-tab pills */}
                <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
                  {([['brief', 'Brief'], ['messages', 'Msgs'], ['docs', 'Docs'], ['meetings', 'Meets'], ['notes', 'Notes'], ['milestones', 'Milestones']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setClientSubTab(k)}
                      className="text-[9px] uppercase tracking-[0.22em] font-bold px-3 md:px-4 py-2 transition-all shrink-0"
                      style={{
                        backgroundColor: clientSubTab === k ? B : 'rgba(255,255,255,0.7)',
                        color: clientSubTab === k ? W : G500,
                        border: clientSubTab === k ? `1px solid ${B}` : '1px solid rgba(232,228,222,0.7)',
                        backdropFilter: clientSubTab === k ? 'none' : 'blur(10px)',
                        boxShadow: clientSubTab === k ? '0 2px 8px rgba(10,10,10,0.15)' : '0 1px 4px rgba(10,10,10,0.04)',
                      }}>
                      {l}{k === 'notes' && adminNotes.length > 0 ? ` (${adminNotes.length})` : ''}
                    </button>
                  ))}
                </div>

                {/* Brief sub-tab */}
                {clientSubTab === 'brief' && (
                  <div className="agl">
                    {brief ? (
                      <div>
                        {/* Dossier header */}
                        <div className="px-6 py-5 flex items-start justify-between gap-4"
                          style={{ borderBottom: `1px solid ${G200}` }}>
                          <div>
                            <div className="text-[7px] uppercase tracking-[0.34em] font-bold mb-1.5" style={{ color: G500 }}>
                              Project Brief
                            </div>
                            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.35rem', color: B, lineHeight: 1.2 }}>
                              {brief.type || 'Untitled Project'}
                            </div>
                            {brief.submittedAt && (
                              <div className="text-[9px] font-light mt-1" style={{ color: G500 }}>
                                Submitted {new Date(brief.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                          <StatusBadge label={brief.status} style={briefStatusColor(brief.status)} />
                        </div>

                        {/* Two-column: Project Details | Investment & Timeline */}
                        <div className="grid md:grid-cols-2" style={{ borderBottom: `1px solid ${G200}` }}>
                          <div className="p-6" style={{ borderBottom: `1px solid ${G200}`, borderRight: '0' }}>
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: AC }}>
                              Project Details
                            </div>
                            <div className="space-y-4">
                              {([
                                ['Location', brief.location],
                                ['Scale', brief.sqft],
                                ['Bedrooms', brief.bedrooms],
                                ['Bathrooms', brief.bathrooms],
                                ['Floors', brief.floors],
                              ] as [string, string][]).filter(([, v]) => v).map(([l, v]) => (
                                <div key={l}>
                                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-0.5" style={{ color: G500 }}>{l}</div>
                                  <div className="text-[12px] font-semibold" style={{ color: B }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-6" style={{ borderBottom: `1px solid ${G200}` }}>
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: AC }}>
                              Investment & Timeline
                            </div>
                            <div className="space-y-4 mb-5">
                              {([
                                ['Budget', brief.budget],
                                ['Timeline', brief.timeline],
                              ] as [string, string][]).filter(([, v]) => v).map(([l, v]) => (
                                <div key={l}>
                                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-0.5" style={{ color: G500 }}>{l}</div>
                                  <div className="text-[12px] font-semibold" style={{ color: B }}>{v}</div>
                                </div>
                              ))}
                            </div>

                            {(brief.style ?? []).length > 0 && (
                              <div>
                                <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G500 }}>
                                  Architectural Style
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(brief.style ?? []).map((s: string) => (
                                    <span key={s} className="text-[8px] px-2.5 py-1 font-semibold"
                                      style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: '1px solid rgba(157,126,63,0.22)' }}>
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Vision notes */}
                        {brief.description && (
                          <div className="px-6 py-5" style={{ backgroundColor: G50, borderBottom: `1px solid ${G200}` }}>
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: G500 }}>
                              Vision Notes
                            </div>
                            <p className="font-light leading-relaxed"
                              style={{ color: B, fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.9rem' }}>
                              &ldquo;{brief.description}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Status workflow */}
                        <div className="px-6 py-5">
                          <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: G500 }}>
                            Workflow Status
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {BRIEF_STATUSES.map(s => {
                              const c = briefStatusColor(s);
                              const isActive = brief.status === s;
                              return (
                                <button key={s}
                                  onClick={async () => { await adminUpdateBriefStatus(selectedClientId, s); await refreshData(); }}
                                  className="text-[8px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 transition-all"
                                  style={{
                                    backgroundColor: isActive ? c.color : 'transparent',
                                    color: isActive ? W : c.color,
                                    border: `1px solid ${c.color}`,
                                    opacity: isActive ? 1 : 0.72,
                                  }}>
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
                  <div className="agl">
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
                  <div className="agl">
                    {/* #10 Request Document header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${G200}` }}>
                      <span className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                      <button onClick={() => { setReqDocOpen(o => !o); setReqDocName(''); setReqDocDesc(''); }}
                        className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 transition-opacity hover:opacity-75"
                        style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                        <FilePlus className="w-3 h-3" strokeWidth={2} /> Request Document
                      </button>
                    </div>
                    {/* Request doc inline form */}
                    {reqDocOpen && (
                      <div className="px-5 py-4 flex flex-wrap items-end gap-3" style={{ backgroundColor: 'rgba(157,126,63,0.03)', borderBottom: `1px solid ${G200}` }}>
                        <div className="flex-1 min-w-[160px]">
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1" style={{ color: G500 }}>Document Name *</div>
                          <input value={reqDocName} onChange={e => setReqDocName(e.target.value)}
                            placeholder="e.g. Updated Insurance Certificate"
                            className="w-full text-[12px] outline-none"
                            style={{ padding: '8px 10px', border: `1px solid ${G200}`, color: B }} />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1" style={{ color: G500 }}>Instructions (optional)</div>
                          <input value={reqDocDesc} onChange={e => setReqDocDesc(e.target.value)}
                            placeholder="What to include or how to format"
                            className="w-full text-[12px] outline-none"
                            style={{ padding: '8px 10px', border: `1px solid ${G200}`, color: B }} />
                        </div>
                        <button onClick={handleRequestDoc} disabled={reqDocSaving || !reqDocName.trim()}
                          className="text-[9px] uppercase tracking-[0.18em] font-bold px-4 py-2.5 transition-opacity hover:opacity-85 disabled:opacity-40"
                          style={{ backgroundColor: B, color: W }}>
                          {reqDocSaving ? 'Sending…' : 'Send Request'}
                        </button>
                        <button onClick={() => setReqDocOpen(false)} className="text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-2.5" style={{ color: G500 }}>Cancel</button>
                      </div>
                    )}
                    {docs.map((d: any, i: number) => (
                      <div key={d.id} className="flex items-center gap-4 px-5 py-4"
                        style={{ borderBottom: i < docs.length - 1 ? `1px solid ${G200}` : 'none' }}>
                        <FileText className="w-4 h-4 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold" style={{ color: B }}>{d.name}</div>
                          <div className="text-[10px] font-light" style={{ color: G500 }}>{d.fileType} · {d.category} {d.uploadedAt ? `· Uploaded ${new Date(d.uploadedAt).toLocaleDateString()}` : ''}</div>
                          {d.description && <div className="text-[10px] font-light mt-0.5 italic" style={{ color: G500 }}>{d.description}</div>}
                        </div>
                        <StatusBadge label={d.status} style={docStatusColor(d.status)} />
                        <div className="flex gap-2 ml-2 flex-wrap">
                          {d.file_url && (
                            <button onClick={() => viewDocument(d.file_url, toast)}
                              className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-opacity hover:opacity-75 cursor-pointer"
                              style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                              <Download className="w-3 h-3" strokeWidth={2} /> View
                            </button>
                          )}
                          {d.status === 'uploaded' && (
                            <>
                              <button onClick={() => handleDocApprove(selectedClientId!, d.id, d.name)}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Approve
                              </button>
                              <button onClick={() => handleDocReject(selectedClientId!, d.id, d.name)}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <XCircle className="w-3 h-3" strokeWidth={2} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {docs.length === 0 && !reqDocOpen && <div className="px-5 py-14 text-center text-[12px] font-light" style={{ color: G500 }}>No documents yet. Use "Request Document" to ask the client to upload something.</div>}
                  </div>
                )}

                {/* Meetings sub-tab */}
                {clientSubTab === 'meetings' && (
                  <div className="agl">
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
                              <button onClick={() => handleMeetingConfirm(selectedClientId!, m.id, m.type, m.date, m.time)}
                                className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                                style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Confirm
                              </button>
                              <button onClick={() => handleMeetingCancel(selectedClientId!, m.id, m.type)}
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

                {/* Milestones sub-tab */}
                {clientSubTab === 'milestones' && (
                  <MilestoneManager clientId={selectedClientId} />
                )}

                {/* Notes sub-tab (#9) */}
                {clientSubTab === 'notes' && (
                  <div className="agl">
                    <div className="px-5 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
                      <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: G500 }}>Internal note — visible to admin only</div>
                      <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                        placeholder="e.g. Called 7/11 — prefers morning meetings, budget may flex up. HOA approval still pending."
                        rows={3}
                        className="w-full text-[12px] font-light outline-none resize-none"
                        style={{ padding: '10px 13px', border: `1px solid ${G200}`, color: B }}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNote(); }}
                      />
                      <div className="flex justify-end mt-2">
                        <button onClick={handleSaveNote} disabled={noteSaving || !noteDraft.trim()}
                          className="text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2 transition-opacity disabled:opacity-40"
                          style={{ backgroundColor: B, color: W }}>
                          {noteSaving ? 'Saving…' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                    {adminNotes.length === 0 ? (
                      <div className="px-5 py-10 text-center text-[12px] font-light" style={{ color: G500 }}>No notes yet. Add internal notes about this client above.</div>
                    ) : (
                      adminNotes.map((n: any) => (
                        <div key={n.id} className="px-5 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
                          <div className="flex items-center gap-3 mb-1.5">
                            <StickyNote className="w-3 h-3 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                            <span className="text-[9px] font-bold" style={{ color: AC }}>{n.author ?? 'Jeff Ali'}</span>
                            <span className="text-[9px] font-light" style={{ color: G500 }}>
                              {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-[12px] font-light leading-relaxed" style={{ color: B }}>{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* ══════ LEADS ══════ */}
          {tab === 'leads' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              {/* Sub-tab toggle + export */}
              <div className="flex items-center gap-1 mb-5">
                {([['startproject', `Start Project (${startBriefs.length})`], ['contact', `Contact Forms (${contactForms.length})`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setLeadsSubTab(k); setExpandedLeadId(null); }}
                    className="text-[9px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 transition-all"
                    style={{
                      backgroundColor: leadsSubTab === k ? B : 'rgba(255,255,255,0.75)',
                      color: leadsSubTab === k ? W : G500,
                      border: leadsSubTab === k ? `1px solid ${B}` : '1px solid rgba(232,228,222,0.7)',
                      backdropFilter: leadsSubTab === k ? 'none' : 'blur(10px)',
                      boxShadow: leadsSubTab === k ? '0 2px 8px rgba(10,10,10,0.15)' : '0 1px 4px rgba(10,10,10,0.04)',
                    }}>
                    {l}
                  </button>
                ))}
                <div className="ml-auto">
                  <button onClick={() => {
                    const leads = leadsSubTab === 'startproject' ? startBriefs : contactForms;
                    exportCSV(`leads-${leadsSubTab}.csv`,
                      ['Name', 'Email', 'Phone', 'Type/Subject', 'Budget', 'Date'],
                      leads.map((l: any) => [l.name, l.email, l.phone || '', l.type || l.subject || '', l.budget || '', new Date(l.submittedAt || l.created_at).toLocaleDateString()])
                    );
                  }}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-2 transition-opacity hover:opacity-75"
                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                    <Download className="w-3 h-3" strokeWidth={2} /> Export CSV
                  </button>
                </div>
              </div>

              {leadsSubTab === 'startproject' && (() => {
                const SCOPE_LBL: Record<string, string> = {
                  new_home: 'New Home Construction', renovation: 'Major Renovation', addition: 'Home Addition',
                  kitchen_bath: 'Kitchen & Bath Remodel', outdoor: 'Outdoor & Landscaping', other_res: 'Other Residential',
                  office: 'Office Building', retail: 'Retail & Mixed-Use', hospitality: 'Hospitality & Restaurant',
                  industrial: 'Industrial & Warehouse', medical: 'Medical & Education', other_comm: 'Other Commercial',
                };
                const SQFT_LBL: Record<string, string> = {
                  under_1500: 'Under 1,500 sq ft', '1500_3000': '1,500–3,000 sq ft', '3000_5000': '3,000–5,000 sq ft',
                  '5000_10k': '5,000–10,000 sq ft', '10k_25k': '10,000–25,000 sq ft', over_25k: '25,000+ sq ft',
                };
                const BUDGET_LBL: Record<string, string> = {
                  under_250: 'Under $250K', '250_500': '$250K–$500K', '500_1m': '$500K–$1M',
                  '1m_2.5m': '$1M–$2.5M', '2.5m_5m': '$2.5M–$5M', over_5m: '$5M+',
                };
                const TIMELINE_LBL: Record<string, string> = {
                  asap: 'As Soon as Possible', '3_6mo': '3–6 Months', '6_12mo': '6–12 Months Out', '12plus': '12+ Months Out',
                };
                const TIMELINE_URGENCY: Record<string, { color: string; bg: string }> = {
                  asap:   { color: '#dc2626', bg: 'rgba(220,38,38,0.07)' },
                  '3_6mo':{ color: '#d97706', bg: 'rgba(217,119,6,0.07)' },
                  '6_12mo':{ color: '#2563eb', bg: 'rgba(37,99,235,0.07)' },
                  '12plus':{ color: G500,      bg: 'rgba(0,0,0,0.04)' },
                };
                const fmtScope = (raw: string) =>
                  (raw || '').split(',').map(s => SCOPE_LBL[s.trim()] || s.trim().replace(/_/g, ' ')).filter(Boolean).join('  ·  ');
                const fmtDate = (d: string) =>
                  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

                return (
                  <div className="agl">
                    {startBriefs.length === 0 ? (
                      <div className="px-6 py-16 text-center">
                        <Inbox className="w-9 h-9 mx-auto mb-4" style={{ color: G200 }} strokeWidth={1} />
                        <div className="text-[13px] font-medium mb-1" style={{ color: B }}>No project briefs yet</div>
                        <p className="text-[11px] font-light" style={{ color: G500 }}>Submissions from the Start Project form will appear here.</p>
                      </div>
                    ) : startBriefs.map((s: any, idx: number) => {
                      const initials = (s.name || 'SP').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                      const urgency = TIMELINE_URGENCY[s.start_timeline] ?? { color: G500, bg: 'rgba(0,0,0,0.04)' };
                      const isExpanded = expandedLeadId === s.id;
                      const scopeLabel = fmtScope(s.scope || '');
                      const budgetLabel = BUDGET_LBL[s.budget] || (s.budget || '—');
                      const timelineLabel = TIMELINE_LBL[s.start_timeline] || (s.start_timeline || '—');
                      const priorities: string[] = Array.isArray(s.priorities) ? s.priorities : [];

                      return (
                        <div key={s.id} style={{ borderBottom: idx < startBriefs.length - 1 ? `1px solid ${G200}` : 'none' }}>

                          {/* ── Collapsed row ── */}
                          <div
                            className={`cursor-pointer agl-row`}
                            onClick={() => setExpandedLeadId(isExpanded ? null : s.id)}
                            style={{ padding: '14px 20px', backgroundColor: isExpanded ? 'rgba(157,126,63,0.03)' : 'transparent' }}>

                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              <div className="flex items-center justify-center shrink-0"
                                style={{ width: 36, height: 36, backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontSize: 10, fontWeight: 800, fontFamily: SERIF }}>
                                {initials}
                              </div>

                              {/* Name + meta */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13px] font-bold" style={{ color: B }}>{s.name || 'Anonymous'}</span>
                                  <span className="text-[9px] uppercase tracking-[0.16em] font-bold px-1.5 py-0.5"
                                    style={{ backgroundColor: s.type === 'commercial' ? 'rgba(37,99,235,0.08)' : 'rgba(157,126,63,0.1)', color: s.type === 'commercial' ? '#2563eb' : AC }}>
                                    {s.type === 'commercial' ? 'Commercial' : 'Residential'}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5"
                                    style={{ backgroundColor: urgency.bg, color: urgency.color }}>
                                    {timelineLabel}
                                  </span>
                                </div>
                                <div className="text-[11px] font-light mt-0.5 truncate" style={{ color: G500 }}>
                                  {s.email}{s.phone ? ` · ${s.phone}` : ''}
                                  {scopeLabel ? ` · ${scopeLabel}` : ''}
                                </div>
                              </div>

                              {/* Right: budget + date + chevron */}
                              <div className="flex items-center gap-4 shrink-0">
                                {budgetLabel !== '—' && (
                                  <div className="hidden sm:block text-right">
                                    <div className="text-[8px] uppercase tracking-[0.24em] font-bold mb-0.5" style={{ color: G500 }}>Budget</div>
                                    <div className="text-[12px] font-bold" style={{ color: B }}>{budgetLabel}</div>
                                  </div>
                                )}
                                <div className="text-right">
                                  <div className="text-[8px] uppercase tracking-[0.24em] font-bold mb-0.5" style={{ color: G500 }}>Submitted</div>
                                  <div className="text-[11px] font-medium" style={{ color: B }}>{fmtDate(s.submitted_at || s.submittedAt)}</div>
                                </div>
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4" style={{ color: G500 }} />
                                  : <ChevronRight className="w-4 h-4" style={{ color: G500 }} />}
                              </div>
                            </div>
                          </div>

                          {/* ── Expanded dossier ── */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                style={{ overflow: 'hidden' }}>
                                <div style={{ borderTop: `1px solid ${G200}` }}>

                                  {/* Contact strip */}
                                  <div style={{ padding: '12px 20px', backgroundColor: 'rgba(157,126,63,0.03)', borderBottom: `1px solid ${G200}`, display: 'flex', flexWrap: 'wrap', gap: '12px 28px' }}>
                                    <div>
                                      <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1" style={{ color: G500 }}>Email</div>
                                      <a href={`mailto:${s.email}`} style={{ fontSize: 12, fontWeight: 500, color: AC, textDecoration: 'none' }}>{s.email}</a>
                                    </div>
                                    {s.phone && (
                                      <div>
                                        <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1" style={{ color: G500 }}>Phone</div>
                                        <a href={`tel:${s.phone}`} style={{ fontSize: 12, fontWeight: 500, color: B, textDecoration: 'none' }}>{s.phone}</a>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1" style={{ color: G500 }}>Submitted</div>
                                      <div style={{ fontSize: 12, fontWeight: 500, color: B }}>{fmtDate(s.submitted_at || s.submittedAt)}</div>
                                    </div>
                                  </div>

                                  {/* Two-column detail grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0" style={{ borderBottom: `1px solid ${G200}` }}>

                                    {/* Left: Project details */}
                                    <div style={{ padding: '18px 20px', borderRight: `1px solid ${G200}` }}>
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-4" style={{ color: G500 }}>Project Details</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {[
                                          ['Project Type',  s.type === 'commercial' ? 'Commercial' : 'Residential'],
                                          ['Scope of Work', fmtScope(s.scope || '') || '—'],
                                          ['Square Footage', SQFT_LBL[s.sqft] || (s.sqft?.replace(/_/g, ' ') || '—')],
                                          ['Location',      s.location || '—'],
                                        ].map(([l, v]) => (
                                          <div key={l}>
                                            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: G500, marginBottom: 2 }}>{l}</div>
                                            <div style={{ fontSize: 12.5, fontWeight: 500, color: B, lineHeight: 1.4 }}>{v}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Right: Investment & timeline */}
                                    <div style={{ padding: '18px 20px' }}>
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-4" style={{ color: G500 }}>Investment & Timeline</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div>
                                          <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: G500, marginBottom: 2 }}>Budget Range</div>
                                          <div style={{ fontSize: 14, fontWeight: 700, color: B }}>{budgetLabel}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: G500, marginBottom: 4 }}>Start Timeline</div>
                                          <span style={{ display: 'inline-block', padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', backgroundColor: urgency.bg, color: urgency.color }}>
                                            {timelineLabel}
                                          </span>
                                        </div>
                                        {priorities.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: G500, marginBottom: 6 }}>Client Priorities</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                              {priorities.map((p: string) => (
                                                <span key={p} style={{ fontSize: 9.5, fontWeight: 600, padding: '3px 8px', backgroundColor: 'rgba(157,126,63,0.09)', color: AC, border: '1px solid rgba(157,126,63,0.22)' }}>
                                                  {p}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes / description */}
                                  {s.description && (
                                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${G200}` }}>
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-3" style={{ color: G500 }}>Client Notes</div>
                                      <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.72, color: B, margin: 0 }}>{s.description}</p>
                                    </div>
                                  )}

                                  {/* Action bar */}
                                  <div style={{ padding: '12px 20px', backgroundColor: G50, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {s.email && (
                                      <>
                                        <a href={`mailto:${s.email}?subject=${encodeURIComponent('Your HOU INC Project Brief — Next Steps')}&body=${encodeURIComponent(`Hi ${s.name?.split(' ')[0] || 'there'},\n\nThank you for submitting your project brief to HOU INC. We've reviewed your details and would love to schedule a complimentary consultation.\n\nPlease feel free to reply to this email or call us at (281) 915-9595.\n\nBest,\nJeff Ali\nHOU INC · (281) 915-9595`)}`}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, textDecoration: 'none', backgroundColor: B, color: '#FFF' }}>
                                          <Mail className="w-3 h-3" strokeWidth={2} /> Reply to Brief
                                        </a>
                                        <a href={`mailto:${s.email}?subject=${encodeURIComponent('Your HOU INC Client Portal Invitation')}&body=${encodeURIComponent(`Hi ${s.name?.split(' ')[0] || 'there'},\n\nThank you for your interest in HOU INC. I've set up a private client portal for you where you can track your project, share documents, and communicate directly with our team.\n\nPlease register at: ${window.location.origin}/portal\n\nYour account will be reviewed and approved within 1 business day.\n\nLooking forward to working with you.\n\nBest,\nJeff Ali\nHOU INC · (281) 915-9595`)}`}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, textDecoration: 'none', backgroundColor: 'rgba(157,126,63,0.1)', color: AC, border: `1px solid rgba(157,126,63,0.28)` }}>
                                          <Mail className="w-3 h-3" strokeWidth={2} /> Invite to Portal
                                        </a>
                                      </>
                                    )}
                                    {s.phone && (
                                      <a href={`tel:${s.phone}`}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, textDecoration: 'none', border: `1px solid ${G200}`, color: G500 }}>
                                        <Phone className="w-3 h-3" strokeWidth={2} /> Call
                                      </a>
                                    )}
                                    <div className="ml-auto text-[9px] font-light" style={{ color: G500 }}>
                                      Lead #{String(startBriefs.length - idx).padStart(3, '0')}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {leadsSubTab === 'contact' && (
                <div className="agl">
                  {contactForms.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                      <div className="text-[12px] font-light" style={{ color: G500 }}>No contact form submissions yet.</div>
                    </div>
                  ) : contactForms.slice().reverse().map((f: any, i: number) => (
                    <div key={f.id ?? f.email + String(i)} className="px-5 py-5" style={{ borderBottom: i < contactForms.length - 1 ? `1px solid ${G200}` : 'none' }}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="text-[12px] font-bold mb-0.5" style={{ color: B }}>{f.name}</div>
                          <div className="text-[10px] font-light mb-2" style={{ color: G500 }}>{f.email}{f.phone ? ` · ${f.phone}` : ''}</div>
                          <div className="text-[11px] font-light leading-relaxed" style={{ color: G500 }}>{f.message || f.description || '—'}</div>
                        </div>
                        <div className="text-[9px] shrink-0" style={{ color: G500 }}>
                          {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      {/* #7 Invite to Portal */}
                      {f.email && (
                        <a href={`mailto:${f.email}?subject=${encodeURIComponent('Your HOU INC Client Portal Invitation')}&body=${encodeURIComponent(`Hi ${f.name || 'there'},\n\nThank you for reaching out to HOU INC. We'd love to move forward with your project.\n\nI've set up a dedicated client portal where you can submit your project brief, track milestones, share documents, and communicate with our team directly.\n\nPlease register at: ${window.location.origin}/portal\n\nYour account will be reviewed and approved within 1 business day.\n\nBest,\nJeff Ali\nHOU INC · (281) 915-9595`)}`}
                          className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-2 transition-opacity hover:opacity-75"
                          style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, border: `1px solid rgba(157,126,63,0.3)`, textDecoration: 'none' }}>
                          <Mail className="w-3 h-3" strokeWidth={2} /> Invite to Portal
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ DOCUMENTS ══════ */}
          {tab === 'documents' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="agl agl-tbl">
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
                                  <button onClick={() => viewDocument(d.file_url, toast)}
                                    className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1 flex items-center gap-1 transition-opacity hover:opacity-75 cursor-pointer"
                                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                                    <Download className="w-2.5 h-2.5" strokeWidth={2} /> View
                                  </button>
                                )}
                                {d.status === 'uploaded' && (
                                  <>
                                    <button onClick={() => handleDocApprove(d.clientId, d.id, d.name)}
                                      className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1"
                                      style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                      Approve
                                    </button>
                                    <button onClick={() => handleDocReject(d.clientId, d.id, d.name)}
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
          {tab === 'meetings' && (() => {
            const allMeetList = Object.entries(allMeetings)
              .flatMap(([cId, meets]) => (meets ?? []).map((m: any) => ({ ...m, clientId: cId })));
            const sortedMeets = [...allMeetList].sort((a: any, b: any) => {
              // Calendar view: sort by date; list view: sort by status priority
              if (meetingsView === 'calendar') return (a.date ?? '').localeCompare(b.date ?? '');
              const order: Record<string, number> = { requested: 0, confirmed: 1, completed: 2, cancelled: 3 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            });
            // Calendar view: group by date
            const byDate: Record<string, typeof sortedMeets> = {};
            if (meetingsView === 'calendar') {
              sortedMeets.forEach(m => {
                const d = m.date ?? 'Unknown';
                if (!byDate[d]) byDate[d] = [];
                byDate[d].push(m);
              });
            }
            return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="agl agl-tbl">
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(232,228,222,0.6)' }}>
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold flex-1" style={{ color: AC }}>
                    All Scheduled Meetings — {pendingMeets.length} awaiting confirmation
                  </div>
                  {/* #12 View toggle */}
                  <div className="flex gap-0.5">
                    {(['list', 'calendar'] as const).map(v => (
                      <button key={v} onClick={() => setMeetingsView(v)}
                        className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5"
                        style={{ backgroundColor: meetingsView === v ? B : 'transparent', color: meetingsView === v ? W : G500, border: `1px solid ${G200}` }}>
                        {v === 'list' ? <LayoutList className="w-3 h-3" strokeWidth={2} /> : <CalendarDays className="w-3 h-3" strokeWidth={2} />}
                        {v === 'list' ? 'List' : 'Calendar'}
                      </button>
                    ))}
                  </div>
                  {/* #11 Export */}
                  <button onClick={() => exportCSV('meetings.csv',
                    ['Client', 'Type', 'Format', 'Date', 'Time', 'Status', 'Notes'],
                    sortedMeets.map(m => [clientName(m.clientId), m.type, m.format, m.date, m.time, m.status, m.notes || '']))}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 transition-opacity hover:opacity-75"
                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', color: AC, border: `1px solid rgba(157,126,63,0.2)` }}>
                    <Download className="w-3 h-3" strokeWidth={2} /> Export CSV
                  </button>
                </div>
                {allMeetList.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[12px] font-light" style={{ color: G500 }}>No meetings yet.</div>
                  </div>
                ) : meetingsView === 'list' ? (
                  sortedMeets.map((m: any, i: number, arr) => {
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
                            <button onClick={() => handleMeetingConfirm(m.clientId, m.id, m.type, m.date, m.time)}
                              className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                              style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                              Confirm
                            </button>
                            <button onClick={() => handleMeetingCancel(m.clientId, m.id, m.type)}
                              className="text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5"
                              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Calendar view: date-grouped */
                  <div className="p-4 space-y-4">
                    {Object.entries(byDate).map(([date, dateMeets]) => (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-[8px] uppercase tracking-[0.32em] font-black px-2.5 py-1" style={{ backgroundColor: AC, color: W }}>
                            {date !== 'Unknown' ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown Date'}
                          </div>
                          <div className="h-px flex-1" style={{ backgroundColor: G200 }} />
                          <span className="text-[9px] font-bold" style={{ color: G500 }}>{dateMeets.length} meeting{dateMeets.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1.5 ml-2">
                          {dateMeets.map((m: any) => {
                            const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                            return (
                              <div key={`cal-${m.clientId}-${m.id}`}
                                className="flex items-center gap-3 px-4 py-3"
                                style={{ backgroundColor: G50, border: `1px solid ${G200}`, borderLeft: `3px solid ${meetStatusColor(m.status).color}` }}>
                                <span className="text-[11px] font-black w-12 shrink-0 tabular-nums" style={{ color: AC }}>{m.time}</span>
                                <FmtIcon className="w-3.5 h-3.5 shrink-0" style={{ color: meetStatusColor(m.status).color }} strokeWidth={1.5} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-semibold" style={{ color: B }}>{m.type}</div>
                                  <div className="text-[10px] font-light" style={{ color: G500 }}>
                                    <button onClick={() => { setTab('clients'); setSelectedClientId(m.clientId); setClientSubTab('meetings'); }}
                                      className="transition-colors" style={{ color: AC }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}>
                                      {clientName(m.clientId)}
                                    </button>
                                    {' · '}{m.format}
                                  </div>
                                </div>
                                <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                                {m.status === 'requested' && (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleMeetingConfirm(m.clientId, m.id, m.type, m.date, m.time)}
                                      className="text-[8px] uppercase tracking-[0.14em] font-bold px-2 py-1"
                                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' }}>
                                      Confirm
                                    </button>
                                    <button onClick={() => handleMeetingCancel(m.clientId, m.id, m.type)}
                                      className="text-[8px] uppercase tracking-[0.14em] font-bold px-2 py-1"
                                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            );
          })()}

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

            const entityIncome  = (id: string) => finTxns.filter((t: any) => t.entity_id === id && t.type === 'income').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const entityExpense = (id: string) => finTxns.filter((t: any) => t.entity_id === id && t.type === 'expense').reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const entityChecks  = (id: string) => finChecks.filter((c: any) => c.entity_id === id);
            const entityProjects = (id: string) => finProjects.filter((p: any) => p.entity_id === id);

            const filteredProjects = finProjects.filter((p: any) => activeEntities.includes(p.entity_id));
            const filteredChecks   = finChecks.filter((c: any) => activeEntities.includes(c.entity_id));
            const filteredTxns     = finTxns.filter((t: any) => activeEntities.includes(t.entity_id));

            const fmt = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {/* Finance Hub link + quick-access row */}
                <div className="flex flex-wrap items-center gap-3 p-4 mb-6 agl">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(157,126,63,0.1)' }}>
                    <DollarSign className="w-4 h-4" style={{ color: AC }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold mb-0.5" style={{ color: B }}>HOU INC Finance Hub</div>
                    <div className="text-[10px] font-light" style={{ color: G500 }}>Live entity-aware financial data — multi-company P&amp;L, projects, checks, and transactions.</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ENTITY_DEFS.map(e => (
                      <button key={e.id}
                        onClick={() => navigate(`/finance/dashboard?entity=${e.id}`)}
                        className="text-[8px] uppercase tracking-[0.2em] font-black px-3 py-1.5 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: e.color + '18', color: e.color, border: `1px solid ${e.color}40` }}>
                        {e.short}
                      </button>
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
                      <div key={e.id} className="agl-stat" style={{ borderTop: `3px solid ${e.color}` }}>
                        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(232,228,222,0.5)' }}>
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
                          <button
                            onClick={() => navigate(`/finance/dashboard?entity=${e.id}`)}
                            className="flex items-center gap-1 text-[8px] uppercase tracking-[0.22em] font-black hover:opacity-70 transition-opacity"
                            style={{ color: e.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            Open Dashboard <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Aggregate stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Projects',      value: filteredProjects.length, icon: ClipboardList,    color: '#3b82f6' },
                    { label: 'Checks',        value: filteredChecks.length,   icon: CreditCard, color: AC },
                    { label: 'Transactions',  value: filteredTxns.length,     icon: FileText,  color: '#8b5cf6' },
                    { label: 'Vendors', value: finEntityTab === 'all' ? finVendors.length : finVendors.filter((v: any) => v.entity_id === finEntityTab).length, icon: Package, color: '#10b981' },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center gap-3 p-4 agl-stat">
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
                  <div className="mb-5 agl agl-tbl">
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
                  <div className="mb-5 agl agl-tbl">
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
                  <div className="agl agl-tbl">
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
                            const isIncome = t.type === 'income';
                            return (
                              <tr key={t.id} style={{ borderBottom: i < Math.min(filteredTxns.length, 8) - 1 ? `1px solid ${G200}` : 'none' }}>
                                <td className="px-4 py-3">
                                  {eDef && <span className="text-[7.5px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5" style={{ backgroundColor: eDef.color + '16', color: eDef.color }}>{eDef.short}</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[7.5px] font-bold uppercase tracking-[0.18em] px-2 py-0.5" style={{ backgroundColor: isIncome ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: isIncome ? '#10b981' : '#ef4444' }}>
                                    {t.type || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-light max-w-[180px] truncate" style={{ color: B }}>{t.notes || t.source_name || '—'}</td>
                                <td className="px-4 py-3 text-[12px] font-semibold" style={{ color: isIncome ? '#10b981' : '#ef4444' }}>
                                  {isIncome ? '+' : '-'}{t.amount ? fmt(Number(t.amount)) : '—'}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-light" style={{ color: G500 }}>{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {filteredProjects.length === 0 && filteredChecks.length === 0 && filteredTxns.length === 0 && (
                  <div className="text-center py-16 agl">
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
                  <div key={s.label} className="p-5 agl-stat">
                    <div className="text-[30px] font-black mb-0.5" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: B }}>{s.label}</div>
                    <div className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 inline-block" style={{ backgroundColor: `${s.color}12`, color: s.color }}>{s.trend}</div>
                  </div>
                ))}
              </div>

              <div className="p-7 mb-6 agl">
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

              <div className="p-7 agl">
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

