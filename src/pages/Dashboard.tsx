import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';
import ClientDashboard from '@/components/dashboards/ClientDashboard';
import Layout from '@/components/Layout';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!role) {
    return <Navigate to="/auth" />;
  }

  return (
    <Layout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'technician' && <TechnicianDashboard />}
      {role === 'client' && <ClientDashboard />}
    </Layout>
  );
};

export default Dashboard;