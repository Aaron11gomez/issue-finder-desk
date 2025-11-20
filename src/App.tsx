/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/App.tsx */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SoundProvider } from "@/contexts/SoundContext";
import { PresenceProvider } from "@/contexts/PresenceContext"; 
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import TicketDetail from "@/pages/TicketDetail";
import MyAssignedTickets from "@/pages/MyAssignedTickets";
import KanbanBoard from "@/pages/KanbanBoard";
import Profile from "@/pages/Profile";
import AdminReports from "@/pages/AdminReports"; // NUEVO IMPORT
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner richColors closeButton />
      <BrowserRouter>
        <AuthProvider>
          <SoundProvider>
            <PresenceProvider> 
              <Routes>
                <Route path="/auth" element={<Auth />} />

                <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/my-assigned" element={<ProtectedRoute><MyAssignedTickets /></ProtectedRoute>} />
                <Route path="/kanban" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
                <Route path="/ticket/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* NUEVA RUTA DE REPORTES */}
                <Route path="/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PresenceProvider>
          </SoundProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;