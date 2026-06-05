import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudyTimer from "./pages/StudyTimer";
import StudyPlan from "./pages/StudyPlan";
import DailyReport from "./pages/DailyReport";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import GoalDetail from "./pages/GoalDetail";
import Analytics from "./pages/Analytics";
import Portfolio from "./pages/Portfolio";
import MentorDashboard from "./pages/MentorDashboard";
import Memory from "./pages/Memory";
import AIAssistant from "./pages/AIAssistant";
import AIWorkspace from "./pages/AIWorkspace";
import NotFound from "./pages/NotFound";
import { SidebarProvider } from "./contexts/SidebarContext";
import { AIAssistantProvider } from "./contexts/AIAssistantContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  },
});

const protectedRoutes: Array<{ path: string; element: JSX.Element }> = [
  { path: "/dashboard", element: <Index /> },
  { path: "/study", element: <StudyTimer /> },
  { path: "/plan", element: <StudyPlan /> },
  { path: "/report", element: <DailyReport /> },
  { path: "/community", element: <Community /> },
  { path: "/leaderboard", element: <Leaderboard /> },
  { path: "/profile", element: <Profile /> },
  { path: "/goal/:id", element: <GoalDetail /> },
  { path: "/analytics", element: <Analytics /> },
  { path: "/portfolio", element: <Portfolio /> },
  { path: "/mentor", element: <MentorDashboard /> },
  { path: "/memory", element: <Memory /> },
  { path: "/ai", element: <AIWorkspace /> },
  { path: "/assistant", element: <AIAssistant /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SidebarProvider>
        <AIAssistantProvider>
          <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Auth-gated but pre-verification / pre-onboarding */}
            <Route
              path="/verify-email"
              element={
                <ProtectedRoute allowUnverified allowUnonboarded>
                  <VerifyEmail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowUnonboarded>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Fully-protected app */}
            {protectedRoutes.map(({ path, element }) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute>{element}</ProtectedRoute>}
              />
            ))}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
