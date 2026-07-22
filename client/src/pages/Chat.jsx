import React, { useContext, useEffect, useRef, useState } from 'react';
import { Send, ShieldCheck, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { connectSocket } from '../services/socket';

const roleLabels = { mechanic: 'Mecanico', support: 'Soporte', admin: 'Admin' };

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [messagesByChannel, setMessagesByChannel] = useState({ support: [], admin: [] });
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState('support');
  const messagesEndRef = useRef(null);

  const canUseAdminChannel = user?.role === 'support' || user?.role === 'admin';
  const messages = messagesByChannel[channel] || [];

  useEffect(() => {
    const newSocket = connectSocket();
    setSocket(newSocket);
    if (!newSocket) return undefined;
    const handleMessage = (message) => {
      const messageChannel = message.channel || 'support';
      setMessagesByChannel((previous) => ({ ...previous, [messageChannel]: [...(previous[messageChannel] || []), message] }));
    };
    const requestHistory = () => newSocket.emit('chat_history_request', { channel });
    const handleHistory = (history) => setMessagesByChannel((previous) => ({ ...previous, [channel]: history || [] }));
    newSocket.on('message', handleMessage);
    newSocket.on('chat_history', handleHistory);
    newSocket.on('connect', requestHistory);
    if (newSocket.connected) requestHistory();
    return () => {
      newSocket.off('message', handleMessage);
      newSocket.off('chat_history', handleHistory);
      newSocket.off('connect', requestHistory);
      newSocket.disconnect();
    };
  }, [channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!input.trim() || !socket || !user) return;
    socket.emit('chat_message', { text: input, channel }, (result) => {
      if (result?.ok) setInput('');
    });
  };

  return (
    <main className="main-content">
      <div className="chat-container">
        <div className="chat-header">
          <div>
            <p className="eyebrow">COMUNICACION INTERNA</p>
            <h3>{channel === 'admin' ? 'Soporte - Administracion' : 'Canal de Soporte'}</h3>
          </div>
          <div className="chat-status"><div className="status-dot" /> Conexion activa</div>
        </div>

        <div className="chat-toolbar">
          <div className="channel-icon">{channel === 'admin' ? <ShieldCheck size={17} /> : <Users size={17} />}</div>
          <div><strong>{channel === 'admin' ? 'Canal privado de soporte' : 'Soporte general'}</strong><span>{channel === 'admin' ? 'Disponible para soporte y administradores' : 'Consultas de usuarios y equipo de soporte'}</span></div>
          {canUseAdminChannel && <select className="form-control channel-select" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="support">Soporte general</option><option value="admin">Soporte - Admin</option></select>}
        </div>

        <div className="chat-messages">
          <div className="message-bubble message-incoming"><div className="message-meta"><span>Sistema de Soporte</span></div>{channel === 'admin' ? 'Este canal conecta al equipo de soporte con administracion.' : <>Hola <strong>{user?.name}</strong>. Escribe tus dudas sobre dimensiones, torques, stock o compatibilidad.</>}</div>
          {messages.map((message, index) => {
            const isSelf = message.sender === user?.name;
            return <div key={`${message.timestamp}-${index}`} className={`message-bubble ${isSelf ? 'message-outgoing' : 'message-incoming'}`}><div className="message-meta"><span>{message.sender} ({roleLabels[message.role] || message.role})</span></div>{message.text}<div className="message-time">{message.timestamp}</div></div>;
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer"><form className="chat-form" onSubmit={sendMessage}><input type="text" className="form-control" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escribe tu mensaje..." /><button type="submit" className="btn btn-primary"><Send size={18} /> Enviar</button></form></div>
      </div>
    </main>
  );
};

export default Chat;
