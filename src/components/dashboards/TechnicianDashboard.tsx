/* src/components/dashboards/TechnicianDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Inbox, Zap, Flame, CheckCircle } from 'lucide-react';
import { Ticket } from '@/types/ticket';
import { TicketCard } from '@/components/TicketCard'; // Nueva tarjeta
import { ScrollArea } from '@/components/ui/scroll-area';

const TechnicianDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user && profile) fetchUnassignedTickets(); }, [user, profile]);

  useEffect(() => {
    let result = [...tickets];
    if (searchTerm) result = result.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.ticket_number.toString().includes(searchTerm));
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    setFilteredTickets(result);
  }, [tickets, searchTerm, priorityFilter]);

  const fetchUnassignedTickets = async () => {
    try {
      const { data, error } = await supabase.from('tickets').select(`*, service_categories(name)`).eq('status', 'open').is('assigned_to', null).order('created_at', { ascending: false });
      if (error) throw error;
      
      const specialties = (profile as any)?.specialties || [];
      // Filtramos por especialidad si el técnico tiene alguna definida
      const finalData = specialties.length ? (data || []).filter((t:any) => t.category_id && specialties.includes(t.category_id)) : (data || []);
      
      // Enriquecer con nombres de creadores
      const uIds = [...new Set(finalData.map((t:any) => t.created_by))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uIds);
      const map = new Map(profs?.map(p => [p.id, p.full_name]) || []);
      
      const mapped = finalData.map((t:any) => ({ 
          ...t, 
          creator_name: map.get(t.created_by) || 'Usuario',
          service_categories: t.service_categories || null
      }));
      
      setTickets(mapped);
      setFilteredTickets(mapped);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const assignTicket = async (id: string) => {
      await supabase.from('tickets').update({ assigned_to: user?.id, status: 'in_progress' }).eq('id', id);
      fetchUnassignedTickets();
  };

  if (loading) return <div className="flex items-center justify-center h-96">Cargando espacio de trabajo...</div>;

  // Estadísticas rápidas calculadas en el frontend
  const criticalCount = tickets.filter(t => t.priority === 'critical').length;
  const highCount = tickets.filter(t => t.priority === 'high').length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full animate-fade-in">
      
      {/* --- PANEL LATERAL (Sidebar de Filtros y Métricas) --- */}
      <aside className="w-full lg:w-64 space-y-4 shrink-0">
         <Card className="bg-primary/5 border-primary/10 shadow-none overflow-hidden relative">
            {/* Decoración de fondo */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
            <CardContent className="pt-6 relative z-10">
               <div className="flex items-center gap-2 mb-1 text-primary font-medium"><Inbox className="w-4 h-4" /> Bolsa de Tickets</div>
               <h3 className="text-4xl font-bold text-foreground tracking-tight">{tickets.length}</h3>
               <p className="text-xs text-muted-foreground mt-1">Pendientes de asignación en tus áreas.</p>
            </CardContent>
         </Card>

         <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 px-2 tracking-wider">Filtros Rápidos</h4>
            <Button variant={priorityFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start text-sm h-9" onClick={() => setPriorityFilter('all')}>
                <Inbox className="w-4 h-4 mr-2 opacity-70" /> Todos
            </Button>
            <Button variant={priorityFilter === 'critical' ? 'secondary' : 'ghost'} className="w-full justify-start text-sm h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setPriorityFilter('critical')}>
                <Flame className="w-4 h-4 mr-2" /> Críticos 
                {criticalCount > 0 && <span className="ml-auto text-xs bg-red-100 px-1.5 rounded-full">{criticalCount}</span>}
            </Button>
            <Button variant={priorityFilter === 'high' ? 'secondary' : 'ghost'} className="w-full justify-start text-sm h-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setPriorityFilter('high')}>
                <Zap className="w-4 h-4 mr-2" /> Alta Prioridad
                {highCount > 0 && <span className="ml-auto text-xs bg-orange-100 px-1.5 rounded-full">{highCount}</span>}
            </Button>
         </div>
      </aside>

      {/* --- ÁREA PRINCIPAL (Grid de Tickets) --- */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Barra de herramientas */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 backdrop-blur-sm p-1 sticky top-0 z-20">
            <div className="relative flex-1 w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input 
                    placeholder="Buscar por ID, título o descripción..." 
                    className="pl-9 bg-background border-muted-foreground/20" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline-block">Ordenar por:</span>
                <Select defaultValue="newest">
                    <SelectTrigger className="w-[140px] h-10 bg-background"><SelectValue placeholder="Orden" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Más recientes</SelectItem>
                        <SelectItem value="priority">Prioridad</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {/* Lista de Resultados */}
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                    <CheckCircle className="w-12 h-12 mb-3 opacity-20 text-green-500"/>
                    <p className="font-medium">¡Todo limpio!</p>
                    <p className="text-sm">No hay tickets pendientes con estos filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                    {filteredTickets.map((t) => (
                        <div key={t.id} className="transform hover:-translate-y-1 transition-transform duration-200">
                            <TicketCard 
                                ticket={t} 
                                onClick={() => navigate(`/ticket/${t.id}`)}
                                onClaim={assignTicket} // Pasamos la función de asignar
                            />
                        </div>
                    ))}
                </div>
            )}
          </ScrollArea>
      </div>
    </div>
  );
};

export default TechnicianDashboard;