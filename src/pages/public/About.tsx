import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, ShieldCheck, Building2, Leaf, HardHat, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import AnimatedCounter from '@/components/motion/AnimatedCounter';
import TiltCard from '@/components/motion/TiltCard';
import MagneticButton from '@/components/motion/MagneticButton';

/* ── Tokens ───────────────────────────────────────────────────────── */
const B   = '#0A0A0A';
const W   = '#FFFFFF';
const OW  = '#F7F7F6';
const G50 = '#F2F2F0';
const G200 = '#E2E2E2';
const G500 = '#8A8A8A';
const G700 = '#3A3A3A';
const AC  = '#9D7E3F';
const SF  = "'Cormorant Garamond', Georgia, serif";
const LB  = '#E2E2E2';
const DB  = 'rgba(255,255,255,0.06)';

const GRID_D: React.CSSProperties = {
  backgroundImage: ['linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)', 'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)'].join(','),
  backgroundSize: '80px 80px',
};
const DOT_L: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.05) 1px,transparent 1px)',
  backgroundSize: '28px 28px',
};

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

/* ── Data ─────────────────────────────────────────────────────────── */
const VALUES = [
  { Icon: Award,       title: 'Excellence',       body: 'We set the standard others measure against. From premium materials to master craftsmanship, excellence is not an aspiration — it is our baseline on every project.' },
  { Icon: ShieldCheck, title: 'Integrity',         body: 'Every commitment made is a commitment kept. Transparent contracts, honest timelines, and zero hidden costs — on every project, every time.' },
  { Icon: Building2,   title: 'Innovation',        body: 'We continuously push the boundaries of what construction can achieve — leveraging advanced techniques, new materials, and smarter project delivery methods.' },
  { Icon: Users,       title: 'Customer Service',  body: "Our clients are partners. A dedicated project lead, daily communication, and a 24/7 portal ensure you're never left wondering about your project's status." },
];

const TIMELINE = [
  { y: '1998', title: 'Founded in Houston',          body: 'Houston Enterprise was founded with a singular vision: to deliver construction excellence that Houston had never seen. Our first project was a 4,200 SF River Oaks renovation.' },
  { y: '2003', title: 'First Commercial Project',    body: 'Completed our first commercial office building — an 18,000 SF medical office in the Texas Medical Center district. On time and $40K under budget.' },
  { y: '2008', title: 'Navigating the Downturn',     body: 'While competitors contracted, Houston Enterprise diversified into renovation and industrial — emerging from the 2008 recession stronger, with 12 active projects.' },
  { y: '2013', title: 'BBB Accreditation — A+',      body: 'Awarded Better Business Bureau A+ accreditation after 15 years of zero unresolved client complaints. A recognition we have never lost.' },
  { y: '2018', title: 'LEED Gold Certification',     body: 'Achieved LEED Gold on our first commercial tower project — beginning our sustainable construction practice that has since earned three additional LEED certifications.' },
  { y: '2022', title: '#1 Luxury Contractor — HBJ',  body: 'Named Houston\'s #1 Luxury Residential Contractor by the Houston Business Journal for three consecutive years. A reflection of client trust built over two decades.' },
  { y: '2024', title: '500+ Projects Delivered',     body: 'Houston Enterprise surpassed 500 completed projects in our 26th year — with over $2 billion in total constructed value across the Greater Houston Metropolitan Area.' },
];

const TEAM = [
  { initials: 'JA', name: 'Jeff Ali',      title: 'Co-Founder', bg: '#0A0A0A', color: W },
  { initials: 'DA', name: 'David Alvares', title: 'Co-Founder', bg: '#111111', color: W },
];

const AWARDS = [
  { year: '2022 · 2023 · 2024', org: 'Houston Business Journal', title: '#1 Luxury Contractor' },
  { year: 'A+ · 20+ Years',     org: 'Better Business Bureau',   title: 'Accredited Business' },
  { year: 'Active Member',       org: 'AGC of Houston',           title: 'Associated General Contractors' },
  { year: 'LEED Gold · 4 Bldgs',org: 'U.S. Green Bldg Council', title: 'Sustainable Construction' },
];

