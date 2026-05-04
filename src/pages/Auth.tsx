import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success('Account created. You may sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-foreground text-background p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-accent" />
            <span className="text-sm tracking-[0.3em] uppercase">HOU INC</span>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-5xl font-semibold tracking-tight leading-[1.05]">Financial Operating System</h1>
          <p className="text-base text-background/60 leading-relaxed">A private command center for capital movement, project exposure, and instrument issuance.</p>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-background/40">Restricted Access · Internal Use Only</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="micro-label">Secure Sign-In</div>
            <h2 className="text-2xl font-semibold tracking-tight">{mode === 'signin' ? 'Access account' : 'Create account'}</h2>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="micro-label">Email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="rounded-none h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="micro-label">Password</Label>
              <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="rounded-none h-11" />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-none h-11 bg-foreground hover:bg-foreground/90">
              {busy ? '...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
            {mode === 'signin' ? 'No account? Request access →' : '← Back to sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
