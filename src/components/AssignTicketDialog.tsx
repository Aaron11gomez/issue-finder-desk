/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/components/AssignTicketDialog.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getTechnicianRankInfo, cn } from '@/lib/utils'; // Importamos utilidades
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Award, ShieldCheck } from 'lucide-react';

interface Technician {
  id: string;
  full_name: string;
  email: string;
  specialties: string[];
}

interface AssignTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  currentTitle: string;
  onAssigned: () => void;
}

export const AssignTicketDialog = ({ open, onOpenChange, ticketId, currentTitle, onAssigned }: AssignTicketDialogProps) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState(0);

  useEffect(() => {
    if (open) {
      fetchTechnicians();
      fetchCategoryCount();
    }
  }, [open]);

  const fetchCategoryCount = async () => {
     const { count } = await supabase.from('service_categories').select('*', { count: 'exact', head: true });
     setTotalCategories(count || 0);
  };

  const fetchTechnicians = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');

      if (rolesError) throw rolesError;

      const techIds = rolesData.map(r => r.user_id);

      if (techIds.length > 0) {
        // Ahora traemos también las especialidades
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, specialties')
          .in('id', techIds);
        
        if (profilesError) throw profilesError;

        setTechnicians(profilesData.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: 'Técnico',
            specialties: p.specialties || []
        })));
      }
    } catch (error) {
      console.error('Error cargando técnicos', error);
      toast.error('No se pudo cargar la lista de técnicos');
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) {
        toast.error('Selecciona un técnico');
        return;
    }

    setLoading(true);
    try {
        const { error } = await supabase
            .from('tickets')
            .update({ 
                assigned_to: selectedTech,
                status: 'in_progress' 
            })
            .eq('id', ticketId);

        if (error) throw error;

        toast.success('Ticket asignado correctamente');
        onAssigned();
        onOpenChange(false);
    } catch (error: any) {
        toast.error('Error al asignar: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Responsable</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-3 bg-muted/30 rounded-md border border-l-4 border-l-primary">
             <span className="text-xs text-muted-foreground uppercase font-bold">Ticket a asignar</span>
             <p className="font-medium truncate">{currentTitle}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Técnico Disponible</Label>
            <Select onValueChange={setSelectedTech} value={selectedTech}>
              <SelectTrigger className="h-auto py-3">
                <SelectValue placeholder="Selecciona un técnico..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => {
                  // Calculamos el rango al vuelo
                  const rankInfo = getTechnicianRankInfo(tech.specialties.length, totalCategories);
                  const RankIcon = rankInfo.icon === 'Award' ? Award : rankInfo.icon === 'Zap' ? Zap : ShieldCheck;
                  
                  return (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                    {tech.full_name.substring(0,2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left">
                                <span className="font-medium leading-none">{tech.full_name}</span>
                                <span className="text-[10px] text-muted-foreground">{tech.specialties.length} áreas de dominio</span>
                            </div>
                          </div>
                          
                          {/* Etiqueta de Rango */}
                          <Badge variant="outline" className={cn("ml-auto text-[10px] h-5 gap-1", rankInfo.color)}>
                             <RankIcon className="w-3 h-3" /> {rankInfo.label}
                          </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? 'Procesando...' : 'Confirmar Asignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};