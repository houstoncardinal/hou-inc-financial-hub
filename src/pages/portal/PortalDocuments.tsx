import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FolderOpen, CheckCircle, AlertCircle, Clock, Trash2,
  FileText, File, Image, X, ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, PortalDocument } from '@/hooks/usePortal';

const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('pdf')) return FileText;
  if (t.includes('image') || t.includes('jpg') || t.includes('png') || t.includes('jpeg')) return Image;
  return File;
}

function statusStyle(status: PortalDocument['status']): { color: string; bg: string; label: string } {
  switch (status) {
    case 'uploaded':  return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Uploaded' };
    case 'approved':  return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Approved' };
    case 'pending':   return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Upload Required' };
    case 'rejected':  return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Rejected' };
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
    default:
      return <Clock className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />;
  }
}

interface UploadState {
  docId: string | null;   /* null = new upload, else fulfil a required doc */
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
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy]         = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const refresh = () => setDocs(getDocuments());

  const filteredDocs = docs.filter(d => {
    if (tab === 'all') return true;
    if (tab === 'required') return d.category === 'required';
    if (tab === 'uploaded') return d.category === 'uploaded';
    return true;
  });

  const requiredPending = docs.filter(d => d.category === 'required' && d.status === 'pending').length;

  const startUpload = (docId: string | null = null) => {
    setUploading({ docId, open: true });
    setFileName('');
    setProgress(0);
  };

  const handleFilePick = (file: File) => {
    setFileName(file.name);
  };

  const handleUploadSimulate = () => {
    if (!fileName) return;
    setBusy(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 18 + 5;
      });
    }, 180);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const sizeKB = Math.floor(Math.random() * 4000 + 200);
      const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
      const ext = fileName.split('.').pop()?.toUpperCase() ?? 'FILE';

      if (uploading.docId) {
        fulfillRequiredDoc(uploading.docId, { name: fileName, size: sizeStr, fileType: ext });
      } else {
        uploadDocument(fileName, ext, sizeStr);
      }
      refresh();
      setTimeout(() => {
        setUploading({ docId: null, open: false });
        setBusy(false);
        setProgress(0);
        setFileName('');
      }, 600);
    }, 2200);
  };

  const handleDelete = (docId: string) => {
    deleteDocument(docId);
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
              <div className="flex items-center gap-2 mt-3 px-3 py-2 inline-flex" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
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
        <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
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
            const ss = statusStyle(doc.status);
            const Icon = getFileIcon(doc.fileType);
            return (
              <motion.div key={doc.id}
                className="flex items-center gap-5 p-5"
                style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                {/* File icon */}
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(26,20,16,0.04)', border: `1px solid ${BORDER}` }}>
                  <Icon className="w-4 h-4" style={{ color: MUTED }} strokeWidth={1.5} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: DARK }}>{doc.name}</div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-light" style={{ color: MUTED }}>
                    {doc.fileType && <span className="uppercase">{doc.fileType}</span>}
                    {doc.size && <><span>·</span><span>{doc.size}</span></>}
                    {doc.uploadedAt && <><span>·</span><span>{new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>}
                    {doc.requestedBy && <><span>·</span><span className="font-semibold" style={{ color: GOLD }}>Requested by {doc.requestedBy}</span></>}
                  </div>
                  {doc.description && (
                    <div className="text-[10px] mt-1 font-light" style={{ color: 'rgba(26,20,16,0.4)' }}>{doc.description}</div>
                  )}
                </div>
                {/* Status */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: ss.bg }}>
                    <StatusIcon status={doc.status} />
                    <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: ss.color }}>{ss.label}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === 'pending' && (
                    <button onClick={() => startUpload(doc.id)}
                      className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-black px-3 py-2 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                      <Upload className="w-3 h-3" strokeWidth={2} />
                      Upload
                    </button>
                  )}
                  {doc.category === 'uploaded' && (
                    <button onClick={() => handleDelete(doc.id)}
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
          <>
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
                    <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: GOLD }}>Upload Document</div>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '24px', color: DARK, lineHeight: 1.1 }}>
                      {uploading.docId ? docs.find(d => d.id === uploading.docId)?.name ?? 'Upload File' : 'Upload New Document'}
                    </div>
                  </div>
                  {!busy && (
                    <button onClick={() => setUploading({ docId: null, open: false })} style={{ color: MUTED }}>
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>

                {/* Drop zone */}
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic"
                  onChange={e => e.target.files?.[0] && handleFilePick(e.target.files[0])} />

                <div
                  className="border-2 border-dashed flex flex-col items-center justify-center py-10 px-4 mb-6 cursor-pointer transition-colors"
                  style={{
                    borderColor: dragOver ? GOLD : BORDER,
                    backgroundColor: dragOver ? 'rgba(157,126,63,0.04)' : 'rgba(26,20,16,0.02)',
                  }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFilePick(file);
                  }}>
                  <Upload className="w-7 h-7 mb-3" style={{ color: fileName ? GOLD : BORDER }} strokeWidth={1.5} />
                  {fileName
                    ? <div className="text-[13px] font-semibold text-center" style={{ color: DARK }}>{fileName}</div>
                    : <>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: DARK }}>Drop file here or click to browse</div>
                      <div className="text-[10px] font-light" style={{ color: MUTED }}>PDF, Word, JPG, PNG up to 50 MB</div>
                    </>
                  }
                </div>

                {/* Progress bar */}
                {busy && (
                  <div className="mb-5">
                    <div className="h-1 overflow-hidden mb-2" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
                      <motion.div className="h-full" style={{ backgroundColor: GOLD }}
                        animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.3 }} />
                    </div>
                    <div className="text-[10px] text-center font-light" style={{ color: MUTED }}>
                      {progress >= 100 ? 'Upload complete' : `Uploading… ${Math.round(progress)}%`}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleUploadSimulate}
                    disabled={!fileName || busy}
                    className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                    {busy ? 'Uploading…' : <><Upload className="w-3.5 h-3.5" strokeWidth={2} />Upload File</>}
                  </button>
                  {!busy && (
                    <button onClick={() => setUploading({ docId: null, open: false })}
                      className="px-5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                      style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
