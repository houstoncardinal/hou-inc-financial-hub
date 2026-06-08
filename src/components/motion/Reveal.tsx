import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';

type Dir = 'up' | 'down' | 'left' | 'right' | 'none';

interface Props {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
  direction?: Dir;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export default function Reveal({
  children, delay = 0, duration = 0.8, y = 32, x = 0,
  direction = 'up', className, style, once = true, as = 'div',
}: Props) {
  const reduced = useReducedMotion();
  const offset = direction === 'none'
    ? { x: 0, y: 0 }
    : direction === 'left'  ? { x: -x || -40, y: 0 }
    : direction === 'right' ? { x:  x ||  40, y: 0 }
    : direction === 'down'  ? { x: 0, y: -y }
    :                          { x: 0, y };

  const variants: Variants = {
    hidden: { opacity: 0, ...offset, filter: 'blur(6px)' },
    show:   { opacity: 1, x: 0, y: 0, filter: 'blur(0px)',
              transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } },
  };

  const MotionTag = (motion as any)[as] ?? motion.div;
  if (reduced) return <MotionTag className={className} style={style}>{children}</MotionTag>;

  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.25 }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}
