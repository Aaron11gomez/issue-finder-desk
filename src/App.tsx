/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/App.tsx */
/* --- CÓDIGO COMPLETO Y CORREGIDO --- */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SoundProvider } from "@/contexts/SoundContext";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import TicketDetail from "@/pages/TicketDetail";
import MyAssignedTickets from "@/pages/MyAssignedTickets";
import KanbanBoard from "@/pages/KanbanBoard"; // <--- NUEVO IMPORT
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
            <Routes>
              {/* Rutas públicas */}
              <Route path="/auth" element={<Auth />} />

              {/* Rutas protegidas */}
              <Route 
                path="/" 
                element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} 
              />
              <Route 
                path="/dashboard" 
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
              />
              <Route 
                path="/users" 
                element={<ProtectedRoute><Users /></ProtectedRoute>} 
              />
              <Route 
                path="/my-assigned" 
                element={<ProtectedRoute><MyAssignedTickets /></ProtectedRoute>} 
              />
              
              {/* --- NUEVA RUTA KANBAN --- */}
              <Route 
                path="/kanban" 
                element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} 
              />
              {/* --- FIN NUEVA RUTA --- */}

              <Route 
                path="/ticket/:id" 
                element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} 
              />
              
              {/* Ruta de 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SoundProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;