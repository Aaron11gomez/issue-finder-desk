/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/types/ticket.ts */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  
  created_by: string; 
  created_by_name?: string; 
  created_by_email?: string; 
  assigned_to: string | null; 
  assigned_to_name?: string | null;
  
  category_id?: string;
  category_name?: string; 
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Nuevo: Interfaz para manejar las especialidades en la UI
export interface UserProfile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    is_active: boolean;
    specialties?: string[]; // Array de IDs de categorías
}