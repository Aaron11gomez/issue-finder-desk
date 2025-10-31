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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'technician' | 'client';
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all' ahora significa 'admin' y 'technician'
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'technician' as 'admin' | 'technician' | 'client' // Por defecto técnico
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
      // ¡ARREGLO! Llamamos a la función RPC segura en lugar de auth.admin
      const { data: usersData, error } = await supabase
        .rpc('get_staff_users' as any) // <--- ¡AÑADE ESTO!
        .returns<UserWithRole[]>();

      if (error) throw error;

      // Líneas corregidas:
setUsers((usersData as UserWithRole[]) || []);
setFilteredUsers((usersData as UserWithRole[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios. Revisa la consola.',
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
      // ¡ARREGLO! Llamamos a la nueva función RPC segura
      const { data, error } = await supabase.rpc('create_staff_user' as any, {
        new_email: createForm.email,
        new_password: createForm.password,
        new_full_name: createForm.fullName,
        new_role: createForm.role
      });

      // --- LÓGICA DE ERROR CORREGIDA ---

      // 1. Manejar error de la llamada RPC (ej: error de red, permiso denegado)
      if (error) {
        throw new Error(error.message);
      }

      // 2. Manejar error devuelto por la *función* SQL (ej: usuario duplicado)
      //    Lo casteamos de forma segura para chequear la propiedad 'error'.
      const rpcData = data as { error?: string };
      if (rpcData && rpcData.error) {
        if (rpcData.error.includes("duplicate key")) {
          throw new Error("Un usuario con ese correo electrónico ya existe.");
        }
        // Lanzar el error SQL
        throw new Error(rpcData.error);
      }

      // 3. Si no hay errores, fue un éxito
      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado exitosamente',
      });

      setCreateDialogOpen(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'technician' });
      
      // Refrescar la lista de usuarios
      fetchUsers(); 
      
    } catch (error: any) {
      // El bloque catch ahora recibirá los errores que lanzamos (throw)
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
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
      // ¡ARREGLO! Ya no intentamos actualizar el email (auth.admin)
      // Solo actualizamos el nombre (profiles) y el rol (user_roles)
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').update({
          full_name: editForm.fullName
        }).eq('id', selectedUser.id),
        
        supabase.from('user_roles').update({
          role: editForm.role
        }).eq('user_id', selectedUser.id)
      ]);

      if (profileRes.error || roleRes.error) {
        throw profileRes.error || roleRes.error;
      }

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

  // ¡NUEVO! Función para activar/desactivar
  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await supabase.from('profiles').update({
        is_active: newStatus
      }).eq('id', userId);

      toast({
        title: newStatus ? 'Usuario Activado' : 'Usuario Desactivado',
        description: `El usuario ha sido ${newStatus ? 'activado' : 'desactivado'}.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del usuario',
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

  const getRoleColor = (role: string) => {
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
                {/* ¡FILTRO MEJORADO! */}
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
                    className="flex items-center justify-between p-4 border rounded-lg"
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
                        <Badge variant={user.is_active ? 'secondary' : 'outline'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
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
                        
                        {/* ¡BOTÓN MEJORADO! */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" title={user.is_active ? 'Desactivar' : 'Activar'}>
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Deseas {user.is_active ? 'desactivar' : 'activar'} la cuenta de {user.full_name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleUserActive(user.id, user.is_active)}>
                                {user.is_active ? 'Desactivar' : 'Activar'}
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

              {/* El campo de Email se elimina porque no se puede cambiar desde el cliente */}

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