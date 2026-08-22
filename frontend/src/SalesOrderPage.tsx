import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { apiGet, apiPost } from './api';

type SalesOrder = {
  id: string;
  status: string;
  orderNumber?: string;
  customer?: {
    id?: string;
    name?: string;
  };
  warehouseId?: string;
  lines?: Array<{
    productId: string;
    quantityOrdered: string | number;
    unitPrice: string | number;
  }>;
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

  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantityOrdered, setQuantityOrdered] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<OrderResponse>(
        '/api/sales-orders?page=1&pageSize=100'
      );

      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load customer orders.'
      );
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
        orderNumber,
        customerId,
        warehouseId,
        lines: [
          {
            productId,
            quantityOrdered,
            unitPrice,
          },
        ],
      });

      setOrderNumber('');
      setCustomerId('');
      setWarehouseId('');
      setProductId('');
      setQuantityOrdered('1');
      setUnitPrice('');

      setShowForm(false);

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create customer order.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function action(
    id: string,
    type: 'confirm' | 'fulfill'
  ) {
    setError('');

    try {
      await apiPost(`/api/sales-orders/${id}/${type}`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${type} order.`
      );
    }
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setError('');
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
          <button
            className="module-action secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="module-action"
            onClick={() => {
              setError('');
              setShowForm(true);
            }}
          >
            <Plus size={16} />
            New Order
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Customer orders</h4>
            <p>
              {loading ? 'Loading...' : `${items.length} orders`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">
            Loading...
          </div>
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
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.orderNumber ?? item.id}
                      </strong>
                    </td>

                    <td>
                      {item.customer?.name ??
                        item.customer?.id ??
                        '—'}
                    </td>

                    <td>
                      {item.warehouseId ?? '—'}
                    </td>

                    <td>
                      <strong>{item.status}</strong>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        {item.status === 'DRAFT' && (
                          <button
                            className="module-action"
                            onClick={() =>
                              action(item.id, 'confirm')
                            }
                          >
                            Confirm
                          </button>
                        )}

                        {item.status === 'CONFIRMED' && (
                          <button
                            className="module-action"
                            onClick={() =>
                              action(item.id, 'fulfill')
                            }
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
                <h4>New Customer Order</h4>
                <p>Create a new sales order.</p>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={createOrder}>
              <label className="form-label">
                Order Number

                <input
                  className="form-input"
                  value={orderNumber}
                  onChange={(e) =>
                    setOrderNumber(e.target.value)
                  }
                  placeholder="SO-002"
                  required
                />
              </label>

              <label className="form-label">
                Customer ID

                <input
                  className="form-input"
                  value={customerId}
                  onChange={(e) =>
                    setCustomerId(e.target.value)
                  }
                  placeholder="Enter customer ID"
                  required
                />
              </label>

              <label className="form-label">
                Warehouse ID

                <input
                  className="form-input"
                  value={warehouseId}
                  onChange={(e) =>
                    setWarehouseId(e.target.value)
                  }
                  placeholder="Enter warehouse ID"
                  required
                />
              </label>

              <label className="form-label">
                Product ID

                <input
                  className="form-input"
                  value={productId}
                  onChange={(e) =>
                    setProductId(e.target.value)
                  }
                  placeholder="Enter product ID"
                  required
                />
              </label>

              <label className="form-label">
                Quantity

                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantityOrdered}
                  onChange={(e) =>
                    setQuantityOrdered(e.target.value)
                  }
                  required
                />
              </label>

              <label className="form-label">
                Unit Price

                <input
                  className="form-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) =>
                    setUnitPrice(e.target.value)
                  }
                  placeholder="100"
                  required
                />
              </label>

              <button
                className="module-action"
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
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