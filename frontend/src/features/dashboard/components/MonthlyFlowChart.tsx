import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../../../shared/formatters/money';
import { Summary } from '../../../types/finance';

export default function MonthlyFlowChart({ summary }: { summary: Summary }) {
  const chart = useMemo(() => {
    const months = new Map<string, { month: string; income: number; expense: number }>();
    for (const row of summary.byMonth) {
      const item = months.get(row.month) ?? { month: row.month, income: 0, expense: 0 };
      item[row.type === 'income' ? 'income' : 'expense'] = row.amountCents / 100;
      months.set(row.month, item);
    }
    return [...months.values()];
  }, [summary]);

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div><h2>Flujo de dinero</h2><p className="muted">Ingresos y gastos por mes</p></div>
        <span className="period">Este año⌄</span>
      </div>
      <div className="chart">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4263eb" stopOpacity={.2} />
                  <stop offset="95%" stopColor="#4263eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => money(Number(value) * 100)} />
              <Area type="monotone" dataKey="income" stroke="#4263eb" fill="url(#income)" strokeWidth={3} />
              <Area type="monotone" dataKey="expense" stroke="#f59f00" fill="#fff4d6" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="empty-chart">Registra movimientos para ver tu flujo mensual.</div>}
      </div>
    </section>
  );
}
