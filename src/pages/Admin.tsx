import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, FolderOpen, BarChart3, Settings, Image,
  ArrowUpRight, TrendingUp, CheckCircle, Clock, AlertCircle,
  Plus, Trash2, Edit3, Eye, LogOut, X, FileText, Calendar,
  Building2, Star, Search, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Tokens ─────────────────────────────────────────────────────────── */
const B     = '#0A0A0A';
const W     = '#FFFFFF';
const G50   = '#F5F4F2';
const G200  = '#E8E4DE';
const G500  = '#8A8580';
const AC    = '#9D7E3F';
const SERIF = "'Cormorant Garamond', Georgia, serif";

/* ── Local storage readers ── */
function readClients() {
  try { return JSON.parse(localStorage.getItem('hou-portal-clients') || '[]'); } catch { return []; }
}
function readBriefs() {
  try { return JSON.parse(localStorage.getItem('hou-portal-briefs') || '{}'); } catch { return {}; }
}
function readAllMsgs() {
  try { return JSON.parse(localStorage.getItem('hou-portal-messages') || '{}'); } catch { return {}; }
}
function readPortfolio(): PortfolioItem[] {
  try {
    const stored = localStorage.getItem('hou-admin-portfolio');
    if (stored) return JSON.parse(stored);
    return DEFAULT_PORTFOLIO;
  } catch { return DEFAULT_PORTFOLIO; }
}
function savePortfolio(items: PortfolioItem[]) {
  localStorage.setItem('hou-admin-portfolio', JSON.stringify(items));
}
function readContactForms() {
  try { return JSON.parse(localStorage.getItem('hou-contact-submissions') || '[]'); } catch { return []; }
}
function readFinanceReports() {
  try { return JSON.parse(localStorage.getItem('hou-finance-reports') || '[]'); } catch { return []; }
}

/* ── Types ── */
interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  location: string;
  sqft: string;
  year: string;
  description: string;
  featured: boolean;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { id: '1', title: 'Chambord River Oaks Estate', category: 'Luxury Residential', location: 'River Oaks, Houston', sqft: '14,500', year: '2024', description: 'Ultra-luxury custom estate with pool house and home theatre.', featured: true },
  { id: '2', title: 'Westway Commerce Campus', category: 'Commercial Industrial', location: 'Energy Corridor', sqft: '212,000', year: '2024', description: 'Modern Class-A industrial campus with office component.', featured: true },
  { id: '3', title: 'The Meridian Tower Retail', category: 'Retail & Mixed-Use', location: 'Galleria District', sqft: '98,000', year: '2023', description: 'Flagship retail anchor with premium tenant fit-out.', featured: false },
  { id: '4', title: 'Memorial Custom Home', category: 'Luxury Residential', location: 'Memorial, Houston', sqft: '8,200', year: '2023', description: 'Five-bedroom estate with bespoke interiors.', featured: false },
  { id: '5', title: 'Post Oak Medical Plaza', category: 'Medical & Healthcare', location: 'Medical Center', sqft: '45,000', year: '2022', description: 'State-of-the-art medical office building.', featured: false },
];

/* ── Admin auth gate ── */
const ADMIN_PW = 'houinc2024';
const ADMIN_KEY = 'hou-admin-unlocked';

type AdminTab = 'overview' | 'users' | 'submissions' | 'portfolio' | 'finance' | 'analytics';

