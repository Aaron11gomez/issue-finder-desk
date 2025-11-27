/* src/contexts/AuthContext.tsx */
import { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Función segura para cargar datos sin detener la app
  const fetchUserData = async (userId: string) => {
    try {
      // Intentamos obtener rol y perfil
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Usamos maybeSingle para no lanzar error si no existe

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (roleData) setRole(roleData.role);
      else setRole('client'); // Rol por defecto si falla o no existe
      
      if (profileData) setProfile(profileData);

    } catch (error) {
      console.error("Error cargando datos extra:", error);
      // En caso de error, aseguramos un rol básico para que la UI funcione
      setRole('client');
    }
  };

  useEffect(() => {
    // 1. Verificar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Si hay usuario, buscamos sus datos en segundo plano
      if (session?.user) {
        fetchUserData(session.user.id);
      }

      // IMPORTANTE: Quitamos loading INMEDIATAMENTE, igual que en Master.
      // No esperamos a fetchUserData.
      setLoading(false);
    });

    // 2. Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Carga en background
        fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }

      // Aseguramos siempre quitar el loading
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Funciones de Auth ---

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error };
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: fullName } }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    // Forzamos redirección o limpieza si es necesario
    window.location.href = '/auth'; 
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};