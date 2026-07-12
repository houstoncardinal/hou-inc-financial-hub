import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FolderOpen, CheckCircle, AlertCircle, Clock, Trash2,
  FileText, File, Image, X, Download, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, PortalDocument } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const STORAGE_BUCKET = 'portal-documents';
const MAX_SIZE_BYTES = 52_428_800;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function safeName(raw: string) {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('pdf')) return FileText;
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg') || t.includes('heic')) return Image;
  return File;
}

function statusStyle(status: PortalDocument['status']): { color: string; bg: string; label: string } {
  switch (status) {
    case 'uploaded': return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Uploaded' };
    case 'approved': return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Approved' };
    case 'pending':  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Upload Required' };
    case 'rejected': return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Rejected — Re-upload' };
    default:         return { color: MUTED,     bg: 'rgba(26,20,16,0.06)', label: status };
  }
}

function StatusIcon({ status }: { status: PortalDocument['status'] }) {
  switch (status) {
    case 'uploaded':
    case 'approved':  return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={1.5} />;
    case 'pending':   return <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} strokeWidth={1.5} />;
    case 'rejected':  return <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} strokeWidth={1.5} />;
    default:          return <Clock className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />;
  }
}

function isImage(fileType: string) {
  const t = fileType.toLowerCase();
  return t.includes('jpg') || t.includes('jpeg') || t.includes('png') || t.includes('gif') || t.includes('webp') || t.includes('heic') || t.includes('image');
}
function isPDF(fileType: string) {
  return fileType.toLowerCase().includes('pdf');
}

interface UploadState { docId: string | null; open: boolean; }

