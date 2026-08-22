import { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  ClipboardList,
  Trash2,
  X,
} from 'lucide-react';
import { apiGet, apiPost } from './api';

type Product = {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure?: string;
};

type Warehouse = {
  id: string;
  code: string;
  name: string;
};

type WorkOrderMaterial = {
  productId: string;
  quantityRequired: string;
  product?: Product;
};

type WorkOrderOutput = {
  productId: string;
  quantityPlanned: string;
  product?: Product;
};

type WorkOrder = {
  id: string;
  workOrderNumber: string;
  status: string;
  scheduledDate?: string | null;
  notes?: string | null;
  warehouse?: Warehouse;
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

export default function WorkOrderPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const [materials, setMaterials] = useState<WorkOrderMaterial[]>([
    {
      productId: '',
      quantityRequired: '',
    },
  ]);

  const [outputs, setOutputs] = useState<WorkOrderOutput[]>([
    {
      productId: '',
      quantityPlanned: '',
    },
  ]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [workOrdersResult, productsResult, warehousesResult] =
        await Promise.all([
          apiGet<ListResponse<WorkOrder>>(
            '/api/work-orders?page=1&pageSize=100',
          ),
          apiGet<ListResponse<Product>>(
            '/api/products?page=1&pageSize=100&isActive=true',
          ),
          apiGet<ListResponse<Warehouse>>(
            '/api/warehouses?page=1&pageSize=100&isActive=true',
          ),
        ]);

      setItems(workOrdersResult.data ?? []);
      setProducts(productsResult.data ?? []);
      setWarehouses(warehousesResult.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load work order data.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setWorkOrderNumber('');
    setWarehouseId('');
    setScheduledDate('');
    setNotes('');

    setMaterials([
      {
        productId: '',
        quantityRequired: '',
      },
    ]);

    setOutputs([
      {
        productId: '',
        quantityPlanned: '',
      },
    ]);
  }

  function closeForm() {
    if (saving) return;

    resetForm();
    setShowForm(false);
  }

  function addMaterial() {
    setMaterials((current) => [
      ...current,
      {
        productId: '',
        quantityRequired: '',
      },
    ]);
  }

  function removeMaterial(index: number) {
    setMaterials((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function updateMaterial(
    index: number,
    field: 'productId' | 'quantityRequired',
    value: string,
  ) {
    setMaterials((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addOutput() {
    setOutputs((current) => [
      ...current,
      {
        productId: '',
        quantityPlanned: '',
      },
    ]);
  }

  function removeOutput(index: number) {
    setOutputs((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function updateOutput(
    index: number,
    field: 'productId' | 'quantityPlanned',
    value: string,
  ) {
    setOutputs((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  async function createWorkOrder(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    if (!workOrderNumber.trim()) {
      setError('Work order number is required.');
      return;
    }

    if (!warehouseId) {
      setError('Please select a warehouse.');
      return;
    }

    if (
      materials.some(
        (item) =>
          !item.productId ||
          !item.quantityRequired ||
          Number(item.quantityRequired) <= 0,
      )
    ) {
      setError(
        'Please select a product and valid quantity for every material.',
      );
      return;
    }

    if (
      outputs.some(
        (item) =>
          !item.productId ||
          !item.quantityPlanned ||
          Number(item.quantityPlanned) <= 0,
      )
    ) {
      setError(
        'Please select a product and valid quantity for every output.',
      );
      return;
    }

    const materialProductIds = materials.map(
      (item) => item.productId,
    );

    if (
      new Set(materialProductIds).size !==
      materialProductIds.length
    ) {
      setError('The same product cannot be used twice as a material.');
      return;
    }

    const outputProductIds = outputs.map(
      (item) => item.productId,
    );

    if (
      new Set(outputProductIds).size !==
      outputProductIds.length
    ) {
      setError('The same product cannot be used twice as an output.');
      return;
    }

    setSaving(true);

    try {
      await apiPost('/api/work-orders', {
        workOrderNumber: workOrderNumber.trim(),
        warehouseId,
        scheduledDate: scheduledDate || null,
        notes: notes.trim() || null,

        materials: materials.map((item) => ({
          productId: item.productId,
          quantityRequired: Number(item.quantityRequired),
        })),

        outputs: outputs.map((item) => ({
          productId: item.productId,
          quantityPlanned: Number(item.quantityPlanned),
        })),
      });

      closeForm();
      await loadData();
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

  async function handleAction(
    id: string,
    action: 'release' | 'start' | 'complete',
  ) {
    setError('');
    setActionLoading(id);

    try {
      await apiPost(`/api/work-orders/${id}/${action}`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Work order action failed.',
      );
    } finally {
      setActionLoading('');
    }
  }

  function statusClass(status: string) {
    switch (status) {
      case 'DRAFT':
        return 'status-badge status-draft';

      case 'RELEASED':
        return 'status-badge status-released';

      case 'IN_PROGRESS':
        return 'status-badge status-progress';

      case 'COMPLETED':
        return 'status-badge status-completed';

      default:
        return 'status-badge';
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Production module</p>

          <h3>Work Orders</h3>

          <p>
            Create, release and complete production work orders.
          </p>
        </div>

        <div className="page-actions">
          <button
            className="module-action secondary"
            onClick={loadData}
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
            Create Work Order
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Production Work Orders</h4>

            <p>
              {loading
                ? 'Loading work orders...'
                : `${items.length} work order${
                    items.length === 1 ? '' : 's'
                  }`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">
            Loading work orders...
          </div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ClipboardList size={34} />

            <strong>No work orders</strong>

            <span>
              Create your first production work order.
            </span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Warehouse</th>
                  <th>Materials</th>
                  <th>Outputs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.workOrderNumber}
                      </strong>
                    </td>

                    <td>
                      {item.warehouse
                        ? `${item.warehouse.code} — ${item.warehouse.name}`
                        : '—'}
                    </td>

                    <td>
                      {item.materials?.length
                        ? item.materials
                            .map(
                              (material) =>
                                `${material.product?.sku ?? 'Product'} × ${
                                  material.quantityRequired
                                }`,
                            )
                            .join(', ')
                        : '—'}
                    </td>

                    <td>
                      {item.outputs?.length
                        ? item.outputs
                            .map(
                              (output) =>
                                `${output.product?.sku ?? 'Product'} × ${
                                  output.quantityPlanned
                                }`,
                            )
                            .join(', ')
                        : '—'}
                    </td>

                    <td>
                      <span className={statusClass(item.status)}>
                        {item.status.replaceAll('_', ' ')}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        {item.status === 'DRAFT' && (
                          <button
                            className="action-button"
                            disabled={
                              actionLoading === item.id
                            }
                            onClick={() =>
                              handleAction(
                                item.id,
                                'release',
                              )
                            }
                          >
                            Release
                          </button>
                        )}

                        {item.status === 'RELEASED' && (
                          <button
                            className="action-button"
                            disabled={
                              actionLoading === item.id
                            }
                            onClick={() =>
                              handleAction(
                                item.id,
                                'start',
                              )
                            }
                          >
                            Start
                          </button>
                        )}

                        {item.status === 'IN_PROGRESS' && (
                          <button
                            className="action-button"
                            disabled={
                              actionLoading === item.id
                            }
                            onClick={() =>
                              handleAction(
                                item.id,
                                'complete',
                              )
                            }
                          >
                            Complete
                          </button>
                        )}

                        {actionLoading === item.id && (
                          <span className="action-loading">
                            Updating...
                          </span>
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
          <div className="modal-card work-order-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  Production
                </p>

                <h4>Create Work Order</h4>

                <p>
                  Define the warehouse, materials and expected
                  production output.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createWorkOrder}>
              <div className="form-grid">
                <label className="form-label">
                  Work Order Number
                  <input
                    className="form-input"
                    value={workOrderNumber}
                    onChange={(event) =>
                      setWorkOrderNumber(
                        event.target.value,
                      )
                    }
                    placeholder="WO-001"
                    required
                  />
                </label>

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

                    {warehouses.map((warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        {warehouse.code} — {warehouse.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Scheduled Date
                  <input
                    className="form-input"
                    type="date"
                    value={scheduledDate}
                    onChange={(event) =>
                      setScheduledDate(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="form-label form-label-full">
                  Notes
                  <textarea
                    className="form-input form-textarea"
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Optional production notes..."
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h5>Materials</h5>
                    <span>
                      Products consumed during production.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="small-add-button"
                    onClick={addMaterial}
                  >
                    <Plus size={14} />
                    Add Material
                  </button>
                </div>

                {materials.map((material, index) => (
                  <div
                    className="line-item"
                    key={`material-${index}`}
                  >
                    <select
                      className="form-input"
                      value={material.productId}
                      onChange={(event) =>
                        updateMaterial(
                          index,
                          'productId',
                          event.target.value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.sku} — {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      className="form-input quantity-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Quantity"
                      value={
                        material.quantityRequired
                      }
                      onChange={(event) =>
                        updateMaterial(
                          index,
                          'quantityRequired',
                          event.target.value,
                        )
                      }
                      required
                    />

                    {materials.length > 1 && (
                      <button
                        type="button"
                        className="remove-line-button"
                        onClick={() =>
                          removeMaterial(index)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-section">
                <div className="form-section-heading">
                  <div>
                    <h5>Outputs</h5>
                    <span>
                      Products expected after production.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="small-add-button"
                    onClick={addOutput}
                  >
                    <Plus size={14} />
                    Add Output
                  </button>
                </div>

                {outputs.map((output, index) => (
                  <div
                    className="line-item"
                    key={`output-${index}`}
                  >
                    <select
                      className="form-input"
                      value={output.productId}
                      onChange={(event) =>
                        updateOutput(
                          index,
                          'productId',
                          event.target.value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.sku} — {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      className="form-input quantity-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Quantity"
                      value={
                        output.quantityPlanned
                      }
                      onChange={(event) =>
                        updateOutput(
                          index,
                          'quantityPlanned',
                          event.target.value,
                        )
                      }
                      required
                    />

                    {outputs.length > 1 && (
                      <button
                        type="button"
                        className="remove-line-button"
                        onClick={() =>
                          removeOutput(index)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="module-action secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="module-action"
                  disabled={saving}
                >
                  {saving
                    ? 'Creating...'
                    : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}