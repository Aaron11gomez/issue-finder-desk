/* src/pages/Community.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Megaphone, MessageSquare, Heart, ShieldCheck, Plus, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Post {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'critical';
  author_id: string;
  likes_count: number;
  created_at: string;
  author_name?: string;
  author_role?: string;
}

export const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const { user, role } = useAuth();
  
  // Form State
  const [newPost, setNewPost] = useState({ title: '', content: '', priority: 'normal' });

  useEffect(() => {
    fetchPosts();
    
    // Realtime para ver posts nuevos al instante
    const channel = supabase.channel('community-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
          fetchPosts(); // Recargamos completo para simplificar joins
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    // 1. Obtener posts (Usamos 'as any' porque la tabla es nueva)
    const { data: rawPosts, error } = await supabase.from('community_posts' as any).select('*').order('created_at', { ascending: false });
    
    if (error) { console.error(error); setLoading(false); return; }
    
    if (rawPosts) {
        // 2. Enriquecer con autores
        const userIds = [...new Set(rawPosts.map((p: any) => p.author_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        
        const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]));
        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));

        const formatted = rawPosts.map((p: any) => ({
            ...p,
            author_name: nameMap.get(p.author_id) || 'Staff Nexus',
            author_role: roleMap.get(p.author_id) || 'admin'
        }));
        setPosts(formatted);
    }
    setLoading(false);
  };

  const createPost = async () => {
      if (!newPost.title || !newPost.content) return toast.error('Completa los campos');
      
      const { error } = await supabase.from('community_posts' as any).insert({
          title: newPost.title,
          content: newPost.content,
          priority: newPost.priority,
          author_id: user?.id
      });

      if (error) toast.error('Error al publicar');
      else {
          toast.success('Anuncio publicado');
          setCreateOpen(false);
          setNewPost({ title: '', content: '', priority: 'normal' });
      }
  };

  const likePost = async (id: string, currentLikes: number) => {
      await supabase.from('community_posts' as any).update({ likes_count: currentLikes + 1 }).eq('id', id);
  };

  const isStaff = role === 'admin' || role === 'technician';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Megaphone className="w-8 h-8 text-yellow-400" />
                    Comunidad Nexus
                </h1>
                <p className="text-blue-200 mt-2 max-w-lg text-lg">
                    Noticias, mantenimientos y anuncios oficiales para toda la organización.
                </p>
            </div>
            
            {isStaff && (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-bold border-0 shadow-lg relative z-10">
                            <Plus className="w-5 h-5 mr-2" /> Nuevo Anuncio
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Crear Anuncio Global</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input placeholder="Título del anuncio" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                            <Textarea placeholder="Contenido del mensaje..." rows={5} value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} />
                            <Select value={newPost.priority} onValueChange={(v) => setNewPost({...newPost, priority: v})}>
                                <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">🔵 Informativo (Normal)</SelectItem>
                                    <SelectItem value="important">🟠 Importante</SelectItem>
                                    <SelectItem value="critical">🔴 Crítico (Alerta)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button className="w-full" onClick={createPost}>Publicar</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>

        {/* FEED */}
        <div className="space-y-6">
            {loading ? <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div> : posts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border-dashed border-2">
                    <BellRing className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Aún no hay anuncios oficiales.</p>
                </div>
            ) : (
                posts.map((post) => (
                    <Card key={post.id} className={cn("overflow-hidden border-l-4 transition-all hover:shadow-md", 
                        post.priority === 'critical' ? "border-l-red-500 bg-red-50/10" : 
                        post.priority === 'important' ? "border-l-orange-500" : "border-l-blue-500"
                    )}>
                        <CardHeader className="flex flex-row items-start gap-4 pb-2">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-slate-800 text-white font-bold">{post.author_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-foreground">{post.author_name}</h3>
                                        <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> STAFF OFICIAL
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { locale: es, addSuffix: true })}</span>
                                </div>
                                <p className="text-xs text-muted-foreground capitalize">{post.author_role}</p>
                            </div>
                        </CardHeader>
                        
                        <CardContent>
                            {post.priority === 'critical' && (
                                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                                    <BellRing className="w-3 h-3" /> Alerta Crítica del Sistema
                                </div>
                            )}
                            <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        </CardContent>
                        
                        <CardFooter className="pt-2 pb-4 border-t bg-muted/20 flex gap-4">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-50 gap-2" onClick={() => likePost(post.id, post.likes_count)}>
                                <Heart className={cn("w-4 h-4", post.likes_count > 0 && "fill-red-500 text-red-500")} /> {post.likes_count}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 cursor-default">
                                <MessageSquare className="w-4 h-4" /> Comentarios desactivados
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
      </div>
    </Layout>
  );
};