/* ── Team card ────────────────────────────────────────────────────── */
function TeamCard({ m }: { m: typeof TEAM[0] }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      className="relative p-8 md:p-10 flex flex-col items-start gap-5 cursor-default"
      style={{ border: `1px solid ${LB}`, backgroundColor: hov ? G50 : W }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      animate={{ backgroundColor: hov ? G50 : W }}
      transition={{ duration: 0.22 }}
    >
      <Brackets c={hov ? AC : 'rgba(0,0,0,0.06)'} sz={12} w={1} />
      <motion.div
        className="w-14 h-14 flex items-center justify-center text-lg font-bold relative overflow-hidden"
        style={{ backgroundColor: m.bg, color: m.color, fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.3rem', letterSpacing: '0.04em' }}
        animate={{ scale: hov ? 1.06 : 1, rotate: hov ? -2 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: AC }}
          animate={{ scaleY: hov ? 1 : 0, originY: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        />
        <span className="relative z-10">{m.initials}</span>
      </motion.div>
      <div>
        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.15rem', color: B, marginBottom: '0.25rem' }}>{m.name}</div>
        <div className="text-[8px] uppercase tracking-[0.24em] font-semibold" style={{ color: hov ? AC : G500 }}>{m.title}</div>
      </div>
      <AnimatePresence>
        {hov && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22 }}
            className="text-[9px] uppercase tracking-[0.2em]"
            style={{ color: 'rgba(0,0,0,0.3)' }}
          >
            25+ Years Experience
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function About() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '82vh', backgroundColor: B, ...GRID_D }}>
        <motion.div className="absolute top-0 inset-x-0 h-px origin-left" style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 12%, rgba(157,126,63,0.09) 0%, transparent 50%)' }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-44 w-full">
          <motion.div className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <motion.div className="h-px" style={{ backgroundColor: AC }}
              initial={{ width: 0 }} animate={{ width: 40 }} transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>About Houston Enterprise</span>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-12 items-end">
            <motion.div className="lg:col-span-7"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 9vw, 118px)', color: W, lineHeight: 0.9 }}>
                About /&nbsp;<br /><span style={{ color: AC }}>Houston Enterprise</span>
              </h1>
            </motion.div>
            <Reveal direction="right" x={36} className="lg:col-span-5 max-w-lg">
              <p className="text-[13px] leading-relaxed font-light mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Founded in Houston in 1998, Houston Enterprise is the city's premier construction firm — built on a 25-year foundation of excellence, integrity, and innovation. Our record speaks for itself.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[['25+', 'Years in Houston'], ['500+', 'Projects Delivered'], ['$2B+', 'Built Value'], ['98%', 'On-Time Delivery']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.7rem', color: W }}>{v}</div>
                    <div className="text-[7px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.25)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-36 md:py-48" style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-12 gap-12 md:gap-20 items-center">
            <Reveal direction="left" x={48} className="md:col-span-7">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-10" style={{ backgroundColor: AC }} />
                <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>Our Mission</div>
              </div>
              <blockquote style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 3.8vw, 50px)', color: B, lineHeight: 1.14, marginBottom: '2rem' }}>
                "To deliver construction excellence that elevates Houston's built environment, project by project, generation by generation."
              </blockquote>
              <div className="w-12 h-px mb-7" style={{ backgroundColor: G200 }} />
              <p className="text-[13px] leading-relaxed font-light mb-4" style={{ color: G500 }}>
                Houston Enterprise was founded on the belief that Houston deserved a construction firm that refused to compromise. Every project we take on — whether a $1M custom estate or a $200M commercial tower — receives the same unwavering commitment to quality, transparency, and schedule performance.
              </p>
              <p className="text-[13px] leading-relaxed font-light" style={{ color: G500 }}>
                Our mission is simple: build the structures that define Houston's next chapter, and build them right.
              </p>
            </Reveal>
            <Reveal direction="right" x={48} className="md:col-span-5">
              <div className="relative p-10 md:p-12" style={{ backgroundColor: B, ...GRID_D }}>
                <Brackets c="rgba(157,126,63,0.2)" sz={18} />
                <div className="text-[7px] uppercase tracking-[0.44em] font-semibold mb-8" style={{ color: 'rgba(255,255,255,0.2)' }}>By the Numbers</div>
                <div className="space-y-6">
                  {[
                    { v: 500, s: '+', l: 'Projects Completed' },
                    { v: 2,   s: 'B+', p: '$', l: 'Total Constructed Value' },
                    { v: 25,  s: '+', l: 'Years Building Houston' },
                    { v: 150, s: '+', l: 'In-House Craftsmen' },
                  ].map((s, i) => (
                    <div key={s.l} className="flex items-center justify-between py-4" style={{ borderBottom: i < 3 ? DB : 'none' }}>
                      <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.6rem', color: W, lineHeight: 1 }}>
                        <AnimatedCounter value={s.v} prefix={s.p} suffix={s.s} />
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-right max-w-28" style={{ color: 'rgba(255,255,255,0.28)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Foundation story */}
      <section className="py-36 md:py-48" style={{ backgroundColor: B, ...GRID_D }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-20">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: 'rgba(255,255,255,0.26)' }}>The Beginning</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: W, lineHeight: 1.0 }}>Our Foundation Story</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-0" style={{ border: DB }}>
            <Reveal direction="left" x={40}
              className="p-10 md:p-14 flex flex-col gap-6"
              style={{ borderRight: DB }}>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '4.5rem', color: AC, lineHeight: 1, opacity: 0.3 }}>1998</div>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 38px)', color: W, lineHeight: 1.1 }}>
                A Vision for Something Extraordinary
              </div>
              <p className="text-[12px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Houston Enterprise was founded in 1998 by Jeff Ali and David Alvares — two Houston construction veterans who refused to accept the industry's tolerance for compromise. Jeff brought 25 years of hands-on building expertise; David brought deep experience in commercial project management and client relations.
              </p>
              <p className="text-[12px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Together they launched with a 4-person team and a single River Oaks renovation project. The work was meticulous. The client referred three neighbors. Within 18 months, the firm had its first commercial contract.
              </p>
            </Reveal>
            <Reveal direction="right" x={40}
              className="p-10 md:p-14 flex flex-col gap-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '4.5rem', color: AC, lineHeight: 1, opacity: 0.3 }}>Today</div>
              <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 38px)', color: W, lineHeight: 1.1 }}>
                The Standard for Houston Construction
              </div>
              <p className="text-[12px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.32)' }}>
                Today, Houston Enterprise employs 150+ craftsmen, engineers, and project managers across residential, commercial, retail, industrial, and renovation divisions. We have completed over 500 projects totaling more than $2 billion in constructed value across the Greater Houston Metropolitan Area.
              </p>
              <p className="text-[12px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                The firm remains privately held and founder-led. Jeff and David are in the office every day. The same standard that built our first project in 1998 defines every project we deliver today.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-36 md:py-48" style={{ backgroundColor: G50 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>Our Core Beliefs</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: B, lineHeight: 1.0 }}>Values</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: `1px solid ${LB}` }}>
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.1} y={28}>
                <TiltCard max={5}
                  className="bg-white h-full p-8 md:p-10 flex flex-col gap-5 relative"
                  style={{ borderRight: i < 3 ? `1px solid ${LB}` : 'none' }}>
                  <Brackets c="rgba(0,0,0,0.05)" sz={12} />
                  <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.18)' }}>
                    <v.Icon className="w-4 h-4" style={{ color: AC }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold mb-2 tracking-tight" style={{ color: B }}>{v.title}</div>
                    <p className="text-[10px] leading-relaxed font-light" style={{ color: G500 }}>{v.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-36 md:py-48" style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-20">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>25 Years of Excellence</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: B, lineHeight: 1.0 }}>
              Milestones
            </h2>
          </Reveal>

          <div className="relative">
            {/* Animated vertical line */}
            <motion.div
              className="absolute left-6 md:left-10 top-0 bottom-0 w-px origin-top"
              style={{ backgroundColor: G200 }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            />

            <div className="space-y-0">
              {TIMELINE.map((t, i) => (
                <Reveal key={t.y} delay={i * 0.07} y={24}>
                  <div className="relative flex gap-10 md:gap-16 py-8 md:py-10 pl-16 md:pl-24 group cursor-default">
                    {/* Dot */}
                    <motion.div
                      className="absolute w-3 h-3 -translate-y-1/2 top-1/2"
                      style={{ left: 'calc(1.5rem - 6px)', backgroundColor: W, border: `1.5px solid ${G200}` }}
                      whileHover={{ scale: 1.4, borderColor: AC, backgroundColor: AC }}
                      transition={{ duration: 0.22 }}
                    />

                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.1rem', color: AC, minWidth: 48, paddingTop: 2 }}>{t.y}</div>
                    <div className="flex-1 pb-8" style={{ borderBottom: i < TIMELINE.length - 1 ? `1px solid ${LB}` : 'none' }}>
                      <div className="text-[13px] font-bold mb-2 tracking-tight" style={{ color: B }}>{t.title}</div>
                      <p className="text-[11px] leading-relaxed font-light" style={{ color: G500 }}>{t.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-36 md:py-48" style={{ backgroundColor: G50, ...DOT_L }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>The Team</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(34px, 5.5vw, 72px)', color: B, lineHeight: 1.0 }}>
              Leadership
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0" style={{ border: `1px solid ${LB}` }}>
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.09} y={28}
                style={{ borderRight: (i + 1) % 3 !== 0 ? `1px solid ${LB}` : 'none', borderBottom: i < 3 ? `1px solid ${LB}` : 'none' }}>
                <TeamCard m={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-24 md:py-32" style={{ backgroundColor: W, borderTop: `1px solid ${LB}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10" style={{ backgroundColor: AC }} />
              <div className="text-[8px] uppercase tracking-[0.46em] font-semibold" style={{ color: G500 }}>Recognition</div>
            </div>
            <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4.5vw, 56px)', color: B, lineHeight: 1.0 }}>
              Awards & Accreditations
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: `1px solid ${LB}` }}>
            {AWARDS.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.09}
                style={{ borderRight: i < 3 ? `1px solid ${LB}` : 'none' }}>
                <motion.div
                  className="p-8 md:p-10 h-full flex flex-col gap-3 relative"
                  whileHover={{ backgroundColor: G50 }}
                  transition={{ duration: 0.22 }}
                >
                  <Brackets c="rgba(0,0,0,0.05)" sz={12} />
                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold" style={{ color: AC }}>{a.year}</div>
                  <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.15rem', color: B, lineHeight: 1.1 }}>{a.title}</div>
                  <div className="text-[8px] uppercase tracking-[0.18em]" style={{ color: G500 }}>{a.org}</div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators bar */}
      <section style={{ backgroundColor: B, borderTop: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0" style={{ borderLeft: DB }}>
            {[
              { Icon: ShieldCheck, l: 'Licensed & Insured' },
              { Icon: Award,       l: 'BBB A+ Accredited' },
              { Icon: Clock,       l: '98% On-Time Delivery' },
              { Icon: Leaf,        l: 'LEED Gold Certified' },
              { Icon: HardHat,     l: '150+ Expert Craftsmen' },
              { Icon: Users,       l: 'Dedicated Project Lead' },
            ].map(({ Icon, l }, i) => (
              <motion.div key={l}
                className="flex flex-col items-center gap-2.5 px-5 py-7 cursor-default"
                style={{ borderRight: DB }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                transition={{ duration: 0.22 }}>
                <Icon className="w-4 h-4" style={{ color: AC, opacity: 0.7 }} strokeWidth={1.5} />
                <div className="text-[7px] uppercase tracking-[0.2em] text-center" style={{ color: 'rgba(255,255,255,0.22)' }}>{l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-44 md:py-56 relative overflow-hidden" style={{ backgroundColor: B, ...GRID_D }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 58%, rgba(157,126,63,0.12), transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
              <div className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: AC }}>Work With Us</div>
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: AC, opacity: 0.3 }} />
            </div>
            <h2 className="mb-8" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(40px, 7vw, 96px)', color: W, lineHeight: 0.96 }}>
              Let's Build<br /><span style={{ color: AC }}>Something Great.</span>
            </h2>
            <p className="text-[13px] leading-relaxed mb-14 max-w-md mx-auto font-light" style={{ color: 'rgba(255,255,255,0.27)' }}>
              Contact us today to schedule a complimentary consultation with our team. We're ready to bring your vision to life.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <MagneticButton as="div">
                <Link to="/contact"
                  className="relative overflow-hidden group flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4"
                  style={{ backgroundColor: W, color: B }}>
                  <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                    initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                  <span className="relative z-10 group-hover:text-white transition-colors duration-150">Free Consultation</span>
                  <ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </MagneticButton>
              <Link to="/portfolio"
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.42)'; e.currentTarget.style.color = W; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                View Our Work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}
