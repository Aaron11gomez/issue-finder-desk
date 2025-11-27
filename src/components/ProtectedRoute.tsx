/* src/components/ProtectedRoute.tsx */
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Si no hay usuario, redirigir al login
    return <Navigate to="/auth" replace />;
  }

  // Si hay usuario, mostrar el contenido protegido
  return <>{children}</>;
};