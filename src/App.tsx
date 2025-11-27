/* src/App.tsx */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { PresenceProvider } from "@/contexts/PresenceContext";

// CORRECCIÓN AQUÍ: Añadimos llaves { } porque es un named export
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Páginas existentes
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import KanbanBoard from "./pages/KanbanBoard";
import Users from "./pages/Users";
import MyAssignedTickets from "./pages/MyAssignedTickets";
import Profile from "./pages/Profile";
import AdminReports from "./pages/AdminReports";
import NotFound from "./pages/NotFound";

// NUEVA PÁGINA: Comunidad
import { Community } from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SoundProvider>
            <PresenceProvider>
              <Routes>
                {/* Rutas Públicas */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Rutas Protegidas (Requieren Login) */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/ticket/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
                <Route path="/kanban" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/my-assigned" element={<ProtectedRoute><MyAssignedTickets /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
                
                {/* Nueva Ruta de Comunidad */}
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />

                {/* Ruta 404 */}
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