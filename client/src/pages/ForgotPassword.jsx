import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setToken('');

    if (!email) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      // En desarrollo, mostramos el token para poder probar
      if (res.data.resetToken) {
        setToken(res.data.resetToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al solicitar restablecimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Recuperar Acceso</h2>
          <p>Solicita un enlace para restablecer tu contraseña</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        {token && (
          <div className="alert alert-info" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
            <strong>🔑 Token de prueba (modo desarrollo):</strong><br />
            {token}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico Registrado</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="su.correo@empresa.com"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            ¿Ya tienes un token? <Link to="/reset-password">Restablece tu contraseña</Link>
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            <Link to="/login">Regresar al inicio de sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;