import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle, Minus, Plus, Trash2 } from 'lucide-react';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadCart = async () => {
    try {
      const response = await api.get('/api/cart');
      setCart(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el carrito');
    }
  };

  useEffect(() => { loadCart(); }, []);

  const changeQuantity = async (item, delta) => {
    const quantity = item.quantity + delta;
    if (quantity < 1) return removeItem(item.id);
    try {
      await api.put(`/api/cart/items/${item.id}`, { quantity });
      setError('');
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la cantidad');
    }
  };

  const removeItem = async (id) => {
    try {
      await api.delete(`/api/cart/items/${id}`);
      setError('');
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el articulo');
    }
  };

  const checkout = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/api/cart/checkout', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'factura-compra.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess('Compra finalizada. La factura PDF se ha descargado.');
      setError('');
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la compra');
      setSuccess('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="main-content">
      <div className="cart-header-row"><div><p className="eyebrow">ORDEN DE COMPRA</p><h2>Mi carrito</h2></div><CheckCircle size={28} color="var(--accent)" /></div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="glass-card cart-card">
        {!cart?.items?.length ? <p className="empty-state">Tu carrito esta vacio.</p> : <>
          <div className="table-responsive"><table className="table"><thead><tr><th>Repuesto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th /></tr></thead><tbody>
            {cart.items.map((item) => <tr key={item.id}>
              <td><div className="part-name">{item.name}</div></td>
              <td><div className="quantity-control"><button className="btn btn-secondary icon-button" onClick={() => changeQuantity(item, -1)} aria-label="Reducir cantidad"><Minus size={14} /></button><strong>{item.quantity}</strong><button className="btn btn-secondary icon-button" onClick={() => changeQuantity(item, 1)} aria-label="Aumentar cantidad"><Plus size={14} /></button></div></td>
              <td className="price-cell">${Number(item.price).toFixed(2)}</td><td className="price-cell">${(Number(item.price) * item.quantity).toFixed(2)}</td>
              <td><button className="btn btn-danger icon-button" aria-label="Eliminar articulo" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button></td>
            </tr>)}
          </tbody></table></div>
          <div className="cart-total-row"><div><span className="role-label">TOTAL DE LA ORDEN</span><strong>${Number(cart.total).toFixed(2)}</strong></div><button className="btn btn-primary" onClick={checkout} disabled={processing}>{processing ? 'Procesando...' : 'Finalizar compra y descargar factura'}</button></div>
        </>}
      </div>
    </main>
  );
};

export default Cart;
