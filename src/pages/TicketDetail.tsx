import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, User, CalendarDays, Ticket as TicketIcon, ShieldCheck, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// =================================================================
// ========= ¡INICIO DE LA MODIFICACIÓN DE INTERFACES! =============
// =================================================================

interface ProfileStub {
  full_name: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  assigned_to: string | null;
  resolution_summary: string | null;
  // Perfiles que cargaremos con la consulta corregida
  creator: ProfileStub | null;
  assignee: ProfileStub | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_internal: boolean;
  // Perfil que cargaremos con la consulta corregida
  profiles: ProfileStub | null;
}
// =================================================================
// ========= ¡FIN DE LA MODIFICACIÓN DE INTERFACES! ================
// =================================================================

const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  useEffect(() => {
    if (id && user) { // Asegúrate de que el usuario esté cargado
      fetchTicketDetails();
      fetchComments();
    }
  }, [id, user]); // Se ejecuta si 'id' o 'user' cambian

  // =================================================================
  // ========= ¡INICIO DE LA MODIFICACIÓN DE QUERIES! ================
  // =================================================================
  const fetchTicketDetails = async () => {
    if (!id || !user) return; // Añadido doble check

    setLoading(true); // Poner loading al inicio
    try {
      // Consulta corregida para traer los perfiles relacionados
      // La relación es: tickets.created_by -> auth.users.id <- profiles.id
      // Le decimos a Supabase que 'created_by' es la clave para 'profiles'
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          creator:profiles!created_by( full_name ),
          assignee:profiles!assigned_to( full_name )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (ticketData) {
        const canView = 
          ticketData.created_by === user.id || 
          role === 'admin' || role === 'technician';

        if (!canView) {
          toast({
            title: 'Acceso denegado',
            description: 'No tienes permiso para ver este ticket',
            variant: 'destructive'
          });
          navigate('/dashboard');
          return;
        }
        setTicket(ticketData as any);
      }
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      toast({
        title: 'Error al cargar ticket',
        description: error.message || 'No se pudo cargar el ticket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      // Consulta corregida para traer el perfil de cada comentario
      // La relación es: comments.user_id -> auth.users.id <- profiles.id
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:profiles!user_id ( full_name )
        `)
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((commentsData as any) || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error al cargar comentarios',
        description: error.message || 'No se pudieron cargar los comentarios',
        variant: 'destructive'
      });
    }
  };
  // =================================================================
  // ========= ¡FIN DE LA MODIFICACIÓN DE QUERIES! ===================
  // =================================================================

  const addComment = async (isInternal: boolean) => {
    const content = isInternal ? newInternalNote : newComment;

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'El comentario no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    if (ticket?.status === 'closed') {
      toast({
        title: 'Error',
        description: 'No se pueden agregar comentarios a tickets cerrados',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          content: content,
          is_internal: isInternal
        });

      if (error) throw error;

      toast({
        title: 'Comentario agregado',
        description: 'Comentario publicado exitosamente',
      });

      if (isInternal) {
        setNewInternalNote('');
      } else {
        setNewComment('');
      }
      
      fetchComments(); // Volver a cargar comentarios
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el comentario',
        variant: 'destructive'
      });
    }
  };

  const closeTicket = async () => {
    try {
      // Este update está bien, solo cambia el status.
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Ticket cerrado',
        description: 'El ticket ha sido cerrado exitosamente',
      });

      setCloseDialogOpen(false);
      fetchTicketDetails(); // Volver a cargar los detalles del ticket
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cerrar el ticket',
        variant: 'destructive'
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'in_progress': return 'En Progreso';
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

  const getStatusColor = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'open': return 'default';
      case 'in_progress': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
    }
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

  if (loading || !ticket) {
    return (
      <Layout>
        {/* Muestra "Cargando..." que coincide con tu captura */}
        <div>Cargando...</div>
      </Layout>
    );
  }

  const canCloseTicket = (role === 'admin' || role === 'technician') && ticket.status === 'in_progress';
  const canAddInternalNotes = role === 'admin' || role === 'technician';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          
          {canCloseTicket && (
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button>Cerrar Ticket</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cerrar Ticket</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  ¿Estás seguro de que deseas cerrar este ticket?
                </p>
                <Button onClick={closeTicket} className="w-full">
                  Confirmar Cierre
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 items-start">
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Descripción</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                  
                  {ticket.resolution_summary && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2 text-foreground">Resolución</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{ticket.resolution_summary}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comentarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {comments.filter(c => !c.is_internal).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay comentarios aún
                  </p>
                ) : (
                  comments
                    .filter(c => !c.is_internal)
                    .map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback>{getInitials(comment.profiles?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{comment.profiles?.full_name || 'Usuario'}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
              {ticket.status !== 'closed' && (
                <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                  <Label htmlFor="new-comment">Añadir comentario</Label>
                  <Textarea
                    id="new-comment"
                    placeholder="Escribe un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={() => addComment(false)} size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Comentario
                  </Button>
                </CardFooter>
              )}
            </Card>

            {canAddInternalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas Internas</CardTitle>
                  <CardDescription>
                    Solo visibles para técnicos y administradores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {comments.filter(c => c.is_internal).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No hay notas internas aún
                    </p>
                  ) : (
                    comments
                      .filter(c => c.is_internal)
                      .map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarFallback className="bg-secondary text-secondary-foreground">{getInitials(comment.profiles?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{comment.profiles?.full_name || 'Usuario'}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
                {ticket.status !== 'closed' && (
                  <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                    <Label htmlFor="new-internal-note">Añadir nota interna</Label>
                    <Textarea
                      id="new-internal-note"
                      placeholder="Escribe una nota interna..."
                      value={newInternalNote}
                      onChange={(e) => setNewInternalNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={() => addComment(true)} variant="secondary" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Añadir Nota Interna
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}

          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-badge" className="text-muted-foreground">Estado</Label>
                  <Badge id="status-badge" variant={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="priority-badge" className="text-muted-foreground">Prioridad</Label>
                  <Badge id="priority-badge" variant={getPriorityColor(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>

                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Creado por:</span>
                    {/* CORREGIDO: Leer desde el objeto 'creator' */}
                    <span className="font-medium">{ticket.creator?.full_name || 'Desconocido'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Asignado a:</span>
                    {/* CORREGIDO: Leer desde el objeto 'assignee' */}
                    <span className="font-medium">{ticket.assignee?.full_name || 'Sin asignar'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Creado:</span>
                    <span className="font-medium">
                      {format(new Date(ticket.created_at), "d MMM, yyyy", { locale: es })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TicketIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1">Ticket ID:</span>
                    <span className="font-mono text-xs font-medium">{ticket.id}</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default TicketDetail;