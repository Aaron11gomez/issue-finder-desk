/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/Profile.tsx */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Camera, Lock, User, Save, KeyRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Profile = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // Para forzar recarga de imagen

  // Estados para cambio de contraseña
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      // Construir URL predecible
      const path = `${profile.id}/avatar.png`;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
  }, [profile]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Perfil actualizado correctamente');
      // Recargar página para actualizar contextos si es necesario o usar un context refresh
      window.location.reload(); 
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (!passwords.current) {
        toast.error('Debes ingresar tu contraseña actual para confirmar.');
        return;
    }
    if (passwords.new !== passwords.confirm) {
        toast.error('Las contraseñas nuevas no coinciden.');
        return;
    }
    if (passwords.new.length < 6) {
        toast.error('La contraseña nueva debe tener al menos 6 caracteres.');
        return;
    }

    setLoading(true);
    try {
        // 1. Verificar contraseña antigua re-autenticando
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwords.current
        });

        if (signInError) {
            throw new Error('La contraseña actual es incorrecta.');
        }

        // 2. Si es correcta, actualizamos a la nueva
        const { error: updateError } = await supabase.auth.updateUser({ password: passwords.new });
        
        if (updateError) throw updateError;

        toast.success('Contraseña actualizada correctamente.');
        setPasswords({ current: '', new: '', confirm: '' });
        
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      // Forzamos el nombre a 'avatar.png' siempre para facilitar la recuperación
      const filePath = `${user?.id}/avatar.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Actualizar timestamp para que la imagen se refresque en la UI
      setAvatarTimestamp(Date.now());
      
      toast.success('Imagen de perfil actualizada');
    } catch (error: any) {
      toast.error('Error subiendo imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
            <h1 className="text-3xl font-bold">Configuración de Cuenta</h1>
            <p className="text-muted-foreground">Gestiona tu información personal y seguridad.</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Perfil General</TabsTrigger>
                <TabsTrigger value="security">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Información Personal</CardTitle>
                        <CardDescription>Así es como te verán otros usuarios en la plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar Upload */}
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <Avatar className="h-28 w-28 border-4 border-background shadow-lg cursor-pointer">
                                    {/* Añadimos timestamp al src para evitar caché */}
                                    <AvatarImage src={`${avatarUrl}?t=${avatarTimestamp}`} className="object-cover" />
                                    <AvatarFallback className="text-3xl bg-muted">{fullName?.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <label 
                                    htmlFor="avatar-upload" 
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white font-medium text-xs"
                                >
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="absolute bottom-6">Cambiar</span>
                                </label>
                                <input 
                                    type="file" 
                                    id="avatar-upload" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={uploadAvatar}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="text-center sm:text-left space-y-1">
                                <h3 className="font-medium text-lg">Foto de Perfil</h3>
                                <p className="text-sm text-muted-foreground">Sube una imagen en formato PNG o JPG.<br/>Se recomienda un tamaño cuadrado.</p>
                                {uploading && <div className="flex items-center gap-2 text-primary text-sm mt-2"><Loader2 className="w-3 h-3 animate-spin"/> Subiendo...</div>}
                            </div>
                        </div>

                        <div className="border-t my-4"></div>

                        <form onSubmit={updateProfile} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            value={fullName} 
                                            onChange={e => setFullName(e.target.value)} 
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <Input value={user?.email} disabled className="bg-muted opacity-70 cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Cambiar Contraseña</CardTitle>
                        <CardDescription>Por seguridad, te pediremos tu contraseña actual antes de hacer cambios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={updatePassword} className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label>Contraseña Actual</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        type="password" 
                                        value={passwords.current}
                                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                                        className="pl-9"
                                        placeholder="Ingresa tu contraseña actual"
                                    />
                                </div>
                            </div>
                            
                            <div className="border-t my-2"></div>

                            <div className="space-y-2">
                                <Label>Nueva Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        type="password" 
                                        value={passwords.new}
                                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                                        className="pl-9"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Confirmar Nueva Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        type="password" 
                                        value={passwords.confirm}
                                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                        className="pl-9"
                                        placeholder="Repite la nueva contraseña"
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button type="submit" disabled={loading} variant="default" className="w-full">
                                    {loading ? 'Verificando...' : 'Actualizar Contraseña'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;