import { fmtDate, fmtUSD, amountToWords } from '@/lib/format';

interface Props {
  checkNumber: string;
  payee: string;
  amount: number;
  date: string;
  memo?: string | null;
  status: 'pending' | 'cleared' | 'voided';
}

export default function DigitalCheck({ checkNumber, payee, amount, date, memo, status }: Props) {
  const statusColor = status === 'cleared' ? 'text-positive border-positive/40' : status === 'voided' ? 'text-accent border-accent/40' : 'text-muted-foreground border-border';
  return (
    <div className="bg-background border border-border relative font-mono-tab">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-accent" />
      <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 border" >
        <span className={statusColor}>{status}</span>
      </div>
      <div className="p-7 pl-9 grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">HOU INC</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Construction · Operating Account</div>
          </div>
          <div>
            <div className="micro-label mb-1">Pay to the order of</div>
            <div className="text-xl font-semibold tracking-tight border-b border-foreground pb-1">{payee || '—'}</div>
          </div>
          <div>
            <div className="micro-label mb-1">Amount in words</div>
            <div className="text-xs text-foreground border-b border-dashed border-border pb-1">{amountToWords(amount)} Dollars</div>
          </div>
        </div>
        <div className="col-span-5 space-y-5">
          <div className="text-right">
            <div className="micro-label">Check №</div>
            <div className="text-base font-semibold tracking-wider">{checkNumber || '—'}</div>
          </div>
          <div className="text-right">
            <div className="micro-label">Date</div>
            <div className="text-sm">{fmtDate(date)}</div>
          </div>
          <div className="ml-auto w-fit border border-foreground px-4 py-2">
            <div className="micro-label text-right">USD</div>
            <div className="text-2xl font-semibold tracking-tight">{fmtUSD(amount)}</div>
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-2 gap-6 pt-4 border-t border-border">
          <div>
            <div className="micro-label mb-1">Memo</div>
            <div className="text-xs text-muted-foreground border-b border-dashed border-border pb-1 min-h-[18px]">{memo || '—'}</div>
          </div>
          <div className="text-right">
            <div className="micro-label mb-1">Authorized Signature</div>
            <div className="text-xs italic text-muted-foreground border-b border-foreground pb-1 min-h-[18px]">HOU INC</div>
          </div>
        </div>
        <div className="col-span-12 pt-3 text-[10px] tracking-[0.3em] text-muted-foreground/60 font-mono">
          ⑈ {checkNumber.padStart(10, '0')} ⑈   :000000000:   0000000000⑈
        </div>
      </div>
    </div>
  );
}
