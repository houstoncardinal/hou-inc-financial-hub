import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone, Mail, Clock, Loader2, CheckCircle2, ShieldCheck, Award, HardHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import Reveal from '@/components/motion/Reveal';
import MagneticButton from '@/components/motion/MagneticButton';
import { supabase } from '@/integrations/supabase/client';

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

/* ── Form field ───────────────────────────────────────────────────── */
function Field({
  label, id, type = 'text', value, error, onChange, onFocus, onBlur, focused, placeholder,
}: {
  label: string; id: string; type?: string; value: string; error?: string;
  onChange: (v: string) => void; onFocus: () => void; onBlur: () => void;
  focused: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[8px] uppercase tracking-[0.32em] font-semibold mb-2.5" style={{ color: error ? '#C0392B' : G500 }}>
        {label}
      </label>
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            id={id}
            rows={5}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
              width: '100%', backgroundColor: OW, border: `1px solid ${error ? '#C0392B' : focused ? G700 : LB}`,
              borderRadius: 0, padding: '0.9rem 1rem', fontSize: 12, fontFamily: 'inherit', color: B,
              outline: 'none', resize: 'none', transition: 'border-color 0.2s',
            }}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            style={{
              width: '100%', backgroundColor: OW, border: `1px solid ${error ? '#C0392B' : focused ? G700 : LB}`,
              borderRadius: 0, padding: '0.9rem 1rem', fontSize: 12, fontFamily: 'inherit', color: B,
              outline: 'none', transition: 'border-color 0.2s',
            }}
          />
        )}
        {/* Focus underline */}
        <motion.div className="absolute bottom-0 left-0 right-0 h-px origin-left" style={{ backgroundColor: B }}
          animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.3 }} />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1.5 text-[9px]" style={{ color: '#C0392B' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
type FormFields = { name: string; email: string; phone: string; company: string; service: string; budget: string; message: string };
type FormErrors = Partial<Record<keyof FormFields, string>>;
type FocusMap   = Partial<Record<keyof FormFields, boolean>>;

