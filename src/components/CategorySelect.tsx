import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Category dropdown with an inline "Add custom" escape hatch for one-off categories. */
export function CategorySelect({ value, onChange, options, disabled = false }: { value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');
  if (custom) {
    return (
      <div className="flex gap-2">
        <Input value={customVal} onChange={e => setCustomVal(e.target.value)} placeholder="Type custom category..." className="rounded-none h-10 flex-1 text-sm" />
        <button type="button" onClick={() => { if (customVal.trim()) { onChange(customVal.trim()); setCustomVal(''); setCustom(false); } }} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs">Set</button>
        <button type="button" onClick={() => setCustom(false)} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"><X className="w-3 h-3" /></button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            {value && !options.includes(value) && <SelectItem value={value}>{value}</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      {!disabled && (
        <button type="button" onClick={() => setCustom(true)} className="px-3 border border-border hover:bg-secondary/50 transition-colors text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
          <Plus className="w-3 h-3" /> Add
        </button>
      )}
    </div>
  );
}
