import { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="px-8 py-6 flex items-end justify-between gap-6">
        <div className="space-y-1.5">
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
