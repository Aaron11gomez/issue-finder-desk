/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/MyAssignedTickets.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner'; // <-- MODIFICACIÓN: Cambiado a Sonner
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText } from 'lucide-react'; // <-- MODIFICACIÓN: Importar Icono

// --- NUEVOS IMPORTS PARA LA TABLA ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton'; // <-- MODIFICACIÓN: Importar Skeleton
// --- FIN DE NUEVOS IMPORTS ---

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

// --- MODIFICACIÓN: Componente Skeleton ---
const TicketListSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(3)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
// --- FIN DE SKELETON ---

const MyAssignedTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyAssignedTickets();
  }, []);

  const fetchMyAssignedTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('assigned_to', user?.id)
        .in('status', ['in_progress', 'closed'])
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.error('Error', {
        description: 'No se pudieron cargar los tickets',
      });
    } finally {
      setLoading(false);
    }
  };

  // ... (getStatusColor, getStatusLabel, getPriorityLabel, getPriorityColor sin cambios)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'default';
      case 'closed': return 'outline';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'En Progreso';
      case 'closed': return 'Cerrado';
      default: return status;
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

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };
  // --- FIN DE HELPERS ---

  // --- MODIFICACIÓN: Estado de carga con Skeleton ---
  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Mis Tickets Asignados</h1>
            <p className="text-muted-foreground mt-2">
              Tickets que estás atendiendo o has completado
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <TicketListSkeleton />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  // --- FIN DE MODIFICACIÓN ---

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in"> {/* MODIFICACIÓN: Animación añadida */}
        <div>
          <h1 className="text-3xl font-bold">Mis Tickets Asignados</h1>
          <p className="text-muted-foreground mt-2">
            Tickets que estás atendiendo o has completado
          </p>
        </div>

        {/* --- RENDERIZADO MODIFICADO --- */}
        <Card>
          <CardContent className="pt-6">
            {tickets.length === 0 ? (
              /* --- MODIFICACIÓN: Estado vacío mejorado --- */
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <FileText className="w-16 h-16 text-muted-foreground/50 mb-6" />
                <h3 className="text-xl font-semibold">Sin tickets asignados</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  No tienes tickets asignados en este momento. 
                  Ve al dashboard para asignarte uno.
                </p>
              </div>
              /* --- FIN DE MODIFICACIÓN --- */
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    /* --- MODIFICACIÓN: Fila clickeable y con hover --- */
                    <TableRow 
                      key={ticket.id}
                      className="transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer"
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                    >
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                    /* --- FIN DE MODIFICACIÓN --- */
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* --- FIN DE RENDERIZADO MODIFICADO --- */}
      </div>
    </Layout>
  );
};

export default MyAssignedTickets;