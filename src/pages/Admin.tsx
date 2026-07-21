import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, MessageSquare, Activity, Image,
  ArrowUpRight, TrendingUp,
  Edit3, FileText, Calendar,
  RefreshCw, BarChart3, DollarSign,
  ChevronRight, ChevronDown, Send, CheckCircle2, XCircle,
  Video, Phone, MapPin, FileCheck,
  Inbox, Wallet,
  ArrowLeft, ClipboardList, UserCheck, UserX, ShieldCheck,
  Map, Download, Mail, Search, StickyNote, LayoutList, CalendarDays,
  Receipt, FilePlus,
  FolderKanban, Bell, CheckSquare, Plus, BriefcaseBusiness,
  History, FileDown, Menu, LifeBuoy, X as XIcon,
} from 'lucide-react';
import ClientMap from '@/components/admin/ClientMap';
import { APPROVAL_DOCS, BUILDER } from '@/hooks/usePortal';
import { motion, AnimatePresence } from 'framer-motion';
import PortfolioManager from '@/components/admin/PortfolioManager';
import MilestoneManager from '@/components/admin/MilestoneManager';
import ProjectManager from '@/components/admin/ProjectManager';
import DocumentsManager from '@/components/admin/DocumentsManager';
import FinanceDataPanel from '@/components/admin/FinanceDataPanel';
import { toast } from '@/hooks/use-toast';
import autoTable from 'jspdf-autotable';
import { makeDoc, tblCfg, addDecorations, buildSheet, writeWorkbook } from '@/lib/reports';
import { PDV2_CSS } from '@/components/project-detail/cardStyles';
import { StatCard } from '@/components/project-detail/StatCard';
import { AdminNavGroup } from '@/components/admin/design/AdminSidebar';
import { TerminalTopBar, TerminalRail } from '@/components/admin/terminal/TerminalNav';
import { ENTITIES } from '@/contexts/EntityContext';
import { ActionButton } from '@/components/admin/design/ActionButton';
import { AdminTable } from '@/components/admin/design/AdminTable';
import { VerticalTimeline } from '@/components/admin/design/VerticalTimeline';
import { OverviewDashboard } from '@/components/admin/design/OverviewDashboard';
import { todayLocalDate } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import {
  useHelpRequests, useUpdateHelpRequestStatus, useHelpRequestScreenshotUrl,
  HELP_CATEGORY_LABELS, SUPPORT_ADMIN_EMAIL, type HelpRequest,
} from '@/hooks/useHelpRequests';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const G500  = '#8A8580';
const AC    = '#9D7E3F';

