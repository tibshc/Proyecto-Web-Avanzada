import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Todos los campos son obligatorios');
      return;
    }
    
    try {
      const res = await api.post('/auth/login', formData);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error de credenciales');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Iniciar Sesión</h2>
          <p>Ingresa tus credenciales para continuar</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" name="password" className="form-control" value={formData.password} onChange={handleChange} placeholder="********" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>¿Olvidaste tu contraseña?</Link>
          </div>
          <button type="submit" className="btn btn-primary btn-block">Entrar</button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
