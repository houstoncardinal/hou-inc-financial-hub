import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Protected from "@/components/Protected";
import { EntityProvider } from "@/contexts/EntityContext";
import EntitySelect from "./pages/EntitySelect";

// Public website
import Home          from "./pages/public/Home";
import Services      from "./pages/public/Services";
import ServiceDetail from "./pages/public/ServiceDetail";
import ResidentialConstruction from "./pages/public/ResidentialConstruction";
import CommercialConstruction from "./pages/public/CommercialConstruction";
import ProjectManagementServices from "./pages/public/ProjectManagementServices";
import Portfolio     from "./pages/public/Portfolio";
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

// Admin
import Admin from "./pages/Admin";

// Tools
import WebScraper from "./pages/WebScraper";

// Finance dashboard
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
import Settings      from "./pages/Settings";
import Invoices      from "./pages/Invoices";
import InvoiceNew    from "./pages/InvoiceNew";
import Glossary      from "./pages/Glossary";
import NotFound      from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConversationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <Routes>
                {/* ── Public website ── */}
                <Route path="/"          element={<Home />} />
                <Route path="/services"          element={<Services />} />
                <Route path="/services/residential-construction" element={<ResidentialConstruction />} />
                <Route path="/services/commercial-construction" element={<CommercialConstruction />} />
                <Route path="/services/project-management"      element={<ProjectManagementServices />} />
                <Route path="/services/:slug"   element={<ServiceDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
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

                {/* ── Admin ── */}
                <Route path="/admin"             element={<Admin />} />

                {/* ── Tools ── */}
                <Route path="/scraper"           element={<WebScraper />} />

                {/* ── Finance sector ── */}
                <Route path="/auth"             element={<Auth />} />
                <Route path="/finance/select"   element={<Protected><EntitySelect /></Protected>} />
                <Route path="/finance"          element={<Protected><EntityProvider><Index /></EntityProvider></Protected>} />
                <Route path="/checks"           element={<Protected><EntityProvider><Checks /></EntityProvider></Protected>} />
                <Route path="/checks/new"       element={<Protected><EntityProvider><CheckNew /></EntityProvider></Protected>} />
                <Route path="/income"           element={<Protected><EntityProvider><TxnPage kind="income" /></EntityProvider></Protected>} />
                <Route path="/expenses"         element={<Protected><EntityProvider><TxnPage kind="expense" /></EntityProvider></Protected>} />
                <Route path="/ledger"           element={<Protected><EntityProvider><Ledger /></EntityProvider></Protected>} />
                <Route path="/projects"         element={<Protected><EntityProvider><Projects /></EntityProvider></Protected>} />
                <Route path="/projects/:id"     element={<Protected><EntityProvider><ProjectDetail /></EntityProvider></Protected>} />
                <Route path="/vendors"          element={<Protected><EntityProvider><Vendors /></EntityProvider></Protected>} />
                <Route path="/concierge"        element={<Protected><EntityProvider><Concierge /></EntityProvider></Protected>} />
                <Route path="/charts"           element={<Protected><EntityProvider><Charts /></EntityProvider></Protected>} />
                <Route path="/invoices"         element={<Protected><EntityProvider><Invoices /></EntityProvider></Protected>} />
                <Route path="/invoices/new"     element={<Protected><EntityProvider><InvoiceNew /></EntityProvider></Protected>} />
                <Route path="/invoices/:id"     element={<Protected><EntityProvider><InvoiceNew /></EntityProvider></Protected>} />
                <Route path="/settings"         element={<Protected><EntityProvider><Settings /></EntityProvider></Protected>} />
                <Route path="/glossary"         element={<Protected><EntityProvider><Glossary /></EntityProvider></Protected>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConversationProvider>
  </QueryClientProvider>
);

export default App;
