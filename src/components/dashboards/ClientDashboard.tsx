/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/ClientDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner'; // <-- MODIFICACIÓN: Cambiado a Sonner
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, FileText } from 'lucide-react'; // <-- MODIFICACIÓN: Importar FileText
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'closed';
  created_at: string;
  created_by_id: string;
  created_by_name: string;
  created_by_email: string;
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

const ClientDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low'
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('created_by_id', user?.id)
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

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.error('Error', {
        description: 'Por favor completa todos los campos',
      });
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from('tickets')
        .insert({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          created_by_id: user?.id || '',
          created_by_name: profileData?.full_name || '',
          created_by_email: profileData?.email || '',
          status: 'open'
        });

      if (error) throw error;

      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.success('Ticket creado', {
        description: 'Tu ticket ha sido creado exitosamente',
      });

      setDialogOpen(false);
      setFormData({ title: '', description: '', priority: 'medium' });
      fetchMyTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      /* --- MODIFICACIÓN: Toast de Sonner --- */
      toast.error('Error', {
        description: 'No se pudo crear el ticket',
      });
    }
  };

  // ... (getStatusColor, getStatusLabel, getPriorityLabel, getPriorityColor sin cambios)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'assigned': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'assigned': return 'Asignado';
      case 'closed': return 'Cerrado';
      default: return status;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mis Tickets</h1>
            <p className="text-muted-foreground mt-2">
              Administra tus solicitudes de soporte
            </p>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Crear Nuevo Ticket
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <TicketListSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }
  // --- FIN DE MODIFICACIÓN ---

  return (
    <div className="space-y-6 animate-fade-in"> {/* MODIFICACIÓN: Animación añadida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Administra tus solicitudes de soporte
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={createTicket} className="space-y-4">
              {/* ... (Formulario de creación sin cambios) ... */}
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Describe brevemente el problema"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Proporciona detalles sobre tu problema"
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'critical' | 'high' | 'medium' | 'low') => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full">
                Enviar Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- RENDERIZADO MODIFICADO --- */}
      <Card>
        <CardContent className="pt-6">
          {tickets.length === 0 ? (
            /* --- MODIFICACIÓN: Estado vacío mejorado --- */
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <FileText className="w-16 h-16 text-muted-foreground/50 mb-6" />
              <h3 className="text-xl font-semibold">No hay tickets creados</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Parece que no has creado ninguna solicitud de soporte todavía.
                ¡Crea tu primer ticket para comenzar!
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
  );
};

export default ClientDashboard;