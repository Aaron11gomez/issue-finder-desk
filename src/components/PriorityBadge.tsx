/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/PriorityBadge.tsx */
import { Priority } from '@/types/ticket';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
}

const priorityConfig = {
  critical: {
    label: 'Crítica', // Español
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
    icon: AlertCircle,
  },
  high: {
    label: 'Alta', // Español
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Media', // Español
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    icon: Info,
  },
  low: {
    label: 'Baja', // Español
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    icon: CheckCircle,
  },
};

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const config = priorityConfig[priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} font-medium gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};