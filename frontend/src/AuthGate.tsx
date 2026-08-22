import { useEffect, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from './api';

type UserRole =
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'WAREHOUSE_OPERATOR'
  | 'SALES_USER';

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
};

type MeResponse = {
  user: User;
};

type LoginResponse = {
  token: string;
  user: User;
};

export default function AuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');

    if (!token) {
      setLoading(false);
      return;
    }

    apiGet<MeResponse>('/api/auth/me')
      .then((response) => {
        localStorage.setItem('erp_user', JSON.stringify(response.user));
        setAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        setAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">
          <strong>Loading Operations ERP...</strong>
          <span>Checking authentication</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await apiPost<LoginResponse>(
        '/api/auth/login',
        {
          email,
          password,
        },
      );

      localStorage.setItem('erp_token', response.token);
      localStorage.setItem(
        'erp_user',
        JSON.stringify(response.user),
      );

      window.location.reload();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">O</div>

        <h1>Operations ERP</h1>
        <p>Sign in to continue</p>

        <form onSubmit={handleLogin}>
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="admin@example.com"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              required
            />
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}