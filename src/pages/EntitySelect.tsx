import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Building2, Zap, Landmark, ChevronRight } from 'lucide-react';
import { ENTITIES, Entity, useEntity } from '@/contexts/EntityContext';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const DARK   = '#09080A';
const PANEL  = '#0F0D10';
const W      = '#FFFFFF';
const CREAM  = '#FAF9F7';
const MU     = 'rgba(255,255,255,0.32)';
const BORDER = 'rgba(255,255,255,0.07)';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const GRID: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)',
    'linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
  ].join(','),
  backgroundSize: '64px 64px',
};

/* ── Icon map ────────────────────────────────────────────────────────── */
const ICONS: Record<string, React.ComponentType<any>> = {
  'houston-enterprise':         Building2,
  'houston-generator-pros':     Zap,
  'houston-enterprise-holdings': Landmark,
};

/* ── Entity card ─────────────────────────────────────────────────────── */
function EntityCard({
  entity, selected, onSelect,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = ICONS[entity.id] ?? Building2;
  const active = hov || selected;

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18 }}
      className="relative w-full text-left overflow-hidden flex flex-col"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${entity.colorMuted}, rgba(255,255,255,0.02))`
          : active
            ? 'rgba(255,255,255,0.025)'
            : 'rgba(255,255,255,0.015)',
        border: `1px solid ${selected ? entity.color : active ? 'rgba(255,255,255,0.12)' : BORDER}`,
        transition: 'border-color 0.22s, background 0.22s',
        padding: '28px 28px 24px',
        cursor: 'pointer',
        minHeight: 'unset',
      }}
    >
      {/* Animated color bar — left edge */}
      <motion.div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          backgroundColor: entity.color,
          transformOrigin: 'top',
        }}
        animate={{ scaleY: active ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Category tag */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="flex items-center justify-center"
          style={{
            width: 34, height: 34, flexShrink: 0,
            backgroundColor: active ? entity.colorMuted : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? entity.color : 'rgba(255,255,255,0.08)'}`,
            transition: 'background 0.22s, border-color 0.22s',
          }}>
          <Icon
            style={{ width: 15, height: 15, color: active ? entity.color : 'rgba(255,255,255,0.28)', transition: 'color 0.22s', strokeWidth: 1.5 }}
          />
        </div>
        <span style={{
          fontSize: 7, fontWeight: 700, letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: active ? entity.color : 'rgba(255,255,255,0.22)',
          transition: 'color 0.22s',
        }}>
          {entity.category}
        </span>
      </div>

      {/* Name */}
      <div style={{
        fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
        fontSize: 'clamp(20px,2.6vw,28px)', color: active ? W : 'rgba(255,255,255,0.72)',
        lineHeight: 1.12, marginBottom: 6, transition: 'color 0.2s',
      }}>
        {entity.name}
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: active ? entity.color : 'rgba(255,255,255,0.22)',
        marginBottom: 14, transition: 'color 0.22s',
      }}>
        {entity.tagline}
      </div>

      {/* Divider */}
      <motion.div
        style={{ height: 1, marginBottom: 14, backgroundColor: entity.color, transformOrigin: 'left', opacity: 0.25 }}
        animate={{ scaleX: active ? 1 : 0.3, opacity: active ? 0.4 : 0.12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Description */}
      <p style={{
        fontSize: 11, fontWeight: 300, lineHeight: 1.72,
        color: active ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.24)',
        marginBottom: 20, flexGrow: 1, transition: 'color 0.2s',
      }}>
        {entity.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div style={{
          fontSize: 8, fontWeight: 600, letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase',
        }}>
          Est. {entity.since}
        </div>
        <motion.div
          animate={{ x: active ? 0 : -4, opacity: active ? 1 : 0 }}
          transition={{ duration: 0.22 }}
          className="flex items-center gap-1.5"
          style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: entity.color }}
        >
          Select <ChevronRight style={{ width: 12, height: 12, strokeWidth: 2.5 }} />
        </motion.div>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            position: 'absolute', top: 14, right: 16,
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: entity.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function EntitySelect() {
  const { entity: current, setEntity } = useEntity();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Entity | null>(current);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    if (!selected) return;
    setEntering(true);
    setEntity(selected);
    setTimeout(() => navigate('/finance'), 340);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: DARK, ...GRID }}>

      {/* Top line */}
      <motion.div
        className="h-px w-full origin-left"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-6 lg:px-10 py-16">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-3 mb-14"
        >
          <div style={{ width: 2, height: 28, backgroundColor: '#9D7E3F' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.38em', textTransform: 'uppercase', color: CREAM, fontFamily: SERIF }}>
              HOU INC
            </div>
            <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.42em', fontWeight: 500, color: '#9D7E3F', marginTop: 1 }}>
              Finance Sector
            </div>
          </div>
        </motion.div>

        {/* Heading */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex items-center gap-3 mb-5"
          >
            <motion.div
              className="h-px"
              style={{ backgroundColor: '#9D7E3F' }}
              initial={{ width: 0 }} animate={{ width: 32 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
            <span style={{ fontSize: 8, letterSpacing: '0.5em', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
              Entity Selection
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(36px,6vw,72px)', color: W, lineHeight: 0.96,
              letterSpacing: '-0.01em', marginBottom: 16,
            }}
          >
            Which entity are<br />
            <span style={{ color: '#9D7E3F' }}>you managing today?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: MU, maxWidth: 480 }}
          >
            Select a company entity to enter its dedicated financial dashboard. You can switch entities at any time from the sidebar.
          </motion.p>
        </div>

        {/* Entity cards */}
        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8"
          style={{ borderTop: BORDER }}
        >
          {ENTITIES.map(e => (
            <EntityCard
              key={e.id}
              entity={e}
              selected={selected?.id === e.id}
              onSelect={() => setSelected(e)}
            />
          ))}
        </motion.div>

        {/* Enter button */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.38 }}
          className="flex items-center gap-5"
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.button
                key="enter"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                onClick={handleEnter}
                disabled={entering}
                className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] font-black px-8 py-4 transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: selected.color, color: W }}
              >
                {entering ? (
                  <span>Loading…</span>
                ) : (
                  <>
                    <span>Enter {selected.shortName} Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', fontFamily: SERIF }}
              >
                Select an entity above to continue →
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* Bottom line */}
      <div style={{ height: 1, backgroundColor: BORDER }} />

    </div>
  );
}
