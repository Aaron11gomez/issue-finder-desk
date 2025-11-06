/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/TechnicianDashboard.tsx */
/* --- CÓDIGO COMPLETO Y CORREGIDO --- */
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- DEFINICIÓN DE INTERFAZ CORREGIDA ---
interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  
  // Campo que rellenaremos manualmente
  creator_name: string;
}
// --- FIN DE CORRECCIÓN DE INTERFAZ ---

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassignedTickets();
  }, []);

  // =================================================================
  // ========= ¡INICIO DE LA CORRECCIÓN DE LÓGICA! ===================
  // =================================================================
  const fetchUnassignedTickets = async () => {
    try {
      // 1. Obtener tickets sin asignar
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`*`) // <-- Solo pedimos los tickets
        .eq('status', 'open')
        .is('assigned_to', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (ticketsError) throw ticketsError;
      if (!ticketsData || ticketsData.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      // 2. Obtener los IDs únicos de los creadores
      const userIds = [...new Set(ticketsData.map(t => t.created_by))];

      // 3. Obtener los perfiles de esos usuarios
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 4. Crear mapa de perfiles
      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      // 5. Unir los tickets con los nombres de los creadores
      const hydratedTickets = ticketsData.map(ticket => ({
        ...ticket,
        creator_name: profilesMap.get(ticket.created_by) || 'Usuario Desconocido'
      }));

      setTickets(hydratedTickets as any); 
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
  // =================================================================
  // ========= ¡FIN DE LA CORRECCIÓN DE LÓGICA! ======================
  // =================================================================


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
    } catch (error: any) { 
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo asignar el ticket',
        variant: 'destructive'
      });
    }
  };

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };
  
  const getStatusLabel = (status: string) => { // Función añadida
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };
  
  const getStatusColor = (status: string) => { // Función añadida
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
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

      <Card>
        <CardContent className="pt-6">
          {tickets.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No hay tickets sin asignar en este momento
            </p>
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
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </TableCell>
                    {/* CORREGIDO: Usar el campo 'creator_name' */}
                    <TableCell>{ticket.creator_name}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;