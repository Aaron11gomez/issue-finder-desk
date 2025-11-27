/* src/components/SystemStatusWidget.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Definimos la interfaz localmente para evitar conflictos con los tipos globales desactualizados
interface Service { 
    id: string; 
    name: string; 
    status: 'online' | 'issues' | 'maintenance'; 
    last_updated: string; 
}

export const SystemStatusWidget = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
    
    // Suscripción en Tiempo Real
    const channel = supabase.channel('services-update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_services' }, (payload) => {
          // Casting seguro del payload nuevo
          setServices(prev => prev.map(s => s.id === payload.new.id ? (payload.new as unknown as Service) : s));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchServices = async () => {
    // TRUCO: Usamos 'system_services' as any para que TS no se queje de que la tabla no existe en los tipos
    const { data } = await supabase.from('system_services' as any).select('*').order('name');
    
    if (data) {
        // TRUCO: Doble cast (unknown -> Service[]) para evitar el error de "overlap"
        setServices(data as unknown as Service[]);
    }
    setLoading(false);
  };

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;

  const hasIssues = services.some(s => s.status !== 'online');
  const globalColor = hasIssues ? "border-l-orange-500" : "border-l-green-500";

  return (
    <Card className={cn("shadow-sm border-l-4 transition-colors duration-500", globalColor)}>
        <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> 
                Estado de los Servicios
                {hasIssues && <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse ml-auto"></span>}
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
            {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between group">
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{service.name}</span>
                    <StatusBadge status={service.status} />
                </div>
            ))}
            <div className="text-[10px] text-center text-muted-foreground pt-2 border-t mt-2 flex items-center justify-center gap-1">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Sistema en vivo
            </div>
        </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
    const config = {
        online: { icon: CheckCircle2, text: "Operativo", color: "text-green-600 bg-green-50 border-green-200" },
        issues: { icon: AlertTriangle, text: "Intermitente", color: "text-orange-600 bg-orange-50 border-orange-200" },
        maintenance: { icon: AlertOctagon, text: "Mantenimiento", color: "text-blue-600 bg-blue-50 border-blue-200" }
    }[status] || { icon: RefreshCcw, text: "Desconocido", color: "text-gray-500" };

    const Icon = config.icon as any;

    return (
        <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide transition-all", config.color)}>
            <Icon className="w-3 h-3" />
            {config.text}
        </div>
    );
};