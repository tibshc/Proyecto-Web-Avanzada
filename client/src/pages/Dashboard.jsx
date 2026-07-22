import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [parts, setParts] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', stock: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchParts = async () => {
    try {
      const res = await api.get('/api/inventory');
      setParts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Validación para precio (solo números y un punto)
    if (name === 'price') {
      if (!/^\d*\.?\d*$/.test(value) && value !== '') return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock) {
      setError('Nombre, Precio y Stock son obligatorios');
      return;
    }
    
    try {
      if (editingId) {
        await api.put(`/api/inventory/${editingId}`, formData);
      } else {
        await api.post('/api/inventory', formData);
      }
      setFormData({ name: '', description: '', price: '', stock: '' });
      setEditingId(null);
      setError('');
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar repuesto');
    }
  };

  const handleEdit = (part) => {
    setFormData({ name: part.name, description: part.description, price: part.price, stock: part.stock });
    setEditingId(part.id);
    setError('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar repuesto?')) {
      try {
        await api.delete(`/api/inventory/${id}`);
        fetchParts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="main-content">
      <div className="dashboard-grid">
        
        {user && (user.role === 'admin' || user.role === 'support') && (
          <div className="glass-card">
            <h3>{editingId ? 'Editar Repuesto' : 'Nuevo Repuesto'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="3" />
              </div>
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input type="text" className="form-control" name="price" value={formData.price} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Stock</label>
                <input type="number" className="form-control" name="stock" value={formData.stock} onChange={handleChange} min="0" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar' : <><Plus size={18} style={{marginRight: '5px'}}/> Agregar</>}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setFormData({name:'', description:'', price:'', stock:''}); }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div style={{ gridColumn: user && (user.role === 'admin' || user.role === 'support') ? 'auto' : '1 / -1' }}>
          <h2>Catálogo de Repuestos</h2>
          <div className="table-responsive" style={{ marginTop: '1.5rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(part => (
                  <tr key={part.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{part.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{part.description}</div>
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>${parseFloat(part.price).toFixed(2)}</td>
                    <td>{part.stock} unid.</td>
                    <td>
                      {user && (user.role === 'admin' || user.role === 'support') ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => handleEdit(part)}>
                            <Edit2 size={16} />
                          </button>
                          {user.role === 'admin' && (
                            <button className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDelete(part.id)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
                {parts.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay repuestos en el inventario.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
