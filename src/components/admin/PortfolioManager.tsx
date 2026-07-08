import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Trash2, Edit3, Star, Image as ImageIcon,
  Video, Upload, CheckCircle2, AlertCircle, Loader2,
  ImagePlus, PlayCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const G200 = '#E5DFD6';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SERIF = "'Cormorant Garamond', Georgia, serif";

const CATEGORIES = [
  'Luxury Residential', 'Commercial Industrial', 'Retail & Mixed-Use',
  'Medical & Healthcare', 'High-Rise Residential', 'Renovation', 'Project Management',
];

/* ── Types ───────────────────────────────────────────────────────────── */
export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  location: string;
  sqft: string | null;
  year: string;
  description: string | null;
  featured: boolean;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface PortfolioMedia {
  id: string;
  project_id: string;
  url: string;
  storage_path: string;
  media_type: 'image' | 'video';
  sort_order: number;
}

interface UploadItem {
  uid: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
  previewUrl?: string;
}

/* ── Storage helpers ─────────────────────────────────────────────────── */
const SUPA_URL  = (import.meta.env.VITE_SUPABASE_URL  as string) ?? '';
const SUPA_ANON = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? '';

function publicUrl(path: string) {
  return `${SUPA_URL}/storage/v1/object/public/portfolio/${path}`;
}

function uploadWithProgress(
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(publicUrl(path));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).message ?? 'Upload failed')); }
        catch { reject(new Error('Upload failed')); }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', `${SUPA_URL}/storage/v1/object/portfolio/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPA_ANON}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });
}

/* ── DB helpers ──────────────────────────────────────────────────────── */
const db = supabase as any;

