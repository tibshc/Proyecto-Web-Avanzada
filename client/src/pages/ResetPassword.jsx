import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    newPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!formData.token || !formData.newPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: formData.token,
        newPassword: formData.newPassword
      });
      setMessage(res.data.message);
      setFormData({ token: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Restablecer Contraseña</h2>
          <p>Ingresa el token de recuperación y tu nueva contraseña</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Token de Recuperación</label>
            <input
              type="text"
              name="token"
              className="form-control"
              value={formData.token}
              onChange={handleChange}
              placeholder="Pega aquí el token recibido"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nueva Contraseña</label>
            <input
              type="password"
              name="newPassword"
              className="form-control"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Procesando...' : 'Restablecer Contraseña'}
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            ¿No tienes token? <Link to="/forgot-password">Solicitar uno</Link>
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            <Link to="/login">Regresar al inicio de sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;