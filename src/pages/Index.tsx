/* src/pages/Index.tsx */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Si hay usuario, ir al Dashboard principal
        navigate("/dashboard");
      } else {
        // Si no hay usuario, ir al Login
        navigate("/auth");
      }
    }
  }, [user, loading, navigate]);

  // Pantalla de carga minimalista (Tema Navy) mientras redirige
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a]">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
    </div>
  );
};

export default Index;