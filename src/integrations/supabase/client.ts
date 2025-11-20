/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/integrations/supabase/client.ts */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // CAMBIO CLAVE: Usar sessionStorage en lugar de localStorage
    // Esto asegura que la sesión muera cuando se cierra la pestaña
    storage: sessionStorage, 
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});