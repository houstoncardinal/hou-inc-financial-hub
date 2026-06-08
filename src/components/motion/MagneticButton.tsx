import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { ReactNode, useRef, MouseEvent, forwardRef } from 'react';

interface Props {
  children: ReactNode;
  strength?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  as?: 'button' | 'a' | 'div';
  href?: string;
}

const MagneticButton = forwardRef<HTMLElement, Props>(function MagneticButton(
  { children, strength = 0.35, className, style, onClick, as = 'button', href }, _ref
) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });

  const handleMove = (e: MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  const Comp: any = as === 'a' ? motion.a : as === 'div' ? motion.div : motion.button;
  return (
    <Comp
      ref={ref as any}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      className={className}
      style={{ ...style, x: sx, y: sy, display: 'inline-flex' }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </Comp>
  );
});

export default MagneticButton;
