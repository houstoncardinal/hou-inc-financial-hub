import { useMemo, useState, useEffect, useRef } from 'react';
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
import { useRole } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { fmtUSD, fmtDate } from '@/lib/format';
import { generateProjectReport, savePDF, downloadCSV } from '@/lib/reports';
import {
  useProjectDocuments, useUploadDocument, useDeleteDocument,
  DOC_TYPE_LABELS, DocType,
} from '@/hooks/useDocuments';
import {
  ArrowLeft, Download, FileText, ArrowUpRight, Plus, ExternalLink,
  Users, LayoutDashboard, Upload, Trash2, File, Image, Eye,
  ChevronRight, Pencil, Check, X, FolderOpen, Link2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ProjectBreakdown from '@/components/ProjectBreakdown';

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
.pd-row:hover td,.pd-row:hover{background-color:rgba(157,126,63,0.032)!important;}
.pd-doc-row:hover{background-color:rgba(157,126,63,0.025)!important;}
`;

function FileIcon({ mimeType, className = 'w-4 h-4' }: { mimeType: string | null; className?: string }) {
  if (!mimeType) return <File className={className} strokeWidth={1.5} />;
  if (mimeType.startsWith('image/')) return <Image className={className} strokeWidth={1.5} />;
  return <FileText className={className} strokeWidth={1.5} />;
}

function fmtBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Tab type ── */
type Tab = 'overview' | 'documents' | 'activity' | 'draws' | 'breakdown';

export default function ProjectDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const role       = useRole();
  const isAdmin    = role === 'admin';
  const { entity } = useEntity();

  const [tab, setTab] = useState<Tab>('overview');

  /* ── Finance data ── */
  const { data: projects = [] } = useProjects();
  const { data: checks = [] }   = useChecks();
  const { data: income = [] }   = useTransactions('income');
  const { data: expenses = [] } = useTransactions('expense');
  const { data: financeSummary } = useProjectFinancialSummary(id);

  /* ── Draw schedule ── */
  const [draws, setDraws]       = useState<any[]>([]);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawForm, setDrawForm] = useState({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '' });
  const [drawSaving, setDrawSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (supabase as any).from('draw_schedules').select('*').eq('project_id', id).order('scheduled_date').then(({ data }: any) => {
      setDraws(data ?? []);
    });
  }, [id]);

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

  /* ── Edit project inline ── */
  const upsert = useUpsert('projects', [['projects']]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', code: '', budget: '', status: 'active' as StatusKey, notes: '' });

  /* ── Derived project data ── */
  const project = useMemo(() => projects.find((p: any) => p.id === id), [projects, id]);

  useEffect(() => {
    if (!project) return;
    setEditForm({
      name:   project.name ?? '',
      code:   project.code ?? '',
      budget: String(project.budget ?? ''),
      status: (project.status ?? 'active') as StatusKey,
      notes:  project.notes ?? '',
    });
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

  const sortedActivity = useMemo(() => {
    if (!enriched) return [];
    return [
      ...enriched.incomeList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Income',  ref: t.source_name || '—',                              amount:  Number(t.amount) })),
      ...enriched.expenseList.map((t: any) => ({ id: t.id, date: t.transaction_date, type: 'Expense', ref: t.vendors?.name || t.category || '—',              amount: -Number(t.amount) })),
      ...enriched.checksList.map((c: any)  => ({ id: c.id, date: c.issue_date,       type: 'Check',   ref: `#${c.check_number} · ${c.payee_name}`,           amount: -Number(c.amount) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [enriched]);

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

  /* ── Draw schedule actions ── */
  const saveDrawEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawForm.milestone_name || !drawForm.draw_amount) { toast.error('Milestone name and amount required'); return; }
    setDrawSaving(true);
    try {
      const { data } = await (supabase as any).from('draw_schedules').insert({
        project_id: id, milestone_name: drawForm.milestone_name,
        draw_amount: parseFloat(drawForm.draw_amount),
        scheduled_date: drawForm.scheduled_date || null,
        status: drawForm.status, notes: drawForm.notes || null,
      }).select().single();
      setDraws(d => [...d, data]);
      toast.success('Draw entry added');
      setDrawOpen(false);
      setDrawForm({ milestone_name: '', draw_amount: '', scheduled_date: '', status: 'pending', notes: '' });
    } catch { toast.error('Failed to save draw entry'); }
    setDrawSaving(false);
  };

  const updateDrawStatus = async (drawId: string, status: string) => {
    try {
      await (supabase as any).from('draw_schedules').update({ status }).eq('id', drawId);
      setDraws(d => d.map(x => x.id === drawId ? { ...x, status } : x));
    } catch (e: any) { toast.error(e?.message || 'Failed to update draw status'); }
  };

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
      await upsert.mutateAsync({ id, ...editForm, budget: parseFloat(editForm.budget) || 0 } as any);
      toast.success('Project updated');
      setEditOpen(false);
    } catch { toast.error('Failed to save'); }
  };

  /* ── Exports ── */
  const exportPDF = () => {
    if (!enriched) return;
    const doc = generateProjectReport([enriched]);
    savePDF(doc, `hou-project-${enriched.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Project report exported');
  };
  const exportCSV = () => {
    if (!sortedActivity) return;
    downloadCSV(sortedActivity, `hou-project-activity-${new Date().toISOString().slice(0, 10)}.csv`,
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
  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview',   label: 'Overview' },
    { key: 'breakdown',  label: 'Breakdown' },
    { key: 'documents',  label: 'Documents', count: projectDocs.length },
    { key: 'activity',   label: 'Activity',  count: sortedActivity.length },
    { key: 'draws',      label: 'Draws',     count: draws.length },
  ];

  return (
    <AppShell>
      <style>{PD_CSS}</style>

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
            <button onClick={() => { setEditForm({ name: enriched.name, code: enriched.code || '', budget: String(enriched.budget), status: enriched.status as StatusKey, notes: enriched.notes || '' }); setEditOpen(true); }}
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
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={() => { setEditForm({ name: enriched.name, code: enriched.code || '', budget: String(enriched.budget), status: enriched.status as StatusKey, notes: enriched.notes || '' }); setEditOpen(true); }}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
        </Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportPDF}><FileText className="w-3.5 h-3.5 mr-1.5" />PDF</Button>
        <Button variant="outline" size="sm" className="rounded-none text-xs flex-1" onClick={exportCSV}><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
      </div>

      {/* Edit project dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-none sm:max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-[8px] uppercase tracking-[0.32em] font-bold text-muted-foreground mb-0.5">Edit Project</div>
            <DialogTitle className="text-lg font-semibold">Edit {enriched.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4 pt-2">
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
                <Label className="micro-label">Contract Budget (USD)</Label>
                <CurrencyInput value={editForm.budget} onValueChange={v => setEditForm(f => ({ ...f, budget: v }))} placeholder="0.00" />
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

      {/* ── Status color bar + Tabs ── */}
      <div className="h-[3px]" style={{ backgroundColor: statusMeta.color }} />
      <div className="px-4 sm:px-8 border-b border-border flex gap-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold whitespace-nowrap border-b-2 transition-all ${
              tab === t.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[8px] px-1.5 py-0.5 font-black ${tab === t.key ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="p-4 sm:p-8 space-y-6">
          {projectSummary && (
            <div className="border border-border bg-secondary/20">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.28em] font-bold text-muted-foreground">Construction Finance Intelligence</div>
                  <div className="text-sm font-semibold mt-0.5">Contract, billing, cost, and cash position from linked source records</div>
                </div>
                <span className={`hidden sm:inline-flex text-[8px] uppercase tracking-[0.18em] px-2 py-1 border font-bold ${
                  projectSummary.projects_over_budget ? 'border-accent/30 bg-accent/10 text-accent' : 'border-positive/30 bg-positive/10 text-positive'
                }`}>
                  {projectSummary.projects_over_budget ? 'Over budget watch' : 'Within budget'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-border">
                {[
                  {
                    label: 'Current Contract',
                    value: fmtUSD(projectSummary.current_contract_value),
                    sub: `${fmtUSD(projectSummary.approved_change_orders)} approved COs`,
                    tone: '',
                  },
                  {
                    label: 'Accounts Receivable',
                    value: fmtUSD(projectSummary.accounts_receivable),
                    sub: `${projectSummary.percentage_collected.toFixed(1)}% collected`,
                    tone: projectSummary.accounts_receivable > 0 ? 'text-warning' : 'text-positive',
                  },
                  {
                    label: 'Actual Costs',
                    value: fmtUSD(projectSummary.actual_project_costs),
                    sub: `${fmtUSD(projectSummary.outstanding_checks)} outstanding checks`,
                    tone: projectSummary.projects_over_budget ? 'text-accent' : '',
                  },
                  {
                    label: 'Forecast Profit',
                    value: fmtUSD(projectSummary.estimated_gross_profit),
                    sub: `${projectSummary.estimated_gross_margin.toFixed(1)}% estimated margin`,
                    tone: projectSummary.estimated_gross_profit >= 0 ? 'text-positive' : 'text-accent',
                  },
                ].map(card => (
                  <div key={card.label} className="bg-background px-4 py-3.5">
                    <div className="text-[8px] uppercase tracking-[0.22em] font-bold text-muted-foreground leading-tight">{card.label}</div>
                    <div className={`text-lg font-bold font-mono-tab mt-1 leading-tight ${card.tone}`}>{card.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono-tab">{card.sub}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-border">
                {[
                  ['Unbilled Contract', projectSummary.unbilled_contract_amount],
                  ['Retainage Held', projectSummary.retainage_withheld],
                  ['Unpaid Costs', projectSummary.unpaid_costs],
                  ['Cash Position', projectSummary.cash_position],
                ].map(([label, value]) => (
                  <div key={label} className="bg-background px-4 py-2.5">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                    <div className="text-sm font-semibold font-mono-tab mt-0.5">{fmtUSD(Number(value))}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Snapshot KPIs ── */}
          <div className="border border-border overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border">
              {[
                { label: 'Contract Budget',  value: fmtUSD(enriched.budget),      c: '' },
                { label: 'Deployed',         value: fmtUSD(enriched.spent),       c: '' },
                { label: 'Revenue',          value: fmtUSD(enriched.incoming),    c: 'text-positive' },
                { label: 'Pending Checks',   value: fmtUSD(enriched.outstanding), c: enriched.outstanding > 0 ? 'text-warning' : '' },
                { label: 'Retainage Held',   value: fmtUSD(retainageHeld),        c: retainageHeld > 0 ? 'text-blue-400' : 'text-muted-foreground' },
              ].map(s => (
                <div key={s.label} className="bg-background px-4 sm:px-5 py-4">
                  <div className="text-[8px] uppercase tracking-[0.22em] font-bold text-muted-foreground mb-1.5 leading-tight">{s.label}</div>
                  <div className={`text-lg sm:text-xl font-bold font-mono-tab leading-tight ${s.c}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Budget utilization */}
            <div className="border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="micro-label">Budget Utilization</div>
                {enriched.used >= 100 && (
                  <span className="text-[8px] uppercase tracking-[0.14em] px-2 py-1 border font-medium bg-accent/10 text-accent border-accent/30">
                    Over Budget · {fmtUSD(enriched.spent - enriched.budget)} excess
                  </span>
                )}
                {enriched.used >= 80 && enriched.used < 100 && (
                  <span className="text-[8px] uppercase tracking-[0.14em] px-2 py-1 border font-medium bg-warning/10 text-warning border-warning/30">
                    Near Limit · {(100 - enriched.used).toFixed(1)}% remaining
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{fmtUSD(enriched.spent)} spent of {fmtUSD(enriched.budget)}</span>
                <span className={`font-mono-tab font-semibold ${enriched.used >= 100 ? 'text-accent' : enriched.used >= 80 ? 'text-warning' : ''}`}>
                  {enriched.used.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-secondary overflow-hidden">
                <motion.div
                  className={`h-full ${enriched.used >= 100 ? 'bg-accent' : enriched.used >= 80 ? 'bg-warning' : 'bg-foreground'}`}
                  style={{ width: `${Math.min(enriched.used, 100)}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(enriched.used, 100)}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5 font-mono-tab">
                <div>
                  <div className="micro-label">Net Position</div>
                  <div className={`text-xl font-semibold mt-1 ${enriched.net >= 0 ? 'text-positive' : 'text-accent'}`}>{fmtUSD(enriched.net)}</div>
                </div>
                <div>
                  <div className="micro-label">Activity Count</div>
                  <div className="text-xl font-semibold mt-1">{sortedActivity.length} entries</div>
                </div>
              </div>
              {enriched.notes && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="micro-label mb-1.5">Notes</div>
                  <p className="text-sm text-muted-foreground">{enriched.notes}</p>
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            {costBreakdown.length > 0 && (
              <div className="border border-border">
                <div className="px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                  Budget vs. Actuals — Line Item Breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Category', 'Items', 'Actual', '% of Spend'].map(h => (
                          <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium ${h !== 'Category' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {costBreakdown.map((row) => (
                        <tr key={row.category} className="border-b border-border last:border-b-0 pd-row">
                          <td className="px-4 py-3 font-medium">{row.category}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">{row.count}</td>
                          <td className="px-4 py-3 text-right font-semibold font-mono-tab">{fmtUSD(row.actual)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">
                            {enriched.spent > 0 ? ((row.actual / enriched.spent) * 100).toFixed(1) + '%' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/40">
                        <td className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Total</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-mono-tab">{enriched.expenseList.length + enriched.checksList.length}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono-tab">{fmtUSD(enriched.spent)}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono-tab">
                          <span className={enriched.budget > 0 && enriched.spent > enriched.budget ? 'text-accent' : 'text-positive'}>
                            {enriched.budget > 0 ? (enriched.budget > enriched.spent ? '+' : '−') + fmtUSD(Math.abs(enriched.budget - enriched.spent)) + ' vs budget' : '—'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Details card */}
            <div className="border border-border p-5">
              <div className="micro-label mb-3">Details</div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium uppercase tracking-wider text-[10px]">{enriched.status}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Code</dt><dd className="font-semibold font-mono-tab">{enriched.code || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd className="font-mono-tab text-muted-foreground">{fmtDate(enriched.created_at)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Checks</dt><dd className="font-semibold">{enriched.checkCount}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Transactions</dt><dd className="font-semibold">{enriched.txnCount}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Documents</dt><dd className="font-semibold">{projectDocs.length}</dd></div>
              </dl>
            </div>

            {/* Portal client bridge */}
            {(portalClient || portalBrief) && (
              <div className="border border-border p-5">
                <div className="micro-label mb-3 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" strokeWidth={2} /> Portal Bridge
                </div>
                {portalClient && (
                  <div className="mb-3 pb-3 border-b border-border">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Client</div>
                    <div className="text-sm font-semibold">{portalClient.name}</div>
                    <div className="text-[11px] text-muted-foreground">{portalClient.email}</div>
                    {portalClient.phone && <div className="text-[11px] text-muted-foreground">{portalClient.phone}</div>}
                    <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mt-1.5 ${portalClient.status === 'approved' ? 'text-positive' : 'text-warning'}`}>
                      ● {portalClient.status?.replace('_', ' ')}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" /> View in Admin
                      </button>
                    )}
                  </div>
                )}
                {portalBrief && (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Originating Brief</div>
                    <div className="text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium capitalize">{portalBrief.type || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium capitalize">{portalBrief.status?.replace('_', ' ') || '—'}</span>
                      </div>
                      {portalBrief.budget && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-mono-tab font-semibold">{portalBrief.budget}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick links */}
            <div className="border border-border p-5">
              <div className="micro-label mb-3">Quick Actions</div>
              <div className="space-y-1.5">
                {[
                  { label: 'Issue New Check',  icon: FileText,      onClick: () => navigate('/checks/new') },
                  { label: 'Log Income',        icon: Download,      onClick: () => navigate('/income') },
                  { label: 'Record Expense',    icon: FileText,      onClick: () => navigate('/expenses') },
                  { label: 'Create Invoice',    icon: FileText,      onClick: () => navigate('/invoices/new') },
                  { label: 'Upload Document',   icon: Upload,        onClick: () => { setTab('documents'); setTimeout(() => fileInputRef.current?.click(), 100); } },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border group">
                    <a.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 text-left">{a.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>{/* end inner grid */}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DOCUMENTS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div className="p-4 sm:p-8">
          {/* Upload bar */}
          <div className="border border-border p-4 mb-5 bg-secondary/20">
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
            <div className="border border-border py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border border-border flex items-center justify-center mb-4">
                <FolderOpen className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="text-sm font-semibold tracking-tight mb-1">No documents yet</div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Upload contracts, permits, photos, invoices, and any other project files. Everything stored here is linked to this project indefinitely.
              </p>
            </div>
          ) : (
            <div className="border border-border">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                <div className="col-span-5">Document</div>
                <div className="col-span-2 hidden sm:block">Type</div>
                <div className="col-span-2 hidden sm:block">Size</div>
                <div className="col-span-2 hidden sm:block">Uploaded</div>
                <div className="col-span-3 sm:col-span-1 text-right">Actions</div>
              </div>
              <AnimatePresence>
                {projectDocs.map((doc, i) => (
                  <motion.div key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.03 }}
                    className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-border last:border-b-0 items-center pd-doc-row">
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
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'activity' && (
        <div className="p-4 sm:p-8">
          {sortedActivity.length === 0 ? (
            <div className="border border-border py-16 text-center text-sm text-muted-foreground">
              No activity recorded for this project yet.
            </div>
          ) : (
            <div className="border border-border">
              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-border">
                {sortedActivity.map((a: any) => (
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
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-border bg-secondary/40 text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-5">Reference</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {sortedActivity.map((a: any) => (
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
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          DRAWS TAB
      ══════════════════════════════════════════════════════════ */}
      {tab === 'draws' && (
        <div className="p-4 sm:p-8">
          <div className="border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/40 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Draw Schedule</div>
              <Dialog open={drawOpen} onOpenChange={setDrawOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1 text-[10px] text-accent hover:opacity-80 transition-opacity font-bold">
                    <Plus className="w-3 h-3" /> Add Draw
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-md w-[calc(100%-2rem)]">
                  <DialogHeader><DialogTitle>Add Draw Entry</DialogTitle></DialogHeader>
                  <form onSubmit={saveDrawEntry} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="micro-label">Milestone</Label>
                      <Input className="rounded-none h-10" required placeholder="e.g. Foundation Complete"
                        value={drawForm.milestone_name} onChange={e => setDrawForm(f => ({ ...f, milestone_name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="micro-label">Draw Amount</Label>
                        <CurrencyInput required value={drawForm.draw_amount} onValueChange={v => setDrawForm(f => ({ ...f, draw_amount: v }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="micro-label">Scheduled Date</Label>
                        <DateInput className="h-10" value={drawForm.scheduled_date} onChange={e => setDrawForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="micro-label">Status</Label>
                      <Select value={drawForm.status} onValueChange={v => setDrawForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="requested">Requested</SelectItem>
                          <SelectItem value="funded">Funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={drawSaving} className="rounded-none w-full h-10">
                      {drawSaving ? 'Saving…' : 'Save Draw Entry'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {draws.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No draw entries yet — add milestones to track lender disbursements.
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="sm:hidden divide-y divide-border">
                  {draws.map((d: any) => (
                    <div key={d.id} className="px-4 py-3 space-y-2 hover:bg-secondary/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm flex-1 min-w-0">{d.milestone_name}</div>
                        <div className="font-semibold font-mono-tab text-sm shrink-0">{fmtUSD(d.draw_amount)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground font-mono-tab">{d.scheduled_date ? fmtDate(d.scheduled_date) : 'No date'}</span>
                        <div className="flex-1">
                          <Select value={d.status} onValueChange={v => updateDrawStatus(d.id, v)}>
                            <SelectTrigger className={`rounded-none h-7 text-[9px] uppercase tracking-wider px-2 ${d.status === 'funded' ? 'text-positive' : d.status === 'requested' ? 'text-warning' : 'text-muted-foreground'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="requested">Requested</SelectItem>
                              <SelectItem value="funded">Funded</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 border-t-2 border-border bg-secondary/20 flex justify-between text-sm font-mono-tab">
                    <span className="text-muted-foreground font-medium">Total Draws</span>
                    <span className="font-bold">{fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0))}</span>
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-secondary/20 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                    <div className="col-span-4">Milestone</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-4">Status</div>
                  </div>
                  {draws.map((d: any) => (
                    <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 text-sm items-center hover:bg-secondary/10">
                      <div className="col-span-4 font-medium truncate">{d.milestone_name}</div>
                      <div className="col-span-2 text-xs text-muted-foreground font-mono-tab">{d.scheduled_date ? fmtDate(d.scheduled_date) : '—'}</div>
                      <div className="col-span-2 text-right font-semibold font-mono-tab">{fmtUSD(d.draw_amount)}</div>
                      <div className="col-span-4">
                        <Select value={d.status} onValueChange={v => updateDrawStatus(d.id, v)}>
                          <SelectTrigger className={`rounded-none h-7 text-[9px] uppercase tracking-wider px-2 ${d.status === 'funded' ? 'text-positive' : d.status === 'requested' ? 'text-warning' : 'text-muted-foreground'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="requested">Requested</SelectItem>
                            <SelectItem value="funded">Funded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 border-t-2 border-border bg-secondary/20 flex justify-between text-sm font-mono-tab">
                    <span className="text-muted-foreground font-medium">Total Draws</span>
                    <span className="font-bold">{fmtUSD(draws.reduce((s, d) => s + Number(d.draw_amount), 0))}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
