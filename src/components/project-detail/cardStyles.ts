// Shared visual language for the redesigned Overview tab and Reconciliation
// Summary sub-tab ONLY — deliberately separate from pd-panel/pd-intel-card so
// the rest of the detailed project view (Documents/Photos/Activity tabs,
// Reconciliation's other sub-tabs) is untouched.
export const PDV2_CSS = `
.pdv2-card{background:hsl(var(--background));border:1px solid hsl(var(--border));border-radius:12px;box-shadow:0 1px 2px rgba(10,10,10,0.04),0 4px 16px rgba(10,10,10,0.035);}
.pdv2-card-header{padding:13px 16px;border-bottom:1px solid hsl(var(--border));}
.pdv2-label{font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:700;color:hsl(var(--muted-foreground));}
.pdv2-link{font-size:10px;font-weight:700;color:#9D7E3F;white-space:nowrap;}
.pdv2-link:hover{opacity:.75;}
.dark .pdv2-card{background:hsl(var(--card));box-shadow:0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.18);}
`;
