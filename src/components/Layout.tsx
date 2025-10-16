import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Ticket, LayoutDashboard, Users, FileText, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, profile, role } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    ...(role === 'admin' ? [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/users', icon: Users, label: 'Usuarios' },
    ] : []),
    ...(role === 'technician' ? [
      { path: '/dashboard', icon: FileText, label: 'Tickets sin Asignar' },
      { path: '/my-assigned', icon: Settings, label: 'Mis Tickets' },
    ] : []),
    ...(role === 'client' ? [
      { path: '/dashboard', icon: FileText, label: 'Mis Tickets' },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Nexus Desk</span>
              </Link>
              
              <div className="hidden md:flex space-x-4">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      className="flex items-center space-x-2"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-xs capitalize">{role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;