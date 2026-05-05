// src/services/socket.ts
import io from 'socket.io-client';

const SERVER_URL = 'https://rescuelink-backend-j0gz.onrender.com';

const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('🔴 Socket connection error:', error.message);
});

export default socket;