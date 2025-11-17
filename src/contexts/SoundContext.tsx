/* src/contexts/SoundContext.tsx */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SoundContextType {
  playNewTicketSound: () => void;
  playNotificationSound: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role } = useAuth();
  // Estado para el silencio (guardado en localStorage para persistencia)
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('nexus-sound-muted');
    return saved ? JSON.parse(saved) : false;
  });

  // Referencias a los objetos de audio para no recrearlos constantemente
  const ticketAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Asegúrate de tener estos archivos en public/sounds/
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

  const playNewTicketSound = () => {
    if (!isMuted && ticketAudioRef.current) {
      ticketAudioRef.current.currentTime = 0;
      ticketAudioRef.current.play().catch(e => console.log("Interacción requerida para reproducir audio", e));
    }
  };

  const playNotificationSound = () => {
    if (!isMuted && messageAudioRef.current) {
      messageAudioRef.current.currentTime = 0;
      messageAudioRef.current.play().catch(e => console.log("Interacción requerida para reproducir audio", e));
    }
  };

  // Lógica de Realtime
  useEffect(() => {
    if (!user) return;

    // Canal para escuchar NUEVOS TICKETS
    const ticketChannel = supabase
      .channel('global-tickets-sound')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          // Solo Admins y Técnicos escuchan cuando se crea un ticket
          if (role === 'admin' || role === 'technician') {
            // Evitar notificar si el técnico mismo creó el ticket
            if (payload.new.created_by !== user.id) {
              playNewTicketSound();
              toast.info("¡Nuevo ticket recibido!");
            }
          }
        }
      )
      .subscribe();

    // Canal para escuchar NUEVOS COMENTARIOS
    const commentChannel = supabase
      .channel('global-comments-sound')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const newComment = payload.new;

          // 1. Si yo escribí el comentario, no sonar
          if (newComment.user_id === user.id) return;

          // 2. Lógica según rol
          if (role === 'admin' || role === 'technician') {
            // --- CORRECCIÓN: Eliminada la validación redundante de 'client' ---
            // Los técnicos y admins escuchan todo lo que no sea suyo.
            
            playNotificationSound();
            toast("Nuevo comentario en un ticket");
          } 
          else if (role === 'client') {
            // Si soy cliente, debo verificar si el comentario es para uno de mis tickets
            if (newComment.is_internal) return; // Clientes no escuchan notas internas

            const { data } = await supabase
              .from('tickets')
              .select('created_by')
              .eq('id', newComment.ticket_id)
              .single();

            if (data && data.created_by === user.id) {
              playNotificationSound();
              toast("Nueva respuesta en tu ticket");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(commentChannel);
    };
  }, [user, role, isMuted]);

  return (
    <SoundContext.Provider value={{ playNewTicketSound, playNotificationSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};