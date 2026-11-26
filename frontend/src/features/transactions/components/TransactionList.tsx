import { useState } from 'react';
import { Search } from 'lucide-react';
import { money } from '../../../shared/formatters/money';
import { Transaction } from '../../../types/finance';

type Props = { transactions: Transaction[]; onDelete: (id: number) => void };

export default function TransactionList({ transactions, onDelete }: Props) {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? transactions : transactions.filter(transaction => transaction.type === filter);

  return (
    <section className="panel">
      <div className="panel-head">
        <div><h2>Movimientos recientes</h2><p className="muted">Revisa tus ingresos y gastos</p></div>
        <div className="filters">
          <Search size={16} />
          <select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Descripción</th><th>Categoría</th><th>Fecha</th><th className="right">Monto</th><th></th></tr></thead>
          <tbody>
            {visible.map(transaction => (
              <tr key={transaction.id}>
                <td><b>{transaction.description || transaction.category}</b><small className="mobile-date">{transaction.date}</small></td>
                <td><span className="category-pill">{transaction.category}</span></td>
                <td>{transaction.date}</td>
                <td className={`right amount ${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'}{money(transaction.amountCents)}</td>
                <td><button className="delete" onClick={() => onDelete(transaction.id)}>Eliminar</button></td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={5} className="empty">Aún no hay movimientos. Agrega el primero.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
