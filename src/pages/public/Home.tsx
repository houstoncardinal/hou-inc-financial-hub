import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Phone, Mail, MapPin,
  HardHat,
  Star, Compass, Ruler, Hammer, ClipboardCheck,
  Trophy, Users, Quote, CheckCircle2, ShieldCheck,
  CalendarCheck, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const CR   = '#F5F2EC';   /* warm cream — dominant bg colour */
const CR2  = '#FAF8F4';   /* lightest cream */
const G200 = '#E5DFD6';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';   /* gold */
const ACL  = '#C4A76B';   /* light gold */
const SF   = "'Cormorant Garamond', Georgia, serif";


/* ── Photos ──────────────────────────────────────────────────────────── */
const PH = {
  hero:     'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=90',
  about:    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=85',
  res:      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
  comm:     'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=85',
  svcRes:   'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=85',
  svcComm:  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=900&q=85',
  svcPM:    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85',
  proj1:    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
  proj2:    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
  proj3:    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
};

/* ── Portfolio carousel data ─────────────────────────────────────────── */
const PORTFOLIO = [
  { img: PH.proj1,   tag: 'River Oaks · Residential',    title: 'Chambord Estate',          sf: '14,500 SF',  yr: '2024' },
  { img: PH.proj2,   tag: 'Energy Corridor · Industrial', title: 'Westway Commerce Campus',  sf: '212,000 SF', yr: '2024' },
  { img: PH.proj3,   tag: 'Galleria · Commercial',        title: 'Meridian Tower Retail',    sf: '98,000 SF',  yr: '2023' },
  { img: PH.svcRes,  tag: 'Memorial · Residential',       title: 'Memorial Parkview Estate', sf: '8,200 SF',   yr: '2023' },
  { img: PH.comm,    tag: 'Midtown · Commercial',          title: 'Chronicle Tower',          sf: '148,000 SF', yr: '2022' },
  { img: PH.svcComm, tag: 'The Woodlands · Office',       title: 'Pinnacle Business Center', sf: '64,000 SF',  yr: '2022' },
];

/* ── Crane transition variants ───────────────────────────────────────── */
const craneVariants = {
  enter: (dir: number) => ({
    y: -110, x: dir * 72, opacity: 0,
  }),
  center: {
    y: 0, x: 0, opacity: 1,
    transition: {
      x: { duration: 0.50, ease: [0.22, 1, 0.36, 1] as const },
      y: { duration: 0.56, delay: 0.44, ease: [0.22, 1, 0.36, 1] as const },
      opacity: { duration: 0.28, delay: 0.38 },
    },
  },
  exit: (dir: number) => ({
    y: -110, x: -dir * 72, opacity: 0,
    transition: {
      y: { duration: 0.26, ease: [0.4, 0, 1, 1] as const },
      x: { duration: 0.46, delay: 0.20, ease: [0.4, 0, 1, 1] as const },
      opacity: { duration: 0.26, delay: 0.12 },
    },
  }),
};

