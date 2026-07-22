import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    try {
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Crear Cuenta</h2>
          <p>Unete al sistema de gestion de repuestos</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Correo Electronico</label>
            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Contrasena</label>
            <input type="password" name="password" className="form-control" value={formData.password} onChange={handleChange} placeholder="********" />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Registrarse</button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Ya tienes cuenta? <Link to="/login">Inicia Sesion</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
