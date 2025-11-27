import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';
import ClientDashboard from '@/components/dashboards/ClientDashboard';
import Layout from '@/components/Layout';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, role, loading } = useAuth();

  // 1. Si está cargando la sesión inicial, mostrar spinner pantalla completa
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
           <p className="text-sm text-muted-foreground animate-pulse">Conectando con Nexus Desk...</p>
        </div>
      </div>
    );
  }

  // 2. Si terminó de cargar y no hay usuario, mandar al login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3. SALVAVIDAS: Si hay usuario pero el rol aún es null (latencia de red),
  // mostramos el Layout con un spinner en lugar de redirigir o fallar.
  if (!role) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // 4. Todo listo, renderizar según rol
  return (
    <Layout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'technician' && <TechnicianDashboard />}
      {role === 'client' && <ClientDashboard />}
    </Layout>
  );
};

export default Dashboard;