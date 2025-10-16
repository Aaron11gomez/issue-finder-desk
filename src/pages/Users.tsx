import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, UserX, Search } from 'lucide-react';
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
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'client' as 'admin' | 'technician' | 'client'
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: 'client' as 'admin' | 'technician' | 'client'
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
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const userIds = authUsers.map(u => u.id);
      
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('user_roles').select('*').in('user_id', userIds)
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const rolesMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);

      const enrichedUsers = authUsers.map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: profilesMap.get(user.id)?.full_name || 'Usuario',
        is_active: profilesMap.get(user.id)?.is_active ?? true,
        role: rolesMap.get(user.id) || 'client'
      }));

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
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
      const { data, error } = await supabase.auth.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        email_confirm: true,
        user_metadata: {
          full_name: createForm.fullName
        }
      });

      if (error) throw error;

      if (data.user && createForm.role !== 'client') {
        await supabase.from('user_roles').delete().eq('user_id', data.user.id);
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: createForm.role
        });
      }

      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado exitosamente',
      });

      setCreateDialogOpen(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'client' });
      fetchUsers();
    } catch (error: any) {
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

    if (!selectedUser || !editForm.fullName || !editForm.email) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      return;
    }

    try {
      await Promise.all([
        supabase.auth.admin.updateUserById(selectedUser.id, {
          email: editForm.email
        }),
        supabase.from('profiles').update({
          full_name: editForm.fullName
        }).eq('id', selectedUser.id)
      ]);

      if (editForm.role !== selectedUser.role) {
        await supabase.from('user_roles').delete().eq('user_id', selectedUser.id);
        await supabase.from('user_roles').insert({
          user_id: selectedUser.id,
          role: editForm.role
        });
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

  const deactivateUser = async (userId: string) => {
    try {
      await supabase.from('profiles').update({
        is_active: false
      }).eq('id', userId);

      toast({
        title: 'Usuario desactivado',
        description: 'El usuario ha sido desactivado',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el usuario',
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
      email: user.email,
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
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-2">
              Administra las cuentas de usuario del sistema
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
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
                      <SelectItem value="client">Cliente</SelectItem>
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
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="technician">Técnicos</SelectItem>
                    <SelectItem value="client">Clientes</SelectItem>
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
                        {!user.is_active && (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.is_active && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <UserX className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Deseas desactivar la cuenta de {user.full_name}? El usuario no podrá iniciar sesión hasta que su cuenta sea reactivada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deactivateUser(user.id)}>
                                  Desactivar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
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
                <Label htmlFor="edit-email">Correo Electrónico</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                    <SelectItem value="client">Cliente</SelectItem>
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