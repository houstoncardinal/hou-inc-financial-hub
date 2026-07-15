import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { moneyInputString, normalizeMoneyText, parseMoneyInput } from '@/lib/money';

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: string | number;
  onValueChange: (value: string) => void;
  onNumberChange?: (value: number) => void;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onNumberChange, className, onBlur, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => moneyInputString(value));

    React.useEffect(() => {
      setDisplay(moneyInputString(value));
    }, [value]);

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono-tab text-muted-foreground pointer-events-none select-none z-10">$</span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={e => {
            const next = normalizeMoneyText(e.target.value);
            setDisplay(next);
            const numeric = parseMoneyInput(next);
            onValueChange(next ? String(numeric) : '');
            onNumberChange?.(numeric);
          }}
          onBlur={e => {
            const numeric = parseMoneyInput(display);
            const next = numeric ? moneyInputString(numeric) : '';
            setDisplay(next);
            onValueChange(next ? String(numeric) : '');
            onNumberChange?.(numeric);
            onBlur?.(e);
          }}
          // pl-8/pr-3 are appended AFTER className on purpose: twMerge only
          // evicts a narrower padding-left/-right utility when a wider
          // padding-x utility appears after it, never the reverse, so a
          // caller's px-3 (e.g. our shared form-field style) would otherwise
          // silently delete our left padding and the "$" would sit on top of
          // the digits. Appending pl-8/pr-3 last guarantees they win the
          // cascade (Tailwind also emits those rules after px-* in the
          // generated stylesheet, so this matches what actually renders).
          // Everything else stays before className so callers can still
          // override height/border/etc. to match sibling fields in a row.
          className={cn('rounded-none h-10 font-mono-tab text-left tabular-nums', className, 'pl-8 pr-3')}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';

