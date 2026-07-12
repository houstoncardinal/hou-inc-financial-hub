import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, ChevronRight, ChevronDown, CheckCircle2,
  Phone, ArrowLeft, Shield, Award, Users,
} from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import { getServiceBySlug, SERVICES_DATA, type ServiceData } from '@/data/servicesData';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const CR   = '#F5F2EC';
const G200 = '#E2E2E2';
const G400 = '#B5ADA4';
const G500 = '#8A8480';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const SF   = "'Cormorant Garamond', Georgia, serif";

const GRID: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)',
    'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
  ].join(','),
  backgroundSize: '80px 80px',
};

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px)',
  backgroundSize: '24px 24px',
};

/* ── FAQ accordion item ──────────────────────────────────────────────── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={index * 0.06}>
      <div style={{ borderBottom: `1px solid ${G200}` }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between py-5 text-left group"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span
            className="text-[15px] font-semibold leading-snug pr-6 transition-colors"
            style={{ color: open ? AC : B, fontFamily: SF, fontStyle: 'italic', fontWeight: 400, fontSize: 18 }}
          >
            {q}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown
              style={{ width: 18, height: 18, color: open ? AC : G400, flexShrink: 0 }}
              strokeWidth={1.5}
            />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <p className="pb-6 text-[14px] leading-relaxed font-light" style={{ color: G500 }}>
                {a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

/* ── Process step ────────────────────────────────────────────────────── */
function ProcessStep({
  num, title, body, index,
}: {
  num: string; title: string; body: string; index: number;
}) {
  return (
    <Reveal delay={index * 0.08}>
      <div
        className="relative p-8"
        style={{ backgroundColor: W, border: `1px solid ${G200}` }}
      >
        <div
          className="text-[9px] uppercase tracking-[0.36em] font-black mb-4"
          style={{ color: AC }}
        >
          {num}
        </div>
        <div
          className="mb-3"
          style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: B, lineHeight: 1.1 }}
        >
          {title}
        </div>
        <p className="text-[13px] font-light leading-relaxed" style={{ color: G500 }}>
          {body}
        </p>
        {/* Gold corner accent */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, width: 32, height: 3,
            backgroundColor: AC,
          }}
        />
      </div>
    </Reveal>
  );
}

