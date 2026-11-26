import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { money } from '../../../shared/formatters/money';
import { Summary } from '../../../types/finance';

export default function FinanceSummary({ summary }: { summary: Summary }) {
  return (
    <div className="cards">
      <article className="stat-card balance">
        <div className="stat-top"><span>Balance total</span><span className="stat-icon"><Wallet size={18} /></span></div>
        <strong>{money(summary.balanceCents)}</strong><small>Ingresos menos gastos</small>
      </article>
      <article className="stat-card">
        <div className="stat-top"><span>Ingresos</span><span className="stat-icon green"><ArrowDownLeft size={18} /></span></div>
        <strong>{money(summary.incomeCents)}</strong><small className="positive">Dinero recibido</small>
      </article>
      <article className="stat-card">
        <div className="stat-top"><span>Gastos</span><span className="stat-icon orange"><ArrowUpRight size={18} /></span></div>
        <strong>{money(summary.expenseCents)}</strong><small>Dinero gastado</small>
      </article>
    </div>
  );
}
