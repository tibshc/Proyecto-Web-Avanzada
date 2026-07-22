import React, { useState, useEffect, useRef, useContext } from 'react';
import { connectSocket } from '../services/socket';
import { AuthContext } from '../context/AuthContext';
import { Send } from 'lucide-react';

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const newSocket = connectSocket();
    setSocket(newSocket);

    if (newSocket) {
      newSocket.on('message', (msgData) => {
        setMessages((prev) => [...prev, msgData]);
      });
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && socket && user) {
      const msgData = {
        sender: user.name,
        role: user.role,
        text: input,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      socket.emit('chat_message', msgData);
      setInput('');
    }
  };

  const getRoleLabel = (role) => {
    return role === 'support' ? 'Soporte' : (role === 'admin' ? 'Admin' : 'Mecánico');
  };

  return (
    <div className="main-content">
      <div className="chat-container">
        <div className="chat-header">
          <h3>Canal de Soporte en Vivo</h3>
          <div className="chat-status">
            <div className="status-dot"></div>
            Conexión Activa
          </div>
        </div>
        
        <div className="chat-messages">
          <div className="message-bubble message-incoming">
            <div className="message-meta">
              <span>Sistema de Soporte</span>
            </div>
            ¡Hola <strong>{user?.name}</strong>! Has ingresado al chat de soporte en vivo. Escribe tus dudas acerca de dimensiones, torques, stock o compatibilidad de repuestos para que un especialista técnico te confirme.
          </div>

          {messages.map((msg, idx) => {
            const isSelf = msg.sender === user?.name;
            return (
              <div key={idx} className={`message-bubble ${isSelf ? 'message-outgoing' : 'message-incoming'}`}>
                <div className="message-meta">
                  <span>{msg.sender} ({getRoleLabel(msg.role)})</span>
                </div>
                {msg.text}
                <div className="message-time">{msg.timestamp}</div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <form className="chat-form" onSubmit={sendMessage}>
            <input 
              type="text" 
              className="form-control"
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Escribe tu consulta de compatibilidad..." 
            />
            <button type="submit" className="btn btn-primary">
              <Send size={18} style={{marginRight: '5px'}}/> Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
