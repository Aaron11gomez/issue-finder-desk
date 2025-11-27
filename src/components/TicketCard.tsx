/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/TicketCard.tsx */
import { Ticket } from '@/types/ticket';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from './PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketCardProps {
  ticket: Ticket;
  onClaim?: (ticketId: string) => void;
  onClick?: () => void;
  isClosed?: boolean;
}

export const TicketCard = ({ ticket, onClaim, onClick, isClosed }: TicketCardProps) => {
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es });

  const formattedId = ticket.ticket_number 
      ? ticket.ticket_number.toString().padStart(5, '0') 
      : '-----';

  return (
    <Card className={`hover:shadow-md transition-all duration-200 border-border cursor-pointer group h-full flex flex-col ${isClosed ? 'opacity-90 bg-muted/10 border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`} onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Mostrar ID Numérico */}
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-bold">
                #{formattedId}
              </span>
              <PriorityBadge priority={ticket.priority} />
            </div>
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {ticket.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 flex-1">
        <CardDescription className="line-clamp-2 text-sm mb-3">
          {ticket.description}
        </CardDescription>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-secondary">
                {getInitials(ticket.created_by_name || ticket.creator_name || 'User')}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[120px]">{ticket.created_by_name || ticket.creator_name || 'Usuario'}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center">
         <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
         </div>
         
         {onClaim && (
            <Button 
                onClick={(e) => {
                e.stopPropagation();
                onClaim(ticket.id);
                }} 
                size="sm"
                variant="default"
                className="h-7 text-xs"
            >
                <User className="w-3 h-3 mr-1" />
                Atender
            </Button>
         )}
      </CardFooter>
    </Card>
  );
};