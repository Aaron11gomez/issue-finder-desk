/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/KanbanBoard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Priority } from '@/types/ticket'; 
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, AlertCircle, Calendar } from 'lucide-react';
import { PriorityBadge } from '@/components/PriorityBadge';
import { AssignTicketDialog } from '@/components/AssignTicketDialog';
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';

const TICKET_STALE_THRESHOLD_MINUTES = 30;

type TicketStatus = 'open' | 'in_progress' | 'closed';

interface TicketItem {
  id: string;
  ticket_number: number; // AGREGADO
  title: string;
  priority: Priority;
  status: TicketStatus;
  created_at: string;
}

interface Column {
  id: TicketStatus;
  title: string;
  tickets: TicketItem[];
}

interface ColumnsState { [key: string]: Column; }

const initialColumns: ColumnsState = {
  open: { id: 'open', title: 'Abierto', tickets: [] },
  in_progress: { id: 'in_progress', title: 'En Progreso', tickets: [] },
  closed: { id: 'closed', title: 'Cerrado', tickets: [] },
};

const KanbanBoard = () => {
  const [columns, setColumns] = useState<ColumnsState>(initialColumns);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<{id: string, title: string} | null>(null);

  useEffect(() => { fetchTickets(); const interval = setInterval(() => { setColumns(prev => ({...prev})); }, 60000); return () => clearInterval(interval); }, []);

  const fetchTickets = async () => {
    if (!user || role === 'client') return; 
    try {
      setLoading(true);
      // ASEGURAR ticket_number EN SELECT
      let query = supabase.from('tickets').select('id, ticket_number, title, priority, status, created_at').in('status', ['open', 'in_progress', 'closed']);
      if (role === 'technician') query = query.eq('assigned_to', user.id);
      const { data: ticketsData, error } = await query;
      if (error) throw error;
      const newColumns = { ...initialColumns };
      newColumns.open.tickets = []; newColumns.in_progress.tickets = []; newColumns.closed.tickets = [];
      ticketsData.forEach((ticket) => { if (newColumns[ticket.status as TicketStatus]) { newColumns[ticket.status as TicketStatus].tickets.push(ticket as TicketItem); } });
      setColumns(newColumns);
    } catch (error: any) { toast.error('Error al cargar tickets'); } finally { setLoading(false); }
  };

  const onDragEnd: OnDragEndResponder = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const startColumn = columns[source.droppableId as TicketStatus];
    const endColumn = columns[destination.droppableId as TicketStatus];
    const ticket = startColumn.tickets.find(t => t.id === draggableId);
    if (!ticket) return;
    if (role === 'admin' && destination.droppableId === 'in_progress' && source.droppableId !== 'in_progress') { setTicketToAssign({ id: ticket.id, title: ticket.title }); setAssignDialogOpen(true); return; }
    const newStartTickets = Array.from(startColumn.tickets); newStartTickets.splice(source.index, 1);
    const newEndTickets = Array.from(endColumn.tickets); newEndTickets.splice(destination.index, 0, ticket);
    const newColumnsState = { ...columns, [startColumn.id]: { ...startColumn, tickets: newStartTickets }, [endColumn.id]: { ...endColumn, tickets: newEndTickets } };
    if (startColumn.id === endColumn.id) { const reordered = Array.from(startColumn.tickets); const [moved] = reordered.splice(source.index, 1); reordered.splice(destination.index, 0, moved); setColumns({ ...columns, [startColumn.id]: { ...startColumn, tickets: reordered } }); return; }
    setColumns(newColumnsState);
    const newStatus = endColumn.id as TicketStatus;
    const updates: any = { status: newStatus };
    if (role === 'technician' && newStatus === 'in_progress') { updates.assigned_to = user?.id; }
    const { error } = await supabase.from('tickets').update(updates).eq('id', ticket.id);
    if (error) { toast.error('Error al mover ticket'); setColumns(columns); } else { ticket.status = newStatus; }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div><h1 className="text-3xl font-bold">{role === 'admin' ? 'Tablero de Supervisión' : 'Tablero de Tareas'}</h1><p className="text-muted-foreground mt-2">{role === 'admin' ? 'Gestiona y asigna.' : 'Gestiona tus tickets asignados.'}</p></div>
        {loading ? (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div>) 
        : (<DragDropContext onDragEnd={onDragEnd}><div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start h-full">{Object.values(columns).map((column) => (<Column key={column.id} column={column} navigate={navigate} />))}</div></DragDropContext>)}
        {ticketToAssign && (<AssignTicketDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} ticketId={ticketToAssign.id} currentTitle={ticketToAssign.title} onAssigned={fetchTickets} />)}
      </div>
    </Layout>
  );
};

const Column = ({ column, navigate }: { column: Column, navigate: any }) => (
  <Card className="bg-muted/30 h-full min-h-[500px] flex flex-col"><CardHeader className="p-4 pb-2"><CardTitle className="flex items-center justify-between text-base">{column.title} <Badge variant="secondary">{column.tickets.length}</Badge></CardTitle></CardHeader><Droppable droppableId={column.id}>{(provided, snapshot) => (<CardContent ref={provided.innerRef} {...provided.droppableProps} className={cn("p-3 flex-1 space-y-3 transition-colors", snapshot.isDraggingOver && "bg-accent/50 rounded-lg")}>{column.tickets.map((ticket, index) => (<TicketCard key={ticket.id} ticket={ticket} index={index} navigate={navigate} />))}{provided.placeholder}</CardContent>)}</Droppable></Card>
);

const TicketCard = ({ ticket, index, navigate }: { ticket: TicketItem; index: number, navigate: any }) => {
  const minutesSinceCreation = differenceInMinutes(new Date(), new Date(ticket.created_at));
  const isStale = ticket.status === 'open' && minutesSinceCreation >= TICKET_STALE_THRESHOLD_MINUTES;

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={cn("bg-card rounded-lg border shadow-sm p-3 select-none hover:shadow-md transition-all group relative", snapshot.isDragging && "shadow-xl rotate-2 scale-105 z-50", isStale && "border-red-300 bg-red-50/50 dark:bg-red-900/10")} style={{ ...provided.draggableProps.style }}>
          {isStale && (<div className="absolute -top-2 -right-2 animate-bounce"><Badge variant="destructive" className="shadow-sm px-1.5 h-5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Desatendido</Badge></div>)}
          <div className="flex justify-between items-start gap-2 mb-2"><div className="scale-90 origin-top-left"><PriorityBadge priority={ticket.priority} /></div><Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/ticket/${ticket.id}`); }} title="Ver detalles"><Eye className="w-4 h-4" /></Button></div>
          <h4 className={cn("font-medium text-sm mb-3 line-clamp-2 leading-tight", isStale && "text-red-800 dark:text-red-300")}>{ticket.title}</h4>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t pt-2 mt-2">
             <div className="flex justify-between items-center">
                {/* SOLO NÚMEROS */}
                <span className="font-mono text-[10px] font-bold">#{ticket.ticket_number?.toString().padStart(5, '0')}</span>
                <div className="flex items-center gap-1" title={format(new Date(ticket.created_at), "PPP p", {locale: es})}><Calendar className="w-3 h-3" />{format(new Date(ticket.created_at), "dd/MM HH:mm")}</div>
             </div>
             <div className={cn("flex items-center gap-1 justify-end font-medium", isStale ? "text-red-600" : "text-blue-600")}><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}</div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanBoard;