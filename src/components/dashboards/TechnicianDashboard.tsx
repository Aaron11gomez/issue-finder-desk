/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/TechnicianDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card'; // <-- MODIFICACIÓN: CardHeader eliminado
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner'; // <-- MODIFICACIÓN: Cambiado a Sonner
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Inbox } from 'lucide-react'; // <-- MODIFICACIÓN: Importar Icono

// --- NUEVOS IMPORTS PARA LA TABLA ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton'; // <-- MODIFICACIÓN: Importar Skeleton
// --- FIN DE NUEVOS IMPORTS ---

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  created_at: string;
  created_by: string;
  creator_profile: {
    full_name: string;
  } | null;
}

// --- MODIFICACIÓN: Componente Skeleton ---
const TicketListSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead className="text-right"><Skeleton className="h-5 w-40 ml-auto" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(3)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell className="text-right space-x-2">
            <Skeleton className="h-8 w-16 inline-block" />
            <Skeleton className="h-8 w-24 inline-block" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
// --- FIN DE SKELETON ---

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassignedTickets();
  }, []);

  const fetchUnassignedTickets = async () => {
    // ... (Lógica de fetch sin cambios)
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'open')
        .is('assigned_to', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (ticketsError) throw ticketsError;

      if (ticketsData && ticketsData.length > 0) {
        const userIds = [...new Set(ticketsData.map(t => t.created_by))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const enrichedTickets = ticketsData.map(ticket => ({
          ...ticket,
          creator_profile: profilesMap.get(ticket.created_by) || null
        }));
        
        setTickets(enrichedTickets as any);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.error('Error', {
        description: 'No se pudieron cargar los tickets',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          assigned_to: user?.id,
          status: 'in_progress'
        })
        .eq('id', ticketId);

      if (error) throw error;

      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.success('Ticket asignado', {
        description: 'El ticket ha sido asignado exitosamente',
      });

      fetchUnassignedTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.error('Error', {
        description: 'No se pudo asignar el ticket',
      });
    }
  };

  // ... (getPriorityColor y getPriorityLabel sin cambios)
  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };
  // --- FIN DE HELPERS ---

  // --- MODIFICACIÓN: Estado de carga con Skeleton ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tickets sin Asignar</h1>
          <p className="text-muted-foreground mt-2">
            Tickets pendientes de ser atendidos
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TicketListSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }
  // --- FIN DE MODIFICACIÓN ---

  return (
    <div className="space-y-6 animate-fade-in"> {/* MODIFICACIÓN: Animación añadida */}
      <div>
        <h1 className="text-3xl font-bold">Tickets sin Asignar</h1>
        <p className="text-muted-foreground mt-2">
          Tickets pendientes de ser atendidos
        </p>
      </div>

      {/* --- RENDERIZADO MODIFICADO --- */}
      <Card>
        <CardContent className="pt-6">
          {tickets.length === 0 ? (
            /* --- MODIFICACIÓN: Estado vacío mejorado --- */
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <Inbox className="w-16 h-16 text-muted-foreground/50 mb-6" />
              <h3 className="text-xl font-semibold">¡Bandeja limpia!</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                No hay tickets sin asignar en este momento. ¡Buen trabajo!
              </p>
            </div>
            /* --- FIN DE MODIFICACIÓN --- */
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  /* --- MODIFICACIÓN: Hover añadido --- */
                  <TableRow key={ticket.id} className="transition-all hover:shadow-md hover:scale-[1.01]">
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.creator_profile?.full_name || 'Usuario'}</TableCell>
                    <TableCell>
                      {format(new Date(ticket.created_at), "d MMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                      >
                        Ver
                      </Button>
                      <Button size="sm" onClick={() => assignTicket(ticket.id)}>
                        Asignarme
                      </Button>
                    </TableCell>
                  </TableRow>
                  /* --- FIN DE MODIFICACIÓN --- */
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* --- FIN DE RENDERIZADO MODIFICADO --- */}
    </div>
  );
};

export default TechnicianDashboard;