/* src/components/Layout.tsx */
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTechnicianRankInfo } from '@/lib/utils';
import { LayoutDashboard, Users, Settings, KanbanSquare, Award, Zap, ShieldCheck, User, FileBarChart, LogOut, Megaphone } from 'lucide-react'; 
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
     const countCats = async () => { const { count } = await supabase.from('service_categories').select('*', { count: 'exact', head: true }); setTotalCategories(count || 0); };
     if(role === 'technician') countCats();
  }, [role]);

  useEffect(() => { if(profile?.id) { const { data } = supabase.storage.from('avatars').getPublicUrl(`${profile.id}/avatar.png`); setAvatarUrl(data.publicUrl); } }, [profile]);

  const isActive = (path: string) => location.pathname === path;
  const rankInfo = role === 'technician' ? getTechnicianRankInfo(profile?.specialties?.length || 0, totalCategories) : null;
  const RankIcon = rankInfo ? (rankInfo.icon === 'Award' ? Award : rankInfo.icon === 'Zap' ? Zap : ShieldCheck) : null;

  const navItems = [
    ...(role === 'admin' ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/community', icon: Megaphone, label: 'Comunidad' }, // NUEVO
        { path: '/kanban', icon: KanbanSquare, label: 'Tablero Kanban' },
        { path: '/users', icon: Users, label: 'Usuarios' },
        { path: '/reports', icon: FileBarChart, label: 'Reportes' }
    ] : []),
    ...(role === 'technician' ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Buzón General' }, 
        { path: '/my-assigned', icon: Settings, label: 'Mis Tickets' }, 
        { path: '/community', icon: Megaphone, label: 'Comunidad' }, // NUEVO
        { path: '/kanban', icon: KanbanSquare, label: 'Tablero Kanban' }
    ] : []),
    ...(role === 'client' ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Mis Tickets' },
        { path: '/community', icon: Megaphone, label: 'Avisos Globales' } // NUEVO
    ] : []),
  ];

  const sidebarContent = (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner"><img src="/nexus-logo.png" alt="Nexus Desk Logo" className="w-7 h-7" /></div>
          <div className="flex flex-col"><span className="text-lg font-bold text-sidebar-foreground tracking-tight">Nexus Desk</span><span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest font-medium">Workspace</span></div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2"> 
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label} className={cn("transition-all duration-200 ease-in-out py-5 hover:translate-x-1", isActive(item.path) ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white")}>
                <Link to={item.path}><item.icon className={cn("h-5 w-5", isActive(item.path) ? "text-white" : "text-sidebar-foreground/70")} /><span>{item.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex justify-end mb-4"><SoundToggle /></div>
        <div className="bg-sidebar-accent/50 rounded-xl p-3 border border-sidebar-border/50 shadow-sm">
            <Link to="/profile" className="flex items-center gap-3 mb-3 p-1 rounded hover:bg-sidebar-accent transition-colors cursor-pointer group">
                <Avatar className="h-9 w-9 border-2 border-sidebar-border group-hover:border-primary transition-colors"><AvatarImage src={avatarUrl || ''} className="object-cover" /><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs">{getInitials(profile?.full_name)}</AvatarFallback></Avatar>
                <div className="text-sm overflow-hidden"><p className="font-medium truncate text-sidebar-foreground group-hover:text-white transition-colors">{profile?.full_name || 'Usuario'}</p><p className="text-xs text-sidebar-foreground/50 capitalize">{role === 'technician' ? 'Soporte Técnico' : role === 'client' ? 'Cliente' : 'Administrador'}</p></div>
            </Link>
            {role === 'technician' && rankInfo && RankIcon && (<div className={cn("flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-lg mb-3 font-medium border border-white/10", rankInfo.color.replace('bg-', 'bg-opacity-20 text-opacity-90 '))}><RankIcon className="h-3.5 w-3.5" />{rankInfo.label}</div>)}
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={signOut} className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 h-9"><LogOut className="h-4 w-4 mr-2"/><span>Cerrar Sesión</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        {!isMobile && <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">{sidebarContent}</Sidebar>}
        <SidebarInset className="flex-1 overflow-hidden flex flex-col bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:hidden">
            <Link to="/dashboard" className="flex items-center gap-2"><div className="bg-primary/10 p-1 rounded"><img src="/nexus-logo.png" className="w-6 h-6" /></div><span className="text-lg font-bold text-foreground">Nexus Desk</span></Link>
            <Sheet><SheetTrigger asChild><SidebarTrigger /></SheetTrigger><SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border text-sidebar-foreground">{sidebarContent}</SheetContent></Sheet>
          </header>
          <main className="flex-1 relative overflow-y-auto">
             <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-orange-400 sticky top-0 z-20 shadow-sm opacity-90"></div>
             <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
export default Layout;