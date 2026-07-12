import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, Landmark, ArrowRight, Check, ChevronRight } from 'lucide-react';
import { ENTITIES, Entity, useEntity } from '@/contexts/EntityContext';

/* ── Tokens ──────────────────────────────────────────────────────────────── */
const INK   = '#0D0D0D';
const MU    = '#78716C';
const MU2   = '#A8A29E';
const GOLD  = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";

const ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':           Building2,
  'houston-generator-pros':       Zap,
  'houston-enterprise-holdings':  Landmark,
};

/* ── Entity Card ─────────────────────────────────────────────────────────── */
function EntityCard({
  entity, selected, onSelect, index,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const [hov, setHov] = useState(false);
  const Icon = ICONS[entity.id] ?? Building2;
  const active = hov || selected;

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, delay: 0.06 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="relative w-full text-left flex flex-col overflow-hidden h-full"
      style={{
        background: selected
          ? `linear-gradient(160deg, #fff 55%, ${entity.colorMuted} 130%)`
          : hov ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.88)',
        border: `1px solid ${selected ? entity.color : active ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: selected
          ? `0 12px 40px ${entity.color}28, 0 3px 10px rgba(0,0,0,0.07)`
          : active
            ? '0 6px 28px rgba(0,0,0,0.09)'
            : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'border-color 0.22s, box-shadow 0.28s, background 0.28s',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Top accent bar */}
      <motion.div
        style={{ height: 3, backgroundColor: entity.color }}
        animate={{ opacity: active ? 1 : 0.35 }}
        transition={{ duration: 0.2 }}
      />

      {/* Shimmer sweep */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(105deg, transparent 38%, ${entity.colorMuted} 50%, transparent 62%)`,
          zIndex: 0,
        }}
        initial={{ x: '-110%', opacity: 0 }}
        animate={hov ? { x: '110%', opacity: 1 } : { x: '-110%', opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />

      {/* Card body */}
      <div className="relative flex flex-col flex-1 p-5 z-10">
        {/* Icon + category row */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            animate={{
              backgroundColor: active ? entity.colorMuted : 'rgba(0,0,0,0.03)',
              borderColor: active ? entity.color : 'rgba(0,0,0,0.09)',
            }}
            transition={{ duration: 0.2 }}
            style={{
              width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid', flexShrink: 0,
            }}
          >
            <Icon style={{ width: 18, height: 18, color: active ? entity.color : MU, transition: 'color 0.2s', strokeWidth: 1.5 }} />
          </motion.div>

          {/* Category pill */}
          <div style={{
            fontSize: 7, fontWeight: 800, letterSpacing: '0.36em', textTransform: 'uppercase',
            color: active ? entity.color : MU2,
            backgroundColor: active ? entity.colorMuted : 'rgba(0,0,0,0.03)',
            padding: '3px 8px',
            transition: 'color 0.2s, background-color 0.2s',
          }}>
            {entity.category}
          </div>
        </div>

        {/* Entity name — dominant */}
        <div style={{
          fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
          fontSize: 'clamp(22px, 2.6vw, 34px)',
          color: active ? INK : '#2C2825',
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          transition: 'color 0.2s',
          marginBottom: 6,
        }}>
          {entity.name}
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase',
          color: active ? entity.color : MU2,
          transition: 'color 0.2s',
          marginBottom: 10,
        }}>
          {entity.tagline}
        </div>

        {/* Description */}
        <p style={{
          fontSize: 11, color: MU, lineHeight: 1.6, fontWeight: 300,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as any}>
          {entity.description}
        </p>

        {/* Footer row: year + selection indicator */}
        <div className="flex items-center justify-between mt-4 pt-3.5" style={{ borderTop: `1px solid ${active ? entity.color + '28' : 'rgba(0,0,0,0.06)'}`, transition: 'border-color 0.2s' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', color: active ? entity.color : MU2, transition: 'color 0.2s' }}>
            EST. {entity.since}
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  backgroundColor: entity.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Check style={{ width: 10, height: 10, color: '#fff', strokeWidth: 2.5 }} />
              </motion.div>
            ) : (
              <motion.div
                key="arrow"
                initial={{ opacity: 0 }}
                animate={{ opacity: active ? 0.85 : 0.18 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <ChevronRight style={{ width: 14, height: 14, color: entity.color, strokeWidth: 2 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function EntitySelect() {
  const { entity: current, setEntity } = useEntity();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Entity | null>(current);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    if (!selected) return;
    setEntering(true);
    setEntity(selected);
    setTimeout(() => navigate('/finance/dashboard'), 300);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(160deg, #FAF9F7 0%, #EDE9E3 52%, #F5F4F1 100%)',
        backgroundImage: [
          'linear-gradient(160deg, #FAF9F7 0%, #EDE9E3 52%, #F5F4F1 100%)',
          'radial-gradient(circle, rgba(0,0,0,0.048) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'cover, 22px 22px',
      }}
    >
      {/* Gold top rule */}
      <motion.div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD, zIndex: 50 }}
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="w-full max-w-5xl">

        {/* ── Header row ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between gap-6 mb-6"
        >
          <div className="flex items-center gap-3">
            <motion.div
              style={{ width: 2, backgroundColor: GOLD }}
              initial={{ height: 0 }}
              animate={{ height: 40 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.46em', textTransform: 'uppercase', color: INK, fontFamily: SERIF }}>HOU INC</div>
              <div style={{ fontSize: 6.5, textTransform: 'uppercase', letterSpacing: '0.52em', fontWeight: 700, color: GOLD, marginTop: 2 }}>Finance Sector</div>
            </div>
          </div>

          {/* Hint text on desktop */}
          <div className="hidden md:block" style={{ fontSize: 11, color: MU2, fontStyle: 'italic', fontFamily: SERIF }}>
            {selected ? `${selected.name} selected — ready to enter.` : 'Select an entity to continue.'}
          </div>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
          style={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(24px, 3.8vw, 46px)',
            color: INK, lineHeight: 1.0, letterSpacing: '-0.01em',
          }}
        >
          Which entity are you{' '}
          <em style={{ color: GOLD }}>managing today?</em>
        </motion.h1>

        {/* ── Entity cards — 3-col grid on md+, single col on mobile ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6" style={{ alignItems: 'stretch' }}>
          {ENTITIES.map((e, i) => (
            <EntityCard
              key={e.id}
              entity={e}
              selected={selected?.id === e.id}
              onSelect={() => setSelected(e)}
              index={i}
            />
          ))}
        </div>

        {/* ── CTA row ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="flex items-center justify-between gap-3 pt-4"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          {/* Left: back-to-current or mobile hint */}
          <AnimatePresence mode="wait">
            {current && selected?.id !== current.id ? (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                onClick={() => setSelected(current)}
                style={{ fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase', color: MU, fontWeight: 700 }}
                className="hover:opacity-55 transition-opacity"
              >
                ← Back to {current.shortName}
              </motion.button>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 11, color: MU2, fontStyle: 'italic', fontFamily: SERIF }}
              >
                {selected ? `${selected.shortName} — ${selected.category}.` : 'Select an entity above to continue.'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: Enter button */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.button
                key="enter"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={handleEnter}
                disabled={entering}
                whileHover={{ scale: 1.022 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black disabled:opacity-50 overflow-hidden shrink-0"
                style={{
                  backgroundColor: selected.color,
                  color: '#fff',
                  paddingTop: 14, paddingBottom: 14, paddingLeft: 24, paddingRight: 24,
                  boxShadow: `0 4px 20px ${selected.color}44`,
                }}
              >
                {/* Shimmer */}
                <motion.div
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)',
                  }}
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 0.65, delay: 0.05, ease: 'easeOut' }}
                />
                {entering ? (
                  <span>Opening…</span>
                ) : (
                  <>
                    <span>Enter {selected.shortName} Dashboard</span>
                    <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 0.28 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black"
                style={{ color: MU2, paddingTop: 14, paddingBottom: 14, paddingLeft: 24, paddingRight: 24, border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