export default function Contact() {
  const [form, setForm] = useState<FormFields>({ name: '', email: '', phone: '', company: '', service: '', budget: '', message: '' });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [focused, setFocused]   = useState<FocusMap>({});
  const [sending, setSending]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [serverErr, setServerErr] = useState('');

  const set = (k: keyof FormFields) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const foc = (k: keyof FormFields, v: boolean) => () => setFocused(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.email.trim())   e.email   = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.message.trim()) e.message = 'Please describe your project';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const encodeForm = (data: Record<string, string>) =>
    Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    setServerErr('');
    try {
      const { error } = await (supabase as any).from('contact_submissions').insert({
        name: form.name, email: form.email, phone: form.phone || null,
        company: form.company || null, service_type: form.service || null,
        budget_range: form.budget || null, message: form.message,
      });
      if (error) throw error;

      // Netlify dual-submit (best-effort, non-blocking)
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({
          'form-name': 'contact-form',
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          service: form.service,
          budget: form.budget,
          message: form.message,
        }),
      }).catch(() => {/* best-effort */});

      setSuccess(true);
    } catch {
      setServerErr('Something went wrong. Please call us directly at (281) 915-9595.');
    } finally {
      setSending(false);
    }
  };

  const SERVICES_LIST = ['Luxury Custom Homes','Commercial Office','Retail & Mixed-Use','High-Rise Residential','Industrial & Warehouse','Renovation & Repositioning','Multiple / Other'];
  const BUDGET_LIST   = ['Under $1M','$1M – $5M','$5M – $25M','$25M – $100M','$100M+','Not Sure Yet'];

  return (
    <PublicLayout>

      {/* Hero */}
      <section className="relative flex flex-col justify-end overflow-hidden"
        style={{ minHeight: '68vh', backgroundColor: B, ...GRID_D }}>
        <motion.div className="absolute top-0 inset-x-0 h-px origin-left" style={{ backgroundColor: AC }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }} />
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 78% 12%, rgba(157,126,63,0.09) 0%, transparent 50%)' }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-40 w-full">
          <motion.div className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
            <motion.div className="h-px" style={{ backgroundColor: AC }}
              initial={{ width: 0 }} animate={{ width: 40 }} transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[8px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Contact Us</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(52px, 8.5vw, 112px)', color: W, lineHeight: 0.9 }}>
            Let's Build<br /><span style={{ color: AC }}>Together.</span>
          </motion.h1>
        </div>
      </section>

      {/* Why contact us strip */}
      <section style={{ backgroundColor: '#0D0D0D', borderTop: DB, borderBottom: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderLeft: DB }}>
            {[
              { Icon: ShieldCheck, title: 'Licensed & Fully Insured',   body: 'Every HOU INC project carries complete commercial and residential coverage.' },
              { Icon: Award,       title: 'BBB A+ · Zero Complaints',   body: '20+ years accredited with zero unresolved client complaints on record.' },
              { Icon: HardHat,     title: 'Dedicated Project Manager',   body: 'Every client receives a single dedicated PM from day one through delivery.' },
              { Icon: CheckCircle2,title: '48-Hour Response Guarantee', body: 'We respond to every serious inquiry within two business days. Always.' },
            ].map((w, i) => (
              <div key={w.title} className="flex flex-col gap-2.5 px-7 py-6" style={{ borderRight: DB }}>
                <w.Icon className="w-4 h-4 shrink-0" style={{ color: AC, opacity: 0.7 }} strokeWidth={1.5} />
                <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.5)' }}>{w.title}</div>
                <p className="text-[9px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.22)' }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-24 md:py-36" style={{ backgroundColor: OW }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-5 gap-0">

            {/* Info panel */}
            <Reveal direction="left" x={36} className="lg:col-span-2">
              <div className="relative h-full p-10 md:p-12 flex flex-col gap-10" style={{ backgroundColor: B, ...GRID_D }}>
                <Brackets c="rgba(157,126,63,0.18)" sz={18} />

                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px w-8" style={{ backgroundColor: AC }} />
                    <div className="text-[7px] uppercase tracking-[0.44em] font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>Contact Information</div>
                  </div>
                  <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 34px)', color: W, lineHeight: 1.1 }}>
                    Ready to start<br />your project?
                  </div>
                </div>

                <div className="space-y-7">
                  {[
                    { Icon: MapPin,  label: 'Office',    val: '2100 W Loop South, Suite #1115\nHouston, TX 77027', href: null },
                    { Icon: Phone,   label: 'Phone',     val: '(281) 915-9595',      href: 'tel:+12819159595' },
                    { Icon: Mail,    label: 'Email',     val: 'info@houinc.com',     href: 'mailto:info@houinc.com' },
                    { Icon: Clock,   label: 'Hours',     val: 'Mon–Fri 8AM–6PM\nSat 9AM–1PM', href: null },
                  ].map(({ Icon, label, val, href }) => (
                    <div key={label} className="flex gap-4">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.18)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-[7px] uppercase tracking-[0.28em] mb-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{label}</div>
                        {href ? (
                          <a href={href} className="text-[11px] font-light leading-relaxed whitespace-pre-line transition-colors"
                            style={{ color: 'rgba(255,255,255,0.45)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = AC)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                            {val}
                          </a>
                        ) : (
                          <div className="text-[11px] font-light leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.45)' }}>{val}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map embed */}
                <div className="flex-1 overflow-hidden relative min-h-[160px]" style={{ filter: 'grayscale(1) contrast(0.85)', opacity: 0.55 }}>
                  <iframe
                    src="https://maps.google.com/maps?q=2100+W+Loop+South+Houston+TX+77027&output=embed"
                    title="HOU INC Office Location"
                    width="100%" height="100%"
                    style={{ border: 'none', position: 'absolute', inset: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                {/* Quick links */}
                <div className="flex gap-3">
                  <a href="tel:+12819159595"
                    className="relative overflow-hidden group flex items-center gap-1.5 text-[8px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 flex-1 justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: DB }}>
                    <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                      initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                    <Phone className="relative z-10 w-3 h-3" strokeWidth={1.5} />
                    <span className="relative z-10">Call Us</span>
                  </a>
                  <a href="mailto:info@houinc.com"
                    className="relative overflow-hidden group flex items-center gap-1.5 text-[8px] uppercase tracking-[0.22em] font-bold px-4 py-2.5 flex-1 justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: DB }}>
                    <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                      initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                    <Mail className="relative z-10 w-3 h-3" strokeWidth={1.5} />
                    <span className="relative z-10">Email Us</span>
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal direction="right" x={36} className="lg:col-span-3">
              <div className="relative p-10 md:p-14" style={{ backgroundColor: W, border: `1px solid ${LB}` }}>
                <Brackets c="rgba(0,0,0,0.06)" sz={16} />

                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center text-center py-24 gap-8"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                        className="w-16 h-16 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: `1px solid ${AC}` }}>
                        <CheckCircle2 className="w-8 h-8" style={{ color: AC }} strokeWidth={1.5} />
                      </motion.div>
                      <div>
                        <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '2rem', color: B, marginBottom: '0.75rem' }}>
                          Message Received
                        </div>
                        <p className="text-[12px] leading-relaxed font-light max-w-sm" style={{ color: G500 }}>
                          Thank you for reaching out to HOU INC. A member of our team will contact you within two business days to discuss your project.
                        </p>
                      </div>
                      <a href="tel:+12819159595" className="text-[9px] uppercase tracking-[0.28em] font-bold flex items-center gap-1.5" style={{ color: AC }}>
                        <Phone className="w-3 h-3" strokeWidth={2} />
                        (281) 915-9595 · Reach Us Directly
                      </a>
                    </motion.div>
                  ) : (
                    <motion.form key="form" onSubmit={handleSubmit} noValidate className="space-y-7">
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-px w-8" style={{ backgroundColor: AC }} />
                          <div className="text-[7px] uppercase tracking-[0.44em] font-semibold" style={{ color: G500 }}>Project Inquiry</div>
                        </div>
                        <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 34px)', color: B, lineHeight: 1.1 }}>
                          Tell Us About Your Project
                        </h2>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Field label="Full Name *" id="name" value={form.name} error={errors.name}
                          onChange={set('name')} onFocus={foc('name', true)} onBlur={foc('name', false)}
                          focused={!!focused.name} placeholder="Your full name" />
                        <Field label="Email Address *" id="email" type="email" value={form.email} error={errors.email}
                          onChange={set('email')} onFocus={foc('email', true)} onBlur={foc('email', false)}
                          focused={!!focused.email} placeholder="your@email.com" />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <Field label="Phone Number" id="phone" type="tel" value={form.phone}
                          onChange={set('phone')} onFocus={foc('phone', true)} onBlur={foc('phone', false)}
                          focused={!!focused.phone} placeholder="(713) 000-0000" />
                        <Field label="Company / Organization" id="company" value={form.company}
                          onChange={set('company')} onFocus={foc('company', true)} onBlur={foc('company', false)}
                          focused={!!focused.company} placeholder="Your company name" />
                      </div>

                      {/* Service select */}
                      <div>
                        <label htmlFor="service" className="block text-[8px] uppercase tracking-[0.32em] font-semibold mb-2.5" style={{ color: G500 }}>
                          Service Type
                        </label>
                        <select id="service" value={form.service} onChange={e => set('service')(e.target.value)}
                          style={{ width: '100%', backgroundColor: OW, border: `1px solid ${LB}`, borderRadius: 0, padding: '0.9rem 1rem', fontSize: 12, fontFamily: 'inherit', color: form.service ? B : G500, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                          <option value="">Select a service...</option>
                          {SERVICES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Budget select */}
                      <div>
                        <label htmlFor="budget" className="block text-[8px] uppercase tracking-[0.32em] font-semibold mb-2.5" style={{ color: G500 }}>
                          Estimated Budget
                        </label>
                        <select id="budget" value={form.budget} onChange={e => set('budget')(e.target.value)}
                          style={{ width: '100%', backgroundColor: OW, border: `1px solid ${LB}`, borderRadius: 0, padding: '0.9rem 1rem', fontSize: 12, fontFamily: 'inherit', color: form.budget ? B : G500, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                          <option value="">Select a range...</option>
                          {BUDGET_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      <Field label="Project Description *" id="message" type="textarea" value={form.message} error={errors.message}
                        onChange={set('message')} onFocus={foc('message', true)} onBlur={foc('message', false)}
                        focused={!!focused.message} placeholder="Describe your project, location, timeline, and any specific requirements..." />

                      {serverErr && (
                        <p className="text-[10px]" style={{ color: '#C0392B' }}>{serverErr}</p>
                      )}

                      <div className="pt-2">
                        <MagneticButton as="div">
                          <button
                            type="submit"
                            disabled={sending}
                            className="relative overflow-hidden group flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] font-black px-10 py-4 w-full md:w-auto justify-center"
                            style={{ backgroundColor: B, color: W, border: 'none', cursor: sending ? 'wait' : 'pointer' }}>
                            <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                              initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                            {sending ? (
                              <><Loader2 className="relative z-10 w-3.5 h-3.5 animate-spin" strokeWidth={2} /><span className="relative z-10">Sending...</span></>
                            ) : (
                              <><span className="relative z-10">Send Inquiry</span><ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} /></>
                            )}
                          </button>
                        </MagneticButton>
                        <p className="mt-4 text-[8px] leading-relaxed" style={{ color: G500 }}>
                          By submitting this form you agree to our privacy policy. All project inquiries are kept strictly confidential.
                        </p>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Secondary locations / info strip */}
      <section style={{ backgroundColor: B, borderTop: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: DB }}>
            {[
              { title: 'Houston HQ',       addr: '2100 W Loop South, Suite 1115\nHouston, TX 77027', phone: '(281) 915-9595' },
              { title: 'North Houston',    addr: 'The Woodlands, TX\nProject Management Office', phone: '(281) 915-9595' },
              { title: 'Service Area',     addr: 'Greater Houston Metro\nKaty · Pearland · Sugar Land · The Woodlands', phone: null },
            ].map((loc, i) => (
              <div key={loc.title} className="p-8 md:p-10 flex flex-col gap-3 relative" style={{ borderRight: i < 2 ? DB : 'none' }}>
                <Brackets c="rgba(255,255,255,0.06)" sz={12} />
                <div className="text-[7px] uppercase tracking-[0.3em] font-semibold" style={{ color: AC }}>{loc.title}</div>
                <div className="text-[10px] font-light leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.32)' }}>{loc.addr}</div>
                {loc.phone && (
                  <a href="tel:+12819159595" className="text-[9px] font-mono mt-auto transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = AC)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                    {loc.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
