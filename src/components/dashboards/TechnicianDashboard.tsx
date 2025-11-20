/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/TechnicianDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { PriorityBadge } from '@/components/PriorityBadge'; // Importamos

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  creator_name: string;
  category_id?: string;
  service_categories?: { name: string };
}

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
        fetchUnassignedTickets();
    }
  }, [user, profile]);

  useEffect(() => {
    let result = [...tickets];

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            t.description.toLowerCase().includes(lower) ||
            t.creator_name.toLowerCase().includes(lower)
        );
    }

    if (priorityFilter !== 'all') {
        result = result.filter(t => t.priority === priorityFilter);
    }

    result.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredTickets(result);
  }, [tickets, searchTerm, priorityFilter, sortOrder]);

  const fetchUnassignedTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`*, service_categories(name)`)
        .eq('status', 'open')
        .is('assigned_to', null);

      if (ticketsError) throw ticketsError;

      let visibleTickets = ticketsData || [];
      
      const technicianSpecialties = (profile as any)?.specialties || [];
      
      if (technicianSpecialties.length > 0) {
          visibleTickets = visibleTickets.filter(t => 
             t.category_id && technicianSpecialties.includes(t.category_id)
          );
      }

      const userIds = [...new Set(visibleTickets.map(t => t.created_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      const hydratedTickets = visibleTickets.map(ticket => ({
        ...ticket,
        creator_name: profilesMap.get(ticket.created_by) || 'Usuario Desconocido'
      }));

      setTickets(hydratedTickets as any);
      setFilteredTickets(hydratedTickets as any);

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
        .update({ assigned_to: user?.id, status: 'in_progress' }).eq('id', ticketId);
      if (error) throw error;
      toast({ title: 'Ticket asignado', description: 'El ticket es tuyo.' });
      fetchUnassignedTickets();
    } catch (error: any) { 
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div>Cargando tickets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-end md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Cola de Trabajo</h1>
          <p className="text-muted-foreground mt-2">
             {(profile as any)?.specialties?.length > 0 
                ? "Mostrando tickets según tu especialidad." 
                : "Mostrando todos los tickets (Vista General)."}
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Prioridad</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v:any) => setSortOrder(v)}>
                <SelectTrigger className="w-[160px]"><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="newest">Más Recientes</SelectItem>
                    <SelectItem value="oldest">Más Antiguos</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay tickets pendientes en tus categorías asignadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título / Problema</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Hora Creación</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                        {ticket.title}
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ticket.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">Por: {ticket.creator_name}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{ticket.service_categories?.name || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                       <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col text-sm">
                             <span className="font-medium">{format(new Date(ticket.created_at), "HH:mm", { locale: es })}</span>
                             <span className="text-xs text-muted-foreground capitalize">
                                {format(new Date(ticket.created_at), "EEEE d", { locale: es })}
                             </span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => assignTicket(ticket.id)}>Atender</Button>
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