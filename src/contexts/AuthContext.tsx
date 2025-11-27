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
  // "loading" solo debe ser true durante la carga INICIAL de la página
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Carga inicial fuerte
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            await fetchUserData(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Error inicializando auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios (login en otra pestaña, refresh token, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      // Actualizamos estado local
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // IMPORTANTE: NO ponemos setLoading(true) aquí para evitar el bloqueo
        // Hacemos la carga de datos en "segundo plano"
        await fetchUserData(newSession.user.id);
      } else {
        // Si es logout, limpiamos
        setProfile(null);
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Obtenemos datos en paralelo para mayor velocidad
      const [profileReq, roleReq] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single()
      ]);

      setProfile(profileReq.data);
      setRole(roleReq.data?.role || 'client');
    } catch (error) {
      console.error("Error fetching user data background:", error);
    }
  };

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
    toast.info('Sesión cerrada');
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};