import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Warehouse as WarehouseIcon } from 'lucide-react';
import { apiGet, apiPost } from './api';

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
};

type WarehouseResponse = {
  data: Warehouse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function WarehousePage() {
  const [items, setItems] = useState<Warehouse[]>([]);

  const currentUser = JSON.parse(
    localStorage.getItem('erp_user') || 'null',
  );

  const canManageWarehouses =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'OPERATIONS_MANAGER';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadWarehouses() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<WarehouseResponse>(
        '/api/warehouses?page=1&pageSize=100'
      );
      setItems(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiPost('/api/warehouses', {
        code,
        name,
        address: address || undefined,
      });

      setCode('');
      setName('');
      setAddress('');
      setShowForm(false);

      await loadWarehouses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create warehouse.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Master data</p>
          <h3>Warehouses</h3>
          <p>Manage warehouse locations and operational status.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="module-action secondary"
            onClick={loadWarehouses}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

         {canManageWarehouses && (
  <button
    className="module-action"
    onClick={() => setShowForm(true)}
  >
    <Plus size={16} />
    Add Warehouse
  </button>
)}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Warehouse list</h4>
            <p>{loading ? 'Loading...' : `${items.length} warehouses`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading warehouses...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <WarehouseIcon size={34} />
            <strong>No warehouses</strong>
            <span>Create your first warehouse.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {items.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td><strong>{warehouse.code}</strong></td>
                    <td>{warehouse.name}</td>
                    <td>{warehouse.address || '—'}</td>
                    <td>
                      <strong>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </strong>
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
                <h4>Add Warehouse</h4>
                <p>Create a new warehouse location.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="form-label">
                Warehouse Code
                <input
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="WH-001"
                  required
                />
              </label>

              <label className="form-label">
                Warehouse Name
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Main Warehouse"
                  required
                />
              </label>

              <label className="form-label">
                Address
                <input
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Warehouse address"
                />
              </label>

              <button
                className="module-action"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Warehouse'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
