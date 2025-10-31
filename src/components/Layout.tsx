import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, FileText, Settings, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LayoutProps {
  children: ReactNode;
}

// Función para obtener iniciales
const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const Layout = ({ children }: LayoutProps) => {
  const { signOut, profile, role } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Definición de los items de navegación
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
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen w-full flex bg-muted/40">
        
        {/* --- BARRA LATERAL (SIDEBAR) --- */}
        <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
          {/* Logo y Título */}
          <div className="flex items-center gap-3 px-2 py-4">
            <img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-8 h-8" />
            <span className="text-xl font-bold">Nexus Desk</span>
          </div>

          {/* Navegación Principal */}
          <nav className="flex flex-col gap-1 flex-1 mt-6">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? 'default' : 'ghost'}
                className="flex justify-start items-center gap-3"
                asChild
              >
                <Link to={item.path}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>

          {/* Perfil y Cerrar Sesión (al fondo) */}
          <div className="mt-auto flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-semibold">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </aside>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="flex flex-col flex-1">
          {/* Header (para móvil) */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-7 h-7" />
              <span className="text-lg font-bold">Nexus Desk</span>
            </Link>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </header>

          {/* Contenido de la página */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Layout;