import { io } from 'socket.io-client';

const SOCKET_URL = 'https://digitalpassbackend.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false, // Don't connect until we have the token
});

let currentToken = null;

socket.on('connect', () => {
  console.log('Socket connected, joining room...');
  if (currentToken) {
    socket.emit('joinRoom', currentToken);
  }
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

export const connectSocket = (token) => {
  currentToken = token;
  if (!socket.connected) {
    socket.connect();
  } else {
    // If already connected, join the room immediately with the new token
    socket.emit('joinRoom', token);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
