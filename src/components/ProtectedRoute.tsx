/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/ProtectedRoute.tsx */
/* --- CÓDIGO COMPLETO Y CORREGIDO --- */
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- CORRECCIÓN: Importar desde el hook correcto ---
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/components/Layout'; // <-- Añadir Layout para consistencia

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      // --- CORRECCIÓN: Usar el Layout para la pantalla de carga ---
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // O redirigir, aunque el useEffect ya lo hace
  }

  return <>{children}</>;
};