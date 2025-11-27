/* src/pages/KanbanBoard.tsx */
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Ticket } from '@/types/ticket'; 
import { useNavigate } from 'react-router-dom';
import { AssignTicketDialog } from '@/components/AssignTicketDialog';
import { Search, Filter, Kanban, RefreshCcw, GripVertical, AlertCircle, Zap, Circle, CheckCircle2, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type TicketStatus = 'open' | 'in_progress' | 'closed';

interface ColumnData {
  id: TicketStatus;
  title: string;
  color: string;
  bg: string;
  border: string;
  icon: any;
}

// Configuración visual de las columnas (Más limpias)
const COLUMN_CONFIG: Record<TicketStatus, ColumnData> = {
  open: { 
    id: 'open', 
    title: 'Por Asignar', 
    color: 'text-slate-600',
    bg: 'bg-slate-100/50',
    border: 'border-slate-200',
    icon: Circle
  },
  in_progress: { 
    id: 'in_progress', 
    title: 'En Progreso', 
    color: 'text-blue-600',
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    icon: Zap
  },
  closed: { 
    id: 'closed', 
    title: 'Completado', 
    color: 'text-green-600',
    bg: 'bg-green-50/50',
    border: 'border-green-200',
    icon: CheckCircle2
  },
};

const KanbanBoard = () => {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<{id: string, title: string} | null>(null);

  useEffect(() => { 
    if (user) {
        fetchTickets(); 
        const interval = setInterval(fetchTickets, 60000); 
        return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user || role === 'client') return; 
    try {
      setIsRefreshing(true);
      if (allTickets.length === 0) setLoading(true);

      let query = supabase
        .from('tickets')
        .select('*')
        .in('status', ['open', 'in_progress', 'closed'])
        .order('created_at', { ascending: false });
      
      if (role === 'technician') {
        query = query.eq('assigned_to', user.id);
      }
      
      const { data: ticketsData, error } = await query;
      if (error) throw error;

      if (!ticketsData) return;

      const userIds = [...new Set(ticketsData.map((t: any) => t.created_by).filter(Boolean))];
      let namesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
          if (profiles) namesMap = new Map(profiles.map(p => [p.id, p.full_name]));
      }

      const formattedTickets: Ticket[] = ticketsData.map((t: any) => ({
        ...t,
        creator_name: namesMap.get(t.created_by) || 'Usuario',
        status: ['open', 'in_progress', 'closed'].includes(t.status) ? t.status : 'open',
        ticket_number: t.ticket_number || 0,
        // Simulamos nombre de categoría si no viene en el join simple (puedes mejorar esto con un join real)
        category_name: 'Soporte' 
      }));

      setAllTickets(formattedTickets);
    } catch (error: any) { 
        console.error("Error fetchTickets:", error);
        toast.error('Error cargando tickets'); 
    } finally { 
        setLoading(false); 
        setIsRefreshing(false);
    }
  };

  const columns = useMemo(() => {
    const cols: Record<TicketStatus, Ticket[]> = { open: [], in_progress: [], closed: [] };
    let filtered = allTickets;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(lower) || t.ticket_number?.toString().includes(lower));
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    filtered.forEach(ticket => {
      const status = ticket.status as TicketStatus;
      if (cols[status]) cols[status].push(ticket);
    });
    return cols;
  }, [allTickets, searchTerm, priorityFilter]);

  const onDragEnd: OnDragEndResponder = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

    const ticketId = draggableId;
    const newStatus = destination.droppableId as TicketStatus;
    const oldStatus = source.droppableId as TicketStatus;

    if (role === 'admin' && newStatus === 'in_progress' && oldStatus !== 'in_progress') { 
        const ticket = allTickets.find(t => t.id === ticketId);
        if (ticket) { setTicketToAssign({ id: ticket.id, title: ticket.title }); setAssignDialogOpen(true); return; }
    }

    const updatedTickets = allTickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t);
    setAllTickets(updatedTickets);

    try {
        const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
        if (role === 'technician' && newStatus === 'in_progress') { 
             const currentTicket = allTickets.find(t => t.id === ticketId);
             if (!currentTicket?.assigned_to) updates.assigned_to = user?.id;
        }
        const { error } = await supabase.from('tickets').update(updates).eq('id', ticketId);
        if (error) throw error;
        toast.success(`Ticket movido a ${COLUMN_CONFIG[newStatus].title}`);
    } catch (error) {
        toast.error('No se pudo actualizar');
        fetchTickets();
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 max-w-[1800px] mx-auto animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Kanban className="w-6 h-6 text-primary" />
                    Tablero Kanban
                </h1>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto bg-background p-1 rounded-lg border shadow-sm">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 border-none shadow-none focus-visible:ring-0 h-9"/>
                </div>
                <div className="h-6 w-px bg-border mx-1"></div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0 h-9 gap-2 text-xs font-medium bg-muted/50 hover:bg-muted">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent><SelectItem value="all">Prioridad</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="low">Baja</SelectItem></SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={fetchTickets} className={cn("h-9 w-9 hover:bg-muted text-muted-foreground", isRefreshing && "animate-spin text-primary")}><RefreshCcw className="w-4 h-4" /></Button>
            </div>
        </div>

        {/* TABLERO */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-4 min-w-[1000px]">
                    {Object.entries(COLUMN_CONFIG).map(([columnId, config]) => (
                        <KanbanColumn 
                            key={columnId}
                            config={config}
                            tickets={columns[columnId as TicketStatus]}
                            loading={loading}
                            navigate={navigate}
                        />
                    ))}
                </div>
            </DragDropContext>
        </div>

        {ticketToAssign && <AssignTicketDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} ticketId={ticketToAssign.id} currentTitle={ticketToAssign.title} onAssigned={fetchTickets} />}
      </div>
    </Layout>
  );
};

