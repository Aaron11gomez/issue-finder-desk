import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  assigned_to_id: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string } | null;
  role?: string;
}

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchComments();
    }
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (ticketData) {
        const canView = 
          ticketData.created_by_id === user?.id || 
          ticketData.assigned_to_id === user?.id;

        if (!canView) {
          toast({
            title: 'Acceso denegado',
            description: 'No tienes permiso para ver este ticket',
            variant: 'destructive'
          });
          navigate('/dashboard');
          return;
        }

        setTicket(ticketData);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el ticket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', userIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
        ]);

        const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const rolesMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);
        
        const enrichedComments = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || null,
          role: rolesMap.get(comment.user_id) || 'client'
        }));
        
        setComments(enrichedComments as any);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) {
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
          content: newComment
        });

      if (error) throw error;

      toast({
        title: 'Comentario agregado',
        description: 'Comentario publicado exitosamente',
      });

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el comentario',
        variant: 'destructive'
      });
    }
  };

  const closeTicket = async () => {
    try {
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
      fetchTicketDetails();
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cerrar el ticket',
        variant: 'destructive'
      });
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

  if (loading || !ticket) {
    return (
      <Layout>
        <div>Cargando...</div>
      </Layout>
    );
  }

  const canCloseTicket = (role === 'admin' || role === 'technician') && ticket.status === 'assigned';

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

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge>{getStatusLabel(ticket.status)}</Badge>
                  <Badge variant="outline">{getPriorityLabel(ticket.priority)}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Creado por: </span>
                  <span className="font-medium">{ticket.created_by_name || 'Desconocido'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Asignado a: </span>
                  <span className="font-medium">{ticket.assigned_to_id ? 'Asignado' : 'Sin asignar'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de creación: </span>
                  <span className="font-medium">
                    {format(new Date(ticket.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-muted-foreground">{ticket.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay comentarios aún
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{comment.profiles?.full_name || 'Usuario'}</span>
                    <Badge variant="secondary" className="text-xs">
                      {comment.role === 'admin' ? 'Administrador' : comment.role === 'technician' ? 'Técnico' : 'Cliente'}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(comment.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{comment.content}</p>
                </div>
              ))
            )}

            {ticket.status !== 'closed' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Textarea
                    placeholder="Escribe un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addComment}>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Comentario
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TicketDetail;