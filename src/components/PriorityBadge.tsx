import { Priority } from '@/types/ticket';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
}

const priorityConfig = {
  critical: {
    label: 'Critical',
    className: 'bg-priority-critical/10 text-priority-critical border-priority-critical/20',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    className: 'bg-priority-high/10 text-priority-high border-priority-high/20',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    className: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    icon: Info,
  },
  low: {
    label: 'Low',
    className: 'bg-priority-low/10 text-priority-low border-priority-low/20',
    icon: CheckCircle,
  },
};

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} font-medium`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};
