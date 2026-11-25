import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, Plus, Search, LogOut } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './style.css';

type Tx = { id: number; type: 'income'|'expense'; amountCents: number; category: string; description: string; date: string };
type Summary = { incomeCents: number; expenseCents: number; balanceCents: number; byMonth: { month: string; type: string; amountCents: number }[] };
const api = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const money = (cents: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '');
  const [email, setEmail] = useState('demo@finanzas.local');
  const [password, setPassword] = useState('Demo123!');
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<Summary>({ incomeCents: 0, expenseCents: 0, balanceCents: 0, byMonth: [] });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Alimentación', description: '', date: new Date().toISOString().slice(0,10) });

  async function call(path: string, init: RequestInit = {}) {
    const response = await fetch(`${api}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
    if (!response.ok) throw new Error((await response.json()).error ?? 'Ocurrió un error');
    return response.status === 204 ? null : response.json();
  }
  async function refresh() {
    try {
      const [list, totals] = await Promise.all([call('/transactions'), call('/dashboard/summary')]);
      setTransactions(list.data); setSummary(totals.data); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión'); }
  }
  useEffect(() => { if (token) { localStorage.setItem('token', token); void refresh(); } else localStorage.removeItem('token'); }, [token]);
  const visible = useMemo(() => filter === 'all' ? transactions : transactions.filter(t => t.type === filter), [filter, transactions]);
  const chart = useMemo(() => {
    const months = new Map<string, { month: string; income: number; expense: number }>();
    for (const row of summary.byMonth) {
      const item = months.get(row.month) ?? { month: row.month, income: 0, expense: 0 };
      item[row.type === 'income' ? 'income' : 'expense'] = row.amountCents / 100;
      months.set(row.month, item);
    }
    return [...months.values()];
  }, [summary]);

  if (!token) return <main className="login-wrap"><form className="login-card" onSubmit={async e => { e.preventDefault(); try { const result = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await result.json(); if (!result.ok) throw new Error(data.error); setToken(data.token); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión'); } }}><div className="brand-mark"><Wallet size={22}/></div><h1>Finanza</h1><p>Tu dinero, más claro.</p>{error && <div className="error">{error}</div>}<label>Correo<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label><label>Contraseña<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></label><button className="primary full">Iniciar sesión</button><small>Demo: demo@finanzas.local · Demo123!</small></form></main>;

  return <div className="layout"><aside className="sidebar"><div className="brand"><div className="brand-mark"><Wallet size={20}/></div><b>Finanza</b></div><nav><span className="nav-label">GENERAL</span><a className="active">▦　Resumen</a><a>↕　Movimientos</a><a>◷　Reportes</a></nav><div className="side-bottom"><div className="user-avatar">D</div><div className="user-info"><b>Demo User</b><small>Cuenta personal</small></div><button className="icon-button" title="Cerrar sesión" onClick={()=>setToken('')}><LogOut size={17}/></button></div></aside>
    <main className="main"><header className="topbar"><div><span className="crumb">Finanza　›　Resumen</span></div><button className="icon-button" title="Cerrar sesión" onClick={()=>setToken('')}><LogOut size={18}/></button></header><section className="content"><div className="page-heading"><div><p className="eyebrow">TU RESUMEN FINANCIERO</p><h1>¡Hola! 👋</h1><p className="muted">Aquí está el estado de tus finanzas.</p></div><button className="primary" onClick={()=>setShowForm(true)}><Plus size={18}/> Nuevo movimiento</button></div>
      {error && <div className="error">{error}</div>}<div className="cards"><article className="stat-card balance"><div className="stat-top"><span>Balance total</span><span className="stat-icon"><Wallet size={18}/></span></div><strong>{money(summary.balanceCents)}</strong><small>Ingresos menos gastos</small></article><article className="stat-card"><div className="stat-top"><span>Ingresos</span><span className="stat-icon green"><ArrowDownLeft size={18}/></span></div><strong>{money(summary.incomeCents)}</strong><small className="positive">Dinero recibido</small></article><article className="stat-card"><div className="stat-top"><span>Gastos</span><span className="stat-icon orange"><ArrowUpRight size={18}/></span></div><strong>{money(summary.expenseCents)}</strong><small>Dinero gastado</small></article></div>
      <section className="panel chart-panel"><div className="panel-head"><div><h2>Flujo de dinero</h2><p className="muted">Ingresos y gastos por mes</p></div><span className="period">Este año⌄</span></div><div className="chart">{chart.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4263eb" stopOpacity={.2}/><stop offset="95%" stopColor="#4263eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>money(Number(v)*100)}/><Area type="monotone" dataKey="income" stroke="#4263eb" fill="url(#income)" strokeWidth={3}/><Area type="monotone" dataKey="expense" stroke="#f59f00" fill="#fff4d6" strokeWidth={2}/></AreaChart></ResponsiveContainer> : <div className="empty-chart">Registra movimientos para ver tu flujo mensual.</div>}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>Movimientos recientes</h2><p className="muted">Revisa tus ingresos y gastos</p></div><div className="filters"><Search size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></select></div></div><div className="table-wrap"><table><thead><tr><th>Descripción</th><th>Categoría</th><th>Fecha</th><th className="right">Monto</th><th></th></tr></thead><tbody>{visible.map(t=><tr key={t.id}><td><b>{t.description || t.category}</b><small className="mobile-date">{t.date}</small></td><td><span className="category-pill">{t.category}</span></td><td>{t.date}</td><td className={`right amount ${t.type}`}>{t.type==='income'?'+':'−'}{money(t.amountCents)}</td><td><button className="delete" onClick={async()=>{await call(`/transactions/${t.id}`,{method:'DELETE'}); await refresh();}}>Eliminar</button></td></tr>)}{visible.length===0&&<tr><td colSpan={5} className="empty">Aún no hay movimientos. Agrega el primero.</td></tr>}</tbody></table></div></section>
    </section></main>
    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={async e=>{e.preventDefault();try{await call('/transactions',{method:'POST',body:JSON.stringify({type:form.type,amountCents:Math.round(Number(form.amount)*100),category:form.category,description:form.description,date:form.date})});setShowForm(false);setForm({...form,amount:'',description:''});await refresh();}catch(e){setError(e instanceof Error?e.message:'Error');}}}><div className="panel-head"><h2>Nuevo movimiento</h2><button type="button" className="icon-button" onClick={()=>setShowForm(false)}>×</button></div><label>Tipo<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label><label>Monto (MXN)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Alimentación','Vivienda','Transporte','Salud','Entretenimiento','Sueldo','Otros'].map(x=><option key={x}>{x}</option>)}</select></label><label>Descripción<input maxLength={250} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Fecha<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><button className="primary full">Guardar movimiento</button></form></div>}
  </div>;
}

