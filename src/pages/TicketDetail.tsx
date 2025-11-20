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
import { ArrowLeft, Send, User, ShieldCheck, Paperclip, X, FileIcon, ImageIcon, UserPlus, HelpCircle, Zap, Award, Shield, Mic, Square, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AssignTicketDialog } from '@/components/AssignTicketDialog'; 
import { getTechnicianRankInfo, cn } from '@/lib/utils'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  user_role?: string;       
  user_specialties?: string[]; 
  user_avatar_url?: string; // URL del avatar
}

interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null; 
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
  const [totalCategories, setTotalCategories] = useState(0); 
  
  const [newComment, setNewComment] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Estados de Grabación
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (id && user) {
      fetchTicketDetails();
      fetchComments();
      fetchAttachments(); 
      fetchCategoryCount();
    }
  }, [id, user]);

  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
        interval = setInterval(() => {
            setRecordingTime((prev) => {
                if (prev >= 30) {
                    stopRecording();
                    return 30;
                }
                return prev + 1;
            });
        }, 1000);
    } else {
        setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchCategoryCount = async () => {
     const { count } = await supabase.from('service_categories').select('*', { count: 'exact', head: true });
     setTotalCategories(count || 0);
  };

  const fetchTicketDetails = async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
      const { data: ticketData, error: ticketError } = await supabase.from('tickets').select(`*`).eq('id', id).single();
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
    } finally { setLoading(false); }
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data: commentsData } = await supabase
        .from('comments').select(`*`).eq('ticket_id', id).order('created_at', { ascending: true });

    if (commentsData) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, specialties').in('id', userIds);
        const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
        
        setComments(commentsData.map(c => {
            // Construir URL del avatar (avatar.png estandarizado)
            const { data: avatarData } = supabase.storage.from('avatars').getPublicUrl(`${c.user_id}/avatar.png`);
            
            return {
                ...c,
                user_full_name: profilesMap.get(c.user_id)?.full_name || 'Usuario Desconocido',
                user_role: rolesMap.get(c.user_id),
                user_specialties: profilesMap.get(c.user_id)?.specialties || [],
                user_avatar_url: avatarData.publicUrl
            };
        }));
    }
  };

  const fetchAttachments = async () => {
      if (!id) return;
      const { data } = await supabase.from('attachments').select('*').eq('ticket_id', id);
      if (data) setAttachments(data as Attachment[]);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
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

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const file = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
              setSelectedFile(file);
              const url = URL.createObjectURL(file);
              setPreviewUrl(url);
              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (error) {
          console.error('Error accessing microphone:', error);
          toast({ title: 'Error', description: 'No se pudo acceder al micrófono.', variant: 'destructive' });
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ticket-attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        return filePath;
      } catch (error) {
          console.error("Error uploading:", error);
          toast({ title: "Error al subir archivo", variant: "destructive" });
          return null;
      }
  };

  const triggerEmailNotification = async (messageContent: string) => {
    if (!ticket || !user) return;
    const isMeCreator = ticket.created_by === user.id;
    const targetUserId = isMeCreator ? ticket.assigned_to : ticket.created_by;
    if (!targetUserId) return; 
    if (onlineUsers.has(targetUserId)) return;
    try {
      await supabase.functions.invoke('send-email-notification', {
        body: { target_user_id: targetUserId, subject: `Nueva actualización en ticket: ${ticket.title}`, message: `Has recibido un nuevo comentario: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"` }
      });
    } catch (err) { console.error(err); }
  };

  const addComment = async (isInternal: boolean) => {
    const content = isInternal ? newInternalNote : newComment;
    
    if (!content.trim() && !selectedFile) {
      toast({ title: 'Error', description: 'Escribe un mensaje o adjunta un archivo', variant: 'destructive' });
      return;
    }
    
    try {
      setUploading(true);
      const finalContent = content || (selectedFile?.type.startsWith('audio/') ? '🎤 Mensaje de voz' : '(Archivo adjunto)');
      
      const { data: commentData, error } = await supabase.from('comments').insert({
          ticket_id: id, user_id: user?.id, content: finalContent, is_internal: isInternal
      }).select().single();
      
      if (error) throw error;
      
      if (selectedFile && commentData) {
          const filePath = await handleFileUpload(selectedFile);
          if (filePath) {
              await supabase.from('attachments').insert({
                  file_name: selectedFile.name, file_path: filePath, file_size: selectedFile.size, file_type: selectedFile.type, ticket_id: id, comment_id: commentData.id, uploaded_by: user?.id
              });
          }
      }
      
      if (!isInternal) await triggerEmailNotification(finalContent);
      
      toast({ title: 'Comentario agregado' });
      if (isInternal) setNewInternalNote(''); else setNewComment('');
      clearSelectedFile();
      fetchComments();
      fetchAttachments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const closeTicket = async () => {
    await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
    setCloseDialogOpen(false);
    fetchTicketDetails();
  };
  
  const claimTicket = async () => {
      if(!user) return;
      await supabase.from('tickets').update({ assigned_to: user.id, status: 'in_progress' }).eq('id', id);
      toast({ title: 'Ticket asignado a ti' });
      fetchTicketDetails();
  };

  const RankLegend = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
          <HelpCircle className="h-4 w-4" />
          Conoce los Rangos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
           <h4 className="font-semibold text-sm border-b pb-2">Niveles de Especialidad</h4>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-blue-100 text-blue-700 rounded p-1"><ShieldCheck className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-blue-900">Técnico Operativo</p><p className="text-xs text-muted-foreground">Soporte esencial y primera línea de ayuda.</p></div>
           </div>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-indigo-100 text-indigo-700 rounded p-1"><Zap className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-indigo-900">Especialista Senior</p><p className="text-xs text-muted-foreground">Experiencia avanzada en múltiples áreas.</p></div>
           </div>
           <div className="flex gap-3 items-start">
              <div className="mt-0.5 bg-amber-100 text-amber-700 rounded p-1"><Award className="h-4 w-4"/></div>
              <div><p className="text-sm font-bold text-amber-900">Master de Soluciones</p><p className="text-xs text-muted-foreground">Máxima autoridad técnica y supervisión.</p></div>
           </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (loading || !ticket) return <Layout><div>Cargando...</div></Layout>;

  const isAssigneeOnline = ticket.assigned_to && onlineUsers.has(ticket.assigned_to);
  const isCreatorOnline = onlineUsers.has(ticket.created_by);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
          
          <div className="flex gap-2 items-center">
              <RankLegend />

              {role === 'admin' && ticket.status !== 'closed' && (
                  <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
                      <UserPlus className="w-4 h-4 mr-2"/> Asignar Técnico
                  </Button>
              )}
              
              {role === 'technician' && !ticket.assigned_to && ticket.status !== 'closed' && (
                  <Button onClick={claimTicket}>Atender Ticket</Button>
              )}

              {ticket.status === 'in_progress' && (role === 'admin' || role === 'technician') && (
                <Button onClick={() => setCloseDialogOpen(true)}>Cerrar Ticket</Button>
              )}
          </div>
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
                    const isImage = attachment?.file_type?.startsWith('image/') || attachment?.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isAudio = attachment?.file_type?.startsWith('audio/');
                    
                    let RankBadge = null;
                    if (comment.user_role === 'technician') {
                        const rankInfo = getTechnicianRankInfo(comment.user_specialties?.length || 0, totalCategories);
                        const RankIcon = rankInfo.icon === 'Award' ? Award : rankInfo.icon === 'Zap' ? Zap : ShieldCheck;
                        RankBadge = (
                            <Badge variant="outline" className={cn("ml-2 text-[10px] px-1.5 py-0 h-5 gap-1 font-normal", rankInfo.color)}>
                                <RankIcon className="w-3 h-3" /> {rankInfo.label}
                            </Badge>
                        );
                    }

                    return (
                      <div key={comment.id} className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 border">
                          {/* AQUI ESTÁ LA CLAVE: Usamos la URL del avatar generada dinámicamente */}
                          <AvatarImage src={comment.user_avatar_url} className="object-cover" />
                          <AvatarFallback>{getInitials(comment.user_full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center flex-wrap gap-1">
                                <span className="font-medium text-sm">{comment.user_full_name}</span>
                                {RankBadge}
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { locale: es, addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                          
                          {attachment && (
                              <div className="mt-2">
                                {isImage ? (
                                  <div className="relative group max-w-md rounded-lg overflow-hidden border bg-muted/20">
                                    <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} alt={attachment.file_name} className="w-full h-auto object-cover max-h-80" />
                                    <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"><span className="bg-background/80 text-foreground text-xs px-2 py-1 rounded shadow">Abrir original</span></a>
                                  </div>
                                ) : isAudio ? (
                                  <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border w-full max-w-sm">
                                      <div className="bg-primary/10 p-2 rounded-full"><Mic className="h-4 w-4 text-primary" /></div>
                                      <audio controls src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} className="w-full h-8" />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md w-fit border">
                                      <FileIcon className="w-4 h-4 text-muted-foreground" /><a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[200px]">{attachment.file_name}</a>
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
                  {isRecording && (
                     <div className="w-full p-4 mb-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                           <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                           <span className="text-sm font-medium text-red-700">Grabando... {recordingTime}s / 30s</span>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopRecording} className="h-8 gap-2">
                           <Square className="h-3 w-3 fill-current" /> Detener
                        </Button>
                     </div>
                  )}
                  {selectedFile && !isRecording && (
                    <div className="w-full mb-2 p-3 bg-muted/30 border rounded-lg flex flex-col gap-2 relative animate-in zoom-in-95">
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                             {selectedFile.type.startsWith('audio/') ? <Mic className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />} 
                             {selectedFile.type.startsWith('audio/') ? 'Nota de voz grabada' : `Adjunto: ${selectedFile.name}`}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={clearSelectedFile}><Trash2 className="w-4 h-4" /></Button>
                       </div>
                       {previewUrl && selectedFile.type.startsWith('audio/') && <audio controls src={previewUrl} className="w-full h-8 mt-1" />}
                       {previewUrl && selectedFile.type.startsWith('image/') && <div className="rounded-md overflow-hidden border w-fit max-w-[200px]"><img src={previewUrl} alt="Preview" className="w-full h-auto" /></div>}
                    </div>
                  )}
                  {!isRecording && (
                    <>
                        <Label htmlFor="new-comment" className="sr-only">Añadir comentario</Label>
                        <Textarea id="new-comment" placeholder="Escribe una respuesta..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} className="resize-none" />
                        <div className="flex items-center gap-2 w-full mt-2">
                            <div className="flex items-center gap-1">
                                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Adjuntar archivo"><ImageIcon className="w-5 h-5" /></label>
                                <input id="file-upload" type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={startRecording} title="Grabar nota de voz (max 30s)"><Mic className="w-5 h-5" /></Button>
                            </div>
                            <div className="flex-1"></div>
                            <Button onClick={() => addComment(false)} size="sm" disabled={uploading}><Send className="w-4 h-4 mr-2" /> {uploading ? 'Enviando...' : 'Enviar'}</Button>
                        </div>
                    </>
                  )}
                </CardFooter>
              )}
            </Card>
          </div>
          <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-6"><Card><CardHeader><CardTitle>Detalles</CardTitle></CardHeader><CardContent className="space-y-4"><Separator /><div className="space-y-3"><div className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /><span className="text-muted-foreground mr-1">Creado por:</span><div className="flex items-center gap-2"><span className="font-medium">{ticket.creator_name}</span>{isCreatorOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}</div></div><div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /><span className="text-muted-foreground mr-1">Asignado a:</span><div className="flex items-center gap-2"><span className="font-medium">{ticket.assignee_name}</span>{isAssigneeOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}</div></div></div></CardContent></Card></div>
        </div>
        {closeDialogOpen && <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}><DialogContent><DialogHeader><DialogTitle>Cerrar Ticket</DialogTitle></DialogHeader><p>¿Seguro?</p><Button onClick={closeTicket}>Confirmar</Button></DialogContent></Dialog>}
        <AssignTicketDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} ticketId={ticket.id} currentTitle={ticket.title} onAssigned={fetchTicketDetails} />
      </div>
    </Layout>
  );
};
export default TicketDetail;