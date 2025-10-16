import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassignedTickets();
  }, []);

  const fetchUnassignedTickets = async () => {
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
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los tickets',
        variant: 'destructive'
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

      toast({
        title: 'Ticket asignado',
        description: 'El ticket ha sido asignado exitosamente',
      });

      fetchUnassignedTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: 'No se pudo asignar el ticket',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
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

  if (loading) {
    return <div>Cargando tickets...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tickets sin Asignar</h1>
        <p className="text-muted-foreground mt-2">
          Tickets pendientes de ser atendidos
        </p>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay tickets sin asignar en este momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{ticket.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Por: {ticket.creator_profile?.full_name || 'Usuario'}</span>
                      <span>•</span>
                      <span>{format(new Date(ticket.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{ticket.description}</p>
                <div className="flex gap-2">
                  <Button onClick={() => assignTicket(ticket.id)}>
                    Asignarme
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;