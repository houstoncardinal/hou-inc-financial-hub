import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Protected from "@/components/Protected";

// Public website
import Home      from "./pages/public/Home";
import Services  from "./pages/public/Services";
import Portfolio from "./pages/public/Portfolio";
import About     from "./pages/public/About";
import Contact   from "./pages/public/Contact";

// Client portal
import PortalAuth      from "./pages/portal/PortalAuth";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalProject   from "./pages/portal/PortalProject";
import PortalMessages  from "./pages/portal/PortalMessages";
import PortalDocuments from "./pages/portal/PortalDocuments";
import PortalMeetings  from "./pages/portal/PortalMeetings";

// Admin
import Admin from "./pages/Admin";

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
                <Route path="/services"  element={<Services />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/about"     element={<About />} />
                <Route path="/contact"   element={<Contact />} />

                {/* ── Client portal ── */}
                <Route path="/portal"             element={<PortalAuth />} />
                <Route path="/portal/dashboard"   element={<PortalDashboard />} />
                <Route path="/portal/project"     element={<PortalProject />} />
                <Route path="/portal/messages"    element={<PortalMessages />} />
                <Route path="/portal/documents"  element={<PortalDocuments />} />
                <Route path="/portal/meetings"   element={<PortalMeetings />} />

                {/* ── Admin ── */}
                <Route path="/admin"             element={<Admin />} />

                {/* ── Finance sector ── */}
                <Route path="/auth"             element={<Auth />} />
                <Route path="/finance"          element={<Protected><Index /></Protected>} />
                <Route path="/checks"           element={<Protected><Checks /></Protected>} />
                <Route path="/checks/new"       element={<Protected><CheckNew /></Protected>} />
                <Route path="/income"           element={<Protected><TxnPage kind="income" /></Protected>} />
                <Route path="/expenses"         element={<Protected><TxnPage kind="expense" /></Protected>} />
                <Route path="/ledger"           element={<Protected><Ledger /></Protected>} />
                <Route path="/projects"         element={<Protected><Projects /></Protected>} />
                <Route path="/projects/:id"     element={<Protected><ProjectDetail /></Protected>} />
                <Route path="/vendors"          element={<Protected><Vendors /></Protected>} />
                <Route path="/concierge"        element={<Protected><Concierge /></Protected>} />
                <Route path="/charts"           element={<Protected><Charts /></Protected>} />
                <Route path="/invoices"         element={<Protected><Invoices /></Protected>} />
                <Route path="/invoices/new"     element={<Protected><InvoiceNew /></Protected>} />
                <Route path="/invoices/:id"     element={<Protected><InvoiceNew /></Protected>} />
                <Route path="/settings"         element={<Protected><Settings /></Protected>} />
                <Route path="/glossary"         element={<Protected><Glossary /></Protected>} />

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
