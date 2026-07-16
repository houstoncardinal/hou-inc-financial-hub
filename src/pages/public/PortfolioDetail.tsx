import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';

/* ── Tokens (shared with Portfolio.tsx) ───────────────────────────── */
const B   = '#0A0A0A';
const W   = '#FFFFFF';
const OW  = '#F7F7F6';
const G500 = '#8A8A8A';
const AC  = '#9D7E3F';
const SF  = "'Cormorant Garamond', Georgia, serif";
const LB  = '#E2E2E2';
const DB  = 'rgba(255,255,255,0.06)';

function Brackets({ c = 'rgba(255,255,255,0.12)', sz = 16, w = 1 }: { c?: string; sz?: number; w?: number }) {
  const base: React.CSSProperties = { position: 'absolute', width: sz, height: sz, pointerEvents: 'none' };
  const b = `${w}px solid ${c}`;
  return (
    <>
      <span style={{ ...base, top: 0, left: 0,     borderTop: b, borderLeft:  b }} />
      <span style={{ ...base, top: 0, right: 0,    borderTop: b, borderRight: b }} />
      <span style={{ ...base, bottom: 0, left: 0,  borderBottom: b, borderLeft:  b }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  );
}

interface Media { id: string; url: string; media_type: string; caption: string | null; sort_order: number; }

export default function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject]   = useState<any | null>(null);
  const [media, setMedia]       = useState<Media[]>([]);
  const [siblings, setSiblings] = useState<{ id: string; title: string; category: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [missing, setMissing]   = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true); setMissing(false); setLightbox(null);
    Promise.all([
      (supabase as any).from('portfolio_projects').select('*').eq('id', id).maybeSingle(),
      (supabase as any).from('portfolio_media').select('*').eq('project_id', id)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      (supabase as any).from('portfolio_projects').select('id, title, category')
        .order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    ]).then(([projRes, mediaRes, allRes]: any[]) => {
      if (!projRes.data) { setMissing(true); setLoading(false); return; }
      setProject(projRes.data);
      setMedia(mediaRes.data ?? []);
      setSiblings(allRes.data ?? []);
      setLoading(false);
      window.scrollTo({ top: 0 });
    }).catch(() => { setMissing(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (project?.title) document.title = `${project.title} — Houston Enterprise Portfolio`;
    return () => { document.title = 'Houston Enterprise'; };
  }, [project?.title]);

  /* Gallery = cover (if not already in media) + media, images first for lightbox */
  const gallery = useMemo(() => {
    const items = [...media];
    if (project?.cover_url && !items.some(m => m.url === project.cover_url)) {
      items.unshift({ id: '__cover', url: project.cover_url, media_type: 'image', caption: null, sort_order: -1 });
    }
    return items;
  }, [media, project?.cover_url]);

  const { prev, next } = useMemo(() => {
    const i = siblings.findIndex(s => s.id === id);
    if (i === -1) return { prev: null as any, next: null as any };
    return {
      prev: siblings[(i - 1 + siblings.length) % siblings.length] ?? null,
      next: siblings[(i + 1) % siblings.length] ?? null,
    };
  }, [siblings, id]);

  /* Lightbox keyboard nav */
  const step = useCallback((d: number) => {
    setLightbox(cur => cur === null ? cur : (cur + d + gallery.length) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lightbox, step]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center" style={{ minHeight: '70vh', backgroundColor: B }}>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontSize: '1.4rem', color: 'rgba(255,255,255,0.3)' }}>Loading project…</div>
        </div>
      </PublicLayout>
    );
  }

  if (missing || !project) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '70vh', backgroundColor: B }}>
          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px,6vw,64px)', color: W, lineHeight: 1 }}>
            Project not found.
          </div>
          <p className="text-[12px] mt-4 mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
            This portfolio project may have been removed or its link has changed.
          </p>
          <Link to="/portfolio" className="inline-flex items-center gap-2 px-6 py-3 text-[9px] uppercase tracking-[0.3em] font-bold"
            style={{ backgroundColor: AC, color: W }}>
            <ArrowLeft className="w-3 h-3" strokeWidth={2.5} /> Back to Portfolio
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const facts: [string, string][] = ([
    ['Category', project.category],
    ['Location', project.location],
    ['City', project.city],
    ['Year', project.year],
    ['Total Area', project.sqft ? `${project.sqft} SF` : ''],
    ['Project Value', project.budget],
    ['Client', project.client_name],
  ] as [string, string | null][]).filter(([, v]) => v) as [string, string][];

  const paragraphs: string[] = String(project.description ?? '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const current = lightbox !== null ? gallery[lightbox] : null;

  return (
    <PublicLayout>

      {/* ══ Hero ══ */}
      <section className="relative flex flex-col justify-end overflow-hidden" style={{ minHeight: '78vh', backgroundColor: B }}>
        {project.cover_url && (
          <motion.div className="absolute inset-0"
            initial={{ scale: 1.06, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundImage: `url(${project.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,4,3,0.96) 0%, rgba(5,4,3,0.55) 45%, rgba(5,4,3,0.25) 100%)' }} />
        <motion.div className="absolute top-0 inset-x-0 h-px origin-left" style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-44 w-full">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <Link to="/portfolio" className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.32em] font-bold group"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <ArrowLeft className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5" strokeWidth={2.2} />
              Portfolio
            </Link>
          </motion.div>

          <motion.div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            style={{ backgroundColor: 'rgba(157,126,63,0.14)', border: '1px solid rgba(157,126,63,0.25)' }}>
            <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>
              {project.category}{project.year ? ` · ${project.year}` : ''}
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(44px, 7.5vw, 104px)', color: W, lineHeight: 0.94, maxWidth: '16ch' }}>
            {project.title}
          </motion.h1>

          {(project.location || project.city) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }}
              className="mt-6 text-[10px] uppercase tracking-[0.26em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {[project.location, project.city].filter(Boolean).join(' · ')}
            </motion.div>
          )}
        </div>
      </section>

      {/* ══ Facts band ══ */}
      {facts.length > 0 && (
        <section style={{ backgroundColor: B, borderTop: `1px solid ${DB}` }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{ borderLeft: `1px solid ${DB}` }}>
              {facts.slice(0, 6).map(([label, val], i) => (
                <Reveal key={label} delay={i * 0.05}>
                  <div className="py-8 px-5" style={{ borderRight: `1px solid ${DB}` }}>
                    <div className="text-[7px] uppercase tracking-[0.26em] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.24)' }}>{label}</div>
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.15rem', color: W, lineHeight: 1.15 }}>{val}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ Story ══ */}
      <section style={{ backgroundColor: OW, borderTop: `1px solid ${LB}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-14 lg:gap-20 items-start">
            <div>
              <Reveal>
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px w-10" style={{ backgroundColor: AC }} />
                  <span className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: G500 }}>The Project</span>
                </div>
              </Reveal>
              {paragraphs.length > 0 ? paragraphs.map((p, i) => (
                <Reveal key={i} delay={0.06 * i}>
                  <p className={i === 0 ? 'mb-6' : 'mb-6 text-[13px] leading-[1.9] font-light'}
                    style={i === 0
                      ? { fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(20px, 2.4vw, 28px)', color: B, lineHeight: 1.4 }
                      : { color: '#4a4a4a' }}>
                    {p}
                  </p>
                </Reveal>
              )) : (
                <p style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.4rem', color: B, lineHeight: 1.4 }}>
                  A {String(project.category || 'construction').toLowerCase()} project delivered by Houston Enterprise
                  {project.city ? ` in ${project.city}` : ''}.
                </p>
              )}
            </div>

            {/* Detail rail */}
            <Reveal direction="right" x={30}>
              <div className="relative p-8" style={{ backgroundColor: W, border: `1px solid ${LB}` }}>
                <Brackets c="rgba(157,126,63,0.3)" sz={14} />
                <div className="text-[8px] uppercase tracking-[0.36em] font-bold mb-6" style={{ color: AC }}>Project Details</div>
                <div>
                  {facts.map(([label, val]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${LB}` }}>
                      <span className="text-[8px] uppercase tracking-[0.2em] font-bold shrink-0" style={{ color: G500 }}>{label}</span>
                      <span className="text-[12px] font-medium text-right" style={{ color: B }}>{val}</span>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <span className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: G500 }}>Builder</span>
                    <span className="text-[12px] font-medium" style={{ color: B }}>Houston Enterprise</span>
                  </div>
                </div>
                <Link to="/start-project"
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[9px] uppercase tracking-[0.28em] font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: B, color: W }}>
                  Build Something Like This <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ Gallery ══ */}
      {gallery.length > 0 && (
        <section style={{ backgroundColor: B }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-24">
            <Reveal>
              <div className="flex items-end justify-between gap-4 mb-10">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-px w-10" style={{ backgroundColor: AC }} />
                    <span className="text-[8px] uppercase tracking-[0.44em] font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>Project Gallery</span>
                  </div>
                  <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,4vw,44px)', color: W, lineHeight: 1 }}>
                    Inside the build.
                  </div>
                </div>
                <div className="text-[8px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.24)' }}>
                  {gallery.length} {gallery.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {gallery.map((m, i) => (
                <motion.button
                  key={m.id}
                  onClick={() => setLightbox(i)}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className={`group relative overflow-hidden text-left ${i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}
                  style={{ backgroundColor: '#101010', aspectRatio: i === 0 ? undefined : '4/3', minHeight: i === 0 ? 320 : undefined }}
                  aria-label={m.caption ?? `Open item ${i + 1}`}
                >
                  {m.media_type === 'video' ? (
                    <>
                      <video src={m.url} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-12 h-12 flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: 'rgba(157,126,63,0.9)' }}>
                          <Play className="w-4 h-4 text-white ml-0.5" strokeWidth={2} fill="white" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img src={m.url} alt={m.caption ?? project.title} loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(to top, rgba(5,4,3,0.9), transparent)' }}>
                    <span className="block text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: W }}>
                      {m.caption ?? `${project.title} — ${String(i + 1).padStart(2, '0')}`}
                    </span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ Prev / Next ══ */}
      {siblings.length > 1 && (
        <section style={{ backgroundColor: B, borderTop: `1px solid ${DB}` }}>
          <div className="max-w-7xl mx-auto grid md:grid-cols-2">
            {prev && (
              <button onClick={() => navigate(`/portfolio/${prev.id}`)}
                className="group text-left px-6 lg:px-10 py-12" style={{ borderRight: `1px solid ${DB}` }}>
                <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <ChevronLeft className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2.2} /> Previous Project
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: W, lineHeight: 1.1 }}>{prev.title}</div>
                <div className="text-[8px] uppercase tracking-[0.22em] mt-1.5" style={{ color: AC }}>{prev.category}</div>
              </button>
            )}
            {next && (
              <button onClick={() => navigate(`/portfolio/${next.id}`)}
                className="group text-right px-6 lg:px-10 py-12 md:ml-auto w-full">
                <div className="flex items-center justify-end gap-2 text-[8px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Next Project <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.2} />
                </div>
                <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: W, lineHeight: 1.1 }}>{next.title}</div>
                <div className="text-[8px] uppercase tracking-[0.22em] mt-1.5" style={{ color: AC }}>{next.category}</div>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ══ CTA ══ */}
      <section className="relative overflow-hidden" style={{ backgroundColor: B, borderTop: `1px solid ${DB}` }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 100%, rgba(157,126,63,0.1) 0%, transparent 55%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
          <Reveal>
            <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px,5vw,60px)', color: W, lineHeight: 1 }}>
              Your project, built to this standard.
            </div>
            <p className="text-[12px] font-light mt-5 mb-9 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.32)' }}>
              Tell us what you're planning — we'll bring the same craft, discipline, and delivery to your build.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/start-project" className="inline-flex items-center gap-2 px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: AC, color: W }}>
                Start Your Project <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
              </Link>
              <Link to="/portfolio" className="inline-flex items-center gap-2 px-8 py-4 text-[9px] uppercase tracking-[0.3em] font-bold"
                style={{ border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.6)' }}>
                View All Work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Lightbox ══ */}
      <AnimatePresence>
        {current && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ backgroundColor: 'rgba(5,4,3,0.97)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
            onClick={() => setLightbox(null)}
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0" onClick={e => e.stopPropagation()}>
              <div className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {String((lightbox ?? 0) + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
              </div>
              <button onClick={() => setLightbox(null)} aria-label="Close"
                className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: W }}>
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 sm:px-16 pb-4 min-h-0" onClick={e => e.stopPropagation()}>
              <AnimatePresence mode="wait">
                <motion.div key={current.id} className="max-w-full max-h-full flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  {current.media_type === 'video'
                    ? <video src={current.url} controls autoPlay playsInline className="max-h-[78vh] max-w-full" />
                    : <img src={current.url} alt={current.caption ?? project.title} className="max-h-[78vh] max-w-full object-contain" />}
                </motion.div>
              </AnimatePresence>

              {gallery.length > 1 && (
                <>
                  <button onClick={() => step(-1)} aria-label="Previous"
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', color: W }}>
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => step(1)} aria-label="Next"
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', color: W }}>
                    <ChevronRight className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </>
              )}
            </div>

            <div className="px-5 pb-6 text-center shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {current.caption ?? project.title}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