async function loadProjects(): Promise<PortfolioProject[]> {
  const { data, error } = await db.from('portfolio_projects').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function createProject(f: Omit<PortfolioProject, 'id' | 'created_at'>): Promise<PortfolioProject> {
  const { data, error } = await db.from('portfolio_projects').insert(f).select().single();
  if (error) throw error;
  return data;
}

async function updateProject(id: string, f: Partial<PortfolioProject>): Promise<void> {
  const { error } = await db.from('portfolio_projects')
    .update({ ...f, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

async function deleteProject(id: string): Promise<void> {
  const { error } = await db.from('portfolio_projects').delete().eq('id', id);
  if (error) throw error;
}

async function loadMedia(projectId: string): Promise<PortfolioMedia[]> {
  const { data, error } = await db.from('portfolio_media').select('*')
    .eq('project_id', projectId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function insertMedia(rec: Omit<PortfolioMedia, 'id'>): Promise<PortfolioMedia> {
  const { data, error } = await db.from('portfolio_media').insert(rec).select().single();
  if (error) throw error;
  return data;
}

async function deleteMedia(m: PortfolioMedia): Promise<void> {
  await supabase.storage.from('portfolio').remove([m.storage_path]);
  const { error } = await db.from('portfolio_media').delete().eq('id', m.id);
  if (error) throw error;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function ext(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : '';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Shared form field component ─────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5" style={{ color: G500 }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-[13px] outline-none transition-colors';
const inputStyle = (focused: boolean): React.CSSProperties => ({
  padding: '10px 13px', border: `1px solid ${focused ? B : G200}`, color: B, background: '#FAFAF9',
});

function TInput({ value, onChange, required, placeholder }: {
  value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  const [f, setF] = useState(false);
  return (
    <input className={inputCls} style={inputStyle(f)} value={value}
      onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
      required={required} placeholder={placeholder} />
  );
}

function TTextarea({ value, onChange, rows = 3 }: {
  value: string; onChange: (v: string) => void; rows?: number;
}) {
  const [f, setF] = useState(false);
  return (
    <textarea className={`${inputCls} resize-none`} style={inputStyle(f)} value={value} rows={rows}
      onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)} />
  );
}

/* ── Upload zone ─────────────────────────────────────────────────────── */
function UploadZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? AC : G200}`,
        backgroundColor: drag ? 'rgba(157,126,63,0.04)' : '#FAFAF9',
        padding: '28px 20px', cursor: 'pointer', textAlign: 'center',
        transition: 'border-color 0.18s, background-color 0.18s',
      }}
    >
      <input
        ref={inputRef} type="file" multiple hidden
        accept="image/*,video/mp4,video/quicktime,video/webm,video/x-msvideo"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
      />
      <motion.div animate={{ y: drag ? -6 : 0 }} transition={{ duration: 0.22 }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <ImageIcon style={{ width: 20, height: 20, color: drag ? AC : G400 }} strokeWidth={1.5} />
          <Video style={{ width: 20, height: 20, color: drag ? AC : G400 }} strokeWidth={1.5} />
        </div>
        <div className="text-[12px] font-semibold mb-1" style={{ color: drag ? AC : B }}>
          {drag ? 'Drop files here' : 'Drag & drop photos or videos'}
        </div>
        <div className="text-[10px]" style={{ color: G500 }}>
          Or click to browse · Any size · JPG, PNG, WebP, HEIC, MP4, MOV, WebM
        </div>
      </motion.div>
    </div>
  );
}

/* ── Upload progress item ────────────────────────────────────────────── */
function UploadProgressItem({ item }: { item: UploadItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${G200}` }}>
        {/* File preview or type icon */}
        <div className="w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid ${G200}` }}>
          {item.previewUrl
            ? <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
            : item.file.type.startsWith('video/')
              ? <PlayCircle style={{ width: 16, height: 16, color: G400 }} strokeWidth={1.5} />
              : <ImagePlus style={{ width: 16, height: 16, color: G400 }} strokeWidth={1.5} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold truncate mb-1" style={{ color: B }}>{item.file.name}</div>
          <div className="text-[9px]" style={{ color: G500 }}>{fmtSize(item.file.size)}</div>
          {(item.status === 'uploading' || item.status === 'queued') && (
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: G200 }}>
              <motion.div
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%', backgroundColor: AC }}
              />
            </div>
          )}
          {item.status === 'error' && (
            <div className="text-[9px] mt-1" style={{ color: '#ef4444' }}>{item.errorMsg}</div>
          )}
        </div>

        <div className="shrink-0">
          {item.status === 'uploading' && <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: AC }} strokeWidth={2} />}
          {item.status === 'done'      && <CheckCircle2 style={{ width: 16, height: 16, color: '#10b981' }} strokeWidth={2} />}
          {item.status === 'error'     && <AlertCircle style={{ width: 16, height: 16, color: '#ef4444' }} strokeWidth={2} />}
          {item.status === 'queued'    && <div className="text-[9px]" style={{ color: G400 }}>Queued</div>}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Media thumbnail ─────────────────────────────────────────────────── */
function MediaThumb({
  media, isCover, onSetCover, onDelete,
}: {
  media: PortfolioMedia;
  isCover: boolean;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className="relative overflow-hidden"
      style={{ aspectRatio: '4/3', border: `2px solid ${isCover ? AC : 'transparent'}`, cursor: 'default' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {media.media_type === 'image'
        ? <img src={media.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        : (
          <div className="w-full h-full relative" style={{ backgroundColor: '#111' }}>
            <video src={media.url} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PlayCircle style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.7)' }} strokeWidth={1.5} />
            </div>
          </div>
        )
      }

      {isCover && (
        <div className="absolute top-1.5 left-1.5 text-[7px] uppercase tracking-[0.2em] font-bold px-2 py-0.5"
          style={{ backgroundColor: AC, color: W }}>
          Cover
        </div>
      )}

      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(10,10,10,0.72)' }}
          >
            {media.media_type === 'image' && !isCover && (
              <button onClick={onSetCover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] font-bold transition-colors"
                style={{ backgroundColor: AC, color: W, border: 'none', cursor: 'pointer' }}>
                <Star style={{ width: 10, height: 10 }} strokeWidth={2.5} /> Set Cover
              </button>
            )}
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] font-bold transition-colors"
              style={{ backgroundColor: 'rgba(239,68,68,0.9)', color: W, border: 'none', cursor: 'pointer' }}>
              <Trash2 style={{ width: 10, height: 10 }} strokeWidth={2.5} /> Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Project modal ───────────────────────────────────────────────────── */
type ModalTab = 'details' | 'media';

function ProjectModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PortfolioProject | null;  /* null = new project */
  onClose: () => void;
  onSaved: (p: PortfolioProject) => void;
}) {
  const isNew = !initial;
  const [tab, setTab] = useState<ModalTab>('details');

  /* Details form */
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    category:    initial?.category    ?? CATEGORIES[0],
    location:    initial?.location    ?? '',
    sqft:        initial?.sqft        ?? '',
    year:        initial?.year        ?? new Date().getFullYear().toString(),
    description: initial?.description ?? '',
    featured:    initial?.featured    ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [project, setProject] = useState<PortfolioProject | null>(initial);

  /* Media */
  const [media, setMedia]       = useState<PortfolioMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploads, setUploads]   = useState<UploadItem[]>([]);

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  /* Load media on open (for existing projects) */
  useEffect(() => {
    if (!project) return;
    setMediaLoading(true);
    loadMedia(project.id)
      .then(setMedia)
      .catch(console.error)
      .finally(() => setMediaLoading(false));
  }, [project?.id]);

  /* Save / create project details */
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setSaveError('Title is required.'); return; }
    setSaving(true); setSaveError('');
    try {
      if (project) {
        await updateProject(project.id, form);
        const updated = { ...project, ...form };
        setProject(updated);
        onSaved(updated);
      } else {
        const created = await createProject({ ...form, cover_url: null, sort_order: 0 });
        setProject(created);
        onSaved(created);
        setTab('media'); // auto-switch to media after first save
      }
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save. Check your Supabase setup.');
    } finally {
      setSaving(false);
    }
  };

  /* Queue and upload files */
  const handleFiles = useCallback((files: FileList) => {
    if (!project) return;
    const newItems: UploadItem[] = Array.from(files).map(file => ({
      uid: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'queued',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setUploads(prev => [...prev, ...newItems]);

    newItems.forEach(item => {
      const path = `projects/${project.id}/${item.uid}${ext(item.file)}`;
      setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, status: 'uploading' } : u));

      uploadWithProgress(path, item.file, pct => {
        setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, progress: pct } : u));
      })
        .then(async url => {
          const mediaType = item.file.type.startsWith('video/') ? 'video' : 'image';
          const mediaRecord = await insertMedia({
            project_id: project.id,
            url,
            storage_path: path,
            media_type: mediaType,
            sort_order: Date.now(),
          });

          /* Auto-set cover if this is the first image */
          if (!project.cover_url && mediaType === 'image') {
            await updateProject(project.id, { cover_url: url });
            const updated = { ...project, cover_url: url };
            setProject(updated);
            onSaved(updated);
          }

          setMedia(prev => [...prev, mediaRecord]);
          setUploads(prev => prev.map(u => u.uid === item.uid ? { ...u, status: 'done', progress: 100 } : u));

          /* Remove completed upload from list after 2.5 s */
          setTimeout(() => {
            setUploads(prev => prev.filter(u => u.uid !== item.uid));
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          }, 2500);
        })
        .catch(err => {
          setUploads(prev => prev.map(u =>
            u.uid === item.uid ? { ...u, status: 'error', errorMsg: err.message } : u
          ));
        });
    });
  }, [project, onSaved]);

  const handleSetCover = async (url: string) => {
    if (!project) return;
    await updateProject(project.id, { cover_url: url });
    const updated = { ...project, cover_url: url };
    setProject(updated);
    onSaved(updated);
  };

  const handleDeleteMedia = async (m: PortfolioMedia) => {
    await deleteMedia(m);
    setMedia(prev => prev.filter(x => x.id !== m.id));
    if (project?.cover_url === m.url) {
      const next = media.find(x => x.id !== m.id && x.media_type === 'image');
      await updateProject(project.id, { cover_url: next?.url ?? null });
      const updated = { ...project, cover_url: next?.url ?? null };
      setProject(updated);
      onSaved(updated);
    }
  };

  const hasProject = !!project;
  const mediaTabDisabled = isNew && !hasProject;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col w-full"
        style={{
          maxWidth: 820, maxHeight: '92vh',
          backgroundColor: W, border: `1px solid ${G200}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 shrink-0"
          style={{ borderBottom: `1px solid ${G200}` }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em] font-bold mb-0.5" style={{ color: AC }}>
              {isNew ? 'Add Portfolio Project' : 'Edit Project'}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, color: B, lineHeight: 1.1 }}>
              {project?.title || 'New Project'}
            </div>
          </div>
          <button onClick={onClose} style={{ color: G400 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: `1px solid ${G200}` }}>
          {(['details', 'media'] as ModalTab[]).map(t => (
            <button
              key={t}
              onClick={() => !mediaTabDisabled && setTab(t)}
              disabled={t === 'media' && mediaTabDisabled}
              className="relative px-7 py-3 text-[9px] uppercase tracking-[0.26em] font-bold transition-colors"
              style={{
                color: tab === t ? B : G400,
                cursor: (t === 'media' && mediaTabDisabled) ? 'not-allowed' : 'pointer',
                opacity: (t === 'media' && mediaTabDisabled) ? 0.38 : 1,
                background: 'none', border: 'none',
              }}
            >
              {t === 'details' ? 'Project Details' : `Photos & Videos${media.length ? ` (${media.length})` : ''}`}
              {tab === t && (
                <motion.div layoutId="modal-tab-line" className="absolute bottom-0 inset-x-0 h-px"
                  style={{ backgroundColor: B }} />
              )}
            </button>
          ))}
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── DETAILS TAB ────────────────────────────────────────── */}
            {tab === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}>
                <form id="details-form" onSubmit={handleSaveDetails} className="p-7 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <Field label="Project Title" required>
                        <TInput value={form.title} onChange={set('title')} required placeholder="e.g. River Oaks Estate" />
                      </Field>
                    </div>
                    <Field label="Category">
                      <select value={form.category} onChange={e => set('category')(e.target.value)}
                        className={inputCls} style={{ ...inputStyle(false), appearance: 'none' }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Location">
                      <TInput value={form.location} onChange={set('location')} placeholder="Neighborhood, City" />
                    </Field>
                    <Field label="Square Footage">
                      <TInput value={form.sqft ?? ''} onChange={set('sqft')} placeholder="e.g. 14,500" />
                    </Field>
                    <Field label="Year Completed" required>
                      <TInput value={form.year} onChange={set('year')} required placeholder="2024" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Description">
                        <TTextarea value={form.description ?? ''} onChange={set('description')} rows={4} />
                      </Field>
                    </div>
                  </div>

                  {/* Featured toggle */}
                  <div className="flex items-center gap-3 pt-1">
                    <button type="button" onClick={() => set('featured')(!form.featured)}
                      className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 transition-all"
                      style={{ border: `1px solid ${form.featured ? AC : G200}`, color: form.featured ? AC : G500, backgroundColor: form.featured ? 'rgba(157,126,63,0.06)' : 'transparent' }}>
                      <Star className="w-3.5 h-3.5" style={{ fill: form.featured ? AC : 'none', color: form.featured ? AC : G500 }} strokeWidth={2} />
                      {form.featured ? 'Featured on Portfolio' : 'Mark as Featured'}
                    </button>
                    <span className="text-[10px]" style={{ color: G400 }}>Featured projects appear at the top of your portfolio page</span>
                  </div>

                  {saveError && (
                    <div className="flex items-start gap-2 p-3 text-[11px]" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{saveError}</span>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

            {/* ── MEDIA TAB ──────────────────────────────────────────── */}
            {tab === 'media' && (
              <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }} className="p-7 space-y-5">

                <UploadZone onFiles={handleFiles} />

                {/* Active uploads */}
                <AnimatePresence>
                  {uploads.map(u => <UploadProgressItem key={u.uid} item={u} />)}
                </AnimatePresence>

                {/* Media grid */}
                {mediaLoading
                  ? <div className="flex items-center justify-center py-12 gap-3" style={{ color: G400 }}>
                      <Loader2 className="animate-spin w-5 h-5" strokeWidth={2} />
                      <span className="text-[11px]">Loading media…</span>
                    </div>
                  : media.length > 0
                    ? (
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.26em] font-bold mb-3" style={{ color: G500 }}>
                          Uploaded ({media.length} file{media.length !== 1 ? 's' : ''}) · Hover to set cover or remove
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {media.map(m => (
                            <MediaThumb
                              key={m.id}
                              media={m}
                              isCover={project?.cover_url === m.url}
                              onSetCover={() => handleSetCover(m.url)}
                              onDelete={() => handleDeleteMedia(m)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                    : uploads.length === 0 && (
                      <div className="text-center py-8" style={{ color: G500 }}>
                        <ImagePlus className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                        <div className="text-[12px]">No media yet — drag files above to upload</div>
                      </div>
                    )
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 shrink-0"
          style={{ borderTop: `1px solid ${G200}`, backgroundColor: '#FAFAF9' }}>
          <button type="button" onClick={onClose}
            className="text-[9px] uppercase tracking-[0.24em] font-bold px-5 py-2.5"
            style={{ border: `1px solid ${G200}`, color: G500, cursor: 'pointer', background: 'none' }}>
            {tab === 'details' && isNew && !hasProject ? 'Cancel' : 'Close'}
          </button>

          {tab === 'details' && (
            <button type="submit" form="details-form" disabled={saving}
              className="flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-black px-6 py-2.5 transition-opacity"
              style={{ backgroundColor: saving ? G400 : B, color: W, border: 'none', cursor: saving ? 'wait' : 'pointer' }}>
              {saving
                ? <><Loader2 className="animate-spin w-3.5 h-3.5" strokeWidth={2.5} /> Saving…</>
                : isNew && !hasProject ? '+ Create Project' : 'Save Changes'
              }
            </button>
          )}

          {tab === 'media' && (
            <div className="text-[10px]" style={{ color: G500 }}>
              {uploads.filter(u => u.status === 'uploading').length > 0
                ? <span className="flex items-center gap-1.5"><Loader2 className="animate-spin w-3.5 h-3.5" strokeWidth={2} /> Uploading…</span>
                : `${media.length} file${media.length !== 1 ? 's' : ''} saved`
              }
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Project row (in list) ───────────────────────────────────────────── */
function ProjectRow({
  project, onEdit, onDelete, onToggleFeatured,
}: {
  project: PortfolioProject;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
      {/* Thumbnail */}
      <div className="w-16 h-12 shrink-0 overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid ${G200}` }}>
        {project.cover_url
          ? <img src={project.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <ImageIcon style={{ width: 18, height: 18, color: G400 }} strokeWidth={1.5} />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-[13px] font-bold truncate" style={{ color: B }}>{project.title}</div>
          {project.featured && <Star className="w-3 h-3 shrink-0 fill-current" style={{ color: AC }} strokeWidth={0} />}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] uppercase tracking-[0.14em]" style={{ color: G500 }}>
          <span>{project.category}</span>
          {project.location && <><span>·</span><span>{project.location}</span></>}
          {project.sqft && <><span>·</span><span>{project.sqft} SF</span></>}
          <span>·</span><span>{project.year}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onToggleFeatured}
          className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] font-bold px-2.5 py-1.5 transition-all"
          style={{ border: `1px solid ${project.featured ? AC : G200}`, color: project.featured ? AC : G500, backgroundColor: project.featured ? 'rgba(157,126,63,0.06)' : 'transparent' }}>
          <Star className="w-3 h-3" style={{ fill: project.featured ? AC : 'none' }} strokeWidth={2} />
          {project.featured ? 'Featured' : 'Feature'}
        </button>
        <button onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: G400 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
          <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: G400 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G400; }}>
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────── */
export default function PortfolioManager({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [projects, setProjects]   = useState<PortfolioProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalProject, setModalProject] = useState<PortfolioProject | null | undefined>(undefined);
  // undefined = closed, null = new project, PortfolioProject = edit

  const refresh = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const data = await loadProjects();
      setProjects(data);
      onCountChange?.(data.length);
    } catch (err: any) {
      setLoadError(err.message ?? 'Failed to load portfolio. Run portfolio-setup.sql in Supabase.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaved = useCallback((p: PortfolioProject) => {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id);
      const next = exists ? prev.map(x => x.id === p.id ? p : x) : [...prev, p];
      onCountChange?.(next.length);
      return next;
    });
  }, [onCountChange]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project and all its media permanently?')) return;
    await deleteProject(id);
    setProjects(prev => {
      const next = prev.filter(x => x.id !== id);
      onCountChange?.(next.length);
      return next;
    });
  };

  const handleToggleFeatured = async (p: PortfolioProject) => {
    const updated = { ...p, featured: !p.featured };
    await updateProject(p.id, { featured: updated.featured });
    setProjects(prev => prev.map(x => x.id === p.id ? updated : x));
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
          Portfolio Projects ({projects.length})
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-2 transition-colors"
            style={{ border: `1px solid ${G200}`, color: G500, background: 'none', cursor: 'pointer' }}>
            Refresh
          </button>
          <button
            onClick={() => setModalProject(null)}
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2.5 transition-opacity hover:opacity-85"
            style={{ backgroundColor: B, color: W, border: 'none', cursor: 'pointer' }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Project
          </button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="flex items-start gap-3 p-4 mb-5 text-[11px]"
          style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <div className="font-bold mb-1">Could not load portfolio from Supabase</div>
            <div>{loadError}</div>
            <div className="mt-1 opacity-70">Make sure you've run <code className="bg-white/20 px-1">portfolio-setup.sql</code> in your Supabase SQL Editor.</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center" style={{ color: G400 }}>
          <Loader2 className="animate-spin w-5 h-5" strokeWidth={2} />
          <span className="text-[12px]">Loading projects…</span>
        </div>
      )}

      {/* Project list */}
      {!loading && !loadError && (
        <div className="space-y-2">
          {projects.length === 0
            ? (
              <div className="text-center py-16" style={{ color: G500, border: `1px dashed ${G200}` }}>
                <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                <div className="text-[13px] font-semibold mb-2" style={{ color: B }}>No portfolio projects yet</div>
                <div className="text-[11px]">Click "Add Project" to get started</div>
              </div>
            )
            : projects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                onEdit={() => setModalProject(p)}
                onDelete={() => handleDelete(p.id)}
                onToggleFeatured={() => handleToggleFeatured(p)}
              />
            ))
          }
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalProject !== undefined && (
          <ProjectModal
            initial={modalProject}
            onClose={() => setModalProject(undefined)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
