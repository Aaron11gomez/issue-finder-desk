import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceContextType {
  onlineUsers: Set<string>; // Set de IDs de usuarios online
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // Unirse al canal global de presencia 'online-users'
    const room = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState();
        const users = new Set<string>();
        
        // Recopilar todos los IDs de usuarios presentes
        for (const key in newState) {
          users.add(key);
        }
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Usuario conectado:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Usuario desconectado:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await room.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(room);

    return () => {
      supabase.removeChannel(room);
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};