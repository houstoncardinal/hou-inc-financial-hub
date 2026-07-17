import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useEntity } from '@/contexts/EntityContext';
import { financeProfileFor } from '@/lib/entityFinance';
import {
  useDocuments, useUploadDocument, useDeleteDocument, useUpdateDocument,
  useDocumentUrl, DOC_TYPE_LABELS, DOC_TYPE_COLORS, DocType, Document,
} from '@/hooks/useDocuments';
import { fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  Upload, Camera, X, FileText, Image, File, Search,
  Trash2, ExternalLink, RefreshCw, CheckCircle2, AlertCircle,
  Clock, FolderOpen, Grid3X3, List, ScanLine,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';

const DOC_TYPES: { value: DocType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Documents' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'contract', label: 'Contracts' },
  { value: 'permit', label: 'Permits' },
  { value: 'check_image', label: 'Check Images' },
  { value: 'tax', label: 'Tax Documents' },
  { value: 'bank_statement', label: 'Bank Statements' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'photo', label: 'Photos' },
  { value: 'other', label: 'Other' },
];

function OcrBadge({ status }: { status: Document['ocr_status'] }) {
  const map = {
    pending:    { icon: Clock,          label: 'Pending',   cls: 'text-muted-foreground' },
    processing: { icon: RefreshCw,      label: 'Reading…',  cls: 'text-blue-500 animate-spin' },
    complete:   { icon: CheckCircle2,   label: 'Read',      cls: 'text-positive' },
    failed:     { icon: AlertCircle,    label: 'Failed',    cls: 'text-accent' },
    skipped:    { icon: FileText,       label: 'Manual',    cls: 'text-muted-foreground' },
  };
  const { icon: Icon, label, cls } = map[status] ?? map.skipped;
  return (
    <span className={`flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-medium ${cls}`}>
      <Icon className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />
      {label}
    </span>
  );
}

function FileIcon({ mimeType, className = 'w-5 h-5' }: { mimeType: string | null; className?: string }) {
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

/* ── Document Detail Drawer ── */
function DocumentDrawer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { data: url } = useDocumentUrl(doc);
  const deleteDoc = useDeleteDocument();
  const updateDoc = useUpdateDocument();
  const [editTitle, setEditTitle] = useState(doc.title ?? '');
  const [editType, setEditType] = useState<DocType>(doc.doc_type);

  const handleSave = async () => {
    try {
      await updateDoc.mutateAsync({ id: doc.id, patch: { title: editTitle || null, doc_type: editType } });
      toast.success('Document updated');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc.mutateAsync(doc);
      toast.success('Document deleted');
      onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  const typeColor = DOC_TYPE_COLORS[doc.doc_type] ?? '#78716c';
  const extracted = doc.extracted_data ?? {};
  const hasExtracted = Object.keys(extracted).length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-md bg-background border-l border-border flex flex-col h-full overflow-y-auto"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Document</div>
            <div className="text-sm font-semibold truncate max-w-[260px]">{doc.title ?? doc.file_name}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Type badge + status */}
          <div className="flex items-center gap-3">
            <span
              className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1"
              style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
            >
              {DOC_TYPE_LABELS[doc.doc_type]}
            </span>
            <OcrBadge status={doc.ocr_status} />
          </div>

          {/* Preview */}
          {url && doc.file_type?.startsWith('image/') && (
            <div className="border border-border bg-secondary/20 p-2">
              <img src={url} alt={doc.file_name} className="w-full max-h-64 object-contain" />
            </div>
          )}

          {/* File info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['File Name', doc.file_name],
              ['Size', fmtBytes(doc.file_size)],
              ['Type', doc.file_type ?? '—'],
              ['Uploaded', fmtDate(doc.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="border border-border p-2">
                <div className="text-[9px] text-muted-foreground uppercase tracking-[0.14em] mb-0.5">{k}</div>
                <div className="font-medium truncate">{v}</div>
              </div>
            ))}
          </div>

          {/* OCR extracted data */}
          {hasExtracted && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
                <ScanLine className="w-3 h-3" strokeWidth={2} /> AI Extracted Data
              </div>
              <div className="border border-border divide-y divide-border">
                {Object.entries(extracted).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium font-mono-tab text-right max-w-[55%] truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit form */}
          <div className="space-y-3">
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Edit Document</div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Title (optional)</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder={doc.file_name}
                className="w-full border border-border bg-background px-3 h-9 text-xs outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Document Type</label>
              <select
                value={editType}
                onChange={e => setEditType(e.target.value as DocType)}
                className="w-full border border-border bg-background px-3 h-9 text-xs outline-none focus:border-foreground/30 transition-colors"
              >
                {DOC_TYPES.filter(t => t.value !== 'all').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleSave} disabled={updateDoc.isPending} className="rounded-none h-9 w-full text-xs bg-foreground text-background hover:opacity-90">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-5 py-4 flex items-center justify-between shrink-0">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} /> Open file
            </a>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button disabled={deleteDoc.isPending} className="flex items-center gap-1.5 text-xs text-accent hover:opacity-70 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                {deleteDoc.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none w-[calc(100%-2rem)]">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes the file from storage. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="rounded-none w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-none bg-destructive text-destructive-foreground w-full sm:w-auto" onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Upload Zone ── */
function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" multiple accept="*/*" className="hidden" onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ''; }} />

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{ borderColor: dragging ? 'var(--foreground)' : 'var(--border)', backgroundColor: dragging ? 'var(--secondary)' : 'transparent' }}
        onClick={() => fileRef.current?.click()}
      >
        <div className="py-10 flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-14 h-14 flex items-center justify-center bg-secondary">
            <FolderOpen className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">Drop files here or click to browse</div>
            <div className="text-xs text-muted-foreground mt-1">All file types · No size limit · Multiple files</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 h-10 border border-border bg-background hover:bg-secondary/40 text-xs font-medium transition-colors">
          <Camera className="w-3.5 h-3.5" strokeWidth={1.5} /> Take Photo
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 h-10 border border-border bg-background hover:bg-secondary/40 text-xs font-medium transition-colors">
          <Upload className="w-3.5 h-3.5" strokeWidth={1.5} /> Browse Files
        </button>
      </div>
    </div>
  );
}

/* ── Upload Modal ── */
function UploadModal({ files, onClose, onUploaded }: { files: File[]; onClose: () => void; onUploaded: () => void }) {
  const upload = useUploadDocument();
  const { entity } = useEntity();
  const tagPresets = financeProfileFor(entity?.id).documentTags;
  const [docType, setDocType] = useState<DocType>('receipt');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleUpload = async () => {
    setProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        await upload.mutateAsync({ file: files[i], docType, title: title || undefined, tags: tags.length ? tags : undefined, runOcr: true });
        setProgress(((i + 1) / files.length) * 100);
      }
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully`);
      onUploaded();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed');
      setProgress(null);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-md bg-background border-t sm:border border-border"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 38 }}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Upload {files.length > 1 ? `${files.length} Files` : 'File'}</div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* File list */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs border border-border px-2.5 py-1.5">
                <FileIcon mimeType={f.type} className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-muted-foreground shrink-0">{fmtBytes(f.size)}</span>
              </div>
            ))}
          </div>

          {/* Doc type */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-1 block">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as DocType)}
              className="w-full border border-border bg-background px-3 h-10 text-sm outline-none focus:border-foreground/30 transition-colors"
            >
              {DOC_TYPES.filter(t => t.value !== 'all').map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-1 block">Title (optional)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Leave blank to use filename"
              className="w-full border border-border bg-background px-3 h-10 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          {/* Entity-specific classification tags */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-1.5 block">
              Tags <span className="normal-case tracking-normal">(optional — {entity?.shortName ?? 'entity'} classifications)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {tagPresets.map(tag => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-[10px] font-bold border transition-colors ${
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* OCR notice */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-secondary/40 border border-border">
            <ScanLine className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              Images will be automatically scanned with AI to extract amounts, dates, vendors, and other details — no manual entry needed.
            </div>
          </div>

          {/* Progress bar */}
          {progress !== null && (
            <div className="h-1 bg-border">
              <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={upload.isPending} className="rounded-none flex-1 h-10 text-xs">Cancel</Button>
            <Button onClick={handleUpload} disabled={upload.isPending} className="rounded-none flex-1 h-10 text-xs bg-foreground text-background hover:opacity-90">
              {upload.isPending ? 'Uploading…' : 'Upload & Scan'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Document Card ── */
function DocumentCard({ doc, onClick }: { doc: Document; onClick: () => void }) {
  const typeColor = DOC_TYPE_COLORS[doc.doc_type] ?? '#78716c';
  const extracted = doc.extracted_data ?? {};

  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-border bg-background hover:bg-secondary/30 hover:border-foreground/20 active:bg-secondary/50 transition-all duration-150 flex flex-col overflow-hidden"
    >
      {/* Top accent */}
      <div className="h-0.5 w-full" style={{ backgroundColor: typeColor }} />
      <div className="p-3.5 flex flex-col gap-2 h-full">
        {/* Type + OCR status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] uppercase tracking-[0.22em] font-bold px-2 py-0.5" style={{ backgroundColor: `${typeColor}18`, color: typeColor }}>
            {DOC_TYPE_LABELS[doc.doc_type]}
          </span>
          <OcrBadge status={doc.ocr_status} />
        </div>

        {/* File icon + name */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center bg-secondary shrink-0">
            <FileIcon mimeType={doc.file_type} className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate leading-tight">{doc.title ?? doc.file_name}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5 font-mono-tab">{fmtBytes(doc.file_size)}</div>
          </div>
        </div>

        {/* Extracted preview */}
        {doc.ocr_status === 'complete' && extracted.amount && (
          <div className="flex items-center gap-2 border-t border-border pt-2 mt-auto">
            <span className="text-[9px] text-muted-foreground">Amount</span>
            <span className="text-xs font-semibold font-mono-tab text-positive ml-auto">${extracted.amount}</span>
          </div>
        )}

        {/* Date */}
        <div className="text-[9px] text-muted-foreground font-mono-tab">{fmtDate(doc.created_at)}</div>
      </div>
    </button>
  );
}

/* ── Main Page ── */
export default function Documents() {
  const navigate = useNavigate();
  const location = useLocation();
  const { entity } = useEntity();

  const [filterType, setFilterType] = useState<DocType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);

  const { data: docs = [], isLoading } = useDocuments();

  // Handle files captured by camera from the dashboard
  useEffect(() => {
    const state = location.state as { capturedFile?: File } | null;
    if (state?.capturedFile) {
      setPendingFiles([state.capturedFile]);
      setShowUploadZone(false);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const filteredDocs = docs.filter(doc => {
    if (filterType !== 'all' && doc.doc_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        doc.file_name.toLowerCase().includes(q) ||
        (doc.title ?? '').toLowerCase().includes(q) ||
        DOC_TYPE_LABELS[doc.doc_type].toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Counts by type
  const counts: Partial<Record<DocType | 'all', number>> = { all: docs.length };
  for (const doc of docs) {
    counts[doc.doc_type] = (counts[doc.doc_type] ?? 0) + 1;
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    setPendingFiles(files);
    setShowUploadZone(false);
  };

  return (
    <AppShell>
      <input ref={fileRef} type="file" multiple accept="*/*" className="hidden" onChange={e => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />

      <PageHeader
        eyebrow={entity?.name ?? 'Finance'}
        title="Documents"
        description="Store, scan, and organize all financial documents — receipts, contracts, permits, and more."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none h-8 text-[10px]"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="w-3 h-3 mr-1.5" strokeWidth={1.5} /> Scan
            </Button>
            <Button
              size="sm"
              className="rounded-none h-8 text-[10px] bg-foreground text-background hover:opacity-90"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3 h-3 mr-1.5" strokeWidth={1.5} /> Upload
            </Button>
          </div>
        }
      />

      {/* Entity awareness banner */}
      {entity && (
        <div
          className="px-4 sm:px-8 py-2 flex items-center gap-3 border-b"
          style={{ borderColor: entity.color, backgroundColor: entity.colorMuted }}
        >
          <div className="w-0.5 h-4 shrink-0" style={{ backgroundColor: entity.color }} />
          <span className="text-[9px] uppercase tracking-[0.24em] font-bold" style={{ color: entity.color }}>
            {entity.shortName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Documents stored for {entity.name} · {docs.length} total
          </span>
          <button
            onClick={() => navigate('/finance')}
            className="ml-auto text-[9px] uppercase tracking-[0.18em] font-bold hover:opacity-70 transition-opacity"
            style={{ color: entity.color }}
          >
            Switch Entity →
          </button>
        </div>
      )}

      {/* ── Upload zone (collapsible) ── */}
      <AnimatePresence>
        {showUploadZone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-4 sm:px-8 py-5">
              <UploadZone onFiles={handleFiles} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters + search ── */}
      <div className="border-b border-border px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Type filter scroll row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 flex-1 min-w-0">
          {DOC_TYPES.map(t => {
            const count = counts[t.value as keyof typeof counts] ?? 0;
            const active = filterType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium shrink-0 border transition-all duration-150"
                style={{
                  borderColor: active ? (t.value !== 'all' ? (DOC_TYPE_COLORS[t.value as DocType] ?? 'var(--foreground)') : 'var(--foreground)') : 'transparent',
                  backgroundColor: active ? 'var(--secondary)' : 'transparent',
                  color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                }}
              >
                {t.label}
                {count > 0 && <span className="text-[8px] font-mono-tab opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search + view toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-7 pl-7 pr-3 text-xs border border-border bg-background outline-none w-36 focus:border-foreground/30 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Grid3X3 className="w-3.5 h-3.5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* ── Document grid / list ── */}
      <div className="px-4 sm:px-8 py-4 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Loading documents…</div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-secondary">
              <FolderOpen className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium">{search || filterType !== 'all' ? 'No documents match' : 'No documents yet'}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {search || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload receipts, contracts, permits and more — AI reads them automatically'}
              </div>
            </div>
            {!search && filterType === 'all' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-none h-8 text-xs" onClick={() => cameraRef.current?.click()}>
                  <Camera className="w-3 h-3 mr-1.5" strokeWidth={1.5} /> Scan
                </Button>
                <Button size="sm" className="rounded-none h-8 text-xs bg-foreground text-background hover:opacity-90" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3 h-3 mr-1.5" strokeWidth={1.5} /> Upload
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredDocs.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} />
            ))}
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {filteredDocs.map(doc => {
              const typeColor = DOC_TYPE_COLORS[doc.doc_type] ?? '#78716c';
              const extracted = doc.extracted_data ?? {};
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
                >
                  <div className="w-0.5 h-8 shrink-0 self-stretch" style={{ backgroundColor: typeColor }} />
                  <div className="w-8 h-8 flex items-center justify-center bg-secondary shrink-0">
                    <FileIcon mimeType={doc.file_type} className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.title ?? doc.file_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] uppercase tracking-[0.18em] font-bold" style={{ color: typeColor }}>
                        {DOC_TYPE_LABELS[doc.doc_type]}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono-tab">{fmtBytes(doc.file_size)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <OcrBadge status={doc.ocr_status} />
                    {extracted.amount && (
                      <div className="text-xs font-semibold font-mono-tab text-positive mt-0.5">${extracted.amount}</div>
                    )}
                    <div className="text-[9px] text-muted-foreground font-mono-tab mt-0.5">{fmtDate(doc.created_at)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {pendingFiles && (
          <UploadModal
            files={pendingFiles}
            onClose={() => setPendingFiles(null)}
            onUploaded={() => setPendingFiles(null)}
          />
        )}
      </AnimatePresence>

      {/* Document Detail Drawer */}
      <AnimatePresence>
        {selectedDoc && (
          <DocumentDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>

      <div className="md:hidden pb-20" />
    </AppShell>
  );
}
