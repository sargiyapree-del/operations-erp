import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ShoppingCart, X } from 'lucide-react';
import { apiGet, apiPost } from './api';

type Customer = {
  id: string;
  name: string;
  customerCode?: string;
};

type Product = {
  id: string;
  sku?: string;
  name: string;
  unitOfMeasure?: string;
  isActive?: boolean;
};

type Warehouse = {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
};

type Order = {
  id: string;
  status: string;
  orderNumber?: string;
  customer?: {
    name?: string;
  };
};

type ListResponse<T> = {
  data: T[];
};

type CreateOrderResponse = {
  salesOrder: Order;
};

export default function CustomerOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<ListResponse<Order>>(
        '/api/sales-orders?page=1&pageSize=100',
      );

      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load customer orders.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFormData() {
    try {
      const [customerResult, productResult, warehouseResult] =
        await Promise.all([
          apiGet<ListResponse<Customer>>('/api/customers?page=1&pageSize=100'),
          apiGet<ListResponse<Product>>('/api/products?page=1&pageSize=100'),
          apiGet<ListResponse<Warehouse>>(
            '/api/warehouses?page=1&pageSize=100',
          ),
        ]);

      setCustomers(customerResult.data);
      setProducts(productResult.data);
      setWarehouses(warehouseResult.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load order form data.',
      );
    }
  }

  useEffect(() => {
    loadOrders();
    loadFormData();
  }, []);

  function resetForm() {
    setCustomerId('');
    setWarehouseId('');
    setProductId('');
    setQuantity('1');
    setUnitPrice('');
    setNotes('');
  }

  async function handleCreateOrder() {
    setError('');

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    if (!warehouseId) {
      setError('Please select a warehouse.');
      return;
    }

    if (!productId) {
      setError('Please select a product.');
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (!unitPrice || Number(unitPrice) <= 0) {
      setError('Unit price must be greater than zero.');
      return;
    }

    setCreating(true);

    try {
      const orderNumber = `SO-${Date.now()}`;

      await apiPost<CreateOrderResponse>('/api/sales-orders', {
        orderNumber,
        customerId,
        warehouseId,
        notes: notes.trim() || undefined,
        lines: [
          {
            productId,
            quantityOrdered: quantity,
            unitPrice,
          },
        ],
      });

      setShowCreate(false);
      resetForm();

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create sales order.',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales module</p>
          <h3>Customer Orders</h3>
          <p>Monitor customer sales orders and fulfillment status.</p>
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
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            Create Order
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {showCreate && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-heading">
            <div>
              <h4>Create Customer Order</h4>
              <p>Create a new sales order for a customer.</p>
            </div>

            <button
              className="module-action secondary"
              onClick={() => {
                setShowCreate(false);
                resetForm();
                setError('');
              }}
            >
              <X size={16} />
              Cancel
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '16px',
              marginTop: '20px',
            }}
          >
            <label>
              <strong>Customer</strong>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.customerCode
                      ? ` (${customer.customerCode})`
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <strong>Warehouse</strong>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                    {warehouse.code ? ` (${warehouse.code})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <strong>Product</strong>
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);

                  const selected = products.find(
                    (product) => product.id === e.target.value,
                  );

                  if (selected) {
                    setUnitPrice('');
                  }
                }}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <option value="">Select product</option>
                {products
                  .filter((product) => product.isActive !== false)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.sku ? ` (${product.sku})` : ''}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <strong>Quantity</strong>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </label>

            <label>
              <strong>Unit Price</strong>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter unit price"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </label>

            <label>
              <strong>Notes</strong>
              <input
                type="text"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              className="module-action"
              onClick={handleCreateOrder}
              disabled={creating}
            >
              <Plus size={16} />
              {creating ? 'Creating...' : 'Create Sales Order'}
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Customer order list</h4>
            <p>
              {loading ? 'Loading...' : `${items.length} orders`}
            </p>
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
                    <td>
                      <strong>
                        {item.orderNumber ?? item.id.slice(0, 8)}
                      </strong>
                    </td>

                    <td>
                      {item.customer?.name ?? '—'}
                    </td>

                    <td>
                      <strong>{item.status}</strong>
                    </td>
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