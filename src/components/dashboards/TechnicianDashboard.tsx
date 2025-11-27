/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/TechnicianDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Inbox } from 'lucide-react';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Ticket } from '@/types/ticket'; // IMPORTAR TIPO CORRECTO

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
      const { data, error } = await supabase.from('tickets').select(`*, service_categories(name)`).eq('status', 'open').is('assigned_to', null);
      if (error) throw error;
      // Filtro por especialidad
      const specialties = (profile as any)?.specialties || [];
      const finalData = specialties.length ? (data || []).filter((t:any) => t.category_id && specialties.includes(t.category_id)) : (data || []);
      
      // Obtener nombres
      const uIds = [...new Set(finalData.map((t:any) => t.created_by))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uIds);
      const map = new Map(profs?.map(p => [p.id, p.full_name]) || []);
      
      // Mapear al tipo Ticket asegurando que service_categories esté bien
      const mapped = finalData.map((t:any) => ({ 
          ...t, 
          creator_name: map.get(t.created_by) || 'Usuario',
          // Asegurar que service_categories exista o sea null
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

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div><h1 className="text-3xl font-bold tracking-tight">Buzón de Entrada</h1><p className="text-muted-foreground">Tickets pendientes de asignación.</p></div>
        <div className="flex gap-2"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar ticket..." className="pl-8 w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-[130px]"><Filter className="w-4 h-4 mr-2"/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Prioridad</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
          {filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Inbox className="w-12 h-12 mb-2 opacity-20"/><p>No hay tickets pendientes.</p></div>
          ) : (
              <div className="divide-y">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
                      <div className="col-span-1">ID</div>
                      <div className="col-span-5">Asunto / Descripción</div>
                      <div className="col-span-2">Categoría</div>
                      <div className="col-span-2">Prioridad</div>
                      <div className="col-span-2 text-right">Acción</div>
                  </div>
                  {filteredTickets.map((t) => (
                      <div key={t.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => navigate(`/ticket/${t.id}`)}>
                          <div className="col-span-1 font-mono text-xs font-bold text-muted-foreground">#{t.ticket_number.toString().padStart(5,'0')}</div>
                          <div className="col-span-5">
                              <div className="font-medium text-sm truncate">{t.title}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-md">{t.description}</div>
                          </div>
                          <div className="col-span-2"><Badge variant="secondary" className="font-normal">{t.service_categories?.name || 'General'}</Badge></div>
                          <div className="col-span-2"><PriorityBadge priority={t.priority} /></div>
                          <div className="col-span-2 text-right"><Button size="sm" onClick={(e) => { e.stopPropagation(); assignTicket(t.id); }}>Atender</Button></div>
                      </div>
                  ))}
              </div>
          )}
      </Card>
    </div>
  );
};

export default TechnicianDashboard;