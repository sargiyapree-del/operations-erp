import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Plus,
  Package,
} from 'lucide-react';

import { apiGet, apiPost } from './api';

type UserRole =
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'WAREHOUSE_OPERATOR'
  | 'SALES_USER';

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
  isActive: boolean;
};

type InventoryItem = {
  id: string;
  warehouseId: string;
  productId: string;
  quantityOnHand: string | number;
  reservedQuantity: string | number;
  warehouse: Warehouse;
  product: Product;
};

type InventoryResponse = {
  data: InventoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type WarehouseResponse = {
  data: Warehouse[];
};

type ProductResponse = {
  data: Product[];
};

function getCurrentRole(): UserRole | null {
  try {
    const storedUser = localStorage.getItem('erp_user');

    if (!storedUser) {
      return null;
    }

    const user = JSON.parse(storedUser) as {
      role?: UserRole;
    };

    return user.role ?? null;
  } catch {
    return null;
  }
}

function canAdjustInventory(role: UserRole | null): boolean {
  return (
    role === 'ADMIN' ||
    role === 'OPERATIONS_MANAGER' ||
    role === 'WAREHOUSE_OPERATOR'
  );
}

export default function InventoryPage() {
  const role = getCurrentRole();

  const canAdjust = canAdjustInventory(role);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdjustment, setShowAdjustment] =
    useState(false);

  const [warehouseId, setWarehouseId] =
    useState('');

  const [productId, setProductId] =
    useState('');

  const [quantityChange, setQuantityChange] =
    useState('');

  const [reference, setReference] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  async function loadInventory() {
    setLoading(true);
    setError('');

    try {
      const [
        inventory,
        warehouseResult,
        productResult,
      ] = await Promise.all([
        apiGet<InventoryResponse>(
          '/api/inventory?page=1&pageSize=100',
        ),

        apiGet<WarehouseResponse>(
          '/api/warehouses',
        ),

        apiGet<ProductResponse>(
          '/api/products',
        ),
      ]);

      setItems(inventory.data);
      setWarehouses(warehouseResult.data);
      setProducts(productResult.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load inventory.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function handleAdjustment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canAdjust) {
      setError(
        'You are not authorized to adjust inventory.',
      );
      return;
    }

    const numericQuantity =
      Number(quantityChange);

    if (
      !Number.isFinite(numericQuantity) ||
      numericQuantity === 0
    ) {
      setError(
        'Quantity change must be a valid non-zero number.',
      );
      return;
    }

    setError('');
    setSaving(true);

    try {
      await apiPost(
        '/api/inventory/adjust',
        {
          warehouseId,
          productId,
          quantityChange:
            numericQuantity,
          reference:
            reference || undefined,
          notes:
            notes || undefined,
        },
      );

      setWarehouseId('');
      setProductId('');
      setQuantityChange('');
      setReference('');
      setNotes('');
      setShowAdjustment(false);

      await loadInventory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to adjust inventory.',
      );
    } finally {
      setSaving(false);
    }
  }

  function closeAdjustment() {
    if (saving) {
      return;
    }

    setShowAdjustment(false);
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Operations module
          </p>

          <h3>Inventory</h3>

          <p>
            View stock balances across warehouses
            and manage inventory adjustments.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
          }}
        >
          <button
            className="module-action secondary"
            onClick={loadInventory}
            disabled={loading}
          >
            <RefreshCw size={16} />

            {loading
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          {canAdjust && (
            <button
              className="module-action"
              onClick={() =>
                setShowAdjustment(true)
              }
            >
              <Plus size={16} />

              Adjust Stock
            </button>
          )}
        </div>
      </div>

      {!canAdjust && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#f8fafc',
            color: '#475569',
            fontSize: '14px',
          }}
        >
          You have view-only access to inventory.
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>
              Inventory balances
            </h4>

            <p>
              {loading
                ? 'Loading inventory...'
                : `${items.length} inventory records`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <Package size={34} />

            <strong>
              No inventory records
            </strong>

            <span>
              There are currently no inventory
              balances in the database.
            </span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Code</th>
                 <th>On Hand</th>
<th>Reserved</th>
<th>Available</th>
<th>Unit</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.product.sku}
                      </strong>
                    </td>

                    <td>
                      {item.product.name}
                    </td>

                    <td>
                      {item.warehouse.name}
                    </td>

                    <td>
                      {item.warehouse.code}
                    </td>
<td>
  <strong>
    {String(item.quantityOnHand)}
  </strong>
</td>

<td>
  {String(item.reservedQuantity)}
</td>

<td>
  <strong>
    {Number(item.quantityOnHand) - Number(item.reservedQuantity)}
  </strong>
</td>

<td>
  {item.product.unitOfMeasure}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdjustment && canAdjust && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-heading">
              <div>
                <h4>
                  Adjust Inventory
                </h4>

                <p>
                  Positive quantity adds stock.
                  Negative quantity removes stock.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeAdjustment}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAdjustment}
            >
              <label className="form-label">
                Warehouse

                <select
                  className="form-input"
                  value={warehouseId}
                  onChange={(event) =>
                    setWarehouseId(
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">
                    Select warehouse
                  </option>

                  {warehouses.map(
                    (warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        {warehouse.name} (
                        {warehouse.code})
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="form-label">
                Product

                <select
                  className="form-input"
                  value={productId}
                  onChange={(event) =>
                    setProductId(
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">
                    Select product
                  </option>

                  {products
                    .filter(
                      (product) =>
                        product.isActive,
                    )
                    .map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} (
                        {product.sku})
                      </option>
                    ))}
                </select>
              </label>

              <label className="form-label">
                Quantity Change

                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={quantityChange}
                  onChange={(event) =>
                    setQuantityChange(
                      event.target.value,
                    )
                  }
                  placeholder="Example: 10 or -5"
                  required
                />
              </label>

              <label className="form-label">
                Reference

                <input
                  className="form-input"
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target.value,
                    )
                  }
                  placeholder="Optional reference"
                />
              </label>

              <label className="form-label">
                Notes

                <textarea
                  className="form-input"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Optional notes"
                  rows={3}
                />
              </label>

              <button
                className="module-action"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}