/* ── Supabase data loaders ───────────────────────────────────────────── */
async function loadPortalData() {
  const [clientsRes, briefsRes, msgsRes, docsRes, meetsRes] = await Promise.all([
    supabase.from('portal_clients').select('*').order('created_at', { ascending: false }),
    supabase.from('portal_briefs').select('*').order('created_at', { ascending: true }),
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

  // A client can now have more than one brief (multi-project support). This admin
  // view still only shows one per client — the query above orders ascending so
  // this forEach's last write per client_id lands on their most recent brief.
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

/* The admin dashboard reports on Houston Enterprise only — every finance
   query is scoped to that entity so counts match the finance dashboard. */
const HE_ENTITY_ID = 'houston-enterprise';

async function loadFinanceData() {
  const [projRes, chkRes, txnRes, vndRes, portRes] = await Promise.all([
    supabase.from('projects').select('*').is('deleted_at', null).eq('entity_id', HE_ENTITY_ID),
    supabase.from('checks').select('*').is('deleted_at', null).eq('entity_id', HE_ENTITY_ID),
    supabase.from('transactions').select('*').is('deleted_at', null).eq('entity_id', HE_ENTITY_ID),
    supabase.from('vendors').select('*').is('deleted_at', null).eq('entity_id', HE_ENTITY_ID),
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
async function adminUpdateBriefStatus(briefId: string, status: string) {
  await supabase.from('portal_briefs').update({ status }).eq('id', briefId);
}

async function adminSendMessage(clientId: string, text: string) {
  await supabase.from('portal_messages').insert({
    client_id:   clientId,
    sender:      'builder',
    sender_name: BUILDER.name,
    body:        text,
  });
}

async function adminUpdateDocStatus(clientId: string, docId: string, status: 'approved' | 'rejected') {
  await supabase.from('portal_documents').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: BUILDER.name }).eq('id', docId);
}

async function adminUpdateMeetingStatus(clientId: string, meetingId: string, status: 'confirmed' | 'cancelled') {
  await supabase.from('portal_meetings').update({ status }).eq('id', meetingId);
}

async function adminCreateMeeting(clientId: string, meeting: {
  type: string;
  date: string;
  time: string;
  format: 'In-Person' | 'Video Call' | 'Phone Call';
  notes: string;
  status?: 'requested' | 'confirmed' | 'completed' | 'cancelled';
}) {
  await supabase.from('portal_meetings').insert({
    client_id: clientId,
    type: meeting.type,
    date: meeting.date,
    time: meeting.time,
    format: meeting.format,
    notes: meeting.notes || null,
    status: meeting.status ?? 'confirmed',
  });
}

async function adminUpdateMeeting(meetingId: string, meeting: {
  type: string;
  date: string;
  time: string;
  format: 'In-Person' | 'Video Call' | 'Phone Call';
  notes: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
}) {
  await supabase.from('portal_meetings').update({
    type: meeting.type,
    date: meeting.date,
    time: meeting.time,
    format: meeting.format,
    notes: meeting.notes || null,
    status: meeting.status,
  }).eq('id', meetingId);
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
    sender_name: BUILDER.name,
    body:        `Welcome to the Houston Enterprise Client Portal, ${clientName}. I'm ${BUILDER.name}, Co-Founder and your dedicated project lead. Your account has been approved and I'm looking forward to learning about your vision. Please complete your Project Brief when you're ready — it gives me the context I need for our first consultation. You'll also find your required documents in the Documents tab. Feel free to message me anytime.`,
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
  await logChangelog('approved', 'client_account', 'admin', clientId, clientName, BUILDER.name, {});
}

async function adminRejectClient(clientId: string) {
  await supabase.from('portal_clients').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', clientId);
  await logChangelog('rejected', 'client_account', 'admin', clientId, null, BUILDER.name, {});
}

/* ── #14 Audit log ─────────────────────────────────────────────────── */
async function logAdminAction(action: string, clientId: string, details: string) {
  try {
    await (supabase as any).from('portal_admin_log').insert({
      action, client_id: clientId, actor: BUILDER.name, details,
    });
  } catch { /* table may not exist yet */ }
}

async function logChangelog(
  action: string,
  entity: string,
  dashboard: string,
  entityId: string | null,
  entityLabel: string | null,
  changedBy: string,
  details: Record<string, any> = {}
) {
  try {
    await supabase.from('admin_changelog' as any).insert({
      action, entity, dashboard,
      entity_id: entityId,
      entity_label: entityLabel,
      changed_by: changedBy,
      details,
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
    client_id: clientId, body, author: BUILDER.name,
  });
}

/* ── #10 Request document ──────────────────────────────────────────── */
async function adminRequestDocument(clientId: string, name: string, description: string) {
  await (supabase as any).from('portal_documents').insert({
    client_id: clientId, name, description,
    file_type: 'PDF', category: 'required',
    status: 'pending', requested_by: BUILDER.name,
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
const ADMIN_USER = { name: 'Hunain Qureshi', role: 'Admin' };
const COMMON_DOCUMENT_REQUESTS = {
  residential: [
    'Signed Construction Agreement',
    'Architectural Plans / Drawings',
    'Survey or Site Plan',
    'HOA Approval Letter',
    'Permit Application Documents',
    'Selections / Finish Schedule',
    'Proof of Funds or Financing Letter',
    'Homeowner Insurance Certificate',
  ],
  commercial: [
    'Signed Construction Agreement',
    'Commercial Lease or Ownership Documents',
    'Architectural / Engineering Plans',
    'Certificate of Occupancy Requirements',
    'Tenant Improvement Scope',
    'Insurance Certificate',
    'W-9 / Billing Information',
    'Permit Application Package',
  ],
} as const;

/* ── Enterprise indigo system ─────────────────────────────────────────
   /admin gets a fixed, self-contained palette (scoped to .admin-dashboard)
   independent of the site-wide theme switcher — every hsl(var(--token))
   rule below (and the shared .pdv2-card/agl/snav utility classes reused
   across every tab) automatically repaints to this palette. ── */
const ADMIN_CSS = `
  .admin-dashboard{
    --background: 0 0% 100%;
    --foreground: 0 0% 4%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 4%;
    --primary: 0 0% 5%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 97%;
    --secondary-foreground: 0 0% 5%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 42%;
    --accent: 0 0% 5%;
    --accent-foreground: 0 0% 100%;
    --destructive: 17 79% 41%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 88%;
    --input: 0 0% 86%;
    --ring: 0 0% 5%;
    --positive: 142 71% 35%;
    --warning: 17 79% 41%;
    background: hsl(var(--background));
  }
  .admin-dashboard main{position:relative;z-index:1;}
  .admin-dashboard .pdv2-card{border-radius:20px;box-shadow:0 1px 2px rgba(0,0,0,.025),0 12px 34px rgba(0,0,0,.055);border:1px solid rgba(0,0,0,.085);transition:transform .28s cubic-bezier(.16,1,.3,1),box-shadow .28s cubic-bezier(.16,1,.3,1),border-color .2s ease;}
  .admin-dashboard .pdv2-card:has(.pdv2-label){position:relative;overflow:hidden;background:hsl(var(--background));border:1px solid rgba(0,0,0,.085);box-shadow:0 10px 30px rgba(0,0,0,.055);padding:14px!important;}
  .admin-dashboard .pdv2-card:has(.pdv2-label)::after{content:'';position:absolute;left:20%;right:20%;top:0;height:1px;background:linear-gradient(90deg,transparent,hsl(var(--accent)/.55),transparent);}
  .admin-dashboard .pdv2-card:has(.pdv2-label):hover{box-shadow:0 22px 48px rgba(0,0,0,.12);transform:translateY(-3px);border-color:rgba(0,0,0,.2);}
  .admin-dashboard .pdv2-card:has(.pdv2-label) .text-xl{font-size:18px!important;line-height:1.1!important;}
  .admin-dashboard .pdv2-card:has(.pdv2-label) .pdv2-label{font-size:8px!important;letter-spacing:.16em!important;font-weight:800!important;color:hsl(var(--foreground)/.62)!important;}
  .admin-dashboard .pdv2-card:hover{transform:translateY(-2px);box-shadow:0 22px 50px rgba(0,0,0,.105);border-color:rgba(0,0,0,.18);}
  .admin-page-wrap{width:100%;max-width:1720px;margin:0 auto;}
  .admin-command-bar{background:rgba(255,255,255,.92);backdrop-filter:blur(18px);border-bottom:1px solid rgba(0,0,0,.07);box-shadow:0 8px 26px rgba(0,0,0,.035);}
  .admin-table-wrap table thead th{position:sticky;top:0;z-index:1;}
  .admin-focus-card{border-left:3px solid hsl(var(--accent));}
  .admin-soft-panel{border:1px solid rgba(0,0,0,.08);border-radius:20px;background:hsl(var(--background));box-shadow:0 12px 34px rgba(0,0,0,.05);}
  .admin-segment{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(0,0,0,.1);background:hsl(var(--background));border-radius:999px;padding:4px;box-shadow:0 5px 18px rgba(0,0,0,.045);}
  .admin-segment button{border-radius:999px;}
  .agl{background:hsl(var(--background))!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:1px solid rgba(0,0,0,.085)!important;box-shadow:0 12px 34px rgba(0,0,0,.055)!important;border-radius:20px!important;}
  .agl-h{transition:border-color .2s ease!important;}
  .agl-h:hover{box-shadow:0 24px 52px rgba(0,0,0,.12)!important;transform:translateY(-3px)!important;border-color:rgba(0,0,0,.2)!important;}
  .agl-stat{background:hsl(var(--background))!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:1px solid rgba(0,0,0,.085)!important;box-shadow:0 10px 30px rgba(0,0,0,.05)!important;border-radius:20px!important;transition:all .28s cubic-bezier(.16,1,.3,1)!important;}
  .agl-stat:hover{box-shadow:0 22px 48px rgba(0,0,0,.12)!important;transform:translateY(-3px)!important;border-color:rgba(0,0,0,.2)!important;}
  .agl-urg{background:rgba(239,68,68,0.035)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:1px solid rgba(239,68,68,0.22)!important;box-shadow:0 10px 30px rgba(239,68,68,.055)!important;border-radius:20px!important;}
  .agl-urg:hover{box-shadow:0 22px 48px rgba(239,68,68,.11)!important;transform:translateY(-3px)!important;}
  .agl-tbl tr:hover td{background-color:hsl(var(--accent)/0.04)!important;transition:background-color .18s ease;}
  .agl-tbl thead tr:hover th,.agl-tbl thead tr:hover td{background-color:hsl(var(--muted))!important;}
  .agl-row:hover{background-color:hsl(var(--accent)/0.05)!important;transition:background-color .18s ease;}
  .snav-item{position:relative;transition:color .22s ease,background-color .22s ease!important;}
  .snav-item::after{content:'';position:absolute;inset:0;opacity:0;background:hsl(var(--accent)/0.08);transition:opacity .25s ease;pointer-events:none;}
  .snav-item:hover::after{opacity:1;}
  .snav-active::after{opacity:1;background:hsl(var(--accent)/0.12)!important;}
  .status-pill{border-radius:999px!important;padding:4px 10px!important;font-size:8px!important;letter-spacing:.14em!important;font-weight:800!important;border:1px solid currentColor;line-height:1.35;}
  .admin-dashboard input,.admin-dashboard select,.admin-dashboard textarea{border-radius:12px;transition:border-color .2s ease,box-shadow .2s ease,background-color .2s ease;}
  .admin-dashboard input:hover,.admin-dashboard select:hover,.admin-dashboard textarea:hover{border-color:rgba(0,0,0,.24);}
  .admin-dashboard input:focus,.admin-dashboard select:focus,.admin-dashboard textarea:focus{box-shadow:0 0 0 4px rgba(0,0,0,.055);}
  .admin-dashboard table{border-collapse:separate;border-spacing:0;}
  .admin-dashboard,.admin-dashboard *{box-sizing:border-box;}
  .admin-dashboard main,.admin-dashboard section,.admin-dashboard article,.admin-dashboard .pdv2-card{max-width:100%;}
  .admin-dashboard .grid,.admin-dashboard .flex{min-width:0;}
  .admin-dashboard .grid>*,.admin-dashboard .flex>*{min-width:0;}
  .admin-dashboard button,.admin-dashboard a,.admin-dashboard input,.admin-dashboard select,.admin-dashboard textarea{max-width:100%;}
  .admin-dashboard .admin-table-wrap,.admin-dashboard .overflow-x-auto{max-width:100%;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;}
  @media(max-width:767px){
    .admin-dashboard{height:auto!important;min-height:100vh;overflow:visible!important;}
    .admin-dashboard main{height:auto!important;min-height:100vh;overflow:visible!important;}
    .admin-page-wrap{max-width:100%;padding-left:12px!important;padding-right:12px!important;padding-top:12px!important;padding-bottom:12px!important;}
    .admin-command-bar{position:sticky;top:0;}
    .admin-command-bar .admin-page-wrap{gap:10px!important;padding-top:10px!important;padding-bottom:10px!important;}
    .admin-dashboard .pdv2-card{border-radius:14px!important;}
    .admin-dashboard .space-y-5 > :not([hidden]) ~ :not([hidden]){margin-top:12px!important;}
    .admin-dashboard .space-y-4 > :not([hidden]) ~ :not([hidden]){margin-top:10px!important;}
    .admin-dashboard .space-y-3 > :not([hidden]) ~ :not([hidden]){margin-top:8px!important;}
    .admin-dashboard table{width:100%;}
    .admin-dashboard .admin-table-wrap table,.admin-dashboard .overflow-x-auto table{min-width:680px;}
    .admin-dashboard th,.admin-dashboard td{white-space:nowrap;}
    .admin-dashboard input,.admin-dashboard select,.admin-dashboard textarea{font-size:16px!important;}
    .admin-dashboard button,.admin-dashboard a{min-height:34px;}
    .admin-dashboard .status-pill{font-size:7px!important;padding:3px 7px!important;letter-spacing:.12em!important;}
    .admin-dashboard [class*="tracking-[0.3em]"],.admin-dashboard [class*="tracking-[0.34em]"],.admin-dashboard [class*="tracking-[0.4em]"]{letter-spacing:.18em!important;}
  }
  @media(max-width:480px){
    .admin-dashboard .admin-table-wrap table,.admin-dashboard .overflow-x-auto table{min-width:620px;}
    .admin-page-wrap{padding-left:10px!important;padding-right:10px!important;}
    .admin-dashboard .pdv2-card{box-shadow:0 1px 2px rgba(16,24,40,.04)!important;}
  }
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

const LEAD_STAGES = [
  { value: 'lead_capture', label: 'Pending · Lead Capture & Review', short: 'Pending Review', color: '#64748B' },
  { value: 'site_audit', label: 'Site Audit & Feasibility', short: 'Site Audit', color: '#0284C7' },
  { value: 'estimation', label: 'Estimate & Bid Submission', short: 'Bid Preparation', color: '#7C3AED' },
  { value: 'client_review', label: 'Client Review · Negotiation', short: 'Client Review', color: '#D97706' },
  { value: 'awarded', label: 'Approved · Project Awarded', short: 'Approved / Awarded', color: '#059669' },
  { value: 'contracting', label: 'Contracting & Retainer Clearance', short: 'Contracting', color: '#2563EB' },
  { value: 'lost', label: 'Rejected · Not Awarded', short: 'Rejected / Lost', color: '#DC2626' },
] as const;

function LeadLifecycleSelect({ value, saving, onChange }: {
  value?: string; saving?: boolean; onChange: (value: string) => void;
}) {
  const current = LEAD_STAGES.find(s => s.value === value) ?? LEAD_STAGES[0];
  return (
    <label className="relative inline-flex items-center rounded-xl border bg-background shadow-sm transition-all hover:shadow-md"
      style={{ borderColor: `${current.color}55` }} onClick={e => e.stopPropagation()}>
      <span className="absolute left-3 w-2 h-2 rounded-full pointer-events-none" style={{ backgroundColor: current.color, boxShadow: `0 0 0 4px ${current.color}16` }} />
      <select value={current.value} disabled={saving} onChange={e => onChange(e.target.value)}
        aria-label="Project lifecycle status"
        className="appearance-none bg-transparent pl-8 pr-9 py-2.5 text-[10px] sm:text-[11px] font-bold text-foreground outline-none cursor-pointer disabled:cursor-wait min-w-[190px] sm:min-w-[230px]">
        {LEAD_STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
      </select>
      <ChevronDown className={`absolute right-3 w-3.5 h-3.5 pointer-events-none ${saving ? 'animate-pulse' : ''}`} style={{ color: current.color }} strokeWidth={2.4} />
    </label>
  );
}

type AdminTab = 'overview' | 'approvals' | 'clients' | 'leads' | 'documents' | 'meetings' | 'portfolio' | 'map' | 'finance' | 'analytics' | 'projects' | 'notifications' | 'changelog' | 'help_desk';
const ADMIN_TAB_KEYS: AdminTab[] = ['overview', 'approvals', 'clients', 'leads', 'documents', 'meetings', 'portfolio', 'map', 'finance', 'analytics', 'projects', 'notifications', 'changelog', 'help_desk'];

export default function Admin() {
  /* ── Auth ── */
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === '1');
  const [pin, setPin]           = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // The real-auth user (distinct from the PIN lock above) — used only to
  // gate the Help Requests tab to the one support-admin account.
  const { user } = useAuth();
  const isSupportAdmin = user?.email === SUPPORT_ADMIN_EMAIL;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* ── Nav ── */
  const tabParam = searchParams.get('tab') as AdminTab | null;
  const initialTab: AdminTab = tabParam && ADMIN_TAB_KEYS.includes(tabParam)
    ? tabParam
    : 'overview';
  const [tab, setTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    const next = searchParams.get('tab') as AdminTab | null;
    if (next && ADMIN_TAB_KEYS.includes(next)) {
      setTab(next);
    }
  }, [searchParams]);

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
  const [adminProjects, setAdminProjects] = useState<any[]>([]);

  const refreshData = useCallback(async () => {
    const [portal, leads, finance, helpRes, clRes, adminProjRes] = await Promise.all([
      loadPortalData(),
      loadLeadsData(),
      loadFinanceData(),
      supabase.from('portal_help_requests').select('*, portal_clients(name, email)').order('created_at', { ascending: false }),
      (supabase as any).from('admin_changelog').select('*').order('created_at', { ascending: false }).limit(500),
      (supabase as any).from('admin_projects').select('*').eq('entity', HE_ENTITY_ID).order('created_at', { ascending: false }),
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
    setAdminProjects(adminProjRes.data ?? []);
    setPortfolioCount(finance.portfolioCount);
    setHelpRequests(helpRes.data ?? []);
    setChangelogEntries(clRes.data ?? []);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  /* ── Live data: refresh when any portal table changes (debounced) ── */
  useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => refreshData(), 500); };
    const ch = supabase.channel('admin-live');
    ['portal_clients', 'portal_briefs', 'portal_documents', 'portal_meetings', 'portal_messages',
      'portal_help_requests', 'contact_submissions', 'start_project_submissions',
      'transactions', 'checks', 'projects', 'vendors', 'invoices', 'admin_projects'].forEach(table => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, queueRefresh);
    });
    ch.subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [unlocked, refreshData]);

  /* ── Portfolio count (for analytics) ── */
  const [portfolioCount, setPortfolioCount] = useState(0);

  /* ── Client detail state ── */
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSubTab, setClientSubTab] = useState<'brief' | 'projects' | 'messages' | 'docs' | 'meetings' | 'notes' | 'milestones' | 'profile'>('brief');
  const [replyDraft, setReplyDraft] = useState('');

  /* ── Client profile editing ── */
  const [editName,        setEditName]        = useState('');
  const [editPhone,       setEditPhone]       = useState('');
  const [editProjectType, setEditProjectType] = useState('');
  const [editStatus,      setEditStatus]      = useState('');
  const [profileSaving,   setProfileSaving]   = useState(false);
  const [profileMsg,      setProfileMsg]      = useState<{ok: boolean; text: string} | null>(null);

  /* ── #9 Admin notes ── */
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  /* ── #10 Request document ── */
  const [reqDocOpen, setReqDocOpen] = useState(false);
  const [reqDocName, setReqDocName] = useState('');
  const [reqDocDesc, setReqDocDesc] = useState('');
  const [reqDocSaving, setReqDocSaving] = useState(false);
  const [reqDocPreset, setReqDocPreset] = useState('');

  /* ── Client meeting management ── */
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    type: 'Project Consultation',
    date: '',
    time: '10:00',
    format: 'Video Call' as 'In-Person' | 'Video Call' | 'Phone Call',
    status: 'confirmed' as 'requested' | 'confirmed' | 'completed' | 'cancelled',
    notes: '',
  });
  const [meetingSaving, setMeetingSaving] = useState(false);

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
  const [leadStatusSaving, setLeadStatusSaving] = useState<string | null>(null);

  /* ── Help requests (client portal) ── */
  const [helpRequests, setHelpRequests] = useState<any[]>([]);

  /* ── Team help requests ("type help" shortcut, support-admin only) ── */
  const { data: teamHelpRequests = [] } = useHelpRequests(isSupportAdmin);
  const updateHelpRequestStatus = useUpdateHelpRequestStatus();
  const [helpLightboxUrl, setHelpLightboxUrl] = useState<string | null>(null);

  /* ── Changelog ── */
  const [changelogEntries,   setChangelogEntries]   = useState<any[]>([]);
  const [clSearch,           setClSearch]           = useState('');
  const [clDashFilter,       setClDashFilter]       = useState('all');
  const [clEntityFilter,     setClEntityFilter]     = useState('all');

  /* ── Mobile nav ── */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* ── Terminal shell: multi-entity switching + local dark mode ── */
  const [activeEntityId, setActiveEntityId] = useState('houston-enterprise');
  const [terminalDark, setTerminalDark] = useState(false);

  /* ── Scroll to top whenever tab changes ── */
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }, [tab]);

  /* ── Computed ── */
  const totalMsgs       = Object.values(allMsgs).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);
  const pendingDocs     = Object.entries(allDocs).flatMap(([cId, docs]) =>
    (docs ?? []).filter((d: any) => d.status === 'uploaded').map((d: any) => ({ ...d, clientId: cId })));
  const pendingMeets    = Object.entries(allMeetings).flatMap(([cId, meets]) =>
    (meets ?? []).filter((m: any) => m.status === 'requested').map((m: any) => ({ ...m, clientId: cId })));
  const allLeads        = [...startBriefs, ...contactForms].length;
  const pendingApprovals = clients.filter((c: any) => c.status === 'pending_approval');
  const approvedClients  = clients.filter((c: any) => c.status === 'approved' || !c.status);

  const handleLeadStatusChange = async (source: 'start_project' | 'contact', lead: any, nextStatus: string) => {
    const saveKey = `${source}:${lead.id}`;
    setLeadStatusSaving(saveKey);
    try {
      const { data: result, error } = await (supabase as any).rpc('transition_inbound_lead', {
        p_source: source, p_lead_id: lead.id, p_status: nextStatus,
      });
      if (error) throw error;
      await refreshData();
      if (nextStatus === 'awarded') {
        toast({
          title: result?.admin_project_id ? 'Project awarded and created' : 'Project awarded',
          description: result?.finance_project_id
            ? 'The project is now linked in Admin Projects and Houston Enterprise Finance.'
            : 'The Admin project was created; the finance bridge will synchronize it automatically.',
        });
      } else {
        const label = LEAD_STAGES.find(s => s.value === nextStatus)?.label ?? nextStatus;
        toast({ title: 'Lifecycle updated', description: `${lead.project_title || lead.company || lead.name || 'Lead'} moved to ${label}.` });
      }
    } catch (error: any) {
      toast({ title: 'Could not update lifecycle', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLeadStatusSaving(null);
    }
  };

  const clientName = (id: string) => clients.find((c: any) => c.id === id)?.name ?? '—';
  const openHelpCount = helpRequests.filter((r: any) => r.status !== 'resolved').length;
  const openTeamHelpCount = teamHelpRequests.filter(r => r.status !== 'resolved').length;

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

  /* ── Sync edit fields when selected client changes ── */
  useEffect(() => {
    const c = clients.find((c: any) => c.id === selectedClientId);
    if (c) {
      setEditName(c.name ?? '');
      setEditPhone(c.phone ?? '');
      setEditProjectType(c.projectType ?? c.project_type ?? '');
      setEditStatus(c.status ?? 'pending_approval');
      setProfileMsg(null);
    }
  }, [selectedClientId, clients]);

  /* ── Client detail actions ── */
  const handleSendReply = async () => {
    if (!selectedClientId || !replyDraft.trim()) return;
    await adminSendMessage(selectedClientId, replyDraft.trim());
    await logAdminAction('message_sent', selectedClientId, replyDraft.trim().slice(0, 80));
    await logChangelog('message_sent', 'message', 'admin', selectedClientId, clientName(selectedClientId), BUILDER.name, { preview: replyDraft.trim().slice(0, 120) });
    setReplyDraft('');
    await refreshData();
  };

  /* ── Client profile update ── */
  const handleUpdateClientProfile = async () => {
    if (!selectedClientId || !editName.trim()) return;
    setProfileSaving(true);
    setProfileMsg(null);
    const { error } = await supabase
      .from('portal_clients' as any)
      .update({
        name:         editName.trim(),
        phone:        editPhone.trim() || null,
        project_type: editProjectType.trim() || null,
        status:       editStatus,
        ...(editStatus === 'approved' ? { approved_at: new Date().toISOString(), rejected_at: null } : {}),
        ...(editStatus === 'rejected' ? { rejected_at: new Date().toISOString(), approved_at: null } : {}),
      })
      .eq('id', selectedClientId);
    if (!error) {
      await logAdminAction('profile_updated', selectedClientId, `name=${editName.trim()}, status=${editStatus}`);
      await logChangelog('updated', 'client_profile', 'admin', selectedClientId, editName.trim(), BUILDER.name, { status: editStatus });
    }
    setProfileMsg(error
      ? { ok: false, text: error.message ?? 'Update failed.' }
      : { ok: true,  text: 'Profile updated successfully.' }
    );
    setProfileSaving(false);
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
      const { error } = await (supabase as any).from('change_orders').insert({
        client_id: selectedClientId,
        number: coNumber.trim() || null,
        description: coDesc.trim(),
        amount: parseFloat(coAmount),
        status: 'pending',
        created_by: BUILDER.name,
      });
      if (error) throw error;
      await logAdminAction('change_order_created', selectedClientId, coDesc.trim().slice(0, 80));
      await logChangelog('created', 'change_order', 'admin', selectedClientId, clientName(selectedClientId), BUILDER.name, { description: coDesc.trim(), amount: parseFloat(coAmount) });
      await adminSendMessage(selectedClientId, `A change order has been issued: "${coDesc.trim()}" for $${parseFloat(coAmount).toLocaleString()}. Please review in your payments portal. — ${BUILDER.name}`);
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
    await adminSendMessage(selectedClientId, `Document request: "${reqDocName.trim()}". ${reqDocDesc.trim() ? `${reqDocDesc.trim()} ` : ''}Please upload it in your Documents tab when available. — ${BUILDER.name}`);
    await logAdminAction('doc_requested', selectedClientId, reqDocName.trim());
    await logChangelog('created', 'document_request', 'admin', selectedClientId, reqDocName.trim(), BUILDER.name, { client: clientName(selectedClientId) });
    setReqDocName(''); setReqDocDesc(''); setReqDocPreset(''); setReqDocOpen(false);
    setReqDocSaving(false);
    await refreshData();
  };

  const openMeetingEditor = (meeting?: any) => {
    if (meeting) {
      setEditingMeetingId(meeting.id);
      setMeetingForm({
        type: meeting.type || 'Project Consultation',
        date: meeting.date || '',
        time: meeting.time || '10:00',
        format: meeting.format || 'Video Call',
        status: meeting.status || 'confirmed',
        notes: meeting.notes || '',
      });
    } else {
      setEditingMeetingId(null);
      setMeetingForm({
        type: 'Project Consultation',
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        time: '10:00',
        format: 'Video Call',
        status: 'confirmed',
        notes: '',
      });
    }
    setMeetingOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!selectedClientId || !meetingForm.type.trim() || !meetingForm.date || !meetingForm.time) return;
    setMeetingSaving(true);
    const payload = { ...meetingForm, type: meetingForm.type.trim(), notes: meetingForm.notes.trim() };
    if (editingMeetingId) {
      await adminUpdateMeeting(editingMeetingId, payload);
      await logAdminAction('meeting_updated', selectedClientId, `${payload.type} ${payload.date} ${payload.time}`);
      await logChangelog('updated', 'meeting', 'admin', editingMeetingId, payload.type, BUILDER.name, { client: clientName(selectedClientId), ...payload });
    } else {
      await adminCreateMeeting(selectedClientId, payload);
      await adminSendMessage(selectedClientId, `Meeting scheduled: ${payload.type} on ${payload.date} at ${payload.time} via ${payload.format}.${payload.notes ? ` ${payload.notes}` : ''} — ${BUILDER.name}`);
      await logAdminAction('meeting_created', selectedClientId, `${payload.type} ${payload.date} ${payload.time}`);
      await logChangelog('created', 'meeting', 'admin', selectedClientId, payload.type, BUILDER.name, { client: clientName(selectedClientId), ...payload });
    }
    setMeetingOpen(false);
    setEditingMeetingId(null);
    setMeetingSaving(false);
    await refreshData();
  };

  /* ── #13 Doc actions with auto-message ── */
  const handleDocApprove = async (clientId: string, docId: string, docName: string) => {
    await adminUpdateDocStatus(clientId, docId, 'approved');
    await adminSendMessage(clientId, `Your document "${docName}" has been reviewed and approved. — ${BUILDER.name}`);
    await logAdminAction('doc_approved', clientId, docName);
    await logChangelog('approved', 'document', 'admin', docId, docName, BUILDER.name, { client: clientName(clientId) });
    await refreshData();
  };
  const handleDocReject = async (clientId: string, docId: string, docName: string) => {
    await adminUpdateDocStatus(clientId, docId, 'rejected');
    await adminSendMessage(clientId, `Your document "${docName}" requires revision. Please re-upload with the requested changes. — ${BUILDER.name}`);
    await logAdminAction('doc_rejected', clientId, docName);
    await logChangelog('rejected', 'document', 'admin', docId, docName, BUILDER.name, { client: clientName(clientId) });
    await refreshData();
  };

  /* ── #13 Meeting actions with auto-message ── */
  const handleMeetingConfirm = async (clientId: string, meetId: string, meetType: string, date: string, time: string) => {
    await adminUpdateMeetingStatus(clientId, meetId, 'confirmed');
    await adminSendMessage(clientId, `Your ${meetType} on ${date} at ${time} has been confirmed. Looking forward to it! — ${BUILDER.name}`);
    await logAdminAction('meeting_confirmed', clientId, `${meetType} on ${date}`);
    await logChangelog('confirmed', 'meeting', 'admin', meetId, `${meetType} on ${date}`, BUILDER.name, { client: clientName(clientId) });
    await refreshData();
  };
  const handleMeetingCancel = async (clientId: string, meetId: string, meetType: string) => {
    await adminUpdateMeetingStatus(clientId, meetId, 'cancelled');
    await logAdminAction('meeting_cancelled', clientId, meetType);
    await logChangelog('cancelled', 'meeting', 'admin', meetId, meetType, BUILDER.name, { client: clientName(clientId) });
    await refreshData();
  };

  /* ── Overview calendar — full meeting CRUD (client‑agnostic, unlike the per‑client
     sub‑tab handlers above). Writes to the same portal_meetings table, so the live
     Supabase channel already wired up in refreshData()'s effect propagates the change
     to the global Meetings tab and every client's own Meetings sub‑tab automatically. ── */
  const handleOverviewMeetingSave = async (input: {
    id?: string; clientId: string; type: string; date: string; time: string;
    format: 'In-Person' | 'Video Call' | 'Phone Call';
    status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
    notes: string;
  }) => {
    const payload = {
      type: input.type.trim(), date: input.date, time: input.time,
      format: input.format, status: input.status, notes: input.notes.trim(),
    };
    if (input.id) {
      await adminUpdateMeeting(input.id, payload);
      await logAdminAction('meeting_updated', input.clientId, `${payload.type} ${payload.date} ${payload.time}`);
      await logChangelog('updated', 'meeting', 'admin', input.id, payload.type, BUILDER.name, { client: clientName(input.clientId), ...payload });
    } else {
      await adminCreateMeeting(input.clientId, payload);
      await adminSendMessage(input.clientId, `Meeting scheduled: ${payload.type} on ${payload.date} at ${payload.time} via ${payload.format}.${payload.notes ? ` ${payload.notes}` : ''} — ${BUILDER.name}`);
      await logAdminAction('meeting_created', input.clientId, `${payload.type} ${payload.date} ${payload.time}`);
      await logChangelog('created', 'meeting', 'admin', input.clientId, payload.type, BUILDER.name, { client: clientName(input.clientId), ...payload });
    }
    await refreshData();
  };

  const handleOverviewMeetingDelete = async (clientId: string, meetId: string, meetType: string) => {
    await supabase.from('portal_meetings').delete().eq('id', meetId);
    await logAdminAction('meeting_deleted', clientId, meetType);
    await logChangelog('deleted', 'meeting', 'admin', meetId, meetType, BUILDER.name, { client: clientName(clientId) });
    await refreshData();
  };

  /* ── Nav items ── */
  const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ComponentType<any>; desc?: string; badge?: number; urgent?: boolean }[] = [
    { key: 'overview',   label: 'Overview',          icon: Activity,     desc: 'Command center' },
    { key: 'approvals',  label: 'Account Requests',  icon: ShieldCheck,  desc: 'Access review', badge: pendingApprovals.length || undefined, urgent: pendingApprovals.length > 0 },
    { key: 'clients',    label: 'Portal Clients',    icon: Users,        desc: 'Profiles & CRM', badge: approvedClients.length },
    { key: 'leads',      label: 'Inbound Leads',     icon: Inbox,        desc: 'Website pipeline', badge: allLeads },
    { key: 'documents',  label: 'Documents',         icon: FileCheck,    desc: 'Review queue', badge: pendingDocs.length || undefined },
    { key: 'meetings',   label: 'Meetings',          icon: Calendar,     desc: 'Scheduling', badge: pendingMeets.length || undefined },
    { key: 'projects',   label: 'Projects',          icon: FolderKanban, desc: 'Delivery control' },
    { key: 'portfolio',  label: 'Portfolio',         icon: Image,        desc: 'Public work' },
    { key: 'map',        label: 'Client Map',        icon: Map,          desc: 'Geo coverage' },
    { key: 'finance',    label: 'Finance Data',      icon: Wallet,       desc: 'Entity snapshot' },
    { key: 'analytics',  label: 'Analytics',         icon: TrendingUp,   desc: 'Pipeline metrics' },
    { key: 'notifications', label: 'Notifications',  icon: Bell,         desc: 'Client help', badge: openHelpCount || undefined, urgent: openHelpCount > 0 },
    { key: 'changelog',  label: 'Changelog',         icon: History,      desc: 'Audit trail' },
    ...(isSupportAdmin ? [{ key: 'help_desk' as AdminTab, label: 'Help Requests', icon: LifeBuoy, desc: 'Team support inbox', badge: openTeamHelpCount || undefined, urgent: openTeamHelpCount > 0 }] : []),
  ];

  /* ════════ LOCK SCREEN ════════ */
  if (!unlocked) {
    return (
      <div className="admin-dashboard min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--background))' }}>
        <style>{ADMIN_CSS}</style>
        <motion.div className="w-full max-w-sm relative bg-card border border-border rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,.14)]"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="h-[3px] bg-accent" />
          <div className="p-8 sm:p-10">
            <div className="mb-9">
              <img src="/helogo.png" alt="Houston Enterprise" className="h-8 w-auto object-contain" />
              <div className="text-[8px] uppercase tracking-[0.28em] text-muted-foreground font-bold mt-2">Admin Console</div>
            </div>
            <div className="text-[28px] font-bold text-foreground leading-tight mb-1.5">Admin Access</div>
            <p className="text-[12px] text-muted-foreground mb-8">Enter your 6-digit PIN to access the dashboard.</p>
            <div className="mb-2">
              <label className="block text-[9px] uppercase tracking-[0.32em] font-bold text-muted-foreground mb-4">Admin PIN</label>
              <div className="flex gap-2 justify-between">
                {pin.map((digit, i) => (
                  <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={digit} autoFocus={i === 0}
                    onChange={e => handlePinDigit(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)}
                    className={`outline-none text-center text-[20px] font-bold rounded-sm tabular-nums text-foreground transition-colors ${digit ? 'border-2 border-accent bg-accent/5' : 'border-2 border-border bg-background focus:border-accent'}`}
                    style={{ width: 44, height: 52, flexShrink: 0, caretColor: 'transparent' }}
                  />
                ))}
              </div>
            </div>
            {pinError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] mt-3 mb-0 text-destructive">{pinError}</motion.p>}
            <div className="mt-8 pt-6 border-t border-border">
              <Link to="/" className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground hover:text-accent transition-colors">← Back to Website</Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════ NAV GROUPS (sidebar organization) ════════ */
  const navByKey = Object.fromEntries(NAV_ITEMS.map(n => [n.key, n])) as Record<AdminTab, typeof NAV_ITEMS[number]>;
  const NAV_GROUPS: AdminNavGroup[] = [
    { label: 'Overview', items: [navByKey.overview] },
    { label: 'Client Pipeline', items: [navByKey.approvals, navByKey.clients, navByKey.leads] },
    { label: 'Delivery', items: [navByKey.documents, navByKey.meetings, navByKey.projects, navByKey.portfolio, navByKey.map] },
    { label: 'Business', items: [navByKey.finance, navByKey.analytics] },
    { label: 'System', items: [navByKey.notifications, navByKey.changelog, navByKey.help_desk].filter(Boolean) },
  ];

  /* ════════ DASHBOARD ════════ */
  return (
    <div className="admin-dashboard flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{ADMIN_CSS}</style>
      <style>{PDV2_CSS}</style>

      {/* Top bar — persists across all tabs, holds global utilities.
          Dark mode is scoped to the terminal shell only (via this "contents" wrapper),
          not the page content, since the content panels don't have dark-mode text colors yet. */}
      <div className={`contents ${terminalDark ? 'dark' : ''}`}>
        <TerminalTopBar
          dark={terminalDark}
          onToggleDark={() => setTerminalDark(v => !v)}
          notificationCount={openHelpCount}
          userName={ADMIN_USER.name}
          userRole={ADMIN_USER.role}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Rail */}
        <div className={`contents ${terminalDark ? 'dark' : ''}`}>
          <TerminalRail
            groups={NAV_GROUPS}
            activeKey={tab}
            onSelect={key => { setTab(key as AdminTab); setSelectedClientId(null); }}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
            onLock={handleLogout}
            onBackToWebsite={() => navigate('/')}
            onOpenPortal={() => navigate('/portal')}
            onOpenFinance={() => navigate('/finance')}
            user={ADMIN_USER}
          />
        </div>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {activeEntityId !== 'houston-enterprise' && (
          <div className="shrink-0 px-4 py-2 border-b border-slate-300 dark:border-neutral-700 bg-orange-50 dark:bg-orange-950/20 text-[11.5px] text-orange-800 dark:text-orange-300 font-medium flex items-center gap-2">
            <span className="font-extrabold uppercase tracking-wider text-[10px]">Notice —</span>
            Admin console for {ENTITIES.find(e => e.id === activeEntityId)?.name} is not yet provisioned. Showing Houston Enterprise data below.
          </div>
        )}
        {/* Top bar (overview renders its own welcome header instead) */}
        {tab !== 'overview' && (
        <div className="admin-command-bar sticky top-0 z-30">
          <div className="admin-page-wrap flex items-center justify-between gap-4 px-4 md:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
              onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-4 h-4" strokeWidth={1.7} />
            </button>
            {selectedClientId && tab === 'clients' && (
              <button onClick={() => setSelectedClientId(null)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-semibold px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                <ArrowLeft className="w-3 h-3" strokeWidth={2} /> All Clients
              </button>
            )}
            <div>
              <div className="text-[8px] uppercase tracking-[0.4em] font-bold text-accent">Houston Enterprise · Admin</div>
              <div className="text-[15px] sm:text-[17px] font-bold text-foreground truncate">
                {selectedClientId && tab === 'clients' ? clients.find((c: any) => c.id === selectedClientId)?.name : NAV_ITEMS.find(n => n.key === tab)?.label}
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground">
            <span className="rounded-full border border-positive/25 bg-positive/10 px-2.5 py-1 text-positive">Live Data</span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1">{openHelpCount} Help</span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1">{pendingDocs.length + pendingMeets.length + pendingApprovals.length} Queue</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={refreshData} className="hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-semibold px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
              <RefreshCw className="w-3 h-3" strokeWidth={2} /> Refresh
            </button>
            <button onClick={refreshData} className="sm:hidden flex items-center justify-center w-8 h-8 shrink-0 rounded-lg border border-border text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <Link to="/finance" className="hidden sm:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2 rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-85">
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
            <Link to="/finance" className="sm:hidden flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-85">
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>
          </div>
        </div>
        )}

        {tab === 'map' && (
          <div className="flex-1" style={{ overflow: 'hidden' }}>
            <ClientMap />
          </div>
        )}

        {tab !== 'map' && <div className={`admin-page-wrap px-4 md:px-6 pb-5 md:pb-7 ${tab === 'overview' ? 'pt-2 md:pt-3' : 'pt-5 md:pt-7'}`}>

          {/* ══════ OVERVIEW ══════ */}
          {tab === 'overview' && (
            <OverviewDashboard
              adminName={ADMIN_USER.name}
              clients={clients}
              briefs={briefs}
              allMsgs={allMsgs}
              allDocs={allDocs}
              allMeetings={allMeetings}
              contactForms={contactForms}
              startBriefs={startBriefs}
              helpRequests={helpRequests}
              projects={finProjects}
              checks={finChecks}
              transactions={finTxns}
              onSelectTab={t => { setTab(t as AdminTab); setSelectedClientId(null); }}
              onOpenClient={(id, sub) => { setTab('clients'); setSelectedClientId(id); setClientSubTab((sub as any) ?? 'brief'); }}
              onRefresh={refreshData}
              onOpenFinance={() => navigate('/finance')}
              onOpenLedgerEntry={(kind, id) => navigate(`/ledger?openKind=${kind}&openId=${id}`)}
              onSaveMeeting={handleOverviewMeetingSave}
              onDeleteMeeting={handleOverviewMeetingDelete}
              onConfirmMeeting={handleMeetingConfirm}
              onCancelMeeting={handleMeetingCancel}
              onOpenMobileNav={() => setMobileNavOpen(true)}
              onViewDocument={url => viewDocument(url, toast)}
            />
          )}

          {/* ══════ APPROVALS ══════ */}
          {tab === 'approvals' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Header + stats strip */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Pending Review" value={String(pendingApprovals.length)} icon={ShieldCheck} trendColor="#f59e0b" />
                <StatCard label="Approved" value={String(clients.filter((c: any) => c.status === 'approved').length)} icon={UserCheck} trendColor="#10b981" />
                <StatCard label="Not Approved" value={String(clients.filter((c: any) => c.status === 'rejected').length)} icon={UserX} trendColor="#ef4444" />
              </div>

              {/* Pending applications */}
              <div className="pdv2-card overflow-hidden">
                <div className="pdv2-card-header flex items-center justify-between bg-warning/5">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-warning">Pending Review</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Review each application and approve or decline access</div>
                  </div>
                  {pendingApprovals.length > 0 && <StatusBadge label={`${pendingApprovals.length} waiting`} style={{ bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} />}
                </div>

                {pendingApprovals.length === 0 && (
                  <div className="py-14 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-positive" strokeWidth={1} />
                    <div className="text-[13px] font-semibold text-foreground">All caught up</div>
                    <div className="text-[11px] text-muted-foreground mt-1">No pending applications at this time.</div>
                  </div>
                )}

                <div className="divide-y divide-border">
                  {pendingApprovals.map((c: any) => (
                    <div key={c.id} className="px-5 py-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 flex items-center justify-center text-[12px] font-black shrink-0 rounded-full bg-warning/10 text-warning">
                          {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="text-[14px] font-bold text-foreground">{c.name}</span>
                            <StatusBadge label="Pending Review" style={{ bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3 text-[11px] text-muted-foreground">
                            <span>{c.email}</span>
                            {c.phone && <span>{c.phone}</span>}
                            <span className="text-[10px]">
                              Applied {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {c.projectType && (
                            <div className="mb-3">
                              <StatusBadge label={c.projectType} style={{ bg: 'rgba(157,126,63,0.08)', color: AC }} />
                            </div>
                          )}
                          {c.projectInterest && (
                            <div className="p-3.5 mb-4 rounded-lg bg-secondary/40 border-l-2 border-border">
                              <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-2 text-muted-foreground">Project Description</div>
                              <p className="text-[12px] text-foreground leading-relaxed">{c.projectInterest}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 flex-wrap">
                            <ActionButton variant="positive" icon={UserCheck} onClick={async () => { await adminApproveClient(c.id, c.name); await refreshData(); }} className="!border-positive !bg-positive/10">Approve Access</ActionButton>
                            <ActionButton variant="negative" icon={UserX} onClick={async () => { await adminRejectClient(c.id); await refreshData(); }}>Decline</ActionButton>
                            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                              Email Applicant
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All clients with status */}
              <div className="pdv2-card overflow-hidden">
                <div className="pdv2-card-header">
                  <div className="text-[11px] font-bold uppercase tracking-wide">All Applications ({clients.length})</div>
                </div>
                <AdminTable
                  emptyText="No applications yet."
                  columns={[
                    { key: 'name', label: 'Applicant', render: (c: any) => (
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{c.email}</div>
                      </div>
                    ) },
                    { key: 'projectType', label: 'Project Type', render: (c: any) => c.projectType || '—' },
                    { key: 'createdAt', label: 'Applied', render: (c: any) => new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    { key: 'status', label: 'Status', render: (c: any) => {
                      const statusColor = c.status === 'approved' ? { bg: 'rgba(16,185,129,0.08)', color: '#10b981' }
                        : c.status === 'rejected' ? { bg: 'rgba(239,68,68,0.08)', color: '#ef4444' }
                        : { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' };
                      return <StatusBadge label={c.status?.replace('_', ' ') ?? 'pending'} style={statusColor} />;
                    } },
                    { key: 'actions', label: '', render: (c: any) => (
                      <>
                        {c.status === 'pending_approval' && (
                          <div className="flex items-center gap-2">
                            <ActionButton variant="positive" onClick={async () => { await adminApproveClient(c.id, c.name); await refreshData(); }}>Approve</ActionButton>
                            <ActionButton variant="negative" onClick={async () => { await adminRejectClient(c.id); await refreshData(); }}>Decline</ActionButton>
                          </div>
                        )}
                        {c.status === 'approved' && (
                          <ActionButton variant="neutral" onClick={() => { setTab('clients'); setSelectedClientId(c.id); }}>View Profile</ActionButton>
                        )}
                      </>
                    ) },
                  ]}
                  rows={[...clients].reverse()}
                />
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
              <div className="pdv2-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-border">
                  <div className="text-[11px] font-bold uppercase tracking-wide flex-1">
                    Active Portal Clients ({filteredClients.length}{filteredClients.length !== approvedClients.length ? ` of ${approvedClients.length}` : ''})
                  </div>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 w-3 h-3 pointer-events-none text-muted-foreground" strokeWidth={2} />
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="text-[11px] outline-none rounded-lg border border-border bg-background text-foreground pl-6 pr-2.5 py-1.5 w-[180px] focus:border-accent transition-colors" />
                  </div>
                  <select value={clientStatusFilter} onChange={e => setClientStatusFilter(e.target.value)}
                    className="text-[10px] outline-none rounded-lg border border-border bg-background text-muted-foreground px-2.5 py-1.5">
                    {briefStatuses.map(s => (
                      <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <ActionButton variant="primary" icon={Download} onClick={() => exportCSV('clients.csv',
                    ['Name', 'Email', 'Phone', 'Joined', 'Brief Status', 'Docs', 'Messages'],
                    approvedClients.map((c: any) => {
                      const brief = briefs[c.id];
                      return [c.name, c.email, c.phone || '', new Date(c.createdAt).toLocaleDateString(), brief?.status || 'no brief', (allDocs[c.id] ?? []).length, (allMsgs[c.id] ?? []).length];
                    }))}>Export CSV</ActionButton>
                  {pendingApprovals.length > 0 && (
                    <ActionButton variant="neutral" icon={ShieldCheck} onClick={() => setTab('approvals')} className="!border-warning/30 !text-warning">
                      {pendingApprovals.length} pending
                    </ActionButton>
                  )}
                </div>
                <AdminTable
                  onRowClick={(c: any) => { setSelectedClientId(c.id); setClientSubTab('brief'); }}
                  emptyText={approvedClients.length === 0 ? 'No approved clients yet.' : 'No clients match your search.'}
                  columns={[
                    { key: 'name', label: 'Client', render: (c: any) => (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0 rounded-full bg-accent/10 text-accent">
                          {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-[12px] font-semibold text-foreground">{c.name}</span>
                      </div>
                    ) },
                    { key: 'contact', label: 'Contact', render: (c: any) => (
                      <div>
                        <div className="text-[11px] text-muted-foreground">{c.email}</div>
                        <div className="text-[10px] text-muted-foreground">{c.phone || '—'}</div>
                      </div>
                    ) },
                    { key: 'createdAt', label: 'Approved', render: (c: any) => new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    { key: 'brief', label: 'Brief Status', render: (c: any) => {
                      const brief = briefs[c.id];
                      return <StatusBadge label={brief ? brief.status : 'no brief'} style={briefStatusColor(brief?.status ?? 'none')} />;
                    } },
                    { key: 'docs', label: 'Docs', render: (c: any) => <span className="font-semibold text-foreground">{(allDocs[c.id] ?? []).length}</span> },
                    { key: 'msgs', label: 'Msgs', render: (c: any) => <span className="font-semibold text-foreground">{(allMsgs[c.id] ?? []).length}</span> },
                    { key: 'chevron', label: '', render: () => <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} /> },
                  ]}
                  rows={filteredClients}
                />
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
            const clientProjects = adminProjects.filter((p: any) =>
              p.portal_client_id === selectedClientId ||
              (p.client_email && client.email && String(p.client_email).toLowerCase() === String(client.email).toLowerCase()) ||
              (p.client_name && client.name && String(p.client_name).toLowerCase() === String(client.name).toLowerCase())
            );
            const activeClientProjects = clientProjects.filter((p: any) => p.status === 'active' || p.status === 'planning').length;
            const docPresetGroup = (client.projectType || brief?.type || '').toLowerCase().includes('commercial') ? 'commercial' : 'residential';
            const docPresetOptions = COMMON_DOCUMENT_REQUESTS[docPresetGroup];
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {/* Client header */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 xl:gap-5 p-4 sm:p-5 mb-5 pdv2-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-[14px] sm:text-[16px] font-black shrink-0 rounded-full bg-accent/10 text-accent">
                      {client.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] sm:text-[18px] font-bold mb-0.5 text-foreground">{client.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
                        <span>{client.email}</span>
                        {client.phone && <span>{client.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center min-w-0 xl:justify-end">
                    <StatusBadge label={`${messages.length} msgs`} style={{ bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' }} />
                    <StatusBadge label={`${docs.length} docs`} style={{ bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }} />
                    <StatusBadge label={`${meets.length} meets`} style={{ bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' }} />
                    <StatusBadge label={`${clientProjects.length} projects`} style={{ bg: 'rgba(157,126,63,0.08)', color: AC }} />
                    <ActionButton variant="neutral" icon={Receipt} className="!border-accent/30 !text-accent"
                      onClick={() => navigate('/invoices/new', { state: { clientName: client.name, clientEmail: client.email } })}>
                      Invoice
                    </ActionButton>
                    <ActionButton variant="neutral" icon={FilePlus} className="!border-warning/30 !text-warning" onClick={() => setCoOpen(true)}>
                      Change Order
                    </ActionButton>
                  </div>
                </div>

                {/* #15 Change Order dialog */}
                {coOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-full max-w-md mx-4 p-6 pdv2-card shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-foreground">Create Change Order</div>
                        <button onClick={() => setCoOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                      <form onSubmit={handleCreateCO} className="space-y-4">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">CO Number (optional)</div>
                          <input
                            type="text" placeholder="e.g. CO-001"
                            value={coNumber} onChange={e => setCoNumber(e.target.value)}
                            className="w-full border border-border rounded-lg px-3 h-10 text-sm font-mono outline-none text-foreground bg-background focus:border-accent transition-colors"
                          />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Description *</div>
                          <textarea
                            required rows={3} placeholder="Scope change description…"
                            value={coDesc} onChange={e => setCoDesc(e.target.value)}
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none text-foreground bg-background focus:border-accent transition-colors"
                          />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Amount (USD) *</div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <input
                              type="number" step="0.01" required placeholder="0.00"
                              value={coAmount} onChange={e => setCoAmount(e.target.value)}
                              className="w-full border border-border rounded-lg pl-7 pr-3 h-10 text-sm font-mono outline-none text-right text-foreground bg-background focus:border-accent transition-colors"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-1">
                          <ActionButton type="button" variant="neutral" className="flex-1 !py-2.5" onClick={() => setCoOpen(false)}>Cancel</ActionButton>
                          <button type="submit" disabled={coSaving || !coDesc.trim() || !coAmount} className="flex-1 h-10 rounded-lg text-[10px] uppercase tracking-[0.2em] font-bold bg-warning text-white transition-opacity hover:opacity-85 disabled:opacity-50">
                            {coSaving ? 'Saving…' : 'Issue Change Order'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Sub-tab pills */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 mb-5">
                  {([['profile', 'Profile'], ['brief', 'Brief'], ['projects', 'Projects'], ['messages', 'Msgs'], ['docs', 'Docs'], ['meetings', 'Meets'], ['notes', 'Notes'], ['milestones', 'Milestones']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setClientSubTab(k)}
                      className={`text-[9px] uppercase tracking-[0.18em] font-bold px-3 md:px-4 py-2 rounded-lg transition-all shrink-0 border ${
                        clientSubTab === k ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent'
                      }`}>
                      {l}{k === 'notes' && adminNotes.length > 0 ? ` (${adminNotes.length})` : k === 'projects' && clientProjects.length > 0 ? ` (${clientProjects.length})` : ''}
                    </button>
                  ))}
                </div>

                {/* Profile sub-tab */}
                {clientSubTab === 'profile' && (() => {
                  const PROJECT_TYPES = ['New Home Construction', 'Major Renovation', 'Home Addition', 'Kitchen & Bath Remodel', 'Outdoor & Landscaping', 'Commercial Build-Out', 'Other'];
                  const CLIENT_STATUSES = ['pending_approval', 'approved', 'rejected'];
                  const inputCls = "w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors";
                  return (
                    <div className="pdv2-card overflow-hidden">
                      <div className="pdv2-card-header flex items-center gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                        <span className="text-[11px] font-bold uppercase tracking-wide">Edit Client Profile</span>
                      </div>
                      <div className="p-6 grid sm:grid-cols-2 gap-5">
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1.5 text-muted-foreground">Full Name *</div>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1.5 text-muted-foreground">Phone</div>
                          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1.5 text-muted-foreground">Project Type</div>
                          <select value={editProjectType} onChange={e => setEditProjectType(e.target.value)} className={`${inputCls} cursor-pointer`}>
                            <option value="">— Select —</option>
                            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1.5 text-muted-foreground">Account Status</div>
                          <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                            {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1.5 text-muted-foreground">Email (read-only)</div>
                          <input value={client.email} readOnly className={`${inputCls} bg-secondary/50 text-muted-foreground cursor-default`} />
                        </div>
                      </div>
                      <div className="px-6 pb-6 flex items-center gap-4">
                        <ActionButton variant="primary" onClick={handleUpdateClientProfile} disabled={profileSaving || !editName.trim()}>
                          {profileSaving ? 'Saving…' : 'Save Changes'}
                        </ActionButton>
                        {profileMsg && (
                          <span className={`text-[10px] ${profileMsg.ok ? 'text-positive' : 'text-destructive'}`}>
                            {profileMsg.text}
                          </span>
                        )}
                      </div>

                      {/* Quick client info summary */}
                      <div className="px-6 pt-4 pb-6 border-t border-border">
                        <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-4 text-muted-foreground">Registered Information</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {[
                            ['Joined', new Date(client.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
                            ['Status', client.status?.replace(/_/g, ' ') ?? '—'],
                            ['Email', client.email],
                            ['Phone', client.phone ?? '—'],
                            ['Project Type', client.projectType ?? '—'],
                            ['Messages', `${(allMsgs[selectedClientId!] ?? []).length} total`],
                            ['Documents', `${(allDocs[selectedClientId!] ?? []).length} total`],
                            ['Meetings', `${(allMeetings[selectedClientId!] ?? []).length} total`],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <div className="text-[7px] uppercase tracking-[0.24em] font-bold mb-0.5 text-muted-foreground">{label}</div>
                              <div className="text-[12px] font-semibold text-foreground">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Brief sub-tab */}
                {clientSubTab === 'brief' && (
                  <div className="pdv2-card overflow-hidden">
                    {brief ? (
                      <div>
                        {/* Dossier header */}
                        <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-border">
                          <div>
                            <div className="text-[7px] uppercase tracking-[0.34em] font-bold mb-1.5 text-muted-foreground">
                              Project Brief
                            </div>
                            <div className="text-[19px] font-bold text-foreground leading-tight">
                              {brief.type || 'Untitled Project'}
                            </div>
                            {brief.submittedAt && (
                              <div className="text-[9px] text-muted-foreground mt-1">
                                Submitted {new Date(brief.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                          <StatusBadge label={brief.status} style={briefStatusColor(brief.status)} />
                        </div>

                        {/* Two-column: Project Details | Investment & Timeline */}
                        <div className="grid md:grid-cols-2 border-b border-border">
                          <div className="p-6 border-b md:border-b-0 md:border-r border-border">
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4 text-accent">
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
                                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-0.5 text-muted-foreground">{l}</div>
                                  <div className="text-[12px] font-semibold text-foreground">{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4 text-accent">
                              Investment & Timeline
                            </div>
                            <div className="space-y-4 mb-5">
                              {([
                                ['Budget', brief.budget],
                                ['Timeline', brief.timeline],
                              ] as [string, string][]).filter(([, v]) => v).map(([l, v]) => (
                                <div key={l}>
                                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-0.5 text-muted-foreground">{l}</div>
                                  <div className="text-[12px] font-semibold text-foreground">{v}</div>
                                </div>
                              ))}
                            </div>

                            {(brief.style ?? []).length > 0 && (
                              <div>
                                <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-2 text-muted-foreground">
                                  Architectural Style
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(brief.style ?? []).map((s: string) => (
                                    <StatusBadge key={s} label={s} style={{ bg: 'rgba(157,126,63,0.08)', color: AC }} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Vision notes */}
                        {brief.description && (
                          <div className="px-6 py-5 bg-secondary/30 border-b border-border">
                            <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-3 text-muted-foreground">
                              Vision Notes
                            </div>
                            <p className="leading-relaxed text-[13px] text-foreground italic">
                              &ldquo;{brief.description}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Status workflow */}
                        <div className="px-6 py-5">
                          <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-4 text-muted-foreground">
                            Workflow Status
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {BRIEF_STATUSES.map(s => {
                              const c = briefStatusColor(s);
                              const isActive = brief.status === s;
                              return (
                                <button key={s}
                                  onClick={async () => { await adminUpdateBriefStatus(brief.id, s); await refreshData(); }}
                                  className="text-[8px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 rounded-lg transition-all"
                                  style={{
                                    backgroundColor: isActive ? c.color : 'transparent',
                                    color: isActive ? '#fff' : c.color,
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
                        <ClipboardList className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1} />
                        <div className="text-[12px] text-muted-foreground">No brief submitted yet.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Projects sub-tab */}
                {clientSubTab === 'projects' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {[
                        { label: 'Assigned Projects', value: clientProjects.length, sub: `${activeClientProjects} active/planning`, icon: FolderKanban, color: AC },
                        { label: 'Contract Value', value: `$${clientProjects.reduce((s: number, p: any) => s + Number(p.contract_amount ?? p.budget ?? 0), 0).toLocaleString()}`, sub: 'Admin delivery scope', icon: DollarSign, color: '#2563eb' },
                        { label: 'Avg Progress', value: `${clientProjects.length ? Math.round(clientProjects.reduce((s: number, p: any) => s + Number(p.progress_pct || 0), 0) / clientProjects.length) : 0}%`, sub: 'Across client projects', icon: TrendingUp, color: '#0f766e' },
                        { label: 'Linked Docs', value: docs.length, sub: 'Client document vault', icon: FileText, color: '#7c3aed' },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="pdv2-card p-3 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[8px] uppercase tracking-[0.16em] font-black text-muted-foreground truncate">{item.label}</div>
                              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.color }} />
                            </div>
                            <div className="text-[18px] font-mono-tab font-black mt-1 truncate">{item.value}</div>
                            <div className="text-[9px] text-muted-foreground truncate">{item.sub}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pdv2-card overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wide">Client Projects</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Manage all delivery records assigned to {client.name}.</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton variant="neutral" icon={BriefcaseBusiness} className="!border-accent/30 !text-accent" onClick={() => { setTab('projects'); setSelectedClientId(null); }}>
                            Open Projects
                          </ActionButton>
                          <ActionButton variant="primary" icon={Plus} onClick={() => { setTab('projects'); setSelectedClientId(null); }}>
                            New Project
                          </ActionButton>
                        </div>
                      </div>

                      {clientProjects.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                          <FolderKanban className="w-9 h-9 mx-auto mb-3 text-muted-foreground/35" strokeWidth={1} />
                          <div className="text-[13px] font-semibold text-foreground">No projects assigned yet</div>
                          <div className="text-[11px] text-muted-foreground mt-1 mb-5">Create or link an admin project to make this client workspace project-aware.</div>
                          <ActionButton variant="primary" icon={Plus} onClick={() => { setTab('projects'); setSelectedClientId(null); }}>Create Project</ActionButton>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
                          {clientProjects.map((p: any) => {
                            const statusColor = p.status === 'completed' ? '#10b981' : p.status === 'on_hold' ? '#f59e0b' : p.status === 'archived' ? '#8A8580' : AC;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => { setTab('projects'); setSelectedClientId(null); navigate(`/admin?tab=projects&project=${p.id}`); }}
                                className="text-left border border-border bg-background p-3.5 hover:border-accent/45 hover:bg-secondary/25 transition-colors min-w-0"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                      {p.project_code && <span className="text-[8px] uppercase tracking-[0.16em] font-black bg-secondary px-2 py-0.5 text-muted-foreground">{p.project_code}</span>}
                                      <span className="text-[8px] uppercase tracking-[0.16em] font-black px-2 py-0.5 border" style={{ color: statusColor, borderColor: `${statusColor}55`, backgroundColor: `${statusColor}12` }}>{String(p.status || 'active').replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className="text-[14px] font-bold text-foreground truncate">{p.title}</div>
                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{[p.type, p.city, p.state].filter(Boolean).join(' · ')}</div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </div>
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.16em] font-black text-muted-foreground mb-1">
                                    <span>Progress</span>
                                    <span className="font-mono-tab text-foreground">{Number(p.progress_pct || 0)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-secondary overflow-hidden">
                                    <div className="h-full" style={{ width: `${Math.min(Number(p.progress_pct || 0), 100)}%`, backgroundColor: statusColor }} />
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-px bg-border border border-border">
                                  {[
                                    ['Budget', Number(p.budget || 0) ? `$${Number(p.budget || 0).toLocaleString()}` : '—'],
                                    ['Contract', Number(p.contract_amount || 0) ? `$${Number(p.contract_amount || 0).toLocaleString()}` : '—'],
                                    ['Manager', p.project_manager || '—'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="bg-background px-2 py-2 min-w-0">
                                      <div className="text-[7px] uppercase tracking-[0.14em] font-black text-muted-foreground truncate">{label}</div>
                                      <div className="text-[10px] font-semibold truncate">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages sub-tab */}
                {clientSubTab === 'messages' && (
                  <div className="pdv2-card overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto p-5 space-y-3">
                      {messages.map((m: any) => (
                        <div key={m.id} className={`flex gap-3 ${m.sender === 'builder' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0 rounded-full ${m.sender === 'builder' ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                            {m.senderName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                          </div>
                          <div className="max-w-[70%]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-bold ${m.sender === 'builder' ? 'text-accent' : 'text-foreground'}`}>{m.senderName}</span>
                              <span className="text-[9px] text-muted-foreground">{new Date(m.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                            <div className={`text-[12px] leading-relaxed p-3 rounded-lg text-foreground ${m.sender === 'builder' ? 'bg-accent/5 border border-accent/15' : 'bg-secondary/50 border border-border'}`}>
                              {m.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && <div className="text-center py-8 text-[12px] text-muted-foreground">No messages yet.</div>}
                    </div>
                    <div className="p-5 border-t border-border">
                      <div className="flex gap-3">
                        <textarea
                          value={replyDraft}
                          onChange={e => setReplyDraft(e.target.value)}
                          placeholder={`Reply as ${BUILDER.name}…`}
                          rows={2}
                          className="flex-1 text-[12px] outline-none resize-none rounded-lg border border-border bg-background text-foreground px-3.5 py-2.5 focus:border-accent transition-colors"
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendReply(); }}
                        />
                        <button onClick={handleSendReply} disabled={!replyDraft.trim()}
                          className={`flex items-center gap-2 px-5 rounded-lg text-[9px] uppercase tracking-[0.22em] font-black transition-opacity ${replyDraft.trim() ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'}`}>
                          <Send className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents sub-tab */}
                {clientSubTab === 'docs' && (
                  <div className="pdv2-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wide">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Request, review, approve, and manage client files.</div>
                      </div>
                      <ActionButton variant="neutral" icon={FilePlus} className="!border-accent/30 !text-accent" onClick={() => { setReqDocOpen(o => !o); setReqDocName(''); setReqDocDesc(''); }}>
                        Request Document
                      </ActionButton>
                    </div>
                    {reqDocOpen && (
                      <div className="px-5 py-4 bg-accent/5 border-b border-border">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1 text-muted-foreground">Common Request</div>
                          <select
                            value={reqDocPreset}
                            onChange={e => {
                              const value = e.target.value;
                              setReqDocPreset(value);
                              if (value) setReqDocName(value);
                            }}
                            className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-2.5 py-2.5 focus:border-accent transition-colors"
                          >
                            <option value="">Choose from {docPresetGroup} checklist...</option>
                            {docPresetOptions.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1 text-muted-foreground">Document Name *</div>
                          <input value={reqDocName} onChange={e => setReqDocName(e.target.value)}
                            placeholder="Type a custom document request..."
                            className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-2.5 py-2.5 focus:border-accent transition-colors" />
                        </div>
                        <div className="lg:col-span-2">
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-1 text-muted-foreground">Instructions (optional)</div>
                          <textarea value={reqDocDesc} onChange={e => setReqDocDesc(e.target.value)}
                            placeholder="What to include or how to format"
                            rows={2}
                            className="w-full text-[12px] outline-none resize-none rounded-lg border border-border bg-background text-foreground px-2.5 py-2.5 focus:border-accent transition-colors" />
                        </div>
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-[10px] text-muted-foreground">The request is created in the portal and a message is sent to the client.</div>
                          <div className="flex flex-wrap gap-2 sm:justify-end min-w-0">
                            <ActionButton variant="primary" disabled={reqDocSaving || !reqDocName.trim()} onClick={handleRequestDoc}>
                              {reqDocSaving ? 'Sending…' : 'Send Request'}
                            </ActionButton>
                            <ActionButton variant="neutral" onClick={() => setReqDocOpen(false)}>Cancel</ActionButton>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-border">
                      {docs.map((d: any) => (
                        <div key={d.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 shrink-0 mt-0.5 text-accent" strokeWidth={1.5} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <div className="text-[12px] font-semibold text-foreground">{d.name}</div>
                                <StatusBadge label={d.status} style={docStatusColor(d.status)} />
                              </div>
                              <div className="text-[10px] text-muted-foreground">{d.fileType} · {d.category} {d.uploadedAt ? `· Uploaded ${new Date(d.uploadedAt).toLocaleDateString()}` : ''}</div>
                              {d.description && <div className="text-[10px] mt-0.5 italic text-muted-foreground">{d.description}</div>}
                              {(d.file_url || d.status === 'uploaded') && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {d.file_url && (
                                    <ActionButton variant="neutral" icon={Download} className="!border-accent/30 !text-accent" onClick={() => viewDocument(d.file_url, toast)}>View</ActionButton>
                                  )}
                                  {d.status === 'uploaded' && (
                                    <>
                                      <ActionButton variant="positive" icon={CheckCircle2} onClick={() => handleDocApprove(selectedClientId!, d.id, d.name)}>Approve</ActionButton>
                                      <ActionButton variant="negative" icon={XCircle} onClick={() => handleDocReject(selectedClientId!, d.id, d.name)}>Reject</ActionButton>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {docs.length === 0 && !reqDocOpen && <div className="px-5 py-14 text-center text-[12px] text-muted-foreground">No documents yet. Use "Request Document" to ask the client to upload something.</div>}
                  </div>
                )}

                {/* Meetings sub-tab */}
                {clientSubTab === 'meetings' && (
                  <div className="pdv2-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide">Meetings ({meets.length})</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Schedule, update, confirm, and manage client meetings in real time.</div>
                      </div>
                      <ActionButton variant="primary" icon={Calendar} onClick={() => openMeetingEditor()}>Schedule Meeting</ActionButton>
                    </div>

                    {meetingOpen && (
                      <div className="px-5 py-4 bg-accent/5 border-b border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Meeting Type</div>
                            <input value={meetingForm.type} onChange={e => setMeetingForm(f => ({ ...f, type: e.target.value }))}
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors" />
                          </div>
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Date</div>
                            <input type="date" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))}
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors" />
                          </div>
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Time</div>
                            <input type="time" value={meetingForm.time} onChange={e => setMeetingForm(f => ({ ...f, time: e.target.value }))}
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors" />
                          </div>
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Method</div>
                            <select value={meetingForm.format} onChange={e => setMeetingForm(f => ({ ...f, format: e.target.value as any }))}
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors">
                              <option value="Video Call">Video Call</option>
                              <option value="Phone Call">Phone Call</option>
                              <option value="In-Person">In-Person</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Status</div>
                            <select value={meetingForm.status} onChange={e => setMeetingForm(f => ({ ...f, status: e.target.value as any }))}
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors">
                              <option value="requested">Requested</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div className="md:col-span-2 xl:col-span-3">
                            <div className="text-[8px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Meeting Details</div>
                            <input value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Agenda, location, video link, prep notes..."
                              className="w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors" />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-[10px] text-muted-foreground">{editingMeetingId ? 'Updates are saved to the client portal schedule.' : 'New meetings are added to the client portal and the client receives a message.'}</div>
                          <div className="flex flex-wrap gap-2 sm:justify-end min-w-0">
                            <ActionButton variant="primary" disabled={meetingSaving || !meetingForm.type.trim() || !meetingForm.date || !meetingForm.time} onClick={handleSaveMeeting}>
                              {meetingSaving ? 'Saving…' : editingMeetingId ? 'Save Meeting' : 'Create Meeting'}
                            </ActionButton>
                            <ActionButton variant="neutral" onClick={() => { setMeetingOpen(false); setEditingMeetingId(null); }}>Cancel</ActionButton>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-border">
                    {meets.map((m: any) => {
                      const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                      return (
                        <div key={m.id} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <FmtIcon className="w-4 h-4 shrink-0 mt-0.5 text-accent" strokeWidth={1.5} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-0.5">
                                <div className="text-[12px] font-semibold text-foreground">{m.type}</div>
                                <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                              </div>
                              <div className="text-[10px] text-muted-foreground">{m.date} at {m.time} · {m.format}</div>
                              {m.notes && <div className="text-[10px] mt-0.5 text-muted-foreground">{m.notes}</div>}
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <ActionButton variant="neutral" icon={Edit3} className="!border-accent/30 !text-accent" onClick={() => openMeetingEditor(m)}>Edit</ActionButton>
                                {m.status === 'requested' && (
                                  <>
                                  <ActionButton variant="neutral" icon={CheckCircle2} className="!border-blue-500/30 !text-blue-500" onClick={() => handleMeetingConfirm(selectedClientId!, m.id, m.type, m.date, m.time)}>Confirm</ActionButton>
                                  <ActionButton variant="negative" icon={XCircle} onClick={() => handleMeetingCancel(selectedClientId!, m.id, m.type)}>Cancel</ActionButton>
                                  </>
                                )}
                                {m.status === 'confirmed' && (
                                  <ActionButton variant="positive" icon={CheckCircle2} onClick={async () => { await supabase.from('portal_meetings').update({ status: 'completed' }).eq('id', m.id); await refreshData(); }}>Complete</ActionButton>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {meets.length === 0 && <div className="px-5 py-14 text-center text-[12px] text-muted-foreground">No meetings yet.</div>}
                    </div>
                  </div>
                )}

                {/* Milestones sub-tab */}
                {clientSubTab === 'milestones' && (
                  <MilestoneManager clientId={selectedClientId} />
                )}

                {/* Notes sub-tab (#9) */}
                {clientSubTab === 'notes' && (
                  <div className="pdv2-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <div className="text-[8px] uppercase tracking-[0.3em] font-bold mb-2 text-muted-foreground">Internal note — visible to admin only</div>
                      <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                        placeholder="e.g. Called 7/11 — prefers morning meetings, budget may flex up. HOA approval still pending."
                        rows={3}
                        className="w-full text-[12px] outline-none resize-none rounded-lg border border-border bg-background text-foreground px-3.5 py-2.5 focus:border-accent transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNote(); }}
                      />
                      <div className="flex justify-end mt-2">
                        <ActionButton variant="primary" disabled={noteSaving || !noteDraft.trim()} onClick={handleSaveNote}>
                          {noteSaving ? 'Saving…' : 'Add Note'}
                        </ActionButton>
                      </div>
                    </div>
                    {adminNotes.length === 0 ? (
                      <div className="px-5 py-10 text-center text-[12px] text-muted-foreground">No notes yet. Add internal notes about this client above.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {adminNotes.map((n: any) => (
                          <div key={n.id} className="px-5 py-4">
                            <div className="flex items-center gap-3 mb-1.5">
                              <StickyNote className="w-3 h-3 shrink-0 text-accent" strokeWidth={1.5} />
                              <span className="text-[9px] font-bold text-accent">{n.author ?? BUILDER.name}</span>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[12px] leading-relaxed text-foreground">{n.body}</div>
                          </div>
                        ))}
                      </div>
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
              <div className="flex items-center gap-1.5 mb-5">
                {([['startproject', `Start Project (${startBriefs.length})`], ['contact', `Contact Forms (${contactForms.length})`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setLeadsSubTab(k); setExpandedLeadId(null); }}
                    className={`text-[9px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 rounded-lg transition-all border ${
                      leadsSubTab === k ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent'
                    }`}>
                    {l}
                  </button>
                ))}
                <div className="ml-auto">
                  <ActionButton variant="primary" icon={Download} onClick={() => {
                    const leads = leadsSubTab === 'startproject' ? startBriefs : contactForms;
                    exportCSV(`leads-${leadsSubTab}.csv`,
                      ['Name', 'Email', 'Phone', 'Type/Subject', 'Budget', 'Date'],
                      leads.map((l: any) => [l.name, l.email, l.phone || '', l.type || l.subject || '', l.budget || '', new Date(l.submittedAt || l.created_at).toLocaleDateString()])
                    );
                  }}>Export CSV</ActionButton>
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
                  '12plus':{ color: '#8A8580', bg: 'rgba(0,0,0,0.04)' },
                };
                const fmtScope = (raw: string) =>
                  (raw || '').split(',').map(s => SCOPE_LBL[s.trim()] || s.trim().replace(/_/g, ' ')).filter(Boolean).join('  ·  ');
                const fmtDate = (d: string) =>
                  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

                return (
                  <div className="pdv2-card overflow-hidden divide-y divide-border">
                    {startBriefs.length === 0 ? (
                      <div className="px-6 py-16 text-center">
                        <Inbox className="w-9 h-9 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1} />
                        <div className="text-[13px] font-medium mb-1 text-foreground">No project briefs yet</div>
                        <p className="text-[11px] text-muted-foreground">Submissions from the Start Project form will appear here.</p>
                      </div>
                    ) : startBriefs.map((s: any, idx: number) => {
                      const initials = (s.name || 'SP').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                      const urgency = TIMELINE_URGENCY[s.start_timeline] ?? { color: '#8A8580', bg: 'rgba(0,0,0,0.04)' };
                      const isExpanded = expandedLeadId === s.id;
                      const scopeLabel = fmtScope(s.scope || '');
                      const budgetLabel = BUDGET_LBL[s.budget] || (s.budget || '—');
                      const timelineLabel = TIMELINE_LBL[s.start_timeline] || (s.start_timeline || '—');
                      const priorities: string[] = Array.isArray(s.priorities) ? s.priorities : [];

                      return (
                        <div key={s.id}>

                          {/* ── Collapsed row ── */}
                          <div
                            className={`cursor-pointer px-5 py-3.5 transition-colors ${isExpanded ? 'bg-accent/5' : 'pdv2-row-hover'}`}
                            onClick={() => setExpandedLeadId(isExpanded ? null : s.id)}>

                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-full text-[10px] font-black bg-accent/10 text-accent">
                                {initials}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13px] font-bold text-foreground">{s.project_title || `${s.name || 'Unnamed'} Project`}</span>
                                  <StatusBadge label={s.type === 'commercial' ? 'Commercial' : 'Residential'} style={s.type === 'commercial' ? { bg: 'rgba(37,99,235,0.08)', color: '#2563eb' } : { bg: 'rgba(157,126,63,0.1)', color: AC }} />
                                  <StatusBadge label={timelineLabel} style={urgency} />
                                  <StatusBadge label={(LEAD_STAGES.find(stage => stage.value === (s.lead_status || 'lead_capture')) ?? LEAD_STAGES[0]).short}
                                    style={{ bg: `${(LEAD_STAGES.find(stage => stage.value === (s.lead_status || 'lead_capture')) ?? LEAD_STAGES[0]).color}14`, color: (LEAD_STAGES.find(stage => stage.value === (s.lead_status || 'lead_capture')) ?? LEAD_STAGES[0]).color }} />
                                </div>
                                <div className="text-[11px] mt-0.5 truncate text-muted-foreground">
                                  {s.name || 'Anonymous'} · {s.email}{s.phone ? ` · ${s.phone}` : ''}
                                  {scopeLabel ? ` · ${scopeLabel}` : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                {budgetLabel !== '—' && (
                                  <div className="hidden sm:block text-right">
                                    <div className="text-[8px] uppercase tracking-[0.24em] font-bold mb-0.5 text-muted-foreground">Budget</div>
                                    <div className="text-[12px] font-bold text-foreground">{budgetLabel}</div>
                                  </div>
                                )}
                                <div className="text-right">
                                  <div className="text-[8px] uppercase tracking-[0.24em] font-bold mb-0.5 text-muted-foreground">Submitted</div>
                                  <div className="text-[11px] font-medium text-foreground">{fmtDate(s.submitted_at || s.submittedAt)}</div>
                                </div>
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
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
                                <div className="border-t border-border">

                                  {/* Contact strip */}
                                  <div className="px-5 py-3 bg-accent/5 border-b border-border flex flex-wrap gap-x-7 gap-y-3">
                                    <div>
                                      <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1 text-muted-foreground">Email</div>
                                      <a href={`mailto:${s.email}`} className="text-[12px] font-medium text-accent no-underline hover:underline">{s.email}</a>
                                    </div>
                                    {s.phone && (
                                      <div>
                                        <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1 text-muted-foreground">Phone</div>
                                        <a href={`tel:${s.phone}`} className="text-[12px] font-medium text-foreground no-underline hover:underline">{s.phone}</a>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-[7.5px] uppercase tracking-[0.32em] font-bold mb-1 text-muted-foreground">Submitted</div>
                                      <div className="text-[12px] font-medium text-foreground">{fmtDate(s.submitted_at || s.submittedAt)}</div>
                                    </div>
                                  </div>

                                  {/* Two-column detail grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
                                    <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-4 text-muted-foreground">Project Details</div>
                                      <div className="flex flex-col gap-3.5">
                                        {[
                                          ['Project Title', s.project_title || `${s.name || 'Unnamed'} Project`],
                                          ['Project Type',  s.type === 'commercial' ? 'Commercial' : 'Residential'],
                                          ['Scope of Work', fmtScope(s.scope || '') || '—'],
                                          ['Square Footage', SQFT_LBL[s.sqft] || (s.sqft?.replace(/_/g, ' ') || '—')],
                                          ['Location',      s.location || '—'],
                                        ].map(([l, v]) => (
                                          <div key={l}>
                                            <div className="text-[7.5px] uppercase tracking-[0.26em] font-bold mb-0.5 text-muted-foreground">{l}</div>
                                            <div className="text-[12.5px] font-medium text-foreground leading-tight">{v}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="p-5">
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-4 text-muted-foreground">Investment & Timeline</div>
                                      <div className="flex flex-col gap-3.5">
                                        <div>
                                          <div className="text-[7.5px] uppercase tracking-[0.26em] font-bold mb-0.5 text-muted-foreground">Budget Range</div>
                                          <div className="text-[14px] font-bold text-foreground">{budgetLabel}</div>
                                        </div>
                                        <div>
                                          <div className="text-[7.5px] uppercase tracking-[0.26em] font-bold mb-1 text-muted-foreground">Start Timeline</div>
                                          <StatusBadge label={timelineLabel} style={urgency} />
                                        </div>
                                        {priorities.length > 0 && (
                                          <div>
                                            <div className="text-[7.5px] uppercase tracking-[0.26em] font-bold mb-1.5 text-muted-foreground">Client Priorities</div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {priorities.map((p: string) => (
                                                <StatusBadge key={p} label={p} style={{ bg: 'rgba(157,126,63,0.09)', color: AC }} />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes / description */}
                                  {s.description && (
                                    <div className="px-5 py-4 border-b border-border">
                                      <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-3 text-muted-foreground">Client Notes</div>
                                      <p className="text-[13px] leading-relaxed text-foreground m-0">{s.description}</p>
                                    </div>
                                  )}

                                  {/* Action bar */}
                                  <div className="px-5 py-3 bg-secondary/30 flex items-center gap-2 flex-wrap">
                                    <div className="w-full flex items-center justify-between gap-3 mb-1 pb-3 border-b border-border/70 flex-wrap">
                                      <div>
                                        <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground">Project Lifecycle</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">Awarding creates and links the delivery project automatically.</div>
                                      </div>
                                      <LeadLifecycleSelect value={s.lead_status} saving={leadStatusSaving === `start_project:${s.id}`}
                                        onChange={value => handleLeadStatusChange('start_project', s, value)} />
                                    </div>
                                    {s.email && (
                                      <>
                                        <a href={`mailto:${s.email}?subject=${encodeURIComponent('Your Houston Enterprise Project Brief — Next Steps')}&body=${encodeURIComponent(`Hi ${s.name?.split(' ')[0] || 'there'},\n\nThank you for submitting your project brief to Houston Enterprise. We've reviewed your details and would love to schedule a complimentary consultation.\n\nPlease feel free to reply to this email or call us at (281) 915-9595.\n\nBest,\n${BUILDER.name}\nHouston Enterprise · (281) 915-9595`)}`}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.18em] no-underline bg-foreground text-background">
                                          <Mail className="w-3 h-3" strokeWidth={2} /> Reply to Brief
                                        </a>
                                        <a href={`mailto:${s.email}?subject=${encodeURIComponent('Your Houston Enterprise Client Portal Invitation')}&body=${encodeURIComponent(`Hi ${s.name?.split(' ')[0] || 'there'},\n\nThank you for your interest in Houston Enterprise. I've set up a private client portal for you where you can track your project, share documents, and communicate directly with our team.\n\nPlease register at: ${window.location.origin}/portal\n\nYour account will be reviewed and approved within 1 business day.\n\nLooking forward to working with you.\n\nBest,\n${BUILDER.name}\nHouston Enterprise · (281) 915-9595`)}`}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.18em] no-underline bg-accent/10 text-accent border border-accent/30">
                                          <Mail className="w-3 h-3" strokeWidth={2} /> Invite to Portal
                                        </a>
                                      </>
                                    )}
                                    {s.phone && (
                                      <a href={`tel:${s.phone}`}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-[0.18em] no-underline border border-border text-muted-foreground">
                                        <Phone className="w-3 h-3" strokeWidth={2} /> Call
                                      </a>
                                    )}
                                    <div className="ml-auto text-[9px] text-muted-foreground">
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
                <div className="pdv2-card overflow-hidden divide-y divide-border">
                  {contactForms.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1} />
                      <div className="text-[12px] text-muted-foreground">No contact form submissions yet.</div>
                    </div>
                  ) : contactForms.slice().reverse().map((f: any, i: number) => (
                    <div key={f.id ?? f.email + String(i)} className="px-5 py-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="text-[12px] font-bold mb-0.5 text-foreground">{f.name}</div>
                          <div className="text-[10px] mb-2 text-muted-foreground">{f.email}{f.phone ? ` · ${f.phone}` : ''}</div>
                          <div className="text-[11px] leading-relaxed text-muted-foreground">{f.message || f.description || '—'}</div>
                        </div>
                        <div className="text-[9px] shrink-0 text-muted-foreground">
                          {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      {f.email && (
                        <a href={`mailto:${f.email}?subject=${encodeURIComponent('Your Houston Enterprise Client Portal Invitation')}&body=${encodeURIComponent(`Hi ${f.name || 'there'},\n\nThank you for reaching out to Houston Enterprise. We'd love to move forward with your project.\n\nI've set up a dedicated client portal where you can submit your project brief, track milestones, share documents, and communicate with our team directly.\n\nPlease register at: ${window.location.origin}/portal\n\nYour account will be reviewed and approved within 1 business day.\n\nBest,\n${BUILDER.name}\nHouston Enterprise · (281) 915-9595`)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] no-underline bg-accent/10 text-accent border border-accent/30">
                          <Mail className="w-3 h-3" strokeWidth={2} /> Invite to Portal
                        </a>
                      )}
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground">Project Lifecycle</div>
                          {f.converted_admin_project_id && <div className="text-[10px] text-positive mt-1">Linked delivery project created</div>}
                        </div>
                        <LeadLifecycleSelect value={f.lead_status} saving={leadStatusSaving === `contact:${f.id}`}
                          onChange={value => handleLeadStatusChange('contact', f, value)} />
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
              <DocumentsManager onChanged={refreshData} />
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
              <div className="pdv2-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-border">
                  <div className="text-[11px] font-bold uppercase tracking-wide flex-1">
                    All Scheduled Meetings — {pendingMeets.length} awaiting confirmation
                  </div>
                  <div className="flex gap-1">
                    {(['list', 'calendar'] as const).map(v => (
                      <button key={v} onClick={() => setMeetingsView(v)}
                        className={`flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                          meetingsView === v ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border'
                        }`}>
                        {v === 'list' ? <LayoutList className="w-3 h-3" strokeWidth={2} /> : <CalendarDays className="w-3 h-3" strokeWidth={2} />}
                        {v === 'list' ? 'List' : 'Calendar'}
                      </button>
                    ))}
                  </div>
                  <ActionButton variant="primary" icon={Download} onClick={() => exportCSV('meetings.csv',
                    ['Client', 'Type', 'Format', 'Date', 'Time', 'Status', 'Notes'],
                    sortedMeets.map(m => [clientName(m.clientId), m.type, m.format, m.date, m.time, m.status, m.notes || '']))}>
                    Export CSV
                  </ActionButton>
                </div>
                {allMeetList.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" strokeWidth={1} />
                    <div className="text-[12px] text-muted-foreground">No meetings yet.</div>
                  </div>
                ) : meetingsView === 'list' ? (
                  <div className="divide-y divide-border">
                    {sortedMeets.map((m: any) => {
                      const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                      return (
                        <div key={`${m.clientId}-${m.id}`} className="flex items-center gap-4 px-5 py-4">
                          <FmtIcon className="w-4 h-4 shrink-0 text-accent" strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[12px] font-bold text-foreground">{m.type}</span>
                              <span className="text-[10px] text-muted-foreground">with</span>
                              <button onClick={() => { setTab('clients'); setSelectedClientId(m.clientId); setClientSubTab('meetings'); }}
                                className="text-[11px] font-semibold text-accent hover:underline">
                                {clientName(m.clientId)}
                              </button>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{m.date} at {m.time} · {m.format}</div>
                          </div>
                          <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                          {m.status === 'requested' && (
                            <div className="flex gap-2">
                              <ActionButton variant="neutral" className="!border-blue-500/30 !text-blue-500" onClick={() => handleMeetingConfirm(m.clientId, m.id, m.type, m.date, m.time)}>Confirm</ActionButton>
                              <ActionButton variant="negative" onClick={() => handleMeetingCancel(m.clientId, m.id, m.type)}>Cancel</ActionButton>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Calendar view: date-grouped */
                  <div className="p-4 space-y-4">
                    {Object.entries(byDate).map(([date, dateMeets]) => (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-[8px] uppercase tracking-[0.32em] font-black px-2.5 py-1 rounded-lg bg-accent text-accent-foreground">
                            {date !== 'Unknown' ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown Date'}
                          </div>
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[9px] font-bold text-muted-foreground">{dateMeets.length} meeting{dateMeets.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1.5 ml-2">
                          {dateMeets.map((m: any) => {
                            const FmtIcon = m.format === 'Video Call' ? Video : m.format === 'Phone Call' ? Phone : MapPin;
                            return (
                              <div key={`cal-${m.clientId}-${m.id}`}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30 border border-border"
                                style={{ borderLeft: `3px solid ${meetStatusColor(m.status).color}` }}>
                                <span className="text-[11px] font-black w-12 shrink-0 tabular-nums text-accent">{m.time}</span>
                                <FmtIcon className="w-3.5 h-3.5 shrink-0" style={{ color: meetStatusColor(m.status).color }} strokeWidth={1.5} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-semibold text-foreground">{m.type}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    <button onClick={() => { setTab('clients'); setSelectedClientId(m.clientId); setClientSubTab('meetings'); }}
                                      className="text-accent hover:underline">
                                      {clientName(m.clientId)}
                                    </button>
                                    {' · '}{m.format}
                                  </div>
                                </div>
                                <StatusBadge label={m.status} style={meetStatusColor(m.status)} />
                                {m.status === 'requested' && (
                                  <div className="flex gap-1.5">
                                    <ActionButton variant="neutral" className="!border-blue-500/30 !text-blue-500" onClick={() => handleMeetingConfirm(m.clientId, m.id, m.type, m.date, m.time)}>Confirm</ActionButton>
                                    <ActionButton variant="negative" onClick={() => handleMeetingCancel(m.clientId, m.id, m.type)}>Cancel</ActionButton>
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

          {/* ══════ PROJECTS ══════ */}
          {tab === 'projects' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <ProjectManager />
            </motion.div>
          )}

          {/* ══════ PORTFOLIO ══════ */}
          {tab === 'portfolio' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <PortfolioManager onCountChange={setPortfolioCount} />
            </motion.div>
          )}

          {/* ══════ FINANCE DATA ══════ */}
          {tab === 'finance' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <FinanceDataPanel txns={finTxns} checks={finChecks} projects={finProjects} vendors={finVendors} />
            </motion.div>
          )}

          {/* ══════ ANALYTICS ══════ */}
          {tab === 'analytics' && (() => {
            /* ── Derived chart data ── */
            const briefCount    = Object.keys(briefs).length;
            const activeMsggers = Object.keys(allMsgs).filter(k => (allMsgs[k]?.length ?? 0) > 1).length;
            const avgMsgs       = clients.length > 0 ? Math.round(totalMsgs / clients.length) : 0;

            const funnelData = [
              { name: 'Registered', value: clients.length,  fill: '#3b82f6' },
              { name: 'Brief Sent', value: briefCount,       fill: AC },
              { name: 'Messaging',  value: activeMsggers,   fill: '#8b5cf6' },
            ];

            const leadData = [
              { name: 'Start Project', value: startBriefs.length,  fill: '#10b981' },
              { name: 'Contact Form',  value: contactForms.length, fill: '#f59e0b' },
              { name: 'Portal Reg.',   value: clients.length,       fill: '#3b82f6' },
            ];

            /* Monthly registrations — last 6 months */
            const now = new Date();
            const monthlyData = Array.from({ length: 6 }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
              const label = d.toLocaleDateString('en-US', { month: 'short' });
              const count = clients.filter((c: any) => {
                const cd = new Date(c.createdAt ?? c.created_at ?? 0);
                return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
              }).length;
              return { name: label, Registrations: count };
            });

            const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

            const tooltipStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 };
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Portal Registrations', value: clients.length,    color: '#3b82f6', icon: Users },
                    { label: 'Briefs Submitted',      value: briefCount,         color: AC,        icon: ClipboardList },
                    { label: 'Website Leads',          value: allLeads,           color: '#10b981', icon: Inbox },
                    { label: 'Active Conversations',   value: activeMsggers,     color: '#8b5cf6', icon: MessageSquare },
                    { label: 'Portfolio Projects',     value: portfolioCount,    color: '#ec4899', icon: Image },
                    { label: 'Avg Msgs / Client',      value: avgMsgs,           color: '#f59e0b', icon: TrendingUp },
                  ].map(s => (
                    <StatCard key={s.label} label={s.label} value={String(s.value)} icon={s.icon} trendColor={s.color} />
                  ))}
                </div>

                {/* Monthly registrations chart */}
                <div className="pdv2-card p-6">
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-4">
                    Monthly Portal Registrations (last 6 months)
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 700 }} />
                      <Line type="monotone" dataKey="Registrations" stroke={AC} strokeWidth={2} dot={{ r: 4, fill: AC }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Conversion funnel bar chart */}
                  <div className="pdv2-card p-6">
                    <div className="text-[11px] font-bold uppercase tracking-wide mb-4">
                      Portal Conversion Funnel
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--secondary)/0.4)' }} />
                        <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive>
                          {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Lead sources pie chart */}
                  <div className="pdv2-card p-6">
                    <div className="text-[11px] font-bold uppercase tracking-wide mb-4">
                      Lead Sources
                    </div>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={leadData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                            dataKey="value" paddingAngle={2} isAnimationActive>
                            {leadData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2.5 flex-1">
                        {leadData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                              <span className="text-[10px] text-muted-foreground">{d.name}</span>
                            </div>
                            <span className="text-[11px] font-bold tabular-nums text-foreground">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* ══════ NOTIFICATIONS ══════ */}
          {tab === 'notifications' && (() => {
            const HelpStatusColors: Record<string, { bg: string; color: string }> = {
              open:        { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },
              in_progress: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' },
              resolved:    { bg: 'rgba(16,185,129,0.08)', color: '#10b981' },
            };

            async function markResolved(reqId: string) {
              await (supabase as any).rpc('resolve_portal_help_request', {
                p_request_id:    reqId,
                p_resolver_name: BUILDER.name,
              });
              setHelpRequests(prev => prev.map((r: any) => r.id === reqId ? { ...r, status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: BUILDER.name } : r));
            }

            async function markInProgress(reqId: string) {
              await supabase.from('portal_help_requests').update({ status: 'in_progress' }).eq('id', reqId);
              setHelpRequests(prev => prev.map((r: any) => r.id === reqId ? { ...r, status: 'in_progress' } : r));
            }

            const openReqs     = helpRequests.filter((r: any) => r.status === 'open');
            const inProgReqs   = helpRequests.filter((r: any) => r.status === 'in_progress');
            const resolvedReqs = helpRequests.filter((r: any) => r.status === 'resolved');

            function RequestCard({ req }: { req: any }) {
              const sc    = HelpStatusColors[req.status] ?? HelpStatusColors.open;
              const cname = req.portal_clients?.name ?? clientName(req.client_id);
              const created = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
              return (
                <div className="pdv2-card p-5 mb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-bold text-foreground">{req.subject}</span>
                        <StatusBadge label={req.status.replace('_', ' ')} style={sc} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold">{cname}</span>
                        {req.project_title && <> · <span>{req.project_title}</span></>}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{created}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {req.status === 'open' && (
                        <ActionButton variant="neutral" className="!border-blue-500/30 !text-blue-500" onClick={() => markInProgress(req.id)}>In Progress</ActionButton>
                      )}
                      {req.status !== 'resolved' && (
                        <ActionButton variant="positive" icon={CheckSquare} onClick={() => markResolved(req.id)}>Resolve</ActionButton>
                      )}
                      {req.status !== 'resolved' && (
                        <ActionButton variant="neutral" className="!border-accent/30 !text-accent" onClick={() => { setTab('clients'); setSelectedClientId(req.client_id); setClientSubTab('messages'); }}>Reply →</ActionButton>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{req.message}</p>
                  {req.resolved_by && (
                    <div className="mt-2.5 text-[10px] text-positive">Resolved by {req.resolved_by} · {req.resolved_at ? new Date(req.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
                  )}
                </div>
              );
            }

            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <div>
                    <div className="text-[8px] font-bold tracking-[0.46em] uppercase text-accent mb-1.5">Client Portal</div>
                    <div className="text-[22px] font-bold text-foreground">Help Requests</div>
                  </div>
                  <ActionButton variant="neutral" icon={RefreshCw} onClick={refreshData}>Refresh</ActionButton>
                </div>

                {helpRequests.length === 0 && (
                  <div className="text-center py-16">
                    <Bell className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1} />
                    <div className="text-[20px] font-bold text-foreground mb-2">All clear</div>
                    <p className="text-[13px] text-muted-foreground">No help requests from clients yet.</p>
                  </div>
                )}

                {openReqs.length > 0 && (
                  <div className="mb-7">
                    <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-warning mb-3">Open · {openReqs.length}</div>
                    {openReqs.map((r: any) => <RequestCard key={r.id} req={r} />)}
                  </div>
                )}

                {inProgReqs.length > 0 && (
                  <div className="mb-7">
                    <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-blue-500 mb-3">In Progress · {inProgReqs.length}</div>
                    {inProgReqs.map((r: any) => <RequestCard key={r.id} req={r} />)}
                  </div>
                )}

                {resolvedReqs.length > 0 && (
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-positive mb-3">Resolved · {resolvedReqs.length}</div>
                    {resolvedReqs.map((r: any) => <RequestCard key={r.id} req={r} />)}
                  </div>
                )}
              </motion.div>
            );
          })()}

          {/* ══════ TEAM HELP REQUESTS (support-admin only) ══════ */}
          {tab === 'help_desk' && (() => {
            if (!isSupportAdmin) {
              return (
                <div className="text-center py-16">
                  <LifeBuoy className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1} />
                  <div className="text-[20px] font-bold text-foreground mb-2">Restricted</div>
                  <p className="text-[13px] text-muted-foreground">This inbox is only visible to the support admin account.</p>
                </div>
              );
            }

            const TeamHelpStatusColors: Record<string, { bg: string; color: string }> = {
              open:        { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
              in_progress: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' },
              resolved:    { bg: 'rgba(16,185,129,0.08)', color: '#10b981' },
            };

            const openReqs     = teamHelpRequests.filter(r => r.status === 'open');
            const inProgReqs   = teamHelpRequests.filter(r => r.status === 'in_progress');
            const resolvedReqs = teamHelpRequests.filter(r => r.status === 'resolved');

            function TeamHelpCard({ req }: { req: HelpRequest }) {
              const sc = TeamHelpStatusColors[req.status] ?? TeamHelpStatusColors.open;
              const { data: screenshotUrl } = useHelpRequestScreenshotUrl(req.screenshot_path);
              const created = new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
              return (
                <div className="pdv2-card p-5 mb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-bold text-foreground">{HELP_CATEGORY_LABELS[req.category]}</span>
                        <StatusBadge label={req.status.replace('_', ' ')} style={sc} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold">{req.user_name || req.user_email}</span>
                        {req.page_path && <> · <span className="font-mono">{req.page_path}</span></>}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{created}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {req.status === 'open' && (
                        <ActionButton variant="neutral" className="!border-blue-500/30 !text-blue-500" onClick={() => updateHelpRequestStatus.mutate({ id: req.id, status: 'in_progress' })}>In Progress</ActionButton>
                      )}
                      {req.status !== 'resolved' && (
                        <ActionButton variant="positive" icon={CheckSquare} onClick={() => updateHelpRequestStatus.mutate({ id: req.id, status: 'resolved' })}>Resolve</ActionButton>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{req.message}</p>
                  {screenshotUrl && (
                    <button type="button" onClick={() => setHelpLightboxUrl(screenshotUrl)} className="mt-3 block w-full border border-border overflow-hidden hover:opacity-90 transition-opacity">
                      <img src={screenshotUrl} alt="Screen capture from requester" className="w-full max-h-64 object-cover object-top" />
                    </button>
                  )}
                  {req.resolved_at && (
                    <div className="mt-2.5 text-[10px] text-positive">Resolved {new Date(req.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  )}
                </div>
              );
            }

            return (
              <>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div>
                      <div className="text-[8px] font-bold tracking-[0.46em] uppercase text-accent mb-1.5">Team Support</div>
                      <div className="text-[22px] font-bold text-foreground">Help Requests</div>
                      <p className="text-[11px] text-muted-foreground mt-1">Filed by staff typing "help" anywhere in the finance app — updates arrive here live.</p>
                    </div>
                  </div>

                  {teamHelpRequests.length === 0 && (
                    <div className="text-center py-16">
                      <LifeBuoy className="w-10 h-10 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1} />
                      <div className="text-[20px] font-bold text-foreground mb-2">All clear</div>
                      <p className="text-[13px] text-muted-foreground">No one has typed "help" yet — requests will appear here in real time.</p>
                    </div>
                  )}

                  {openReqs.length > 0 && (
                    <div className="mb-7">
                      <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-warning mb-3">Open · {openReqs.length}</div>
                      {openReqs.map(r => <TeamHelpCard key={r.id} req={r} />)}
                    </div>
                  )}
                  {inProgReqs.length > 0 && (
                    <div className="mb-7">
                      <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-blue-500 mb-3">In Progress · {inProgReqs.length}</div>
                      {inProgReqs.map(r => <TeamHelpCard key={r.id} req={r} />)}
                    </div>
                  )}
                  {resolvedReqs.length > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.36em] text-positive mb-3">Resolved · {resolvedReqs.length}</div>
                      {resolvedReqs.map(r => <TeamHelpCard key={r.id} req={r} />)}
                    </div>
                  )}
                </motion.div>

                {helpLightboxUrl && (
                  <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6" onClick={() => setHelpLightboxUrl(null)}>
                    <button type="button" className="absolute top-5 right-5 text-white/80 hover:text-white" onClick={() => setHelpLightboxUrl(null)}>
                      <XIcon className="w-6 h-6" />
                    </button>
                    <img src={helpLightboxUrl} alt="Screen capture, enlarged" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
                  </div>
                )}
              </>
            );
          })()}

          {/* ══════ CHANGELOG ══════ */}
          {tab === 'changelog' && (() => {
            const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
              created:    { bg: 'rgba(16,185,129,0.08)',  color: '#10b981' },
              approved:   { bg: 'rgba(16,185,129,0.08)',  color: '#10b981' },
              confirmed:  { bg: 'rgba(59,130,246,0.08)',  color: '#3b82f6' },
              updated:    { bg: 'rgba(59,130,246,0.08)',  color: '#3b82f6' },
              message_sent: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' },
              rejected:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
              cancelled:  { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
              deleted:    { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
              resolved:   { bg: 'rgba(139,92,246,0.08)',  color: '#8b5cf6' },
            };
            const DASH_COLORS: Record<string, string> = {
              admin:   AC, finance: '#3b82f6', portal: '#10b981', public: '#8A8580',
            };

            const allDashboards = ['all', ...Array.from(new Set(changelogEntries.map((e: any) => e.dashboard)))];
            const allEntities   = ['all', ...Array.from(new Set(changelogEntries.map((e: any) => e.entity)))];

            const filtered = changelogEntries.filter((e: any) => {
              if (clDashFilter !== 'all' && e.dashboard !== clDashFilter) return false;
              if (clEntityFilter !== 'all' && e.entity !== clEntityFilter) return false;
              if (clSearch) {
                const q = clSearch.toLowerCase();
                if (
                  !e.action?.toLowerCase().includes(q) &&
                  !e.entity?.toLowerCase().includes(q) &&
                  !e.entity_label?.toLowerCase().includes(q) &&
                  !e.changed_by?.toLowerCase().includes(q) &&
                  !e.dashboard?.toLowerCase().includes(q)
                ) return false;
              }
              return true;
            });

            function exportChangelogPDF() {
              try {
                const { doc, y } = makeDoc('Changelog', 'Admin Changelog · Audit Trail');

                const rows = filtered.map((e: any) => [
                  new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
                  e.action?.replace(/_/g, ' ') ?? '—',
                  e.entity?.replace(/_/g, ' ') ?? '—',
                  e.dashboard ?? '—',
                  e.entity_label ?? '—',
                  e.changed_by ?? '—',
                ]);

                autoTable(doc, {
                  ...tblCfg(y),
                  head: [['Timestamp', 'Action', 'Entity', 'Dashboard', 'Item', 'Changed By']],
                  body: rows,
                  columnStyles: { 0: { cellWidth: 36 }, 5: { cellWidth: 26 } },
                });

                addDecorations(doc, 'Changelog');
                doc.save(`hou-changelog-${todayLocalDate()}.pdf`);
              } catch { toast({ title: 'PDF export failed', description: 'Please try again.' }); }
            }

            async function exportChangelogExcel() {
              try {
                const headers = ['Timestamp', 'Action', 'Entity', 'Dashboard', 'Item / Label', 'Changed By', 'Details'];
                const rows = filtered.map((e: any) => [
                  new Date(e.created_at).toLocaleString('en-US'),
                  e.action?.replace(/_/g, ' ') ?? '',
                  e.entity?.replace(/_/g, ' ') ?? '',
                  e.dashboard ?? '',
                  e.entity_label ?? '',
                  e.changed_by ?? '',
                  e.details ? JSON.stringify(e.details) : '',
                ]);
                const ws = buildSheet({
                  name: 'Changelog', headers, rows,
                  colWidths: [28, 18, 18, 14, 28, 20, 40],
                }, 'Admin Changelog');
                await writeWorkbook([{ ws, name: 'Changelog' }], `hou-changelog-${todayLocalDate()}.xlsx`);
              } catch { toast({ title: 'Excel export failed', description: 'Please try again.' }); }
            }

            const fmtTime = (ts: string) => new Date(ts).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            });

            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
                  <div>
                    <div className="text-[8px] font-bold tracking-[0.46em] uppercase text-accent mb-1.5">Audit Trail</div>
                    <div className="text-[22px] font-bold text-foreground">Changelog</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Permanent record of every change made across all dashboards</div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <ActionButton variant="neutral" icon={RefreshCw} onClick={refreshData}>Refresh</ActionButton>
                    <ActionButton variant="neutral" icon={FileDown} onClick={exportChangelogPDF}>PDF</ActionButton>
                    <ActionButton variant="primary" icon={FileDown} onClick={exportChangelogExcel}>Excel</ActionButton>
                  </div>
                </div>

                {/* Filters */}
                <div className="pdv2-card flex flex-wrap gap-2.5 p-3.5 mb-5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <input
                      value={clSearch} onChange={e => setClSearch(e.target.value)}
                      placeholder="Search entries…"
                      className="w-full rounded-lg border border-border bg-secondary/30 text-foreground text-[11px] outline-none pl-7 pr-3 py-2 focus:border-accent transition-colors"
                    />
                  </div>
                  <select value={clDashFilter} onChange={e => setClDashFilter(e.target.value)}
                    className="rounded-lg border border-border bg-background text-foreground text-[11px] outline-none px-2.5 py-2 cursor-pointer">
                    {allDashboards.map(d => <option key={d} value={d}>{d === 'all' ? 'All Dashboards' : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                  <select value={clEntityFilter} onChange={e => setClEntityFilter(e.target.value)}
                    className="rounded-lg border border-border bg-background text-foreground text-[11px] outline-none px-2.5 py-2 cursor-pointer">
                    {allEntities.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e.replace(/_/g, ' ')}</option>)}
                  </select>
                  <div className="text-[10px] text-muted-foreground self-center ml-1 whitespace-nowrap">
                    {filtered.length} of {changelogEntries.length} entries
                  </div>
                </div>

                {/* Empty state */}
                {changelogEntries.length === 0 && (
                  <div className="text-center py-16">
                    <History className="w-10 h-10 mx-auto mb-4 text-muted-foreground/35" strokeWidth={1} />
                    <div className="text-[20px] font-bold text-foreground mb-2">No entries yet</div>
                    <p className="text-[12px] text-muted-foreground">
                      Changelog entries appear here as you make changes across the dashboards.
                      <br/>You may need to run the migration SQL in the Supabase dashboard first.
                    </p>
                  </div>
                )}

                {/* Timeline */}
                {filtered.length > 0 && (
                  <VerticalTimeline
                    entries={filtered.map((entry: any, idx: number) => {
                      const sc = ACTION_COLORS[entry.action] ?? { bg: 'rgba(138,133,128,0.08)', color: '#8A8580' };
                      const dc = DASH_COLORS[entry.dashboard] ?? '#8A8580';
                      const details = entry.details ?? {};
                      const hasDetails = Object.keys(details).length > 0;
                      return {
                        id: String(entry.id ?? idx),
                        icon: <History className="w-3.5 h-3.5" style={{ color: sc.color }} strokeWidth={1.5} />,
                        iconStyle: { backgroundColor: sc.bg },
                        title: (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge label={entry.action?.replace(/_/g, ' ') ?? 'unknown'} style={sc} />
                              <span className="text-[11px] font-semibold text-foreground">
                                {entry.entity?.replace(/_/g, ' ')}
                                {entry.entity_label && <span className="font-normal text-muted-foreground"> · {entry.entity_label}</span>}
                              </span>
                            </div>
                            <span className="text-[7.5px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${dc}12`, color: dc }}>
                              {entry.dashboard}
                            </span>
                          </div>
                        ),
                        body: (
                          <div className="flex flex-wrap gap-3.5">
                            <span>By <span className="font-semibold text-foreground">{entry.changed_by}</span></span>
                            <span>{fmtTime(entry.created_at)}</span>
                            {hasDetails && Object.entries(details).slice(0, 3).map(([k, v]) => (
                              <span key={k}>{k}: <span className="text-foreground font-medium">{String(v).slice(0, 60)}</span></span>
                            ))}
                          </div>
                        ),
                      };
                    })}
                  />
                )}
              </motion.div>
            );
          })()}

        </div>}

        {/* Mobile bottom spacer */}
        <div className="md:hidden h-16 shrink-0" />
        </main>
      </div>

      {/* Mobile bottom toolbar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch h-[60px] bg-background border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Overview */}
        <button onClick={() => setTab('overview')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${tab === 'overview' ? 'text-accent' : 'text-muted-foreground'}`}>
          <BarChart3 className="w-4 h-4" strokeWidth={tab === 'overview' ? 2 : 1.5} />
          <span className={`text-[7px] uppercase tracking-[0.1em] ${tab === 'overview' ? 'font-bold' : 'font-medium'}`}>Overview</span>
        </button>

        {/* Approvals */}
        <button onClick={() => { setTab('approvals'); setSelectedClientId(null); }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${tab === 'approvals' ? 'text-accent' : pendingApprovals.length > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
          <div className="relative">
            <ShieldCheck className="w-4 h-4" strokeWidth={tab === 'approvals' ? 2 : 1.5} />
            {pendingApprovals.length > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[13px] h-[13px] rounded-full bg-warning text-white text-[7px] font-extrabold flex items-center justify-center leading-none">
                {pendingApprovals.length > 9 ? '9+' : pendingApprovals.length}
              </span>
            )}
          </div>
          <span className={`text-[7px] uppercase tracking-[0.1em] ${tab === 'approvals' ? 'font-bold' : 'font-medium'}`}>Approvals</span>
        </button>

        {/* Clients */}
        <button onClick={() => { setTab('clients'); setSelectedClientId(null); }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${tab === 'clients' ? 'text-accent' : 'text-muted-foreground'}`}>
          <Users className="w-4 h-4" strokeWidth={tab === 'clients' ? 2 : 1.5} />
          <span className={`text-[7px] uppercase tracking-[0.1em] ${tab === 'clients' ? 'font-bold' : 'font-medium'}`}>Clients</span>
        </button>

        {/* Notifications */}
        <button onClick={() => { setTab('notifications'); setSelectedClientId(null); }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${tab === 'notifications' ? 'text-accent' : openHelpCount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
          <div className="relative">
            <Bell className="w-4 h-4" strokeWidth={tab === 'notifications' ? 2 : 1.5} />
            {openHelpCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[13px] h-[13px] rounded-full bg-warning text-white text-[7px] font-extrabold flex items-center justify-center leading-none">
                {openHelpCount > 9 ? '9+' : openHelpCount}
              </span>
            )}
          </div>
          <span className={`text-[7px] uppercase tracking-[0.1em] ${tab === 'notifications' ? 'font-bold' : 'font-medium'}`}>Alerts</span>
        </button>

        {/* Menu */}
        <button onClick={() => setMobileNavOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors text-muted-foreground">
          <Menu className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[7px] uppercase tracking-[0.1em] font-medium">Menu</span>
        </button>
      </nav>
    </div>
  );
}
