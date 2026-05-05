import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await onCreateNew(newName.trim());
      onValueChange(result.id);
      setShowCreate(false);
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
        <Select
          value={value}
          onValueChange={v => {
            if (v === '__create__') {
              setShowCreate(true);
            } else {
              onValueChange(v);
            }
          }}
        >
          <SelectTrigger className="rounded-none">
            <SelectValue placeholder={placeholder ?? `Select ${entityLabel}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
            {options.length > 0 && <div className="border-t border-border my-1" />}
            <SelectItem value="__create__" className="font-medium">
              <span className="flex items-center gap-1.5 text-accent">
                <Plus className="w-3 h-3" />
                New {entityLabel}…
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="border border-accent/30 bg-accent/[0.04] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Plus className="w-3 h-3 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-accent font-medium">
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
