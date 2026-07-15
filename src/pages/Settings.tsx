import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, THEMES } from '@/hooks/useTheme';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useEnsureAccountingConfig } from '@/hooks/useConstructionFinance';
import { useEntity } from '@/contexts/EntityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Check, Eye, EyeOff, Zap, ShieldCheck, UserRound, KeyRound, Palette,
  Building2, FileSpreadsheet, Bell, Database, ExternalLink, Globe,
  ReceiptText, LockKeyhole, Settings2, History, LogOut, Landmark,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SETTINGS_CSS = `
.settings-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.18),transparent 190px);}
.settings-panel{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.05),0 1px 0 rgba(255,255,255,0.45) inset;}
.settings-panel:hover{border-color:hsl(var(--foreground)/0.16);box-shadow:0 8px 24px rgba(10,10,10,0.065),0 1px 0 rgba(255,255,255,0.45) inset;}
.settings-card{background:hsl(var(--background));border:1px solid hsl(var(--border));box-shadow:0 1px 3px rgba(10,10,10,0.045);}
.settings-kicker{font-size:8px;text-transform:uppercase;letter-spacing:.22em;font-weight:850;color:hsl(var(--muted-foreground));}
.settings-field{height:38px;border-radius:0;font-size:13px;}
.settings-action{height:34px;padding:0 12px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
.settings-action:hover{background:hsl(var(--secondary)/0.55);border-color:hsl(var(--foreground)/0.2);}
.settings-primary{height:34px;padding:0 13px;background:hsl(var(--foreground));color:hsl(var(--background));font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:850;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
.settings-primary:hover{opacity:.9;}
.settings-toggle{border:1px solid hsl(var(--border));background:hsl(var(--background));padding:10px;display:flex;align-items:center;gap:10px;text-align:left;transition:background .16s,border-color .16s;}
.settings-toggle:hover{background:hsl(var(--secondary)/0.45);border-color:hsl(var(--foreground)/0.17);}
.settings-toggle[data-active="true"]{background:hsl(var(--secondary)/0.7);border-color:hsl(var(--foreground)/0.28);}
.dark .settings-panel,.dark .settings-card,.dark .settings-action,.dark .settings-toggle{background:hsl(var(--card));box-shadow:0 1px 4px rgba(0,0,0,0.28),0 1px 0 rgba(255,255,255,0.05) inset;}
@media(max-width:639px){.settings-shell{background:linear-gradient(180deg,hsl(var(--secondary)/0.14),transparent 140px)}.settings-field{height:36px}.settings-panel{box-shadow:0 1px 2px rgba(10,10,10,0.04)}}
`;

type WorkspacePrefs = {
  phone: string;
  title: string;
  department: string;
  default_dashboard: string;
  dashboard_density: string;
  date_format: string;
  export_footer: string;
  pdf_branding: string;
  notify_email: boolean;
  notify_audit: boolean;
  notify_reconcile: boolean;
};

