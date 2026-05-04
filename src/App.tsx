import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Protected from "@/components/Protected";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Checks from "./pages/Checks";
import CheckNew from "./pages/CheckNew";
import TxnPage from "./pages/TxnPage";
import Ledger from "./pages/Ledger";
import Projects from "./pages/Projects";
import Vendors from "./pages/Vendors";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Protected><Index /></Protected>} />
            <Route path="/checks" element={<Protected><Checks /></Protected>} />
            <Route path="/checks/new" element={<Protected><CheckNew /></Protected>} />
            <Route path="/income" element={<Protected><TxnPage kind="income" /></Protected>} />
            <Route path="/expenses" element={<Protected><TxnPage kind="expense" /></Protected>} />
            <Route path="/ledger" element={<Protected><Ledger /></Protected>} />
            <Route path="/projects" element={<Protected><Projects /></Protected>} />
            <Route path="/vendors" element={<Protected><Vendors /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