export default function PortalDocuments() {
  const { client, loaded, getDocuments, uploadDocument, fulfillRequiredDoc, deleteDocument } = usePortal();
  const navigate = useNavigate();

  // ── ALL hooks must be declared before any early return ──
  const [docs, setDocs]           = useState<PortalDocument[]>([]);
  const [tab, setTab]             = useState<'all' | 'required' | 'uploaded' | 'contract'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<PortalDocument | null>(null);
  const [previewDoc, setPreviewDoc]       = useState<PortalDocument | null>(null);
  const [uploading, setUploading] = useState<UploadState>({ docId: null, open: false });
  const [dragOver, setDragOver]   = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress]   = useState(0);
  const [busy, setBusy]           = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  // Sync docs from hook whenever hook documents update (after Supabase load)
  useEffect(() => {
    const current = getDocuments();
    if (current.length > 0) setDocs(current);
  }, [getDocuments]);

  // ── Now safe to return early after all hooks ──
  if (!loaded || !client) return null;

  const refresh = () => setDocs(getDocuments());

  const filteredDocs = docs.filter(d => {
    if (tab === 'required') return d.category === 'required';
    if (tab === 'uploaded') return d.category === 'uploaded';
    if (tab === 'contract') return d.category === 'contract';
    return true;
  });

  const requiredPending = docs.filter(d => d.category === 'required' && (d.status === 'pending' || d.status === 'rejected')).length;

  const TABS = [
    { key: 'all',      label: 'All',       count: docs.length },
    { key: 'required', label: 'Required',  count: docs.filter(d => d.category === 'required').length },
    { key: 'uploaded', label: 'My Uploads',count: docs.filter(d => d.category === 'uploaded').length },
    { key: 'contract', label: 'Contracts', count: docs.filter(d => d.category === 'contract').length },
  ] as const;

  const startUpload = (docId: string | null = null) => {
    setUploading({ docId, open: true });
    setSelectedFile(null);
    setProgress(0);
    setUploadError('');
  };

  const handleFilePick = (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large. Maximum is ${formatBytes(MAX_SIZE_BYTES)}.`);
      return;
    }
    setSelectedFile(file);
    setUploadError('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !client) return;
    setBusy(true);
    setProgress(5);
    setUploadError('');

    const ticker = setInterval(() => {
      setProgress(p => p < 70 ? p + Math.random() * 12 + 3 : p);
    }, 200);

    try {
      const ext  = selectedFile.name.split('.').pop() ?? 'bin';
      const path = `${client.id}/${Date.now()}-${safeName(selectedFile.name)}`;

      const { error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, selectedFile, { cacheControl: '3600', upsert: false });

      if (storageErr) {
        if (storageErr.message?.toLowerCase().includes('bucket') || storageErr.message?.toLowerCase().includes('not found')) {
          throw new Error('Storage bucket not configured. Run portal-setup.sql in Supabase first.');
        }
        throw storageErr;
      }

      clearInterval(ticker);
      setProgress(88);

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const fileUrl  = urlData?.publicUrl ?? '';
      const sizeStr  = formatBytes(selectedFile.size);
      const fileType = ext.toUpperCase();

      if (uploading.docId) {
        await fulfillRequiredDoc(uploading.docId, { name: selectedFile.name, size: sizeStr, fileType, storagePath: path, fileUrl });
      } else {
        await uploadDocument(selectedFile.name, fileType, sizeStr, 'uploaded', path, fileUrl);
      }

      setProgress(100);
      refresh();

      setTimeout(() => {
        setUploading({ docId: null, open: false });
        setBusy(false);
        setProgress(0);
        setSelectedFile(null);
      }, 700);
    } catch (err: any) {
      clearInterval(ticker);
      setBusy(false);
      setProgress(0);
      setUploadError(err?.message ?? 'Upload failed. Please try again.');
    }
  };

  const handleDelete = async (doc: PortalDocument) => {
    if (doc.storagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);
    }
    await deleteDocument(doc.id);
    setDeleteConfirm(null);
    refresh();
  };

  return (
    <PortalLayout>
      <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-12 max-w-5xl">

        {/* ── Header ── */}
        <motion.div className="flex items-start justify-between gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}>
          <div className="min-w-0">
            <div className="text-[7px] sm:text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>
              Document Center
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 4vw, 36px)', color: DARK, lineHeight: 1.08 }}>
              Your Files & Documents
            </div>
            {requiredPending > 0 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2"
                style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} strokeWidth={2} />
                <span className="text-[11px] font-semibold" style={{ color: '#b45309' }}>
                  {requiredPending} document{requiredPending !== 1 ? 's' : ''} required by HOU INC
                </span>
              </div>
            )}
          </div>
          <button onClick={() => startUpload(null)}
            className="hidden md:flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-3 shrink-0 transition-opacity hover:opacity-85"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Upload className="w-3.5 h-3.5" strokeWidth={2} />
            Upload
          </button>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div
          className="flex overflow-x-auto mb-5 sm:mb-6"
          style={{ borderBottom: `1px solid ${BORDER}`, scrollbarWidth: 'none' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex items-center gap-1.5 px-3 sm:px-5 py-3 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold whitespace-nowrap transition-colors shrink-0"
              style={{ color: tab === t.key ? DARK : MUTED }}>
              {t.label}
              {t.count > 0 && (
                <span className="text-[8px] font-black px-1.5 py-0.5"
                  style={{ backgroundColor: tab === t.key ? 'rgba(26,20,16,0.08)' : 'rgba(26,20,16,0.05)', color: tab === t.key ? DARK : MUTED }}>
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <motion.div className="absolute bottom-0 inset-x-0 h-0.5" style={{ backgroundColor: GOLD }} layoutId="doc-tab" />
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Document list ── */}
        <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}>
          {filteredDocs.length === 0 && (
            <div className="py-16 sm:py-20 text-center" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              <FolderOpen className="w-8 h-8 mx-auto mb-3" style={{ color: BORDER }} strokeWidth={1} />
              <div className="text-[13px] font-light mb-4" style={{ color: MUTED }}>
                {docs.length === 0 ? 'No documents yet. Upload your first file.' : 'No documents in this category.'}
              </div>
              <button onClick={() => startUpload(null)}
                className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-black px-5 py-2.5 transition-opacity hover:opacity-85"
                style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                <Upload className="w-3.5 h-3.5" strokeWidth={2} />
                Upload Document
              </button>
            </div>
          )}

          {filteredDocs.map((doc, i) => {
            const ss         = statusStyle(doc.status);
            const Icon       = getFileIcon(doc.fileType);
            const canDelete  = doc.category === 'uploaded';
            const hasFile    = !!doc.fileUrl;
            const canPreview = hasFile && (isImage(doc.fileType) || isPDF(doc.fileType));

            return (
              <motion.div key={doc.id}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5"
                style={{
                  backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`,
                  cursor: canPreview ? 'pointer' : 'default',
                }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => { if (canPreview) setPreviewDoc(doc); }}>

                {/* Icon */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(26,20,16,0.04)', border: `1px solid ${BORDER}` }}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: MUTED }} strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] sm:text-[13px] font-bold truncate mb-0.5" style={{ color: DARK }}>
                    {doc.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-light" style={{ color: MUTED }}>
                    {doc.fileType && <span className="uppercase">{doc.fileType}</span>}
                    {doc.size     && <><span>·</span><span>{doc.size}</span></>}
                    {doc.uploadedAt && (
                      <><span>·</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
                    )}
                    {doc.requestedBy && (
                      <><span>·</span>
                      <span className="font-semibold" style={{ color: GOLD }}>Req. by {doc.requestedBy}</span></>
                    )}
                  </div>
                  {doc.description && (
                    <div className="text-[9px] sm:text-[10px] mt-0.5 font-light line-clamp-1"
                      style={{ color: 'rgba(26,20,16,0.38)' }}>
                      {doc.description}
                    </div>
                  )}
                  {/* Status badge — visible on mobile inline */}
                  <div className="sm:hidden mt-1.5 inline-flex items-center gap-1 px-2 py-0.5" style={{ backgroundColor: ss.bg }}>
                    <span className="text-[8px] uppercase tracking-[0.14em] font-bold" style={{ color: ss.color }}>{ss.label}</span>
                  </div>
                </div>

                {/* Status badge — desktop */}
                <div className="hidden sm:flex items-center shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: ss.bg }}>
                    <StatusIcon status={doc.status} />
                    <span className="text-[9px] uppercase tracking-[0.14em] font-bold whitespace-nowrap" style={{ color: ss.color }}>
                      {ss.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {(doc.status === 'pending' || doc.status === 'rejected') && (
                    <button onClick={() => startUpload(doc.id)}
                      className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] uppercase tracking-[0.16em] font-black px-2.5 sm:px-3 py-2 transition-opacity hover:opacity-80 active:opacity-60"
                      style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                      <Upload className="w-3 h-3" strokeWidth={2} />
                      <span>Upload</span>
                    </button>
                  )}
                  {canPreview && (
                    <button onClick={() => setPreviewDoc(doc)} title="Preview"
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(26,20,16,0.28)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.28)'; }}>
                      <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                  {hasFile && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="Download"
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(26,20,16,0.28)', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.28)'; }}>
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </a>
                  )}
                  {canDelete && (
                    <button onClick={() => setDeleteConfirm(doc)} title="Delete"
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(26,20,16,0.22)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.22)'; }}>
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mobile upload button */}
        <div className="md:hidden mt-5">
          <button onClick={() => startUpload(null)}
            className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.26em] font-black py-4 transition-opacity hover:opacity-85 active:opacity-70"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Upload className="w-4 h-4" strokeWidth={2} />
            Upload Document
          </button>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
              onClick={() => setPreviewDoc(null)} />
            <motion.div className="relative z-10 w-full flex flex-col"
              style={{ maxWidth: 900, maxHeight: '92vh', backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0"
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="min-w-0 mr-4">
                  <div className="text-[7px] uppercase tracking-[0.36em] font-bold mb-0.5" style={{ color: GOLD }}>Preview</div>
                  <div className="text-[12px] sm:text-[13px] font-bold truncate" style={{ color: DARK }}>{previewDoc.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-black px-3 sm:px-4 py-2 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: GOLD, color: '#FAF7F2', textDecoration: 'none' }}>
                    <Download className="w-3 h-3" strokeWidth={2} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                  <button onClick={() => setPreviewDoc(null)} className="w-8 h-8 flex items-center justify-center transition-colors"
                    style={{ color: MUTED }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = DARK; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}>
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ minHeight: 0, backgroundColor: 'rgba(26,20,16,0.02)' }}>
                {isImage(previewDoc.fileType) ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.name} className="max-w-full max-h-full object-contain" style={{ maxHeight: '72vh' }} />
                ) : isPDF(previewDoc.fileType) ? (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.name} className="w-full" style={{ height: '72vh', border: 'none' }} />
                ) : (
                  <div className="text-center py-16">
                    <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: BORDER }} strokeWidth={1} />
                    <p className="text-[12px] font-light mb-4" style={{ color: MUTED }}>Preview unavailable for this file type.</p>
                    <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-5 py-3 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: GOLD, color: '#FAF7F2', textDecoration: 'none' }}>
                      <Download className="w-3.5 h-3.5" strokeWidth={2} /> Open File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setDeleteConfirm(null)} />
            <motion.div className="relative z-10 w-full max-w-sm p-6 sm:p-7"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.2 }}>
              <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: '#ef4444' }}>Confirm Delete</div>
              <div className="text-[15px] font-bold mb-2" style={{ color: DARK }}>Remove this document?</div>
              <p className="text-[12px] font-light mb-6" style={{ color: MUTED }}>
                <span className="font-semibold" style={{ color: DARK }}>{deleteConfirm.name}</span>{' '}
                will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-[0.22em] font-black transition-opacity hover:opacity-85"
                  style={{ backgroundColor: '#ef4444', color: '#FFFFFF' }}>
                  Delete
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {uploading.open && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
              onClick={() => !busy && setUploading({ docId: null, open: false })} />
            <motion.div className="relative z-10 w-full sm:max-w-md p-6 sm:p-8"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: '0' }}
              initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>

              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: GOLD }}>
                    {uploading.docId ? 'Fulfill Required Document' : 'Upload Document'}
                  </div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '20px', color: DARK, lineHeight: 1.1 }}>
                    {uploading.docId
                      ? (docs.find(d => d.id === uploading.docId)?.name ?? 'Upload File')
                      : 'Upload New Document'}
                  </div>
                </div>
                {!busy && (
                  <button onClick={() => setUploading({ docId: null, open: false })} style={{ color: MUTED }}>
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                )}
              </div>

              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp"
                onChange={e => e.target.files?.[0] && handleFilePick(e.target.files[0])} />

              {/* Drop zone */}
              <div
                className="border-2 border-dashed flex flex-col items-center justify-center py-9 px-4 mb-4 cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? GOLD : selectedFile ? GOLD : BORDER,
                  backgroundColor: dragOver ? 'rgba(157,126,63,0.04)' : selectedFile ? 'rgba(157,126,63,0.03)' : 'rgba(26,20,16,0.02)',
                }}
                onClick={() => !busy && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFilePick(f); }}>
                <Upload className="w-6 h-6 mb-3" style={{ color: selectedFile ? GOLD : BORDER }} strokeWidth={1.5} />
                {selectedFile ? (
                  <div className="text-center">
                    <div className="text-[13px] font-semibold" style={{ color: DARK }}>{selectedFile.name}</div>
                    <div className="text-[10px] font-light mt-1" style={{ color: MUTED }}>{formatBytes(selectedFile.size)}</div>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] font-semibold mb-1 text-center" style={{ color: DARK }}>
                      <span className="hidden sm:inline">Drop file here or </span>tap to browse
                    </div>
                    <div className="text-[10px] font-light text-center" style={{ color: MUTED }}>
                      PDF, Word, JPG, PNG, HEIC — up to 50 MB
                    </div>
                  </>
                )}
              </div>

              <AnimatePresence>
                {uploadError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-4 px-3 py-2.5 flex items-start gap-2"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} strokeWidth={2} />
                    <span className="text-[11px] font-light" style={{ color: '#ef4444' }}>{uploadError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {busy && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD }}>Uploading…</span>
                    <span className="text-[10px] font-light" style={{ color: MUTED }}>{Math.round(Math.min(progress, 100))}%</span>
                  </div>
                  <div className="h-0.5 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
                    <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                      animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleUpload} disabled={!selectedFile || busy}
                  className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5 transition-opacity disabled:opacity-40 hover:opacity-85"
                  style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                  {busy ? 'Uploading…' : <><Upload className="w-3.5 h-3.5" strokeWidth={2} /> Upload File</>}
                </button>
                {!busy && (
                  <button onClick={() => { setUploading({ docId: null, open: false }); setSelectedFile(null); setUploadError(''); }}
                    className="px-5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all hover:opacity-75"
                    style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
