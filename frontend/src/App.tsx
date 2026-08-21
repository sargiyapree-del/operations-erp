import { useEffect, useState } from 'react';

type HealthStatus = 'checking' | 'available' | 'unavailable';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function App() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/api/health`, { signal: controller.signal })
      .then((response) => {
        setHealthStatus(response.ok ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealthStatus('unavailable');
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="app-title">
        <p className="eyebrow">Foundation ready</p>
        <h1 id="app-title">Operations ERP</h1>
        <p>
          The web and API foundations are connected. Operations modules will be added in the next phase.
        </p>
        <p className={`health health--${healthStatus}`} role="status">
          API status: {healthStatus}
        </p>
      </section>
    </main>
  );
}

export default App;
