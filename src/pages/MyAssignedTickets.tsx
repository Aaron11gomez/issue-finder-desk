/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/MyAssignedTickets.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, ArrowUpDown, Clock, CheckCircle2, PlayCircle, History } from 'lucide-react';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  creator_name?: string;
}

const MyAssignedTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchMyAssignedTickets();
  }, [user]);

  // Efecto de filtrado y separación
  useEffect(() => {
    let result = [...tickets];

    // 1. Búsqueda
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            (t.description && t.description.toLowerCase().includes(lower)) ||
            t.id.toLowerCase().includes(lower)
        );
    }

    // 2. Prioridad
    if (priorityFilter !== 'all') {
        result = result.filter(t => t.priority === priorityFilter);
    }

    // 3. Ordenamiento
    result.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // 4. Separación
    setActiveTickets(result.filter(t => t.status === 'in_progress'));
    setClosedTickets(result.filter(t => t.status === 'closed'));

  }, [tickets, searchTerm, priorityFilter, sortOrder]);

  const fetchMyAssignedTickets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('assigned_to', user.id)
        .in('status', ['in_progress', 'closed']) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let dataTickets = data as Ticket[] || [];

      if (dataTickets.length > 0) {
        const userIds = [...new Set(dataTickets.map(t => t.created_by))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const namesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        dataTickets = dataTickets.map(t => ({
            ...t,
            creator_name: namesMap.get(t.created_by) || 'Usuario'
        }));
      }
      
      setTickets(dataTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los tickets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div>Cargando tickets...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* HEADER Y FILTROS */}
        <div className="flex flex-col md:flex-row justify-between gap-6 items-end md:items-center bg-card/50 p-4 rounded-xl border shadow-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mis Tickets</h1>
              <p className="text-muted-foreground mt-1">Gestiona tu carga de trabajo y consulta tu historial.</p>
            </div>

            <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-background" />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[140px] bg-background"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Prioridad</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(v:any) => setSortOrder(v)}>
                    <SelectTrigger className="w-[160px] bg-background"><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Más Recientes</SelectItem>
                        <SelectItem value="oldest">Más Antiguos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* SECCIÓN 1: EN PROGRESO (Activos) */}
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                {/* ICONO DE COLOR AZUL */}
                <PlayCircle className="h-5 w-5 text-blue-600" /> 
                <h2 className="text-xl font-semibold">En Progreso ({activeTickets.length})</h2>
            </div>
            
            {activeTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                    <p className="text-muted-foreground">No tienes tickets activos. ¡Buen trabajo!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} navigate={navigate} />
                    ))}
                </div>
            )}
        </div>

        {/* SECCIÓN 2: HISTORIAL (Cerrados) */}
        <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold text-muted-foreground">Historial de Cerrados ({closedTickets.length})</h2>
            </div>
            
            {closedTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no tienes tickets cerrados.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                    {closedTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} navigate={navigate} isClosed />
                    ))}
                </div>
            )}
        </div>

      </div>
    </Layout>
  );
};

// Subcomponente de Tarjeta para reutilizar
const TicketCard = ({ ticket, navigate, isClosed = false }: { ticket: Ticket, navigate: any, isClosed?: boolean }) => {
    
    const getStatusBadge = (status: string) => {
        switch (status) {
          case 'in_progress': 
            // NUEVO COLOR PARA "EN PROGRESO"
            return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">En Progreso</Badge>; 
          case 'closed': 
            return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">Cerrado</Badge>;
          default: 
            return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card 
            className={cn(
                "flex flex-col h-full hover:shadow-md transition-all duration-200 group cursor-pointer border-l-4",
                isClosed ? "border-l-green-500 bg-muted/10" : "border-l-blue-500" // BORDE AZUL PARA "EN PROGRESO"
            )} 
            onClick={() => navigate(`/ticket/${ticket.id}`)}
        >
            <CardHeader className="pb-3 pt-5">
                <div className="flex justify-between items-start mb-2">
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        #{ticket.id.substring(0, 6)}
                    </span>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {ticket.title}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {ticket.description}
                </p>
                
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                    <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {ticket.creator_name?.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-muted-foreground truncate">
                        {ticket.creator_name}
                    </span>
                </div>
            </CardContent>

            <CardFooter className="pt-0 pb-4 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                    <PriorityBadge priority={ticket.priority} />
                    <span className="flex items-center gap-1" title={new Date(ticket.created_at).toLocaleString()}>
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
                    </span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 -mr-2 hover:bg-primary/10 hover:text-primary">
                    {isClosed ? <CheckCircle2 className="w-4 h-4 mr-1"/> : null} Ver
                </Button>
            </CardFooter>
        </Card>
    );
}

export default MyAssignedTickets;