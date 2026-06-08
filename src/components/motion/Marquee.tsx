import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  speed?: number; // seconds per loop
  reverse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  pauseOnHover?: boolean;
}

/**
 * Pure-CSS marquee. Pass the same content twice as children OR use repeat helper.
 */
export default function Marquee({
  children, speed = 30, reverse = false, className, style, pauseOnHover = true,
}: Props) {
  return (
    <div
      className={`marquee-root ${className ?? ''}`}
      style={{ overflow: 'hidden', position: 'relative', ...style }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'flex',
          width: 'max-content',
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
        onMouseEnter={e => { if (pauseOnHover) (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'; }}
        onMouseLeave={e => { if (pauseOnHover) (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'; }}
      >
        <div style={{ display: 'flex', flexShrink: 0 }}>{children}</div>
        <div style={{ display: 'flex', flexShrink: 0 }} aria-hidden>{children}</div>
      </div>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
