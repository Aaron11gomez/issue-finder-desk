/* src/components/dashboards/AdminDashboard.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UpdateStatusDialog } from '@/components/UpdateStatusDialog'; // <--- IMPORTANTE

interface TicketStats {
  open: number;
  in_progress: number;
  closed: number;
  total: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<TicketStats>({ open: 0, in_progress: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const channel = supabase.channel('admin-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.from('tickets').select('status');
      if (error) throw error;
      const newStats = {
        open: data?.filter(t => t.status === 'open').length || 0,
        in_progress: data?.filter(t => t.status === 'in_progress').length || 0,
        closed: data?.filter(t => t.status === 'closed').length || 0,
        total: data?.length || 0
      };
      setStats(newStats);
    } catch (error) { console.error('Error stats:', error); } finally { setLoading(false); }
  };

  const chartData = [
    { name: 'Pendientes', value: stats.open, color: '#3b82f6' },    
    { name: 'En Proceso', value: stats.in_progress, color: '#f97316' }, 
    { name: 'Finalizados', value: stats.closed, color: '#22c55e' },   
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER CON BOTÓN DE GESTIÓN DE ESTADO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Vista General</h1>
            <p className="text-muted-foreground mt-1">Métricas clave del rendimiento del sistema.</p>
        </div>
        {/* BOTÓN NUEVO */}
        <UpdateStatusDialog />
      </div>

      {/* Tarjetas de Métricas con Identidad Visual */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Totales</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Volumen histórico</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Asignar</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">Técnicos trabajando</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.closed}</div>
            <p className="text-xs text-muted-foreground">Soluciones entregadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Detalles */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary"/> Balance de Carga</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100"><Users className="w-5 h-5"/> Actividad Reciente</CardTitle>
            <CardDescription>Últimos movimientos del sistema.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center justify-center h-48 text-blue-400/60 italic text-sm border-2 border-dashed border-blue-200 rounded-lg">
                Próximamente: Feed de actividad en vivo
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;