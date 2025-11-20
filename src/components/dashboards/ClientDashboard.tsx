/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/dashboards/ClientDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, Wifi, Monitor, AppWindow, KeyRound, HelpCircle, Search, Ticket as TicketIcon, CheckCircle2, Clock, History, PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceCategory } from '@/types/ticket'; 
import { PriorityBadge } from '@/components/PriorityBadge';
import { cn } from '@/lib/utils'; // Importar utilidad para clases

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const iconMap: any = {
  'Wifi': Wifi, 'Monitor': Monitor, 'AppWindow': AppWindow, 'KeyRound': KeyRound, 'HelpCircle': HelpCircle
};

const ClientDashboard = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, closed: 0 });

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low'
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTickets();
    fetchCategories();
  }, []);

  useEffect(() => {
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = tickets.filter(t => 
        t.title.toLowerCase().includes(lowerTerm) || 
        t.id.toLowerCase().includes(lowerTerm)
    );
    setFilteredTickets(filtered);
  }, [searchTerm, tickets]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('service_categories').select('*');
    if (data) setCategories(data);
  };

  const fetchMyTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`*, service_categories(name)`) 
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const dataTickets = data || [];
      setTickets(dataTickets);
      setFilteredTickets(dataTickets);

      setStats({
          total: dataTickets.length,
          open: dataTickets.filter(t => t.status === 'open').length,
          in_progress: dataTickets.filter(t => t.status === 'in_progress').length,
          closed: dataTickets.filter(t => t.status === 'closed').length
      });

    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !selectedCategory) {
      toast({ title: 'Error', description: 'Completa todos los campos', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('tickets')
        .insert({
          title: formData.title, description: formData.description, priority: formData.priority,
          created_by: user?.id || '', status: 'open', category_id: selectedCategory.id
        });

      if (error) throw error;
      toast({ title: 'Ticket creado', description: 'Tu solicitud ha sido enviada.' });
      setDialogOpen(false);
      resetForm();
      fetchMyTickets();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', priority: 'medium' });
    setStep(1);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
    if (category.name !== 'Otro') {
        setFormData(prev => ({...prev, title: `Problema con ${category.name}`}));
    } else {
        setFormData(prev => ({...prev, title: ''}));
    }
    setStep(2);
  };

  // Helper para renderizar el Badge de estado con colores semánticos
  const StatusBadge = ({ status }: { status: string }) => {
      let styles = "";
      let label = "";
      
      switch (status) {
        case 'open':
            styles = "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100";
            label = "Abierto";
            break;
        case 'in_progress':
            styles = "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100";
            label = "En Progreso";
            break;
        case 'closed':
            styles = "bg-green-100 text-green-700 border-green-200 hover:bg-green-100";
            label = "Cerrado";
            break;
        default:
            styles = "bg-gray-100 text-gray-700";
            label = status;
      }

      return <Badge variant="outline" className={cn("font-medium", styles)}>{label}</Badge>;
  };

  // Separar tickets para las dos secciones
  const activeTickets = filteredTickets.filter(t => t.status !== 'closed');
  const closedTickets = filteredTickets.filter(t => t.status === 'closed');

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-8">
      {/* HEADER Y BOTÓN CREAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Hola, {user?.user_metadata?.full_name || 'Usuario'}</h1>
          <p className="text-muted-foreground mt-1">Aquí tienes un resumen de tus solicitudes de soporte.</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild><Button className="shadow-lg"><Plus className="w-4 h-4 mr-2" /> Solicitar Soporte</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>{step === 1 ? "¿Qué tipo de problema tienes?" : "Detalles del Problema"}</DialogTitle></DialogHeader>
            {step === 1 && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 gap-4 py-4">
                  {categories.map((cat) => {
                    const Icon = iconMap[cat.icon || 'HelpCircle'] || HelpCircle;
                    return (
                      <Card key={cat.id} className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary/50" onClick={() => handleCategorySelect(cat)}>
                        <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
                          <Icon className="h-8 w-8 text-primary" /><span className="font-semibold">{cat.name}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {step === 2 && (
              <form onSubmit={createTicket} className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-4"><Badge variant="secondary">{selectedCategory?.name}</Badge><Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Cambiar</Button></div>
                <div className="space-y-2"><Label>Asunto</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ej: No conecta el proyector" /></div>
                <div className="space-y-2"><Label>Detalles</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe qué está pasando..." rows={4} /></div>
                <div className="space-y-2"><Label>Urgencia</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Baja (Puede esperar)</SelectItem><SelectItem value="medium">Normal</SelectItem><SelectItem value="high">Alta (Me impide trabajar)</SelectItem><SelectItem value="critical">Crítica (Emergencia)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end pt-2"><Button type="button" variant="outline" onClick={() => setStep(1)}>Atrás</Button><Button type="submit">Enviar Solicitud</Button></div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* TARJETAS DE RESUMEN (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <Card>
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><TicketIcon className="w-6 h-6"/></div>
               <div><p className="text-sm text-muted-foreground">Total Solicitudes</p><h3 className="text-2xl font-bold">{stats.total}</h3></div>
            </CardContent>
         </Card>
         <Card>
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-amber-100 text-amber-600 rounded-full"><PlayCircle className="w-6 h-6"/></div>
               <div><p className="text-sm text-muted-foreground">En Proceso/Abiertos</p><h3 className="text-2xl font-bold">{stats.open + stats.in_progress}</h3></div>
            </CardContent>
         </Card>
         <Card>
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-green-100 text-green-600 rounded-full"><CheckCircle2 className="w-6 h-6"/></div>
               <div><p className="text-sm text-muted-foreground">Resueltos</p><h3 className="text-2xl font-bold">{stats.closed}</h3></div>
            </CardContent>
         </Card>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative w-full max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar en todos mis tickets..." className="pl-8 bg-card" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* SECCIÓN 1: TICKETS ACTIVOS */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Solicitudes en Curso ({activeTickets.length})</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              {activeTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tienes solicitudes activas en este momento.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Asunto</TableHead><TableHead>Categoría</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {activeTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell><Badge variant="outline">{ticket.service_categories?.name || 'General'}</Badge></TableCell>
                        <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                        <TableCell><StatusBadge status={ticket.status} /></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/ticket/${ticket.id}`)}>Ver</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>

      {/* SECCIÓN 2: TICKETS CERRADOS */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl font-semibold text-muted-foreground">Historial de Cerrados ({closedTickets.length})</h2>
          </div>
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="p-0">
              {closedTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay tickets cerrados en el historial.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Asunto</TableHead><TableHead>Categoría</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {closedTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="opacity-80 hover:opacity-100">
                        <TableCell className="font-medium text-muted-foreground">{ticket.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-muted-foreground border-muted">{ticket.service_categories?.name || 'General'}</Badge></TableCell>
                        <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                        <TableCell><StatusBadge status={ticket.status} /></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/ticket/${ticket.id}`)}>Ver</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;