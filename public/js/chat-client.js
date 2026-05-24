// Conectar al servidor de Socket.IO
const socket = io();

// Elementos de la interfaz
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const userName = document.getElementById('user-name').value;
const userRole = document.getElementById('user-role').value;

// Auto-scroll al final del contenedor de mensajes
const scrollToBottom = () => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Ejecutar auto-scroll inicial al cargar la página
scrollToBottom();

// Enviar un mensaje
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const messageText = messageInput.value.trim();
  if (!messageText) return;

  const messageData = {
    sender: userName,
    role: userRole,
    text: messageText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  // Emitir evento al servidor
  socket.emit('chatMessage', messageData);

  // Limpiar input y enfocar
  messageInput.value = '';
  messageInput.focus();
});

// Escuchar mensajes entrantes del servidor
socket.on('message', (message) => {
  displayMessage(message);
  scrollToBottom();
});

// Renderizar mensaje en la pantalla
const displayMessage = (message) => {
  const div = document.createElement('div');
  div.classList.add('message-bubble');
  
  // Determinar si el mensaje es enviado por el propio usuario actual
  if (message.sender === userName) {
    div.classList.add('message-outgoing');
  } else {
    div.classList.add('message-incoming');
  }

  // Traducción visual del rol
  const roleLabel = message.role === 'support' ? 'Soporte' : 'Mecánico';

  div.innerHTML = `
    <div class="message-meta">
      <span class="message-sender">${message.sender} (${roleLabel})</span>
    </div>
    <div class="message-text">${escapeHTML(message.text)}</div>
    <div class="message-time">${message.timestamp}</div>
  `;

  chatMessages.appendChild(div);
};

// Función de escape básica para evitar ataques XSS en tiempo real
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
