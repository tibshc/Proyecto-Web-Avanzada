import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CheckCircle, Trash2 } from 'lucide-react';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCart = async () => {
    try {
      const response = await api.get('/api/cart');
      setCart(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el carrito');
    }
  };

  useEffect(() => { loadCart(); }, []);

  const removeItem = async (id) => {
    try {
      await api.delete(`/api/cart/items/${id}`);
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el articulo');
    }
  };

  const checkout = async () => {
    try {
      const response = await api.post('/api/cart/checkout');
      setSuccess(response.data.message);
      setError('');
      await loadCart();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la compra');
      setSuccess('');
    }
  };

  return (
    <main className="main-content">
      <div className="cart-header-row">
        <div>
          <p className="eyebrow">ORDEN DE COMPRA</p>
          <h2>Mi carrito</h2>
        </div>
        <CheckCircle size={28} color="var(--accent)" />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="glass-card cart-card">
        {!cart?.items?.length ? (
          <p className="empty-state">Tu carrito esta vacio.</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Repuesto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th /></tr></thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>${Number(item.price).toFixed(2)}</td>
                      <td>${(Number(item.price) * item.quantity).toFixed(2)}</td>
                      <td><button className="btn btn-danger icon-button" aria-label="Eliminar articulo" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cart-total-row">
              <strong>Total: ${Number(cart.total).toFixed(2)}</strong>
              <button className="btn btn-primary" onClick={checkout}>Finalizar compra</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Cart;
