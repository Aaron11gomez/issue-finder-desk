/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/Layout.tsx */
/* --- CÓDIGO COMPLETO Y CORREGIDO --- */
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, FileText, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile(); // Hook para detectar móvil

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

  const sidebarContent = (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-8 h-8" />
          <span className="text-xl font-bold">Nexus Desk</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1"> 
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.path)}
                tooltip={item.label}
              >
                <Link to={item.path}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback className="bg-muted text-muted-foreground">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm overflow-hidden">
            <p className="font-semibold truncate">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Cerrar Sesión">
              <LogOut />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-muted/40">
        
        {!isMobile && (
          <Sidebar collapsible="icon" variant="sidebar" className="border-r">
            {sidebarContent}
          </Sidebar>
        )}
        
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-7 h-7" />
              <span className="text-lg font-bold">Nexus Desk</span>
            </Link>
            
            {/* --- CORRECCIÓN: Botón anidado eliminado --- */}
            <Sheet>
              <SheetTrigger asChild>
                {/* <SidebarTrigger> ya es un botón */}
                <SidebarTrigger />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 pt-8 border-r">
                {sidebarContent}
              </SheetContent>
            </Sheet>
            {/* --- FIN DE CORRECCIÓN --- */}

          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;