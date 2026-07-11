import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, Landmark, ArrowRight, Check } from 'lucide-react';
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

/* ── Entity Card — horizontal, compact ──────────────────────────────────── */
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
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      className="relative w-full text-left flex items-stretch overflow-hidden"
      style={{
        background: selected
          ? `linear-gradient(110deg, #fff 60%, ${entity.colorMuted} 140%)`
          : hov ? 'rgba(255,255,255,0.85)' : '#fff',
        border: `1px solid ${selected ? entity.color : active ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: selected
          ? `0 8px 32px ${entity.color}22, 0 2px 8px rgba(0,0,0,0.06)`
          : active
            ? '0 4px 20px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s, box-shadow 0.25s, background 0.25s',
        cursor: 'pointer',
        minHeight: 88,
      }}
    >
      {/* Left entity-color bar */}
      <motion.div
        style={{ width: 3, flexShrink: 0, backgroundColor: entity.color }}
        animate={{ opacity: active ? 1 : 0.28 }}
        transition={{ duration: 0.2 }}
      />

      {/* Shimmer on hover */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(100deg, transparent 38%, ${entity.colorMuted} 50%, transparent 62%)`,
        }}
        initial={{ x: '-110%', opacity: 0 }}
        animate={hov ? { x: '110%', opacity: 1 } : { x: '-110%', opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center gap-4 px-5 py-4">
        {/* Icon box */}
        <motion.div
          animate={{
            backgroundColor: active ? entity.colorMuted : 'rgba(0,0,0,0.035)',
            borderColor: active ? entity.color : 'rgba(0,0,0,0.09)',
            scale: active ? 1.05 : 1,
          }}
          transition={{ duration: 0.2 }}
          style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid', flexShrink: 0,
          }}
        >
          <Icon style={{ width: 15, height: 15, color: active ? entity.color : MU, transition: 'color 0.2s', strokeWidth: 1.5 }} />
        </motion.div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          {/* Category eyebrow */}
          <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.42em', textTransform: 'uppercase', color: active ? entity.color : MU2, marginBottom: 3, transition: 'color 0.2s' }}>
            {entity.category}
          </div>
          {/* Large entity name — dominant heading */}
          <div style={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(26px, 3.2vw, 38px)',
            color: active ? INK : '#2C2825',
            lineHeight: 1.0,
            letterSpacing: '-0.01em',
            transition: 'color 0.2s',
          }}>
            {entity.name}
          </div>
          {/* Description — 1 line, only on desktop */}
          <p className="hidden sm:block line-clamp-1 mt-1.5" style={{ fontSize: 10.5, color: MU, lineHeight: 1.5, fontWeight: 300 }}>
            {entity.description}
          </p>
        </div>
      </div>

      {/* Right side: checkmark or arrow */}
      <div className="flex items-center pr-5 pl-2">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: entity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Check style={{ width: 10, height: 10, color: '#fff', strokeWidth: 2.5 }} />
            </motion.div>
          ) : (
            <motion.div
              key="arrow"
              initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0.2 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <ArrowRight style={{ width: 14, height: 14, color: entity.color, strokeWidth: 2 }} />
            </motion.div>
          )}
        </AnimatePresence>
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
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        backgroundColor: '#FAFAF9',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Gold top rule */}
      <motion.div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD, zIndex: 50 }}
        initial={{ scaleX: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="w-full max-w-2xl">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 mb-6"
        >
          <motion.div
            style={{ width: 2, backgroundColor: GOLD }}
            initial={{ height: 0 }}
            animate={{ height: 40 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.46em', textTransform: 'uppercase', color: INK, fontFamily: SERIF }}>
              HOU INC
            </div>
            <div style={{ fontSize: 6.5, textTransform: 'uppercase', letterSpacing: '0.52em', fontWeight: 700, color: GOLD, marginTop: 2 }}>
              Finance Sector
            </div>
          </div>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
          style={{
            fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(28px, 4.5vw, 52px)',
            color: INK, lineHeight: 1.0, letterSpacing: '-0.01em',
          }}
        >
          Which entity are you{' '}
          <em style={{ color: GOLD }}>managing today?</em>
        </motion.h1>

        {/* ── Entity cards ── */}
        <div className="flex flex-col gap-2.5 mb-7">
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="flex items-center justify-between gap-3 pt-5"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          {/* Left hint */}
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
                style={{ fontSize: 11.5, color: MU2, fontStyle: 'italic', fontFamily: SERIF }}
              >
                {selected ? `${selected.shortName} selected.` : 'Select an entity above to continue.'}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enter button */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.button
                key="enter"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={handleEnter}
                disabled={entering}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-2.5 text-[9px] uppercase tracking-[0.3em] font-black disabled:opacity-50 overflow-hidden shrink-0"
                style={{
                  backgroundColor: selected.color,
                  color: '#fff',
                  paddingTop: 14, paddingBottom: 14, paddingLeft: 28, paddingRight: 28,
                }}
              >
                <motion.div
                  style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%)',
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
                initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 text-[9px] uppercase tracking-[0.3em] font-black"
                style={{ color: MU2, paddingTop: 14, paddingBottom: 14, paddingLeft: 28, paddingRight: 28, border: '1px solid rgba(0,0,0,0.08)' }}
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
