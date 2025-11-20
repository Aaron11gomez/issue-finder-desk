/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/Layout.tsx */
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTechnicianRankInfo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, FileText, Settings, KanbanSquare, Award, Zap, ShieldCheck, Shield, User, FileBarChart } from 'lucide-react'; // Importar FileBarChart
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SoundToggle } from '@/components/SoundToggle';
import { cn } from '@/lib/utils';

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps { children: ReactNode; }
const getInitials = (name: string | undefined) => name ? name.split(' ').map((n) => n[0]).join('').toUpperCase() : '?';

const Layout = ({ children }: LayoutProps) => {
  const { signOut, profile, role } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [totalCategories, setTotalCategories] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
     const countCats = async () => {
         const { count } = await supabase.from('service_categories').select('*', { count: 'exact', head: true });
         setTotalCategories(count || 0);
     };
     if(role === 'technician') countCats();
  }, [role]);

  useEffect(() => {
     if(profile?.id) {
         const { data } = supabase.storage.from('avatars').getPublicUrl(`${profile.id}/avatar.png`); 
         setAvatarUrl(data.publicUrl);
     }
  }, [profile]);

  const isActive = (path: string) => location.pathname === path;
  const rankInfo = role === 'technician' ? getTechnicianRankInfo(profile?.specialties?.length || 0, totalCategories) : null;
  const RankIcon = rankInfo ? (rankInfo.icon === 'Award' ? Award : rankInfo.icon === 'Zap' ? Zap : ShieldCheck) : null;

  const navItems = [
    ...(role === 'admin' ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/kanban', icon: KanbanSquare, label: 'Tablero Kanban' },
        { path: '/users', icon: Users, label: 'Usuarios' },
        { path: '/reports', icon: FileBarChart, label: 'Reportes' } // NUEVO ITEM
    ] : []),
    ...(role === 'technician' ? [
        { path: '/dashboard', icon: FileText, label: 'Tickets sin Asignar' }, 
        { path: '/my-assigned', icon: Settings, label: 'Mis Tickets' }, 
        { path: '/kanban', icon: KanbanSquare, label: 'Tablero de Tareas' }
    ] : []),
    ...(role === 'client' ? [{ path: '/dashboard', icon: FileText, label: 'Mis Tickets' }] : []),
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
              <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label}>
                <Link to={item.path}><item.icon /><span>{item.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2 flex justify-end"><SoundToggle /></div>
        
        <div className="p-2 border-t bg-sidebar-accent/20 rounded-t-lg mx-2">
            <Link to="/profile" className="flex items-center gap-3 mb-2 p-2 rounded hover:bg-sidebar-accent transition-colors cursor-pointer group">
                <Avatar className="h-9 w-9 border ring-2 ring-background group-hover:ring-primary transition-all">
                    <AvatarImage src={avatarUrl || ''} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="text-sm overflow-hidden">
                    <p className="font-semibold truncate group-hover:text-primary transition-colors">{profile?.full_name || 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role === 'technician' ? 'Soporte Técnico' : role === 'client' ? 'Cliente' : 'Administrador'}</p>
                </div>
            </Link>
            
            {role === 'technician' && rankInfo && RankIcon && (
                <div className={cn("flex items-center justify-center gap-1.5 text-xs py-1 px-2 rounded mb-2 font-medium border", rankInfo.color.replace('bg-', 'bg-opacity-50 '))} title="Tu rango actual">
                    <RankIcon className="h-3 w-3" />
                    {rankInfo.label}
                </div>
            )}

            <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut} tooltip="Cerrar Sesión" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4"/><span>Cerrar Sesión</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            </SidebarMenu>
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-muted/40">
        {!isMobile && <Sidebar collapsible="icon" variant="sidebar" className="border-r">{sidebarContent}</Sidebar>}
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2"><img src="/nexus-logo.png" className="w-7 h-7" /><span className="text-lg font-bold">Nexus Desk</span></Link>
            <Sheet><SheetTrigger asChild><SidebarTrigger /></SheetTrigger><SheetContent side="left" className="w-64 p-0 pt-8 border-r">{sidebarContent}</SheetContent></Sheet>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
export default Layout;