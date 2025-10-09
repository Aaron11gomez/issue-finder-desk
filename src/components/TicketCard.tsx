import { Ticket } from '@/types/ticket';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from './PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TicketCardProps {
  ticket: Ticket;
  onClaim: (ticketId: string) => void;
}

export const TicketCard = ({ ticket, onClaim }: TicketCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
              <PriorityBadge priority={ticket.priority} />
            </div>
            <CardTitle className="text-lg leading-tight">{ticket.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2 text-sm">
          {ticket.description}
        </CardDescription>
        
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-secondary">
                {getInitials(ticket.createdBy.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{ticket.createdBy.name}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={() => onClaim(ticket.id)} 
          className="w-full"
          variant="default"
        >
          <User className="w-4 h-4 mr-2" />
          Claim Ticket
        </Button>
      </CardFooter>
    </Card>
  );
};
