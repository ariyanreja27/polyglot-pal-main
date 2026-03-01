import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WordList from "./pages/WordList";
import WordDetails from "./pages/WordDetails";
import WordForm from "./pages/WordForm";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";

const queryClient = new QueryClient();

/**
 * ProtectedRoute Wrapper
 * 
 * Intercepts routing attempts to ensure the user is actively authenticated.
 * Handles intermediate loading states and catches password-recovery flows
 * to ensure users complete required security updates before accessing the dashboard.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - The protected elements to render if authorized.
 * @returns {JSX.Element} The requested route or a redirect to the Auth panel.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPasswordRecovery } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isPasswordRecovery) return <UpdatePassword />;
  return <>{children}</>;
}

/**
 * AuthRoute Wrapper
 * 
 * Prevents actively authenticated users from viewing the login/registration panels.
 * Automatically routes authenticated users immediately to their dashboard context.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - The auth panels to render if unauthenticated.
 * @returns {JSX.Element} The auth interface or a redirect to the App dashboard.
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Root App Component
 * 
 * Configures the global providers (React Query, Toasters, Tooltips, Authentication)
 * and defines the application's top-level client-side routing hierarchy.
 * 
 * @component
 * @returns {JSX.Element} The fully configured application element tree.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/language/:languageId" element={<ProtectedRoute><WordList /></ProtectedRoute>} />
            <Route path="/language/:languageId/add" element={<ProtectedRoute><WordForm /></ProtectedRoute>} />
            <Route path="/word/:wordId" element={<ProtectedRoute><WordDetails /></ProtectedRoute>} />
            <Route path="/word/:wordId/edit" element={<ProtectedRoute><WordForm /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
