import io from 'socket.io-client';

const SERVER_URL = 'https://rescuelink-backend-j0gz.onrender.com';

const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
});

socket.on('connect', () => {
  console.log('✅ CONNECTED TO LIVE SERVER:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('❌ CONNECTION ERROR:', err.message);
});

export default socket;