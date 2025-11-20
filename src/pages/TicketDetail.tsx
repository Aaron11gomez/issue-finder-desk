/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/TicketDetail.tsx */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/contexts/PresenceContext'; 
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, User, ShieldCheck, Paperclip, X, FileIcon, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input'; 

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
}

interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null; // Agregado para verificar tipo
    comment_id?: string;
}

const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { onlineUsers } = usePresence(); 
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null); 

  // Estado para previsualización de archivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      fetchComments();
      fetchAttachments(); 
    }
  }, [id, user]);

  // Limpiar URL de previsualización al desmontar o cambiar archivo
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  const fetchAttachments = async () => {
      if (!id) return;
      const { data } = await supabase.from('attachments').select('*').eq('ticket_id', id);
      if (data) setAttachments(data as Attachment[]);
  };

  // Manejar selección de archivo para previsualización
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Crear URL temporal para previsualización
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('ticket-attachments') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;
        return filePath;
      } catch (error) {
          console.error("Error uploading:", error);
          toast({ title: "Error al subir archivo", description: "Verifica que el bucket 'ticket-attachments' exista y sea público.", variant: "destructive" });
          return null;
      }
  };

  const triggerEmailNotification = async (messageContent: string) => {
    if (!ticket || !user) return;

    // Lógica: Si soy el creador, el destinatario es el técnico asignado. Si soy técnico/admin, es el creador.
    const isMeCreator = ticket.created_by === user.id;
    const targetUserId = isMeCreator ? ticket.assigned_to : ticket.created_by;

    if (!targetUserId) return; // Si no hay técnico asignado aún, no enviamos correo al "aire" (o se podría enviar a admins)

    // Verificar si el usuario objetivo está ONLINE
    if (onlineUsers.has(targetUserId)) {
      console.log("Usuario destinatario está en línea, no se envía correo.");
      return;
    }

    console.log("Usuario destinatario desconectado. Enviando notificación...");

    try {
      await supabase.functions.invoke('send-email-notification', {
        body: {
          target_user_id: targetUserId, // Enviamos el ID, la Edge Function buscará el email
          subject: `Nueva actualización en ticket: ${ticket.title}`,
          message: `Has recibido un nuevo comentario: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`
        }
      });
    } catch (err) {
      console.error("Error enviando notificación:", err);
    }
  };

  const addComment = async (isInternal: boolean) => {
    const content = isInternal ? newInternalNote : newComment;
    
    if (!content.trim() && !selectedFile) {
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
          content: content || (selectedFile ? '(Archivo adjunto)' : ''),
          is_internal: isInternal
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Subir y registrar adjunto si existe
      if (selectedFile && commentData) {
          const filePath = await handleFileUpload(selectedFile);
          if (filePath) {
              await supabase.from('attachments').insert({
                  file_name: selectedFile.name,
                  file_path: filePath,
                  file_size: selectedFile.size,
                  file_type: selectedFile.type,
                  ticket_id: id,
                  comment_id: commentData.id,
                  uploaded_by: user?.id
              });
          }
      }

      // 3. Notificar por correo si corresponde
      if (!isInternal) {
         await triggerEmailNotification(content || "Se ha adjuntado un archivo.");
      }

      toast({ title: 'Comentario agregado' });
      if (isInternal) setNewInternalNote(''); else setNewComment('');
      clearSelectedFile();
      
      fetchComments();
      fetchAttachments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setUploading(false);
    }
  };

  const closeTicket = async () => {
    await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
    setCloseDialogOpen(false);
    fetchTicketDetails();
  };

  if (loading || !ticket) return <Layout><div>Cargando...</div></Layout>;

  const isAssigneeOnline = ticket.assigned_to && onlineUsers.has(ticket.assigned_to);
  const isCreatorOnline = onlineUsers.has(ticket.created_by);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
          {ticket.status === 'in_progress' && (role === 'admin' || role === 'technician') && (
             <Button onClick={() => setCloseDialogOpen(true)}>Cerrar Ticket</Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 items-start">
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex justify-between items-center">
                    {ticket.title}
                    {isCreatorOnline && ticket.created_by !== user?.id && (
                        <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800">Cliente en línea</Badge>
                    )}
                </CardTitle> 
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Comentarios</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {comments.filter(c => !c.is_internal).map((comment) => {
                    const attachment = attachments.find(a => a.comment_id === comment.id);
                    // Detectar si es imagen
                    const isImage = attachment?.file_type?.startsWith('image/') || 
                                    attachment?.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

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
                          
                          {/* Mostrar adjunto (Imagen inline o Link) */}
                          {attachment && (
                              <div className="mt-2">
                                {isImage ? (
                                  <div className="relative group max-w-md rounded-lg overflow-hidden border bg-muted/20">
                                    <img 
                                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} 
                                      alt={attachment.file_name}
                                      className="w-full h-auto object-cover max-h-80"
                                    />
                                    <a 
                                      href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    >
                                       <span className="bg-background/80 text-foreground text-xs px-2 py-1 rounded shadow">Abrir original</span>
                                    </a>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md w-fit border">
                                      <FileIcon className="w-4 h-4 text-muted-foreground" />
                                      <a 
                                        href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-sm text-blue-600 hover:underline truncate max-w-[200px]"
                                      >
                                          {attachment.file_name}
                                      </a>
                                  </div>
                                )}
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
                  
                  {/* Previsualización de archivo antes de enviar */}
                  {selectedFile && (
                    <div className="w-full mb-2 p-3 bg-muted/30 border rounded-lg flex flex-col gap-2 relative">
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                             <Paperclip className="w-3 h-3" /> Adjunto seleccionado: {selectedFile.name}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                            onClick={clearSelectedFile}
                          >
                             <X className="w-4 h-4" />
                          </Button>
                       </div>
                       {previewUrl && selectedFile.type.startsWith('image/') && (
                         <div className="rounded-md overflow-hidden border w-fit max-w-[200px]">
                            <img src={previewUrl} alt="Preview" className="w-full h-auto" />
                         </div>
                       )}
                    </div>
                  )}

                  <Textarea id="new-comment" value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} />
                  
                  <div className="flex items-center gap-2 w-full mt-2">
                      <div className="flex-1">
                         <label 
                           htmlFor="file-upload" 
                           className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 border rounded-md hover:bg-muted"
                         >
                            <ImageIcon className="w-4 h-4" />
                            {selectedFile ? 'Cambiar archivo' : 'Adjuntar imagen/archivo'}
                         </label>
                         <input 
                           id="file-upload"
                           type="file" 
                           ref={fileInputRef} 
                           className="hidden"
                           onChange={handleFileSelect}
                           accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                         />
                      </div>
                      <Button onClick={() => addComment(false)} size="sm" disabled={uploading}>
                        <Send className="w-4 h-4 mr-2" /> {uploading ? 'Subiendo...' : 'Enviar'}
                      </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span className="text-muted-foreground mr-1">Creado por:</span>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.creator_name}</span>
                        {isCreatorOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-muted-foreground mr-1">Asignado a:</span>
                     <div className="flex items-center gap-2">
                        <span className="font-medium">{ticket.assignee_name}</span>
                        {isAssigneeOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
        
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