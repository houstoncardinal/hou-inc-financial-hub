import { useEffect } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Protected from "@/components/Protected";
import RoleGuard from "@/components/RoleGuard";
import { EntityProvider } from "@/contexts/EntityContext";
import { isSchemaCacheError, recordSystemHealthEvent } from "@/lib/systemHealth";

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

// Public website
import Home          from "./pages/public/Home";
import Services      from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import ResidentialConstruction from "./pages/public/ResidentialConstruction";
import CommercialConstruction from "./pages/public/CommercialConstruction";
import ProjectManagementServices from "./pages/public/ProjectManagementServices";
import Portfolio     from "./pages/public/Portfolio";
import PortfolioDetail from "./pages/public/PortfolioDetail";
import About         from "./pages/public/About";
import Contact       from "./pages/public/Contact";
import StartProject  from "./pages/public/StartProject";

// Client portal
import PortalAuth      from "./pages/portal/PortalAuth";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalProject   from "./pages/portal/PortalProject";
import PortalMessages   from "./pages/portal/PortalMessages";
import PortalDocuments  from "./pages/portal/PortalDocuments";
import PortalMeetings   from "./pages/portal/PortalMeetings";
import PortalProjects   from "./pages/portal/PortalProjects";
import PortalMilestones from "./pages/portal/PortalMilestones";
import PortalPayments   from "./pages/portal/PortalPayments";
import PortalSettings   from "./pages/portal/PortalSettings";
import PortalGallery    from "./pages/portal/PortalGallery";
import PortalInvite     from "./pages/portal/PortalInvite";

// Admin
import Admin from "./pages/Admin";

// Finance dashboard
import EntitySelect  from "./pages/EntitySelect";
import Index         from "./pages/Index";
import Auth          from "./pages/Auth";
import Checks        from "./pages/Checks";
import CheckNew      from "./pages/CheckNew";
import TxnPage       from "./pages/TxnPage";
import Ledger        from "./pages/Ledger";
import Projects      from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Vendors       from "./pages/Vendors";
import Concierge     from "./pages/Concierge";
import Charts        from "./pages/Charts";
import Changelog     from "./pages/Changelog";
import Settings      from "./pages/Settings";
import Invoices      from "./pages/Invoices";
import InvoiceNew    from "./pages/InvoiceNew";
import Documents     from "./pages/Documents";
import OpsCenter     from "./pages/OpsCenter";
import FinanceControls from "./pages/FinanceControls";
import NotFound      from "./pages/NotFound";

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

const FINANCE_ROLES = ['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer'] as const;
const ADMIN_ROLES   = ['admin'] as const;

// All finance routes share ONE EntityProvider so entity state is never stale
function FinanceRoutes() {
  return (
    <EntityProvider>
      <Routes>
        <Route path="/finance"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntitySelect /></RoleGuard>} />
        <Route path="/finance/select"     element={<RoleGuard allowed={[...FINANCE_ROLES]}><EntitySelect /></RoleGuard>} />
        <Route path="/finance/dashboard"  element={<RoleGuard allowed={[...FINANCE_ROLES]}><Index /></RoleGuard>} />
        <Route path="/checks"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Checks /></RoleGuard>} />
        <Route path="/checks/new"         element={<RoleGuard allowed={[...FINANCE_ROLES]}><CheckNew /></RoleGuard>} />
        <Route path="/income"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><TxnPage kind="income" /></RoleGuard>} />
        <Route path="/expenses"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><TxnPage kind="expense" /></RoleGuard>} />
        <Route path="/ledger"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Ledger /></RoleGuard>} />
        <Route path="/projects"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><Projects /></RoleGuard>} />
        <Route path="/projects/:id"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><ProjectDetail /></RoleGuard>} />
        <Route path="/vendors"            element={<RoleGuard allowed={[...FINANCE_ROLES]}><Vendors /></RoleGuard>} />
        <Route path="/concierge"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><Concierge /></RoleGuard>} />
        <Route path="/charts"             element={<RoleGuard allowed={[...FINANCE_ROLES]}><Charts /></RoleGuard>} />
        <Route path="/finance/controls"   element={<RoleGuard allowed={[...FINANCE_ROLES]}><FinanceControls /></RoleGuard>} />
        <Route path="/changelog"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><Changelog /></RoleGuard>} />
        <Route path="/invoices"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><Invoices /></RoleGuard>} />
        <Route path="/invoices/new"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><InvoiceNew /></RoleGuard>} />
        <Route path="/invoices/:id"       element={<RoleGuard allowed={[...FINANCE_ROLES]}><InvoiceNew /></RoleGuard>} />
        <Route path="/settings"           element={<RoleGuard allowed={[...FINANCE_ROLES]}><Settings /></RoleGuard>} />
        <Route path="/documents"          element={<RoleGuard allowed={[...FINANCE_ROLES]}><Documents /></RoleGuard>} />
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
                <Route path="/admin"             element={<RoleGuard allowed={['admin']}><Admin /></RoleGuard>} />

                {/* ── Finance sector (single shared EntityProvider) ── */}
                <Route path="/auth"             element={<Auth />} />
                <Route path="/*"               element={<FinanceRoutes />} />
              </Routes>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConversationProvider>
  </QueryClientProvider>
);

export default App;
