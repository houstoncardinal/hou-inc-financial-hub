import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { ReactNode, useRef, MouseEvent } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  max?: number; // max tilt deg
  glare?: boolean;
}

export default function TiltCard({ children, className, style, max = 8, glare = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 18 });
  const gx = useTransform(mx, v => `${v * 100}%`);
  const gy = useTransform(my, v => `${v * 100}%`);
  const glareBackground = useTransform(
    [gx, gy] as any,
    ([x, y]: any) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.22), transparent 45%)`
  );

  const onMove = (e: MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style,
        rotateX: reduced ? 0 : rx,
        rotateY: reduced ? 0 : ry,
        transformPerspective: 1100,
        transformStyle: 'preserve-3d',
        position: 'relative',
      }}
    >
      {children}
      {glare && !reduced && (
        <motion.div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: glareBackground as any,
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </motion.div>
  );
}