export default function Admin() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === '1');
  const [pw, setPw]             = useState('');
  const [pwError, setPwError]   = useState('');
  const [tab, setTab]           = useState<AdminTab>('overview');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(readPortfolio);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem]   = useState<PortfolioItem | null>(null);
  const [search, setSearch]       = useState('');
  const [tick, setTick]           = useState(0);

  const clients  = readClients();
  const briefs   = readBriefs();
  const allMsgs  = readAllMsgs();
  const forms    = readContactForms();
  const reports  = readFinanceReports();

  const totalMsgs = Object.values(allMsgs as Record<string, unknown[]>).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      localStorage.setItem(ADMIN_KEY, '1');
      setUnlocked(true);
    } else {
      setPwError('Incorrect password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY);
    setUnlocked(false);
    setPw('');
  };

  const refreshData = () => setTick(t => t + 1);

  /* Portfolio CRUD */
  const [form, setForm] = useState<Omit<PortfolioItem, 'id'>>({ title: '', category: 'Luxury Residential', location: '', sqft: '', year: new Date().getFullYear().toString(), description: '', featured: false });

  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    const newItems = [...portfolio, { ...form, id: crypto.randomUUID() }];
    setPortfolio(newItems);
    savePortfolio(newItems);
    setShowAddItem(false);
    setForm({ title: '', category: 'Luxury Residential', location: '', sqft: '', year: new Date().getFullYear().toString(), description: '', featured: false });
  };

  const handleDeletePortfolio = (id: string) => {
    const updated = portfolio.filter(p => p.id !== id);
    setPortfolio(updated);
    savePortfolio(updated);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const updated = portfolio.map(p => p.id === editItem.id ? editItem : p);
    setPortfolio(updated);
    savePortfolio(updated);
    setEditItem(null);
  };

  const toggleFeatured = (id: string) => {
    const updated = portfolio.map(p => p.id === id ? { ...p, featured: !p.featured } : p);
    setPortfolio(updated);
    savePortfolio(updated);
  };

  const CATEGORIES = ['Luxury Residential', 'Commercial Industrial', 'Retail & Mixed-Use', 'Medical & Healthcare', 'High-Rise Residential', 'Renovation'];

  const NAV_ITEMS: { key: AdminTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { key: 'overview',     label: 'Overview',         icon: BarChart3 },
    { key: 'users',        label: 'Portal Users',      icon: Users },
    { key: 'submissions',  label: 'Form Submissions',  icon: MessageSquare },
    { key: 'portfolio',    label: 'Portfolio',          icon: Image },
    { key: 'finance',      label: 'Finance Reports',   icon: FileText },
    { key: 'analytics',    label: 'Analytics',         icon: TrendingUp },
  ];

  /* ── Lock screen ── */
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: B, backgroundImage: 'radial-gradient(circle, rgba(157,126,63,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <motion.div className="w-full max-w-sm p-10 relative" style={{ backgroundColor: W, border: '1px solid rgba(157,126,63,0.25)' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-px h-8" style={{ backgroundColor: AC }} />
            <div>
              <div className="text-[11px] font-black tracking-[0.34em] uppercase" style={{ color: B, fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.42em]" style={{ color: AC }}>Admin Dashboard · Secure Access</div>
            </div>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '28px', color: B, lineHeight: 1.1, marginBottom: 8 }}>
            Admin Access
          </div>
          <p className="text-[12px] font-light mb-7" style={{ color: G500 }}>Enter your admin password to access the dashboard.</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: G500 }}>Password</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} required autoFocus
                className="w-full outline-none text-[14px]"
                style={{ padding: '13px 14px', border: `1px solid ${pw ? AC : G200}`, borderRadius: 0, color: B, transition: 'border-color 0.2s' }}
                onFocus={e => { e.target.style.borderColor = AC; }}
                onBlur={e => { if (!e.target.value) e.target.style.borderColor = G200; }}
              />
            </div>
            {pwError && <p className="text-[11px]" style={{ color: '#ef4444' }}>{pwError}</p>}
            <button type="submit" className="w-full py-3.5 text-[10px] uppercase tracking-[0.28em] font-black transition-opacity hover:opacity-85"
              style={{ backgroundColor: B, color: W }}>
              Access Dashboard <ArrowUpRight className="w-3.5 h-3.5 inline ml-1" strokeWidth={2.5} />
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: G500 }}>← Back to Website</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Admin dashboard ── */
  const OVERVIEW_STATS = [
    { label: 'Portal Clients',     value: clients.length,  icon: Users,       color: '#3b82f6', sub: 'Registered accounts' },
    { label: 'Project Briefs',     value: Object.keys(briefs).length, icon: FileText, color: GOLD_COLOR, sub: 'Submitted briefs' },
    { label: 'Total Messages',     value: totalMsgs,       icon: MessageSquare, color: '#8b5cf6', sub: 'Portal communications' },
    { label: 'Contact Submissions',value: forms.length,    icon: Building2,   color: '#10b981', sub: 'Website contact forms' },
  ];

  const GOLD_COLOR = AC;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: G50 }}>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 w-[240px]"
        style={{ backgroundColor: B, borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-px h-6" style={{ backgroundColor: AC }} />
            <div>
              <div className="text-[11px] font-black tracking-[0.3em] uppercase" style={{ color: W, fontFamily: SERIF }}>HOU INC</div>
              <div className="text-[7px] uppercase tracking-[0.38em]" style={{ color: AC }}>Admin Dashboard</div>
            </div>
          </div>
          <div className="mt-3 px-2 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: 'rgba(157,126,63,0.1)', border: '1px solid rgba(157,126,63,0.2)' }}>
            <Settings className="w-3 h-3" style={{ color: AC }} strokeWidth={1.5} />
            <span className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>System Control</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-left transition-all"
              style={{
                color: tab === key ? AC : 'rgba(255,255,255,0.45)',
                backgroundColor: tab === key ? 'rgba(157,126,63,0.1)' : 'transparent',
                borderLeft: tab === key ? `2px solid ${AC}` : '2px solid transparent',
              }}>
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" className="w-full flex items-center gap-3 px-3 py-2.5 mt-3 text-[11px] font-semibold transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            Back to Website
          </Link>
          <Link to="/portal" className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-semibold transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            Client Portal
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-semibold transition-colors mt-1"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}>
            <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            Lock Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-[240px]">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-4" style={{ backgroundColor: W, borderBottom: `1px solid ${G200}`, boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
          <div>
            <div className="text-[8px] uppercase tracking-[0.4em] font-bold" style={{ color: AC }}>HOU INC · Admin</div>
            <div className="text-[16px] font-bold" style={{ color: B }}>{NAV_ITEMS.find(n => n.key === tab)?.label}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refreshData} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-semibold px-3 py-2 transition-all"
              style={{ border: `1px solid ${G200}`, color: G500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = AC; (e.currentTarget as HTMLElement).style.color = AC; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = G200; (e.currentTarget as HTMLElement).style.color = G500; }}>
              <RefreshCw className="w-3 h-3" strokeWidth={2} /> Refresh
            </button>
            <Link to="/finance" className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2 transition-opacity hover:opacity-85"
              style={{ backgroundColor: AC, color: W }}>
              Finance <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div className="px-8 py-8">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {OVERVIEW_STATS.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="p-6" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                      <div className="w-9 h-9 flex items-center justify-center mb-4" style={{ backgroundColor: `${s.color}12` }}>
                        <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
                      </div>
                      <div className="text-[28px] font-black mb-1" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-0.5" style={{ color: B }}>{s.label}</div>
                      <div className="text-[10px] font-light" style={{ color: G500 }}>{s.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Recent portal clients */}
              <div className="mb-8" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Recent Portal Registrations</div>
                  <button onClick={() => setTab('users')} className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: G500 }}>View All →</button>
                </div>
                <div>
                  {clients.slice(-5).reverse().map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-4 px-6 py-3.5"
                      style={{ borderBottom: i < Math.min(clients.length, 5) - 1 ? `1px solid ${G200}` : 'none' }}>
                      <div className="w-8 h-8 flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                        {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold" style={{ color: B }}>{c.name}</div>
                        <div className="text-[10px] font-light" style={{ color: G500 }}>{c.email}</div>
                      </div>
                      <div className="text-[9px] font-light" style={{ color: G500 }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1"
                        style={{ backgroundColor: briefs[c.id] ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', color: briefs[c.id] ? '#10b981' : '#f59e0b' }}>
                        {briefs[c.id] ? 'Brief Submitted' : 'Pending Brief'}
                      </div>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <div className="px-6 py-10 text-center text-[12px] font-light" style={{ color: G500 }}>No clients registered yet.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PORTAL USERS ── */}
          {tab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>All Portal Clients ({clients.length})</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${G200}`, backgroundColor: G50 }}>
                        {['Name', 'Email', 'Phone', 'Registered', 'Brief Status', 'Messages'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[9px] uppercase tracking-[0.26em] font-bold" style={{ color: G500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c: any, i: number) => {
                        const brief = briefs[c.id];
                        const msgs = (allMsgs as Record<string, unknown[]>)[c.id]?.length ?? 0;
                        return (
                          <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? `1px solid ${G200}` : 'none' }}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black shrink-0"
                                  style={{ backgroundColor: 'rgba(157,126,63,0.1)', color: AC, fontFamily: SERIF }}>
                                  {c.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-[12px] font-semibold" style={{ color: B }}>{c.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>{c.email}</td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>{c.phone || '—'}</td>
                            <td className="px-5 py-3.5 text-[11px] font-light" style={{ color: G500 }}>
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[8px] uppercase tracking-[0.18em] font-bold px-2 py-1"
                                style={{ backgroundColor: brief ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', color: brief ? '#10b981' : '#f59e0b' }}>
                                {brief ? brief.status.replace(/_/g, ' ') : 'Not Submitted'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-[12px] font-semibold" style={{ color: B }}>{msgs}</td>
                          </tr>
                        );
                      })}
                      {clients.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-[12px] font-light" style={{ color: G500 }}>No clients registered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FORM SUBMISSIONS ── */}
          {tab === 'submissions' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${G200}` }}>
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Contact Form Submissions ({forms.length})</div>
                </div>
                {forms.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                    <div className="text-[13px] font-light" style={{ color: G500 }}>No contact form submissions yet.</div>
                    <p className="text-[11px] mt-2 font-light" style={{ color: G500 }}>Submissions from the website contact form will appear here.</p>
                  </div>
                ) : (
                  <div>
                    {forms.map((f: any, i: number) => (
                      <div key={i} className="px-6 py-5" style={{ borderBottom: i < forms.length - 1 ? `1px solid ${G200}` : 'none' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[13px] font-bold mb-0.5" style={{ color: B }}>{f.name}</div>
                            <div className="text-[11px] mb-1" style={{ color: G500 }}>{f.email} {f.phone ? `· ${f.phone}` : ''}</div>
                            <div className="text-[11px] font-light" style={{ color: G500 }}>{f.message || f.description || '—'}</div>
                          </div>
                          <div className="text-[9px] shrink-0" style={{ color: G500 }}>
                            {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── PORTFOLIO ── */}
          {tab === 'portfolio' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: AC }}>Portfolio Projects ({portfolio.length})</div>
                <button onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2.5 transition-opacity hover:opacity-85"
                  style={{ backgroundColor: B, color: W }}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Project
                </button>
              </div>

              <div className="space-y-3">
                {portfolio.map(item => (
                  <div key={item.id} className="flex items-center gap-5 p-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(157,126,63,0.08)', border: `1px solid rgba(157,126,63,0.2)` }}>
                      <Building2 className="w-5 h-5" style={{ color: AC }} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[13px] font-bold" style={{ color: B }}>{item.title}</div>
                        {item.featured && (
                          <Star className="w-3 h-3 fill-current" style={{ color: AC }} strokeWidth={0} />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] font-light" style={{ color: G500 }}>
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.location}</span>
                        {item.sqft && <><span>·</span><span>{item.sqft} SF</span></>}
                        <span>·</span>
                        <span>{item.year}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleFeatured(item.id)}
                        className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 transition-all"
                        style={{ border: `1px solid ${item.featured ? AC : G200}`, color: item.featured ? AC : G500, backgroundColor: item.featured ? 'rgba(157,126,63,0.06)' : 'transparent' }}>
                        <Star className="w-3 h-3" style={{ fill: item.featured ? AC : 'none' }} strokeWidth={2} />
                        {item.featured ? 'Featured' : 'Feature'}
                      </button>
                      <button onClick={() => setEditItem({ ...item })}
                        className="w-8 h-8 flex items-center justify-center transition-colors"
                        style={{ color: G500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = B; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; }}>
                        <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleDeletePortfolio(item.id)}
                        className="w-8 h-8 flex items-center justify-center transition-colors"
                        style={{ color: G500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = G500; }}>
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Modal */}
              <AnimatePresence>
                {(showAddItem || editItem) && (
                  <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      onClick={() => { setShowAddItem(false); setEditItem(null); }} />
                    <motion.div className="relative z-10 w-full max-w-lg p-8" style={{ backgroundColor: W, border: `1px solid ${G200}` }}
                      initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-[14px] font-bold" style={{ color: B }}>{editItem ? 'Edit Project' : 'Add Portfolio Project'}</div>
                        <button onClick={() => { setShowAddItem(false); setEditItem(null); }} style={{ color: G500 }}>
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                      <form onSubmit={editItem ? handleEditSave : handleAddPortfolio} className="space-y-4">
                        {[
                          { label: 'Project Title', field: 'title', type: 'text', required: true },
                          { label: 'Location', field: 'location', type: 'text', required: true },
                          { label: 'Square Footage', field: 'sqft', type: 'text', required: false },
                          { label: 'Year Completed', field: 'year', type: 'text', required: true },
                        ].map(({ label, field, type, required }) => (
                          <div key={field}>
                            <label className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5" style={{ color: G500 }}>{label}</label>
                            <input type={type} required={required}
                              value={editItem ? (editItem as any)[field] : (form as any)[field]}
                              onChange={e => {
                                if (editItem) setEditItem({ ...editItem, [field]: e.target.value });
                                else setForm({ ...form, [field]: e.target.value });
                              }}
                              className="w-full text-[13px] outline-none"
                              style={{ padding: '11px 13px', border: `1px solid ${G200}`, borderRadius: 0, color: B }} />
                          </div>
                        ))}
                        <div>
                          <label className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5" style={{ color: G500 }}>Category</label>
                          <select value={editItem ? editItem.category : form.category}
                            onChange={e => { if (editItem) setEditItem({ ...editItem, category: e.target.value }); else setForm({ ...form, category: e.target.value }); }}
                            className="w-full text-[13px] outline-none"
                            style={{ padding: '11px 13px', border: `1px solid ${G200}`, borderRadius: 0, color: B }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-[0.28em] font-bold mb-1.5" style={{ color: G500 }}>Description</label>
                          <textarea rows={3} value={editItem ? editItem.description : form.description}
                            onChange={e => { if (editItem) setEditItem({ ...editItem, description: e.target.value }); else setForm({ ...form, description: e.target.value }); }}
                            className="w-full text-[13px] outline-none resize-none"
                            style={{ padding: '11px 13px', border: `1px solid ${G200}`, borderRadius: 0, color: B, lineHeight: 1.6 }} />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="submit" className="flex-1 py-3 text-[10px] uppercase tracking-[0.24em] font-black transition-opacity hover:opacity-85"
                            style={{ backgroundColor: B, color: W }}>
                            {editItem ? 'Save Changes' : 'Add Project'}
                          </button>
                          <button type="button" onClick={() => { setShowAddItem(false); setEditItem(null); }}
                            className="px-5 text-[10px] uppercase tracking-[0.2em] font-bold"
                            style={{ border: `1px solid ${G200}`, color: G500 }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── FINANCE REPORTS ── */}
          {tab === 'finance' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 p-6 flex items-center gap-5" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: 'rgba(157,126,63,0.1)' }}>
                  <FileText className="w-4.5 h-4.5" style={{ color: AC }} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: B }}>Finance Dashboard Reports</div>
                  <div className="text-[11px] font-light" style={{ color: G500 }}>
                    Exported reports from the HOU INC Finance Dashboard will appear here automatically.
                  </div>
                </div>
                <Link to="/finance" className="ml-auto flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-black px-4 py-2.5 shrink-0"
                  style={{ backgroundColor: AC, color: W }}>
                  Finance Hub <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
              {reports.length === 0 ? (
                <div className="text-center py-16" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: G200 }} strokeWidth={1} />
                  <div className="text-[13px] font-light" style={{ color: G500 }}>No exported reports yet.</div>
                  <p className="text-[11px] mt-2 font-light max-w-xs mx-auto" style={{ color: G500 }}>
                    Export reports from the Finance Dashboard and they'll be logged here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                  {reports.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-5 px-6 py-4" style={{ borderBottom: i < reports.length - 1 ? `1px solid ${G200}` : 'none' }}>
                      <FileText className="w-4 h-4 shrink-0" style={{ color: AC }} strokeWidth={1.5} />
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: B }}>{r.name || 'Finance Export'}</div>
                        <div className="text-[10px] font-light" style={{ color: G500 }}>{r.date || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── ANALYTICS ── */}
          {tab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Portal Registrations',  value: clients.length,                           trend: '+12%',  color: '#3b82f6' },
                  { label: 'Project Briefs Submitted',     value: Object.keys(briefs).length,               trend: '+8%',   color: AC },
                  { label: 'Avg. Messages / Client',       value: clients.length > 0 ? Math.round(totalMsgs / clients.length) : 0, trend: '+5%', color: '#8b5cf6' },
                  { label: 'Portfolio Projects',            value: portfolio.length,                          trend: 'Active',  color: '#10b981' },
                  { label: 'Featured Projects',             value: portfolio.filter(p => p.featured).length, trend: 'Homepage', color: GOLD_COLOR },
                  { label: 'Contact Submissions',           value: forms.length,                             trend: 'Total',   color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="p-6" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                    <div className="text-[32px] font-black mb-1" style={{ color: B, fontFamily: SERIF }}>{s.value}</div>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: B }}>{s.label}</div>
                    <div className="text-[9px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 inline-block" style={{ backgroundColor: `${s.color}12`, color: s.color }}>{s.trend}</div>
                  </div>
                ))}
              </div>

              <div className="p-8" style={{ backgroundColor: W, border: `1px solid ${G200}` }}>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-6" style={{ color: AC }}>Portal Conversion Funnel</div>
                <div className="space-y-4">
                  {[
                    { label: 'Registered Accounts',  count: clients.length,                   color: '#3b82f6' },
                    { label: 'Brief Submitted',        count: Object.keys(briefs).length,        color: AC },
                    { label: 'At least 1 Message',     count: Object.keys(allMsgs as Record<string, unknown[]>).filter(k => (allMsgs as Record<string, unknown[]>)[k]?.length > 1).length, color: '#8b5cf6' },
                  ].map((s, i, arr) => {
                    const pct = arr[0].count > 0 ? Math.round((s.count / arr[0].count) * 100) : 0;
                    return (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: B }}>{s.label}</span>
                          <span className="text-[11px] font-bold" style={{ color: B }}>{s.count} <span className="text-[10px] font-light" style={{ color: G500 }}>({pct}%)</span></span>
                        </div>
                        <div className="h-2 overflow-hidden" style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}>
                          <motion.div className="h-full" style={{ backgroundColor: s.color }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
