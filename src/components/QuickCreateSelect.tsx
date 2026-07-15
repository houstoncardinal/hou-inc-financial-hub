import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
}

interface QuickCreateSelectProps {
  value: string;
  onValueChange: (id: string) => void;
  options: Option[];
  placeholder?: string;
  entityLabel: string;
  onCreateNew: (name: string) => Promise<{ id: string; name: string }>;
  className?: string;
}

export function QuickCreateSelect({
  value,
  onValueChange,
  options,
  placeholder,
  entityLabel,
  onCreateNew,
  className,
}: QuickCreateSelectProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdOptions, setCreatedOptions] = useState<Option[]>([]);
  const mergedOptions = useMemo(() => {
    const byId = new Map<string, Option>();
    [...options, ...createdOptions].forEach(option => {
      if (option?.id) byId.set(option.id, option);
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [createdOptions, options]);
  const selected = mergedOptions.find(o => o.id === value);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await onCreateNew(newName.trim());
      setCreatedOptions(prev => [...prev.filter(o => o.id !== result.id), result]);
      onValueChange(result.id);
      setShowCreate(false);
      setOpen(false);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const cancel = () => {
    setShowCreate(false);
    setNewName('');
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {!showCreate ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-10 w-full justify-between rounded-none px-3 text-left font-normal"
            >
              <span className={cn('min-w-0 truncate', !selected && 'text-muted-foreground')}>
                {selected?.name ?? placeholder ?? `Select ${entityLabel}`}
              </span>
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.5} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[160] w-[min(92vw,26rem)] p-0 rounded-none border-border shadow-[0_24px_80px_rgba(0,0,0,0.24)]" align="start">
            <Command>
              <CommandInput placeholder={`Search ${entityLabel.toLowerCase()}...`} className="h-10" />
              <CommandList className="max-h-64">
                <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                  No {entityLabel.toLowerCase()} found.
                </CommandEmpty>
                <CommandGroup heading={entityLabel}>
                  {mergedOptions.map(option => (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => {
                        onValueChange(option.id);
                        setOpen(false);
                      }}
                      className="rounded-none"
                    >
                      <Check className={cn('mr-2 h-3.5 w-3.5', value === option.id ? 'opacity-100' : 'opacity-0')} strokeWidth={1.8} />
                      <span className="truncate">{option.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <div className="border-t border-border p-1.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-[#f7f3ea] dark:hover:bg-white/10"
                  onClick={() => {
                    setShowCreate(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New {entityLabel}
                </button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="border border-[#eadfce] bg-[#fbf8f2] p-3 space-y-2.5 dark:border-white/15 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Plus className="w-3 h-3 text-foreground" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-foreground font-medium">
                New {entityLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={cancel}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <Input
            placeholder={`${entityLabel} name`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="rounded-none h-8 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
              if (e.key === 'Escape') cancel();
            }}
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-none h-7 text-xs px-3"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
            >
              {creating && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Create {entityLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none h-7 text-xs"
              onClick={cancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
