import { FormEvent, useState } from 'react';
import { Wallet } from 'lucide-react';
import { login } from '../../shared/api/client';

type Props = { onLogin: (token: string) => void };

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('demo@finanzas.local');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onLogin(await login(email, password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión');
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-mark"><Wallet size={22} /></div>
        <h1>Finanza</h1>
        <p>Tu dinero, más claro.</p>
        {error && <div className="error">{error}</div>}
        <label>Correo<input value={email} onChange={event => setEmail(event.target.value)} type="email" required /></label>
        <label>Contraseña<input value={password} onChange={event => setPassword(event.target.value)} type="password" required /></label>
        <button className="primary full">Iniciar sesión</button>
        <small>Demo: demo@finanzas.local · Demo123!</small>
      </form>
    </main>
  );
}
