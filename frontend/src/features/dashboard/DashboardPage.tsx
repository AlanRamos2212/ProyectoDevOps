import { useCallback, useEffect, useState } from 'react';
import { LogOut, Plus, Wallet } from 'lucide-react';
import { request } from '../../shared/api/client';
import { Summary, Transaction, TransactionDraft } from '../../types/finance';
import FinanceSummary from './components/FinanceSummary';
import MonthlyFlowChart from './components/MonthlyFlowChart';
import NewTransactionDialog from '../transactions/components/NewTransactionDialog';
import TransactionList from '../transactions/components/TransactionList';

type Props = { token: string; onLogout: () => void };

const emptySummary: Summary = { incomeCents: 0, expenseCents: 0, balanceCents: 0, byMonth: [] };

export default function DashboardPage({ token, onLogout }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, totals] = await Promise.all([
        request<{ data: Transaction[] }>(token, '/transactions'),
        request<{ data: Summary }>(token, '/dashboard/summary')
      ]);
      setTransactions(list.data);
      setSummary(totals.data);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error de conexión');
    }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function saveTransaction(transaction: TransactionDraft) {
    try {
      await request(token, '/transactions', { method: 'POST', body: JSON.stringify(transaction) });
      setShowForm(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error');
    }
  }

  async function deleteTransaction(id: number) {
    try {
      await request(token, `/transactions/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Error');
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Wallet size={20} /></div><b>Finanza</b></div>
        <nav><span className="nav-label">GENERAL</span><a className="active">▦　Resumen</a><a>↕　Movimientos</a><a>◷　Reportes</a></nav>
        <div className="side-bottom">
          <div className="user-avatar">D</div><div className="user-info"><b>Demo User</b><small>Cuenta personal</small></div>
          <button className="icon-button" title="Cerrar sesión" onClick={onLogout}><LogOut size={17} /></button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="crumb">Finanza　›　Resumen</span></div><button className="icon-button" title="Cerrar sesión" onClick={onLogout}><LogOut size={18} /></button></header>
        <section className="content">
          <div className="page-heading">
            <div><p className="eyebrow">TU RESUMEN FINANCIERO</p><h1>¡Hola! 👋</h1><p className="muted">Aquí está el estado de tus finanzas.</p></div>
            <button className="primary" onClick={() => setShowForm(true)}><Plus size={18} /> Nuevo movimiento</button>
          </div>
          {error && <div className="error">{error}</div>}
          <FinanceSummary summary={summary} />
          <MonthlyFlowChart summary={summary} />
          <TransactionList transactions={transactions} onDelete={id => void deleteTransaction(id)} />
        </section>
      </main>
      {showForm && <NewTransactionDialog onClose={() => setShowForm(false)} onSave={saveTransaction} />}
    </div>
  );
}
