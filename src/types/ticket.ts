export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  
  // Relaciones y Datos Extendidos
  created_by: string; // ID del usuario
  created_by_name?: string; // Nombre (unido manualmente)
  created_by_email?: string; // Email (unido manualmente)
  assigned_to: string | null; // ID del técnico
  assigned_to_name?: string | null;
  
  category_id?: string;
  category_name?: string; // Para mostrar en la UI
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}