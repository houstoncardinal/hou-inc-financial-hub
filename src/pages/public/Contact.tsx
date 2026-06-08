import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone, Mail, Clock } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';

const G  = '#C4963C';
const BG = '#07070A';

const PROJECT_TYPES = [
  'Luxury Custom Home', 'Commercial Development', 'Retail / Shopping Center',
  'Mixed-Use Development', 'High-Rise Residential', 'Industrial / Warehouse',
  'Renovation / Repositioning', 'Other',
];

const BUDGETS = ['Under $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+', 'Not yet determined'];

const CONTACT_INFO = [
  { Icon: MapPin, label: 'Office', lines: ['1200 Post Oak Blvd, Suite 300', 'Houston, TX 77056'] },
  { Icon: Phone, label: 'Phone', lines: ['(713) 555-0190', 'Mon–Fri · 8am–6pm CST'] },
  { Icon: Mail, label: 'Email', lines: ['info@houinc.com', 'projects@houinc.com'] },
  { Icon: Clock, label: 'Response Time', lines: ['Within 1 business day', 'For urgent inquiries, call directly'] },
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

  const inputCls = 'w-full h-11 px-4 text-sm bg-transparent border outline-none transition-colors';
  const inputStyle = { backgroundColor: '#0C0B0F', borderColor: '#1C1A22', color: '#F4F2EE' };
  const inputFocusStyle = { borderColor: G };

  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="pt-40 pb-20"
        style={{
          background: `radial-gradient(ellipse at 30% 60%, rgba(196,150,60,0.07) 0%, transparent 50%), ${BG}`,
          borderBottom: '1px solid #1C1A22',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8" style={{ backgroundColor: G }} />
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: G }}>Let's Talk</div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-end">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none" style={{ color: '#F4F2EE' }}>
              Start Your<br />Project
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,242,238,0.45)' }}>
              Tell us what you're building. Our team reviews every inquiry personally and responds within one business day. No automated responses, no outsourced intake — just a direct conversation with the people who will build your project.
            </p>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="py-16 md:py-24" style={{ backgroundColor: BG }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-3 gap-0" style={{ border: '1px solid #1C1A22' }}>

            {/* Contact Info */}
            <div className="p-8 md:p-10" style={{ backgroundColor: '#0C0B0F', borderRight: '1px solid #1C1A22' }}>
              <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-8" style={{ color: G }}>Contact Information</div>
              <div className="space-y-8">
                {CONTACT_INFO.map(({ Icon, label, lines }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: G }} strokeWidth={1.5} />
                      <div className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(196,150,60,0.6)' }}>{label}</div>
                    </div>
                    {lines.map(l => (
                      <div key={l} className="text-[12px] leading-relaxed" style={{ color: 'rgba(244,242,238,0.55)' }}>{l}</div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8" style={{ borderTop: '1px solid #1C1A22' }}>
                <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-4" style={{ color: G }}>Our Location</div>
                <div
                  className="h-40 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #0E1018 0%, #141820 100%)',
                    border: '1px solid #1C1A22',
                  }}
                >
                  <div className="text-center">
                    <MapPin className="w-5 h-5 mx-auto mb-2" style={{ color: G, opacity: 0.6 }} strokeWidth={1.5} />
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(244,242,238,0.3)' }}>Post Oak · Houston, TX</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2 p-8 md:p-10">
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(196,150,60,0.1)', border: `1px solid ${G}` }}>
                    <ArrowUpRight className="w-6 h-6" style={{ color: G }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-3" style={{ color: '#F4F2EE' }}>Message Received</h3>
                  <p className="text-sm max-w-sm" style={{ color: 'rgba(244,242,238,0.4)' }}>
                    Thank you. A member of the HOU INC team will review your inquiry and be in touch within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="text-[9px] uppercase tracking-[0.3em] font-bold mb-8" style={{ color: G }}>Project Inquiry</div>

                  {/* Name + Company */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Full Name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={set('name')}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => (e.target.style.borderColor = '#1C1A22')}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Company</label>
                      <input
                        value={form.company}
                        onChange={set('company')}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => (e.target.style.borderColor = '#1C1A22')}
                      />
                    </div>
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => (e.target.style.borderColor = '#1C1A22')}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        className={inputCls}
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => (e.target.style.borderColor = '#1C1A22')}
                      />
                    </div>
                  </div>

                  {/* Project Type + Budget */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Project Type *</label>
                      <select
                        required
                        value={form.projectType}
                        onChange={set('projectType')}
                        className={inputCls}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="" disabled style={{ backgroundColor: '#0C0B0F' }}>Select type…</option>
                        {PROJECT_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#0C0B0F' }}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Budget Range</label>
                      <select
                        value={form.budget}
                        onChange={set('budget')}
                        className={inputCls}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="" disabled style={{ backgroundColor: '#0C0B0F' }}>Select range…</option>
                        {BUDGETS.map(b => <option key={b} value={b} style={{ backgroundColor: '#0C0B0F' }}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-[8px] uppercase tracking-[0.22em] font-bold mb-2" style={{ color: 'rgba(244,242,238,0.35)' }}>Tell Us About Your Project *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Location, timeline, scope, any specific requirements…"
                      className="w-full px-4 py-3 text-sm bg-transparent border outline-none transition-colors resize-none"
                      style={{ ...inputStyle, placeholderColor: 'rgba(244,242,238,0.2)' }}
                      onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={e => (e.target.style.borderColor = '#1C1A22')}
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-black px-10 py-4 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: G, color: '#07070A' }}
                  >
                    Send Inquiry <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>

                  <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: 'rgba(244,242,238,0.2)' }}>
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
