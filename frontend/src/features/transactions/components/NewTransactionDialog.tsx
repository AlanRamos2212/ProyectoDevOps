import { FormEvent, useState } from 'react';
import { TransactionDraft } from '../../../types/finance';

type Props = { onClose: () => void; onSave: (transaction: TransactionDraft) => Promise<void> };

export default function NewTransactionDialog({ onClose, onSave }: Props) {
  const [form, setForm] = useState({
    type: 'expense' as TransactionDraft['type'],
    amount: '',
    category: 'Alimentación',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      type: form.type,
      amountCents: Math.round(Number(form.amount) * 100),
      category: form.category,
      description: form.description,
      date: form.date
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={event => event.stopPropagation()} onSubmit={event => void handleSubmit(event)}>
        <div className="panel-head">
          <h2>Nuevo movimiento</h2>
          <button type="button" className="icon-button" onClick={onClose}>×</button>
        </div>
        <label>Tipo<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as TransactionDraft['type'] })}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>
        <label>Monto (MXN)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
        <label>Categoría<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento', 'Sueldo', 'Otros'].map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Descripción<input maxLength={250} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <label>Fecha<input type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <button className="primary full">Guardar movimiento</button>
      </form>
    </div>
  );
}
