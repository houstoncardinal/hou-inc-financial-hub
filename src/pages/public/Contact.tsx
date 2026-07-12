import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone, Mail, Clock, Loader2, CheckCircle2, ShieldCheck, Award, HardHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import MagneticButton from '@/components/motion/MagneticButton';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ───────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const OW   = '#F7F7F6';
const G500 = '#8A8A8A';
const G700 = '#3A3A3A';
const AC   = '#9D7E3F';
const SF   = "'Cormorant Garamond', Georgia, serif";
const LB   = '#E2E2E2';
const DB   = 'rgba(255,255,255,0.06)';

const GRID_D: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)',
    'linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
  ].join(','),
  backgroundSize: '72px 72px',
};

/* ── Phone formatter ──────────────────────────────────────────────── */
function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/* ── Field component ──────────────────────────────────────────────── */
function Field({
  label, id, type = 'text', value, error, onChange, onFocus, onBlur, focused, placeholder,
}: {
  label: string; id: string; type?: string; value: string; error?: string;
  onChange: (v: string) => void; onFocus: () => void; onBlur: () => void;
  focused: boolean; placeholder?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(type === 'tel' ? fmtPhone(e.target.value) : e.target.value);

  const baseStyle: React.CSSProperties = {
    width: '100%', backgroundColor: OW,
    border: `1px solid ${error ? '#C0392B' : focused ? G700 : LB}`,
    borderRadius: 0, fontSize: 12, fontFamily: 'inherit', color: B,
    outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <div>
      <label htmlFor={id} className="block text-[8px] uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: error ? '#C0392B' : G500 }}>
        {label}
      </label>
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            id={id} rows={5} value={value} placeholder={placeholder}
            onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
            style={{ ...baseStyle, padding: '0.75rem 0.9rem', resize: 'none' }}
          />
        ) : (
          <input
            id={id} type={type} value={value} placeholder={placeholder}
            onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
            autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined}
            inputMode={type === 'tel' ? 'tel' : undefined}
            style={{ ...baseStyle, padding: '0.72rem 0.9rem' }}
          />
        )}
        <motion.div className="absolute bottom-0 left-0 right-0 h-px origin-left" style={{ backgroundColor: B }}
          animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.3 }} />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 text-[9px]" style={{ color: '#C0392B' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Select field ─────────────────────────────────────────────────── */