// --- NUEVA TARJETA KANBAN (DISEÑO CLEAN / NOTION-LIKE) ---
const KanbanCard = ({ ticket, onClick }: { ticket: Ticket, onClick: () => void }) => {
    // Icono y color según prioridad
    const priorityInfo = {
        critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
        high: { icon: Zap, color: "text-orange-500", bg: "bg-orange-50" },
        medium: { icon: Circle, color: "text-yellow-500", bg: "bg-yellow-50" },
        low: { icon: Circle, color: "text-blue-500", bg: "bg-blue-50" }
    }[ticket.priority] || { icon: Circle, color: "text-gray-500", bg: "bg-gray-50" };

    const PriorityIcon = priorityInfo.icon;

    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-card p-3 rounded-lg border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group flex flex-col gap-2"
        >
            {/* Cabecera: Prioridad y ID */}
            <div className="flex items-center justify-between">
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", priorityInfo.bg, priorityInfo.color)}>
                    <PriorityIcon className="w-3 h-3" />
                    {ticket.priority}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">#{ticket.ticket_number?.toString().padStart(5,'0')}</span>
            </div>

            {/* Título */}
            <h4 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {ticket.title}
            </h4>

            {/* Footer: Avatar y Tiempo */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/60 mt-1">
                <div className="flex items-center gap-1.5" title={ticket.creator_name}>
                    <Avatar className="h-5 w-5 border border-border">
                        <AvatarFallback className="text-[8px] bg-secondary text-secondary-foreground">
                            {ticket.creator_name?.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{ticket.creator_name?.split(' ')[0]}</span>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true }).replace('alrededor de ', '')}
                </div>
            </div>
        </div>
    );
};

// --- COLUMNA ---
const KanbanColumn = ({ config, tickets, loading, navigate }: { config: ColumnData, tickets: Ticket[], loading: boolean, navigate: any }) => {
    const HeaderIcon = config.icon;
    
    return (
        <div className="flex flex-col flex-1 h-full min-w-[300px] rounded-xl bg-muted/40 border border-border/60 overflow-hidden">
            {/* Cabecera Limpia */}
            <div className="p-3 flex items-center justify-between bg-background/50 backdrop-blur-sm border-b">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md bg-background border shadow-sm", config.color)}>
                        <HeaderIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground/80">{config.title}</h3>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                    {tickets.length}
                </span>
            </div>

            <Droppable droppableId={config.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            "flex-1 p-2 overflow-y-auto space-y-2 transition-colors scrollbar-none",
                            snapshot.isDraggingOver ? "bg-primary/5" : ""
                        )}
                    >
                        {loading ? (
                            [1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                        ) : tickets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 opacity-60 min-h-[150px]">
                                <GripVertical className="w-8 h-8 mb-2" />
                                <p className="text-xs">Sin tickets</p>
                            </div>
                        ) : (
                            tickets.map((ticket, index) => (
                                <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{ ...provided.draggableProps.style }}
                                            className={cn("transform transition-all", snapshot.isDragging && "rotate-2 scale-105 z-50")}
                                        >
                                            <KanbanCard ticket={ticket} onClick={() => navigate(`/ticket/${ticket.id}`)} />
                                        </div>
                                    )}
                                </Draggable>
                            ))
                        )}
                        {provided.placeholder}
                        <div className="h-8" />
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default KanbanBoard;