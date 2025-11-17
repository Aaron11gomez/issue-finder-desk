/* src/pages/KanbanBoard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Priority } from '@/types/ticket'; // Importamos el tipo de prioridad

// Definimos los tipos de datos locales para el tablero
type TicketStatus = 'open' | 'in_progress' | 'closed';

interface TicketItem {
  id: string;
  title: string;
  priority: Priority;
  status: TicketStatus;
}

interface Column {
  id: TicketStatus;
  title: string;
  tickets: TicketItem[];
}

interface ColumnsState {
  [key: string]: Column;
}

// Datos iniciales de las columnas
const initialColumns: ColumnsState = {
  open: {
    id: 'open',
    title: 'Abierto',
    tickets: [],
  },
  in_progress: {
    id: 'in_progress',
    title: 'En Progreso',
    tickets: [],
  },
  closed: {
    id: 'closed',
    title: 'Cerrado',
    tickets: [],
  },
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

const KanbanBoard = () => {
  const [columns, setColumns] = useState<ColumnsState>(initialColumns);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    if (!user || role === 'client') return; // Clientes no deberían estar aquí

    try {
      setLoading(true);
      // Solo traemos tickets que no estén cerrados para un tablero ágil
      // Opcional: puedes quitar el filtro de 'closed' si quieres verlos todos
      let query = supabase
        .from('tickets')
        .select('id, title, priority, status')
        .in('status', ['open', 'in_progress', 'closed']); // Traemos todos para todas las columnas

      // Si es técnico, solo trae sus tickets asignados
      if (role === 'technician') {
        query = query.eq('assigned_to', user.id);
      }
      
      const { data: ticketsData, error } = await query;

      if (error) throw error;

      // Clasificar tickets en columnas
      const newColumns = { ...initialColumns };
      newColumns.open.tickets = [];
      newColumns.in_progress.tickets = [];
      newColumns.closed.tickets = [];

      ticketsData.forEach((ticket) => {
        if (newColumns[ticket.status as TicketStatus]) {
          newColumns[ticket.status as TicketStatus].tickets.push(ticket as TicketItem);
        }
      });

      setColumns(newColumns);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast.error('Error al cargar los tickets', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd: OnDragEndResponder = async (result) => {
    const { source, destination, draggableId } = result;

    // Si no hay destino (soltado fuera)
    if (!destination) return;

    // Si se soltó en el mismo lugar
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const startColumn = columns[source.droppableId as TicketStatus];
    const endColumn = columns[destination.droppableId as TicketStatus];
    const ticket = startColumn.tickets.find(t => t.id === draggableId);

    if (!ticket) return;

    // Actualización Optimista (UI primero)
    // 1. Quitar de la columna de origen
    const newStartTickets = Array.from(startColumn.tickets);
    newStartTickets.splice(source.index, 1);
    
    // 2. Añadir a la columna de destino
    const newEndTickets = Array.from(endColumn.tickets);
    newEndTickets.splice(destination.index, 0, ticket);

    const newColumnsState = {
      ...columns,
      [startColumn.id]: {
        ...startColumn,
        tickets: newStartTickets,
      },
      [endColumn.id]: {
        ...endColumn,
        tickets: newEndTickets,
      },
    };
    
    // Si la suelta en la misma columna (solo reordenar)
    if (startColumn.id === endColumn.id) {
         const reorderedTickets = Array.from(startColumn.tickets);
         const [removed] = reorderedTickets.splice(source.index, 1);
         reorderedTickets.splice(destination.index, 0, removed);
         
         setColumns({
             ...columns,
             [startColumn.id]: {
                 ...startColumn,
                 tickets: reorderedTickets
             }
         });
         // (Opcional: podrías guardar el "orden" en la BD aquí)
         return;
    }

    // Si cambia de columna, actualiza el estado local
    setColumns(newColumnsState);

    // Actualización de Base de Datos
    const newStatus = endColumn.id as TicketStatus;
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id);

    if (error) {
      toast.error('Error al mover ticket', {
        description: 'No se pudo actualizar el estado. Reintentando...',
      });
      // Revertir el estado si falla
      setColumns(columns); 
    } else {
      toast.success(`Ticket #${ticket.id.substring(0, 4)} movido a "${endColumn.title}"`);
      // Actualizar el estado del ticket en el objeto local
      ticket.status = newStatus;
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Tablero Personal</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus tickets arrastrando y soltando las tarjetas.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {Object.values(columns).map((column) => (
                <Column key={column.id} column={column} />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </Layout>
  );
};

// Componente interno para la Columna
const Column = ({ column }: { column: Column }) => (
  <Card className="bg-muted/30">
    <CardHeader className="p-4">
      <CardTitle className="flex items-center justify-between">
        <span className="text-lg">{column.title}</span>
        <Badge variant="secondary">{column.tickets.length}</Badge>
      </CardTitle>
    </CardHeader>
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <CardContent
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "p-4 min-h-96 space-y-4 transition-colors",
            snapshot.isDraggingOver && "bg-accent"
          )}
        >
          {column.tickets.length === 0 ? (
             <div className="flex items-center justify-center h-full pt-16">
                 <p className="text-sm text-muted-foreground">Vacío</p>
             </div>
          ) : (
            column.tickets.map((ticket, index) => (
              <TicketCard key={ticket.id} ticket={ticket} index={index} />
            ))
          )}
          {provided.placeholder}
        </CardContent>
      )}
    </Droppable>
  </Card>
);

// Componente interno para la Tarjeta de Ticket
const TicketCard = ({ ticket, index }: { ticket: TicketItem; index: number }) => (
  <Draggable draggableId={ticket.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={cn(
          "bg-card rounded-lg border shadow-sm p-4 cursor-grab active:cursor-grabbing",
          snapshot.isDragging && "shadow-lg scale-105"
        )}
      >
        <h4 className="font-medium mb-2">{ticket.title}</h4>
        <div className="flex justify-between items-center">
          <Badge variant={getPriorityColor(ticket.priority)}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ID: {ticket.id.substring(0, 8)}...
          </span>
        </div>
      </div>
    )}
  </Draggable>
);

export default KanbanBoard;