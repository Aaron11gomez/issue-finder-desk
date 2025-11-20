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
import { Input } from '@/components/ui/input'; // HU-19
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // HU-19
import { Search, Filter } from 'lucide-react'; // HU-19

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  creator_name: string;
  service_categories?: { name: string }; // HU-18: Categoría
}

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]); // HU-19: Lista filtrada
  const [loading, setLoading] = useState(true);
  
  // HU-19: Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // Opcional si implementas categorías
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassignedTickets();
  }, []);

  // HU-19: Efecto de filtrado
  useEffect(() => {
    let result = tickets;

    // Filtro Texto
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            t.description.toLowerCase().includes(lower) ||
            t.creator_name.toLowerCase().includes(lower)
        );
    }

    // Filtro Prioridad
    if (priorityFilter !== 'all') {
        result = result.filter(t => t.priority === priorityFilter);
    }

    setFilteredTickets(result);
  }, [tickets, searchTerm, priorityFilter]);

  const fetchUnassignedTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`*, service_categories(name)`) // Traer nombre categoría
        .eq('status', 'open')
        .is('assigned_to', null)
        .order('priority', { ascending: false }) // Críticos primero
        .order('created_at', { ascending: true }); // Más antiguos primero

      if (ticketsError) throw ticketsError;
      if (!ticketsData || ticketsData.length === 0) {
        setTickets([]);
        setFilteredTickets([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(ticketsData.map(t => t.created_by))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      const hydratedTickets = ticketsData.map(ticket => ({
        ...ticket,
        creator_name: profilesMap.get(ticket.created_by) || 'Usuario Desconocido'
      }));

      setTickets(hydratedTickets as any);
      setFilteredTickets(hydratedTickets as any); // Inicializar filtrados

    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los tickets', variant: 'destructive' });
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
      toast({ title: 'Ticket asignado', description: 'El ticket ha sido asignado exitosamente' });
      fetchUnassignedTickets();
    } catch (error: any) { 
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Helpers de color/label iguales...
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

  if (loading) return <div>Cargando tickets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-end md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Tickets sin Asignar</h1>
          <p className="text-muted-foreground mt-2">Cola de trabajo pendiente</p>
        </div>
        
        {/* HU-19: Barra de Herramientas de Filtro */}
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron tickets con estos criterios.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                        {ticket.title}
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ticket.description}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{ticket.service_categories?.name || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(ticket.priority)}>{getPriorityLabel(ticket.priority)}</Badge>
                    </TableCell>
                    <TableCell>{ticket.creator_name}</TableCell>
                    <TableCell>{format(new Date(ticket.created_at), "d MMM", { locale: es })}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/ticket/${ticket.id}`)}>Ver</Button>
                      <Button size="sm" onClick={() => assignTicket(ticket.id)}>Asignarme</Button>
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