/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/TicketDetail.tsx */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/contexts/PresenceContext'; // HU-17
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, User, CalendarDays, Ticket as TicketIcon, ShieldCheck, Paperclip, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input'; // HU-15

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
  creator_name: string;
  assignee_name: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_internal: boolean;
  user_full_name: string;
  // HU-15: Adjuntos (Si decides guardarlo en metadata o tabla aparte, aquí mostramos lógica simple)
}

// HU-15 Interface para adjuntos
interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    comment_id?: string;
}

const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { onlineUsers } = usePresence(); // HU-17
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]); // HU-15
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false); // HU-15
  const fileInputRef = useRef<HTMLInputElement>(null); // HU-15

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      fetchComments();
      fetchAttachments(); // HU-15
    }
  }, [id, user]);

  const fetchTicketDetails = async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`*`)
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      if (!ticketData) throw new Error("Ticket no encontrado");

      const canView = ticketData.created_by === user.id || role === 'admin' || role === 'technician';
      if (!canView) {
        toast({ title: 'Acceso denegado', description: 'No tienes permiso', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      const userIds: string[] = [ticketData.created_by];
      if (ticketData.assigned_to) userIds.push(ticketData.assigned_to);

      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      setTicket({
        ...ticketData,
        creator_name: profilesMap.get(ticketData.created_by) || 'Usuario',
        assignee_name: ticketData.assigned_to ? (profilesMap.get(ticketData.assigned_to) || 'Técnico') : 'Sin asignar'
      } as Ticket);

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data: commentsData } = await supabase
        .from('comments')
        .select(`*`)
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

    if (commentsData) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);
        
        setComments(commentsData.map(c => ({
            ...c,
            user_full_name: profilesMap.get(c.user_id) || 'Usuario'
        })));
    }
  };

  // HU-15 Fetch Adjuntos
  const fetchAttachments = async () => {
      if (!id) return;
      const { data } = await supabase.from('attachments').select('*').eq('ticket_id', id);
      if (data) setAttachments(data as Attachment[]);
  };

  // HU-15 Subir Archivo
  const handleFileUpload = async (file: File): Promise<string | null> => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('ticket-attachments') // Asegúrate de crear este bucket en Supabase
            .upload(filePath, file);

        if (uploadError) throw uploadError;
        return filePath;
      } catch (error) {
          console.error("Error uploading:", error);
          toast({ title: "Error al subir archivo", description: "Verifica que el bucket 'ticket-attachments' exista y sea público.", variant: "destructive" });
          return null;
      }
  };

  const addComment = async (isInternal: boolean) => {
    const content = isInternal ? newInternalNote : newComment;
    const file = fileInputRef.current?.files?.[0]; // HU-15

    if (!content.trim() && !file) {
      toast({ title: 'Error', description: 'Escribe un mensaje o adjunta un archivo', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      
      // 1. Crear Comentario
      const { data: commentData, error } = await supabase
        .from('comments')
        .insert({
          ticket_id: id,
          user_id: user?.id,
          content: content || '(Archivo adjunto)',
          is_internal: isInternal
        })
        .select()
        .single();

      if (error) throw error;

      // 2. HU-15 Subir y registrar adjunto si existe
      if (file && commentData) {
          const filePath = await handleFileUpload(file);
          if (filePath) {
              await supabase.from('attachments').insert({
                  file_name: file.name,
                  file_path: filePath,
                  file_size: file.size,
                  file_type: file.type,
                  ticket_id: id,
                  comment_id: commentData.id,
                  uploaded_by: user?.id
              });
          }
      }

      toast({ title: 'Comentario agregado' });
      if (isInternal) setNewInternalNote(''); else setNewComment('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchComments();
      fetchAttachments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setUploading(false);
    }
  };

  // ... Resto de funciones (closeTicket, getColors) igual ...
  const closeTicket = async () => {
    await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
    setCloseDialogOpen(false);
    fetchTicketDetails();
  };

  if (loading || !ticket) return <Layout><div>Cargando...</div></Layout>;

  // HU-17 Lógica de Presencia
  const isAssigneeOnline = ticket.assigned_to && onlineUsers.has(ticket.assigned_to);
  const isCreatorOnline = onlineUsers.has(ticket.created_by);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header y botón volver... */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
          {ticket.status === 'in_progress' && (role === 'admin' || role === 'technician') && (
             <Button onClick={() => setCloseDialogOpen(true)}>Cerrar Ticket</Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 items-start">
          
          {/* Columna Principal */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex justify-between items-center">
                    {ticket.title}
                    {/* HU-17 Indicador visual simple si el creador está viendo */}
                    {isCreatorOnline && ticket.created_by !== user?.id && (
                        <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800">Cliente en línea</Badge>
                    )}
                </CardTitle> 
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Sección Comentarios */}
            <Card>
              <CardHeader><CardTitle>Comentarios</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {comments.filter(c => !c.is_internal).map((comment) => {
                    // HU-15 Buscar adjunto para este comentario
                    const attachment = attachments.find(a => a.comment_id === comment.id);
                    return (
                      <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback>{getInitials(comment.user_full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{comment.user_full_name}</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                          
                          {/* HU-15 Mostrar adjunto */}
                          {attachment && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-muted/50 rounded-md w-fit">
                                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                                  <a 
                                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                      {attachment.file_name}
                                  </a>
                              </div>
                          )}
                        </div>
                      </div>
                    );
                })}
              </CardContent>
              {ticket.status !== 'closed' && (
                <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                  <Label htmlFor="new-comment">Añadir comentario</Label>
                  <Textarea id="new-comment" value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} />
                  
                  {/* HU-15 Input de Archivo */}
                  <div className="flex items-center gap-2 w-full">
                      <Input 
                        type="file" 
                        ref={fileInputRef} 
                        className="w-full text-xs" 
                        accept="image/*,application/pdf"
                      />
                      <Button onClick={() => addComment(false)} size="sm" disabled={uploading}>
                        <Send className="w-4 h-4 mr-2" /> {uploading ? 'Subiendo...' : 'Enviar'}
                      </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Sidebar Detalles */}
          <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* ... Badges de estado y prioridad igual ... */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span className="text-muted-foreground mr-1">Creado por:</span>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.creator_name}</span>
                        {/* HU-17 Indicador */}
                        {isCreatorOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-muted-foreground mr-1">Asignado a:</span>
                     <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.assignee_name}</span>
                        {/* HU-17 Indicador */}
                        {isAssigneeOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}
                    </div>
                  </div>
                  {/* Fecha y ID ... */}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
        
        {/* Dialog cerrar ticket (renderizado condicionalmente) */}
        {closeDialogOpen && (
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Cerrar Ticket</DialogTitle></DialogHeader>
                <p>¿Seguro?</p>
                <Button onClick={closeTicket}>Confirmar</Button>
              </DialogContent>
            </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default TicketDetail;