/* src/components/dashboards/ClientDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Ticket as TicketIcon, PlayCircle, CheckCircle2, 
  HelpCircle, FileText, Phone, ChevronRight, Clock, Wifi, Monitor, 
  AppWindow, KeyRound, ExternalLink 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceCategory } from '@/types/ticket'; 
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { SystemStatusWidget } from '@/components/SystemStatusWidget'; // <--- IMPORTANTE

const iconMap: any = { 'Wifi': Wifi, 'Monitor': Monitor, 'AppWindow': AppWindow, 'KeyRound': KeyRound, 'HelpCircle': HelpCircle };

type PriorityType = 'critical' | 'high' | 'medium' | 'low';
interface TicketFormData { title: string; description: string; priority: PriorityType; }

const ClientDashboard = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState<TicketFormData>({ title: '', description: '', priority: 'medium' });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) { fetchMyTickets(); fetchCategories(); } }, [user]);
  
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredTickets(tickets.filter(t => t.title.toLowerCase().includes(lower) || t.ticket_number?.toString().includes(lower)));
  }, [searchTerm, tickets]);

  const fetchCategories = async () => { const { data } = await supabase.from('service_categories').select('*'); if (data) setCategories(data); };
  
  const fetchMyTickets = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('tickets').select(`*, service_categories(name)`).eq('created_by', user.id).order('created_at', { ascending: false });
      setTickets(data || []); setFilteredTickets(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return toast.error('Completa todos los campos');
    if (!user) return;

    try {
      const { error } = await supabase.from('tickets').insert({ 
        title: formData.title, 
        description: formData.description, 
        priority: formData.priority, 
        created_by: user.id, 
        status: 'open', 
        category_id: selectedCategory?.id 
      });
      if (error) throw error;
      toast.success('Ticket creado exitosamente'); setDialogOpen(false); resetForm(); fetchMyTickets();
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const resetForm = () => { setFormData({ title: '', description: '', priority: 'medium' }); setStep(1); setSelectedCategory(null); };
  const handleCategorySelect = (cat: ServiceCategory) => { setSelectedCategory(cat); setFormData(prev => ({...prev, title: cat.name !== 'Otro' ? `Problema con ${cat.name}` : ''})); setStep(2); };

  const activeTickets = filteredTickets.filter(t => t.status !== 'closed');

  if (loading) return <div className="flex items-center justify-center h-96 text-muted-foreground">Cargando portal...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* --- HEADER --- */}
      <div className="relative overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground p-8 shadow-xl border border-sidebar-border">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                  <h1 className="text-3xl font-bold mb-2 text-white">Hola, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
                  <p className="text-sidebar-foreground/70 max-w-xl text-lg">
                      Bienvenido a tu centro de soporte. ¿Cómo podemos ayudarte hoy?
                  </p>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) resetForm(); }}>
                <DialogTrigger asChild>
                    <Button size="lg" className="bg-white text-sidebar-primary hover:bg-blue-50 font-semibold shadow-lg border-0 h-12 px-6">
                        <Plus className="w-5 h-5 mr-2" /> Nueva Solicitud
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{step === 1 ? "¿Con qué necesitas ayuda?" : "Describe tu problema"}</DialogTitle>
                    </DialogHeader>
                    {step === 1 ? (
                        <ScrollArea className="h-[350px] pr-4 -mr-4">
                            <div className="grid grid-cols-2 gap-3 py-2">
                                {categories.map((cat) => { 
                                    const Icon = iconMap[cat.icon || 'HelpCircle'] || HelpCircle; 
                                    return (
                                        <div key={cat.id} className="cursor-pointer flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all group" onClick={() => handleCategorySelect(cat)}>
                                            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform mb-3">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <span className="font-medium text-sm text-center">{cat.name}</span>
                                        </div>
                                    ); 
                                })}
                            </div>
                        </ScrollArea>
                    ) : (
                        <form onSubmit={createTicket} className="space-y-5">
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                                <Badge variant="secondary">{selectedCategory?.name}</Badge>
                                <span className="text-xs text-muted-foreground flex-1">Categoría seleccionada</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="h-6 text-xs">Cambiar</Button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>Asunto</Label>
                                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ej: Error al iniciar sesión" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Detalles</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Explica qué sucede y cuándo empezó..." className="resize-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Urgencia</Label>
                                    <Select value={formData.priority} onValueChange={(v: PriorityType) => setFormData({ ...formData, priority: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">🟢 Baja (Consulta)</SelectItem>
                                            <SelectItem value="medium">🟡 Media (Problema menor)</SelectItem>
                                            <SelectItem value="high">🟠 Alta (No puedo trabajar)</SelectItem>
                                            <SelectItem value="critical">🔴 Crítica (Sistema caído)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" className="w-full sm:w-auto px-8">Enviar Ticket</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
              </Dialog>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- COLUMNA IZQUIERDA --- */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* Stats Rápidos */}
              <div className="grid grid-cols-3 gap-4">
                 <StatsWidget icon={TicketIcon} label="Totales" value={tickets.length} color="blue" />
                 <StatsWidget icon={PlayCircle} label="En Curso" value={tickets.filter(t => t.status !== 'closed').length} color="orange" />
                 <StatsWidget icon={CheckCircle2} label="Resueltos" value={tickets.filter(t => t.status === 'closed').length} color="green" />
              </div>

              {/* Lista de Tickets */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" /> Mis Solicitudes
                     </h2>
                     <div className="relative w-48 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar..." className="pl-9 h-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                     </div>
                  </div>
                  
                  <div className="space-y-3">
                      {activeTickets.length === 0 && !searchTerm ? (
                          <Card className="border-dashed p-8 text-center bg-muted/30">
                              <div className="flex flex-col items-center text-muted-foreground">
                                  <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
                                  <p className="font-medium">¡Todo despejado!</p>
                                  <p className="text-sm">No tienes solicitudes pendientes.</p>
                              </div>
                          </Card>
                      ) : (
                          (searchTerm ? filteredTickets : activeTickets).map((ticket) => (
                              <div 
                                key={ticket.id} 
                                onClick={() => navigate(`/ticket/${ticket.id}`)}
                                className="group relative flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                              >
                                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
                                      ticket.status === 'in_progress' ? "bg-orange-500" : ticket.status === 'closed' ? "bg-green-500" : "bg-blue-500"
                                  )} />
                                  
                                  <div className="flex-1 min-w-0 ml-2">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-mono text-xs text-muted-foreground font-bold">#{ticket.ticket_number}</span>
                                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-muted/50 border-0">
                                              {ticket.service_categories?.name}
                                          </Badge>
                                          {ticket.status === 'in_progress' && <Badge className="text-[10px] h-5 bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Atendiendo</Badge>}
                                      </div>
                                      <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{ticket.title}</h3>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                          <Clock className="w-3 h-3" /> 
                                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })}
                                      </div>
                                  </div>
                                  
                                  <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors">
                                      <ChevronRight className="w-5 h-5" />
                                  </Button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>

          {/* --- COLUMNA DERECHA --- */}
          <div className="space-y-6">
              
              {/* WIDGET DEL SISTEMA CONECTADO A DB */}
              <SystemStatusWidget />

              {/* Widget: Base de Conocimiento (Simulado) */}
              <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-primary" /> ¿Dudas Frecuentes?
                      </CardTitle>
                      <CardDescription className="text-xs">Intenta solucionar tu problema antes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 p-2">
                      <ArticleLink title="Cómo restablecer mi contraseña" />
                      <ArticleLink title="Configurar VPN en casa" />
                      <ArticleLink title="La impresora no responde" />
                      <Button variant="link" className="w-full text-xs mt-2 h-auto py-1">Ver todas las guías</Button>
                  </CardContent>
              </Card>

              {/* Widget: Contacto */}
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                  <CardContent className="p-4 flex items-center gap-4">
                      <div className="bg-blue-200 dark:bg-blue-900 p-3 rounded-full text-blue-700 dark:text-blue-300">
                          <Phone className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300">¿Urgencia Crítica?</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Llama a la extensión <span className="font-bold">9110</span></p>
                      </div>
                  </CardContent>
              </Card>

          </div>
      </div>
    </div>
  );
};

const StatsWidget = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        blue: "bg-blue-100 text-blue-600",
        orange: "bg-orange-100 text-orange-600",
        green: "bg-green-100 text-green-600"
    };
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className={cn("p-2.5 rounded-full mb-2", colors[color])}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </CardContent>
        </Card>
    );
};

const ArticleLink = ({ title }: { title: string }) => (
    <Button variant="ghost" className="w-full justify-start text-sm h-9 font-normal text-muted-foreground hover:text-primary hover:bg-primary/5 truncate">
        <ExternalLink className="w-3 h-3 mr-2 opacity-50" />
        {title}
    </Button>
);

export default ClientDashboard;