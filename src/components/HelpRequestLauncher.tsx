import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { useCreateHelpRequest, HELP_CATEGORY_LABELS, type HelpRequestCategory } from '@/hooks/useHelpRequests';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LifeBuoy, Camera, Loader2 } from 'lucide-react';

// Keep in sync with FINANCE_ROLES in App.tsx — the shortcut is for internal
// staff using the finance/admin app, not portal clients or anonymous visitors.
const INTERNAL_ROLES = new Set(['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer']);

const CATEGORY_OPTIONS: HelpRequestCategory[] = ['stuck', 'bug', 'feature_request', 'question', 'other'];

/**
 * Typing "help" anywhere on an internal page (not while focused in a form
 * field) captures a screenshot of the current view via html2canvas — no
 * browser permission prompt, unlike getDisplayMedia — and opens a short
 * form. Submissions land in admin_help_requests, visible in real time to
 * the support admin's /admin → Help Requests tab (RLS-enforced there, not
 * just UI-hidden here).
 */
export default function HelpRequestLauncher() {
  const { user } = useAuth();
  const { entity } = useEntity();
  const location = useLocation();
  const createHelpRequest = useCreateHelpRequest();

  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<{ blob: Blob; url: string } | null>(null);
  const [category, setCategory] = useState<HelpRequestCategory>('stuck');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const screenshotUrlRef = useRef<string | null>(null);
  const launchingRef = useRef(false);

  const eligible = !!user && INTERNAL_ROLES.has(user.role);

  const launch = async () => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setCapturing(true);
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        ignoreElements: el => el.hasAttribute('data-help-launcher-ignore'),
      });
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.85));
      if (blob) {
        const url = URL.createObjectURL(blob);
        screenshotUrlRef.current = url;
        setScreenshot({ blob, url });
      } else {
        setScreenshot(null);
      }
    } catch {
      setScreenshot(null); // still let them file the request without a screenshot
    } finally {
      setCapturing(false);
      setCategory('stuck');
      setMessage('');
      setOpen(true);
      launchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!eligible) return;
    let buffer = '';
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-4);
      clearTimeout(timer);
      timer = setTimeout(() => { buffer = ''; }, 1000);
      if (buffer === 'help') {
        buffer = '';
        void launch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  useEffect(() => () => { if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current); }, []);

  const close = () => {
    setOpen(false);
    if (screenshotUrlRef.current) { URL.revokeObjectURL(screenshotUrlRef.current); screenshotUrlRef.current = null; }
    setScreenshot(null);
  };

  const submit = async () => {
    if (!message.trim()) { toast.error("Tell us a little about what you need"); return; }
    setSubmitting(true);
    try {
      await createHelpRequest.mutateAsync({
        category,
        message: message.trim(),
        pagePath: location.pathname + location.search,
        pageTitle: document.title,
        entityId: entity?.id ?? null,
        screenshotBlob: screenshot?.blob ?? null,
        viewport: { width: window.innerWidth, height: window.innerHeight, userAgent: navigator.userAgent },
      });
      toast.success("Help request sent — our team will follow up shortly.");
      close();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send your help request. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!eligible) return null;

  return (
    <>
      {capturing && (
        <div data-help-launcher-ignore className="fixed inset-0 z-[999] bg-background/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 border border-border bg-background shadow-lg text-xs font-semibold uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.7} /> Capturing your screen…
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent data-help-launcher-ignore className="rounded-none max-w-lg w-[calc(100%-2rem)]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.28em] font-black text-[#9D7E3F]">
              <LifeBuoy className="w-3.5 h-3.5" strokeWidth={1.7} /> Instant Help
            </div>
            <DialogTitle className="text-base font-semibold tracking-tight">What do you need help with?</DialogTitle>
            <p className="text-xs text-muted-foreground">We grabbed a screenshot of what you're looking at — describe what's going on and we'll take it from here.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {screenshot && (
              <div className="border border-border overflow-hidden">
                <img src={screenshot.url} alt="Screen capture" className="w-full max-h-56 object-cover object-top" />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="micro-label">What's going on?</div>
              <Select value={category} onValueChange={v => setCategory(v as HelpRequestCategory)}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{HELP_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="micro-label">Tell us more</div>
              <Textarea
                className="rounded-none"
                rows={4}
                autoFocus
                placeholder="What were you trying to do? What happened instead?"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-none h-10" onClick={close}>Cancel</Button>
            <Button
              className="rounded-none h-10 bg-foreground text-background hover:opacity-90"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" strokeWidth={1.7} />Sending…</> : 'Send Help Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
