import { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { apiGet, apiPost } from './api';

type Product = {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure?: string;
  isActive?: boolean;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

type WorkOrderMaterial = {
  product?: {
    id?: string;
    sku?: string;
    name?: string;
    unitOfMeasure?: string;
  };
  quantityRequired?: string | number;
};

type WorkOrderOutput = {
  product?: {
    id?: string;
    sku?: string;
    name?: string;
    unitOfMeasure?: string;
  };
  quantityPlanned?: string | number;
};

type WorkOrder = {
  id: string;
  workOrderNumber?: string;
  status: string;
  warehouse?: {
    id?: string;
    code?: string;
    name?: string;
  };
  materials?: WorkOrderMaterial[];
  outputs?: WorkOrderOutput[];
};

type ListResponse<T> = {
  data: T[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function WorkOrdersPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(false);

  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const [materialProductId, setMaterialProductId] = useState('');
  const [outputProductId, setOutputProductId] = useState('');

  const [materialQuantity, setMaterialQuantity] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<ListResponse<WorkOrder>>(
        '/api/work-orders?page=1&pageSize=100',
      );

      setItems(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load work orders.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFormData() {
    setLoadingFormData(true);
    setError('');

    try {
      const [productResult, warehouseResult] = await Promise.all([
        apiGet<ListResponse<Product>>(
          '/api/products?page=1&pageSize=100&isActive=true',
        ),
        apiGet<ListResponse<Warehouse>>(
          '/api/warehouses?page=1&pageSize=100&isActive=true',
        ),
      ]);

      setProducts(productResult.data ?? []);
      setWarehouses(warehouseResult.data ?? []);

      if (warehouseResult.data?.length === 1) {
        setWarehouseId(warehouseResult.data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load products and warehouses.',
      );
    } finally {
      setLoadingFormData(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateForm() {
    setError('');

    const generatedNumber = `WO-${Date.now()}`;

    setWorkOrderNumber(generatedNumber);
    setWarehouseId('');
    setMaterialProductId('');
    setOutputProductId('');
    setMaterialQuantity('');
    setOutputQuantity('');

    setShowForm(true);

    loadFormData();
  }

  function closeCreateForm() {
    if (saving) return;

    setShowForm(false);
    setError('');
  }

  async function createWorkOrder(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!workOrderNumber.trim()) {
      setError('Work order number is required.');
      return;
    }

    if (!warehouseId) {
      setError('Please select a warehouse.');
      return;
    }

    if (!materialProductId) {
      setError('Please select a material product.');
      return;
    }

    if (!outputProductId) {
      setError('Please select an output product.');
      return;
    }

    const materialQty = Number(materialQuantity);
    const outputQty = Number(outputQuantity);

    if (!Number.isFinite(materialQty) || materialQty <= 0) {
      setError('Material quantity must be greater than zero.');
      return;
    }

    if (!Number.isFinite(outputQty) || outputQty <= 0) {
      setError('Output quantity must be greater than zero.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiPost('/api/work-orders', {
        workOrderNumber: workOrderNumber.trim(),

        warehouseId,

        materials: [
          {
            productId: materialProductId,
            quantityRequired: materialQty,
          },
        ],

        outputs: [
          {
            productId: outputProductId,
            quantityPlanned: outputQty,
          },
        ],
      });

      setShowForm(false);

      setWorkOrderNumber('');
      setWarehouseId('');
      setMaterialProductId('');
      setOutputProductId('');
      setMaterialQuantity('');
      setOutputQuantity('');

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create work order.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function action(
    id: string,
    actionName: 'release' | 'start' | 'complete',
  ) {
    setError('');

    try {
      await apiPost(
        `/api/work-orders/${id}/${actionName}`,
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Operation failed.',
      );
    }
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Production module
          </p>

          <h3>Work Orders</h3>

          <p>
            Create and manage production work orders.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          {/* REFRESH */}
          <button
            className="module-action secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {/* CREATE */}
          <button
            className="module-action"
            onClick={openCreateForm}
          >
            <Plus size={16} />
            Create Work Order
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* WORK ORDER LIST */}
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>
              Production Work Orders
            </h4>

            <p>
              {loading
                ? 'Loading...'
                : `${items.length} work orders`}
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="inventory-empty">
            Loading work orders...
          </div>

        ) : items.length === 0 ? (

          /* EMPTY */
          <div className="inventory-empty">
            <ClipboardList size={34} />

            <strong>
              No work orders
            </strong>

            <span>
              Create your first production work order.
            </span>
          </div>

        ) : (

          /* TABLE */
          <div className="inventory-table-wrapper">
            <table className="inventory-table">

              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Warehouse</th>
                  <th>Material</th>
                  <th>Output</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const material = item.materials?.[0];
                  const output = item.outputs?.[0];

                  return (
                    <tr key={item.id}>

                      {/* WORK ORDER NUMBER */}
                      <td>
                        {item.workOrderNumber ??
                          `${item.id.slice(0, 8)}...`}
                      </td>

                      {/* WAREHOUSE */}
                      <td>
                        {item.warehouse?.code ?? '-'}
                      </td>

                      {/* MATERIAL */}
                      <td>
                        {material?.product?.sku ?? '-'}
                        {material?.product?.name
                          ? ` - ${material.product.name}`
                          : ''}
                      </td>

                      {/* OUTPUT */}
                      <td>
                        {output?.product?.sku ?? '-'}
                        {output?.product?.name
                          ? ` - ${output.product.name}`
                          : ''}
                      </td>

                      {/* QUANTITY */}
                      <td>
                        {output?.quantityPlanned ?? '-'}
                      </td>

                      {/* STATUS */}
                      <td>
                        <strong>
                          {item.status}
                        </strong>
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                          }}
                        >

                          {/* DRAFT → RELEASE */}
                          {item.status === 'DRAFT' && (
                            <button
                              className="module-action"
                              onClick={() =>
                                action(
                                  item.id,
                                  'release',
                                )
                              }
                            >
                              Release
                            </button>
                          )}

                          {/* RELEASED → START */}
                          {item.status === 'RELEASED' && (
                            <button
                              className="module-action"
                              onClick={() =>
                                action(
                                  item.id,
                                  'start',
                                )
                              }
                            >
                              Start
                            </button>
                          )}

                          {/* IN_PROGRESS → COMPLETE */}
                          {item.status === 'IN_PROGRESS' && (
                            <button
                              className="module-action"
                              onClick={() =>
                                action(
                                  item.id,
                                  'complete',
                                )
                              }
                            >
                              Complete
                            </button>
                          )}

                          {/* COMPLETED */}
                          {item.status === 'COMPLETED' && (
                            <span>
                              —
                            </span>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* CREATE WORK ORDER MODAL */}
      {showForm && (
        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="panel-heading">
              <div>
                <h4>
                  Create Work Order
                </h4>

                <p>
                  Enter production details.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeCreateForm}
                type="button"
              >
                ×
              </button>
            </div>

            {loadingFormData ? (
              <div className="inventory-empty">
                Loading products and warehouses...
              </div>
            ) : (
              <form
                onSubmit={createWorkOrder}
              >

                {/* WORK ORDER NUMBER */}
                <label className="form-label">
                  Work Order Number

                  <input
                    className="form-input"
                    value={workOrderNumber}
                    onChange={(e) =>
                      setWorkOrderNumber(
                        e.target.value,
                      )
                    }
                    required
                  />
                </label>

                {/* WAREHOUSE */}
                <label className="form-label">
                  Warehouse

                  <select
                    className="form-input"
                    value={warehouseId}
                    onChange={(e) =>
                      setWarehouseId(
                        e.target.value,
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
                          {warehouse.code} -{' '}
                          {warehouse.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* MATERIAL PRODUCT */}
                <label className="form-label">
                  Material SKU

                  <select
                    className="form-input"
                    value={materialProductId}
                    onChange={(e) =>
                      setMaterialProductId(
                        e.target.value,
                      )
                    }
                    required
                  >
                    <option value="">
                      Select material
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.sku} -{' '}
                          {product.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* MATERIAL QUANTITY */}
                <label className="form-label">
                  Material Quantity

                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={materialQuantity}
                    onChange={(e) =>
                      setMaterialQuantity(
                        e.target.value,
                      )
                    }
                    placeholder="Enter quantity"
                    required
                  />
                </label>

                {/* OUTPUT PRODUCT */}
                <label className="form-label">
                  Output SKU

                  <select
                    className="form-input"
                    value={outputProductId}
                    onChange={(e) =>
                      setOutputProductId(
                        e.target.value,
                      )
                    }
                    required
                  >
                    <option value="">
                      Select output product
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.sku} -{' '}
                          {product.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {/* OUTPUT QUANTITY */}
                <label className="form-label">
                  Output Quantity

                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={outputQuantity}
                    onChange={(e) =>
                      setOutputQuantity(
                        e.target.value,
                      )
                    }
                    placeholder="Enter quantity"
                    required
                  />
                </label>

                {/* SUBMIT */}
                <button
                  className="module-action"
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {saving
                    ? 'Creating...'
                    : 'Create Work Order'}
                </button>

              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}