import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, THEMES } from '@/hooks/useTheme';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import { Check, Eye, EyeOff, Zap, ShieldCheck } from 'lucide-react';
import { DEFAULT_EMAIL, DEFAULT_PASS } from '@/hooks/useAuth';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { cfg, save: saveIntegrations } = useIntegrations();

  const [displayName,    setDisplayName]    = useState(user?.user_metadata?.full_name || '');
  const [saving,         setSaving]         = useState(false);
  const [stripeKey,      setStripeKey]      = useState(cfg.stripe_secret_key);
  const [showKey,        setShowKey]        = useState(false);
  const [testingStripe,  setTestingStripe]  = useState(false);

  const getStoredCreds = () => {
    try { return JSON.parse(localStorage.getItem('hou-admin-creds') || '{}'); } catch { return {}; }
  };
  const [newEmail,    setNewEmail]    = useState(() => getStoredCreds().email    || DEFAULT_EMAIL);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw,   setShowNewPw]   = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    localStorage.setItem('hou-display-name', displayName);
    toast.success('Profile updated');
    setSaving(false);
  };

  const saveStripe = () => {
    saveIntegrations({ stripe_secret_key: stripeKey });
    toast.success('Stripe key saved');
  };

  const testStripe = async () => {
    if (!stripeKey) { toast.error('Enter your Stripe secret key first'); return; }
    setTestingStripe(true);
    try {
      const res = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid key');
      toast.success(`Connected · ${data.display_name || data.id}`);
    } catch (e: any) {
      toast.error(`Stripe error: ${e.message}`);
    } finally {
      setTestingStripe(false);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage your account, appearance, and integrations." />

      <div className="px-4 sm:px-8 py-6 max-w-2xl space-y-8">

        {/* Profile */}
        <section className="border border-border p-5">
          <div className="micro-label mb-4">Profile</div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-semibold">
                {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{displayName || 'User'}</div>
                <div className="text-xs text-muted-foreground font-mono-tab">{user?.email}</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-none h-11" placeholder="Your full name" />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </section>

        {/* Account */}
        <section className="border border-border p-5">
          <div className="micro-label mb-4">Account</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-xs text-muted-foreground font-mono-tab">{user?.email}</div>
              </div>
              <div className="text-[10px] text-positive uppercase tracking-wider font-medium">Verified</div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Session</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px]" onClick={async () => { await signOut(); window.location.href = '/auth'; }}>
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="micro-label">Security</div>
            <ShieldCheck className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-xs text-muted-foreground mb-5">Update the credentials used to sign into the Finance Dashboard.</div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="micro-label">Login Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="rounded-none h-10 font-mono-tab text-sm"
                placeholder={DEFAULT_EMAIL}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">New Password <span className="normal-case tracking-normal font-normal text-muted-foreground">(leave blank to keep current)</span></Label>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="rounded-none h-10 pr-10"
                  placeholder="Enter new password…"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <Button
              disabled={savingCreds}
              onClick={() => {
                setSavingCreds(true);
                const current = getStoredCreds();
                const updated = {
                  email:    newEmail.trim() || DEFAULT_EMAIL,
                  password: newPassword || current.password || DEFAULT_PASS,
                };
                localStorage.setItem('hou-admin-creds', JSON.stringify(updated));
                setSavingCreds(false);
                setNewPassword('');
                toast.success('Credentials updated. Use them at next sign-in.');
              }}
              className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90"
            >
              {savingCreds ? 'Saving…' : 'Update Credentials'}
            </Button>
          </div>
        </section>

        {/* Appearance */}
        <section className="border border-border p-5">
          <div className="micro-label mb-1">Appearance</div>
          <div className="text-xs text-muted-foreground mb-5">Choose a visual theme that suits your style.</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THEMES.map(t => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative flex items-center gap-3.5 p-3.5 border transition-all duration-200 text-left ${
                    active ? 'border-foreground bg-secondary/40' : 'border-border hover:border-foreground/40 hover:bg-secondary/20'
                  }`}
                >
                  <div className="w-9 h-9 shrink-0 border border-black/10 flex items-center justify-center" style={{ backgroundColor: t.bg }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold tracking-tight truncate">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{t.desc}</div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-foreground shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Integrations */}
        <section className="border border-border p-5">
          <div className="micro-label mb-1">Integrations</div>
          <div className="text-xs text-muted-foreground mb-5">
            Connect your invoicing to external platforms. Keys are stored locally on your device only.
          </div>

          <div className="space-y-5">
            {/* Stripe */}
            <div className="border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#635BFF] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">S</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">Stripe</div>
                  <div className="text-[10px] text-muted-foreground">Create payment links directly from invoices</div>
                </div>
                {cfg.stripe_secret_key && (
                  <span className="ml-auto text-[9px] text-positive uppercase tracking-wider font-medium border border-positive/30 bg-positive/10 px-1.5 py-0.5">Connected</span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="micro-label">Secret Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={stripeKey}
                      onChange={e => setStripeKey(e.target.value)}
                      placeholder="sk_live_… or sk_test_…"
                      className="rounded-none h-10 font-mono-tab text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button onClick={saveStripe} className="rounded-none h-10 text-xs bg-foreground text-background hover:opacity-90 shrink-0">
                    Save
                  </Button>
                  <Button variant="outline" onClick={testStripe} disabled={testingStripe} className="rounded-none h-10 text-xs shrink-0">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    {testingStripe ? 'Testing…' : 'Test'}
                  </Button>
                </div>
              </div>

              <div className="text-[9px] text-muted-foreground leading-relaxed bg-secondary/40 p-2.5">
                <span className="font-semibold">Recommended:</span> Use a Restricted Key with{' '}
                <span className="font-mono-tab">payment_links:write</span> and <span className="font-mono-tab">products:write</span> permissions only.
                Keys are stored in your browser's localStorage and never sent to any server other than Stripe's API.
              </div>
            </div>

            {/* QuickBooks */}
            <div className="border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2CA01C] flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-bold">QB</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">QuickBooks Online</div>
                  <div className="text-[10px] text-muted-foreground">Export invoices as QBO-compatible CSV</div>
                </div>
                <span className="ml-auto text-[9px] text-positive uppercase tracking-wider font-medium border border-positive/30 bg-positive/10 px-1.5 py-0.5">Ready</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                No API key needed. On any invoice, click <span className="font-semibold">QuickBooks</span> to download a CSV.
                In QBO: <span className="font-mono-tab">Sales → Invoices → Import</span> → select the file.
              </div>
            </div>

            {/* Square */}
            <div className="border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#3E4348] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">■</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">Square</div>
                  <div className="text-[10px] text-muted-foreground">Export invoices as Square-compatible CSV</div>
                </div>
                <span className="ml-auto text-[9px] text-positive uppercase tracking-wider font-medium border border-positive/30 bg-positive/10 px-1.5 py-0.5">Ready</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                No API key needed. On any invoice, click <span className="font-semibold">Square</span> to download a CSV.
                In Square: <span className="font-mono-tab">Invoices → ⋯ → Import Invoices</span> → select the file.
              </div>
            </div>

            {/* Generic */}
            <div className="border border-border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-muted-foreground text-[9px] font-bold font-mono-tab">{ }</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">Any Other System</div>
                  <div className="text-[10px] text-muted-foreground">JSON export for Xero, FreshBooks, Wave, Zoho, custom APIs</div>
                </div>
                <span className="ml-auto text-[9px] text-positive uppercase tracking-wider font-medium border border-positive/30 bg-positive/10 px-1.5 py-0.5">Ready</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                Download a structured JSON file from any invoice and paste it into your system's API or import tool.
              </div>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
