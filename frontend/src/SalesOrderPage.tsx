import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { apiGet, apiPost } from './api';

type SalesOrder = {
  id: string;
  status: string;
  orderNumber?: string;
  customerName?: string;
  totalAmount?: string | number;
};

type OrderResponse = {
  data: SalesOrder[];
};

export default function SalesOrderPage() {
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<OrderResponse>('/api/sales-orders?page=1&pageSize=100');
      setItems(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiPost('/api/sales-orders', {
        customerId: customerId || undefined,
        customerName,
      });

      setCustomerName('');
      setCustomerId('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer order.');
    } finally {
      setSaving(false);
    }
  }

  async function action(id: string, type: 'confirm' | 'fulfill') {
    try {
      await apiPost(`/api/sales-orders/${id}/${type}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${type} order.`);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales module</p>
          <h3>Customer Orders</h3>
          <p>Manage customer demand and order fulfillment.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="module-action secondary" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>

          <button className="module-action" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Order
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Customer orders</h4>
            <p>{loading ? 'Loading...' : `${items.length} orders`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ShoppingCart size={34} />
            <strong>No customer orders</strong>
            <span>Create your first order.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.orderNumber ?? item.id}</strong></td>
                    <td>{item.customerName ?? '—'}</td>
                    <td>{item.totalAmount ?? '—'}</td>
                    <td><strong>{item.status}</strong></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {item.status === 'DRAFT' && (
                        <button className="module-action" onClick={() => action(item.id, 'confirm')}>
                          Confirm
                        </button>
                      )}

                      {item.status === 'CONFIRMED' && (
                        <button className="module-action" onClick={() => action(item.id, 'fulfill')}>
                          Fulfill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-heading">
              <div>
                <h4>New Customer Order</h4>
                <p>Create a new sales order.</p>
              </div>

              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            <form onSubmit={createOrder}>
              <label className="form-label">
                Customer Name
                <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
              </label>

              <label className="form-label">
                Customer ID
                <input className="form-input" value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Optional" />
              </label>

              <button className="module-action" type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
