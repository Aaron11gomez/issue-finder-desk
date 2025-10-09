export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  status: 'open' | 'assigned' | 'closed';
}
