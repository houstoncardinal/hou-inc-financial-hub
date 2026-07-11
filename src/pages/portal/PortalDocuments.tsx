import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FolderOpen, CheckCircle, AlertCircle, Clock, Trash2,
  FileText, File, Image, X, ArrowUpRight, Download, ExternalLink,
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
const MAX_SIZE_BYTES = 52_428_800; // 50 MB

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
    case 'uploaded':  return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Uploaded' };
    case 'approved':  return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Approved' };
    case 'pending':   return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Upload Required' };
    case 'rejected':  return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Rejected — Re-upload' };
    default:          return { color: MUTED,      bg: 'rgba(26,20,16,0.06)', label: status };
  }
}

function StatusIcon({ status }: { status: PortalDocument['status'] }) {
  switch (status) {
    case 'uploaded':
    case 'approved':
      return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={1.5} />;
    case 'pending':
      return <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} strokeWidth={1.5} />;
    case 'rejected':
      return <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} strokeWidth={1.5} />;
    default:
      return <Clock className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />;
  }
}

interface UploadState {
  docId: string | null;
  open: boolean;
}

export default function PortalDocuments() {
  const { client, getDocuments, uploadDocument, fulfillRequiredDoc, deleteDocument } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);
  if (!client) return null;

  const [docs, setDocs]         = useState<PortalDocument[]>(() => getDocuments());
  const [tab, setTab]           = useState<'all' | 'required' | 'uploaded'>('all');
  const [uploading, setUploading] = useState<UploadState>({ docId: null, open: false });
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy]         = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef                 = useRef<HTMLInputElement>(null);

  const refresh = () => setDocs(getDocuments());

  const filteredDocs = docs.filter(d => {
    if (tab === 'all') return true;
    if (tab === 'required') return d.category === 'required';
    if (tab === 'uploaded') return d.category === 'uploaded';
    return true;
  });

  const requiredPending = docs.filter(d => d.category === 'required' && (d.status === 'pending' || d.status === 'rejected')).length;

  const startUpload = (docId: string | null = null) => {
    setUploading({ docId, open: true });
    setSelectedFile(null);
    setProgress(0);
    setUploadError('');
  };

  const handleFilePick = (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large. Maximum size is ${formatBytes(MAX_SIZE_BYTES)}.`);
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

    // Simulate progress while uploading
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
        // Bucket might not exist yet — fall back to metadata-only record
        if (storageErr.message?.toLowerCase().includes('bucket') || storageErr.message?.toLowerCase().includes('not found')) {
          throw new Error('Storage bucket not configured. Run portal-setup.sql in Supabase first, then retry.');
        }
        throw storageErr;
      }

      clearInterval(ticker);
      setProgress(88);

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const fileUrl     = urlData?.publicUrl ?? '';
      const sizeStr     = formatBytes(selectedFile.size);
      const fileType    = ext.toUpperCase();

      if (uploading.docId) {
        await fulfillRequiredDoc(uploading.docId, {
          name: selectedFile.name,
          size: sizeStr,
          fileType,
          storagePath: path,
          fileUrl,
        });
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
    // Remove from storage if we have a path
    if (doc.storagePath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);
    }
    await deleteDocument(doc.id);
    refresh();
  };

  const TABS = [
    { key: 'all',      label: 'All Documents',    count: docs.length },
    { key: 'required', label: 'Required',          count: docs.filter(d => d.category === 'required').length },
    { key: 'uploaded', label: 'My Uploads',        count: docs.filter(d => d.category === 'uploaded').length },
  ] as const;

  return (
    <PortalLayout>
      <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">

        {/* Header */}
        <motion.div className="flex items-end justify-between mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div>
            <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>Document Center</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(24px, 3.5vw, 38px)', color: DARK, lineHeight: 1.08 }}>
              Your Files & Documents
            </div>
            {requiredPending > 0 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} strokeWidth={2} />
                <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>{requiredPending} document{requiredPending !== 1 ? 's' : ''} required by HOU INC</span>
              </div>
            )}
          </div>
          <button
            onClick={() => startUpload(null)}
            className="hidden md:flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-3 transition-opacity hover:opacity-85"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Upload className="w-3.5 h-3.5" strokeWidth={2} />
            Upload Document
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div className="flex gap-0 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex items-center gap-2 px-5 py-3 text-[10px] uppercase tracking-[0.22em] font-bold transition-colors"
              style={{ color: tab === t.key ? DARK : MUTED }}>
              {t.label}
              {t.count > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5"
                  style={{ backgroundColor: tab === t.key ? 'rgba(26,20,16,0.08)' : 'rgba(26,20,16,0.05)', color: tab === t.key ? DARK : MUTED }}>
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <motion.div className="absolute bottom-0 inset-x-0 h-0.5" style={{ backgroundColor: GOLD }} layoutId="doc-tab-line" />
              )}
            </button>
          ))}
        </motion.div>

        {/* Document list */}
        <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          {filteredDocs.length === 0 && (
            <div className="text-center py-20" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              <FolderOpen className="w-8 h-8 mx-auto mb-3" style={{ color: BORDER }} strokeWidth={1} />
              <div className="text-[13px] font-light" style={{ color: MUTED }}>No documents in this category yet</div>
              <button onClick={() => startUpload(null)}
                className="mt-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-black px-5 py-2.5"
                style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                Upload First Document
              </button>
            </div>
          )}

          {filteredDocs.map((doc, i) => {
            const ss   = statusStyle(doc.status);
            const Icon = getFileIcon(doc.fileType);
            const canDelete = doc.category === 'uploaded';
            const hasFile   = !!doc.fileUrl;

            return (
              <motion.div key={doc.id}
                className="flex items-center gap-4 p-4 md:p-5"
                style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>

                {/* File icon */}
                <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(26,20,16,0.04)', border: `1px solid ${BORDER}` }}>
                  <Icon className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold mb-0.5 truncate" style={{ color: DARK }}>{doc.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-light" style={{ color: MUTED }}>
                    {doc.fileType && <span className="uppercase">{doc.fileType}</span>}
                    {doc.size && <><span>·</span><span>{doc.size}</span></>}
                    {doc.uploadedAt && <><span>·</span><span>{new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>}
                    {doc.requestedBy && <><span>·</span><span className="font-semibold" style={{ color: GOLD }}>Requested by {doc.requestedBy}</span></>}
                  </div>
                  {doc.description && (
                    <div className="text-[10px] mt-1 font-light" style={{ color: 'rgba(26,20,16,0.4)' }}>{doc.description}</div>
                  )}
                </div>

                {/* Status badge */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: ss.bg }}>
                    <StatusIcon status={doc.status} />
                    <span className="text-[9px] uppercase tracking-[0.16em] font-bold whitespace-nowrap" style={{ color: ss.color }}>{ss.label}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(doc.status === 'pending' || doc.status === 'rejected') && (
                    <button onClick={() => startUpload(doc.id)}
                      className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-black px-3 py-2 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                      <Upload className="w-3 h-3" strokeWidth={2} />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                  )}
                  {hasFile && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      title="View / Download"
                      className="w-8 h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(26,20,16,0.3)', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.3)'; }}>
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </a>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(doc)}
                      title="Delete"
                      className="w-8 h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'rgba(26,20,16,0.25)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.25)'; }}>
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Mobile upload button */}
        <div className="md:hidden mt-6">
          <button onClick={() => startUpload(null)}
            className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.26em] font-black py-4 transition-opacity hover:opacity-85"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Upload className="w-4 h-4" strokeWidth={2} />
            Upload Document
          </button>
        </div>

      </div>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {uploading.open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Backdrop */}
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
              onClick={() => !busy && setUploading({ docId: null, open: false })} />

            {/* Modal */}
            <motion.div className="relative z-10 w-full max-w-md p-8"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
              initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: GOLD }}>
                    {uploading.docId ? 'Fulfill Required Document' : 'Upload Document'}
                  </div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '22px', color: DARK, lineHeight: 1.1 }}>
                    {uploading.docId
                      ? docs.find(d => d.id === uploading.docId)?.name ?? 'Upload File'
                      : 'Upload New Document'}
                  </div>
                </div>
                {!busy && (
                  <button onClick={() => setUploading({ docId: null, open: false })} style={{ color: MUTED }}>
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp"
                onChange={e => e.target.files?.[0] && handleFilePick(e.target.files[0])} />

              {/* Drop zone */}
              <div
                className="border-2 border-dashed flex flex-col items-center justify-center py-10 px-4 mb-5 cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? GOLD : selectedFile ? GOLD : BORDER,
                  backgroundColor: dragOver ? 'rgba(157,126,63,0.04)' : selectedFile ? 'rgba(157,126,63,0.03)' : 'rgba(26,20,16,0.02)',
                }}
                onClick={() => !busy && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFilePick(file);
                }}>
                <Upload className="w-7 h-7 mb-3" style={{ color: selectedFile ? GOLD : BORDER }} strokeWidth={1.5} />
                {selectedFile ? (
                  <div className="text-center">
                    <div className="text-[13px] font-semibold" style={{ color: DARK }}>{selectedFile.name}</div>
                    <div className="text-[10px] font-light mt-1" style={{ color: MUTED }}>{formatBytes(selectedFile.size)}</div>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] font-semibold mb-1" style={{ color: DARK }}>Drop file here or click to browse</div>
                    <div className="text-[10px] font-light" style={{ color: MUTED }}>PDF, Word, JPG, PNG, HEIC — up to 50 MB</div>
                  </>
                )}
              </div>

              {/* Upload error */}
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

              {/* Progress bar */}
              {busy && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: GOLD }}>Uploading…</span>
                    <span className="text-[10px] font-light" style={{ color: MUTED }}>{Math.round(Math.min(progress, 100))}%</span>
                  </div>
                  <div className="h-1 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
                    <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                      animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || busy}
                  className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                  {busy
                    ? <><span>Uploading…</span></>
                    : <><Upload className="w-3.5 h-3.5" strokeWidth={2} /><span>Upload File</span></>}
                </button>
                {!busy && (
                  <button onClick={() => { setUploading({ docId: null, open: false }); setSelectedFile(null); setUploadError(''); }}
                    className="px-5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
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
