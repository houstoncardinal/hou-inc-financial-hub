import { ReactNode } from 'react';

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-row items-start sm:items-end justify-between gap-3 sm:gap-6">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl hidden sm:block">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
