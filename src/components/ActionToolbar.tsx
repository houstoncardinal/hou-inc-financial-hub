import { useNavigate } from 'react-router-dom';
import { FileText, ArrowDownToLine, ArrowUpFromLine, BookOpen, FolderKanban, Users, Zap, ConciergeBell } from 'lucide-react';

const actions = [
  { to: '/income', label: 'Log Income', description: 'Record new revenue', icon: ArrowDownToLine, highlight: true },
  { to: '/expenses', label: 'Record Expense', description: 'Log outgoing payment', icon: ArrowUpFromLine, highlight: false },
  { to: '/checks/new', label: 'New Check', description: 'Issue a new check', icon: FileText, highlight: false },
  { to: '/vendors', label: 'Add Vendor', description: 'New vendor entry', icon: Users, highlight: false },
  { to: '/projects', label: 'New Project', description: 'Create a project', icon: FolderKanban, highlight: false },
  { to: '/concierge', label: 'Concierge', description: 'Guided assistant', icon: ConciergeBell, highlight: false },
  { to: '/ledger', label: 'View Ledger', description: 'Full transaction view', icon: BookOpen, highlight: false },
];

export default function ActionToolbar({ className = '' }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-border border border-border">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className={`flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-background hover:bg-secondary/30 active:bg-secondary transition-all duration-200 group min-w-0 ${
              a.highlight ? 'ring-1 ring-inset ring-foreground/10 bg-foreground/[0.02]' : ''
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center transition-all duration-200 group-hover:scale-110 ${
              a.highlight ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground group-hover:text-foreground'
            }`}>
              <a.icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold tracking-tight text-foreground group-hover:text-foreground transition-colors leading-tight text-center">
              {a.label}
            </span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-[0.1em] leading-tight text-center hidden sm:block">
              {a.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}