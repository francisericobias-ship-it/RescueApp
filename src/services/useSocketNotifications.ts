import { useEffect } from 'react';
import socket from './networkService'; // adjust if needed
import { addHistoryEvent } from './historyStorage';

export const useSocketNotifications = (currentUserId: number) => {
  useEffect(() => {
    const handler = async (data: any) => {
      if (data.user_id === currentUserId) {
        await addHistoryEvent({
          id: Date.now().toString(),
          type: "ADMIN_ACCEPTED",
          description: "Responder has been assigned 🚑",
          timestamp: Date.now(),
        });
      }
    };

    socket.on("alert:assigned", handler);

    return () => {
      socket.off("alert:assigned", handler);
    };
  }, [currentUserId]);
};