/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/types/ticket.ts */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  ticket_number: number;
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
  
  // Alias opcionales
  creator_name?: string; 
  assignee_name?: string | null;

  category_id?: string;
  category_name?: string; 
  
  // CORRECCIÓN: Agregamos la propiedad que faltaba para el dashboard
  service_categories?: { 
    name: string 
  } | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserProfile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    is_active: boolean;
    specialties?: string[];
}