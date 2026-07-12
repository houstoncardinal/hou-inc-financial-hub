import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";
const WHITE  = '#FFFFFF';

interface ProjectPhoto {
  id: string;
  file_url: string;
  caption?: string;
  phase?: string;
  taken_at?: string;
}

export default function PortalGallery() {
  const { client, loaded } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!loaded) return; if (!client) navigate('/portal', { replace: true }); }, [client, loaded, navigate]);

  const [photos, setPhotos]   = useState<ProjectPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ProjectPhoto | null>(null);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any)
          .from('project_photos')
          .select('id, file_url, caption, phase, taken_at')
          .eq('client_id', client.id)
          .order('taken_at', { ascending: false });
        setPhotos(data ?? []);
      } catch { setPhotos([]); }
      setLoading(false);
    })();
  }, [client?.id]);

  if (!client) return null;

  const phases = Array.from(new Set(photos.map(p => p.phase ?? 'General')));
  const byPhase = (phase: string) => photos.filter(p => (p.phase ?? 'General') === phase);

  return (
    <PortalLayout>
      <motion.div
        className="px-6 md:px-10 py-8 md:py-12 max-w-6xl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="mb-10">
          <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>Build Progress</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 4vw, 44px)', color: DARK, lineHeight: 1.05 }}>
            Progress Photos
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-[11px] font-light" style={{ color: MUTED }}>Loading photos…</div>
          </div>
        ) : photos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
            style={{ backgroundColor: WHITE, border: `1px solid ${BORDER}` }}
          >
            <div
              className="w-16 h-16 flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(157,126,63,0.06)', border: `1px solid rgba(157,126,63,0.18)` }}
            >
              <Camera className="w-7 h-7" style={{ color: GOLDF }} strokeWidth={1} />
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: DARK }} className="mb-3">
              No photos yet.
            </div>
            <p className="text-[12px] font-light max-w-xs leading-relaxed" style={{ color: MUTED }}>
              Progress photos will be uploaded by your builder as construction advances through each phase. Check back after your consultation.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {phases.map(phase => (
              <div key={phase}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-[9px] uppercase tracking-[0.44em] font-bold" style={{ color: GOLD }}>{phase}</div>
                  <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
                  <div className="text-[9px] font-light" style={{ color: MUTED }}>
                    {byPhase(phase).length} photo{byPhase(phase).length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {byPhase(phase).map((photo, i) => (
                    <motion.button
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setPreview(photo)}
                      className="relative group aspect-square overflow-hidden text-left"
                      style={{ border: `1px solid ${BORDER}` }}
                    >
                      <img
                        src={photo.file_url}
                        alt={photo.caption ?? phase}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {photo.caption && (
                        <div
                          className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }}
                        >
                          <span className="text-[9px] font-semibold text-white leading-tight">{photo.caption}</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
          onClick={() => setPreview(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={preview.file_url}
              alt={preview.caption ?? ''}
              className="w-full h-auto max-h-[82vh] object-contain"
            />
            {(preview.caption || preview.phase) && (
              <div className="mt-3 text-center space-y-1">
                {preview.caption && <p className="text-[13px] font-light text-white">{preview.caption}</p>}
                {preview.phase  && <p className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: GOLDF }}>{preview.phase}</p>}
              </div>
            )}
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-100 opacity-60"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <X className="w-4 h-4 text-white" strokeWidth={2} />
            </button>
          </motion.div>
        </div>
      )}
    </PortalLayout>
  );
}
