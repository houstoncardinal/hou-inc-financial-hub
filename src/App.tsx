import { useEffect, lazy, Suspense } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Protected from "@/components/Protected";
import RoleGuard from "@/components/RoleGuard";
import { EntityProvider, useEntity } from "@/contexts/EntityContext";
import { entityHasModule, type FinanceModuleKey } from "@/lib/entityFinance";
import { isSchemaCacheError, recordSystemHealthEvent } from "@/lib/systemHealth";
import HelpRequestLauncher from "@/components/HelpRequestLauncher";

/* Suspense fallback while a lazy-loaded route chunk fetches — brief and
   unobtrusive, since this only shows on the first visit to a given route
   (the chunk is cached by the browser after that). */
function RouteLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2.5px solid #E5E7EB', borderTopColor: '#111827',
        animation: 'route-loader-spin 0.7s linear infinite',
      }} />
      <style>{'@keyframes route-loader-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
  return null;
}

function GlobalShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    let buffer = '';
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      buffer += e.key.toLowerCase();
      clearTimeout(timer);
      timer = setTimeout(() => { buffer = ''; }, 1000);
      if (buffer.endsWith('ops')) { navigate('/ops'); buffer = ''; }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer); };
  }, [navigate]);
  return null;
}

/* Every route below is lazy-loaded (React.lazy + <Suspense> further down) so
   the initial JS bundle only ships the app shell — each page's code splits
   into its own chunk fetched on first visit, instead of one ~8MB bundle
   containing all ~55 pages regardless of which one the user actually opens. */

// Public website
const Home          = lazy(() => import("./pages/public/Home"));
const Services      = lazy(() => import("./pages/public/Services"));
const ServiceDetail = lazy(() => import("./pages/public/ServiceDetail"));
const ResidentialConstruction = lazy(() => import("./pages/public/ResidentialConstruction"));
const CommercialConstruction = lazy(() => import("./pages/public/CommercialConstruction"));
const ProjectManagementServices = lazy(() => import("./pages/public/ProjectManagementServices"));
const Portfolio     = lazy(() => import("./pages/public/Portfolio"));
const PortfolioDetail = lazy(() => import("./pages/public/PortfolioDetail"));
const About         = lazy(() => import("./pages/public/About"));
const Contact       = lazy(() => import("./pages/public/Contact"));
const StartProject  = lazy(() => import("./pages/public/StartProject"));