function SelectField({ label, id, value, onChange, options, placeholder }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[8px] uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: G500 }}>
        {label}
      </label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', backgroundColor: OW, border: `1px solid ${LB}`, borderRadius: 0,
          padding: '0.72rem 0.9rem', fontSize: 12, fontFamily: 'inherit',
          color: value ? B : G500, outline: 'none', appearance: 'none', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => (e.target.style.borderColor = G700)}
        onBlur={e => (e.target.style.borderColor = LB)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
type FormFields = { name: string; email: string; phone: string; company: string; service: string; budget: string; message: string };
type FormErrors = Partial<Record<keyof FormFields, string>>;
type FocusMap   = Partial<Record<keyof FormFields, boolean>>;

const SERVICES = ['Luxury Custom Homes', 'Commercial Office', 'Retail & Mixed-Use', 'High-Rise Residential', 'Industrial & Warehouse', 'Renovation & Repositioning', 'Multiple / Other'];
const BUDGETS  = ['Under $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+', 'Not Sure Yet'];

const CONTACT_INFO = [
  { Icon: MapPin, label: 'Office',  val: '206 Brooks St\nSugar Land, TX 77478',            href: null },
  { Icon: Phone,  label: 'Phone',   val: '(281) 915-9595',                                  href: 'tel:+12819159595' },
  { Icon: Mail,   label: 'Email',   val: 'Info@HouInc.com',                                 href: 'mailto:Info@HouInc.com' },
  { Icon: Clock,  label: 'Hours',   val: 'Mon–Fri  8 AM – 6 PM\nSat  9 AM – 1 PM',         href: null },
];

export default function Contact() {
  const [form, setForm]         = useState<FormFields>({ name: '', email: '', phone: '', company: '', service: '', budget: '', message: '' });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [focused, setFocused]   = useState<FocusMap>({});
  const [sending, setSending]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [serverErr, setServerErr] = useState('');

  const set = (k: keyof FormFields) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const foc = (k: keyof FormFields, v: boolean) => () => setFocused(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
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
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({ 'form-name': 'contact-form', name: form.name, email: form.email, phone: form.phone, company: form.company, service: form.service, budget: form.budget, message: form.message }),
      }).catch(() => {});
      setSuccess(true);
    } catch {
      setServerErr('Something went wrong. Please call us at (281) 915-9595.');
    } finally {
      setSending(false);
    }
  };

  return (
    <PublicLayout>

      {/* ── Context strip ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: B, borderBottom: `1px solid ${DB}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between" style={{ height: 52 }}>
          <div className="flex items-center gap-4">
            <motion.div className="h-px" style={{ backgroundColor: AC }}
              initial={{ width: 0 }} animate={{ width: 24 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
            <span className="text-[7px] uppercase tracking-[0.52em] font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Project Inquiry · Houston Enterprise
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="tel:+12819159595" className="text-[9px] font-mono transition-colors" style={{ color: 'rgba(255,255,255,0.32)' }}
              onMouseEnter={e => (e.currentTarget.style.color = AC)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}>
              (281) 915-9595
            </a>
            <a href="mailto:Info@HouInc.com" className="text-[9px] transition-colors" style={{ color: 'rgba(255,255,255,0.32)' }}
              onMouseEnter={e => (e.currentTarget.style.color = AC)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}>
              Info@HouInc.com
            </a>
          </div>
        </div>
      </div>

      {/* ── Main split layout ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: 'calc(100vh - 130px)' }}>

        {/* Left: Info panel — second on mobile, first on desktop */}
        <div className="lg:w-[38%] xl:w-[36%] flex flex-col order-2 lg:order-1" style={{ backgroundColor: B, ...GRID_D }}>
          <motion.div
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col h-full"
          >
            {/* Heading */}
            <div className="px-6 lg:px-8 xl:px-12 pt-8 lg:pt-10 pb-6 lg:pb-8" style={{ borderBottom: `1px solid ${DB}` }}>
              <motion.div className="h-px mb-5" style={{ backgroundColor: AC }}
                initial={{ width: 0 }} animate={{ width: 36 }} transition={{ duration: 1.2, delay: 0.2 }} />
              <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 52px)', color: W, lineHeight: 1.0, letterSpacing: '-0.01em' }}>
                Let's Build<br />
                <span style={{ color: AC }}>Together.</span>
              </h1>
              <p className="mt-3 text-[11px] font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: 300 }}>
                Tell us about your project and we'll respond within two business days.
              </p>
            </div>

            {/* Contact info — 2-col grid on mobile, stacked on desktop */}
            <div className="px-6 lg:px-8 xl:px-12 py-6 lg:py-8 grid grid-cols-2 lg:grid-cols-1 gap-5 lg:gap-6" style={{ borderBottom: `1px solid ${DB}` }}>
              {CONTACT_INFO.map(({ Icon, label, val, href }) => (
                <div key={label} className="flex gap-3">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 shrink-0 flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: '1px solid rgba(157,126,63,0.22)' }}>
                    <Icon className="w-2.5 h-2.5 lg:w-3 lg:h-3" style={{ color: AC }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[7px] uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                    {href ? (
                      <a href={href} className="text-[11px] lg:text-[12px] font-light leading-relaxed whitespace-pre-line transition-colors block"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = AC)}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}>
                        {val}
                      </a>
                    ) : (
                      <div className="text-[11px] lg:text-[12px] font-light leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.82)' }}>{val}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="px-6 lg:px-8 xl:px-12 py-5 flex gap-3" style={{ borderBottom: `1px solid ${DB}` }}>
              <a href="tel:+12819159595"
                className="relative overflow-hidden flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-[0.22em] font-bold flex-1 py-3 transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                <Phone className="relative z-10 w-3 h-3" strokeWidth={1.5} />
                <span className="relative z-10">Call</span>
              </a>
              <a href="mailto:Info@HouInc.com"
                className="relative overflow-hidden flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-[0.22em] font-bold flex-1 py-3 transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
                <Mail className="relative z-10 w-3 h-3" strokeWidth={1.5} />
                <span className="relative z-10">Email</span>
              </a>
            </div>

            {/* Map — hidden on mobile, shown on desktop */}
            <div className="hidden lg:block flex-1 relative" style={{ minHeight: 220 }}>
              <iframe
                src="https://maps.google.com/maps?q=206+Brooks+St+Sugar+Land+TX+77478&output=embed"
                title="Houston Enterprise Office Location"
                width="100%" height="100%"
                style={{ border: 'none', position: 'absolute', inset: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
        </div>

        {/* Right: Form — first on mobile, second on desktop */}
        <div className="flex-1 flex flex-col order-1 lg:order-2" style={{ backgroundColor: W }}>
          <motion.div
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col px-6 sm:px-10 xl:px-14 py-8 lg:py-10"
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center flex-1 gap-7">
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    className="w-14 h-14 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: `1px solid ${AC}` }}>
                    <CheckCircle2 className="w-7 h-7" style={{ color: AC }} strokeWidth={1.5} />
                  </motion.div>
                  <div>
                    <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.9rem', color: B, marginBottom: '0.6rem' }}>
                      Message Received
                    </div>
                    <p className="text-[11px] leading-relaxed font-light max-w-xs mx-auto" style={{ color: G500 }}>
                      Thank you for reaching out to Houston Enterprise. A member of our team will contact you within two business days.
                    </p>
                  </div>
                  <a href="tel:+12819159595" className="text-[9px] uppercase tracking-[0.28em] font-bold flex items-center gap-1.5" style={{ color: AC }}>
                    <Phone className="w-3 h-3" strokeWidth={2} /> (281) 915-9595
                  </a>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 gap-5">
                  {/* Form header */}
                  <div className="mb-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px w-6" style={{ backgroundColor: AC }} />
                      <span className="text-[7px] uppercase tracking-[0.48em] font-semibold" style={{ color: G500 }}>Project Inquiry</span>
                    </div>
                    <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px, 3vw, 38px)', color: B, lineHeight: 1.05 }}>
                      Tell Us About Your Project
                    </h2>
                  </div>

                  {/* Row: Name + Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full Name *" id="name" value={form.name} error={errors.name}
                      onChange={set('name')} onFocus={foc('name', true)} onBlur={foc('name', false)}
                      focused={!!focused.name} placeholder="Your full name" />
                    <Field label="Email Address *" id="email" type="email" value={form.email} error={errors.email}
                      onChange={set('email')} onFocus={foc('email', true)} onBlur={foc('email', false)}
                      focused={!!focused.email} placeholder="your@email.com" />
                  </div>

                  {/* Row: Phone + Company */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Phone Number" id="phone" type="tel" value={form.phone}
                      onChange={set('phone')} onFocus={foc('phone', true)} onBlur={foc('phone', false)}
                      focused={!!focused.phone} placeholder="(713) 000-0000" />
                    <Field label="Company / Organization" id="company" value={form.company}
                      onChange={set('company')} onFocus={foc('company', true)} onBlur={foc('company', false)}
                      focused={!!focused.company} placeholder="Your company name" />
                  </div>

                  {/* Row: Service + Budget */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <SelectField label="Service Type" id="service" value={form.service}
                      onChange={set('service')} options={SERVICES} placeholder="Select a service…" />
                    <SelectField label="Estimated Budget" id="budget" value={form.budget}
                      onChange={set('budget')} options={BUDGETS} placeholder="Select a range…" />
                  </div>

                  {/* Message */}
                  <Field label="Project Description *" id="message" type="textarea" value={form.message} error={errors.message}
                    onChange={set('message')} onFocus={foc('message', true)} onBlur={foc('message', false)}
                    focused={!!focused.message} placeholder="Describe your project, location, timeline, and any specific requirements…" />

                  {serverErr && (
                    <p className="text-[10px]" style={{ color: '#C0392B' }}>{serverErr}</p>
                  )}

                  {/* Submit */}
                  <div className="flex items-center gap-6 flex-wrap pt-1">
                    <MagneticButton as="div">
                      <button type="submit" disabled={sending}
                        className="relative overflow-hidden group flex items-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black px-10 py-4"
                        style={{ backgroundColor: B, color: W, cursor: sending ? 'wait' : 'pointer', border: 'none' }}>
                        <motion.span className="absolute inset-0 origin-left" style={{ backgroundColor: AC }}
                          initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
                        {sending ? (
                          <><Loader2 className="relative z-10 w-3.5 h-3.5 animate-spin" strokeWidth={2} /><span className="relative z-10">Sending…</span></>
                        ) : (
                          <><span className="relative z-10">Send Inquiry</span><ArrowUpRight className="relative z-10 w-3.5 h-3.5" strokeWidth={2.5} /></>
                        )}
                      </button>
                    </MagneticButton>
                    <p className="text-[8px] leading-relaxed flex-1" style={{ color: G500 }}>
                      All project inquiries are kept strictly confidential.
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#0D0D0D', borderTop: `1px solid ${DB}` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0" style={{ borderLeft: DB }}>
            {[
              { Icon: ShieldCheck,  title: 'Licensed & Fully Insured', body: 'Complete commercial and residential coverage on every project.' },
              { Icon: Award,        title: 'BBB A+ · Zero Complaints',  body: '20+ years accredited with zero unresolved client complaints.' },
              { Icon: HardHat,      title: 'Dedicated Project Manager', body: 'One PM assigned from groundbreaking through final delivery.' },
              { Icon: CheckCircle2, title: '48-Hour Response',          body: 'We respond to every serious inquiry within two business days.' },
            ].map(w => (
              <div key={w.title} className="flex flex-col gap-2 px-6 py-5" style={{ borderRight: DB }}>
                <w.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: AC, opacity: 0.7 }} strokeWidth={1.5} />
                <div className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{w.title}</div>
                <p className="text-[9px] leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Service area strip ────────────────────────────────────── */}
      <div style={{ backgroundColor: B, borderTop: DB }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: DB }}>
            {[
              { title: 'Sugar Land HQ',   addr: '206 Brooks St\nSugar Land, TX 77478',                             phone: '(281) 915-9595' },
              { title: 'North Houston',   addr: 'The Woodlands, TX\nProject Management Office',                    phone: '(281) 915-9595' },
              { title: 'Service Area',    addr: 'Greater Houston Metro\nKaty · Pearland · Sugar Land · The Woodlands', phone: null },
            ].map((loc, i) => (
              <div key={loc.title} className="px-7 py-6 flex flex-col gap-2.5" style={{ borderRight: i < 2 ? DB : 'none' }}>
                <div className="text-[7px] uppercase tracking-[0.3em] font-semibold" style={{ color: AC }}>{loc.title}</div>
                <div className="text-[10px] font-light leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.3)' }}>{loc.addr}</div>
                {loc.phone && (
                  <a href="tel:+12819159595" className="text-[9px] font-mono mt-auto transition-colors" style={{ color: 'rgba(255,255,255,0.18)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = AC)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>
                    {loc.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </PublicLayout>
  );
}
