import { useEffect, useState } from 'react';
import type { User } from './AuthGate';
import { Plus, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { apiGet, apiPost } from './api';

type Transfer = {
  id: string;
  status: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  createdAt?: string;
};

type TransferResponse = {
  data: Transfer[];
  pagination?: unknown;
};

export default function TransferPage() {
    const user: User | null = (() => {
    const storedUser = localStorage.getItem('erp_user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      return null;
    }
  })();

  const canManageTransfers =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATIONS_MANAGER';

  const canReceiveTransfers =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATIONS_MANAGER' ||
    user?.role === 'WAREHOUSE_OPERATOR';
  const [items, setItems] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<TransferResponse>(
        '/api/stock-transfers?page=1&pageSize=100',
      );
      setItems(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiPost('/api/stock-transfers', {
        fromWarehouseId,
        toWarehouseId,
      });

      setFromWarehouseId('');
      setToWarehouseId('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer.');
    } finally {
      setSaving(false);
    }
  }

  async function action(
    id: string,
    actionName: 'dispatch' | 'receive' | 'cancel',
  ) {
    setError('');

    try {
      await apiPost(`/api/stock-transfers/${id}/${actionName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer operation failed.');
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Warehouse operations</p>
          <h3>Internal Transfers</h3>
          <p>Move inventory between warehouses.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="module-action secondary" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>

         {canManageTransfers && (
  <button className="module-action" onClick={() => setShowForm(true)}>
    <Plus size={16} /> Create Transfer
  </button>
)}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h4>Stock Transfers</h4>
            <p>{loading ? 'Loading...' : `${items.length} transfers`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading transfers...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ArrowRightLeft size={34} />
            <strong>No transfers</strong>
            <span>Create an internal stock transfer.</span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id.slice(0, 8)}...</td>
                    <td>{item.fromWarehouseId ?? '-'}</td>
                    <td>{item.toWarehouseId ?? '-'}</td>
                    <td><strong>{item.status}</strong></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                    {item.status === 'DRAFT' && canManageTransfers && (
  <>
    <button
      className="module-action"
      onClick={() => action(item.id, 'dispatch')}
    >
      Dispatch
    </button>

    <button
      className="module-action secondary"
      onClick={() => action(item.id, 'cancel')}
    >
      Cancel
    </button>
  </>
)}

                     {item.status === 'DISPATCHED' && canReceiveTransfers && (
  <button
    className="module-action"
    onClick={() => action(item.id, 'receive')}
  >
    Receive
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
                <h4>Create Transfer</h4>
                <p>Move stock between warehouses.</p>
              </div>

              <button className="modal-close" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>

            <form onSubmit={createTransfer}>
              <label className="form-label">
                From Warehouse ID
                <input
                  className="form-input"
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                  required
                />
              </label>

              <label className="form-label">
                To Warehouse ID
                <input
                  className="form-input"
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  required
                />
              </label>

              <button className="module-action" type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Transfer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
