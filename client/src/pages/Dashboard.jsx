import React, { useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Activity, Edit2, Package, Plus, ShoppingCart, Trash2, TrendingUp, Users } from 'lucide-react';

const roleLabels = { mechanic: 'Mecanico', support: 'Soporte', admin: 'Administrador' };
const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [parts, setParts] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', stock: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchParts = async () => {
    try {
      const response = await api.get('/api/inventory');
      setParts(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el inventario');
    }
  };

  useEffect(() => { fetchParts(); }, []);

  const metrics = useMemo(() => {
    const totalUnits = parts.reduce((sum, part) => sum + Number(part.stock || 0), 0);
    const inventoryValue = parts.reduce((sum, part) => sum + Number(part.price || 0) * Number(part.stock || 0), 0);
    const lowStock = parts.filter((part) => Number(part.stock) <= 8).sort((a, b) => a.stock - b.stock);
    const topStock = [...parts].sort((a, b) => b.stock - a.stock).slice(0, 6);
    return { totalUnits, inventoryValue, lowStock, topStock };
  }, [parts]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'price' && !/^\d*\.?\d*$/.test(value) && value !== '') return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || formData.price === '' || formData.stock === '') {
      setError('Nombre, precio y stock son obligatorios');
      return;
    }
    try {
      if (editingId) await api.put(`/api/inventory/${editingId}`, formData);
      else await api.post('/api/inventory', formData);
      setFormData({ name: '', description: '', price: '', stock: '' });
      setEditingId(null);
      setError('');
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar repuesto');
    }
  };

  const handleEdit = (part) => {
    setFormData({ name: part.name, description: part.description || '', price: part.price, stock: part.stock });
    setEditingId(part.id);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar repuesto?')) return;
    try {
      await api.delete(`/api/inventory/${id}`);
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el repuesto');
    }
  };

  const handleAddToCart = async (part) => {
    try {
      await api.post('/api/cart/items', { partId: part.id, quantity: 1 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agregar al carrito');
    }
  };

  const maxStock = Math.max(...metrics.topStock.map((part) => Number(part.stock)), 1);
  const canManage = user?.role === 'admin' || user?.role === 'support';

  return (
    <main className="main-content">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">CENTRO DE OPERACIONES</p>
          <h1>Dashboard de inventario</h1>
          <p className="dashboard-subtitle">Vista general del catalogo y disponibilidad de repuestos.</p>
        </div>
        <div className="role-panel">
          <div className="role-avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <span className="role-label">Sesion activa</span>
            <strong>{user?.name || user?.email}</strong>
            <span className={`role-chip role-${user?.role}`}>{roleLabels[user?.role] || user?.role}</span>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="metric-grid">
        <article className="metric-card"><div className="metric-icon metric-blue"><Package size={20} /></div><span>Referencias activas</span><strong>{parts.length}</strong><small>Repuestos en catalogo</small></article>
        <article className="metric-card"><div className="metric-icon metric-orange"><Activity size={20} /></div><span>Unidades disponibles</span><strong>{metrics.totalUnits}</strong><small>Stock total registrado</small></article>
        <article className="metric-card"><div className="metric-icon metric-green"><TrendingUp size={20} /></div><span>Valor inventario</span><strong>{money(metrics.inventoryValue)}</strong><small>Precio x stock</small></article>
        <article className="metric-card"><div className="metric-icon metric-red"><Users size={20} /></div><span>Atencion prioritaria</span><strong>{metrics.lowStock.length}</strong><small>Referencias con stock bajo</small></article>
      </section>

      <section className="analytics-grid">
        <article className="glass-card chart-card">
          <div className="section-heading"><div><p className="eyebrow">CAPACIDAD</p><h3>Stock por repuesto</h3></div><Package size={20} color="var(--accent)" /></div>
          <div className="bar-chart">
            {metrics.topStock.map((part) => (
              <div className="bar-row" key={part.id}>
                <span title={part.name}>{part.name}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(part.stock / maxStock) * 100}%` }} /></div>
                <strong>{part.stock}</strong>
              </div>
            ))}
            {!metrics.topStock.length && <p className="empty-state">Sin datos de inventario.</p>}
          </div>
        </article>

        <article className="glass-card chart-card">
          <div className="section-heading"><div><p className="eyebrow">ALERTAS</p><h3>Reposicion recomendada</h3></div><Activity size={20} color="var(--error)" /></div>
          <div className="alert-list">
            {metrics.lowStock.map((part) => <div className="stock-alert" key={part.id}><span>{part.name}</span><strong>{part.stock} uds.</strong></div>)}
            {!metrics.lowStock.length && <p className="empty-state">No hay alertas de stock.</p>}
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        {canManage && (
          <div className="glass-card">
            <div className="section-heading"><h3>{editingId ? 'Editar repuesto' : 'Nuevo repuesto'}</h3><Plus size={20} color="var(--accent)" /></div>
            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group"><label className="form-label">Nombre</label><input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} /></div>
              <div className="form-group"><label className="form-label">Descripcion</label><textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="3" /></div>
              <div className="form-group"><label className="form-label">Precio ($)</label><input type="text" className="form-control" name="price" value={formData.price} onChange={handleChange} /></div>
              <div className="form-group"><label className="form-label">Stock</label><input type="number" className="form-control" name="stock" value={formData.stock} onChange={handleChange} min="0" /></div>
              <div className="form-actions"><button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Agregar'}</button>{editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', price: '', stock: '' }); }}>Cancelar</button>}</div>
            </form>
          </div>
        )}

        <article className={`glass-card inventory-card ${canManage ? '' : 'inventory-card-wide'}`}>
          <div className="section-heading"><div><p className="eyebrow">CATALOGO</p><h3>Repuestos disponibles</h3></div><span className="table-count">{parts.length} items</span></div>
          <div className="table-responsive">
            <table className="table"><thead><tr><th>Repuesto</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody>
              {parts.map((part) => <tr key={part.id}><td><div className="part-name">{part.name}</div><div className="part-description">{part.description}</div></td><td className="price-cell">{money(part.price)}</td><td><span className={`stock-pill ${part.stock <= 8 ? 'stock-low' : ''}`}>{part.stock} uds.</span></td><td><div className="table-actions"><button className="btn btn-secondary icon-button" onClick={() => handleAddToCart(part)} aria-label="Agregar al carrito"><ShoppingCart size={15} /></button>{canManage && <button className="btn btn-secondary icon-button" onClick={() => handleEdit(part)} aria-label="Editar repuesto"><Edit2 size={15} /></button>}{user?.role === 'admin' && <button className="btn btn-danger icon-button" onClick={() => handleDelete(part.id)} aria-label="Eliminar repuesto"><Trash2 size={15} /></button>}</div></td></tr>)}
              {!parts.length && <tr><td colSpan="4" className="empty-state">No hay repuestos en el inventario.</td></tr>}
            </tbody></table>
          </div>
        </article>
      </div>
    </main>
  );
};

export default Dashboard;
