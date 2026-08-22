import { useEffect, useState } from 'react';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { apiGet } from './api';

type Transfer = {
  id: string;
  status: string;
  fromWarehouse?: {
    code: string;
    name: string;
  };
  toWarehouse?: {
    code: string;
    name: string;
  };
};

type ResponseData = {
  data: Transfer[];
};

export default function TransfersPage() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<ResponseData>(
        '/api/stock-transfers?page=1&pageSize=100'
      );
      setItems(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfers.');
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
          <p className="eyebrow">Operations module</p>
          <h3>Internal Transfers</h3>
          <p>Track stock movement between warehouses.</p>
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
            <h4>Transfer list</h4>
            <p>{loading ? 'Loading...' : `${items.length} transfers`}</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Loading transfers...</div>
        ) : items.length === 0 ? (
          <div className="inventory-empty">
            <ArrowRightLeft size={34} />
            <strong>No transfers</strong>
            <span>No internal stock transfers found.</span>
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
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id.slice(0, 8)}...</td>
                    <td>{item.fromWarehouse?.name ?? '—'}</td>
                    <td>{item.toWarehouse?.name ?? '—'}</td>
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
