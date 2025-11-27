/* src/pages/MyAssignedTickets.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, ArrowUpDown, Clock, CheckCircle2, 
  PlayCircle, History, MoreHorizontal, ArrowRight, 
  Briefcase, ChevronDown, ChevronUp, RefreshCcw
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  created_by: string;
  creator_name?: string;
}

const priorityConfig = {
  critical: { color: "text-red-700 bg-red-50 border-red-200 ring-red-200/50", label: "Crítica" },
  high: { color: "text-orange-700 bg-orange-50 border-orange-200 ring-orange-200/50", label: "Alta" },
  medium: { color: "text-yellow-700 bg-yellow-50 border-yellow-200 ring-yellow-200/50", label: "Media" },
  low: { color: "text-blue-700 bg-blue-50 border-blue-200 ring-blue-200/50", label: "Baja" },
};

const ITEMS_PER_PAGE = 8;

const MyAssignedTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchMyAssignedTickets();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
    
    let result = [...tickets];

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.title.toLowerCase().includes(lower) || 
            (t.description && t.description.toLowerCase().includes(lower)) ||
            t.ticket_number?.toString().includes(lower)
        );
    }

    if (priorityFilter !== 'all') {
        result = result.filter(t => t.priority === priorityFilter);
    }

    result.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setActiveTickets(result.filter(t => t.status === 'in_progress'));
    setClosedTickets(result.filter(t => t.status === 'closed'));

  }, [tickets, searchTerm, priorityFilter, sortOrder]);

  const fetchMyAssignedTickets = async () => {
    if (!user) return;
    try {
      setIsRefreshing(true);
      if (tickets.length === 0) setLoading(true);
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('assigned_to', user.id)
        .in('status', ['in_progress', 'closed']) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let dataTickets = data as Ticket[] || [];

      if (dataTickets.length > 0) {
        const userIds = [...new Set(dataTickets.map(t => t.created_by))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const namesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        dataTickets = dataTickets.map(t => ({
            ...t,
            creator_name: namesMap.get(t.created_by) || 'Usuario'
        }));
      }
      
      setTickets(dataTickets);
    } catch (error: any) {
      toast.error('No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const quickClose = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
        toast.success("Ticket cerrado exitosamente");
        fetchMyAssignedTickets();
    } catch (error) {
        toast.error("Error al cerrar el ticket");
    }
  };

  const totalPages = Math.ceil(activeTickets.length / ITEMS_PER_PAGE);
  const paginatedActiveTickets = activeTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
        
        {/* --- HEADER & METRICS --- */}
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        Mi Espacio de Trabajo
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4" /> Gestiona tus asignaciones y tiempos de respuesta.
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <StatsCard 
                        icon={PlayCircle} 
                        label="Activos" 
                        value={activeTickets.length} 
                        color="blue"
                        loading={loading}
                    />
                    <StatsCard 
                        icon={CheckCircle2} 
                        label="Cerrados" 
                        value={closedTickets.length} 
                        color="green"
                        loading={loading}
                    />
                </div>
            </div>

            {/* --- TOOLBAR --- */}
            <div className="flex flex-col sm:flex-row gap-3 bg-background border p-1.5 rounded-xl shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filtrar por ID, asunto o descripción..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 border-none shadow-none focus-visible:ring-0 bg-transparent" 
                    />
                </div>
                <div className="flex gap-2 items-center px-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={fetchMyAssignedTickets}
                        className={cn("h-9 w-9 text-muted-foreground hover:text-primary", isRefreshing && "animate-spin")}
                        title="Actualizar lista"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </Button>
                    <div className="h-6 w-px bg-border hidden sm:block"></div>
                    <FilterSelect 
                        value={priorityFilter} 
                        onChange={setPriorityFilter} 
                        icon={Filter} 
                        options={[
                            {value: 'all', label: 'Todas'},
                            {value: 'critical', label: 'Crítica'},
                            {value: 'high', label: 'Alta'},
                            {value: 'medium', label: 'Media'},
                            {value: 'low', label: 'Baja'},
                        ]}
                    />
                    <FilterSelect 
                        value={sortOrder} 
                        onChange={(v: any) => setSortOrder(v)} 
                        icon={ArrowUpDown} 
                        options={[
                            {value: 'newest', label: 'Recientes'},
                            {value: 'oldest', label: 'Antiguos'},
                        ]}
                    />
                </div>
            </div>
        </div>

        {/* --- ACTIVE TICKETS --- */}
        <div className="space-y-2">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-border/50">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    En Progreso ({activeTickets.length})
                </h2>
                {!loading && activeTickets.length > 0 && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, activeTickets.length)} de {activeTickets.length}
                    </span>
                )}
            </div>
            
            {/* --- CORRECCIÓN: Grid de Encabezados EXACTAMENTE alineado con las filas --- */}
            <div className="hidden md:grid grid-cols-[140px_minmax(200px,1fr)_150px_140px] gap-4 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-full items-center">
                <div className="pl-2">Ticket / Prioridad</div>
                <div className="pl-2">Asunto</div>
                <div className="text-right pr-2">Solicitante</div>
                <div className="text-right pr-10">Actividad</div>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <TicketSkeleton key={i} />)}
                </div>
            ) : activeTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
                    <div className="bg-muted p-4 rounded-full mb-3">
                        <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Bandeja limpia</h3>
                    <p className="text-sm text-muted-foreground mt-1">No tienes tickets pendientes. ¡Buen trabajo!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {paginatedActiveTickets.map((ticket) => (
                        <TicketRowItem 
                            key={ticket.id} 
                            ticket={ticket} 
                            navigate={navigate} 
                            onQuickClose={quickClose}
                        />
                    ))}
                </div>
            )}

            {/* Paginación */}
            {!loading && totalPages > 1 && (
                <div className="py-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            
                            {[...Array(totalPages)].map((_, i) => (
                                <PaginationItem key={i}>
                                    <PaginationLink 
                                        href="#" 
                                        isActive={currentPage === i + 1}
                                        onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                                    >
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>

        {/* --- HISTORIAL (COLLAPSIBLE) --- */}
        {!loading && closedTickets.length > 0 && (
            <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="space-y-2 pt-6">
                <div className="flex items-center justify-between px-1">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-0 hover:bg-transparent group">
                            {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 group-hover:text-primary transition-colors">
                                <History className="w-3.5 h-3.5" /> 
                                Historial Cerrado ({closedTickets.length})
                            </h2>
                        </Button>
                    </CollapsibleTrigger>
                    <div className="h-px flex-1 bg-border/50 ml-4"></div>
                </div>
                
                <CollapsibleContent className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    {closedTickets.slice(0, 5).map((ticket) => (
                        <TicketRowItem 
                            key={ticket.id} 
                            ticket={ticket} 
                            navigate={navigate} 
                            isClosed 
                        />
                    ))}
                    {closedTickets.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground pt-2 italic">Mostrando los últimos 5 cerrados</p>
                    )}
                </CollapsibleContent>
            </Collapsible>
        )}
      </div>
    </Layout>
  );
};

// --- COMPONENTES AUXILIARES ---

const StatsCard = ({ icon: Icon, label, value, color, loading }: any) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
        green: "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900"
    };
    
    return (
        <div className={cn("border rounded-lg px-4 py-2 flex items-center gap-3 min-w-[140px] transition-all hover:shadow-sm", colors[color])}>
            <div className="p-1.5 bg-background/60 rounded-full backdrop-blur-sm">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-[10px] opacity-80 font-medium uppercase tracking-wider">{label}</p>
                {loading ? <Skeleton className="h-6 w-8 mt-1" /> : <p className="text-xl font-bold leading-none">{value}</p>}
            </div>
        </div>
    );
};

const FilterSelect = ({ value, onChange, icon: Icon, options }: any) => (
    <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0 h-9 gap-2 bg-muted/50 hover:bg-muted transition-colors text-xs font-medium">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <SelectValue />
        </SelectTrigger>
        <SelectContent>
            {options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const TicketSkeleton = () => (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <Skeleton className="h-5 w-24" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
    </div>
);

// --- TICKET ROW ITEM (CORREGIDO) ---
const TicketRowItem = ({ ticket, navigate, isClosed = false, onQuickClose }: { ticket: Ticket, navigate: any, isClosed?: boolean, onQuickClose?: any }) => {
    const pConfig = priorityConfig[ticket.priority];
    
    return (
        <div 
            onClick={() => navigate(`/ticket/${ticket.id}`)}
            className={cn(
                // --- CORRECCIÓN: Grid definido explícitamente y coincidente con el Header ---
                "group relative grid grid-cols-1 md:grid-cols-[140px_minmax(200px,1fr)_150px_140px] gap-4 p-4 rounded-lg border bg-card transition-all duration-200 cursor-pointer overflow-hidden items-center",
                isClosed ? "opacity-75 bg-muted/20 hover:opacity-100 hover:bg-card border-transparent hover:border-border" : "hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            )}
        >
            {/* Indicador lateral de color */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] transition-colors", 
                isClosed ? "bg-muted-foreground/30" : 
                ticket.priority === 'critical' ? "bg-red-500" : 
                ticket.priority === 'high' ? "bg-orange-500" : "bg-blue-500"
            )} />

            {/* COL 1: ID & Prioridad */}
            <div className="flex items-center gap-2 pl-2">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                    #{ticket.ticket_number?.toString().padStart(5, '0')}
                </span>
                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border font-medium shadow-sm", pConfig.color)}>
                    {pConfig.label}
                </Badge>
            </div>

            {/* COL 2: Título y Descripción */}
            <div className="min-w-0 pl-2 md:pl-0">
                <h3 className={cn("font-medium text-sm truncate group-hover:text-primary transition-colors", isClosed && "text-muted-foreground line-through decoration-border")}>
                    {ticket.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5 font-normal">
                    {ticket.description}
                </p>
            </div>

            {/* COL 3: Usuario (Alineación corregida a la derecha) */}
            <div className="flex items-center justify-end gap-3 pl-2 md:pl-0">
                <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px] hidden sm:block text-right">
                    {ticket.creator_name}
                </span>
                <Avatar className="h-7 w-7 border border-background ring-1 ring-border shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/5 text-primary font-bold">
                        {ticket.creator_name?.substring(0,2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* COL 4: Tiempo y Acciones */}
            <div className="flex items-center justify-end gap-2 pl-2 md:pl-0 relative">
                {/* "Actividad" (Tiempo) */}
                <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full md:bg-transparent md:p-0 min-w-[90px] shrink-0">
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                    <span className="whitespace-nowrap font-medium">
                        {formatDistanceToNow(new Date(ticket.created_at), { locale: es })}
                    </span>
                </div>

                {/* Acciones flotantes (Se muestran sobre el tiempo en hover o al lado) */}
                <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 pl-2 backdrop-blur-sm rounded-l-lg shadow-sm">
                    {!isClosed && onQuickClose && (
                        <Button 
                            variant="ghost" size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full" 
                            onClick={(e) => onQuickClose(ticket.id, e)} 
                            title="Marcar como resuelto"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                        </Button>
                    )}
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-full" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => navigate(`/ticket/${ticket.id}`)}>
                                <ArrowRight className="w-4 h-4 mr-2" /> Ver detalles
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

export default MyAssignedTickets;