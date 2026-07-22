import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, MessageSquare, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
            <Link to="/chat" className="nav-link"><MessageSquare size={16} style={{marginRight: '5px'}}/>Soporte Chat</Link>
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
    </nav>
  );
};

export default Navbar;
