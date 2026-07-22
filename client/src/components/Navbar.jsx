import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Bell, LogOut, MessageSquare, LayoutDashboard, ShoppingCart, X } from 'lucide-react';
import { connectSocket } from '../services/socket';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotification(null);
      setUnread(0);
      return undefined;
    }

    const socket = connectSocket();
    if (!socket) return undefined;

    const handleNotification = (data) => {
      setNotification(data);
      if (location.pathname !== '/chat') setUnread((count) => count + 1);
    };

    socket.on('chat_notification', handleNotification);
    return () => {
      socket.off('chat_notification', handleNotification);
      socket.disconnect();
    };
  }, [user, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/chat') setUnread(0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">⚙️</span>
        Micro<span>App</span>
      </Link>
      <div className="navbar-nav">
        {user ? (
          <>
            <span className="user-tag">{user.name || user.email}</span>
            <Link to="/" className="nav-link"><LayoutDashboard size={16} style={{marginRight: '5px'}}/>Dashboard</Link>
            <Link to="/chat" className="nav-link notification-link" onClick={() => setUnread(0)}>
              <MessageSquare size={16} style={{marginRight: '5px'}}/>Soporte Chat
              {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link to="/cart" className="nav-link"><ShoppingCart size={16} style={{marginRight: '5px'}}/>Carrito</Link>
            <button className="btn btn-secondary" onClick={handleLogout}>
              <LogOut size={16} style={{marginRight: '5px'}}/> Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Iniciar Sesión</Link>
            <Link to="/register" className="btn btn-primary">Registrarse</Link>
          </>
        )}
      </div>
      {notification && (
        <div className="support-toast" role="status">
          <Bell size={18} />
          <div>
            <strong>Nuevo mensaje de soporte</strong>
            <span>{notification.sender}: {notification.preview}</span>
          </div>
          <button type="button" className="toast-close" aria-label="Cerrar notificacion" onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
