import { useMemo, useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProjects, useChecks, useTransactions, useUpsert } from '@/hooks/useFinance';
import { useProjectFinancialSummary } from '@/hooks/useConstructionFinance';
import { usePortalClients } from '@/hooks/usePortalClients';
import { useRole } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD, fmtDate, fmtBytes, todayLocalDate } from '@/lib/format';
import { generateProjectReport, savePDF, downloadCSV } from '@/lib/reports';
import {
  useProjectDocuments, useUploadDocument, useDeleteDocument,
  DOC_TYPE_LABELS, DocType,
} from '@/hooks/useDocuments';
import {
  ArrowLeft, Download, FileText, ArrowUpRight, Plus, ExternalLink,
  Users, LayoutDashboard, Upload, Trash2, File, Image, Eye, Camera,
  ChevronRight, Pencil, Check, X, FolderOpen, Link2,
  Receipt, ClipboardList, ClipboardCheck, ShieldCheck, Mail,
  TrendingUp, Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ProjectBreakdown from '@/components/ProjectBreakdown';
import { PDV2_CSS } from '@/components/project-detail/cardStyles';
import { DonutChart } from '@/components/project-detail/DonutChart';
import { TrendLineChart } from '@/components/project-detail/TrendLineChart';
import { MilestoneTimeline } from '@/components/project-detail/MilestoneTimeline';
import { ActivityFeedCard } from '@/components/project-detail/ActivityFeedCard';
import { DocumentsCard } from '@/components/project-detail/DocumentsCard';
import { ProjectDetailsCard } from '@/components/project-detail/ProjectDetailsCard';
import { ProjectGantt } from '@/components/project-detail/ProjectGantt';
import { FlushTabs } from '@/components/project-detail/FlushTabs';
import { ProjectWorkflowPanel } from '@/components/project-detail/ProjectWorkflowPanel';
import { usePagination } from '@/hooks/usePagination';
import { PaginationBar } from '@/components/PaginationBar';

/* ── Status config ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  active:    { label: 'Active',    color: 'var(--positive)', cls: 'bg-positive/10 text-positive border-positive/30',      hex: '#10b981' },
  on_hold:   { label: 'On Hold',   color: 'var(--warning)',  cls: 'bg-warning/10 text-warning border-warning/30',          hex: '#f59e0b' },
  completed: { label: 'Completed', color: '#3b82f6',         cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',       hex: '#3b82f6' },
  archived:  { label: 'Archived',  color: 'var(--border)',   cls: 'bg-muted/50 text-muted-foreground border-border',       hex: '#6b7280' },
} as const;
type StatusKey = keyof typeof STATUS_META;

const COST_TYPE_LABELS: Record<string, string> = {
  labor: 'Labor', material: 'Materials', subcontract: 'Subcontract',
  permit: 'Permits & Fees', equipment: 'Equipment', overhead: 'Overhead',
};

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'contract',       label: 'Contract' },
  { value: 'permit',         label: 'Permit' },
  { value: 'invoice',        label: 'Invoice' },
  { value: 'receipt',        label: 'Receipt' },
  { value: 'insurance',      label: 'Insurance' },
  { value: 'photo',          label: 'Site Photo' },
  { value: 'check_image',    label: 'Check Image' },
  { value: 'tax',            label: 'Tax Document' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'other',          label: 'Other' },
];

const PD_CSS = `
.pd-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.16),transparent 170px);}
.pd-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 2px rgba(10,10,10,0.03);}
.pd-section{padding:14px 16px;}
.pd-row:hover td,.pd-row:hover{background-color:rgba(157,126,63,0.032)!important;}
.pd-doc-row:hover{background-color:rgba(157,126,63,0.025)!important;}
.pd-compact-table td,.pd-compact-table th{padding-top:9px!important;padding-bottom:9px!important;}
@media(max-width:639px){.pd-section{padding:12px}.pd-panel{box-shadow:0 1px 2px rgba(10,10,10,0.04)}}
.dark .pd-panel{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
`;

function FileIcon({ mimeType, className = 'w-4 h-4' }: { mimeType: string | null; className?: string }) {
  if (!mimeType) return <File className={className} strokeWidth={1.5} />;
  if (mimeType.startsWith('image/')) return <Image className={className} strokeWidth={1.5} />;
  return <FileText className={className} strokeWidth={1.5} />;
}


/* ── Tab type ── */
type Tab = 'overview' | 'documents' | 'photos' | 'activity' | 'breakdown' | 'fieldops';

export default function ProjectDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const role       = useRole();
  const isAdmin    = role === 'admin';
  const { entity } = useEntity();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('overview');

  /* ── Finance data ── */
  const { data: projects = [] } = useProjects();
  const { data: checks = [] }   = useChecks();
  const { data: income = [] }   = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: financeSummary } = useProjectFinancialSummary(id);

  /* ── Overview redesign: lightweight independent data (milestones, pending-item counts, recent events) ── */
  const [pdMilestones, setPdMilestones]   = useState<any[]>([]);
  const [pendingCounts, setPendingCounts] = useState({ changeOrders: 0, draws: 0, invoices: 0 });
  const [recentDraws, setRecentDraws]         = useState<any[]>([]);
  const [recentChangeOrders, setRecentChangeOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices]   = useState<any[]>([]);
  /* Gantt feeds — full reconciliation rows with their schedule dates */
  const [sovItems, setSovItems]   = useState<any[]>([]);
  const [ganttDraws, setGanttDraws] = useState<any[]>([]);
  const [ganttCOs, setGanttCOs]     = useState<any[]>([]);

  const loadOverviewData = async (projectId: string) => {
    (supabase as any).from('project_milestones').select('*').eq('project_id', projectId).order('sort_order')
      .then(({ data }: any) => setPdMilestones(data ?? []));

    (supabase as any).from('project_scope_items').select('id, name, percent_complete, contract_amount, change_order_amount, sort_order').eq('project_id', projectId).order('sort_order')
      .then(({ data }: any) => setSovItems(data ?? []));

    (supabase as any).from('draw_schedules').select('id, milestone_name, draw_amount, status, scheduled_date').eq('project_id', projectId).order('scheduled_date', { ascending: true })
      .then(({ data }: any) => setGanttDraws(data ?? []));

    (supabase as any).from('project_change_orders').select('id, title, co_number, amount, status, requested_date, approved_date, created_at').eq('project_id', projectId).order('created_at', { ascending: true })
      .then(({ data }: any) => setGanttCOs(data ?? []));

    (supabase as any).from('draw_schedules').select('id, milestone_name, draw_amount, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(5)
      .then(({ data }: any) => setRecentDraws(data ?? []));

    (supabase as any).from('project_change_orders').select('id, title, amount, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(5)
      .then(({ data }: any) => setRecentChangeOrders(data ?? []));

    (supabase as any).from('invoices').select('id, invoice_number, amount_paid, status, updated_at').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(5)
      .then(({ data }: any) => setRecentInvoices(data ?? []));

    Promise.all([
      (supabase as any).from('project_change_orders').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'pending'),
      (supabase as any).from('draw_schedules').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['pending', 'requested']),
      (supabase as any).from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', projectId).in('status', ['sent', 'overdue']),
    ]).then(([co, dr, inv]) => {
      setPendingCounts({ changeOrders: co.count ?? 0, draws: dr.count ?? 0, invoices: inv.count ?? 0 });
    });
  };

  useEffect(() => {
    if (!id) return;
    loadOverviewData(id);
  }, [id]);

  /* ── Live sync: refresh milestones/draws/change-orders/invoices when anyone
     changes them for this project, so the Overview tab never goes stale.
     Also invalidates the project-financial-summary RPC (contract value,
     committed costs, cash position) since it aggregates these same tables. ── */
  useEffect(() => {
    if (!id) return;
    const refresh = () => {
      loadOverviewData(id);
      qc.invalidateQueries({ queryKey: ['project-financial-summary', id] });
    };
    const channel = supabase
      .channel(`project-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_milestones', filter: `project_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draw_schedules', filter: `project_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_change_orders', filter: `project_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_add_ons', filter: `project_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_scope_items', filter: `project_id=eq.${id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `project_id=eq.${id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  /* ── Portal link info ── */
  const [portalClient, setPortalClient] = useState<any>(null);
  const [portalBrief, setPortalBrief]   = useState<any>(null);

  /* ── Documents ── */
  const { data: projectDocs = [], refetch: refetchDocs } = useProjectDocuments(id);
  const uploadDoc  = useUploadDocument();
  const deleteDoc  = useDeleteDocument();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState<DocType>('contract');
  const [uploadTitle, setUploadTitle]     = useState('');
  const [uploading, setUploading]         = useState(false);
  const [docUrls, setDocUrls]             = useState<Record<string, string>>({});

  /* ── Progress Photos ── */
  const [photos, setPhotos]                 = useState<any[]>([]);
  const photoInputRef                       = useRef<HTMLInputElement>(null);
  const [photoPhase, setPhotoPhase]         = useState('General');
  const [photoCaption, setPhotoCaption]     = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadPhotos = async () => {
    if (!id) return;
    const { data } = await (supabase as any).from('project_photos').select('*')
      .eq('project_id', id)
      .order('taken_at', { ascending: false });
    setPhotos(data ?? []);
  };
  useEffect(() => { loadPhotos(); }, [id]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    if (!project?.portal_client_id) { toast.error('Link this project to a portal client before uploading progress photos.'); return; }
    setUploadingPhoto(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `progress-photos/${id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from('portal-documents').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('portal-documents').getPublicUrl(path);
      const { error: insErr } = await (supabase as any).from('project_photos').insert({
        project_id: id,
        client_id: project.portal_client_id,
        phase_label: photoPhase.trim() || 'General',
        url: pub.publicUrl,
        caption: photoCaption.trim() || null,
        taken_at: todayLocalDate(),
      });
      if (insErr) throw insErr;
      toast.success('Photo uploaded — now visible in the client portal');
      setPhotoCaption('');
      await loadPhotos();
    } catch (err: any) {
      toast.error('Upload failed', { description: err?.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = async (photo: any) => {
    if (!confirm('Delete this photo?')) return;
    const marker = '/portal-documents/';
    const idx = String(photo.url ?? '').indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(photo.url.slice(idx + marker.length));
      await supabase.storage.from('portal-documents').remove([path]);
    }
    await (supabase as any).from('project_photos').delete().eq('id', photo.id);
    toast.success('Deleted');
    loadPhotos();
  };

  /* ── Edit project inline ── */
  const upsert = useUpsert('projects', [['projects']]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', code: '', budget: '', status: 'active' as StatusKey, notes: '', portal_client_id: '',
    location: '', department: '', client_name_snapshot: '',
    original_contract_value: '', current_contract_value: '', estimated_cost_to_complete: '',
    project_manager: '', contract_type: '', start_date: '', end_date: '',
  });
  const { data: portalClients = [] } = usePortalClients();

  /* ── Derived project data ── */
  const project = useMemo(() => projects.find((p: any) => p.id === id), [projects, id]);

  const editFormFromProject = (p: any) => ({
    name:   p.name ?? '',
    code:   p.code ?? '',
    budget: String(p.budget ?? ''),
    status: (p.status ?? 'active') as StatusKey,
    notes:  p.notes ?? '',
    portal_client_id: p.portal_client_id ?? '',
    location: p.location ?? '',
    department: p.department ?? '',
    client_name_snapshot: p.client_name_snapshot ?? '',
    original_contract_value: String(p.original_contract_value ?? ''),
    current_contract_value: String(p.current_contract_value ?? ''),
    estimated_cost_to_complete: String(p.estimated_cost_to_complete ?? ''),
    project_manager: p.project_manager ?? '',
    contract_type: p.contract_type ?? '',
    start_date: p.start_date ?? '',
    end_date: p.end_date ?? '',
  });

  useEffect(() => {
    if (!project) return;
    setEditForm(editFormFromProject(project));
  }, [project?.id]);

  /* ── Load portal client / brief if linked ── */
  useEffect(() => {
    if (!project) return;
    if (project.portal_client_id) {
      (supabase as any)
        .from('portal_clients')
        .select('id, name, email, phone, status')
        .eq('id', project.portal_client_id)
        .single()
        .then(({ data }: any) => setPortalClient(data));
    }
    if (project.portal_brief_id) {
      (supabase as any)
        .from('portal_briefs')
        .select('id, type, scope, budget, notes, status, submitted_at')
        .eq('id', project.portal_brief_id)
        .single()
        .then(({ data }: any) => setPortalBrief(data));
    }
  }, [project?.id, project?.portal_client_id, project?.portal_brief_id]);

  const enriched = useMemo(() => {
    if (!project) return null;
    const pChecks  = checks.filter((c: any) => c.project_id === project.id);
    const pIn      = income.filter((t: any) => t.project_id === project.id);
    const pExp     = expenses.filter((t: any) => t.project_id === project.id);
    const pInTotal = pIn.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pExpTotal = pExp.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const cleared  = pChecks.filter((c: any) => c.status === 'cleared').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const outstanding = pChecks.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0);
    const spent    = pExpTotal + cleared;
    const budget   = Number(project.budget);
    return {
      ...project,
      incoming: pInTotal,
      spent,
      outstanding,
      net: pInTotal - spent,
      used: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
      checkCount: pChecks.length,
      txnCount: pIn.length + pExp.length,
      incomeList: pIn,
      expenseList: pExp,
      checksList: pChecks,
    };
  }, [project, checks, income, expenses]);

  const recentActivity = useMemo(() => {
    if (!enriched) return [];
    const entries = [
      ...enriched.incomeList.map((t: any) => ({
        id: `income-${t.id}`, created_at: t.transaction_date,
        title: `Payment received${t.source_name ? ` from ${t.source_name}` : ''}`,
        amount: fmtUSD(t.amount), dotColor: 'bg-positive',
        icon: <Receipt className="w-3.5 h-3.5" />, iconClassName: 'bg-emerald-500/10 text-emerald-500',
      })),
      ...recentDraws.map((d: any) => ({
        id: `draw-${d.id}`, created_at: d.created_at,
        title: `Draw ${d.milestone_name} ${d.status === 'funded' ? 'funded' : d.status === 'requested' ? 'requested' : 'added'}`,
        amount: fmtUSD(d.draw_amount), dotColor: 'bg-blue-400',
        icon: <Wallet className="w-3.5 h-3.5" />, iconClassName: 'bg-blue-500/10 text-blue-400',
      })),
      ...recentChangeOrders.map((c: any) => ({
        id: `co-${c.id}`, created_at: c.created_at,
        title: `Change order "${c.title}" ${c.status === 'approved' ? 'approved' : c.status === 'rejected' ? 'rejected' : 'added'}`,
        amount: fmtUSD(c.amount), dotColor: c.status === 'approved' ? 'bg-positive' : c.status === 'rejected' ? 'bg-accent' : 'bg-warning',
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        iconClassName: c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : c.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500',
      })),
      ...recentInvoices.filter((i: any) => i.status === 'paid').map((i: any) => ({
        id: `inv-${i.id}`, created_at: i.updated_at,
        title: `Invoice #${i.invoice_number} paid`,
        amount: fmtUSD(i.amount_paid), dotColor: 'bg-positive',
        icon: <FileText className="w-3.5 h-3.5" />, iconClassName: 'bg-emerald-500/10 text-emerald-500',
      })),
    ];
    return entries
      .filter(e => e.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(e => ({ ...e, timestamp: fmtDate(e.created_at) }));
  }, [enriched, recentDraws, recentChangeOrders, recentInvoices]);

  const sortedActivity = useMemo(() => {
    if (!enriched) return [];
    return [
      ...enriched.incomeList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Income',  ref: t.source_name || '—',                              amount:  Number(t.amount) })),
      ...enriched.expenseList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Expense', ref: t.vendors?.name || t.category || '—',              amount: -Number(t.amount) })),
      ...enriched.checksList.map((c: any)  => ({ id: c.id, date: c.issue_date,       type: 'Check',   ref: `#${c.check_number} · ${c.payee_name}`,           amount: -Number(c.amount) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [enriched]);

  const ACTIVITY_PAGE_SIZE = 20;
  const { page: activityPage, setPage: setActivityPage, pageCount: activityPageCount, paged: pagedActivity } =
    usePagination(sortedActivity, ACTIVITY_PAGE_SIZE);
  const DOCS_PAGE_SIZE = 20;
  const { page: docsPage, setPage: setDocsPage, pageCount: docsPageCount, paged: pagedProjectDocs } =
    usePagination(projectDocs, DOCS_PAGE_SIZE);

  const costBreakdown = useMemo(() => {
    if (!enriched) return [];
    const byCat: Record<string, { category: string; actual: number; count: number }> = {};
    enriched.expenseList.forEach((t: any) => {
      const cat = (t.cost_type ? COST_TYPE_LABELS[t.cost_type] : null) || t.category || 'Uncategorized';
      if (!byCat[cat]) byCat[cat] = { category: cat, actual: 0, count: 0 };
      byCat[cat].actual += Number(t.amount);
      byCat[cat].count++;
    });
    if (enriched.checksList.length > 0) {
      byCat['Checks Issued'] = {
        category: 'Checks Issued',
        actual: enriched.checksList.reduce((s: number, c: any) => s + Number(c.amount), 0),
        count: enriched.checksList.length,
      };
    }
    return Object.values(byCat).sort((a, b) => b.actual - a.actual);
  }, [enriched]);

  const retainageHeld = useMemo(() => {
    if (!enriched) return 0;
    return enriched.checksList.reduce((s: number, c: any) => s + (Number(c.retainage_held) || 0), 0);
  }, [enriched]);

  /* ── Real monthly cash-flow series (last 12 months) — drives the Cash Flow chart and the ── */
  /* ── Budget Used / Forecast Profit / Cash Position sparklines. No fabricated data.        ── */
  const cashFlowSeries = useMemo(() => {
    if (!enriched) return [];
    const months: { key: string; period: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, period: d.toLocaleDateString('en-US', { month: 'short' }) });
    }
    const buckets: Record<string, { inflow: number; outflow: number }> = {};
    months.forEach(m => { buckets[m.key] = { inflow: 0, outflow: 0 }; });
    const bucketKey = (dateStr: string) => dateStr?.slice(0, 7);
    enriched.incomeList.forEach((t: any) => { const k = bucketKey(t.transaction_date); if (buckets[k]) buckets[k].inflow += Number(t.amount) || 0; });
    enriched.expenseList.forEach((t: any) => { const k = bucketKey(t.transaction_date); if (buckets[k]) buckets[k].outflow += Number(t.amount) || 0; });
    enriched.checksList.forEach((c: any) => { const k = bucketKey(c.issue_date); if (buckets[k]) buckets[k].outflow += Number(c.amount) || 0; });
    return months.map(m => ({
      period: m.period,
      inflow: buckets[m.key].inflow,
      outflow: buckets[m.key].outflow,
      net: buckets[m.key].inflow - buckets[m.key].outflow,
    }));
  }, [enriched]);

  /* ── Document actions ── */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    e.target.value = '';
    setUploading(true);
    try {
      await uploadDoc.mutateAsync({
        file,
        docType: uploadDocType,
        title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
        linked_project_id: id,
        runOcr: file.type.startsWith('image/'),
      });
      setUploadTitle('');
      toast.success('Document uploaded');
      refetchDocs();
    } catch (e: any) { toast.error(e?.message ?? 'Upload failed'); }
    setUploading(false);
  };

  const openDocument = async (doc: any) => {
    if (docUrls[doc.id]) { window.open(docUrls[doc.id], '_blank'); return; }
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        setDocUrls(u => ({ ...u, [doc.id]: data.signedUrl }));
        window.open(data.signedUrl, '_blank');
      }
    } catch { toast.error('Failed to open document'); }
  };

  const handleDeleteDoc = async (doc: any) => {
    try {
      await deleteDoc.mutateAsync(doc);
      toast.success('Document removed');
      refetchDocs();
    } catch { toast.error('Failed to delete document'); }
  };

  /* ── Edit project save ── */
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !id) return;
    try {
      await upsert.mutateAsync({
        id, ...editForm,
        budget: parseFloat(editForm.budget) || 0,
        portal_client_id: editForm.portal_client_id || null,
        original_contract_value: parseFloat(editForm.original_contract_value) || 0,
        current_contract_value: parseFloat(editForm.current_contract_value) || 0,
        estimated_cost_to_complete: parseFloat(editForm.estimated_cost_to_complete) || 0,
        project_manager: editForm.project_manager || null,
        contract_type: editForm.contract_type || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
      } as any);
      toast.success('Project updated');
      setEditOpen(false);
    } catch { toast.error('Failed to save'); }
  };

  /* ── Exports ── */
  const exportPDF = () => {
    if (!enriched) return;
    const doc = generateProjectReport([enriched], entity?.name);
    savePDF(doc, `hou-project-${enriched.name.toLowerCase().replace(/\s+/g, '-')}-${todayLocalDate()}.pdf`);
    toast.success('Project report exported');
  };
  const exportCSV = () => {
    if (!sortedActivity) return;
    downloadCSV(sortedActivity, `hou-project-activity-${todayLocalDate()}.csv`,
      ['Date', 'Type', 'Reference', 'Amount'], (r: any) => [r.date?.slice(0, 10), r.type, r.ref, r.amount]);
    toast.success('Activity exported');
  };

  /* ── Early returns ── */
  if (!project) return (
    <AppShell>
      <div className="p-8 text-center text-muted-foreground">Project not found.</div>
    </AppShell>
  );
  if (!enriched) return null;

  const statusMeta = STATUS_META[enriched.status as StatusKey] ?? STATUS_META.archived;
  const projectSummary = financeSummary;
  const TABS: { key: Tab; label: string; short: string; count?: number; icon: any }[] = [
    { key: 'overview',   label: 'Overview', short: 'Overview', icon: LayoutDashboard },
    { key: 'breakdown',  label: 'Houston Enterprise Reconciliation', short: 'Reconciliation', icon: ShieldCheck },
    { key: 'fieldops',   label: 'Field Ops', short: 'Field Ops', icon: ClipboardCheck },
    { key: 'documents',  label: 'Documents', short: 'Documents', count: projectDocs.length, icon: FolderOpen },
    { key: 'photos',     label: 'Progress Photos', short: 'Photos', count: photos.length, icon: Camera },
    { key: 'activity',   label: 'Activity', short: 'Activity', count: sortedActivity.length, icon: Receipt },
  ];
  const openItemsTotal = pendingCounts.changeOrders + pendingCounts.draws + pendingCounts.invoices;
  const clientDisplayName = portalClient?.name || enriched.client_name_snapshot || null;

  return (
    <AppShell>
      <style>{PD_CSS}</style>
      <style>{PDV2_CSS}</style>

      {/* ── Page Header ── */}
      <PageHeader
        eyebrow={
          <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> Projects
          </button>
        }
        title={enriched.name}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            {enriched.code && <span className="font-mono-tab text-[10px] font-bold bg-secondary px-1.5 py-0.5">{enriched.code}</span>}
            <span className={`text-[8px] uppercase tracking-[0.22em] font-bold px-1.5 py-0.5 border ${statusMeta.cls}`}>{statusMeta.label}</span>
            {entity && <span className="text-[9px] text-muted-foreground">{entity.name}</span>}
            {portalClient && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Link2 className="w-2.5 h-2.5" strokeWidth={2} /> {portalClient.name}
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button onClick={() => navigate('/admin')}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-[9px] uppercase tracking-[0.18em] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
                <LayoutDashboard className="w-3 h-3" /> Admin
              </button>
            )}
            <button onClick={() => { setEditForm(editFormFromProject(enriched)); setEditOpen(true); }}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-[9px] uppercase tracking-[0.18em] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportPDF}><FileText className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="rounded-none h-9 w-9 hidden sm:flex" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
          </div>
        }
      />

      {/* Mobile actions */}
      <div className="sm:hidden px-4 py-3 border-b border-border flex gap-2">
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={() => { setEditForm(editFormFromProject(enriched)); setEditOpen(true); }}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
        </Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      {/* Edit project dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-none sm:max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-[8px] uppercase tracking-[0.32em] font-bold text-muted-foreground mb-0.5">Edit Project</div>
            <DialogTitle className="text-lg font-semibold">Edit {enriched.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-5 pt-2">

            {/* Identity */}
            <div className="space-y-3">
              <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground border-b border-border pb-1.5">Identity</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="micro-label">Project Name</Label>
                  <Input className="rounded-none h-10" required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Code / ID</Label>
                  <Input className="rounded-none h-10 font-mono-tab" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} placeholder="HOU-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Location</Label>
                  <Input className="rounded-none h-10" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Houston, TX" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Department</Label>
                  <Input className="rounded-none h-10" value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Commercial, Residential" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Project Manager</Label>
                  <Input className="rounded-none h-10" value={editForm.project_manager} onChange={e => setEditForm(f => ({ ...f, project_manager: e.target.value }))} placeholder="e.g. Hunain Qureshi" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Contract Type</Label>
                  <Input className="rounded-none h-10" value={editForm.contract_type} onChange={e => setEditForm(f => ({ ...f, contract_type: e.target.value }))} placeholder="e.g. Lump Sum, Cost-Plus" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Start Date</Label>
                  <DateInput className="h-10" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">End Date</Label>
                  <DateInput className="h-10" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-3">
              <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground border-b border-border pb-1.5">Financials</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Original Contract Value</Label>
                  <CurrencyInput value={editForm.original_contract_value} onValueChange={v => setEditForm(f => ({ ...f, original_contract_value: v }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Current Contract Value</Label>
                  <CurrencyInput value={editForm.current_contract_value} onValueChange={v => setEditForm(f => ({ ...f, current_contract_value: v }))} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Estimated Cost to Complete</Label>
                  <CurrencyInput value={editForm.estimated_cost_to_complete} onValueChange={v => setEditForm(f => ({ ...f, estimated_cost_to_complete: v }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Status</Label>
                  <Select value={editForm.status} onValueChange={(v: any) => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Legacy Budget (USD)</Label>
                <CurrencyInput value={editForm.budget} onValueChange={v => setEditForm(f => ({ ...f, budget: v }))} placeholder="0.00" />
                <p className="text-[10px] text-muted-foreground">
                  Only used as a fallback when Contract Value above is 0 — the financial summary and reconciliation numbers prefer Contract Value.
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-3">
              <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground border-b border-border pb-1.5">Client</div>
              <div className="space-y-1.5">
                <Label className="micro-label flex items-center gap-1.5"><Link2 className="w-3 h-3" strokeWidth={2} /> Portal Client</Label>
                <Select
                  value={editForm.portal_client_id || '__none__'}
                  onValueChange={(v: string) => setEditForm(f => {
                    if (v === '__none__') return { ...f, portal_client_id: '' };
                    const picked = portalClients.find(c => c.id === v);
                    return {
                      ...f,
                      portal_client_id: v,
                      client_name_snapshot: f.client_name_snapshot || picked?.name || f.client_name_snapshot,
                    };
                  })}
                >
                  <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="No client linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No client linked —</SelectItem>
                    {portalClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Links this project to a client portal account — required for Progress Photos and the Portal Bridge card to work.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="micro-label">Client Name (display)</Label>
                <Input className="rounded-none h-10" value={editForm.client_name_snapshot} onChange={e => setEditForm(f => ({ ...f, client_name_snapshot: e.target.value }))} placeholder="Auto-filled from Portal Client" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="micro-label">Notes / Scope</Label>
              <textarea className="w-full rounded-none text-sm border border-border p-2.5 resize-none focus:outline-none focus:border-foreground/30" rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Client, address, scope…" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="rounded-none h-10 flex-1">Save Changes</Button>
              <Button type="button" variant="outline" className="rounded-none h-10" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="h-[3px]" style={{ backgroundColor: statusMeta.color }} />

      {/* ── Project navigation ── */}
      <div className="pd-shell">
        <div className="px-4 sm:px-8">
          <FlushTabs
            items={TABS.map(t => ({ key: t.key, label: t.short, icon: t.icon, count: t.count }))}
            activeKey={tab}
            onChange={key => setTab(key as Tab)}
            layoutId="pd-outer-tab-line"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="pd-section space-y-4">

          {/* ── Financial Summary / Budget vs Actual / Cash Flow / Project Details ── */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 items-stretch">
            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Financial Summary</div></div>
              <div className="p-4 space-y-2.5 text-[12px]">
                {(projectSummary ? [
                  ['Original Contract', fmtUSD(projectSummary.original_contract_value), false],
                  ['Change Orders', fmtUSD(projectSummary.approved_change_orders), false],
                  ['Revised Contract', fmtUSD(projectSummary.current_contract_value), true],
                  ['Total Billed', fmtUSD(projectSummary.total_invoiced), false],
                  ['Payments Received', fmtUSD(projectSummary.total_collected), false],
                  ['Balance Remaining', fmtUSD(projectSummary.current_contract_value - projectSummary.total_collected), true],
                ] : [
                  ['Contract Budget', fmtUSD(enriched.budget), false],
                  ['Deployed', fmtUSD(enriched.spent), false],
                  ['Revenue Collected', fmtUSD(enriched.incoming), false],
                  ['Net Position', fmtUSD(enriched.net), true],
                ]).map(([label, value, bold]) => (
                  <div key={label as string} className={`flex justify-between items-baseline ${bold ? 'pt-2 border-t border-border' : ''}`}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-mono-tab ${bold ? 'font-bold text-[13px] text-[#9D7E3F]' : 'font-semibold'}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3.5">
                <button onClick={() => setTab('breakdown')} className="pdv2-link">View full financial summary →</button>
              </div>
            </div>

            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Budget vs Actual</div></div>
              <div className="p-4">
                <DonutChart
                  centerValue={`${enriched.used.toFixed(1)}%`}
                  centerLabel="Budget Used"
                  slices={[
                    { label: 'Actual Costs', value: enriched.spent, color: '#9D7E3F' },
                    { label: 'Committed Costs', value: projectSummary ? Math.max(projectSummary.committed_project_costs - enriched.spent, 0) : 0, color: '#f59e0b' },
                    { label: 'Remaining Budget', value: Math.max(enriched.budget - enriched.spent, 0), color: '#e5e5e5' },
                  ]}
                />
                <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-border text-[11px]">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-mono-tab font-bold">{fmtUSD(enriched.budget)}</span>
                </div>
              </div>
              <div className="px-4 pb-3.5">
                <button onClick={() => setTab('breakdown')} className="pdv2-link">View budget details →</button>
              </div>
            </div>

            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Cash Flow Over Time</div></div>
              <div className="p-4">
                <TrendLineChart
                  data={cashFlowSeries}
                  series={[
                    { key: 'inflow', label: 'Inflow', color: '#10b981' },
                    { key: 'outflow', label: 'Outflow', color: '#ef4444' },
                    { key: 'net', label: 'Net Cash Flow', color: '#3b82f6' },
                  ]}
                />
              </div>
              <div className="px-4 pb-3.5">
                <button onClick={() => setTab('activity')} className="pdv2-link">View cash flow →</button>
              </div>
            </div>

            <ProjectDetailsCard
              data={{
                name: enriched.name,
                code: enriched.code,
                clientName: clientDisplayName,
                projectManager: enriched.project_manager,
                status: statusMeta.label,
                statusColor: enriched.status === 'active' ? 'bg-positive/15 text-positive' : enriched.status === 'on_hold' ? 'bg-warning/15 text-warning' : 'bg-secondary text-foreground',
                contractType: enriched.contract_type,
                startDate: enriched.start_date,
                endDate: enriched.end_date,
                location: enriched.location,
                department: enriched.department,
              }}
              onEdit={() => { setEditForm(editFormFromProject(enriched)); setEditOpen(true); }}
            />
          </div>

          {/* ── Key Milestones ── */}
          <div className="pdv2-card overflow-hidden">
            <div className="pdv2-card-header flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide">Key Milestones</div>
              <button onClick={() => setTab('breakdown')} className="pdv2-link">View all milestones →</button>
            </div>
            <div className="p-4">
              <MilestoneTimeline
                milestones={pdMilestones.slice(0, 6).map(m => ({
                  id: m.id, title: m.title,
                  date: m.actual_completion_date || m.planned_completion_date || m.planned_start_date,
                  status: m.status === 'completed' ? 'completed' : m.status === 'in_progress' ? 'active' : 'pending',
                  percentComplete: Number(m.percent_complete) || 0,
                }))}
              />
            </div>
          </div>

          {/* ── Reconciliation Schedule — Gantt ── */}
          <div className="pdv2-card overflow-hidden">
            <div className="pdv2-card-header flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide">Reconciliation Schedule</div>
              <button onClick={() => setTab('breakdown')} className="pdv2-link">Open reconciliation →</button>
            </div>
            <ProjectGantt
              milestones={pdMilestones}
              scopeItems={sovItems}
              changeOrders={ganttCOs}
              draws={ganttDraws}
              projectStart={enriched.start_date}
              projectEnd={enriched.end_date}
              onOpenReconciliation={() => setTab('breakdown')}
            />
          </div>

          {/* ── Recent Activity / Pending Items ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ActivityFeedCard entries={recentActivity} onViewAll={() => setTab('activity')} />
            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wide">Pending Items</div>
                <button onClick={() => setTab('breakdown')} className="pdv2-link">View all →</button>
              </div>
              {openItemsTotal === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Nothing pending — everything is caught up.</div>
              ) : (
                <div className="divide-y divide-border">
                  {[
                    { label: 'Change Orders', sub: 'Awaiting approval', count: pendingCounts.changeOrders },
                    { label: 'Draw Requests', sub: 'Awaiting submission', count: pendingCounts.draws },
                    { label: 'Invoices', sub: 'Awaiting payment', count: pendingCounts.invoices },
                  ].filter(p => p.count > 0).map(p => (
                    <div key={p.label} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-[12px] font-medium">{p.label}</div>
                        <div className="text-[10px] text-muted-foreground">{p.sub}</div>
                      </div>
                      <span className="text-sm font-bold font-mono-tab text-warning">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Top Cost Categories / Documents ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Top Cost Categories</div></div>
              <div className="p-4">
                {costBreakdown.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-6">No expenses recorded yet.</div>
                ) : (
                  <DonutChart
                    centerValue={fmtUSD(enriched.spent)}
                    centerLabel="Actual Costs"
                    slices={costBreakdown.slice(0, 6).map((row, i) => ({
                      label: row.category, value: row.actual,
                      color: ['#9D7E3F', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 6],
                    }))}
                  />
                )}
              </div>
            </div>
            <DocumentsCard documents={projectDocs} onViewAll={() => setTab('documents')} />
          </div>

          {/* ── Portal Bridge / Quick Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(portalClient || portalBrief) && (
              <div className="pdv2-card overflow-hidden">
                <div className="pdv2-card-header flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" strokeWidth={2} />
                  <div className="text-[11px] font-bold uppercase tracking-wide">Portal Bridge</div>
                </div>
                <div className="p-4">
                  {portalClient && (
                    <div className="pb-3 mb-3 border-b border-border">
                      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Client</div>
                      <div className="text-sm font-semibold">{portalClient.name}</div>
                      <div className="text-[11px] text-muted-foreground">{portalClient.email}</div>
                      {portalClient.phone && <div className="text-[11px] text-muted-foreground">{portalClient.phone}</div>}
                      <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mt-1.5 ${portalClient.status === 'approved' ? 'text-positive' : 'text-warning'}`}>
                        ● {portalClient.status?.replace('_', ' ')}
                      </div>
                      {isAdmin && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> View in Admin
                          </button>
                          {portalClient.email && (
                            <a
                              href={`mailto:${portalClient.email}?subject=${encodeURIComponent('Your Houston Enterprise Client Portal')}&body=${encodeURIComponent(`Hi ${portalClient.name?.split(' ')[0] || 'there'},\n\nYour Houston Enterprise client portal is ready. You can review project updates, invoices, documents, milestones, and messages here:\n\n${window.location.origin}/portal\n\nPlease sign in or register with this email address so we can connect your project record securely.\n\nBest,\nHouston Enterprise`)}`}
                              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Mail className="w-2.5 h-2.5" /> Invite
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {portalBrief && (
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Originating Brief</div>
                      <div className="text-[11px] space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{portalBrief.type || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{portalBrief.status?.replace('_', ' ') || '—'}</span></div>
                        {portalBrief.budget && <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-mono-tab font-semibold">{portalBrief.budget}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pdv2-card overflow-hidden">
              <div className="pdv2-card-header"><div className="text-[11px] font-bold uppercase tracking-wide">Quick Actions</div></div>
              <div className="p-3 space-y-1.5">
                {[
                  { label: 'Issue New Check',  icon: FileText,      onClick: () => navigate('/checks/new') },
                  { label: 'Log Income',        icon: Download,      onClick: () => navigate('/income') },
                  { label: 'Record Expense',    icon: FileText,      onClick: () => navigate('/expenses') },
                  { label: 'Create Invoice',    icon: FileText,      onClick: () => navigate('/invoices/new') },
                  { label: 'Upload Document',   icon: Upload,        onClick: () => { setTab('documents'); setTimeout(() => fileInputRef.current?.click(), 100); } },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border rounded-md group">
                    <a.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 text-left">{a.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {enriched.notes && (
            <div className="pdv2-card p-4">
              <div className="pdv2-label mb-1.5">Notes</div>
              <p className="text-sm text-muted-foreground">{enriched.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DOCUMENTS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div className="pd-section">
          {/* Upload bar */}
          <div className="pd-panel p-4 mb-5 bg-secondary/20">
            <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground mb-3">Upload Document</div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground block mb-1.5">Title (optional)</label>
                <input
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Foundation Permit — Issued July 2026"
                  className="w-full h-9 px-3 text-xs border border-border bg-background focus:outline-none focus:border-foreground/30 transition-colors"
                />
              </div>
              <div className="min-w-[160px]">
                <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground block mb-1.5">Document Type</label>
                <Select value={uploadDocType} onValueChange={(v: any) => setUploadDocType(v)}>
                  <SelectTrigger className="rounded-none h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.csv" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-9 px-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40">
                <Upload className="w-3.5 h-3.5" strokeWidth={2} />
                {uploading ? 'Uploading…' : 'Select File'}
              </button>
            </div>
            <div className="mt-2 text-[9px] text-muted-foreground">
              Accepts PDF, Word, Excel, CSV, and images. Files are stored securely in Supabase Storage and linked to this project indefinitely.
            </div>
          </div>

          {/* Document list */}
          {projectDocs.length === 0 ? (
            <div className="pd-panel py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mb-4">
                <FolderOpen className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-semibold tracking-tight mb-1">No documents yet</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Upload contracts, permits, photos, invoices, and any other project files. Everything stored here is linked to this project indefinitely.
              </p>
            </div>
          ) : (
            <div className="pd-panel overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                <div className="col-span-5">Document</div>
                <div className="col-span-2 hidden sm:block">Type</div>
                <div className="col-span-2 hidden sm:block">Size</div>
                <div className="col-span-2 hidden sm:block">Uploaded</div>
                <div className="col-span-3 sm:col-span-1 text-right">Actions</div>
              </div>
              <AnimatePresence>
                {pagedProjectDocs.map((doc, i) => (
                  <motion.div key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.03 }}
                    className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border last:border-b-0 items-center pd-doc-row">
                    {/* Name + icon */}
                    <div className="col-span-9 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center bg-secondary shrink-0">
                        <FileIcon mimeType={doc.file_type} className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium truncate">{doc.title || doc.file_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate sm:hidden">
                          {DOC_TYPE_LABELS[doc.doc_type]} · {fmtBytes(doc.file_size)}
                        </div>
                      </div>
                    </div>
                    {/* Type */}
                    <div className="col-span-2 hidden sm:block">
                      <span className="text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 border border-border text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.doc_type]}
                      </span>
                    </div>
                    {/* Size */}
                    <div className="col-span-2 hidden sm:block text-[11px] font-mono-tab text-muted-foreground">
                      {fmtBytes(doc.file_size)}
                    </div>
                    {/* Date */}
                    <div className="col-span-2 hidden sm:block text-[11px] font-mono-tab text-muted-foreground">
                      {fmtDate(doc.created_at)}
                    </div>
                    {/* Actions */}
                    <div className="col-span-3 sm:col-span-1 flex items-center gap-1 justify-end">
                      <button onClick={() => openDocument(doc)} title="View"
                        className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
                        <Eye className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc)} title="Remove"
                        className="w-7 h-7 flex items-center justify-center border border-border text-muted-foreground hover:text-accent hover:border-accent/30 transition-all">
                        <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border bg-secondary/20 text-[9px] text-muted-foreground flex justify-between">
                <span>{projectDocs.length} document{projectDocs.length !== 1 ? 's' : ''}</span>
                <span>All files stored securely · never auto-deleted</span>
              </div>
              <div className="px-4 py-3 border-t border-border">
                <PaginationBar page={docsPage} pageCount={docsPageCount} total={projectDocs.length} pageSize={DOCS_PAGE_SIZE}
                  onPageChange={setDocsPage} itemLabel="documents" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PROGRESS PHOTOS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'photos' && (
        <div className="pd-section">
          {!project.portal_client_id ? (
            <div className="pd-panel py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mb-4">
                <Camera className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-semibold tracking-tight mb-1">No portal client linked yet</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Link this project to a client in the Portal Bridge (Overview tab) before uploading progress photos — that's what tells the portal whose gallery to show them in.
              </p>
            </div>
          ) : (
            <>
              {/* Upload bar */}
              <div className="pd-panel p-4 mb-5 bg-secondary/20">
                <div className="text-[9px] uppercase tracking-[0.24em] font-bold text-muted-foreground mb-3">Upload Progress Photo</div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px]">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground block mb-1.5">Phase / Section</label>
                    <input
                      value={photoPhase}
                      onChange={e => setPhotoPhase(e.target.value)}
                      placeholder="e.g. Framing, Electrical"
                      className="w-full h-9 px-3 text-xs border border-border bg-background focus:outline-none focus:border-foreground/30 transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-muted-foreground block mb-1.5">Caption (optional)</label>
                    <input
                      value={photoCaption}
                      onChange={e => setPhotoCaption(e.target.value)}
                      placeholder="e.g. Second floor framing complete"
                      className="w-full h-9 px-3 text-xs border border-border bg-background focus:outline-none focus:border-foreground/30 transition-colors"
                    />
                  </div>
                  <input ref={photoInputRef} type="file" className="hidden" onChange={handlePhotoSelect} accept="image/*" />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="h-9 px-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-40">
                    <Upload className="w-3.5 h-3.5" strokeWidth={2} />
                    {uploadingPhoto ? 'Uploading…' : 'Select Photo'}
                  </button>
                </div>
                <div className="mt-2 text-[9px] text-muted-foreground">
                  Photos upload instantly to this client's Progress Photos tab in the client portal, grouped by phase.
                </div>
              </div>

              {/* Photo grid */}
              {photos.length === 0 ? (
                <div className="pd-panel py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 border border-border flex items-center justify-center mb-4">
                    <Camera className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="text-sm font-semibold tracking-tight mb-1">No progress photos yet</div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Upload the first site photo above — it'll appear in the client's portal immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(
                    photos.reduce((acc: Record<string, any[]>, p) => {
                      const key = p.phase_label || 'General';
                      (acc[key] ??= []).push(p);
                      return acc;
                    }, {})
                  ).map(([phase, group]) => (
                    <div key={phase} className="pd-panel overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold flex items-center justify-between">
                        <span>{phase}</span>
                        <span>{group.length} photo{group.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
                        {group.map((p: any) => (
                          <div key={p.id} className="relative group border border-border overflow-hidden">
                            <img src={p.url} alt={p.caption || phase} className="w-full h-32 object-cover" />
                            <button
                              onClick={() => deletePhoto(p)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive">
                              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                            {(p.caption || p.taken_at) && (
                              <div className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1">
                                {p.caption && <div className="text-[9px] text-foreground truncate">{p.caption}</div>}
                                {p.taken_at && <div className="text-[8px] text-muted-foreground">{fmtDate(p.taken_at)}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FIELD OPS TAB — tasks, RFIs, submittals, punch, inspections
      ══════════════════════════════════════════════════════════ */}
      {tab === 'fieldops' && (
        <div className="pd-section">
          <ProjectWorkflowPanel projectId={id!} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'activity' && (
        <div className="pd-section">
          {sortedActivity.length === 0 ? (
            <div className="pd-panel py-16 text-center text-sm text-muted-foreground">
              No activity recorded for this project yet.
            </div>
          ) : (
            <div className="pd-panel overflow-hidden">
              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-border">
                {pagedActivity.map((a: any) => (
                  <div key={a.id} className="px-4 py-3 pd-row space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border text-muted-foreground">{a.type}</span>
                      <span className={`text-sm font-semibold font-mono-tab ${a.amount >= 0 ? 'text-positive' : ''}`}>
                        {a.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(a.amount))}
                      </span>
                    </div>
                    <div className="text-sm text-foreground truncate">{a.ref}</div>
                    <div className="text-[10px] text-muted-foreground font-mono-tab">{fmtDate(a.date)}</div>
                  </div>
                ))}
                <div className="px-4 py-3 border-t-2 border-border bg-secondary/40 flex items-center justify-between font-mono-tab text-sm">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Net · {sortedActivity.length} entries</span>
                  <span className={`font-bold ${enriched.net >= 0 ? 'text-positive' : 'text-accent'}`}>
                    {enriched.net >= 0 ? '+' : '−'}{fmtUSD(Math.abs(enriched.net))}
                  </span>
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <PaginationBar page={activityPage} pageCount={activityPageCount} total={sortedActivity.length} pageSize={ACTIVITY_PAGE_SIZE}
                    onPageChange={setActivityPage} itemLabel="activity entries" />
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-5">Reference</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {pagedActivity.map((a: any) => (
                  <div key={a.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm font-mono-tab pd-row items-center">
                    <div className="col-span-3 text-muted-foreground text-[11px]">{fmtDate(a.date)}</div>
                    <div className="col-span-2"><span className="text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-border">{a.type}</span></div>
                    <div className="col-span-5 truncate text-[12px]">{a.ref}</div>
                    <div className={`col-span-2 text-right font-semibold text-[12px] ${a.amount >= 0 ? 'text-positive' : ''}`}>
                      {a.amount >= 0 ? '+' : '−'}{fmtUSD(Math.abs(a.amount))}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-t-2 border-border bg-secondary/40 text-sm font-mono-tab">
                  <div className="col-span-10 font-bold text-[11px] uppercase tracking-wider">
                    Net · {sortedActivity.length} entries
                  </div>
                  <div className={`col-span-2 text-right font-bold text-[12px] ${enriched.net >= 0 ? 'text-positive' : 'text-accent'}`}>
                    {enriched.net >= 0 ? '+' : '−'}{fmtUSD(Math.abs(enriched.net))}
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <PaginationBar page={activityPage} pageCount={activityPageCount} total={sortedActivity.length} pageSize={ACTIVITY_PAGE_SIZE}
                    onPageChange={setActivityPage} itemLabel="activity entries" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          BREAKDOWN TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'breakdown' && (
        <ProjectBreakdown
          project={project}
          enriched={enriched}
          projectDocs={projectDocs}
        />
      )}

    </AppShell>
  );
}
