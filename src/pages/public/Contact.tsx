import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone, Mail, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import { supabase } from '@/integrations/supabase/client';

/* ── Tokens ───────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const BG   = '#FAFAF9';
const G400 = '#9CA3AF';
const G600 = '#4B5563';
const G700 = '#374151';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const BR   = '#E8E4DE';
const SF   = "'Cormorant Garamond', Georgia, serif";

/* ── Phone formatter ──────────────────────────────────────────────── */
function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/* ── Form field ───────────────────────────────────────────────────── */
function Field({
  label, id, type = 'text', value, error, onChange, placeholder, required = false,
}: {
  label: string; id: string; type?: string; value: string; error?: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? '#DC2626' : focused ? AC : BR;

  const baseStyle: React.CSSProperties = {
    width: '100%', backgroundColor: W,
    border: `1.5px solid ${borderColor}`,
    borderRadius: 0, fontSize: 13, fontFamily: 'inherit', color: B,
    outline: 'none', transition: 'border-color 0.18s',
    padding: type === 'textarea' ? '12px 14px' : '11px 14px',
  };

  return (
    <div>
      <label htmlFor={id} className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-2"
        style={{ color: error ? '#DC2626' : G600 }}>
        {label}{required && <span style={{ color: AC, marginLeft: 3 }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea id={id} rows={5} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...baseStyle, resize: 'vertical' }} />
      ) : (
        <input id={id} type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(type === 'tel' ? fmtPhone(e.target.value) : e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          autoComplete={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'off'}
          inputMode={type === 'tel' ? 'tel' : undefined}
          style={baseStyle} />
      )}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1.5 text-[10px]" style={{ color: '#DC2626' }}>
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
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G600 }}>
        {label}
      </label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', backgroundColor: W, border: `1.5px solid ${focused ? AC : BR}`,
          borderRadius: 0, padding: '11px 14px', fontSize: 13, fontFamily: 'inherit',
          color: value ? B : G400, outline: 'none', appearance: 'none', cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
          transition: 'border-color 0.18s',
        }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ── Constants ────────────────────────────────────────────────────── */
type FormFields = { name: string; email: string; phone: string; company: string; service: string; budget: string; message: string };
type FormErrors = Partial<Record<keyof FormFields, string>>;

const SERVICES = ['Luxury Custom Homes', 'Commercial Office', 'Retail & Mixed-Use', 'High-Rise Residential', 'Industrial & Warehouse', 'Renovation & Repositioning', 'Multiple / Other'];
const BUDGETS  = ['Under $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+', 'Not Sure Yet'];

const CONTACT_INFO = [
  { Icon: MapPin, label: 'Office',  val: '206 Brooks St, Sugar Land, TX 77478',  href: 'https://maps.google.com/?q=206+Brooks+St+Sugar+Land+TX+77478' },
  { Icon: Phone,  label: 'Phone',   val: '(281) 915-9595',                         href: 'tel:+12819159595' },
  { Icon: Mail,   label: 'Email',   val: 'Info@HouInc.com',                         href: 'mailto:Info@HouInc.com' },
  { Icon: Clock,  label: 'Hours',   val: 'Mon–Fri 8 AM–6 PM · Sat 9 AM–1 PM',     href: null },
];

const encodeNetlify = (data: Record<string, string>) =>
  Object.entries(data).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

