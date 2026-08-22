import { useEffect, useState } from 'react';
import { RefreshCw, ShoppingCart } from 'lucide-react';
import { apiGet } from './api';

type Order = {
  id: string;
  status: string;
  orderNumber?: string;
  customer?: {
    name?: string;
  };
};

type ResponseData = {
  data: Order[];
};

export default function CustomerOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<ResponseData>(
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

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales module</p>
          <h3>Customer Orders</h3>
          <p>Monitor customer sales orders and fulfillment status.</p>
        </div>

        <button
          className="module-action secondary"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Customer order list</h4>
            <p>{loading ? 'Loading...' : `${items.length} orders`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading orders...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ShoppingCart size={34} />
            <strong>No customer orders</strong>
            <span>No sales orders found.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.orderNumber ?? item.id.slice(0, 8)}</strong></td>
                    <td>{item.customer?.name ?? '—'}</td>
                    <td><strong>{item.status}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
