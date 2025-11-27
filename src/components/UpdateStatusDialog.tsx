/* src/components/UpdateStatusDialog.tsx */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity } from 'lucide-react';
import { toast } from 'sonner';

// Definimos la interfaz aquí también
interface Service { 
    id: string; 
    name: string; 
    status: 'online' | 'issues' | 'maintenance'; 
}

export const UpdateStatusDialog = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if(open) fetchServices(); }, [open]);

  const fetchServices = async () => {
      // Usamos 'as any' para evitar el error de TypeScript
      const { data } = await supabase.from('system_services' as any).select('*').order('name');
      if(data) setServices(data as unknown as Service[]);
  };

  const updateService = async (id: string, newStatus: string) => {
      setLoading(true);
      
      // Actualizamos fecha y estado usando 'as any' en la tabla
      const { error } = await supabase.from('system_services' as any).update({ 
          status: newStatus, 
          last_updated: new Date().toISOString() 
      }).eq('id', id);
      
      if (error) {
          toast.error('Error al actualizar: ' + error.message);
      } else {
          toast.success('Estado actualizado correctamente');
          // Forzamos el tipado del status al actualizar el estado local
          setServices(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as 'online' | 'issues' | 'maintenance' } : s));
      }
      setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
                <Activity className="w-4 h-4" /> Gestionar Servicios
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Actualizar Estado del Sistema</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-card shadow-sm">
                        <div className="font-medium text-sm">{service.name}</div>
                        <Select 
                           value={service.status} 
                           onValueChange={(val) => updateService(service.id, val)}
                           disabled={loading}
                        >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">🟢 Operativo</SelectItem>
                                <SelectItem value="issues">🟠 Problemas</SelectItem>
                                <SelectItem value="maintenance">🔵 Mantenimiento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
            <div className="text-xs text-muted-foreground text-center bg-muted/50 p-2 rounded">
                Los cambios se reflejarán inmediatamente en todos los clientes conectados.
            </div>
        </DialogContent>
    </Dialog>
  );
};