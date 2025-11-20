import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Wifi, Monitor, AppWindow, KeyRound, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceCategory } from '@/types/ticket'; // Importar tipos

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mapeo de iconos
const iconMap: any = {
  'Wifi': Wifi,
  'Monitor': Monitor,
  'AppWindow': AppWindow,
  'KeyRound': KeyRound,
  'HelpCircle': HelpCircle
};

const ClientDashboard = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]); // HU-18
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Estados para el formulario de pasos
  const [step, setStep] = useState(1); // 1: Categoría, 2: Detalles
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
    fetchCategories(); // HU-18
  }, []);

  // HU-18: Fetch categorías
  const fetchCategories = async () => {
    const { data } = await supabase.from('service_categories').select('*');
    if (data) setCategories(data);
  };

  const fetchMyTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`*, service_categories(name)`) // Join para traer nombre de categoría
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          created_by: user?.id || '',
          status: 'open',
          category_id: selectedCategory.id // HU-18: Guardar categoría
        });

      if (error) throw error;

      toast({ title: 'Ticket creado', description: 'Tu ticket ha sido creado exitosamente' });

      setDialogOpen(false);
      resetForm();
      fetchMyTickets();

    } catch (error: any) {
      console.error('Error creating ticket:', error);
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
    // Autocompletar título si es específico (HU-18 Sugerencia)
    if (category.name !== 'Otro') {
        setFormData(prev => ({...prev, title: `Problema con ${category.name}`}));
    } else {
        setFormData(prev => ({...prev, title: ''}));
    }
    setStep(2);
  };

  // ... Helpers de colores (getStatusColor, etc) se mantienen igual ...
  const getStatusColor = (status: string): "default" | "secondary" | "outline" => {
      switch (status) {
        case 'open': return 'default';
        case 'in_progress': return 'secondary';
        case 'closed': return 'outline';
        default: return 'default';
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

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
      switch (priority) {
        case 'critical': return 'destructive';
        case 'high': return 'destructive';
        case 'medium': return 'default';
        case 'low': return 'secondary';
        default: return 'default';
      }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Tickets</h1>
          <p className="text-muted-foreground mt-2">Administra tus solicitudes</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Crear Nuevo Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {step === 1 ? "¿Qué tipo de problema tienes?" : "Detalles del Ticket"}
              </DialogTitle>
            </DialogHeader>

            {/* PASO 1: SELECCIÓN DE CATEGORÍA (HU-18) */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4 py-4">
                {categories.map((cat) => {
                  const Icon = iconMap[cat.icon || 'HelpCircle'] || HelpCircle;
                  return (
                    <Card 
                      key={cat.id} 
                      className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary/50"
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
                        <Icon className="h-8 w-8 text-primary" />
                        <span className="font-semibold">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.description}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* PASO 2: FORMULARIO DETALLADO */}
            {step === 2 && (
              <form onSubmit={createTicket} className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">{selectedCategory?.name}</Badge>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">Cambiar categoría</Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: No puedo conectar a la red WiFi"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Explica los detalles..."
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                    <Button type="submit">Enviar Ticket</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {tickets.length === 0 ? (
            <p className="text-center text-muted-foreground">No tienes tickets aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead> {/* Columna Nueva */}
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.title}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{ticket.service_categories?.name || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(ticket.priority)}>{getPriorityLabel(ticket.priority)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/ticket/${ticket.id}`)}>Ver Detalles</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;