/* src/components/TicketCard.tsx */
import { Ticket } from '@/types/ticket';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MoreHorizontal, User, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
  onClaim?: (ticketId: string) => void;
  onClick?: () => void;
  isClosed?: boolean;
}

// Configuración visual por prioridad para fácil identificación
const priorityStyles = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600' },
  high: { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600' },
  medium: { border: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-600' },
  low: { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600' },
};

export const TicketCard = ({ ticket, onClaim, onClick, isClosed }: TicketCardProps) => {
  const style = priorityStyles[ticket.priority] || priorityStyles.medium;
  const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es });
  // Formateo seguro del número de ticket
  const formattedId = ticket.ticket_number?.toString().padStart(5, '0') || '-----';

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : 'TX';

  return (
    <Card 
      className={cn(
        "relative group overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer border-l-[4px]",
        style.border,
        isClosed ? "opacity-80 bg-muted/40 grayscale-[0.5]" : "bg-card"
      )}
      onClick={onClick}
    >
      {/* Cabecera Compacta */}
      <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start space-y-0">
        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                #{formattedId}
                </span>
                <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider border-0 h-5 font-bold px-1.5", style.bg, style.text)}>
                {ticket.priority}
                </Badge>
            </div>
            
            {/* Menú de Acciones Rápidas (visible al hacer hover o siempre en móvil) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {onClaim && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClaim(ticket.id); }}>
                            <User className="mr-2 h-4 w-4"/> Atender Ticket
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
                        <ArrowRightCircle className="mr-2 h-4 w-4"/> Ver detalles completos
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1 pr-4">
            {ticket.title}
          </h3>
        </div>
      </CardHeader>

      {/* Cuerpo: Resumen del problema */}
      <CardContent className="p-3 py-2">
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
          {ticket.description}
        </p>
      </CardContent>

      {/* Pie: Contexto Social y Temporal */}
      <CardFooter className="p-3 pt-0 flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5 border border-border">
            <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-bold">
              {getInitials(ticket.created_by_name || ticket.creator_name || 'User')}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
            {ticket.created_by_name || ticket.creator_name || 'Usuario'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-full" title={new Date(ticket.created_at).toLocaleString()}>
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
      </CardFooter>
      
      {/* Indicador visual de hover en la parte inferior */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full transition-all duration-300 ease-out" />
    </Card>
  );
};