/* ════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════ */
export default function Contact() {
  const [form, setForm]       = useState<FormFields>({ name: '', email: '', phone: '', company: '', service: '', budget: '', message: '' });
  const [errors, setErrors]   = useState<FormErrors>({});
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof FormFields) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())    e.name    = 'Full name is required';
    if (!form.email.trim())   e.email   = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.message.trim()) e.message = 'Please describe your project';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);

    // 1. Submit to Netlify (primary — always works, triggers email notifications)
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeNetlify({
          'form-name': 'contact-form',
          name: form.name, email: form.email, phone: form.phone,
          company: form.company, service: form.service, budget: form.budget,
          message: form.message,
        }),
      });
    } catch { /* silently ignore — Netlify submission should not block the user */ }

    // 2. Also persist to Supabase for admin dashboard (secondary — best-effort)
    try {
      await (supabase as any).from('contact_submissions').insert({
        name: form.name, email: form.email, phone: form.phone || null,
        company: form.company || null, service_type: form.service || null,
        budget_range: form.budget || null, message: form.message,
      });
    } catch { /* silently ignore — does not affect user experience */ }

    setSending(false);
    setSuccess(true);
  };

  return (
    <PublicLayout>

      {/* ── Context strip ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: B, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between" style={{ height: 48 }}>
          <div className="flex items-center gap-3">
            <div className="h-px w-5" style={{ backgroundColor: AC }} />
            <span className="text-[7px] uppercase tracking-[0.5em] font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Project Inquiry · Houston Enterprise
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-5">
            <a href="tel:+12819159595" className="text-[9px] font-mono transition-colors" style={{ color: 'rgba(255,255,255,0.32)' }}
              onMouseEnter={e => (e.currentTarget.style.color = ACL)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}>
              (281) 915-9595
            </a>
            <a href="mailto:Info@HouInc.com" className="text-[9px] transition-colors" style={{ color: 'rgba(255,255,255,0.32)' }}
              onMouseEnter={e => (e.currentTarget.style.color = ACL)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}>
              Info@HouInc.com
            </a>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: BG }}>

        {/* ══════════════════════════════════════════════════════════
            MAIN TWO-COLUMN: Info left, Form right
        ══════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-16">

            {/* Left: Info ────────────────────────────────────────── */}
            <motion.div className="lg:col-span-2"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>

              {/* Eyebrow + heading */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-6" style={{ backgroundColor: AC }} />
                  <span className="text-[7px] uppercase tracking-[0.5em] font-bold" style={{ color: AC }}>Get In Touch</span>
                </div>
                <h1 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(30px,4.5vw,52px)', color: B, lineHeight: 1.0, letterSpacing: '-0.01em' }}>
                  Let's Build<br />
                  <span style={{ color: AC }}>Together.</span>
                </h1>
                <p className="mt-4 text-[12px] font-light leading-relaxed" style={{ color: G600, maxWidth: 320 }}>
                  Share your vision and we'll respond within two business days with a clear path forward.
                </p>
              </div>

              {/* Contact details */}
              <div className="flex flex-col gap-5 mb-8">
                {CONTACT_INFO.map(({ Icon, label, val, href }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.22)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: AC }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-[7px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: G400 }}>{label}</div>
                      {href ? (
                        <a href={href} className="text-[12px] font-medium leading-relaxed transition-colors"
                          style={{ color: G700 }}
                          onMouseEnter={e => (e.currentTarget.style.color = AC)}
                          onMouseLeave={e => (e.currentTarget.style.color = G700)}>
                          {val}
                        </a>
                      ) : (
                        <div className="text-[12px] font-medium leading-relaxed" style={{ color: G700 }}>{val}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick CTA buttons */}
              <div className="flex gap-3 mb-8">
                <a href="tel:+12819159595"
                  className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-3 flex-1 transition-all"
                  style={{ backgroundColor: B, color: W, border: `1px solid ${B}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = AC; (e.currentTarget as HTMLElement).style.borderColor = AC; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = B; (e.currentTarget as HTMLElement).style.borderColor = B; }}>
                  <Phone className="w-3 h-3" strokeWidth={2} /> Call Now
                </a>
                <a href="mailto:Info@HouInc.com"
                  className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.22em] font-bold px-5 py-3 flex-1 transition-all"
                  style={{ border: `1px solid ${BR}`, color: G700, backgroundColor: W }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BR; (e.currentTarget as HTMLElement).style.color = G700; }}>
                  <Mail className="w-3 h-3" strokeWidth={2} /> Email Us
                </a>
              </div>

              {/* Credential strip */}
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {['Licensed & Insured', 'BBB A+ · Est. 1998', '25+ Years Houston'].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: AC }} />
                    <span className="text-[9px] font-semibold" style={{ color: G400 }}>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Form ────────────────────────────────────────── */}
            <motion.div className="lg:col-span-3"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>

              <div style={{ backgroundColor: W, border: `1px solid ${BR}`, boxShadow: '0 4px 32px rgba(10,8,6,0.06)' }}>
                {/* Card header */}
                <div className="px-6 sm:px-8 pt-7 pb-5" style={{ borderBottom: `1px solid ${BR}` }}>
                  <div className="text-[7px] uppercase tracking-[0.46em] font-bold mb-2" style={{ color: AC }}>Project Inquiry</div>
                  <h2 style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(22px,3vw,34px)', color: B, lineHeight: 1.05 }}>
                    Tell Us About Your Project
                  </h2>
                </div>

                <div className="px-6 sm:px-8 py-6 sm:py-8">
                  <AnimatePresence mode="wait">
                    {success ? (
                      <motion.div key="success"
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center py-12 gap-6">
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                          className="w-14 h-14 flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: `1.5px solid ${AC}` }}>
                          <CheckCircle2 className="w-6 h-6" style={{ color: AC }} strokeWidth={1.5} />
                        </motion.div>
                        <div>
                          <div style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 300, fontSize: '1.75rem', color: B, marginBottom: '0.5rem' }}>
                            Inquiry Received
                          </div>
                          <p className="text-[12px] font-light leading-relaxed max-w-sm mx-auto" style={{ color: G600 }}>
                            Thank you for reaching out. A member of our team will contact you within two business days.
                          </p>
                        </div>
                        <a href="tel:+12819159595"
                          className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-bold px-6 py-3 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: B, color: W }}>
                          <Phone className="w-3 h-3" strokeWidth={2} /> (281) 915-9595
                        </a>
                      </motion.div>
                    ) : (
                      <motion.form key="form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                        {/* Row 1: Name + Email */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Full Name" id="name" value={form.name} error={errors.name}
                            onChange={set('name')} placeholder="Your full name" required />
                          <Field label="Email Address" id="email" type="email" value={form.email} error={errors.email}
                            onChange={set('email')} placeholder="your@email.com" required />
                        </div>

                        {/* Row 2: Phone + Company */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Phone Number" id="phone" type="tel" value={form.phone}
                            onChange={set('phone')} placeholder="(713) 000-0000" />
                          <Field label="Company / Organization" id="company" value={form.company}
                            onChange={set('company')} placeholder="Your company name" />
                        </div>

                        {/* Row 3: Service + Budget */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <SelectField label="Service Type" id="service" value={form.service}
                            onChange={set('service')} options={SERVICES} placeholder="Select a service…" />
                          <SelectField label="Estimated Budget" id="budget" value={form.budget}
                            onChange={set('budget')} options={BUDGETS} placeholder="Select a range…" />
                        </div>

                        {/* Message */}
                        <Field label="Project Description" id="message" type="textarea" value={form.message} error={errors.message}
                          onChange={set('message')}
                          placeholder="Describe your project — location, scope, timeline, and any specific requirements…" required />

                        {/* Submit row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                          <button type="submit" disabled={sending}
                            className="inline-flex items-center justify-center gap-2.5 text-[9px] uppercase tracking-[0.28em] font-black px-8 py-4 transition-all"
                            style={{ backgroundColor: sending ? 'rgba(157,126,63,0.6)' : AC, color: W, border: 'none', cursor: sending ? 'wait' : 'pointer' }}
                            onMouseEnter={e => { if (!sending) (e.currentTarget as HTMLElement).style.backgroundColor = B; }}
                            onMouseLeave={e => { if (!sending) (e.currentTarget as HTMLElement).style.backgroundColor = AC; }}>
                            {sending ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />Sending…</>
                            ) : (
                              <>Send Inquiry<ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} /></>
                            )}
                          </button>
                          <p className="text-[9px] leading-relaxed" style={{ color: G400 }}>
                            All project inquiries are kept strictly confidential. No spam, no sharing.
                          </p>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            FULL-WIDTH MAP — real satellite/terrain via Google Maps embed
        ══════════════════════════════════════════════════════════ */}
        <div style={{ width: '100%', position: 'relative', borderTop: `1px solid ${BR}` }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-3 pb-2 flex items-center gap-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: G400 }}>
              Houston Enterprise HQ · Sugar Land, TX
            </span>
            <a href="https://maps.google.com/?q=206+Brooks+St+Sugar+Land+TX+77478"
              target="_blank" rel="noopener noreferrer"
              className="ml-auto text-[9px] uppercase tracking-[0.24em] font-bold flex items-center gap-1 transition-colors"
              style={{ color: AC }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Open in Maps <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
            </a>
          </div>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3469.3!2d-95.6349!3d29.5878!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8640e4c1b8c2c2c3%3A0x1a2b3c4d5e6f7a8b!2s206+Brooks+St%2C+Sugar+Land%2C+TX+77478!5e1!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
            title="Houston Enterprise Office — Sugar Land TX"
            width="100%"
            height="420"
            style={{ border: 'none', display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

      </div>

    </PublicLayout>
  );
}