/* ── Grid pattern ────────────────────────────────────────────────────── */
const GRID: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)`,
  backgroundSize: '72px 72px',
};

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.12) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

/* ── Corner accent brackets ─────────────────────────────────────────── */
function Corners({ c = AC, sz = 18, t = 1.5 }: { c?: string; sz?: number; t?: number }) {
  const b = { position: 'absolute' as const, backgroundColor: c };
  const g = (p: React.CSSProperties) => <span style={{ position: 'absolute', width: sz, height: sz, ...p }}>
    {Object.values(p).length > 0 && null}
  </span>;
  return (
    <>
      {[
        [{ top: 0, left: 0 }, { top: 0, left: 0 }],
        [{ top: 0, right: 0 }, { top: 0, right: 0 }],
        [{ bottom: 0, left: 0 }, { bottom: 0, left: 0 }],
        [{ bottom: 0, right: 0 }, { bottom: 0, right: 0 }],
      ].map(([pos], k) => {
        const p = Object.entries(pos)[0];
        return (
          <span key={k} style={{ position: 'absolute', width: sz, height: sz, ...pos }}>
            <span style={{ ...b, [p[0]]: 0, [p[1] === '0' ? 'left' : 'right']: 0, width: t, height: sz }} />
            <span style={{ ...b, [p[0]]: 0, [p[1] === '0' ? 'left' : 'right']: 0, height: t, width: sz }} />
          </span>
        );
      })}
    </>
  );
}

/* ── Interactive headline word ──────────────────────────────────────── */
function IW({ ch, delay = 0, gold = false }: { ch: string; delay?: number; gold?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.span className="inline-block cursor-default"
      style={{ color: gold ? AC : hov ? ACL : W, transition: 'color 0.2s' }}
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => !gold && setHov(true)}
      onMouseLeave={() => setHov(false)}>
      {ch}
    </motion.span>
  );
}

/* ── Fill-sweep button ──────────────────────────────────────────────── */
function FillBtn({
  to, href, children, variant = 'dark', size = 'md',
}: {
  to?: string; href?: string; children: React.ReactNode;
  variant?: 'dark' | 'white' | 'outline-white' | 'outline-dark' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hov, setHov] = useState(false);
  const pad  = size === 'lg' ? '17px 38px' : size === 'sm' ? '10px 20px' : '13px 28px';
  const fs   = size === 'lg' ? '10px' : size === 'sm' ? '8px' : '9px';
  const bgs: Record<string, string> = {
    dark: B, white: W, gold: AC, 'outline-white': 'transparent', 'outline-dark': 'transparent',
  };
  const fgs: Record<string, string> = {
    dark: W, white: B, gold: W, 'outline-white': hov ? W : 'rgba(255,255,255,0.6)', 'outline-dark': hov ? W : G500,
  };
  const sweep: Record<string, string> = {
    dark: AC, white: AC, gold: B, 'outline-white': AC, 'outline-dark': B,
  };
  const border: Record<string, string> = {
    dark: 'none', white: 'none', gold: 'none',
    'outline-white': '1px solid rgba(255,255,255,0.22)',
    'outline-dark': `1px solid ${G200}`,
  };

  const cls = `relative overflow-hidden inline-flex items-center gap-2 font-bold uppercase tracking-[0.28em] transition-colors`;
  const style = { backgroundColor: bgs[variant], color: fgs[variant], padding: pad, fontSize: fs, border: border[variant] };
  const inner = (
    <>
      <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: sweep[variant] }}
        animate={{ scaleX: hov ? 1 : 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
      <span className="relative z-10 flex items-center gap-2 transition-colors" style={{ color: hov ? W : fgs[variant] }}>
        {children}
      </span>
    </>
  );

  const handlers = { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) };
  if (href) return <a href={href} className={cls} style={style} {...handlers}>{inner}</a>;
  return <Link to={to ?? '/'} className={cls} style={style} {...handlers}>{inner}</Link>;
}

/* ── Service card ────────────────────────────────────────────────────── */
function ServiceCard({ s }: { s: { img: string; tag: string; title: string; sub: string; spec: string[] } }) {
  const [hov, setHov] = useState(false);
  return (
    <TiltCard max={4} glare className="h-full cursor-pointer" style={{ borderRadius: 0 }}>
      <motion.div className="relative overflow-hidden" style={{ height: 500, backgroundColor: '#1A1410' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <motion.div className="absolute inset-0"
          style={{ backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          animate={{ scale: hov ? 1.07 : 1 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }} />
        <motion.div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.97) 30%, rgba(8,6,4,0.18) 100%)' }}
          animate={{ opacity: hov ? 1 : 0.88 }} transition={{ duration: 0.4 }} />
        {/* Gold top line on hover */}
        <motion.div className="absolute top-0 left-0 h-0.5" style={{ backgroundColor: AC }}
          animate={{ width: hov ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="text-[8px] uppercase tracking-[0.42em] font-bold mb-3" style={{ color: ACL }}>{s.tag}</div>
          <h3 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '26px', color: W, lineHeight: 1.12, marginBottom: 12 }}>
            {s.title}
          </h3>
          <motion.p className="text-[12px] leading-relaxed font-light mb-5"
            style={{ color: 'rgba(255,255,255,0.52)' }}
            animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 12 }} transition={{ duration: 0.3 }}>
            {s.sub}
          </motion.p>
          <motion.div className="space-y-1.5 mb-5"
            animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 8 }} transition={{ duration: 0.3, delay: 0.04 }}>
            {s.spec.map(sp => (
              <div key={sp} className="flex items-center gap-2">
                <ChevronRight className="w-2.5 h-2.5 shrink-0" style={{ color: AC }} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.58)' }}>{sp}</span>
              </div>
            ))}
          </motion.div>
          <motion.div animate={{ opacity: hov ? 1 : 0.4 }} transition={{ duration: 0.25 }}>
            <Link to="/services" className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.28em] font-bold"
              style={{ color: AC }}>
              Explore <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </TiltCard>
  );
}

/* ── Split image panel (expertise section) ───────────────────────────── */
function ExpertisePanel({ img, tag, title, desc, specs, to }: {
  img: string; tag: string; title: string; desc: string; specs: string[]; to: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div className="relative overflow-hidden flex-1 cursor-pointer" style={{ minHeight: 560 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <motion.div className="absolute inset-0"
        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.04 : 1 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }} />
      <motion.div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(4,3,2,0.96) 38%, rgba(4,3,2,0.25) 100%)' }}
        animate={{ opacity: hov ? 1 : 0.86 }} transition={{ duration: 0.4 }} />
      <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-14">
        <div className="text-[8px] uppercase tracking-[0.46em] font-bold mb-4" style={{ color: ACL }}>{tag}</div>
        <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,3.5vw,46px)', color: W, lineHeight: 1.06, marginBottom: 16 }}>
          {title}
        </h2>
        <motion.p className="text-[13px] leading-relaxed font-light max-w-xs mb-6"
          style={{ color: 'rgba(255,255,255,0.48)' }}
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 16 }} transition={{ duration: 0.35 }}>
          {desc}
        </motion.p>
        <motion.div className="space-y-2 mb-7"
          animate={{ opacity: hov ? 1 : 0, y: hov ? 0 : 10 }} transition={{ duration: 0.3, delay: 0.05 }}>
          {specs.map(sp => (
            <div key={sp} className="flex items-center gap-2">
              <span className="w-1 h-1 shrink-0 rounded-full" style={{ backgroundColor: AC }} />
              <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.5)' }}>{sp}</span>
            </div>
          ))}
        </motion.div>
        <motion.div animate={{ opacity: hov ? 1 : 0.28 }} transition={{ duration: 0.25 }}>
          <Link to={to} className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-black py-3 px-6"
            style={{ backgroundColor: AC, color: W }}>
            Explore <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Project card ────────────────────────────────────────────────────── */
function ProjectCard({ img, tag, title, sqft, year, tall = false }: {
  img: string; tag: string; title: string; sqft: string; year: string; tall?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div className="relative overflow-hidden cursor-pointer group"
      style={{ height: tall ? 640 : 310, backgroundColor: '#111' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <motion.div className="absolute inset-0"
        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.06 : 1 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }} />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 28%, rgba(0,0,0,0.1) 100%)' }} />
      <motion.div className="absolute inset-x-0 bottom-0 p-7"
        animate={{ y: hov ? 0 : 12, opacity: hov ? 1 : 0.65 }} transition={{ duration: 0.32 }}>
        <div className="text-[8px] uppercase tracking-[0.34em] font-semibold mb-1.5" style={{ color: ACL }}>{tag}</div>
        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: tall ? '28px' : '20px', color: W, lineHeight: 1.1 }}>
          {title}
        </div>
        <motion.div className="flex items-center gap-4 mt-2.5"
          animate={{ opacity: hov ? 1 : 0 }} transition={{ duration: 0.22, delay: 0.06 }}>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.42)' }}>{sqft}</span>
          <span style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>
          <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.42)' }}>{year}</span>
        </motion.div>
      </motion.div>
      <motion.div className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center"
        style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.4)' }}
        animate={{ opacity: hov ? 1 : 0, scale: hov ? 1 : 0.78 }} transition={{ duration: 0.22 }}>
        <ArrowUpRight className="w-4 h-4" style={{ color: W }} strokeWidth={1.5} />
      </motion.div>
    </motion.div>
  );
}

/* ── Why card ────────────────────────────────────────────────────────── */
function WhyCard({ icon: Icon, title, sub }: { icon: React.ComponentType<any>; title: string; sub: string }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div className="relative p-7 cursor-default overflow-hidden transition-colors"
      style={{ border: `1px solid ${hov ? AC : G200}`, backgroundColor: hov ? W : W, boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.07)' : 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <motion.div className="absolute top-0 left-0 h-0.5" style={{ backgroundColor: AC }}
        animate={{ width: hov ? '100%' : '0%' }} transition={{ duration: 0.42 }} />
      <div className="w-10 h-10 flex items-center justify-center mb-5 transition-colors"
        style={{ backgroundColor: hov ? 'rgba(157,126,63,0.1)' : CR, border: `1px solid ${hov ? AC : G200}` }}>
        <Icon className="w-4.5 h-4.5" style={{ color: AC }} strokeWidth={1.5} />
      </div>
      <div className="text-[12px] font-bold uppercase tracking-[0.12em] mb-2.5 transition-colors"
        style={{ color: B }}>{title}</div>
      <div className="text-[12px] leading-relaxed font-light" style={{ color: G500 }}>{sub}</div>
    </motion.div>
  );
}

/* ── Step card ───────────────────────────────────────────────────────── */
function StepCard({ icon: Icon, n, title, sub, i }: { icon: React.ComponentType<any>; n: string; title: string; sub: string; i: number }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={i * 0.09}>
      <div className="cursor-default" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div className="relative h-px mb-8" style={{ backgroundColor: G200 }}>
          <motion.div className="absolute inset-y-0 left-0" style={{ backgroundColor: AC }}
            animate={{ width: hov ? '100%' : '0%' }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }} />
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 flex items-center justify-center transition-all"
            style={{ backgroundColor: hov ? AC : CR, border: `1px solid ${hov ? AC : G200}` }}>
            <Icon className="w-4 h-4 transition-colors" style={{ color: hov ? W : G500 }} strokeWidth={1.5} />
          </div>
          <div className="text-[10px] uppercase tracking-[0.38em] font-black transition-colors"
            style={{ color: hov ? AC : G400 }}>{n}</div>
        </div>
        <div className="text-[13px] font-bold uppercase tracking-[0.12em] mb-3 transition-colors"
          style={{ color: B }}>{title}</div>
        <div className="text-[12px] leading-relaxed font-light" style={{ color: G500 }}>{sub}</div>
      </div>
    </Reveal>
  );
}

/* ── Testimonial card ────────────────────────────────────────────────── */
function TestiCard({ q, name, title, dark, i }: {
  q: string; name: string; title: string; dark?: boolean; i: number;
}) {
  return (
    <Reveal delay={i * 0.1}>
      <div className="relative p-8 h-full"
        style={{ backgroundColor: dark ? B : W, border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : G200}` }}>
        <div className="flex gap-1 mb-5">
          {[...Array(5)].map((_,j) => <Star key={j} className="w-3 h-3 fill-current" style={{ color: AC }} strokeWidth={0} />)}
        </div>
        <Quote className="w-6 h-6 mb-4 opacity-30" style={{ color: AC }} strokeWidth={1} />
        <p className="text-[13px] leading-[1.8] font-light mb-7 italic"
          style={{ fontFamily: SF, color: dark ? 'rgba(255,255,255,0.72)' : '#4A4540' }}>
          {q}
        </p>
        <div style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : G200}`, paddingTop: 18 }}>
          <div className="text-[12px] font-bold" style={{ color: dark ? 'rgba(255,255,255,0.8)' : B }}>{name}</div>
          <div className="text-[10px] mt-1 leading-snug font-light" style={{ color: dark ? 'rgba(255,255,255,0.3)' : G500 }}>{title}</div>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Manifesto pull-quote ────────────────────────────────────────────── */
function ManifestoText() {
  const words = "We don't just construct buildings. We engineer the landmarks that define Houston's legacy — delivering quality, integrity, and innovation on every project, every time.".split(' ');
  return (
    <p style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px,3vw,42px)', lineHeight: 1.42, color: B }}>
      {words.map((w,i) => (
        <motion.span key={i} className="inline-block mr-[0.22em]"
          initial={{ opacity: 0.06 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: i * 0.024, duration: 0.5, ease: 'easeOut' }}>
          {w}
        </motion.span>
      ))}
    </p>
  );
}

/* ── Floating hero service card — horizontal 2-zone layout ───────────── */
function FloatCard({
  num, title, items, accent = false,
}: {
  num: string; title: string;
  items: string[]; accent?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const bg    = accent ? AC : W;
  const fg    = accent ? W  : B;
  const itemC = accent ? 'rgba(255,255,255,0.88)' : '#4A4744';
  const sep   = accent ? 'rgba(255,255,255,0.13)' : '#E4DED7';
  const vsep  = accent ? 'rgba(255,255,255,0.18)' : '#DEDAD3';
  const acnC  = accent ? 'rgba(255,255,255,0.95)' : AC;
  const topBg = accent
    ? 'linear-gradient(90deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.08) 100%)'
    : `linear-gradient(90deg, ${AC} 0%, ${ACL} 100%)`;
  const ctaBg    = hov
    ? (accent ? 'rgba(0,0,0,0.30)' : B)
    : (accent ? 'rgba(0,0,0,0.16)' : 'rgba(157,126,63,0.08)');
  const ctaColor = hov ? W : acnC;

  return (
    <div
      style={{
        backgroundColor: bg, overflow: 'hidden', position: 'relative' as const,
        display: 'flex', flexDirection: 'column',
        boxShadow: hov
          ? `0 28px 80px rgba(0,0,0,0.28), 0 8px 28px rgba(0,0,0,0.16), inset 0 0 0 1px ${accent ? 'rgba(255,255,255,0.20)' : 'rgba(157,126,63,0.30)'}`
          : '0 12px 50px rgba(0,0,0,0.20), 0 4px 14px rgba(0,0,0,0.10)',
        transform: hov ? 'scale(1.028) translateY(-5px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.44s cubic-bezier(0.22,1,0.36,1), box-shadow 0.44s ease',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Watermark depth number */}
      <div style={{
        position: 'absolute', bottom: 40, right: 10, pointerEvents: 'none',
        userSelect: 'none' as const, fontFamily: SF, fontWeight: 700,
        fontSize: 72, lineHeight: 1,
        color: accent ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.034)',
      }}>
        {num}
      </div>

      {/* Gold top stripe */}
      <div style={{ height: 3, background: topBg, flexShrink: 0 }} />

      {/* 2-zone body */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left: index + title */}
        <div style={{
          width: '50%', flexShrink: 0,
          padding: '20px 18px 20px 22px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
          borderRight: `1px solid ${vsep}`,
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.48em',
            textTransform: 'uppercase' as const, color: acnC, marginBottom: 10,
          }}>
            {num}
          </div>
          <h3 style={{
            fontFamily: SF, fontStyle: 'italic', fontWeight: 400,
            fontSize: 'clamp(20px, 2vw, 30px)', color: fg,
            lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em',
          }}>
            {title}
          </h3>
        </div>

        {/* Right: service items — larger, clearly readable */}
        <div style={{
          flex: 1, padding: '20px 18px 20px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {items.map((item, i) => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingTop: i === 0 ? 0 : 9,
              paddingBottom: i === items.length - 1 ? 0 : 9,
              borderBottom: i < items.length - 1 ? `1px solid ${sep}` : 'none',
            }}>
              <ChevronRight className="w-3 h-3 shrink-0" style={{ color: acnC }} strokeWidth={2.5} />
              <span style={{
                fontSize: 12.5, fontWeight: 500, color: itemC,
                lineHeight: 1.3, letterSpacing: '0.005em',
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Full-width CTA bar */}
      <Link
        to="/services"
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '13px 22px',
          backgroundColor: ctaBg, borderTop: `1px solid ${vsep}`,
          textDecoration: 'none',
          transition: 'background-color 0.30s ease',
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.36em',
          textTransform: 'uppercase' as const, color: ctaColor,
          transition: 'color 0.30s ease',
        }}>
          Explore Service
        </span>
        <ArrowUpRight
          className="w-4 h-4"
          style={{ color: ctaColor, transition: 'color 0.30s ease' }}
          strokeWidth={2}
        />
      </Link>

    </div>
  );
}

/* ── Intent fork panel (Residential / Commercial split) ─────────────── */
function IntentForkPanel({
  img, tag, title, desc, cta, ctaVariant, border = false,
}: {
  img: string; tag: string; title: string; desc: string;
  cta: string; ctaVariant: 'white' | 'gold'; border?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="relative overflow-hidden flex flex-col justify-end cursor-pointer"
      style={{
        minHeight: 'clamp(380px, 44vw, 540px)',
        borderLeft: border ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: hov ? 1.05 : 1 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(4,3,2,0.96) 0%, rgba(4,3,2,0.52) 50%, rgba(4,3,2,0.12) 100%)' }} />
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-0.5 origin-bottom"
        style={{ backgroundColor: AC }}
        animate={{ scaleY: hov ? 1 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="relative z-10 p-10 md:p-14">
        <div style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.44em',
          textTransform: 'uppercase' as const, color: ACL, marginBottom: 14,
        }}>
          {tag}
        </div>
        <h3 style={{
          fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
          fontSize: 'clamp(26px, 3vw, 44px)', color: W,
          lineHeight: 1.08, marginBottom: 16, maxWidth: '16ch',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 13, lineHeight: 1.75, fontWeight: 300,
          color: 'rgba(255,255,255,0.60)', marginBottom: 28, maxWidth: '38ch',
        }}>
          {desc}
        </p>
        <FillBtn to="/services" variant={ctaVariant} size="md">
          {cta} <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
        </FillBtn>
      </div>
    </div>
  );
}


/* ── Portfolio sidebar item with hover effects ───────────────────────── */
function PgSidebarItem({
  p, i, active, onClick,
}: {
  p: { img: string; tag: string; title: string; sf: string; yr: string };
  i: number; active: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 18,
        padding: '0 clamp(20px,2.5vw,36px)',
        textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', overflow: 'hidden',
        transition: 'background-color 0.4s ease',
        backgroundColor: active ? 'rgba(157,126,63,0.07)' : 'transparent',
      }}
    >
      {/* Spring-animated left indicator */}
      {active && (
        <motion.div
          layoutId="pg-bar"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${AC}, ${ACL})` }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}

      {/* Hover: image preview layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `url(${p.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ opacity: hov && !active ? 0.16 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Hover: dark scrim so text remains legible */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(4,3,2,0.88) 0%, rgba(4,3,2,0.62) 100%)' }}
        animate={{ opacity: hov && !active ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Number */}
      <motion.div
        style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, lineHeight: 1, flexShrink: 0, position: 'relative', fontSize: 'clamp(20px,2vw,28px)' }}
        animate={{ color: active ? ACL : hov ? ACL : 'rgba(255,255,255,0.10)', scale: hov ? 1.14 : 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {String(i + 1).padStart(2, '0')}
      </motion.div>

      {/* Divider rule */}
      <motion.div
        style={{ width: 1, alignSelf: 'stretch', margin: '14px 0', flexShrink: 0, position: 'relative' }}
        animate={{ backgroundColor: active ? 'rgba(196,167,107,0.22)' : hov ? 'rgba(196,167,107,0.18)' : 'rgba(255,255,255,0.06)' }}
        transition={{ duration: 0.3 }}
      />

      {/* Title + tag */}
      <motion.div
        style={{ minWidth: 0, position: 'relative' }}
        animate={{ x: hov && !active ? 5 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px,1.1vw,15px)', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          animate={{ color: active ? W : hov ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)' }}
          transition={{ duration: 0.3 }}
        >
          {p.title}
        </motion.div>
        <motion.div
          style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase' as const,
            marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          animate={{ color: active ? ACL : hov ? 'rgba(196,167,107,0.65)' : 'rgba(255,255,255,0.12)' }}
          transition={{ duration: 0.3 }}
        >
          {p.tag}
        </motion.div>
      </motion.div>

      {/* Arrow — visible on active or hover */}
      <AnimatePresence>
        {(active || hov) && (
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.24 }}
            style={{ marginLeft: 'auto', flexShrink: 0, position: 'relative' }}
          >
            <ArrowUpRight style={{ width: 13, height: 13, color: active ? ACL : 'rgba(196,167,107,0.52)' }} strokeWidth={1.8} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ── Eyebrow label ───────────────────────────────────────────────────── */
function Eyebrow({ children, center = false }: { children: string; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-5 ${center ? 'justify-center' : ''}`}>
      <div className="h-px w-8 shrink-0" style={{ backgroundColor: AC }} />
      <div className="text-[8px] uppercase tracking-[0.46em] font-bold whitespace-nowrap" style={{ color: AC }}>{children}</div>
      {center && <div className="h-px w-8 shrink-0" style={{ backgroundColor: AC }} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const fade  = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 48]);

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % PORTFOLIO.length), 5500);
    return () => clearInterval(t);
  }, []);

  // Portfolio showcase (crane section)
  const [pgSlide, setPgSlide] = useState(0);
  const [pgDir, setPgDir]   = useState(1);
  const pgRef = useRef<ReturnType<typeof setInterval>>();
  const startPgTimer = () => {
    clearInterval(pgRef.current);
    pgRef.current = setInterval(() => {
      setPgDir(1);
      setPgSlide(s => (s + 1) % PORTFOLIO.length);
    }, 4800);
  };
  useEffect(() => { startPgTimer(); return () => clearInterval(pgRef.current); }, []);
  const goToPg = (i: number) => {
    setPgDir(i >= pgSlide ? 1 : -1);
    setPgSlide(i);
    startPgTimer();
  };

  const [photoHov, setPhotoHov] = useState(false);

  return (
    <PublicLayout>

      {/* ══════════════════════════════════════════════
          HERO — video bg, flex-column, fits in viewport
      ══════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden flex flex-col h-[74svh] md:h-[82svh]"
        style={{ backgroundColor: B }}
      >

        {/* ── Background video ── */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/herobg.mp4"
          autoPlay muted loop playsInline
        />

        {/* ── Overlays: cinematic vignette ── */}
        {/* Base: overall darkening so video never fights the text */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(2,2,1,0.42)' }} />
        {/* Left-to-right: deep dark where text lives, gradual open on right */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(2,2,1,0.96) 0%, rgba(2,2,1,0.84) 42%, rgba(2,2,1,0.32) 100%)' }} />
        {/* Top: darken header zone */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(2,2,1,0.80) 0%, rgba(2,2,1,0) 30%)' }} />
        {/* Bottom: fade into floating cards */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(2,2,1,0.92) 0%, rgba(2,2,1,0) 34%)' }} />

        {/* ── Subtle grid texture ── */}
        <div className="absolute inset-0 pointer-events-none" style={GRID} />

        {/* ── Animated left-edge gold accent ── */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 origin-top"
          style={{ background: `linear-gradient(to bottom, transparent 0%, ${AC} 25%, ${ACL} 60%, transparent 100%)` }}
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* ════════════════════════════════════════
            MAIN CONTENT — flex-1, vertically centered
        ════════════════════════════════════════ */}
        <motion.div
          className="relative z-10 flex-1 flex items-end px-8 md:px-14 lg:px-24"
          style={{ paddingBottom: 'clamp(120px, 14vh, 160px)', opacity: fade, y: textY }}
        >
          <div>

            {/* Eyebrow */}
            <motion.div className="flex items-center gap-3 mb-3"
              initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <div style={{ height: 1, width: 32, backgroundColor: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
              <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.48em', color: 'rgba(255,255,255,0.72)' }}>
                Est. 1998 · Houston, Texas
              </span>
            </motion.div>

            {/* Headline */}
            <div className="mb-5" style={{ fontFamily: SF, fontWeight: 300 }}>
              <motion.div
                style={{
                  fontSize:   'clamp(36px, 7vw, 112px)',
                  lineHeight: 0.92,
                  color:      W,
                  textShadow: '0 2px 10px rgba(0,0,0,0.65), 0 8px 32px rgba(0,0,0,0.35)',
                }}
                initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                Building Excellence
              </motion.div>
              <motion.div
                style={{
                  fontSize:   'clamp(36px, 7vw, 112px)',
                  lineHeight: 0.92,
                  color:      ACL,
                  fontStyle:  'italic',
                  textShadow: '0 2px 10px rgba(0,0,0,0.60), 0 0 36px rgba(196,167,107,0.42), 0 0 90px rgba(157,126,63,0.20)',
                }}
                initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.33, ease: [0.22, 1, 0.36, 1] }}>
                from the Ground Up
              </motion.div>
            </div>

            {/* Below-headline group */}
            <div style={{ maxWidth: 'clamp(300px, 42vw, 560px)' }}>

              {/* Description */}
              <motion.p
                style={{
                  fontSize: 'clamp(14px, 1.4vw, 18px)',
                  lineHeight: 1.7, fontWeight: 300,
                  color: 'rgba(255,255,255,0.88)', marginBottom: 24,
                  letterSpacing: '0.014em',
                  textShadow: '0 1px 8px rgba(0,0,0,0.60)',
                }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.46 }}>
                Since 1998, Houston Enterprise has delivered landmark residences
                and grade-A commercial spaces across Texas — trusted by the
                city's most discerning clients for craftsmanship, accountability,
                and one unwavering standard:{' '}
                <em style={{ fontStyle: 'italic', color: ACL }}>excellence.</em>
              </motion.p>

              {/* CTAs */}
              <motion.div className="flex flex-wrap gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.56 }}>
                <FillBtn to="/start-project" variant="gold" size="lg">
                  Start Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </FillBtn>
                <FillBtn to="/portfolio" variant="outline-white" size="lg">
                  View Our Portfolio <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                </FillBtn>
              </motion.div>

            </div>

          </div>
        </motion.div>

      </section>

      {/* ══════════════════════════════════════════════
          FLOATING SERVICE CARDS
      ══════════════════════════════════════════════ */}
      <div
        className="relative -mt-10 md:-mt-20 px-5 md:px-8 lg:px-20 xl:px-24 pointer-events-none"
        style={{ zIndex: 20 }}
      >
        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 pb-20 pointer-events-auto">
          <FloatCard
            num="01"
            title="Residential Construction."
            items={['Custom Home Construction', 'Full Home Renovations', 'Additions & Expansions']}
          />
          <FloatCard
            num="02"
            title="Commercial Construction."
            items={['Office Buildings', 'Retail & Mixed-Use', 'Hospitality & Entertainment']}
          />
          <FloatCard
            num="03"
            title="Project Management."
            items={['Collaborative Planning', 'Budget & Cost Control', 'Quality Assurance']}
            accent
          />
        </div>

        {/* Mobile: stacked with side padding for the floating aesthetic */}
        <div className="md:hidden flex flex-col gap-3 pb-8 pointer-events-auto">
          <FloatCard
            num="01"
            title="Residential Construction."
            items={['Custom Home Construction', 'Full Home Renovations', 'Additions & Expansions']}
          />
          <FloatCard
            num="02"
            title="Commercial Construction."
            items={['Office Buildings', 'Retail & Mixed-Use', 'Hospitality & Entertainment']}
          />
          <FloatCard
            num="03"
            title="Project Management."
            items={['Collaborative Planning', 'Budget & Cost Control', 'Quality Assurance']}
            accent
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          THE HOUSTON ENTERPRISE DIFFERENCE
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 lg:px-24 py-16 md:py-24">

          {/* ── Header ── */}
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-20 mb-14 md:mb-16">
              <div style={{ flexShrink: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ height: 1, width: 28, backgroundColor: AC, flexShrink: 0 }} />
                  <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.52em', textTransform: 'uppercase' as const, color: AC }}>
                    Why Houston Enterprise
                  </span>
                </div>
                <h2>
                  <span style={{
                    display: 'block', fontFamily: SF, fontStyle: 'normal', fontWeight: 600,
                    fontSize: 'clamp(36px, 5vw, 80px)', color: B,
                    lineHeight: 0.94, letterSpacing: '-0.025em',
                  }}>The standard your</span>
                  <span style={{
                    display: 'block', fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                    fontSize: 'clamp(36px, 5vw, 80px)', color: ACL, lineHeight: 1.04,
                  }}>project deserves.</span>
                </h2>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.78, fontWeight: 300, color: G500, maxWidth: '38ch', paddingBottom: 6 }}>
                Construction is one of the most significant investments you will ever make.
                We were built — in every sense — to protect it.
              </p>
            </div>
          </Reveal>

          {/* ── 4 differentiator cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            style={{ gap: 1, backgroundColor: 'rgba(0,0,0,0.07)' }}>
            {[
              {
                num: '01',
                title: '26 Years\nHouston-Deep',
                body: 'Two and a half decades in the same market. We know every inspector, every code nuance, and every subcontractor worth trusting.',
                metric: '$800M+',
                metricLabel: 'Total Delivered',
              },
              {
                num: '02',
                title: 'One Team,\nStart to Finish',
                body: 'Co-founders personally engaged on every project above $2M. No handoffs, no surprises — the same people who scope your project finish it.',
                metric: 'Zero',
                metricLabel: 'Project Handoffs',
              },
              {
                num: '03',
                title: '98% On-Time.\nDocumented.',
                body: 'Verified across 200+ completed projects with CPM scheduling and contractual milestone accountability. Not a claim — a record.',
                metric: '98%',
                metricLabel: 'On-Time Delivery',
              },
              {
                num: '04',
                title: 'Nothing Hidden,\nEver.',
                body: 'Your private portal shows every permit, invoice, and site photo in real time. Full transparency is the baseline, not an upgrade.',
                metric: '24/7',
                metricLabel: 'Portal Access',
              },
            ].map((item, i) => (
              <Reveal key={item.num} delay={i * 0.06}>
                <div className="flex flex-col h-full" style={{ backgroundColor: W, padding: '32px 28px 28px', position: 'relative' }}>
                  {/* Short gold top accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 2, backgroundColor: AC }} />

                  {/* Number */}
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.44em',
                    textTransform: 'uppercase' as const, color: AC,
                    display: 'block', marginBottom: 18,
                  }}>{item.num}</span>

                  {/* Title */}
                  <h3 style={{
                    fontFamily: SF, fontStyle: 'normal', fontWeight: 600,
                    fontSize: 'clamp(20px, 1.8vw, 26px)', color: B,
                    lineHeight: 1.14, letterSpacing: '-0.018em', marginBottom: 14,
                    whiteSpace: 'pre-line',
                  }}>{item.title}</h3>

                  {/* Body */}
                  <p style={{
                    fontSize: 13.5, lineHeight: 1.80, fontWeight: 300, color: G500,
                    flex: 1, paddingBottom: 24,
                  }}>{item.body}</p>

                  {/* Metric */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 18 }}>
                    <div style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(30px, 2.6vw, 42px)', color: ACL, lineHeight: 1,
                    }}>{item.metric}</div>
                    <div style={{
                      fontSize: 7, fontWeight: 700, letterSpacing: '0.38em',
                      textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.30)', marginTop: 7,
                    }}>{item.metricLabel}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ── Bottom CTA ── */}
          <Reveal delay={0.18}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-12 md:pt-14">
              <p style={{ fontSize: 14, fontWeight: 300, color: G500, maxWidth: '48ch', lineHeight: 1.74 }}>
                Every project begins with a conversation.{' '}
                <span style={{ color: B, fontWeight: 400 }}>Schedule your free consultation today.</span>
              </p>
              <FillBtn to="/contact" variant="dark" size="md">
                Free Consultation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </FillBtn>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          RISK & COMPLIANCE — institutional trust
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: B, ...GRID, position: 'relative', overflow: 'hidden' }}>

        {/* Architectural watermark */}
        <div aria-hidden="true" style={{
          position: 'absolute', right: '-4%', top: '50%', transform: 'translateY(-50%)',
          fontFamily: SF, fontWeight: 700, fontSize: 'clamp(120px, 20vw, 320px)',
          lineHeight: 1, color: 'rgba(255,255,255,0.014)', letterSpacing: '0.06em',
          userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>PROTECTED</div>

        {/* Gold top edge */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(to right, transparent, ${ACL}, transparent)`,
          opacity: 0.45,
        }} />

        <div className="max-w-7xl mx-auto px-8 md:px-14 lg:px-24 pt-20 pb-0 md:pt-28 relative z-10">

          {/* ── Eyebrow ── */}
          <Reveal>
            <div className="flex items-center gap-3 mb-8 md:mb-10">
              <div className="h-px w-8 shrink-0" style={{ backgroundColor: ACL }} />
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.46em',
                textTransform: 'uppercase' as const, color: ACL,
              }}>Protection & Compliance</span>
            </div>
          </Reveal>

          {/* ── Massive headline ── */}
          <Reveal delay={0.06}>
            <h2 style={{ marginBottom: 20, lineHeight: 0.92 }}>
              <span style={{
                display: 'block',
                fontFamily: SF, fontStyle: 'normal', fontWeight: 600,
                fontSize: 'clamp(52px, 8vw, 128px)', color: W,
                letterSpacing: '-0.028em',
              }}>Your investment,</span>
              <span style={{
                display: 'block',
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(52px, 8vw, 128px)', color: ACL,
                letterSpacing: '-0.018em',
              }}>fully protected.</span>
            </h2>
          </Reveal>

          {/* ── One-line tagline ── */}
          <Reveal delay={0.10}>
            <p style={{
              fontSize: 'clamp(14px, 1.3vw, 17px)', fontWeight: 300,
              color: 'rgba(255,255,255,0.70)', lineHeight: 1.6,
              maxWidth: '56ch', marginBottom: 0,
            }}>
              $50M+ bonded. 26 years licensed. A+ rated. Every phase of your project, covered.
            </p>
          </Reveal>

        </div>

        {/* ── 4 massive metric blocks — gap-px grid ── */}
        <div className="max-w-7xl mx-auto px-8 md:px-14 lg:px-24 pt-14 md:pt-18 pb-0 relative z-10">
          <Reveal delay={0.13}>
            <div
              className="grid grid-cols-2 lg:grid-cols-4"
              style={{ gap: 1, backgroundColor: 'rgba(255,255,255,0.07)' }}
            >
              {[
                { metric: '$50M+', label: 'Bonding Capacity',   sub: 'Texas Licensed & Fully Insured' },
                { metric: '0.42',  label: 'EMR Safety Rating',  sub: '57% Below Industry Average' },
                { metric: 'A+',    label: 'BBB Accredited',     sub: '26 Years of Verified Excellence' },
                { metric: '98%',   label: 'On-Time Delivery',   sub: 'Documented Across 200+ Projects' },
              ].map(({ metric, label, sub }, i) => (
                <Reveal key={label} delay={i * 0.06}>
                  <div style={{
                    backgroundColor: B,
                    padding: 'clamp(28px, 4vw, 52px) clamp(20px, 3vw, 40px)',
                    position: 'relative',
                  }}>
                    {/* Gold top bar */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(to right, ${AC}, ${ACL})`,
                    }} />

                    <div style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(52px, 6vw, 96px)', color: ACL,
                      lineHeight: 1, letterSpacing: '-0.02em',
                      marginBottom: 14,
                    }}>{metric}</div>

                    <div style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: '0.44em',
                      textTransform: 'uppercase' as const, color: W,
                      marginBottom: 8,
                    }}>{label}</div>

                    <div style={{
                      fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.55)',
                      letterSpacing: '0.02em',
                    }}>{sub}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── Bottom CTA strip ── */}
        <div className="max-w-7xl mx-auto px-8 md:px-14 lg:px-24 py-10 md:py-12 relative z-10">
          <Reveal delay={0.18}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 36 }}>
              <p style={{
                fontSize: 13.5, fontWeight: 300,
                color: 'rgba(255,255,255,0.72)', maxWidth: '48ch', lineHeight: 1.76,
              }}>
                Every project begins with a site visit and an honest assessment.{' '}
                <span style={{ color: W, fontWeight: 500 }}>No obligation. No sales pressure.</span>
              </p>
              <FillBtn to="/start-project" variant="gold" size="md">
                Start Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </FillBtn>
            </div>
          </Reveal>
        </div>

      </section>

      {/* ══════════════════════════════════════════════
          PORTFOLIO SHOWCASE — crane transition
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: B, position: 'relative' }}>

        {/* ── Eyebrow header bar ── */}
        <Reveal>
          <div className="flex items-end justify-between px-8 md:px-14 lg:px-20 pt-16 pb-10 md:pt-20 md:pb-12">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ height: 1, width: 28, backgroundColor: ACL, flexShrink: 0 }} />
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.48em', textTransform: 'uppercase' as const, color: ACL }}>
                  Selected Work
                </span>
              </div>
              <h2 style={{ fontFamily: SF, lineHeight: 0.92, letterSpacing: '-0.028em' }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 'clamp(36px,5.5vw,84px)', color: W }}>
                  Defining Houston,
                </span>
                <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(36px,5.5vw,84px)', color: ACL }}>
                  one landmark at a time.
                </span>
              </h2>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-4 shrink-0 pb-1">
              <span style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em' }}>
                {String(pgSlide + 1).padStart(2, '0')} — {String(PORTFOLIO.length).padStart(2, '0')}
              </span>
              <FillBtn to="/portfolio" variant="outline-white" size="sm">
                Full Portfolio <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
              </FillBtn>
            </div>
          </div>
        </Reveal>

        {/* ── Split showcase ── */}
        <div className="flex flex-col lg:flex-row" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* ── Photo panel ── */}
          <div
            className="relative overflow-hidden"
            style={{ flexBasis: '70%', flexShrink: 0, minHeight: 'clamp(480px, 60vh, 700px)', cursor: 'pointer' }}
            onMouseEnter={() => setPhotoHov(true)}
            onMouseLeave={() => setPhotoHov(false)}
          >
            <AnimatePresence mode="wait" custom={pgDir}>
              <motion.div
                key={pgSlide}
                className="absolute inset-0"
                custom={pgDir}
                variants={craneVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {/* Ken Burns image */}
                <motion.div
                  className="absolute inset-0"
                  style={{ backgroundImage: `url(${PORTFOLIO[pgSlide].img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  initial={{ scale: 1.07 }}
                  animate={{ scale: 1.0 }}
                  transition={{ duration: 8, ease: 'linear' }}
                />

                {/* Gradient stack — deep at bottom, subtle at top */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,3,2,0.97) 0%, rgba(4,3,2,0.52) 42%, rgba(4,3,2,0.08) 72%, transparent 100%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(4,3,2,0.35) 0%, transparent 50%)' }} />

                {/* Project info — bottom left */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(28px,4vw,56px)' }}>

                  {/* Category tag */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '5px 12px', border: '1px solid rgba(196,167,107,0.25)', backgroundColor: 'rgba(157,126,63,0.08)' }}>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: ACL }} />
                    <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase' as const, color: ACL }}>
                      {PORTFOLIO[pgSlide].tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontFamily: SF, fontWeight: 600,
                    fontSize: 'clamp(32px, 4.8vw, 72px)',
                    color: W, lineHeight: 0.96, letterSpacing: '-0.026em',
                    marginBottom: 20,
                  }}>
                    {PORTFOLIO[pgSlide].title}
                  </h3>

                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.48)', letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>
                      {PORTFOLIO[pgSlide].sf}
                    </span>
                    <span style={{ margin: '0 14px', color: 'rgba(255,255,255,0.14)', fontSize: 10 }}>·</span>
                    <span style={{ fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.48)', letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>
                      {PORTFOLIO[pgSlide].yr}
                    </span>
                    <Link
                      to="/portfolio"
                      style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: ACL }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.36em', textTransform: 'uppercase' as const }}>View Project</span>
                      <ArrowUpRight style={{ width: 11, height: 11 }} strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 z-30" style={{ height: 1 }}>
              <motion.div
                key={pgSlide + '-pgbar'}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 4.8, ease: 'linear' }}
                style={{ height: '100%', background: `linear-gradient(to right, ${AC}, ${ACL})`, transformOrigin: 'left', opacity: 0.7 }}
              />
            </div>

            {/* Photo panel hover overlay */}
            <motion.div
              className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
              animate={{ opacity: photoHov ? 1 : 0 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              style={{ background: 'rgba(4,3,2,0.22)' }}
            >
              <motion.div
                animate={{ y: photoHov ? 0 : 14, opacity: photoHov ? 1 : 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: photoHov ? 0.07 : 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 26px',
                  border: `1px solid rgba(196,167,107,0.42)`, backgroundColor: 'rgba(4,3,2,0.68)', backdropFilter: 'blur(8px)' }}
              >
                <Link
                  to="/portfolio"
                  className="pointer-events-auto flex items-center gap-2.5"
                  style={{ textDecoration: 'none' }}
                >
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase' as const, color: ACL }}>
                    Explore Portfolio
                  </span>
                  <ArrowUpRight style={{ width: 11, height: 11, color: ACL }} strokeWidth={2} />
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* ── Sidebar — desktop ── */}
          <div
            className="hidden lg:flex flex-col flex-1"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}
          >
            {/* Large ghost number — decorative watermark */}
            <div aria-hidden="true" style={{
              position: 'absolute', right: -10, bottom: -10,
              fontFamily: SF, fontStyle: 'italic', fontWeight: 700,
              fontSize: 'clamp(120px, 16vw, 220px)', lineHeight: 1,
              color: 'rgba(255,255,255,0.022)', userSelect: 'none', pointerEvents: 'none',
              letterSpacing: '-0.04em',
            }}>
              {String(pgSlide + 1).padStart(2, '0')}
            </div>

            <LayoutGroup>
              {PORTFOLIO.map((p, i) => (
                <PgSidebarItem key={p.title} p={p} i={i} active={i === pgSlide} onClick={() => goToPg(i)} />
              ))}
            </LayoutGroup>
          </div>

          {/* ── Mobile thumbnail row ── */}
          <div className="flex lg:hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {PORTFOLIO.map((p, i) => {
              const active = i === pgSlide;
              return (
                <button
                  key={p.title}
                  onClick={() => goToPg(i)}
                  style={{
                    flex: 1, height: 64, position: 'relative', overflow: 'hidden',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    borderRight: i < PORTFOLIO.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${p.img})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: active ? 'brightness(0.85)' : 'brightness(0.22) saturate(0.5)',
                    transition: 'filter 0.4s ease',
                  }} />
                  {active && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${AC}, ${ACL})` }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: SF, fontStyle: 'italic', fontSize: 11, color: active ? W : 'rgba(255,255,255,0.35)', transition: 'color 0.4s' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PORTFOLIO CAROUSEL — cinematic project showcase
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: '88vh', minHeight: 520, backgroundColor: B }}>

        {/* Crossfading background images */}
        <AnimatePresence mode="sync">
          <motion.div
            key={slide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.06 }}
              animate={{ scale: 1.0 }}
              transition={{ duration: 7, ease: 'linear' }}
              style={{
                backgroundImage: `url(${PORTFOLIO[slide].img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Cinematic gradient stack */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(5,4,3,0.96) 0%, rgba(5,4,3,0.55) 35%, rgba(5,4,3,0.08) 68%, transparent 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(5,4,3,0.52) 0%, transparent 28%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={GRID} />

        {/* Top bar: eyebrow + portfolio link */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 md:px-14 lg:px-24 pt-8 md:pt-10">
          <div className="flex items-center gap-3">
            <div className="h-px w-7 shrink-0" style={{ backgroundColor: ACL }} />
            <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.48em', textTransform: 'uppercase' as const, color: ACL }}>
              Selected Work
            </span>
          </div>
          <Link
            to="/portfolio"
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-bold transition-colors"
            style={{ color: 'rgba(255,255,255,0.50)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACL; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.50)'; }}
          >
            Full Portfolio <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Prev arrow */}
        <button
          onClick={() => setSlide(s => (s - 1 + PORTFOLIO.length) % PORTFOLIO.length)}
          className="absolute left-4 md:left-8 lg:left-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 border flex items-center justify-center transition-all duration-200"
          style={{ borderColor: 'rgba(255,255,255,0.18)', opacity: 0.45 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.55)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
          aria-label="Previous project"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: W }} strokeWidth={1.5} />
        </button>

        {/* Next arrow */}
        <button
          onClick={() => setSlide(s => (s + 1) % PORTFOLIO.length)}
          className="absolute right-4 md:right-8 lg:right-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 border flex items-center justify-center transition-all duration-200"
          style={{ borderColor: 'rgba(255,255,255,0.18)', opacity: 0.45 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.55)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
          aria-label="Next project"
        >
          <ChevronRight className="w-4 h-4" style={{ color: W }} strokeWidth={1.5} />
        </button>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-8 md:px-14 lg:px-24 pb-10 md:pb-14">
          <div className="flex items-end justify-between gap-8">

            {/* Project info — slides with each change */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide + '-info'}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px w-6 shrink-0" style={{ backgroundColor: ACL }} />
                  <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.38em', textTransform: 'uppercase' as const, color: ACL }}>
                    {PORTFOLIO[slide].tag}
                  </span>
                </div>
                <h2 style={{
                  fontFamily: SF, fontStyle: 'normal', fontWeight: 600,
                  fontSize: 'clamp(28px, 4.5vw, 64px)', color: W,
                  lineHeight: 1.0, letterSpacing: '-0.022em', marginBottom: 10,
                }}>
                  {PORTFOLIO[slide].title}
                </h2>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>{PORTFOLIO[slide].sf}</span>
                  <span style={{ color: 'rgba(255,255,255,0.20)' }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>{PORTFOLIO[slide].yr}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Right: counter + dot nav */}
            <div className="flex flex-col items-end gap-4 shrink-0">
              <span style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em',
              }}>
                {String(slide + 1).padStart(2, '0')} / {String(PORTFOLIO.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                {PORTFOLIO.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="transition-all duration-300"
                    style={{
                      height: 3,
                      width: i === slide ? 24 : 4,
                      backgroundColor: i === slide ? ACL : 'rgba(255,255,255,0.28)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30" style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            key={slide + '-bar'}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5.5, ease: 'linear' }}
            style={{ height: '100%', backgroundColor: ACL, transformOrigin: 'left', opacity: 0.55 }}
          />
        </div>

      </section>

      {/* ══════════════════════════════════════════════
          SERVICES — cream bg, TiltCard hover
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W, paddingTop: 80, paddingBottom: 80 }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
              <div>
                <Eyebrow>What We Build</Eyebrow>
                <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4vw,52px)', color: B, lineHeight: 1.06 }}>
                  Comprehensive construction<br />services, tailored to you.
                </h2>
              </div>
              <FillBtn to="/services" variant="dark">
                All Services <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </FillBtn>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                img: PH.svcRes, tag: '01 · Residential', title: 'Residential Construction',
                sub: 'From new custom home builds to renovations, we handle it all — from concept to completion with unmatched quality craftsmanship.',
                spec: ['Custom Home Construction', 'Home Renovation', 'Home Additions', 'Kitchen & Bath Remodeling', 'Interior & Exterior Upgrades'],
              },
              {
                img: PH.svcComm, tag: '02 · Commercial', title: 'Commercial Construction',
                sub: 'Our commercial projects range from office buildings to retail spaces, ensuring every detail aligns with your business needs and vision.',
                spec: ['Office Buildings', 'Retail Spaces', 'Hospitality & Entertainment', 'Educational Facilities', 'Industrial & Warehousing'],
              },
              {
                img: PH.svcPM, tag: '03 · Management', title: 'Project Management',
                sub: 'Enjoy peace of mind as we oversee your project from start to finish — meticulous planning, budget control, and quality assurance throughout.',
                spec: ['Collaborative Planning', 'Detailed Scheduling', 'Budget Management', 'Quality Assurance', 'Risk Management'],
              },
            ].map((s, i) => (
              <Reveal key={s.tag} delay={i * 0.1}>
                <ServiceCard s={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MANIFESTO — cream with word-reveal
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: CR, borderTop: `1px solid ${G200}`, borderBottom: `1px solid ${G200}` }}>
        <div className="max-w-5xl mx-auto px-8 md:px-14 py-24 md:py-32 text-center">
          <Reveal>
            <Eyebrow center>Our Commitment</Eyebrow>
          </Reveal>
          <ManifestoText />
          <Reveal delay={0.3}>
            <p className="text-[10px] uppercase tracking-[0.4em] font-semibold mt-10" style={{ color: G400 }}>
              — Houston Enterprise · Est. 1998
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          WHY HOUSTON ENTERPRISE — CREAM (not dark!)
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: CR }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="grid md:grid-cols-2 gap-12 items-end mb-16">
              <div>
                <Eyebrow>Why Houston Enterprise</Eyebrow>
                <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4vw,52px)', color: B, lineHeight: 1.06 }}>
                  The standard others<br />measure themselves by.
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed font-light" style={{ color: G500 }}>
                Houston Enterprise isn't just Houston's most trusted contractor — we're the firm that the city's most discerning clients return to, built on a foundation of quality, transparency, and exceptional results.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Trophy,       title: '20+ Years Unmatched Expertise',  sub: 'With over two decades of experience in the Houston construction industry, we bring deep knowledge and skills to every project.' },
              { icon: HardHat,      title: 'Personalized Approach',          sub: 'We believe in creating spaces that reflect your unique style. Our team works closely with you to understand your vision and tailor every detail.' },
              { icon: CheckCircle2, title: 'Quality Craftsmanship',          sub: 'From the foundation to the finishing touches, we pay attention to every detail and use high-quality materials to ensure lasting beauty and longevity.' },
              { icon: CalendarCheck,title: 'Timely Delivery',                sub: 'Our structured project management approach ensures your project is completed on time and within budget, every single time.' },
              { icon: Users,        title: 'Transparent Communication',      sub: 'We believe in open and transparent communication throughout construction. Our team keeps you informed and addresses concerns promptly.' },
              { icon: ShieldCheck,  title: 'Safety & Compliance',            sub: 'Safety is our utmost priority. We adhere to strict protocols and comply with all building codes and regulations on every job site.' },
            ].map((w, i) => (
              <Reveal key={w.title} delay={i * 0.07}>
                <WhyCard {...w} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PROCESS — white, 4 steps
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="text-center mb-20">
              <Eyebrow center>How We Build</Eyebrow>
              <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4vw,52px)', color: B, lineHeight: 1.1 }}>
                A process built on precision<br />and lasting trust.
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { icon: Compass,        n: '01', title: 'Discovery & Vision',     sub: 'A thorough consultation to understand your vision, goals, and budget — aligning every decision to your objectives from day one.' },
              { icon: Ruler,          n: '02', title: 'Collaborative Planning',  sub: 'We work with architects, engineers, and subcontractors to develop a comprehensive plan that maximizes efficiency and exceeds expectations.' },
              { icon: Hammer,         n: '03', title: 'Precision Construction',  sub: 'Our skilled professionals execute with exacting standards under rigorous quality checks, ensuring every phase meets the highest benchmarks.' },
              { icon: ClipboardCheck, n: '04', title: 'Delivery & Stewardship', sub: 'We hand over a complete project, then remain your long-term partner — our commitment to client satisfaction extends well beyond completion.' },
            ].map((s, i) => <StepCard key={s.n} {...s} i={i} />)}
          </div>
          <Reveal delay={0.2}>
            <div className="mt-20 flex justify-center">
              <FillBtn to="/contact" variant="dark" size="lg">
                Begin Your Project <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </FillBtn>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: CR2 }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-24 md:py-32">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <Eyebrow>Client Testimonials</Eyebrow>
                <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4vw,50px)', color: B, lineHeight: 1.06 }}>
                  What Houston's leaders<br />say about us.
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_,i) => <Star key={i} className="w-4 h-4 fill-current" style={{ color: AC }} strokeWidth={0} />)}
                <span className="text-[10px] font-semibold ml-2 uppercase tracking-[0.2em]" style={{ color: G500 }}>5.0 Average</span>
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TestiCard i={0} dark
              q='"Houston Enterprise delivered our River Oaks estate three weeks early and under budget. The craftsmanship is extraordinary — not a single punch-list item at handover."'
              name="James Whitfield" title="Founding Partner, Whitfield Capital · River Oaks Estate" />
            <TestiCard i={1}
              q={`"As a developer, I've worked with the top contractors in Houston. Houston Enterprise's team operates at a completely different level. The Galleria project came in on time, exactly to spec."`}
              name="Diane Okonkwo" title="CEO, Meridian Properties Group · Galleria Commerce Center" />
            <TestiCard i={2} dark
              q='"When you invest $8M in a custom home, you need a builder who treats it like their own. Their team was at our site every day and communication was impeccable from day one."'
              name="Robert & Sarah Castellan" title="Homeowners · Memorial Luxury Estate" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CONTACT STRIP — real data, warm bg
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: W, borderTop: `1px solid ${G200}` }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center">
            <Reveal>
              <div>
                <Eyebrow>Get in Touch</Eyebrow>
                <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(24px,3.2vw,42px)', color: B, lineHeight: 1.08, marginBottom: 20 }}>
                  Ready to discuss your project?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: Phone,  label: 'Call Us',   val: '(281) 915-9595',     href: 'tel:+12819159595' },
                    { icon: Mail,   label: 'Email Us',  val: 'Info@Houinc.com',    href: 'mailto:info@houinc.com' },
                    { icon: MapPin, label: 'Visit Us',  val: '2100 W Loop South\nSuite #1115, Houston TX', href: '#' },
                  ].map(({ icon: Icon, label, val, href }) => (
                    <a key={label} href={href}
                      className="flex items-start gap-4 p-5 transition-all group"
                      style={{ backgroundColor: CR, border: `1px solid ${G200}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.backgroundColor = W; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.backgroundColor = CR; }}>
                      <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: 'rgba(157,126,63,0.09)', border: `1px solid rgba(157,126,63,0.2)` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.34em] font-bold mb-1" style={{ color: AC }}>{label}</div>
                        <div className="text-[12px] font-semibold whitespace-pre-line" style={{ color: B }}>{val}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.12} direction="right">
              <div className="flex flex-col gap-3">
                <FillBtn to="/start-project" variant="dark" size="lg">
                  Start Your Project <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                </FillBtn>
                <FillBtn to="/about" variant="outline-dark" size="md">
                  Schedule a Free Consultation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                </FillBtn>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PORTAL BAND — gold
      ══════════════════════════════════════════════ */}
      <section style={{ backgroundColor: AC }}>
        <div className="max-w-7xl mx-auto px-8 md:px-14 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <div className="text-[8px] uppercase tracking-[0.46em] font-semibold mb-4"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>Client Portal</div>
                <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px,4vw,46px)', color: W, lineHeight: 1.1 }}>
                  Your project. Real time.<br />Complete transparency.
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <p className="text-[13px] leading-relaxed font-light mb-6"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Track milestones, documents, and meeting requests in real time. Communicate directly with your project lead — everything in one secure, elegant place.
                </p>
                <div className="flex flex-wrap gap-3">
                  <FillBtn to="/portal" variant="white">
                    Access Portal <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </FillBtn>
                  <FillBtn to="/contact" variant="outline-white">
                    Free Consultation <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </FillBtn>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>


    </PublicLayout>
  );
}
