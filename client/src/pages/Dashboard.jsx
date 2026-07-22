import React, { useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Activity, AlertTriangle, BarChart3, Edit2, Eye, Package, Plus, ShoppingCart, ShieldCheck, Trash2, TrendingUp, Users } from 'lucide-react';

const roleLabels = { mechanic: 'Mecanico', support: 'Soporte', admin: 'Administrador' };
const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RoleHeader = ({ user, eyebrow, title, subtitle }) => (
  <section className="dashboard-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="dashboard-subtitle">{subtitle}</p></div>
    <div className="role-panel"><div className="role-avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</div><div><span className="role-label">Sesion activa</span><strong>{user?.name || user?.email}</strong><span className={`role-chip role-${user?.role}`}>{roleLabels[user?.role] || user?.role}</span></div></div>
  </section>
);

const MetricCard = ({ icon: Icon, tone, label, value, detail }) => (
  <article className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
);

const StockBars = ({ parts, title = 'Disponibilidad por repuesto' }) => {
  const topStock = [...parts].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 6);
  const maxStock = Math.max(...topStock.map((part) => Number(part.stock)), 1);
  return <article className="glass-card chart-card"><div className="section-heading"><div><p className="eyebrow">CAPACIDAD</p><h3>{title}</h3></div><BarChart3 size={20} color="var(--accent)" /></div><div className="bar-chart">{topStock.map((part) => <div className="bar-row" key={part.id}><span title={part.name}>{part.name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(part.stock) / maxStock) * 100}%` }} /></div><strong>{part.stock}</strong></div>)}{!topStock.length && <p className="empty-state">Sin datos disponibles.</p>}</div></article>;
};

const RoleBadge = ({ role }) => <span className={`role-chip role-${role}`}>{roleLabels[role] || role}</span>;

const ManagementForm = ({ editingId, formData, handleChange, handleSubmit, cancelEdit }) => (
  <section className="glass-card admin-crud-panel">
    <div className="section-heading"><div><p className="eyebrow">GESTION ADMINISTRATIVA</p><h3>{editingId ? 'Editar repuesto' : 'Agregar repuesto'}</h3></div><Plus size={20} color="var(--accent)" /></div>
    <form onSubmit={handleSubmit} className="admin-crud-form">
      <div className="form-group"><label className="form-label">Nombre</label><input className="form-control" name="name" value={formData.name} onChange={handleChange} /></div>
      <div className="form-group"><label className="form-label">Descripcion</label><textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="2" /></div>
      <div className="form-group"><label className="form-label">Precio ($)</label><input className="form-control" name="price" value={formData.price} onChange={handleChange} /></div>
      <div className="form-group"><label className="form-label">Stock</label><input className="form-control" type="number" min="0" name="stock" value={formData.stock} onChange={handleChange} /></div>
      <div className="form-actions"><button className="btn btn-primary">{editingId ? 'Actualizar' : 'Agregar'}</button>{editingId && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>}</div>
    </form>
  </section>
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [parts, setParts] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', stock: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchParts = async () => {
    try { setParts((await api.get('/api/inventory')).data); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo cargar el inventario'); }
  };
  useEffect(() => { fetchParts(); }, []);

  const metrics = useMemo(() => {
    const totalUnits = parts.reduce((sum, part) => sum + Number(part.stock || 0), 0);
    const inventoryValue = parts.reduce((sum, part) => sum + Number(part.price || 0) * Number(part.stock || 0), 0);
    const lowStock = parts.filter((part) => Number(part.stock) <= 8).sort((a, b) => Number(a.stock) - Number(b.stock));
    const averagePrice = parts.length ? parts.reduce((sum, part) => sum + Number(part.price || 0), 0) / parts.length : 0;
    return { totalUnits, inventoryValue, lowStock, averagePrice };
  }, [parts]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'price' && !/^\d*\.?\d*$/.test(value) && value !== '') return;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name || formData.price === '' || formData.stock === '') return setError('Nombre, precio y stock son obligatorios');
    try {
      if (editingId) await api.put(`/api/inventory/${editingId}`, formData);
      else await api.post('/api/inventory', formData);
      setFormData({ name: '', description: '', price: '', stock: '' }); setEditingId(null); setError(''); fetchParts();
    } catch (err) { setError(err.response?.data?.message || 'Error al guardar repuesto'); }
  };

  const handleEdit = (part) => { setFormData({ name: part.name, description: part.description || '', price: part.price, stock: part.stock }); setEditingId(part.id); setError(''); };
  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar repuesto?')) return;
    try { await api.delete(`/api/inventory/${id}`); fetchParts(); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo eliminar el repuesto'); }
  };
  const addToCart = async (part) => {
    try { await api.post('/api/cart/items', { partId: part.id, quantity: 1 }); setError(''); setSuccess(`${part.name} se agrego al carrito.`); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo agregar al carrito'); }
  };

  const catalogTable = ({ admin = false } = {}) => {
    const isSupport = user?.role === 'support';
    return <article className="glass-card inventory-card inventory-card-wide"><div className="section-heading"><div><p className="eyebrow">CATALOGO</p><h3>{admin ? 'Control de inventario' : 'Repuestos disponibles'}</h3></div><span className="table-count">{parts.length} items</span></div><div className="table-responsive"><table className="table"><thead><tr><th>Repuesto</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{parts.map((part) => <tr key={part.id}><td><div className="part-name">{part.name}</div><div className="part-description">{part.description}</div></td><td className="price-cell">{money(part.price)}</td><td>{part.stock} uds.</td><td><span className={`stock-pill ${part.stock <= 8 ? 'stock-low' : ''}`}>{part.stock <= 8 ? 'Reponer' : 'Disponible'}</span></td><td><div className="table-actions">{user?.role === 'mechanic' && <button className="btn btn-secondary icon-button" onClick={() => addToCart(part)} aria-label="Agregar al carrito"><ShoppingCart size={15} /></button>}{(isSupport || admin) && <button className="btn btn-secondary icon-button" onClick={() => handleEdit(part)} aria-label="Editar repuesto"><Edit2 size={15} /></button>}{admin && <button className="btn btn-danger icon-button" onClick={() => handleDelete(part.id)} aria-label="Eliminar repuesto"><Trash2 size={15} /></button>}</div></td></tr>)}{!parts.length && <tr><td colSpan="5" className="empty-state">No hay repuestos en el inventario.</td></tr>}</tbody></table></div></article>;
  };

  const mechanicView = () => <>
    <RoleHeader user={user} eyebrow="PANEL DE CONSULTA" title="Mi espacio de trabajo" subtitle="Consulta disponibilidad y agrega repuestos a tu carrito." />
    <section className="metric-grid"><MetricCard icon={Package} tone="blue" label="Repuestos consultables" value={parts.length} detail="Catalogo actualizado" /><MetricCard icon={Activity} tone="green" label="Unidades disponibles" value={metrics.totalUnits} detail="Stock total" /><MetricCard icon={AlertTriangle} tone="red" label="Stock bajo" value={metrics.lowStock.length} detail="Requieren atencion" /><MetricCard icon={ShoppingCart} tone="orange" label="Compra" value="Activa" detail="Carrito disponible" /></section>
    <section className="analytics-grid"><StockBars parts={parts} title="Repuestos con mayor disponibilidad" /><article className="glass-card chart-card"><div className="section-heading"><div><p className="eyebrow">CONSULTA RAPIDA</p><h3>Atencion recomendada</h3></div><Eye size={20} color="var(--info)" /></div><div className="alert-list">{metrics.lowStock.map((part) => <div className="stock-alert" key={part.id}><span>{part.name}</span><strong>{part.stock} uds.</strong></div>)}{!metrics.lowStock.length && <p className="empty-state">Todo el inventario tiene buena disponibilidad.</p>}</div></article></section>
    {catalogTable()}
  </>;

  const supportView = () => <>
    <RoleHeader user={user} eyebrow="PANEL OPERATIVO" title="Centro de soporte" subtitle="Gestiona el catalogo y atiende las referencias que necesitan reposicion." />
    <section className="metric-grid"><MetricCard icon={Package} tone="blue" label="Referencias activas" value={parts.length} detail="Catalogo operativo" /><MetricCard icon={AlertTriangle} tone="red" label="Alertas de stock" value={metrics.lowStock.length} detail="Prioridad de atencion" /><MetricCard icon={TrendingUp} tone="green" label="Valor operativo" value={money(metrics.inventoryValue)} detail="Inventario disponible" /><MetricCard icon={Users} tone="orange" label="Canal interno" value="Activo" detail="Soporte y administracion" /></section>
    <section className="analytics-grid"><StockBars parts={parts} title="Capacidad del inventario" /><article className="glass-card chart-card"><div className="section-heading"><div><p className="eyebrow">SEGUIMIENTO</p><h3>Cola de reposicion</h3></div><AlertTriangle size={20} color="var(--error)" /></div><div className="alert-list">{metrics.lowStock.map((part, index) => <div className="stock-alert" key={part.id}><span><strong>#{index + 1}</strong> {part.name}</span><strong>{part.stock} uds.</strong></div>)}{!metrics.lowStock.length && <p className="empty-state">No hay reposiciones pendientes.</p>}</div></article></section>
    <section className="dashboard-grid support-workspace"><div className="glass-card"><div className="section-heading"><div><p className="eyebrow">GESTION</p><h3>{editingId ? 'Editar repuesto' : 'Registrar repuesto'}</h3></div><Plus size={20} color="var(--accent)" /></div><form onSubmit={handleSubmit} className="dashboard-form"><div className="form-group"><label className="form-label">Nombre</label><input className="form-control" name="name" value={formData.name} onChange={handleChange} /></div><div className="form-group"><label className="form-label">Descripcion</label><textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="3" /></div><div className="form-group"><label className="form-label">Precio ($)</label><input className="form-control" name="price" value={formData.price} onChange={handleChange} /></div><div className="form-group"><label className="form-label">Stock</label><input className="form-control" type="number" min="0" name="stock" value={formData.stock} onChange={handleChange} /></div><div className="form-actions"><button className="btn btn-primary">{editingId ? 'Actualizar' : 'Agregar'}</button>{editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', price: '', stock: '' }); }}>Cancelar</button>}</div></form></div><article className="glass-card"><div className="section-heading"><div><p className="eyebrow">ALERTA</p><h3>Items criticos</h3></div><Activity size={20} color="var(--error)" /></div>{metrics.lowStock.slice(0, 5).map((part) => <div className="compact-row" key={part.id}><span>{part.name}</span><strong>{part.stock} uds.</strong></div>)}</article></section>
    {catalogTable()}
  </>;

  const adminView = () => <>
    <RoleHeader user={user} eyebrow="PANEL EJECUTIVO" title="Control de operaciones" subtitle="Indicadores de valor, disponibilidad y control de inventario." />
    <section className="metric-grid"><MetricCard icon={TrendingUp} tone="green" label="Valor de inventario" value={money(metrics.inventoryValue)} detail="Valorizacion actual" /><MetricCard icon={Package} tone="blue" label="SKUs controlados" value={parts.length} detail="Referencias activas" /><MetricCard icon={Activity} tone="orange" label="Precio promedio" value={money(metrics.averagePrice)} detail="Por referencia" /><MetricCard icon={AlertTriangle} tone="red" label="Riesgo de stock" value={metrics.lowStock.length} detail="Items bajo minimo" /></section>
    <section className="analytics-grid"><StockBars parts={parts} title="Distribucion de existencias" /><article className="glass-card chart-card"><div className="section-heading"><div><p className="eyebrow">GOBIERNO</p><h3>Resumen de control</h3></div><ShieldCheck size={20} color="var(--accent)" /></div><div className="admin-summary"><div><span>Politica de stock</span><strong>Minimo 8 uds.</strong></div><div><span>Canal con soporte</span><strong>Disponible</strong></div><div><span>Catalogo</span><strong>{parts.length ? 'Sincronizado' : 'Sin datos'}</strong></div></div></article></section>
    <ManagementForm editingId={editingId} formData={formData} handleChange={handleChange} handleSubmit={handleSubmit} cancelEdit={() => { setEditingId(null); setFormData({ name: '', description: '', price: '', stock: '' }); }} />
    {catalogTable({ admin: true })}
  </>;

  return <main className="main-content">{error && <div className="alert alert-error">{error}</div>}{success && <div className="alert alert-success cart-add-confirmation">{success}</div>}{user?.role === 'admin' ? adminView() : user?.role === 'support' ? supportView() : mechanicView()}</main>;
};

export default Dashboard;