/* ── Related service card ────────────────────────────────────────────── */
function RelatedCard({ slug }: { slug: string }) {
  const s = getServiceBySlug(slug);
  if (!s) return null;
  return (
    <Link
      to={`/services/${s.slug}`}
      className="group block p-6 transition-all"
      style={{ backgroundColor: W, border: `1px solid ${G200}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; }}
    >
      <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G400 }}>
        {s.breadcrumb} · {s.category}
      </div>
      <div
        className="mb-3 transition-colors"
        style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 20, color: B, lineHeight: 1.1 }}
      >
        {s.title}
      </div>
      <div
        className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.24em] font-bold transition-colors"
        style={{ color: AC }}
      >
        Learn More <ArrowUpRight style={{ width: 12, height: 12 }} strokeWidth={2.5} />
      </div>
    </Link>
  );
}

/* ── Schema.org JSON-LD ─────────────────────────────────────────────── */
function JsonLd({ s }: { s: ServiceData }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': s.title,
    'description': s.metaDesc,
    'provider': {
      '@type': 'LocalBusiness',
      'name': 'Houston Enterprise Construction',
      'url': 'https://houinc.com',
      'telephone': '+12819159595',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': 'Houston',
        'addressRegion': 'TX',
        'addressCountry': 'US',
      },
      'areaServed': 'Greater Houston Metropolitan Area',
      'foundingDate': '1998',
    },
    'areaServed': 'Greater Houston, TX',
    'hasOfferCatalog': {
      '@type': 'OfferCatalog',
      'name': s.category,
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': s.faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const s = getServiceBySlug(slug ?? '');

  useEffect(() => {
    if (s) {
      document.title = s.metaTitle;
      const existing = document.querySelector('meta[name="description"]');
      if (existing) {
        existing.setAttribute('content', s.metaDesc);
      } else {
        const m = document.createElement('meta');
        m.name = 'description';
        m.content = s.metaDesc;
        document.head.appendChild(m);
      }
    }
  }, [s]);

  if (!s) return <Navigate to="/services" replace />;

  const trustIcons = [
    { Icon: Shield, label: 'Licensed TX General Contractor' },
    { Icon: Award,  label: 'AGC Member Since 1998' },
    { Icon: Users,  label: '500+ Projects Delivered' },
  ];

  return (
    <PublicLayout>
      <JsonLd s={s} />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '72vh', backgroundColor: B, ...GRID }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 18% 18%, rgba(157,126,63,0.10) 0%, transparent 55%)' }}
        />
        {/* Gold top line */}
        <motion.div
          className="absolute top-0 inset-x-0 h-px origin-left"
          style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-20 pt-40 w-full">
          {/* Breadcrumb */}
          <motion.div
            className="flex items-center gap-2 mb-10"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Link
              to="/services"
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.32em] font-bold transition-colors"
              style={{ color: 'rgba(255,255,255,0.28)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACL; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)'; }}
            >
              <ArrowLeft style={{ width: 11, height: 11 }} strokeWidth={2.5} />
              Services
            </Link>
            <ChevronRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.14)' }} strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-[0.28em] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {s.breadcrumb}
            </span>
            <ChevronRight style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.14)' }} strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-[0.28em] font-bold" style={{ color: ACL }}>
              {s.category}
            </span>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                  fontSize: 'clamp(38px, 5.5vw, 76px)', color: W, lineHeight: 0.96,
                  marginBottom: '1.25rem',
                }}
              >
                {s.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="text-[14px] font-light leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.38)', maxWidth: 480 }}
              >
                {s.tagline}
              </motion.p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-3 gap-0"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
            >
              {s.heroStats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="px-6 py-4"
                  style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                >
                  <div
                    style={{
                      fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                      fontSize: 'clamp(28px, 3.5vw, 44px)', color: W, lineHeight: 1,
                      marginBottom: '0.4rem',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[8px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-center md:justify-start">
            {trustIcons.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon style={{ width: 13, height: 13, color: AC }} strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 md:ml-auto">
              <Phone style={{ width: 12, height: 12, color: ACL }} strokeWidth={1.5} />
              <a
                href="tel:+12819159595"
                className="text-[9px] uppercase tracking-[0.22em] font-bold transition-colors"
                style={{ color: ACL }}
              >
                (281) 915-9595
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CR, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ width: 32, height: 1, backgroundColor: AC }} />
                  <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                    About This Service
                  </span>
                </div>
                <h2
                  className="mb-8"
                  style={{
                    fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                    fontSize: 'clamp(28px, 3.5vw, 44px)', color: B, lineHeight: 1.05,
                  }}
                >
                  Expertise You Can Build On
                </h2>
              </Reveal>
              {s.intro.map((para, i) => (
                <Reveal key={i} delay={0.1 + i * 0.1}>
                  <p
                    className={`text-[14px] font-light leading-loose ${i < s.intro.length - 1 ? 'mb-5' : ''}`}
                    style={{ color: '#4A4540' }}
                  >
                    {para}
                  </p>
                </Reveal>
              ))}
            </div>

            {/* Quick CTA sidebar */}
            <div className="lg:col-span-5">
              <Reveal direction="right" x={30} delay={0.2}>
                <div
                  style={{
                    backgroundColor: B, padding: '36px 32px',
                    position: 'sticky', top: 100,
                  }}
                >
                  <div
                    className="mb-4"
                    style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: W, lineHeight: 1.1 }}
                  >
                    {s.ctaHeadline}
                  </div>
                  <p className="text-[12px] font-light mb-6" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                    Talk to Jeff Ali's team directly — no obligation, no sales pressure.
                    Just an honest conversation about what your project needs.
                  </p>
                  <Link
                    to="/contact"
                    className="flex items-center justify-center gap-2 w-full py-4 text-[10px] uppercase tracking-[0.3em] font-black mb-3 transition-all"
                    style={{ backgroundColor: AC, color: W }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ACL; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = AC; }}
                  >
                    Get a Free Consultation <ArrowUpRight style={{ width: 14, height: 14 }} strokeWidth={2.5} />
                  </Link>
                  <a
                    href="tel:+12819159595"
                    className="flex items-center justify-center gap-2 w-full py-3.5 text-[10px] uppercase tracking-[0.24em] font-bold transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = W; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  >
                    <Phone style={{ width: 13, height: 13 }} strokeWidth={1.5} />
                    (281) 915-9595
                  </a>
                  <div className="mt-4 text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Serving Houston · The Woodlands · Katy · Sugar Land · Pearland
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── DELIVERABLES ──────────────────────────────────────────── */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 32, height: 1, backgroundColor: AC }} />
              <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                What We Deliver
              </span>
            </div>
            <h2
              className="mb-12"
              style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 3vw, 42px)', color: B, lineHeight: 1.05 }}
            >
              Scope of Service
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: `1px solid ${G200}` }}>
            {s.deliverables.map((d, i) => (
              <Reveal key={d.title} delay={i * 0.08}>
                <div
                  className="p-8 h-full"
                  style={{
                    borderRight: i < 3 ? `1px solid ${G200}` : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', top: 0, left: 0, width: 24, height: 2,
                      backgroundColor: AC,
                    }}
                  />
                  <div className="flex items-center gap-2 mb-4 mt-2">
                    <CheckCircle2 style={{ width: 14, height: 14, color: AC, flexShrink: 0 }} strokeWidth={1.5} />
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: B }}>
                      {d.title}
                    </div>
                  </div>
                  <p className="text-[13px] font-light leading-relaxed" style={{ color: G500 }}>
                    {d.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#F7F5F1', ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 32, height: 1, backgroundColor: AC }} />
              <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                How We Work
              </span>
            </div>
            <h2
              className="mb-12"
              style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 3vw, 42px)', color: B, lineHeight: 1.05 }}
            >
              Our Process
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {s.process.map((step, i) => (
              <ProcessStep key={step.num} {...step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ───────────────────────────────────────── */}
      <section style={{ backgroundColor: B, ...GRID }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 32, height: 1, backgroundColor: AC }} />
              <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                Why Houston Enterprise
              </span>
            </div>
            <h2
              className="mb-12"
              style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 3vw, 42px)', color: W, lineHeight: 1.05 }}
            >
              The Houston Enterprise Difference
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-0" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {s.differentiators.map((d, i) => (
              <Reveal key={d.title} delay={i * 0.1} direction={i === 0 ? 'left' : i === 2 ? 'right' : 'up'}>
                <div
                  className="p-10 h-full"
                  style={{
                    borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    position: 'relative',
                  }}
                >
                  <div
                    className="text-[9px] uppercase tracking-[0.36em] font-black mb-4"
                    style={{ color: AC }}
                  >
                    0{i + 1}
                  </div>
                  <div
                    className="mb-4"
                    style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: W, lineHeight: 1.1 }}
                  >
                    {d.title}
                  </div>
                  <p className="text-[13px] font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    {d.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: W }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-20">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 32, height: 1, backgroundColor: AC }} />
              <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                Common Questions
              </span>
            </div>
            <h2
              className="mb-10"
              style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(26px, 3vw, 42px)', color: B, lineHeight: 1.05 }}
            >
              Frequently Asked Questions
            </h2>
          </Reveal>
          <div>
            {s.faqs.map((faq, i) => (
              <FaqItem key={faq.q} {...faq} index={i} />
            ))}
          </div>
          <Reveal delay={0.3}>
            <div
              className="mt-10 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
              style={{ backgroundColor: CR, border: `1px solid ${G200}` }}
            >
              <div>
                <div className="text-[13px] font-semibold mb-1" style={{ color: B }}>
                  Have a question not answered here?
                </div>
                <div className="text-[12px] font-light" style={{ color: G500 }}>
                  Call or message Jeff Ali's team directly — we respond within 24 hours.
                </div>
              </div>
              <Link
                to="/contact"
                className="shrink-0 flex items-center gap-2 px-6 py-3 text-[9px] uppercase tracking-[0.26em] font-black transition-all"
                style={{ backgroundColor: B, color: W }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = AC; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = B; }}
              >
                Ask a Question <ArrowUpRight style={{ width: 13, height: 13 }} strokeWidth={2.5} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── RELATED SERVICES ──────────────────────────────────────── */}
      {s.relatedSlugs.length > 0 && (
        <section style={{ backgroundColor: CR, borderTop: `1px solid ${G200}` }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
            <Reveal>
              <div className="flex items-center gap-3 mb-10">
                <div style={{ width: 32, height: 1, backgroundColor: AC }} />
                <span className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>
                  Explore More Services
                </span>
              </div>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-4">
              {s.relatedSlugs.map(rs => <RelatedCard key={rs} slug={rs} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-32"
        style={{ backgroundColor: B, ...GRID }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 60%, rgba(157,126,63,0.13), transparent 50%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div style={{ height: 1, width: 40, backgroundColor: AC, opacity: 0.4 }} />
              <span className="text-[8px] uppercase tracking-[0.5em] font-bold" style={{ color: AC }}>
                Start Your Project
              </span>
              <div style={{ height: 1, width: 40, backgroundColor: AC, opacity: 0.4 }} />
            </div>
            <h2
              className="mb-6"
              style={{
                fontFamily: SF, fontStyle: 'italic', fontWeight: 300,
                fontSize: 'clamp(34px, 5.5vw, 72px)', color: W, lineHeight: 0.96,
              }}
            >
              {s.ctaHeadline}
            </h2>
            <p className="text-[13px] leading-relaxed mb-10 max-w-md mx-auto font-light" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Every landmark project in our portfolio started with a single conversation.
              Let's talk about what you're building.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/contact"
                className="flex items-center gap-2 px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-black transition-all"
                style={{ backgroundColor: W, color: B }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = AC; (e.currentTarget as HTMLElement).style.color = W; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = W; (e.currentTarget as HTMLElement).style.color = B; }}
              >
                Free Consultation <ArrowUpRight style={{ width: 14, height: 14 }} strokeWidth={2.5} />
              </Link>
              <Link
                to="/portfolio"
                className="flex items-center gap-2 px-10 py-4 text-[10px] uppercase tracking-[0.28em] font-bold transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = W; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
              >
                View Our Portfolio
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
