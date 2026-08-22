import { useEffect, useState } from 'react';
import { RefreshCw, ClipboardList, ArrowRightLeft, ShoppingCart } from 'lucide-react';
import { apiGet } from './api';

type Props = {
  title: string;
  endpoint: string;
  icon: React.ElementType;
};

function getRows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.workOrders)) return result.workOrders;
  if (Array.isArray(result?.transfers)) return result.transfers;
  if (Array.isArray(result?.salesOrders)) return result.salesOrders;
  return [];
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function OperationsListPage({
  title,
  endpoint,
  icon: Icon,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<any>(`${endpoint}?page=1&pageSize=100`);
      setRows(getRows(result));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to load ${title.toLowerCase()}.`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter(
          (key) => typeof rows[0][key] !== 'object' || rows[0][key] === null,
        )
      : [];

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations module</p>
          <h3>{title}</h3>
          <p>Live data connected to the Operations ERP backend.</p>
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
            <h4>{title} list</h4>
            <p>
              {loading
                ? 'Loading live data...'
                : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">
            Loading {title.toLowerCase()}...
          </div>
        ) : rows.length === 0 ? (
          <div className="inventory-empty">
            <Icon size={34} />
            <strong>No {title.toLowerCase()} found</strong>
            <span>
              Backend is connected, but there are currently no records.
            </span>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>
                      {column
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (c) => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    {columns.map((column) => (
                      <td key={column}>
                        {formatValue(row[column])}
                      </td>
                    ))}
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

export function WorkOrdersPage() {
  return (
    <OperationsListPage
      title="Work Orders"
      endpoint="/api/work-orders"
      icon={ClipboardList}
    />
  );
}

export function TransfersPage() {
  return (
    <OperationsListPage
      title="Internal Transfers"
      endpoint="/api/stock-transfers"
      icon={ArrowRightLeft}
    />
  );
}

export function CustomerOrdersPage() {
  return (
    <OperationsListPage
      title="Customer Orders"
      endpoint="/api/sales-orders"
      icon={ShoppingCart}
    />
  );
}
