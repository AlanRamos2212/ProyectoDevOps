import { useEffect, useState } from 'react';
import LoginPage from '../features/auth/LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '');

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  if (!token) return <LoginPage onLogin={setToken} />;

  return <DashboardPage token={token} onLogout={() => setToken('')} />;
}
