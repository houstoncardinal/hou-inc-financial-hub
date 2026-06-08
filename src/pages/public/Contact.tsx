import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import MagneticButton from '@/components/motion/MagneticButton';

const CREAM  = '#FAF7F2';
const ALT    = '#F3EDE3';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const DOT: React.CSSProperties = {
  backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.12) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

const PROJECT_TYPES = [
  'Luxury Custom Home', 'Commercial Development', 'Retail / Shopping Center',
  'Mixed-Use Development', 'High-Rise Residential', 'Industrial / Warehouse',
  'Renovation / Repositioning', 'Other',
];

const BUDGETS = ['Under $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+', 'Not yet determined'];

const CONTACT_INFO = [
  { Icon: MapPin, label: 'Office',         lines: ['1200 Post Oak Blvd, Suite 300', 'Houston, TX 77056'] },
  { Icon: Phone,  label: 'Phone',          lines: ['(713) 555-0190', 'Mon–Fri · 8am–6pm CST'] },
  { Icon: Mail,   label: 'Email',          lines: ['info@houinc.com', 'projects@houinc.com'] },
  { Icon: Clock,  label: 'Response Time',  lines: ['Within 1 business day', 'For urgent inquiries, call directly'] },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '',
    projectType: '', budget: '', message: '',
  });
  const [sent, setSent] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const inputBase: React.CSSProperties = {
    width: '100%', height: '44px', padding: '0 1rem',
    fontSize: '13px', backgroundColor: '#FFFFFF',
    border: `1px solid ${BORDER}`, color: DARK,
    outline: 'none', transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '8px', textTransform: 'uppercase',
    letterSpacing: '0.22em', fontWeight: 700, marginBottom: '8px',
    color: 'rgba(28,24,20,0.38)',
  };

  return (
    <PublicLayout>

      {/* Hero */}
      <section className="pt-40 pb-20" style={{ backgroundColor: CREAM, ...DOT }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal direction="left" x={30} className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: GOLD }} />
            <div className="text-[9px] uppercase tracking-[0.38em] font-semibold" style={{ color: GOLD }}>Let's Talk</div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <Reveal>
              <h1 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 8vw, 110px)', color: DARK, lineHeight: 0.92, letterSpacing: '-0.01em' }}>
                Start Your<br />Project
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-sm leading-relaxed font-light" style={{ color: MUTED }}>
                Tell us what you're building. Our team reviews every inquiry personally and responds within one business day. No automated responses, no outsourced intake — just a direct conversation with the people who will build your project.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="py-16 md:py-24" style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-3 gap-0" style={{ border: `1px solid ${BORDER}` }}>

            {/* Info panel */}
            <div className="p-8 md:p-10" style={{ backgroundColor: ALT, borderRight: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase tracking-[0.34em] font-bold mb-8" style={{ color: GOLD }}>Contact Information</div>
              <div className="space-y-8">
                {CONTACT_INFO.map(({ Icon, label, lines }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />
                      <div className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: 'rgba(157,126,63,0.7)' }}>{label}</div>
                    </div>
                    {lines.map(l => (
                      <div key={l} className="text-[12px] leading-relaxed font-light" style={{ color: MUTED }}>{l}</div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase tracking-[0.34em] font-bold mb-4" style={{ color: GOLD }}>Our Location</div>
                <div
                  className="h-40 flex items-center justify-center"
                  style={{ backgroundColor: CREAM, border: `1px solid ${BORDER}`, ...DOT }}
                >
                  <div className="text-center">
                    <MapPin className="w-5 h-5 mx-auto mb-2" style={{ color: GOLD, opacity: 0.55 }} strokeWidth={1.5} />
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(28,24,20,0.35)' }}>Post Oak · Houston, TX</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2 p-8 md:p-10">
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div
                    className="w-14 h-14 flex items-center justify-center mb-6"
                    style={{ backgroundColor: 'rgba(157,126,63,0.08)', border: `1px solid rgba(157,126,63,0.3)` }}
                  >
                    <ArrowUpRight className="w-6 h-6" style={{ color: GOLD }} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: '1.75rem', color: DARK, marginBottom: '0.75rem' }}>
                    Message Received
                  </h3>
                  <p className="text-sm max-w-sm font-light" style={{ color: MUTED }}>
                    Thank you. A member of the HOU INC team will review your inquiry and be in touch within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-[9px] uppercase tracking-[0.34em] font-bold mb-8" style={{ color: GOLD }}>Project Inquiry</div>

                  {/* Name + Company */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={set('name')}
                        style={inputBase}
                        onFocus={e => (e.target.style.borderColor = GOLD)}
                        onBlur={e  => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Company</label>
                      <input
                        value={form.company}
                        onChange={set('company')}
                        style={inputBase}
                        onFocus={e => (e.target.style.borderColor = GOLD)}
                        onBlur={e  => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        style={inputBase}
                        onFocus={e => (e.target.style.borderColor = GOLD)}
                        onBlur={e  => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        style={inputBase}
                        onFocus={e => (e.target.style.borderColor = GOLD)}
                        onBlur={e  => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                  </div>

                  {/* Project Type + Budget */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Project Type *</label>
                      <select
                        required
                        value={form.projectType}
                        onChange={set('projectType')}
                        style={{ ...inputBase, cursor: 'pointer' }}
                      >
                        <option value="" disabled>Select type…</option>
                        {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Budget Range</label>
                      <select
                        value={form.budget}
                        onChange={set('budget')}
                        style={{ ...inputBase, cursor: 'pointer' }}
                      >
                        <option value="" disabled>Select range…</option>
                        {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Tell Us About Your Project *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Location, timeline, scope, any specific requirements…"
                      style={{
                        ...inputBase,
                        height: 'auto',
                        padding: '0.75rem 1rem',
                        resize: 'none',
                      }}
                      onFocus={e => (e.target.style.borderColor = GOLD)}
                      onBlur={e  => (e.target.style.borderColor = BORDER)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] font-black px-10 py-4 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: GOLD, color: DARK }}
                  >
                    Send Inquiry <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>

                  <p className="text-[9px] uppercase tracking-[0.16em] font-light" style={{ color: 'rgba(28,24,20,0.28)' }}>
                    All inquiries are reviewed by a senior team member. We respond within one business day.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
