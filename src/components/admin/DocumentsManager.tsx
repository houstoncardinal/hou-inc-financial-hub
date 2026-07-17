import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BUILDER } from '@/hooks/usePortal';
import { StatCard } from '@/components/project-detail/StatCard';
import { ActionButton } from '@/components/admin/design/ActionButton';
import {
  FileText, UploadCloud, Search, X, CheckCircle2, XCircle, Trash2, Edit3,
  Download, FilePlus, ChevronRight, ChevronLeft, Loader2, Users, FolderKanban,
  Clock, BadgeCheck, Files, Link2,
} from 'lucide-react';

const AC = '#9D7E3F';

/* ── Types ──────────────────────────────────────────────────────── */
interface DocRow {
  id: string;
  client_id: string | null;
  project_id?: string | null;
  name: string;
  description: string | null;
  file_type: string;
  file_size: string | null;
  file_url: string | null;
  storage_path: string | null;
  category: string;
  status: string;
  requested_by: string | null;
  uploaded_at: string | null;
  created_at: string;
}
interface ClientRow { id: string; name: string; email: string; status: string; }
interface ProjectRow { id: string; title: string; project_code: string | null; portal_client_id: string | null; }

interface PendingFile { key: number; file: File; displayName: string; state: 'waiting' | 'uploading' | 'done' | 'error'; error?: string; }

/* ── Constants / helpers ────────────────────────────────────────── */
const CATEGORIES = [
  { value: 'uploaded', label: 'General Upload' },
  { value: 'contract', label: 'Contract' },
  { value: 'report',   label: 'Report' },
  { value: 'required', label: 'Required Document' },
];
const STATUSES = ['pending', 'uploaded', 'approved', 'rejected'];