const textFromMeta = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const boolFromMeta = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { cfg, save: saveIntegrations } = useIntegrations();
  const { entity } = useEntity();
  const ensureAccounting = useEnsureAccountingConfig();
  const meta = user?.user_metadata ?? {};

  const [displayName, setDisplayName] = useState(textFromMeta(meta.full_name, ''));
  const [savingProfile, setSavingProfile] = useState(false);
  const [stripeKey, setStripeKey] = useState(cfg.stripe_secret_key);
  const [showKey, setShowKey] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [prefs, setPrefs] = useState<WorkspacePrefs>({
    phone: textFromMeta(meta.phone, ''),
    title: textFromMeta(meta.title, ''),
    department: textFromMeta(meta.department, 'Finance Administration'),
    default_dashboard: textFromMeta(meta.default_dashboard, '/finance/dashboard'),
    dashboard_density: textFromMeta(meta.dashboard_density, 'compact'),
    date_format: textFromMeta(meta.date_format, 'MM/DD/YYYY'),
    export_footer: textFromMeta(meta.export_footer, 'Houston Enterprise finance records are confidential and prepared for internal business use.'),
    pdf_branding: textFromMeta(meta.pdf_branding, 'Houston Enterprise'),
    notify_email: boolFromMeta(meta.notify_email, true),
    notify_audit: boolFromMeta(meta.notify_audit, true),
    notify_reconcile: boolFromMeta(meta.notify_reconcile, true),
  });

  const statusCards = useMemo(() => [
    { label: 'Account', value: user?.email_confirmed_at ? 'Verified' : 'Needs Review', Icon: ShieldCheck },
    { label: 'Entity', value: entity?.shortName || 'None', Icon: Building2 },
    { label: 'Theme', value: THEMES.find(t => t.id === theme)?.name || theme, Icon: Palette },
    { label: 'Audit Trail', value: 'Enabled', Icon: History },
  ], [entity?.shortName, theme, user?.email_confirmed_at]);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...meta,
        full_name: displayName.trim(),
        phone: prefs.phone.trim(),
        title: prefs.title.trim(),
        department: prefs.department.trim(),
      },
    });
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success('Profile saved to your account');
  };

  const saveWorkspace = async () => {
    setSavingWorkspace(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...meta,
        ...prefs,
        full_name: displayName.trim(),
      },
    });
    setSavingWorkspace(false);
    if (error) toast.error(error.message);
    else toast.success('Workspace preferences saved');
  };

  const updateCredentials = async () => {
    setSavingCreds(true);
    const updates: Record<string, string> = {};
    if (newEmail.trim() && newEmail.trim() !== user?.email) updates.email = newEmail.trim();
    if (newPassword) updates.password = newPassword;
    if (!Object.keys(updates).length) {
      toast.info('No credential changes to save.');
      setSavingCreds(false);
      return;
    }
    const { error } = await supabase.auth.updateUser(updates);
    setSavingCreds(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword('');
    toast.success(updates.email ? 'Confirmation sent to the new email' : 'Password updated');
  };

  const saveStripe = () => {
    saveIntegrations({ stripe_secret_key: stripeKey });
    toast.success('Stripe key saved');
  };

  const testStripe = async () => {
    if (!stripeKey) {
      toast.error('Enter your Stripe secret key first');
      return;
    }
    setTestingStripe(true);
    try {
      const res = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid key');
      toast.success(`Stripe connected: ${data.display_name || data.id}`);
    } catch (e: any) {
      toast.error(`Stripe error: ${e.message}`);
    } finally {
      setTestingStripe(false);
    }
  };

  return (
    <AppShell>
      <style>{SETTINGS_CSS}</style>
      <PageHeader eyebrow="Administration" title="Settings" description="Manage profile, security, workspace behavior, exports, integrations, and operating preferences." />

      <div className="settings-shell border-t border-border/50">
        <div className="px-4 sm:px-8 py-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {statusCards.map(card => (
              <div key={card.label} className="settings-panel p-3 min-w-0">
                <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] font-black text-muted-foreground">
                  <card.Icon className="w-3 h-3" strokeWidth={1.7} />
                  {card.label}
                </div>
                <div className="mt-1 text-sm font-bold truncate">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4">
            <section className="settings-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="settings-kicker">Profile</div>
                  <h2 className="text-lg font-semibold tracking-tight mt-1">Account Identity</h2>
                  <p className="text-xs text-muted-foreground mt-1">Saved to your Supabase user profile and used across finance workflows.</p>
                </div>
                <div className="w-11 h-11 bg-foreground text-background flex items-center justify-center text-lg font-black shrink-0">
                  {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Full Name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="settings-field" placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Phone</Label>
                  <Input value={prefs.phone} onChange={e => setPrefs(p => ({ ...p, phone: e.target.value }))} className="settings-field" placeholder="Business phone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Title</Label>
                  <Input value={prefs.title} onChange={e => setPrefs(p => ({ ...p, title: e.target.value }))} className="settings-field" placeholder="Admin, Controller, Owner..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Department</Label>
                  <Input value={prefs.department} onChange={e => setPrefs(p => ({ ...p, department: e.target.value }))} className="settings-field" placeholder="Finance Administration" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={saveProfile} disabled={savingProfile} className="settings-primary">
                  <UserRound className="w-3.5 h-3.5" /> {savingProfile ? 'Saving' : 'Save Profile'}
                </button>
                <button onClick={() => navigate('/changelog')} className="settings-action">
                  <History className="w-3.5 h-3.5" /> View Changelog
                </button>
              </div>
            </section>

            <section className="settings-panel p-4 sm:p-5">
              <div className="settings-kicker">Security</div>
              <h2 className="text-lg font-semibold tracking-tight mt-1">Access & Credentials</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Update login credentials and manage the active session.</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Login Email</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="settings-field font-mono-tab" />
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">New Password</Label>
                  <div className="relative">
                    <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="settings-field pr-10" placeholder="Leave blank to keep current" />
                    <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={updateCredentials} disabled={savingCreds} className="settings-primary">
                  <KeyRound className="w-3.5 h-3.5" /> {savingCreds ? 'Saving' : 'Update Login'}
                </button>
                <button onClick={async () => { await signOut(); window.location.href = '/auth'; }} className="settings-action">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="settings-panel p-4 sm:p-5 xl:col-span-2">
              <div className="settings-kicker">Workspace</div>
              <h2 className="text-lg font-semibold tracking-tight mt-1">Dashboard Preferences</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Control default views, export branding, notifications, and working density.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="micro-label">Default Dashboard</Label>
                  <Select value={prefs.default_dashboard} onValueChange={v => setPrefs(p => ({ ...p, default_dashboard: v }))}>
                    <SelectTrigger className="settings-field"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/finance/dashboard">Overview</SelectItem>
                      <SelectItem value="/ledger">Ledger</SelectItem>
                      <SelectItem value="/projects">Projects</SelectItem>
                      <SelectItem value="/checks">Checks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Density</Label>
                  <Select value={prefs.dashboard_density} onValueChange={v => setPrefs(p => ({ ...p, dashboard_density: v }))}>
                    <SelectTrigger className="settings-field"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="expanded">Expanded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="micro-label">Date Format</Label>
                  <Select value={prefs.date_format} onValueChange={v => setPrefs(p => ({ ...p, date_format: v }))}>
                    <SelectTrigger className="settings-field"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="MMM D, YYYY">MMM D, YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="micro-label">PDF Brand Name</Label>
                  <Input value={prefs.pdf_branding} onChange={e => setPrefs(p => ({ ...p, pdf_branding: e.target.value }))} className="settings-field" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="micro-label">Export Footer</Label>
                  <Input value={prefs.export_footer} onChange={e => setPrefs(p => ({ ...p, export_footer: e.target.value }))} className="settings-field" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                {[
                  ['notify_email', 'Email Alerts', 'Important finance and portal changes'],
                  ['notify_audit', 'Audit Alerts', 'Signed corrections and record edits'],
                  ['notify_reconcile', 'Reconcile Alerts', 'Missing docs, categories, and open items'],
                ].map(([key, label, sub]) => {
                  const active = Boolean(prefs[key as keyof WorkspacePrefs]);
                  return (
                    <button key={key} data-active={active} onClick={() => setPrefs(p => ({ ...p, [key]: !active }))} className="settings-toggle">
                      <Bell className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">{label}</span>
                        <span className="block text-[10px] text-muted-foreground">{sub}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
              <button onClick={saveWorkspace} disabled={savingWorkspace} className="settings-primary mt-4">
                <Settings2 className="w-3.5 h-3.5" /> {savingWorkspace ? 'Saving' : 'Save Workspace'}
              </button>
            </section>

            <section className="settings-panel p-4 sm:p-5">
              <div className="settings-kicker">Entity</div>
              <h2 className="text-lg font-semibold tracking-tight mt-1">Accounting Foundation</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Initialize defaults for the active operating entity.</p>
              <div className="settings-card p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 border border-border bg-secondary/40 flex items-center justify-center">
                    <Landmark className="w-4 h-4" style={{ color: entity?.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{entity?.name || 'No entity selected'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{entity?.category || 'Select an entity first'}</div>
                  </div>
                </div>
                <Button
                  disabled={!entity || ensureAccounting.isPending}
                  onClick={async () => {
                    try {
                      await ensureAccounting.mutateAsync();
                      toast.success('Accounting foundation initialized');
                    } catch (e: any) {
                      toast.error(e?.message || 'Unable to initialize accounting foundation');
                    }
                  }}
                  className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90 w-full mt-3"
                >
                  {ensureAccounting.isPending ? 'Initializing...' : 'Initialize Accounting Core'}
                </Button>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="settings-panel p-4 sm:p-5">
              <div className="settings-kicker">Appearance</div>
              <h2 className="text-lg font-semibold tracking-tight mt-1 mb-4">Theme</h2>
              <div className="grid grid-cols-1 gap-2">
                {THEMES.map(t => {
                  const active = theme === t.id;
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)} data-active={active} className="settings-toggle">
                      <span className="w-8 h-8 border border-border flex items-center justify-center shrink-0" style={{ backgroundColor: t.bg }}>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">{t.name}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">{t.desc}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="settings-panel p-4 sm:p-5 xl:col-span-2">
              <div className="settings-kicker">Integrations</div>
              <h2 className="text-lg font-semibold tracking-tight mt-1">Payments & Export Systems</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Connect payment links and keep export workflows available for finance operations.</p>
              <div className="settings-card p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#635BFF] flex items-center justify-center text-white text-[10px] font-black">S</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Stripe</div>
                    <div className="text-[10px] text-muted-foreground">Used for invoice/payment-link workflows</div>
                  </div>
                  {cfg.stripe_secret_key && <span className="text-[8px] uppercase tracking-[0.16em] font-bold text-positive">Connected</span>}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input type={showKey ? 'text' : 'password'} value={stripeKey} onChange={e => setStripeKey(e.target.value)} placeholder="sk_live_... or sk_test_..." className="settings-field font-mono-tab text-xs pr-10" />
                    <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button onClick={saveStripe} className="settings-primary">Save</button>
                  <button onClick={testStripe} disabled={testingStripe} className="settings-action">
                    <Zap className="w-3.5 h-3.5" /> {testingStripe ? 'Testing' : 'Test'}
                  </button>
                </div>
                <div className="text-[9px] text-muted-foreground leading-relaxed bg-secondary/35 p-2.5">
                  Use a restricted Stripe key where possible. Current app behavior stores this key through the existing integration settings path.
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                {[
                  ['QuickBooks', 'CSV invoice exports', ReceiptText],
                  ['Square', 'CSV invoice exports', FileSpreadsheet],
                  ['Any System', 'JSON and spreadsheet exports', Database],
                ].map(([label, sub, Icon]) => (
                  <div key={String(label)} className="settings-card p-3">
                    <Icon className="w-4 h-4 mb-2 text-muted-foreground" />
                    <div className="text-xs font-semibold">{label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="settings-panel p-4 sm:p-5">
            <div className="settings-kicker">Operations</div>
            <h2 className="text-lg font-semibold tracking-tight mt-1 mb-4">Data, Compliance & Navigation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {[
                { label: 'Finance Changelog', sub: 'Review signed corrections and audit history', icon: History, to: '/changelog' },
                { label: 'Ledger Register', sub: 'Inspect, edit, reconcile, export records', icon: Database, to: '/ledger' },
                { label: 'Admin Dashboard', sub: 'Manage users, portal records, and operations', icon: LockKeyhole, to: '/admin' },
                { label: 'Houston Enterprise Website', sub: 'Open the public website', icon: Globe, to: '/' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.to)} className="settings-toggle">
                  <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{item.sub}</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