// Client portal
const PortalAuth      = lazy(() => import("./pages/portal/PortalAuth"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalProject   = lazy(() => import("./pages/portal/PortalProject"));
const PortalMessages   = lazy(() => import("./pages/portal/PortalMessages"));
const PortalDocuments  = lazy(() => import("./pages/portal/PortalDocuments"));
const PortalMeetings   = lazy(() => import("./pages/portal/PortalMeetings"));
const PortalProjects   = lazy(() => import("./pages/portal/PortalProjects"));
const PortalMilestones = lazy(() => import("./pages/portal/PortalMilestones"));
const PortalPayments   = lazy(() => import("./pages/portal/PortalPayments"));
const PortalSettings   = lazy(() => import("./pages/portal/PortalSettings"));
const PortalGallery    = lazy(() => import("./pages/portal/PortalGallery"));
const PortalInvite     = lazy(() => import("./pages/portal/PortalInvite"));

// Admin
const Admin = lazy(() => import("./pages/Admin"));
const ProjectForecasting = lazy(() => import("./pages/admin/ProjectForecasting"));

// Finance dashboard
const EntitySelect  = lazy(() => import("./pages/EntitySelect"));
const EntityOverview = lazy(() => import("./pages/EntityOverview"));
const HgpJobs = lazy(() => import("./pages/entity/HgpJobs"));
const HoldingsAssets = lazy(() => import("./pages/entity/HoldingsAssets"));
const StormResponse = lazy(() => import("./pages/entity/StormResponse"));
const HgpInventory = lazy(() => import("./pages/entity/HgpInventory"));
const Auth          = lazy(() => import("./pages/Auth"));
const Checks        = lazy(() => import("./pages/Checks"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const Estimates     = lazy(() => import("./pages/Estimates"));
const People        = lazy(() => import("./pages/People"));
const Equipment     = lazy(() => import("./pages/Equipment"));
const CheckNew      = lazy(() => import("./pages/CheckNew"));
const TxnPage       = lazy(() => import("./pages/TxnPage"));
const Ledger        = lazy(() => import("./pages/Ledger"));
const Projects      = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Clients       = lazy(() => import("./pages/Clients"));
const Vendors       = lazy(() => import("./pages/Vendors"));
const Concierge     = lazy(() => import("./pages/Concierge"));
const Charts        = lazy(() => import("./pages/Charts"));
const Changelog     = lazy(() => import("./pages/Changelog"));
const Settings      = lazy(() => import("./pages/Settings"));
const Invoices      = lazy(() => import("./pages/Invoices"));
const InvoiceNew    = lazy(() => import("./pages/InvoiceNew"));
const Documents     = lazy(() => import("./pages/Documents"));
const OpsCenter     = lazy(() => import("./pages/OpsCenter"));
const FinanceControls = lazy(() => import("./pages/FinanceControls"));
const Reports        = lazy(() => import("./pages/Reports"));
const ProcurementEngine = lazy(() => import("./pages/ProcurementEngine"));
const NotFound      = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const message = error instanceof Error ? error.message : String(error);
      recordSystemHealthEvent({
        area: 'react-query:query',
        severity: isSchemaCacheError(message) ? 'critical' : 'warning',
        message,
        details: { queryKey: query.queryKey },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const message = error instanceof Error ? error.message : String(error);
      recordSystemHealthEvent({
        area: 'react-query:mutation',
        severity: isSchemaCacheError(message) ? 'critical' : 'error',
        message,
        details: { mutationKey: mutation.options.mutationKey },
      });
    },
  }),
});

const FINANCE_ROLES = ['developer', 'admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer'] as const;
const ADMIN_ROLES   = ['developer', 'admin'] as const;

/* Direct-URL guard for modules the selected entity doesn't use (nav already
   hides them): e.g. construction WIP Controls for HGP/Holdings. Waits for
   entity hydration so a hard refresh doesn't misroute. */
function ModuleGuard({ module, children }: { module: FinanceModuleKey; children: React.ReactNode }) {
  const { entity, ready } = useEntity();
  if (!ready) return null;
  if (!entityHasModule(entity?.id, module)) return <Navigate to="/finance/dashboard" replace />;
  return <>{children}</>;
}

function EntityProjects() {
  const { entity, ready } = useEntity();
  if (!ready) return null;
  if (entity?.id === 'houston-generator-pros') return <HgpJobs />;
  if (entity?.id === 'houston-enterprise-holdings') return <HoldingsAssets />;
  return <Projects />;
}

// All finance routes share ONE EntityProvider so entity state is never stale
function FinanceRoutes() {
  return (
    <EntityProvider>
      <Routes>
        <Route path="/finance"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntitySelect /></RoleGuard>} />
        <Route path="/finance/select"     element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntitySelect /></RoleGuard>} />
        <Route path="/finance/dashboard"  element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntityOverview /></RoleGuard>} />
        <Route path="/command"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="command"><CommandCenter /></ModuleGuard></RoleGuard>} />
        <Route path="/estimates"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="estimates"><Estimates /></ModuleGuard></RoleGuard>} />
        <Route path="/people"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="people"><People /></ModuleGuard></RoleGuard>} />
        <Route path="/equipment"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="equipment"><Equipment /></ModuleGuard></RoleGuard>} />
        <Route path="/checks"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Checks /></RoleGuard>} />
        <Route path="/checks/new"         element={<RoleGuard allowed={[...FINANCE_ROLES]}><CheckNew /></RoleGuard>} />
        <Route path="/income"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><TxnPage kind="income" /></RoleGuard>} />
        <Route path="/expenses"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><TxnPage kind="expense" /></RoleGuard>} />
        <Route path="/ledger"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Ledger /></RoleGuard>} />
        <Route path="/projects"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntityProjects /></RoleGuard>} />
        <Route path="/projects/:id"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><ProjectDetail /></RoleGuard>} />
        <Route path="/clients"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="clients"><Clients /></ModuleGuard></RoleGuard>} />
        <Route path="/vendors"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><Vendors /></RoleGuard>} />
        <Route path="/concierge"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="concierge"><Concierge /></ModuleGuard></RoleGuard>} />
        <Route path="/charts"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Charts /></RoleGuard>} />
        <Route path="/finance/controls"   element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="controls"><FinanceControls /></ModuleGuard></RoleGuard>} />
        <Route path="/reports"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="reports"><Reports /></ModuleGuard></RoleGuard>} />
        <Route path="/beta/procurement"   element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="procurement"><ProcurementEngine /></ModuleGuard></RoleGuard>} />
        <Route path="/changelog"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><Changelog /></RoleGuard>} />
        <Route path="/invoices"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><Invoices /></RoleGuard>} />
        <Route path="/invoices/new"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><InvoiceNew /></RoleGuard>} />
        <Route path="/invoices/:id"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><InvoiceNew /></RoleGuard>} />
        <Route path="/settings"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><Settings /></RoleGuard>} />
        <Route path="/documents"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><Documents /></RoleGuard>} />
        <Route path="/storm"              element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="storm"><StormResponse /></ModuleGuard></RoleGuard>} />
        <Route path="/inventory"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><ModuleGuard module="inventory"><HgpInventory /></ModuleGuard></RoleGuard>} />
        <Route path="/ops"                element={<RoleGuard allowed={[...ADMIN_ROLES]}><OpsCenter /></RoleGuard>} />
        <Route path="*"                   element={<NotFound />} />
      </Routes>
    </EntityProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConversationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <ScrollToTop />
              <GlobalShortcuts />
              <HelpRequestLauncher />
              <Suspense fallback={<RouteLoader />}>
              <Routes>
                {/* ── Public website ── */}
                <Route path="/"          element={<Home />} />
                <Route path="/services"          element={<Services />} />
                <Route path="/services/residential-construction" element={<ResidentialConstruction />} />
                <Route path="/services/commercial-construction" element={<CommercialConstruction />} />
                <Route path="/services/project-management"      element={<ProjectManagementServices />} />
                <Route path="/services/:slug"   element={<ServiceDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/portfolio/:id" element={<PortfolioDetail />} />
                <Route path="/about"     element={<About />} />
                <Route path="/contact"        element={<Contact />} />
                <Route path="/start-project" element={<StartProject />} />

                {/* ── Client portal ── */}
                <Route path="/portal"             element={<PortalAuth />} />
                <Route path="/portal/dashboard"   element={<PortalDashboard />} />
                <Route path="/portal/project"     element={<PortalProject />} />
                <Route path="/portal/messages"    element={<PortalMessages />} />
                <Route path="/portal/documents"  element={<PortalDocuments />} />
                <Route path="/portal/meetings"    element={<PortalMeetings />} />
                <Route path="/portal/projects"   element={<PortalProjects />} />
                <Route path="/portal/milestones" element={<PortalMilestones />} />
                <Route path="/portal/payments"   element={<PortalPayments />} />
                <Route path="/portal/settings"   element={<PortalSettings />} />
                <Route path="/portal/gallery"    element={<PortalGallery />} />
                <Route path="/portal/invite"    element={<PortalInvite />} />

                {/* ── Admin (admin-role only) ── */}
                <Route path="/admin"             element={<RoleGuard allowed={[...ADMIN_ROLES]}><Admin /></RoleGuard>} />
                <Route path="/admin/projects/:id/forecasting" element={<RoleGuard allowed={['developer', 'admin', 'project_manager']}><ProjectForecasting /></RoleGuard>} />

                {/* ── Finance sector (single shared EntityProvider) ── */}
                <Route path="/auth"             element={<Auth />} />
                <Route path="/*"               element={<FinanceRoutes />} />
              </Routes>
              </Suspense>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConversationProvider>
  </QueryClientProvider>
);

export default App;
