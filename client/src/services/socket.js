import { io } from 'socket.io-client';

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    path: '/api/chat/socket.io',
    auth: { token },
    query: { token }
  });

  return socket;
};
