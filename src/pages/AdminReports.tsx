/* aaron11gomez/issue-finder-desk/issue-finder-desk-master/src/pages/AdminReports.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, FileDown, CalendarCheck, User } from 'lucide-react';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClosedTicket {
  id: string;
  ticket_number: number;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  updated_at: string; 
  assigned_to: string | null;
  category_id: string | null;
  technician_name?: string;
  category_name?: string;
}

interface Technician { id: string; full_name: string; }
interface Category { id: string; name: string; }

const AdminReports = () => {
  const [tickets, setTickets] = useState<ClosedTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ClosedTicket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (role === 'admin') fetchData(); else navigate('/dashboard'); }, [role]);

  useEffect(() => {
    let result = [...tickets];
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            // BÚSQUEDA POR NÚMERO
            t.ticket_number?.toString().includes(lower)
        );
    }
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    if (techFilter !== 'all') result = result.filter(t => t.assigned_to === techFilter);
    if (catFilter !== 'all') result = result.filter(t => t.category_id === catFilter);
    setFilteredTickets(result);
  }, [tickets, searchTerm, priorityFilter, techFilter, catFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: ticketsData, error: ticketsError } = await supabase.from('tickets').select('*').eq('status', 'closed').order('updated_at', { ascending: false });
      if (ticketsError) throw ticketsError;
      const { data: techData } = await supabase.from('user_roles').select('user_id').eq('role', 'technician');
      const techIds = techData?.map(t => t.user_id) || [];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', techIds);
      setTechnicians(profilesData as Technician[] || []);
      const { data: catData } = await supabase.from('service_categories').select('id, name');
      setCategories(catData as Category[] || []);
      const techMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);
      const catMap = new Map(catData?.map(c => [c.id, c.name]) || []);
      const enrichedTickets = ticketsData.map(t => ({
          ...t,
          technician_name: t.assigned_to ? (techMap.get(t.assigned_to) || 'Desconocido') : 'Sin Asignar',
          category_name: t.category_id ? (catMap.get(t.category_id) || 'General') : 'General'
      }));
      setTickets(enrichedTickets as any);
      setFilteredTickets(enrichedTickets as any);
    } catch (error: any) { toast.error('Error cargando datos: ' + error.message); } finally { setLoading(false); }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Tickets Cerrados', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy")}`, 14, 30);
    const tableColumn = ["ID", "Asunto", "Técnico", "Categoría", "Prioridad", "Fecha"];
    const tableRows: any[] = [];
    filteredTickets.forEach(ticket => {
      const ticketData = [
        // SOLO NÚMEROS EN PDF
        ticket.ticket_number?.toString().padStart(5, '0'),
        ticket.title,
        ticket.technician_name,
        ticket.category_name,
        ticket.priority.toUpperCase(),
        format(new Date(ticket.updated_at), "dd/MM/yyyy")
      ];
      tableRows.push(ticketData);
    });
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 45, theme: 'grid' });
    doc.save(`Reporte_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success('PDF generado');
  };

  if (loading) return <Layout><div>Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div><h1 className="text-3xl font-bold flex items-center gap-2"><CalendarCheck className="h-8 w-8 text-primary" /> Historial de Soluciones</h1><p className="text-muted-foreground mt-1">Auditoría de tickets cerrados.</p></div>
          <Button onClick={generatePDF} className="bg-red-600 hover:bg-red-700 text-white shadow-md"><FileDown className="mr-2 h-4 w-4" /> Exportar PDF</Button>
        </div>
        <Card><CardContent className="p-4"><div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Select value={techFilter} onValueChange={setTechFilter}><SelectTrigger><User className="h-4 w-4 mr-2" /><SelectValue placeholder="Técnico" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{technicians.map(t => (<SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>))}</SelectContent></Select>
            <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="low">Baja</SelectItem></SelectContent></Select>
        </div></CardContent></Card>
        <Card className="border-t-4 border-t-primary"><CardHeader className="pb-2"><CardTitle>Registros ({filteredTickets.length})</CardTitle></CardHeader><CardContent><div className="rounded-md border"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>ID</TableHead><TableHead>Asunto</TableHead><TableHead>Resuelto por</TableHead><TableHead>Categoría</TableHead><TableHead>Prioridad</TableHead><TableHead className="text-right">Fecha</TableHead></TableRow></TableHeader><TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/ticket/${ticket.id}`)}>
                {/* SOLO NÚMEROS */}
                <TableCell className="font-mono text-xs font-bold text-muted-foreground">#{ticket.ticket_number?.toString().padStart(5, '0')}</TableCell>
                <TableCell className="font-medium">{ticket.title}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{ticket.technician_name?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm">{ticket.technician_name}</span></div></TableCell>
                <TableCell><Badge variant="outline">{ticket.category_name}</Badge></TableCell>
                <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(ticket.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
              </TableRow>
            ))}
        </TableBody></Table></div></CardContent></Card>
      </div>
    </Layout>
  );
};

export default AdminReports;