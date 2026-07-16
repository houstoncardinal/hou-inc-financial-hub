// Shared visual language for the redesigned Overview tab and Reconciliation
// Summary sub-tab ONLY — deliberately separate from pd-panel/pd-intel-card so
// the rest of the detailed project view (Documents/Photos/Activity tabs,
// Reconciliation's other sub-tabs) is untouched.
export const PDV2_CSS = `
.pdv2-card{background:hsl(var(--background));border:1px solid hsl(var(--border));border-radius:12px;box-shadow:0 1px 2px rgba(10,10,10,0.04),0 4px 16px rgba(10,10,10,0.035);transition:box-shadow .2s ease,border-color .2s ease,transform .2s ease;}
.pdv2-card:hover{box-shadow:0 2px 6px rgba(10,10,10,0.06),0 10px 28px rgba(10,10,10,0.06);border-color:hsl(var(--foreground)/0.14);}
.pdv2-card-header{padding:13px 16px;border-bottom:1px solid hsl(var(--border));}
.pdv2-label{font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:700;color:hsl(var(--muted-foreground));}
.pdv2-link{font-size:10px;font-weight:700;color:#9D7E3F;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;transition:gap .15s ease;}
.pdv2-link:hover{opacity:.75;gap:5px;}

/* Stat-card trend delta chip (e.g. "+12.3%") */
.pdv2-trend-up{color:#10b981;background:rgba(16,185,129,0.1);}
.pdv2-trend-down{color:#ef4444;background:rgba(239,68,68,0.1);}
.pdv2-trend-flat{color:hsl(var(--muted-foreground));background:hsl(var(--secondary)/0.6);}

/* Icon chip used in card headers / activity rows */
.pdv2-icon-chip{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

/* Row hover used in mini-tables / activity / documents lists */
.pdv2-row-hover:hover{background:hsl(var(--secondary)/0.4);}

.dark .pdv2-card{background:hsl(var(--card));box-shadow:0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.18);}
.dark .pdv2-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.4),0 12px 32px rgba(0,0,0,0.28);}
`;
