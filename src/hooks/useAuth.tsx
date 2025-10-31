import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from './use-toast';

type UserRole = 'admin' | 'technician' | 'client';

interface Profile {
  id: string;
  full_name: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Función para cerrar sesión de forma segura.
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    navigate('/auth');
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial al cargar la aplicación.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Marcamos la carga inicial como completa después de verificar la sesión.
      setLoading(false);
    });

    // 2. Escuchar cambios en el estado de autenticación (login/logout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Efecto separado para obtener datos y escuchar cambios de rol cuando el usuario cambia.
  useEffect(() => {
    // Si no hay usuario, limpiar los datos y terminar.
    if (!user) {
      setProfile(null);
      setRole(null);
      return;
    }

    // Función para obtener los datos del perfil y rol del usuario actual.
    const fetchUserData = async () => {
      try {
        const [profileRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('user_roles').select('role').eq('user_id', user.id).single()
        ]);

        if (profileRes.error || roleRes.error) {
           console.error("Error fetching user data:", profileRes.error || roleRes.error);
           // Si no se encuentra el perfil o rol (puede pasar justo después de registrarse)
           // el trigger de la DB lo creará, y el realtime lo actualizará.
           // No es un error crítico, pero lo dejamos en consola.
        }

        const profileData = profileRes.data;
        if (profileData) {
          if (!profileData.is_active) {
            toast({
              title: "Cuenta inactiva",
              description: "Tu cuenta ha sido desactivada. Contacta al administrador.",
              variant: "destructive"
            });
            await signOut();
            return;
          }
          setProfile(profileData);
        }

        const roleData = roleRes.data;
        if (roleData) {
          setRole(roleData.role as UserRole);
        } else {
          // Si no hay rol, por defecto es cliente (hasta que el realtime lo actualice si cambia)
          setRole('client');
        }

      } catch (error) {
        console.error('Error en fetchUserData:', error);
      }
    };
    
    fetchUserData();

    // 4. Configurar el canal de Realtime para escuchar cambios en el rol.
    const roleUpdateChannel = supabase
      .channel(`user_role_changes_${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_roles', 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          const newRole = payload.new.role as UserRole;
          console.log('Role changed via Realtime to:', newRole);
          setRole(newRole);
          toast({
            title: "Rol actualizado",
            description: `Tu rol ha sido cambiado a '${newRole}'. La página se recargará.`,
          });
          // Recargar la página para reflejar los nuevos permisos y vistas.
          setTimeout(() => window.location.reload(), 2000);
        }
      )
      .subscribe();

    // Función de limpieza para este efecto.
    return () => {
      if (roleUpdateChannel) {
        supabase.removeChannel(roleUpdateChannel);
      }
    };
  }, [user]); // Este efecto se ejecuta cada vez que el objeto 'user' cambia.

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de vuelta",
      });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName
        }
      }
    });
    
    if (!error) {
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada",
      });
    }
    
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};