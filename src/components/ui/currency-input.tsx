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
          className={cn('pl-7 rounded-none h-10 font-mono-tab text-left tabular-nums', className)}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';