function statusStyle(s: string) {
  if (s === 'approved') return { bg: 'rgba(16,185,129,0.10)', color: '#10b981' };
  if (s === 'rejected') return { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444' };
  if (s === 'uploaded') return { bg: 'rgba(59,130,246,0.10)', color: '#3b82f6' };
  return { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b' };
}
function typeColor(t: string) {
  const x = (t || '').toUpperCase();
  if (x.includes('PDF')) return '#ef4444';
  if (/(XLS|CSV|SHEET)/.test(x)) return '#10b981';
  if (/(DOC|TXT|PAGES)/.test(x)) return '#3b82f6';
  if (/(PNG|JPG|JPEG|HEIC|GIF|WEBP|IMAGE|SVG)/.test(x)) return '#f59e0b';
  return '#8A8580';
}
function humanSize(bytes: number) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function extOf(name: string) {
  const p = name.split('.');
  return p.length > 1 ? p[p.length - 1].toUpperCase() : 'FILE';
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
}

async function logDocChange(action: string, id: string | null, label: string | null, details: Record<string, any> = {}) {
  try {
    await (supabase as any).from('admin_changelog').insert({
      action, entity: 'document', dashboard: 'admin',
      entity_id: id, entity_label: label, changed_by: BUILDER.name, details,
    });
  } catch { /* table may not exist yet */ }
}
async function notifyClient(clientId: string | null, body: string) {
  if (!clientId) return;
  try {
    await supabase.from('portal_messages').insert({ client_id: clientId, sender: 'builder', sender_name: BUILDER.name, body });
  } catch { /* non-fatal */ }
}

/* Insert/update with graceful fallback while the project_id migration is pending */
async function insertDoc(row: any, projectId: string | null): Promise<string | null> {
  if (projectId) {
    const { error } = await (supabase as any).from('portal_documents').insert({ ...row, project_id: projectId });
    if (!error) return null;
    if (!/project_id/i.test(error.message ?? '')) return error.message;
    const { error: e2 } = await (supabase as any).from('portal_documents').insert(row);
    return e2 ? e2.message : 'saved-without-project';
  }
  const { error } = await (supabase as any).from('portal_documents').insert(row);
  return error ? error.message : null;
}
async function updateDoc(id: string, patch: any): Promise<string | null> {
  const { error } = await (supabase as any).from('portal_documents').update(patch).eq('id', id);
  if (!error) return null;
  if (/project_id/i.test(error.message ?? '') && 'project_id' in patch) {
    const { project_id: _omit, ...rest } = patch;
    const { error: e2 } = await (supabase as any).from('portal_documents').update(rest).eq('id', id);
    return e2 ? e2.message : 'saved-without-project';
  }
  return error.message;
}

const inputCls = 'w-full text-[12px] outline-none rounded-lg border border-border bg-background text-foreground px-3 py-2.5 focus:border-accent transition-colors';
const selectCls = `${inputCls} cursor-pointer`;

/* ── Modal shell ────────────────────────────────────────────────── */
function Modal({ title, subtitle, onClose, children, wide = false }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={`pdv2-card w-full ${wide ? 'max-w-xl' : 'max-w-md'} shadow-2xl overflow-hidden flex flex-col`}
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="h-[3px] shrink-0" style={{ backgroundColor: AC }} />
        <div className="px-5 sm:px-6 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="text-[14px] font-bold text-foreground">{title}</div>
            {subtitle && <div className="text-[10.5px] text-muted-foreground mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function DocumentsManager({ onChanged }: { onChanged?: () => void }) {
  const [docs, setDocs]         = useState<DocRow[]>([]);
  const [clients, setClients]   = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading]   = useState(true);

  /* Filters */
  const [q, setQ]               = useState('');
  const [fStatus, setFStatus]   = useState('all');
  const [fCategory, setFCategory] = useState('all');
  const [fClient, setFClient]   = useState('all');

  /* Upload wizard */
  const [showUpload, setShowUpload] = useState(false);
  const [step, setStep]             = useState(0);
  const [pending, setPending]       = useState<PendingFile[]>([]);
  const [upClient, setUpClient]     = useState('');
  const [upProject, setUpProject]   = useState('');
  const [upCategory, setUpCategory] = useState('uploaded');
  const [upStatus, setUpStatus]     = useState('approved');
  const [upDesc, setUpDesc]         = useState('');
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileKey = useRef(0);

  /* Request modal */
  const [showRequest, setShowRequest] = useState(false);
  const [reqClient, setReqClient]     = useState('');
  const [reqName, setReqName]         = useState('');
  const [reqDesc, setReqDesc]         = useState('');
  const [reqBusy, setReqBusy]         = useState(false);

  /* Edit modal */
  const [editDoc, setEditDoc] = useState<DocRow | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editBusy, setEditBusy] = useState(false);

  /* ── Load + realtime ── */
  const load = useCallback(async () => {
    const [docsRes, clientsRes, projRes] = await Promise.all([
      (supabase as any).from('portal_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('portal_clients').select('id, name, email, status').order('name'),
      (supabase as any).from('admin_projects').select('id, title, project_code, portal_client_id').order('title'),
    ]);
    setDocs(docsRes.data ?? []);
    setClients(clientsRes.data ?? []);
    setProjects(projRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('docs-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_documents' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const changed = () => { load(); onChanged?.(); };

  const clientName = (id: string | null | undefined) => clients.find(c => c.id === id)?.name ?? null;
  const projectTitle = (id: string | null | undefined) => projects.find(p => p.id === id)?.title ?? null;

  /* ── Derived ── */
  const counts = {
    total: docs.length,
    awaiting: docs.filter(d => d.status === 'pending').length,
    review: docs.filter(d => d.status === 'uploaded').length,
    approved: docs.filter(d => d.status === 'approved').length,
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const order: Record<string, number> = { uploaded: 0, pending: 1, approved: 2, rejected: 3 };
    return docs
      .filter(d => {
        if (fStatus !== 'all' && d.status !== fStatus) return false;
        if (fCategory !== 'all' && d.category !== fCategory) return false;
        if (fClient !== 'all' && d.client_id !== fClient) return false;
        if (query) {
          const hay = `${d.name} ${d.description ?? ''} ${clientName(d.client_id) ?? ''} ${projectTitle(d.project_id) ?? ''} ${d.file_type}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9)
        || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, q, fStatus, fCategory, fClient, clients, projects]);

  /* ── Upload wizard actions ── */
  const resetUpload = () => {
    setShowUpload(false); setStep(0); setPending([]); setUpClient(''); setUpProject('');
    setUpCategory('uploaded'); setUpStatus('approved'); setUpDesc(''); setUploading(false); setDragOver(false);
  };

  const addFiles = (list: FileList | File[]) => {
    const next: PendingFile[] = Array.from(list).map(file => ({
      key: ++fileKey.current, file,
      displayName: file.name.replace(/\.[^.]+$/, ''),
      state: 'waiting',
    }));
    setPending(p => [...p, ...next]);
  };

  const handleProjectPick = (id: string) => {
    setUpProject(id);
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj?.portal_client_id) setUpClient(proj.portal_client_id);
    }
  };

  const runUpload = async () => {
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    let ok = 0, migrationNote = false;

    for (const pf of pending) {
      if (pf.state === 'done') { ok++; continue; }
      setPending(p => p.map(x => x.key === pf.key ? { ...x, state: 'uploading', error: undefined } : x));
      try {
        const safeName = pf.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `admin-uploads/${upClient || upProject || 'general'}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from('portal-documents')
          .upload(path, pf.file, { upsert: false, contentType: pf.file.type || undefined });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from('portal-documents').getPublicUrl(path);

        const row = {
          client_id: upClient || null,
          name: pf.displayName.trim() || pf.file.name,
          description: upDesc.trim() || null,
          file_type: extOf(pf.file.name),
          file_size: humanSize(pf.file.size),
          file_url: pub.publicUrl,
          storage_path: path,
          category: upCategory,
          status: upStatus,
          uploaded_at: new Date().toISOString(),
        };
        const err = await insertDoc(row, upProject || null);
        if (err === 'saved-without-project') migrationNote = true;
        else if (err) throw new Error(err);

        await logDocChange('created', null, row.name, {
          client: clientName(upClient) ?? 'Unassigned',
          project: projectTitle(upProject) ?? undefined,
          size: row.file_size, type: row.file_type,
        });
        setPending(p => p.map(x => x.key === pf.key ? { ...x, state: 'done' } : x));
        ok++;
      } catch (e: any) {
        const msg = /bucket/i.test(e?.message ?? '')
          ? "Storage bucket missing — run the latest migration in the Supabase dashboard."
          : e?.message ?? 'Upload failed';
        setPending(p => p.map(x => x.key === pf.key ? { ...x, state: 'error', error: msg } : x));
      }
    }

    setUploading(false);
    if (ok > 0) {
      toast({ title: `${ok} document${ok > 1 ? 's' : ''} uploaded`, description: upClient ? `Assigned to ${clientName(upClient)}` : upProject ? `Assigned to ${projectTitle(upProject)}` : 'Stored in the document library' });
      if (migrationNote) toast({ title: 'Project link not saved', description: 'Run migration 20260716000009 in Supabase to enable project assignment.' });
      changed();
      if (ok === pending.length) resetUpload();
    }
  };

  /* ── Request document ── */
  const submitRequest = async () => {
    if (!reqClient || !reqName.trim() || reqBusy) return;
    setReqBusy(true);
    const { error } = await (supabase as any).from('portal_documents').insert({
      client_id: reqClient, name: reqName.trim(), description: reqDesc.trim() || null,
      file_type: 'Any', category: 'required', status: 'pending', requested_by: BUILDER.name,
    });
    if (error) { toast({ title: 'Request failed', description: error.message }); setReqBusy(false); return; }
    await notifyClient(reqClient, `We've requested a document from you: "${reqName.trim()}". Please upload it in the Documents tab of your portal. — ${BUILDER.name}`);
    await logDocChange('created', null, reqName.trim(), { request_for: clientName(reqClient) });
    toast({ title: 'Document requested', description: `${clientName(reqClient)} will see it in their portal.` });
    setShowRequest(false); setReqClient(''); setReqName(''); setReqDesc(''); setReqBusy(false);
    changed();
  };

  /* ── Edit ── */
  const openEdit = (d: DocRow) => {
    setEditDoc(d);
    setEditForm({
      name: d.name, description: d.description ?? '', category: d.category,
      status: d.status, client_id: d.client_id ?? '', project_id: d.project_id ?? '',
    });
  };
  const saveEdit = async () => {
    if (!editDoc || !editForm.name.trim() || editBusy) return;
    setEditBusy(true);
    const err = await updateDoc(editDoc.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      category: editForm.category,
      status: editForm.status,
      client_id: editForm.client_id || null,
      project_id: editForm.project_id || null,
    });
    setEditBusy(false);
    if (err && err !== 'saved-without-project') { toast({ title: 'Save failed', description: err }); return; }
    if (err === 'saved-without-project') toast({ title: 'Project link not saved', description: 'Run migration 20260716000009 in Supabase to enable project assignment.' });
    await logDocChange('updated', editDoc.id, editForm.name.trim(), {});
    toast({ title: 'Document updated' });
    setEditDoc(null); setEditForm(null);
    changed();
  };

  /* ── Review / delete ── */
  const approve = async (d: DocRow) => {
    await (supabase as any).from('portal_documents').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: BUILDER.name }).eq('id', d.id);
    await notifyClient(d.client_id, `Your document "${d.name}" has been reviewed and approved. — ${BUILDER.name}`);
    await logDocChange('approved', d.id, d.name, { client: clientName(d.client_id) });
    changed();
  };
  const reject = async (d: DocRow) => {
    await (supabase as any).from('portal_documents').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: BUILDER.name }).eq('id', d.id);
    await notifyClient(d.client_id, `Your document "${d.name}" requires revision. Please re-upload with the requested changes. — ${BUILDER.name}`);
    await logDocChange('rejected', d.id, d.name, { client: clientName(d.client_id) });
    changed();
  };
  const remove = async (d: DocRow) => {
    if (!confirm(`Delete "${d.name}"? This removes the file and its record permanently.`)) return;
    let path = d.storage_path;
    if (!path && d.file_url) {
      const marker = '/portal-documents/';
      const i = d.file_url.indexOf(marker);
      if (i !== -1) path = decodeURIComponent(d.file_url.slice(i + marker.length));
    }
    if (path) await supabase.storage.from('portal-documents').remove([path]);
    const { error } = await (supabase as any).from('portal_documents').delete().eq('id', d.id);
    if (error) { toast({ title: 'Delete failed', description: error.message }); return; }
    await logDocChange('deleted', d.id, d.name, {});
    toast({ title: 'Document deleted' });
    changed();
  };
  const view = (d: DocRow) => {
    if (d.file_url) window.open(d.file_url, '_blank', 'noopener,noreferrer');
    else toast({ title: 'No file yet', description: d.status === 'pending' ? 'This is an outstanding request — the client has not uploaded it.' : 'This record has no stored file.' });
  };

  const approvedClients = clients.filter(c => c.status === 'approved');

  /* ── Row actions (shared desktop/mobile) ── */
  const RowActions = ({ d }: { d: DocRow }) => (
    <div className="flex gap-1.5 flex-wrap">
      {d.file_url && <ActionButton variant="neutral" icon={Download} className="!border-accent/30 !text-accent" onClick={() => view(d)}>View</ActionButton>}
      {d.status === 'uploaded' && (
        <>
          <ActionButton variant="positive" icon={CheckCircle2} onClick={() => approve(d)}>Approve</ActionButton>
          <ActionButton variant="negative" icon={XCircle} onClick={() => reject(d)}>Reject</ActionButton>
        </>
      )}
      <ActionButton variant="neutral" icon={Edit3} onClick={() => openEdit(d)}>Edit</ActionButton>
      <ActionButton variant="negative" icon={Trash2} onClick={() => remove(d)}>Delete</ActionButton>
    </div>
  );

  const DocCell = ({ d }: { d: DocRow }) => (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${typeColor(d.file_type)}14` }}>
        <FileText className="w-3.5 h-3.5" style={{ color: typeColor(d.file_type) }} strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-foreground truncate max-w-[240px]">{d.name}</div>
        <div className="text-[9.5px] text-muted-foreground truncate max-w-[240px]">
          {d.file_type}{d.description ? ` · ${d.description}` : ''}
        </div>
      </div>
    </div>
  );

  const AssignedCell = ({ d }: { d: DocRow }) => {
    const cn = clientName(d.client_id);
    const pt = projectTitle(d.project_id);
    if (!cn && !pt) return <span className="text-[10.5px] text-muted-foreground">Unassigned</span>;
    return (
      <div className="space-y-0.5">
        {cn && <div className="flex items-center gap-1 text-[11px] text-foreground"><Users className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={2} />{cn}</div>}
        {pt && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><FolderKanban className="w-2.5 h-2.5" strokeWidth={2} />{pt}</div>}
      </div>
    );
  };

  const StatusPill = ({ s }: { s: string }) => {
    const st = statusStyle(s);
    return (
      <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em]"
        style={{ backgroundColor: st.bg, color: st.color }}>
        {s === 'pending' ? 'Awaiting Upload' : s === 'uploaded' ? 'Needs Review' : s}
      </span>
    );
  };

  return (
    <div className="space-y-5">

      {/* ── Stat cards (click to filter) ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={String(counts.total)} sub="Across all clients & projects" icon={Files} trendColor={AC} onClick={() => setFStatus('all')} />
        <StatCard label="Needs Review" value={String(counts.review)} sub={counts.review > 0 ? 'Client uploads to verify' : 'Queue is clear'} subColor={counts.review > 0 ? 'text-warning font-semibold' : undefined} icon={Clock} trendColor="#3b82f6" onClick={() => setFStatus('uploaded')} />
        <StatCard label="Awaiting Upload" value={String(counts.awaiting)} sub="Outstanding client requests" icon={FilePlus} trendColor="#f59e0b" onClick={() => setFStatus('pending')} />
        <StatCard label="Approved" value={String(counts.approved)} sub="Verified & on file" icon={BadgeCheck} trendColor="#10b981" onClick={() => setFStatus('approved')} />
      </div>

      {/* ── Library ── */}
      <div className="pdv2-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:flex xl:flex-wrap xl:items-center gap-2.5 px-3.5 sm:px-5 py-3.5 border-b border-border">
          <div className="text-[11px] font-bold uppercase tracking-wide md:col-span-2 xl:col-span-1 xl:flex-1 min-w-[140px]">
            Document Library ({filtered.length}{filtered.length !== docs.length ? ` of ${docs.length}` : ''})
          </div>
          <div className="relative flex items-center min-w-0">
            <Search className="absolute left-2.5 w-3 h-3 pointer-events-none text-muted-foreground" strokeWidth={2} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents…"
              className="text-[11px] outline-none rounded-lg border border-border bg-background text-foreground pl-6 pr-2.5 py-2 w-full xl:w-[180px] focus:border-accent transition-colors" />
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="text-[10px] outline-none rounded-lg border border-border bg-background text-muted-foreground px-2 py-2 cursor-pointer w-full xl:w-auto">
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'pending' ? 'Awaiting upload' : s === 'uploaded' ? 'Needs review' : s}</option>)}
          </select>
          <select value={fCategory} onChange={e => setFCategory(e.target.value)} className="text-[10px] outline-none rounded-lg border border-border bg-background text-muted-foreground px-2 py-2 cursor-pointer w-full xl:w-auto">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={fClient} onChange={e => setFClient(e.target.value)} className="text-[10px] outline-none rounded-lg border border-border bg-background text-muted-foreground px-2 py-2 cursor-pointer w-full xl:w-[130px]">
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ActionButton variant="neutral" icon={FilePlus} className="!border-accent/30 !text-accent" onClick={() => setShowRequest(true)}>Request</ActionButton>
          <ActionButton variant="primary" icon={UploadCloud} onClick={() => setShowUpload(true)}>Upload</ActionButton>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Files className="w-9 h-9 text-muted-foreground/35 mb-3" strokeWidth={1} />
            <div className="text-[13px] font-semibold text-foreground mb-1">
              {docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}
            </div>
            <p className="text-[11px] text-muted-foreground mb-5">
              {docs.length === 0 ? 'Upload your first document or request one from a client.' : 'Try a different search, status, or client filter.'}
            </p>
            {docs.length === 0 && (
              <ActionButton variant="primary" icon={UploadCloud} onClick={() => setShowUpload(true)}>Upload First Document</ActionButton>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-secondary/45">
                  <tr className="border-b border-border">
                    {['Document', 'Assigned To', 'Category', 'Status', 'Size', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[8px] uppercase tracking-[0.24em] text-muted-foreground font-black whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-b border-border last:border-b-0 pdv2-row-hover transition-colors">
                      <td className="px-4 py-3.5"><DocCell d={d} /></td>
                      <td className="px-4 py-3.5"><AssignedCell d={d} /></td>
                      <td className="px-4 py-3.5 text-[10.5px] text-muted-foreground whitespace-nowrap">
                        {CATEGORIES.find(c => c.value === d.category)?.label ?? d.category}
                      </td>
                      <td className="px-4 py-3.5"><StatusPill s={d.status} /></td>
                      <td className="px-4 py-3.5 text-[10.5px] text-muted-foreground whitespace-nowrap">{d.file_size || '—'}</td>
                      <td className="px-4 py-3.5 text-[10.5px] text-muted-foreground whitespace-nowrap">{fmtDate(d.uploaded_at ?? d.created_at)}</td>
                      <td className="px-4 py-3.5"><RowActions d={d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="xl:hidden divide-y divide-border">
              {filtered.map(d => (
                <div key={d.id} className="px-4 py-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <DocCell d={d} />
                    <StatusPill s={d.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <AssignedCell d={d} />
                    <span className="text-[10px] text-muted-foreground shrink-0">{d.file_size || ''} · {fmtDate(d.uploaded_at ?? d.created_at)}</span>
                  </div>
                  <RowActions d={d} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══ UPLOAD WIZARD ══ */}
      <AnimatePresence>
        {showUpload && (
          <Modal title="Upload Documents" subtitle={`Step ${step + 1} of 3 — ${['Choose files', 'Assign ownership', 'Details & upload'][step]}`} onClose={resetUpload} wide>
            {/* Step dots */}
            <div className="flex items-center gap-1.5 px-6 pt-4">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1.5 rounded-full transition-all"
                  style={{ width: i === step ? 22 : 8, backgroundColor: i <= step ? AC : 'hsl(var(--border))' }} />
              ))}
            </div>

            <div className="px-6 py-5">
              {/* STEP 1 — files */}
              {step === 0 && (
                <div className="space-y-4">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                    <UploadCloud className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-accent' : 'text-muted-foreground/50'}`} strokeWidth={1.3} />
                    <div className="text-[13px] font-semibold text-foreground">Drop files here or click to browse</div>
                    <div className="text-[10.5px] text-muted-foreground mt-1">
                      Any file type — PDF, PNG, JPG, HEIC, Excel, Word, and more. No app-imposed size limit.
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden"
                      onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
                  </div>

                  {pending.length > 0 && (
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {pending.map(pf => (
                        <div key={pf.key} className="flex items-center gap-3 px-3.5 py-2.5">
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${typeColor(extOf(pf.file.name))}14` }}>
                            <FileText className="w-3 h-3" style={{ color: typeColor(extOf(pf.file.name)) }} strokeWidth={1.8} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-foreground truncate">{pf.file.name}</div>
                            <div className="text-[9.5px] text-muted-foreground">{extOf(pf.file.name)} · {humanSize(pf.file.size)}</div>
                          </div>
                          <button onClick={() => setPending(p => p.filter(x => x.key !== pf.key))}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove file">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 — assign */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground flex items-center gap-1.5">
                      <FolderKanban className="w-3 h-3" strokeWidth={2} /> Assign to Project <span className="font-normal normal-case tracking-normal">(optional)</span>
                    </div>
                    <select value={upProject} onChange={e => handleProjectPick(e.target.value)} className={selectCls}>
                      <option value="">— No project —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}{p.project_code ? ` (${p.project_code})` : ''}</option>)}
                    </select>
                    {upProject && projects.find(p => p.id === upProject)?.portal_client_id && (
                      <p className="text-[10px] text-positive mt-1.5 flex items-center gap-1"><Link2 className="w-2.5 h-2.5" /> Linked portal client auto-selected below.</p>
                    )}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3 h-3" strokeWidth={2} /> Assign to Portal Client <span className="font-normal normal-case tracking-normal">(optional)</span>
                    </div>
                    <select value={upClient} onChange={e => setUpClient(e.target.value)} className={selectCls}>
                      <option value="">— No client (internal document) —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {upClient ? 'The client will see this document in their portal.' : 'Leave both empty to keep the document internal to the admin library.'}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3 — details + upload */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    {pending.map(pf => (
                      <div key={pf.key} className="flex items-center gap-3 px-3.5 py-2.5">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${typeColor(extOf(pf.file.name))}14` }}>
                          {pf.state === 'uploading' ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: AC }} />
                            : pf.state === 'done' ? <CheckCircle2 className="w-3 h-3 text-positive" strokeWidth={2} />
                            : pf.state === 'error' ? <XCircle className="w-3 h-3 text-destructive" strokeWidth={2} />
                            : <FileText className="w-3 h-3" style={{ color: typeColor(extOf(pf.file.name)) }} strokeWidth={1.8} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <input value={pf.displayName} disabled={uploading || pf.state === 'done'}
                            onChange={e => setPending(p => p.map(x => x.key === pf.key ? { ...x, displayName: e.target.value } : x))}
                            className="w-full text-[12px] font-medium bg-transparent outline-none text-foreground border-b border-transparent focus:border-accent transition-colors"
                            placeholder="Display name" />
                          <div className="text-[9.5px] mt-0.5 truncate">
                            {pf.state === 'error'
                              ? <span className="text-destructive">{pf.error}</span>
                              : <span className="text-muted-foreground">{extOf(pf.file.name)} · {humanSize(pf.file.size)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Category</div>
                      <select value={upCategory} onChange={e => setUpCategory(e.target.value)} className={selectCls} disabled={uploading}>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Status</div>
                      <select value={upStatus} onChange={e => setUpStatus(e.target.value)} className={selectCls} disabled={uploading}>
                        <option value="approved">Approved — verified & on file</option>
                        <option value="uploaded">Needs review</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Description (optional)</div>
                    <textarea value={upDesc} onChange={e => setUpDesc(e.target.value)} rows={2} disabled={uploading}
                      placeholder="What is this document? Applies to every file in this batch."
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="border-t border-border px-6 py-3.5 flex items-center justify-between gap-3 bg-secondary/10">
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || uploading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none">
                <ChevronLeft className="w-3 h-3" strokeWidth={2.4} /> Back
              </button>
              {step < 2 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={pending.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                  Continue <ChevronRight className="w-3 h-3" strokeWidth={2.4} />
                </button>
              ) : (
                <button onClick={runUpload} disabled={uploading || pending.length === 0 || pending.every(p => p.state === 'done')}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                  {uploading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                    : <><UploadCloud className="w-3 h-3" strokeWidth={2} /> Upload {pending.filter(p => p.state !== 'done').length} File{pending.filter(p => p.state !== 'done').length !== 1 ? 's' : ''}</>}
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ══ REQUEST MODAL ══ */}
      <AnimatePresence>
        {showRequest && (
          <Modal title="Request a Document" subtitle="The client sees the request in their portal and gets a message from you." onClose={() => setShowRequest(false)}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Portal Client *</div>
                <select value={reqClient} onChange={e => setReqClient(e.target.value)} className={selectCls}>
                  <option value="">— Select client —</option>
                  {approvedClients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Document Name *</div>
                <input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="e.g. Updated Insurance Certificate" className={inputCls} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Instructions (optional)</div>
                <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} rows={3}
                  placeholder="What to include or how to format it" className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-2.5 pt-1">
                <ActionButton variant="neutral" className="flex-1 !py-2.5" onClick={() => setShowRequest(false)}>Cancel</ActionButton>
                <button onClick={submitRequest} disabled={reqBusy || !reqClient || !reqName.trim()}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                  {reqBusy ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ══ EDIT MODAL ══ */}
      <AnimatePresence>
        {editDoc && editForm && (
          <Modal title="Edit Document" subtitle={editDoc.name} onClose={() => { setEditDoc(null); setEditForm(null); }}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Name *</div>
                <input value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Category</div>
                  <select value={editForm.category} onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))} className={selectCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Status</div>
                  <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))} className={selectCls}>
                    {STATUSES.map(s => <option key={s} value={s}>{s === 'pending' ? 'Awaiting upload' : s === 'uploaded' ? 'Needs review' : s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Portal Client</div>
                <select value={editForm.client_id} onChange={e => setEditForm((f: any) => ({ ...f, client_id: e.target.value }))} className={selectCls}>
                  <option value="">— Unassigned —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Project</div>
                <select value={editForm.project_id} onChange={e => setEditForm((f: any) => ({ ...f, project_id: e.target.value }))} className={selectCls}>
                  <option value="">— No project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}{p.project_code ? ` (${p.project_code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] font-bold mb-1.5 text-muted-foreground">Description</div>
                <textarea value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-2.5 pt-1">
                <ActionButton variant="neutral" className="flex-1 !py-2.5" onClick={() => { setEditDoc(null); setEditForm(null); }}>Cancel</ActionButton>
                <button onClick={saveEdit} disabled={editBusy || !editForm.name.trim()}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
                  {editBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
