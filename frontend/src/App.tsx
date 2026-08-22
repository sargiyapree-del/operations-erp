import { useState } from 'react';

import InventoryPage from './InventoryPage';
import WarehousePage from './WarehousePage';
import {
  TransfersPage,
} from './OperationsListPage';

import SalesOrderPage from './SalesOrderPage';
import WorkOrdersPage from './WorkOrdersPage';

import {
  Boxes,
  ClipboardList,
  ArrowRightLeft,
  ShoppingCart,
  LayoutDashboard,
  Warehouse,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

type UserRole =
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'WAREHOUSE_OPERATOR'
  | 'SALES_USER';

type Page =
  | 'dashboard'
  | 'inventory'
  | 'warehouses'
  | 'work-orders'
  | 'transfers'
  | 'orders';

type StoredUser = {
  id?: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  isActive?: boolean;
};

type NavigationItem = {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
};

const navigation: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
  },
  {
    id: 'warehouses',
    label: 'Warehouses',
    icon: Warehouse,
  },
  {
    id: 'work-orders',
    label: 'Work Orders',
    icon: ClipboardList,
  },
  {
    id: 'transfers',
    label: 'Internal Transfers',
    icon: ArrowRightLeft,
  },
  {
    id: 'orders',
    label: 'Customer Orders',
    icon: ShoppingCart,
  },
];

function getCurrentUser(): StoredUser | null {
  try {
    const storedUser = localStorage.getItem('erp_user');

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as StoredUser;
  } catch {
    return null;
  }
}

function canAccessPage(role: UserRole, page: Page): boolean {
  switch (role) {
    case 'ADMIN':
      return true;

    case 'OPERATIONS_MANAGER':
      return [
        'dashboard',
        'inventory',
        'warehouses',
        'work-orders',
        'transfers',
        'orders',
      ].includes(page);

    case 'WAREHOUSE_OPERATOR':
      return [
        'dashboard',
        'inventory',
        'warehouses',
        'transfers',
        'orders',
      ].includes(page);

    case 'SALES_USER':
      return [
        'dashboard',
        'orders',
      ].includes(page);

    default:
      return false;
  }
}

export default function App() {
  const user = getCurrentUser();
  const role: UserRole = user?.role ?? 'SALES_USER';

  const allowedNavigation = navigation.filter((item) =>
    canAccessPage(role, item.id),
  );

  const defaultPage: Page =
    allowedNavigation.find((item) => item.id === 'dashboard')?.id ??
    allowedNavigation[0]?.id ??
    'dashboard';

  const [activePage, setActivePage] = useState<Page>(defaultPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeItem =
    navigation.find((item) => item.id === activePage) ??
    navigation.find((item) => item.id === 'dashboard');

  function logout() {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.reload();
  }

  function handleNavigation(page: Page) {
    if (!canAccessPage(role, page)) {
      return;
    }

    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
    <div className="erp-app">

      {sidebarOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          sidebarOpen ? 'sidebar--open' : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="brand-mark">O</div>

          <div>
            <h1>Operations ERP</h1>
            <span>Operations Management</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-title">
            WORKSPACE
          </p>

          {allowedNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id
                    ? 'nav-item--active'
                    : ''
                }`}
                onClick={() =>
                  handleNavigation(item.id)
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* USER */}
        <div className="sidebar-footer">
          <div className="user-card">

            <div className="user-avatar">
              {(user?.fullName?.charAt(0) || 'U').toUpperCase()}
            </div>

            <div className="user-info">
              <strong>
                {user?.fullName || 'User'}
              </strong>

              <span>
                {formatRole(role)}
              </span>
            </div>

            <button
              className="logout-button"
              title="Logout"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>

          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <p className="breadcrumb">
              Workspace /
            </p>

            <h2>
              {activeItem?.label ?? 'Dashboard'}
            </h2>
          </div>

          <div className="topbar-user">
            <div className="status-dot" />
            <span>System Online</span>
          </div>

        </header>

        <section className="page-content">

          {/* DASHBOARD */}
          {activePage === 'dashboard' && (
            <Dashboard
              userName={user?.fullName}
              role={role}
            />
          )}

          {/* INVENTORY */}
          {activePage === 'inventory' &&
            canAccessPage(role, 'inventory') && (
              <InventoryPage />
            )}

          {/* WAREHOUSES */}
          {activePage === 'warehouses' &&
            canAccessPage(role, 'warehouses') && (
              <WarehousePage />
            )}

          {/* WORK ORDERS */}
          {activePage === 'work-orders' &&
            canAccessPage(role, 'work-orders') && (
              <WorkOrdersPage />
            )}

          {/* TRANSFERS */}
          {activePage === 'transfers' &&
            canAccessPage(role, 'transfers') && (
              <TransfersPage />
            )}

          {activePage === 'orders' &&
  canAccessPage(role, 'orders') && (
    <SalesOrderPage />
)}

        </section>
      </main>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({
  userName,
  role,
}: {
  userName?: string;
  role: UserRole;
}) {
  const visibleModules = navigation.filter((item) =>
    canAccessPage(role, item.id),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            Operations overview
          </p>

          <h3>
            Good morning, {userName || 'User'}
          </h3>

          <p>
            Monitor and manage the operations
            available to your role.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {visibleModules
          .filter((item) => item.id !== 'dashboard')
          .map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="stat-card"
                key={item.id}
              >
                <div className="stat-icon">
                  <Icon size={20} />
                </div>

                <div>
                  <span>{item.label}</span>

                  <strong>—</strong>

                  <small>
                    Available to your role
                  </small>
                </div>
              </div>
            );
          })}
      </div>

      <div className="dashboard-grid">

        {/* WORKFLOW */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h4>Operations flow</h4>

              <p>
                Core workflow for today's
                operations.
              </p>
            </div>
          </div>

          <div className="workflow">

            {canAccessPage(role, 'inventory') && (
              <WorkflowStep
                number="01"
                title="Check Inventory"
                description="Review available stock across warehouses."
              />
            )}

            {canAccessPage(role, 'work-orders') && (
              <WorkflowStep
                number="02"
                title="Create Work Order"
                description="Plan production against required materials."
              />
            )}

            {canAccessPage(role, 'transfers') && (
              <WorkflowStep
                number="03"
                title="Transfer Stock"
                description="Move material between warehouses when required."
              />
            )}

            {canAccessPage(role, 'orders') && (
              <WorkflowStep
                number="04"
                title="Manage Customer Orders"
                description="Review and process customer demand."
              />
            )}

          </div>
        </div>

        {/* ACCESS */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h4>Access level</h4>

              <p>
                Current authenticated role.
              </p>
            </div>
          </div>

          <div className="system-status">

            <div className="status-row">
              <span>User</span>

              <strong>
                {userName || 'User'}
              </strong>
            </div>

            <div className="status-row">
              <span>Role</span>

              <strong>
                {formatRole(role)}
              </strong>
            </div>

            <div className="status-row">
              <span>Authentication</span>

              <strong className="online">
                Active
              </strong>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}

/* =========================
   WORKFLOW STEP
========================= */

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="workflow-step">

      <div className="workflow-number">
        {number}
      </div>

      <div>
        <strong>{title}</strong>

        <p>{description}</p>
      </div>

    </div>
  );
}

/* =========================
   ROLE FORMATTER
========================= */

function formatRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';

    case 'OPERATIONS_MANAGER':
      return 'Operations Manager';

    case 'WAREHOUSE_OPERATOR':
      return 'Warehouse Operator';

    case 'SALES_USER':
      return 'Sales User';

    default:
      return 'User';
  }
}