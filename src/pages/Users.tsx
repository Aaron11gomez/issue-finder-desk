import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, UserX, UserCheck, Search, Check, Filter, HelpCircle, Shield, ShieldCheck, Zap, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn, getTechnicianRankInfo } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'technician' | 'client';
  is_active: boolean;
  specialties?: string[];
}

interface Category {
  id: string;
  name: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const [createForm, setCreateForm] = useState({
    fullName: '', email: '', password: '', role: 'technician' as const, specialties: [] as string[]
  });
  const [editForm, setEditForm] = useState({
    fullName: '', role: 'technician' as const, specialties: [] as string[]
  });

  useEffect(() => { fetchUsers(); fetchCategories(); }, []);

  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(u => u.full_name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
    }
    if (roleFilter !== 'all') filtered = filtered.filter(u => u.role === roleFilter);
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('service_categories').select('id, name');
    if (data) setCategories(data);
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase.rpc('get_staff_users' as any, {}); 
      if (error) throw error;
      const { data: profilesData } = await supabase.from('profiles').select('id, specialties');
      
      const mergedUsers = (usersData as any[]).map(u => {
        const profile = profilesData?.find(p => p.id === u.id);
        return { ...u, specialties: profile?.specialties || [] };
      });
      setUsers(mergedUsers);
      setFilteredUsers(mergedUsers);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const toggleSpecialty = (id: string, isEdit: boolean) => {
    const updater = isEdit ? setEditForm : setCreateForm;
    updater(prev => {
        const current = prev.specialties || [];
        return { ...prev, specialties: current.includes(id) ? current.filter(s => s !== id) : [...current, id] };
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No sesión');
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email, password: createForm.password, options: { data: { full_name: createForm.fullName } }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Error user");
      const newUserId = authData.user.id;

      await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
      await new Promise(r => setTimeout(r, 800));

      await supabase.from('user_roles').update({ role: createForm.role }).eq('user_id', newUserId);
      if (createForm.role === 'technician' && createForm.specialties.length > 0) {
         await supabase.from('profiles').update({ specialties: createForm.specialties }).eq('id', newUserId);
      }
      toast({ title: 'Usuario creado', description: 'El usuario ha sido creado exitosamente' });
      setCreateDialogOpen(false); 
      setCreateForm({ fullName: '', email: '', password: '', role: 'technician', specialties: [] });
      fetchUsers();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await supabase.from('profiles').update({ 
        full_name: editForm.fullName,
        specialties: editForm.role === 'technician' ? editForm.specialties : [] 
      }).eq('id', selectedUser.id);
      await supabase.from('user_roles').update({ role: editForm.role }).eq('user_id', selectedUser.id);
      toast({ title: 'Usuario actualizado', description: 'Los datos se han guardado correctamente.' });
      setEditDialogOpen(false); fetchUsers();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditForm({ fullName: user.full_name, role: user.role as any, specialties: user.specialties || [] });
    setEditDialogOpen(true);
  };

  const toggleUserActive = async (user: UserWithRole) => {
      try {
        const newStatus = !user.is_active;
        await supabase.from('profiles').update({ is_active: newStatus }).eq('id', user.id);
        toast({ title: newStatus ? 'Usuario Activado' : 'Usuario Desactivado' });
        fetchUsers(); 
      } catch (e) { console.error(e); }
  };

  const RankLegend = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed">
          <HelpCircle className="h-4 w-4" /> Leyenda de Rangos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
           <h4 className="font-semibold text-sm border-b pb-2">Niveles de Técnico</h4>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-blue-100 text-blue-700 rounded p-1"><ShieldCheck className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-blue-900">Técnico Operativo</p><p className="text-xs text-muted-foreground">Nivel Básico. 1-2 especialidades.</p></div>
           </div>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-indigo-100 text-indigo-700 rounded p-1"><Zap className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-indigo-900">Especialista Senior</p><p className="text-xs text-muted-foreground">Nivel Intermedio. 3+ especialidades.</p></div>
           </div>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-amber-100 text-amber-700 rounded p-1"><Award className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-amber-900">Master de Soluciones</p><p className="text-xs text-muted-foreground">Nivel Experto. Todas las áreas.</p></div>
           </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const SpecialtiesSelector = ({ formState, isEdit }: any) => (
    <div className="space-y-2 border rounded-md p-3 bg-secondary/10">
      <div className="flex justify-between items-center">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Especialidades</Label>
          <div className="flex gap-1">
             <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => {
                   const allIds = categories.map(c => c.id);
                   const updater = isEdit ? setEditForm : setCreateForm;
                   updater(prev => ({ ...prev, specialties: allIds }));
             }}>Todas</Button>
             <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-destructive" onClick={() => {
                   const updater = isEdit ? setEditForm : setCreateForm;
                   updater(prev => ({ ...prev, specialties: [] }));
             }}>Ninguna</Button>
          </div>
      </div>
      <ScrollArea className="h-36 pr-2">
        <div className="grid grid-cols-1 gap-1.5">
          {categories.map(cat => {
            const isSelected = formState.specialties.includes(cat.id);
            return (
                <div key={cat.id} onClick={() => toggleSpecialty(cat.id, isEdit)}
                className={cn("flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all select-none text-sm",
                    isSelected ? "bg-primary/10 border-primary/50 font-medium text-primary" : "bg-background hover:bg-muted"
                )}>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-muted-foreground")}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {cat.name}
                </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  // Helper para mapear nombre de icono (string) a componente Lucide
  const getRankIconComponent = (iconName: string) => {
      switch(iconName) {
          case 'Award': return Award;
          case 'Zap': return Zap;
          case 'ShieldCheck': return ShieldCheck;
          default: return Shield;
      }
  };

  if (loading) return <Layout><div>Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
          <div><h1 className="text-3xl font-bold">Gestión de Personal</h1><p className="text-muted-foreground">Administración de equipo.</p></div>
          <div className="flex gap-2">
              <RankLegend />
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Nuevo Personal</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Crear Personal</DialogTitle></DialogHeader>
                  <DialogDescription>Crea una nueva cuenta de técnico o administrador.</DialogDescription>
                  <form onSubmit={createUser} className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nombre</Label><Input value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Rol</Label>
                            <Select value={createForm.role} onValueChange={(v:any) => setCreateForm({...createForm, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="technician">Técnico</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2"><Label>Email</Label><Input value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Clave</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} /></div>
                    {createForm.role === 'technician' && <SpecialtiesSelector formState={createForm} isEdit={false} />}
                    <Button type="submit" className="w-full">Crear</Button>
                  </form>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-card rounded-lg border shadow-sm">
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nombre o correo..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-8" 
                />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48"><Filter className="w-4 h-4 mr-2"/><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="technician">Técnico</SelectItem></SelectContent>
            </Select>
        </div>
        
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
            <TableHead>Usuario</TableHead><TableHead>Rol</TableHead><TableHead>Rango Técnico</TableHead><TableHead className="text-right">Estado</TableHead><TableHead></TableHead>
        </TableRow></TableHeader><TableBody>
            {filteredUsers.map(user => {
                const rankInfo = user.role === 'technician' ? getTechnicianRankInfo(user.specialties?.length || 0, categories.length) : null;
                const RankIcon = rankInfo ? getRankIconComponent(rankInfo.icon) : Shield;

                return (
                <TableRow key={user.id}>
                    <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role === 'admin' ? 'Administrador' : 'Técnico'}</Badge>
                    </TableCell>
                    <TableCell>
                        {user.role === 'admin' ? <span className="text-xs text-muted-foreground italic">Acceso Global</span> : (
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-medium", rankInfo?.color)}>
                                    <RankIcon className="h-3.5 w-3.5" /> {rankInfo?.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">({user.specialties?.length || 0} áreas)</span>
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="text-right"><Badge variant={user.is_active ? "secondary" : "outline"}>{user.is_active ? "Activo" : "Inactivo"}</Badge></TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(user)}><Edit className="w-4 h-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className={user.is_active ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"}>
                                        {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Cambiar estado?</AlertDialogTitle>
                                        <AlertDialogDescription>{user.is_active ? "El usuario perderá acceso." : "El usuario recuperará acceso."}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => toggleUserActive(user)}>Confirmar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                </TableRow>
            )})}
        </TableBody></Table></CardContent></Card>
        
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader><DialogTitle>Editar {selectedUser?.full_name}</DialogTitle></DialogHeader>
                <DialogDescription>Modifica el rol o especialidades.</DialogDescription>
                <form onSubmit={updateUser} className="space-y-4">
                    <div className="space-y-2"><Label>Nombre</Label><Input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Rol</Label>
                        <Select value={editForm.role} onValueChange={(v:any) => setEditForm({...editForm, role: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="technician">Técnico</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                        </Select>
                    </div>
                    {editForm.role === 'technician' && <SpecialtiesSelector formState={editForm} isEdit={true} />}
                    <Button type="submit" className="w-full">Guardar Cambios</Button>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
export default Users;