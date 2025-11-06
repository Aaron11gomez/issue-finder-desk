/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/Users.tsx */
/* --- CÓDIGO COMPLETO Y CORREGIDO --- */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, UserX, UserCheck, Search } from 'lucide-react';
// --- CORRECCIÓN: Importar DialogDescription ---
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'technician' | 'client';
  is_active: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'technician' as 'admin' | 'technician' | 'client'
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'technician' as 'admin' | 'technician' | 'client'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .rpc('get_staff_users' as any, {}); 

      if (error) throw error;

      setUsers((usersData as any) || []);
      setFilteredUsers((usersData as any) || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar los usuarios. Revisa la consola.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.email || !createForm.password || !createForm.fullName) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Obtener el token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a la Edge Function para crear el usuario
      // Esto NO iniciará sesión con el nuevo usuario
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: {
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: createForm.role
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado exitosamente',
      });

      setCreateDialogOpen(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'technician' });

      fetchUsers(); // Recargar la lista de usuarios

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({     
        title: 'Error al crear usuario',
        description: error.message || 'No se pudo crear el usuario',
        variant: 'destructive'
      });
    }
  };
  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !editForm.fullName) {
      return;
    }

    try {
      const profilePromise = supabase.from('profiles').update({
        full_name: editForm.fullName
      }).eq('id', selectedUser.id);
        
      const rolePromise = supabase.from('user_roles').update({
        role: editForm.role
      }).eq('user_id', selectedUser.id);

      const [profileRes, roleRes] = await Promise.all([
        profilePromise,
        rolePromise
      ]);

      if (profileRes.error) throw profileRes.error;
      if (roleRes.error) throw roleRes.error;

      toast({
        title: 'Usuario actualizado',
        description: 'Los datos del usuario han sido actualizados',
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el usuario',
        variant: 'destructive'
      });
    }
  };

  const toggleUserActive = async (user: UserWithRole) => {
    try {
      const newStatus = !user.is_active;
      
      const { error } = await supabase.from('profiles').update({
        is_active: newStatus
      }).eq('id', user.id);

      if (error) throw error;

      toast({
        title: newStatus ? 'Usuario Activado' : 'Usuario Desactivado',
        description: `El usuario ${user.full_name} ha sido ${newStatus ? 'activado' : 'desactivado'}.`,
      });

      fetchUsers(); 
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar el estado del usuario',
        variant: 'destructive'
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  const getRoleColor = (role: string): "destructive" | "default" | "secondary" => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'technician': return 'default';
      case 'client': return 'secondary';
      default: return 'default';
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.full_name,
      role: user.role
    });
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div>Cargando usuarios...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Personal</h1>
            <p className="text-muted-foreground mt-2">
              Administra las cuentas de Administradores y Técnicos
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Personal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Personal</DialogTitle>
                {/* --- CORRECCIÓN: Añadida DialogDescription --- */}
                <DialogDescription>
                  Crea una nueva cuenta de técnico o administrador. Se le asignará una contraseña provisional.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña Provisional</Label>
                  <Input
                    id="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(value: 'admin' | 'technician' | 'client') =>
                      setCreateForm({ ...createForm, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Técnico</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  Crear Usuario
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Roles</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="technician">Técnicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-lg",
                      !user.is_active && "opacity-50 bg-muted/50"
                    )}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        <Badge variant={getRoleColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        <Badge variant={user.is_active ? "secondary" : "outline"}>
                          {user.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={user.is_active ? "destructive" : "secondary"}
                              title={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a {user.is_active ? 'desactivar' : 'activar'} la cuenta de 
                                <span className="font-medium"> {user.full_name}</span>. 
                                {user.is_active ? ' El usuario no podrá iniciar sesión.' : ' El usuario podrá volver a iniciar sesión.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => toggleUserActive(user)}
                                className={cn(user.is_active && "bg-destructive text-destructive-foreground")}
                              >
                                Confirmar {user.is_active ? 'Desactivación' : 'Activación'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* DIÁLOGO DE EDICIÓN (ACTUALIZADO) */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Personal</DialogTitle>
              {/* --- CORRECCIÓN: Añadida DialogDescription --- */}
              <DialogDescription>
                Modifica el nombre y el rol del usuario. El correo electrónico no se puede cambiar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={updateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Nombre Completo</Label>
                <Input
                  id="edit-fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Rol</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: 'admin' | 'technician' | 'client') =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                Guardar Cambios
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Users;