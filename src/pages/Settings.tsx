import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });
      if (error) throw error;
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage your account and preferences." />

      <div className="px-4 sm:px-8 py-6 max-w-2xl space-y-8">
        {/* Profile Section */}
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
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="rounded-none h-11"
                placeholder="Your full name"
              />
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="rounded-none h-9 text-xs bg-foreground text-background hover:opacity-90"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </section>

        {/* Account Section */}
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
              <Button
                variant="outline"
                size="sm"
                className="rounded-none h-8 text-[10px]"
                onClick={async () => {
                  await signOut();
                  window.location.href = '/auth';
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="border border-border p-5">
          <div className="micro-label mb-4">Preferences</div>
          <div className="text-sm text-muted-foreground">
            Additional preferences coming soon — currency format, default view, notification settings.
          </div>
        </section>
      </div>
    </AppShell>
  );
}