export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  created_by_id: string;
  created_by_name: string;
  created_by_email: string;
  assigned_to_id: string | null;
  created_at: string;
  updated_at: string;
  status: 'open' | 'assigned' | 'closed';
}
