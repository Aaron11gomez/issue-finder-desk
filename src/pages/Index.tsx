import { useState } from 'react';
import { mockTickets } from '@/data/mockTickets';
import { Ticket } from '@/types/ticket';
import { TicketCard } from '@/components/TicketCard';
import { Input } from '@/components/ui/input';
import { Search, Ticket as TicketIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleClaim = (ticketId: string) => {
    setTickets(tickets.filter(t => t.id !== ticketId));
    toast({
      title: 'Ticket claimed',
      description: `You've successfully claimed ticket ${ticketId}`,
    });
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TicketIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Helpdesk Portal</h1>
                <p className="text-sm text-muted-foreground">Technician Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats & Search */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Unassigned Tickets</h2>
              <p className="text-muted-foreground">
                {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'} waiting for assignment
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Priority Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
              const count = filteredTickets.filter(t => t.priority === priority).length;
              return (
                <div key={priority} className="bg-card border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground capitalize mb-1">{priority}</div>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Grid */}
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 bg-muted rounded-full mb-4">
              <TicketIcon className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No tickets found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search query' : 'All tickets have been assigned'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onClaim={handleClaim} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
