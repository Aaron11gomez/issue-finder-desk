/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/hooks/useAuth.tsx */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; // <-- MODIFICACIÓN: Importado de 'sonner'

type UserRole = 'admin' | 'technician' | 'client';

interface Profile {
  id: string;
  full_name: string;
  email: string;
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
    /* --- MODIFICACIÓN: Toast de Sonner --- */
    toast.success("Sesión cerrada", {
      description: "Has cerrado sesión correctamente",
    });
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial al cargar la aplicación.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    if (!user) {
      setProfile(null);
      setRole(null);
      return;
    }

    // =================================================================
    // ========= ¡INICIO DE LA CORRECCIÓN DE PERFIL/ROL! ===============
    // =================================================================
    const fetchUserData = async () => {
      try {
        // 1. OBTENER EL PERFIL
        let profileData: Profile | null = null;
        const { data: profileRes, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // ¡El perfil no existe! Lo creamos.
          console.warn("No profile found for user, creating one...");
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || 'Usuario'
            })
            .select()
            .single();
          
          if (createError) throw createError;
          profileData = newProfile as Profile;
        } else if (profileError) {
          throw profileError;
        } else {
          profileData = profileRes;
        }

        // 2. VERIFICAR SI ESTÁ ACTIVO (basado en el perfil obtenido o recién creado)
        if (profileData && !profileData.is_active) {
          /* --- MODIFICACIÓN: Toast de Sonner --- */
          toast.error("Cuenta inactiva", {
            description: "Tu cuenta ha sido desactivada. Contacta al administrador.",
            duration: 5000,
          });
          await signOut();
          return;
        }
        setProfile(profileData);

        // 3. OBTENER EL ROL
        let roleData: { role: UserRole } | null = null;
        const { data: roleRes, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError && roleError.code === 'PGRST116') {
          // ¡El rol no existe! Lo creamos con 'client' por defecto.
          console.warn("No role found for user, creating one (default: client)...");
          const { data: newRole, error: createRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'client'
            })
            .select('role')
            .single();
          
          if (createRoleError) throw createRoleError;
          roleData = newRole as { role: UserRole };
        } else if (roleError) {
          throw roleError;
        } else {
          roleData = roleRes;
        }
        
        setRole(roleData?.role || 'client');

      } catch (error: any) {
        console.error('Error en fetchUserData:', error);
        /* --- MODIFICACIÓN: Toast de Sonner --- */
        toast.error('Error de autenticación', {
          description: `No se pudo cargar tu perfil: ${error.message}`,
        });
      }
    };
    // =================================================================
    // ========= ¡FIN DE LA CORRECCIÓN! ===============================
    // =================================================================
    
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
          /* --- MODIFICACIÓN: Toast de Sonner --- */
          toast.info("Rol actualizado", {
            description: `Tu rol ha sido cambiado a '${newRole}'. La página se recargará.`,
          });
          setTimeout(() => window.location.reload(), 2000);
        }
      )
      .subscribe();

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
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.success("Inicio de sesión exitoso", {
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
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.success("Registro exitoso", {
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