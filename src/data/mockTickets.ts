import { Ticket } from '@/types/ticket';

export const mockTickets: Ticket[] = [
  {
    id: 'TKT-1001',
    title: 'Unable to access company email',
    description: 'Getting authentication errors when trying to log into Outlook. Password reset didn\'t help.',
    priority: 'critical',
    createdBy: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
    },
    createdAt: '2025-10-09T08:30:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1002',
    title: 'Printer not responding in Building A',
    description: 'The main printer on the 3rd floor is not responding to print jobs. Multiple users affected.',
    priority: 'high',
    createdBy: {
      name: 'Michael Chen',
      email: 'michael.chen@company.com',
    },
    createdAt: '2025-10-09T09:15:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1003',
    title: 'Request for software installation',
    description: 'Need Adobe Creative Suite installed on my workstation for new design project.',
    priority: 'medium',
    createdBy: {
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@company.com',
    },
    createdAt: '2025-10-09T10:00:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1004',
    title: 'VPN connection keeps dropping',
    description: 'Working from home but VPN disconnects every 10-15 minutes. Need stable connection for meetings.',
    priority: 'high',
    createdBy: {
      name: 'David Park',
      email: 'david.park@company.com',
    },
    createdAt: '2025-10-09T10:30:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1005',
    title: 'Keyboard keys sticking',
    description: 'Several keys on my keyboard are sticking. Would like a replacement if possible.',
    priority: 'low',
    createdBy: {
      name: 'Lisa Thompson',
      email: 'lisa.thompson@company.com',
    },
    createdAt: '2025-10-09T11:00:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1006',
    title: 'Network drive access denied',
    description: 'Cannot access shared network drive //company/finance. Getting "Access Denied" error.',
    priority: 'high',
    createdBy: {
      name: 'Robert Martinez',
      email: 'robert.martinez@company.com',
    },
    createdAt: '2025-10-09T11:45:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1007',
    title: 'Monitor flickering',
    description: 'My second monitor has been flickering intermittently. Checked cables, issue persists.',
    priority: 'medium',
    createdBy: {
      name: 'Amanda Foster',
      email: 'amanda.foster@company.com',
    },
    createdAt: '2025-10-09T12:15:00Z',
    status: 'open',
  },
  {
    id: 'TKT-1008',
    title: 'Cannot join Teams meeting',
    description: 'Getting "Unable to connect" error when trying to join scheduled Teams meetings.',
    priority: 'critical',
    createdBy: {
      name: 'James Wilson',
      email: 'james.wilson@company.com',
    },
    createdAt: '2025-10-09T13:00:00Z',
    status: 'open',
  },
];
