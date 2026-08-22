import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { apiGet, apiPost } from './api';

type Order = {
  id: string;
  status: string;
  createdAt: string;
};

export default function CustomerOrderPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<{ data: Order[] }>(
        '/api/sales-orders?page=1&pageSize=100'
      );
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
        customerId,
        warehouseId,
      });

      setCustomerId('');
      setWarehouseId('');
      setShowForm(false);

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h3>Customer Orders</h3>
          <p>Manage customer sales orders and fulfillment.</p>
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
            <h4>Customer Orders</h4>
            <p>{loading ? 'Loading...' : `${items.length} orders`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ShoppingCart size={34} />
            <strong>No customer orders</strong>
            <span>Create the first customer order.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.id.slice(0, 8)}</strong></td>
                    <td><strong>{item.status}</strong></td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
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
                <p>Create a sales order.</p>
              </div>

              <button className="modal-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form onSubmit={createOrder}>
              <label className="form-label">
                Customer ID
                <input className="form-input" value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Customer ID" required />
              </label>

              <label className="form-label">
                Warehouse ID
                <input className="form-input" value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="Warehouse ID" required />
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
