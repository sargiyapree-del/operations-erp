import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { apiGet, apiPost } from './api';

type SalesOrder = {
  id: string;
  status: string;
  customerId?: string;
  warehouseId?: string | null;
  totalAmount?: string | number;
};

type OrderResponse = {
  data: SalesOrder[];
  pagination?: {
    total: number;
  };
};

export default function OrdersPage() {
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<OrderResponse>(
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
    loadOrders();
  }, []);

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiPost('/api/sales-orders', {
        customerId,
      });

      setCustomerId('');
      setShowForm(false);

      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  }

  async function action(
    id: string,
    actionName: 'confirm' | 'fulfill'
  ) {
    try {
      await apiPost(`/api/sales-orders/${id}/${actionName}`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order action failed.');
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales module</p>
          <h3>Customer Orders</h3>
          <p>Create, confirm and fulfill customer orders.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="module-action secondary"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="module-action"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            Create Order
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 14px',
          borderRadius: '8px',
          background: '#fef2f2',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Customer orders</h4>
            <p>{loading ? 'Loading...' : `${items.length} orders`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading customer orders...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ShoppingCart size={34} />
            <strong>No customer orders</strong>
            <span>Create an order to begin the sales workflow.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Warehouse</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.id.slice(0, 8)}</strong></td>
                    <td>{item.customerId?.slice(0, 8) || '—'}</td>
                    <td>{item.warehouseId?.slice(0, 8) || 'Not assigned'}</td>
                    <td>{item.totalAmount !== undefined ? String(item.totalAmount) : '—'}</td>
                    <td><strong>{item.status}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {item.status === 'DRAFT' && (
                          <button
                            className="module-action secondary"
                            onClick={() => action(item.id, 'confirm')}
                          >
                            Confirm
                          </button>
                        )}

                        {item.status === 'CONFIRMED' && (
                          <button
                            className="module-action"
                            onClick={() => action(item.id, 'fulfill')}
                          >
                            Fulfill
                          </button>
                        )}
                      </div>
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
                <h4>Create Customer Order</h4>
                <p>Start a new sales order.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={createOrder}>
              <label className="form-label">
                Customer ID
                <input
                  className="form-input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID"
                  required
                />
              </label>

              <button
                className="module-action"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
