/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/hooks/useAuth.tsx */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from './use-toast';

type UserRole = 'admin' | 'technician' | 'client';

interface Profile {
  id: string;
  full_name: string;
  is_active: boolean;
  specialties?: string[]; // <--- AGREGADO: Array de especialidades
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) toast({ title: "Inicio de sesión exitoso", description: "Bienvenido de vuelta" });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName } }
    });
    if (!error) toast({ title: "Registro exitoso", description: "Tu cuenta ha sido creada" });
    return { error };
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setRole(null);
    navigate('/auth');
    toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente" });
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); setUser(session?.user ?? null); setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); setRole(null); return; }
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        // 1. OBTENER EL PERFIL Y ESPECIALIDADES
        let profileData: Profile | null = null;
        const { data: profileRes, error: profileError } = await supabase
          .from('profiles')
          .select('*') // Esto traerá specialties si existe en la tabla
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Crear perfil si no existe
           const { data: newProfile } = await supabase
            .from('profiles')
            .insert({ id: user.id, full_name: user.user_metadata?.full_name || user.email })
            .select().single();
          profileData = newProfile as Profile;
        } else {
          profileData = profileRes;
        }

        if (profileData && !profileData.is_active) {
          toast({ title: "Cuenta inactiva", description: "Contacta al administrador.", variant: "destructive" });
          await signOut(); return;
        }
        if (isMounted) setProfile(profileData);

        // 2. OBTENER EL ROL
        const { data: roleRes } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        // Si no tiene rol, crear como client por defecto
        let userRole = roleRes?.role;
        if (!userRole) {
            await supabase.from('user_roles').insert({ user_id: user.id, role: 'client' });
            userRole = 'client';
        }
        if (isMounted) setRole(userRole as UserRole);

      } catch (error: any) {
        console.error('Error fetchUserData:', error);
      }
    };
    
    fetchUserData();
    
    // Realtime para roles
    const channel = supabase.channel(`role_updates_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` }, 
      (payload) => { if(isMounted) setRole(payload.new.role as UserRole); window.location.reload(); })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};