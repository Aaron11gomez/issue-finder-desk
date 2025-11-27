import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom'; // Necesario para redirigir

interface SoundContextType {
  playNewTicketSound: () => void;
  playNotificationSound: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate(); // Hook para navegación
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('nexus-sound-muted');
    return saved ? JSON.parse(saved) : false;
  });

  const ticketAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ticketAudioRef.current = new Audio('/sounds/new-ticket.mp3');
    messageAudioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  const toggleMute = () => {
    setIsMuted((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem('nexus-sound-muted', JSON.stringify(newState));
      return newState;
    });
  };

  const playNewTicketSound = () => { if (!isMuted && ticketAudioRef.current) ticketAudioRef.current.play().catch(console.error); };
  const playNotificationSound = () => { if (!isMuted && messageAudioRef.current) messageAudioRef.current.play().catch(console.error); };

  // --- LÓGICA DE NOTIFICACIONES INTELIGENTES ---
  useEffect(() => {
    if (!user) return;

    // 1. NUEVOS TICKETS (Solo Técnicos)
    const ticketChannel = supabase.channel('global-tickets-smart')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, 
      (payload) => {
          if (role === 'technician' && payload.new.created_by !== user.id) {
            playNewTicketSound();
            toast.info(`Nuevo Ticket #${payload.new.ticket_number}`, {
                description: payload.new.title,
                action: {
                    label: 'Ver',
                    onClick: () => navigate(`/ticket/${payload.new.id}`)
                },
                duration: 5000,
            });
          }
      })
      .subscribe();

    // 2. NUEVOS MENSAJES (Para Todos)
    const commentChannel = supabase.channel('global-comments-smart')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, 
      async (payload) => {
          const newComment = payload.new;
          if (newComment.user_id === user.id) return; // Ignorar mis propios mensajes

          // Obtener datos del ticket para la notificación
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('id, ticket_number, title, created_by, assigned_to')
            .eq('id', newComment.ticket_id)
            .single();

          if (!ticketData) return;

          // Lógica de a quién notificar
          const isRelevant = 
             (role === 'technician') || // El técnico siempre quiere saber (o puedes filtrar por assigned_to)
             (role === 'client' && ticketData.created_by === user.id) || // El cliente solo sus tickets
             (role === 'admin'); // El admin supervisa

          if (isRelevant) {
             playNotificationSound();
             // Previsualización del mensaje
             const preview = newComment.content.includes('audio/') ? '🎤 Nota de voz' : 
                             newComment.content.includes('image/') ? '📷 Imagen adjunta' : 
                             newComment.content.substring(0, 50) + (newComment.content.length > 50 ? '...' : '');

             toast.message(`Mensaje en Ticket #${ticketData.ticket_number}`, {
                 description: preview,
                 action: {
                     label: 'Responder',
                     onClick: () => navigate(`/ticket/${ticketData.id}`)
                 }
             });
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(commentChannel);
    };
  }, [user, role, isMuted, navigate]);

  return (
    <SoundContext.Provider value={{ playNewTicketSound, playNotificationSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) throw new Error('useSound must be used within a SoundProvider');
  return context;
};