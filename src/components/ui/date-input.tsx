import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type DateInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, onClick, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const openPicker = () => {
      const input = innerRef.current;
      if (!input) return;
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.focus();
      } catch {
        input.focus();
      }
    };

    return (
      <div
        className="group relative"
        onClick={e => {
          openPicker();
          onClick?.(e as any);
        }}
      >
        <Input
          {...props}
          ref={setRefs}
          type="date"
          onFocus={openPicker}
          className={cn(
            'rounded-none h-11 pr-10 cursor-pointer appearance-none bg-background font-mono-tab text-left',
            '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
            className,
          )}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center border border-border bg-secondary/60 text-muted-foreground transition-colors group-focus-within:border-foreground/40 group-focus-within:text-foreground">
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
      </div>
    );
  },
);
DateInput.displayName = 'DateInput';
