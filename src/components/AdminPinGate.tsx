import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ADMIN_KEY, ADMIN_PIN } from '@/lib/adminAccess';

const SERIF = "'Cormorant Garamond', Georgia, serif";

/** Same PIN-entry screen as Admin.tsx, reused for other /admin-perimeter pages. */
export function AdminPinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(ADMIN_KEY) === '1');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handlePinDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...pin]; next[idx] = digit; setPin(next); setPinError('');
    if (digit && idx < 5) pinRefs[idx + 1].current?.focus();
    if (next.every(d => d !== '')) {
      const entered = next.join('');
      if (entered === ADMIN_PIN) { localStorage.setItem(ADMIN_KEY, '1'); setUnlocked(true); }
      else { setPinError('Incorrect PIN. Please try again.'); setPin(['', '', '', '', '', '']); setTimeout(() => pinRefs[0].current?.focus(), 50); }
    }
  };
  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (pin[idx]) { const next = [...pin]; next[idx] = ''; setPin(next); }
      else if (idx > 0) pinRefs[idx - 1].current?.focus();
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/40">
      <motion.div className="w-full max-w-sm relative bg-background border border-border rounded-xl overflow-hidden shadow-xl"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="h-[3px] bg-accent" />
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-9">
            <div className="w-px h-8 bg-accent" />
            <div>
              <div className="text-[9px] font-black tracking-[0.18em] uppercase text-foreground" style={{ fontFamily: SERIF }}>Houston Enterprise</div>
              <div className="text-[7px] uppercase tracking-[0.42em] text-accent">Admin Dashboard · Secure Access</div>
            </div>
          </div>
          <div className="text-[28px] font-bold text-foreground leading-tight mb-1.5">Admin Access</div>
          <p className="text-[12px] text-muted-foreground mb-8">Enter your 6-digit PIN to access the dashboard.</p>
          <div className="mb-2">
            <label className="block text-[9px] uppercase tracking-[0.32em] font-bold text-muted-foreground mb-4">Admin PIN</label>
            <div className="flex gap-2 justify-between">
              {pin.map((digit, i) => (
                <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={digit} autoFocus={i === 0}
                  onChange={e => handlePinDigit(i, e.target.value)} onKeyDown={e => handlePinKeyDown(i, e)}
                  className={`outline-none text-center text-[20px] font-bold rounded-lg text-foreground transition-colors ${digit ? 'border-2 border-accent bg-accent/5' : 'border-2 border-border bg-background focus:border-accent'}`}
                  style={{ width: 44, height: 52, flexShrink: 0, caretColor: 'transparent' }}
                />
              ))}
            </div>
          </div>
          {pinError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] mt-3 mb-0 text-destructive">{pinError}</motion.p>}
          <div className="mt-8 pt-6 border-t border-border">
            <Link to="/admin" className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground hover:text-foreground transition-colors">← Back to Admin</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
