/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/TicketDetail.tsx */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/contexts/PresenceContext'; // Importar contexto de presencia
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Send, Paperclip, X, FileIcon, UserPlus, Mic, Square, Trash2, Clock, Calendar, Image as ImageIcon, HelpCircle, ShieldCheck, Zap, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AssignTicketDialog } from '@/components/AssignTicketDialog'; 
import { getTechnicianRankInfo, cn } from '@/lib/utils'; 
import { Ticket } from '@/types/ticket';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Comment { id: string; content: string; created_at: string; user_id: string; is_internal: boolean; user_full_name: string; user_role?: string; user_specialties?: string[]; user_avatar_url?: string; }
interface Attachment { id: string; file_name: string; file_path: string; file_type: string | null; comment_id?: string; }

const getInitials = (name: string | undefined) => name ? name.split(' ').map((n) => n[0]).join('').toUpperCase() : '?';

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { onlineUsers } = usePresence(); // Recuperamos el estado online
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]); 
  const [loading, setLoading] = useState(true);
  const [totalCategories, setTotalCategories] = useState(0); 
  
  const [newComment, setNewComment] = useState('');
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id && user) { fetchTicketDetails(); fetchComments(); fetchAttachments(); fetchCategoryCount(); } }, [id, user]);
  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);
  useEffect(() => { if(comments.length) scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  useEffect(() => {
    let interval: any;
    if (isRecording) interval = setInterval(() => setRecordingTime((p) => p >= 30 ? (stopRecording(), 30) : p + 1), 1000);
    else setRecordingTime(0);
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchCategoryCount = async () => { const { count } = await supabase.from('service_categories').select('*', { count: 'exact', head: true }); setTotalCategories(count || 0); };

  const fetchTicketDetails = async () => {
    if (!id) return;
    const { data: ticketData, error } = await supabase.from('tickets').select(`*`).eq('id', id).single();
    if (error) { toast.error('Error cargando ticket'); navigate('/dashboard'); return; }
    
    const userIds = [ticketData.created_by];
    if (ticketData.assigned_to) userIds.push(ticketData.assigned_to);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const map = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    setTicket({
        ...ticketData,
        ticket_number: ticketData.ticket_number || 0,
        creator_name: map.get(ticketData.created_by) || 'Usuario',
        assignee_name: ticketData.assigned_to ? (map.get(ticketData.assigned_to) || 'Técnico') : 'Sin asignar'
    } as Ticket);
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data: cmts } = await supabase.from('comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    if (cmts) {
        const uIds = [...new Set(cmts.map(c => c.user_id))];
        const { data: profs } = await supabase.from('profiles').select('id, full_name, specialties').in('id', uIds);
        const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', uIds);
        const pMap = new Map(profs?.map(p => [p.id, p]) || []);
        const rMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
        
        setComments(cmts.map(c => {
            const { data: av } = supabase.storage.from('avatars').getPublicUrl(`${c.user_id}/avatar.png`);
            return { ...c, user_full_name: pMap.get(c.user_id)?.full_name || 'Usuario', user_role: rMap.get(c.user_id), user_specialties: pMap.get(c.user_id)?.specialties || [], user_avatar_url: av.publicUrl };
        }));
    }
  };

  const fetchAttachments = async () => { if (!id) return; const { data } = await supabase.from('attachments').select('*').eq('ticket_id', id); if (data) setAttachments(data as Attachment[]); };

  const handleFileSelect = (e:any) => { if(e.target.files[0]) { setSelectedFile(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); } };
  const clearSelectedFile = () => { setSelectedFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ''; };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorderRef.current = new MediaRecorder(stream); audioChunksRef.current = []; mediaRecorderRef.current.ondataavailable = e => { if(e.data.size > 0) audioChunksRef.current.push(e.data); }; mediaRecorderRef.current.onstop = () => { const file = new File([new Blob(audioChunksRef.current, { type: 'audio/webm' })], `voice_${Date.now()}.webm`, { type: 'audio/webm' }); setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); stream.getTracks().forEach(t => t.stop()); }; mediaRecorderRef.current.start(); setIsRecording(true); } catch { toast.error('Error micrófono'); } };
  const stopRecording = () => { if(mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };
  const handleFileUpload = async (file: File) => { const path = `${id}/${Math.random()}.${file.name.split('.').pop()}`; await supabase.storage.from('ticket-attachments').upload(path, file); return path; };
  const triggerNotif = async (msg: string) => { if(!ticket || !user) return; const target = ticket.created_by === user.id ? ticket.assigned_to : ticket.created_by; if(target) supabase.functions.invoke('send-email-notification', { body: { target_user_id: target, subject: `Update #${ticket.ticket_number}`, message: msg } }); };

  const addComment = async (isInternal: boolean = false) => {
    if (!newComment.trim() && !selectedFile) return toast.error('Escribe algo');
    setUploading(true);
    try {
      const content = newComment || (selectedFile?.type.startsWith('audio/') ? '🎤 Nota de voz' : '📎 Archivo');
      const { data: cmt, error } = await supabase.from('comments').insert({ ticket_id: id, user_id: user?.id, content, is_internal: isInternal }).select().single();
      if(error) throw error;
      if (selectedFile) { const path = await handleFileUpload(selectedFile); if(path) await supabase.from('attachments').insert({ file_name: selectedFile.name, file_path: path, file_type: selectedFile.type, ticket_id: id, comment_id: cmt.id, uploaded_by: user?.id }); }
      await triggerNotif(content);
      setNewComment(''); clearSelectedFile(); fetchComments(); fetchAttachments();
    } catch (e:any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const closeTicket = async () => { await supabase.from('tickets').update({ status: 'closed' }).eq('id', id); setCloseDialogOpen(false); fetchTicketDetails(); };
  const claimTicket = async () => { if(!user) return; await supabase.from('tickets').update({ assigned_to: user.id, status: 'in_progress' }).eq('id', id); toast.success('Ticket asignado'); fetchTicketDetails(); };

  const RankLegend = () => (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary"><HelpCircle className="h-4 w-4" /> Leyenda</Button></PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
           <h4 className="font-semibold text-sm border-b pb-2">Niveles</h4>
           <div className="flex gap-3 items-start"><div className="mt-0.5 bg-blue-100 text-blue-700 rounded p-1"><ShieldCheck className="h-4 w-4"/></div><div><p className="text-sm font-bold text-blue-900">Operativo</p><p className="text-xs text-muted-foreground">Nivel 1.</p></div></div>
           <div className="flex gap-3 items-start"><div className="mt-0.5 bg-indigo-100 text-indigo-700 rounded p-1"><Zap className="h-4 w-4"/></div><div><p className="text-sm font-bold text-indigo-900">Senior</p><p className="text-xs text-muted-foreground">Nivel 2.</p></div></div>
           <div className="flex gap-3 items-start"><div className="mt-0.5 bg-amber-100 text-amber-700 rounded p-1"><Award className="h-4 w-4"/></div><div><p className="text-sm font-bold text-amber-900">Master</p><p className="text-xs text-muted-foreground">Nivel 3.</p></div></div>
        </div>
      </PopoverContent>
    </Popover>
  );

  if (loading || !ticket) return <Layout><div>Cargando...</div></Layout>;

  // Cálculo de estado online real
  const isAssigneeOnline = ticket.assigned_to && onlineUsers.has(ticket.assigned_to);
  const isCreatorOnline = onlineUsers.has(ticket.created_by);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
        
        {/* --- HEADER MODERNO --- */}
        <div className="flex items-center justify-between py-4 border-b bg-background z-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">#{ticket.ticket_number?.toString().padStart(5,'0')}</span>
                            {ticket.title}
                        </h1>
                        <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'closed' ? 'outline' : 'secondary'} className="capitalize">
                            {ticket.status === 'in_progress' ? 'En Progreso' : ticket.status === 'open' ? 'Abierto' : 'Cerrado'}
                        </Badge>
                        {/* Indicador de cliente online */}
                        {isCreatorOnline && ticket.created_by !== user?.id && (
                            <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800 border-green-200">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Cliente en línea
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
                        <span className="mx-1">•</span>
                        {ticket.category_name || 'General'}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 items-center">
                <RankLegend />
                {role === 'admin' && ticket.status !== 'closed' && <Button variant="outline" onClick={() => setAssignDialogOpen(true)}><UserPlus className="w-4 h-4 mr-2"/> Reasignar</Button>}
                {role === 'technician' && !ticket.assigned_to && ticket.status !== 'closed' && <Button onClick={claimTicket}>Tomar Ticket</Button>}
                {ticket.status !== 'closed' && (role === 'admin' || role === 'technician') && <Button variant="destructive" onClick={() => setCloseDialogOpen(true)}>Cerrar Ticket</Button>}
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden gap-6 pt-6">
            
            {/* --- COLUMNA IZQUIERDA: CHAT --- */}
            <div className="flex-1 flex flex-col bg-muted/20 rounded-xl border overflow-hidden shadow-sm">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Descripción Inicial */}
                    <div className="flex gap-4 p-4 bg-background rounded-xl border shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {getInitials(ticket.creator_name)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold">{ticket.creator_name}</span>
                                <span className="text-xs text-muted-foreground">abrió el ticket</span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-center my-6">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <span className="relative bg-muted/20 px-2 text-xs text-muted-foreground uppercase">Historial</span>
                    </div>

                    {comments.map((c) => { // Variable 'c' usada consistentemente
                        const isMe = c.user_id === user?.id;
                        const attachment = attachments.find(a => a.comment_id === c.id);
                        
                        // Lógica de rango corregida usando 'c'
                        let RankBadge = null;
                        if (c.user_role === 'technician') {
                            const rankInfo = getTechnicianRankInfo(c.user_specialties?.length || 0, totalCategories);
                            const RankIcon = rankInfo.icon === 'Award' ? Award : rankInfo.icon === 'Zap' ? Zap : ShieldCheck;
                            RankBadge = (
                                <Badge variant="outline" className={cn("ml-2 text-[10px] px-1.5 py-0 h-5 gap-1 font-normal", rankInfo.color)}>
                                    <RankIcon className="w-3 h-3" /> {rankInfo.label}
                                </Badge>
                            );
                        }

                        return (
                            <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <Avatar className="h-9 w-9 border shadow-sm">
                                    <AvatarImage src={c.user_avatar_url} />
                                    <AvatarFallback>{getInitials(c.user_full_name)}</AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                        <span className="font-medium">{c.user_full_name}</span>
                                        {RankBadge}
                                        <span>{format(new Date(c.created_at), 'HH:mm')}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-white dark:bg-card border rounded-tl-none'}`}>
                                        <p className="whitespace-pre-wrap">{c.content}</p>
                                        {attachment && (
                                            <div className="mt-2 pt-2 border-t border-white/20">
                                                {attachment.file_type?.startsWith('image/') ? (
                                                    <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} className="rounded-md max-h-48 object-cover" />
                                                ) : attachment.file_type?.startsWith('audio/') ? (
                                                    <audio controls src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} className="h-8 w-48" />
                                                ) : (
                                                    <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${attachment.file_path}`} target="_blank" className="flex items-center gap-2 underline hover:opacity-80"><FileIcon className="w-4 h-4"/> {attachment.file_name}</a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>

                {/* Área de Input */}
                {ticket.status !== 'closed' && role !== 'admin' && (
                    <div className="p-4 bg-background border-t">
                        {isRecording && (
                            <div className="flex items-center justify-between p-3 bg-red-50 text-red-600 rounded-lg mb-2 animate-pulse border border-red-100">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 bg-red-600 rounded-full animate-ping"/> Grabando {recordingTime}s / 30s</span>
                                <Button size="sm" variant="destructive" onClick={stopRecording}><Square className="w-3 h-3 mr-1" /> Parar</Button>
                            </div>
                        )}
                        {selectedFile && !isRecording && (
                            <div className="flex items-center justify-between p-2 bg-muted rounded-lg mb-2">
                                <span className="text-xs flex items-center gap-2 truncate"><Paperclip className="w-3 h-3"/> {selectedFile.name}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={clearSelectedFile}><X className="w-3 h-3"/></Button>
                            </div>
                        )}
                        <div className="flex gap-2 items-end">
                            <div className="flex gap-1 pb-1">
                                <input type="file" id="f" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Adjuntar"><Paperclip className="w-5 h-5 text-muted-foreground"/></Button>
                                <Button variant="ghost" size="icon" onClick={startRecording} title="Grabar Audio"><Mic className={`w-5 h-5 ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`}/></Button>
                            </div>
                            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe un mensaje..." className="min-h-[2.5rem] max-h-32 resize-none py-2" rows={1} />
                            
                            {/* CORRECCIÓN: Botón sin argumentos inválidos */}
                            <Button onClick={() => addComment()} disabled={uploading} className="mb-0.5"><Send className="w-4 h-4" /></Button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- COLUMNA DERECHA: INFO --- */}
            <div className="w-80 space-y-6 hidden lg:block">
                <Card className="p-0 overflow-hidden">
                    <div className="bg-muted/50 p-4 border-b"><h3 className="font-semibold">Detalles del Ticket</h3></div>
                    <div className="p-4 space-y-4">
                        <div><span className="text-xs text-muted-foreground block mb-1">Prioridad</span><PriorityBadge priority={ticket.priority} /></div>
                        <div><span className="text-xs text-muted-foreground block mb-1">Categoría</span><Badge variant="outline">{ticket.category_name || 'General'}</Badge></div>
                        <div className="border-t my-2"></div>
                        <div><span className="text-xs text-muted-foreground block mb-1">Solicitante</span>
                            <div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{getInitials(ticket.creator_name)}</AvatarFallback></Avatar><span className="text-sm font-medium">{ticket.creator_name}</span></div>
                        </div>
                        <div><span className="text-xs text-muted-foreground block mb-1">Responsable</span>
                            <div className="flex items-center gap-2">
                                {ticket.assignee_name && ticket.assignee_name !== 'Sin asignar' ? 
                                    <>
                                        <Avatar className="h-6 w-6 bg-blue-100"><AvatarFallback className="text-[10px] text-blue-700">{getInitials(ticket.assignee_name)}</AvatarFallback></Avatar>
                                        <span className="text-sm font-medium text-blue-700">{ticket.assignee_name}</span>
                                        {/* Indicador de técnico online */}
                                        {isAssigneeOnline && <div className="w-2 h-2 bg-green-500 rounded-full" title="En línea" />}
                                    </> 
                                    : <span className="text-sm text-muted-foreground italic">Nadie asignado</span>
                                }
                            </div>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Calendar className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Abierto el</p>
                            <p className="font-medium">{format(new Date(ticket.created_at), "dd MMM yyyy")}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>

        {closeDialogOpen && <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}><DialogContent><DialogHeader><DialogTitle>Cerrar Ticket</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancelar</Button><Button onClick={closeTicket}>Confirmar Cierre</Button></DialogFooter></DialogContent></Dialog>}
        <AssignTicketDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} ticketId={ticket.id} currentTitle={ticket.title} onAssigned={fetchTicketDetails} />
      </div>
    </Layout>
  );
};

export default TicketDetail;