'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Edit2, Trash2, Wallet, X, AlertCircle, Loader2, Search,
  DollarSign, Calendar, Clock, AlertTriangle, CheckCircle,
  Receipt, TrendingDown, History, ChevronDown, Send,
} from 'lucide-react';

interface Expense {
  id: number;
  concept: string;
  category: string;
  provider: string;
  amount: number;
  frequency: string;
  payment_day: number | null;
  start_date: string;
  last_paid_date: string | null;
  notes: string;
  is_active: boolean;
  next_due_date: string | null;
  is_overdue: boolean;
  total_paid: number;
  payment_count: number;
}

interface ExpensePayment {
  id: number;
  expense_id: number;
  date: string;
  amount: number;
  method: string;
  concept: string;
  notes: string;
}

interface Summary {
  total_monthly: number;
  total_active: number;
  total_overdue: number;
  total_paid_year: number;
  categories: Record<string, number>;
}

const FREQ_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  '18meses': 'Cada 18 meses',
};

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
};

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_monthly: 0, total_active: 0, total_overdue: 0, total_paid_year: 0, categories: {} });
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [paying, setPaying] = useState<Expense | null>(null);
  const [historyExpense, setHistoryExpense] = useState<Expense | null>(null);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [frequencies, setFrequencies] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'upcoming'>('all');

  const [form, setForm] = useState({
    concept: '',
    category: '',
    provider: '',
    amount: 0,
    frequency: 'mensual',
    payment_day: 1,
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'efectivo',
    concept: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [exp, summ, cats, freqs] = await Promise.all([
        api.getExpenses(),
        api.getExpensesSummary(),
        api.getExpenseCategories(),
        api.getExpenseFrequencies(),
      ]);
      setExpenses(exp);
      setSummary(summ);
      setCategories(cats);
      setFrequencies(freqs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      concept: '',
      category: categories[0] || '',
      provider: '',
      amount: 0,
      frequency: 'mensual',
      payment_day: 1,
      start_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowFormModal(true);
  };

  const openEditModal = (e: Expense) => {
    setEditing(e);
    setForm({
      concept: e.concept,
      category: e.category,
      provider: e.provider || '',
      amount: e.amount,
      frequency: e.frequency,
      payment_day: e.payment_day || 1,
      start_date: e.start_date,
      notes: e.notes || '',
    });
    setShowFormModal(true);
  };

  const openPayModal = (e: Expense) => {
    setPaying(e);
    setPayForm({
      date: new Date().toISOString().split('T')[0],
      amount: e.amount,
      method: 'efectivo',
      concept: e.concept,
      notes: '',
    });
    setShowPayModal(true);
  };

  const openHistoryModal = async (e: Expense) => {
    setHistoryExpense(e);
    setShowHistoryModal(true);
    try {
      const data = await api.getExpensePayments(e.id);
      setPayments(data);
    } catch {
      setPayments([]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateExpense(editing.id, form);
      } else {
        await api.createExpense(form);
      }
      setShowFormModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    if (!paying) return;
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.recordExpensePayment(paying.id, { ...payForm, expense_id: paying.id });
      setShowPayModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`¿Eliminar gasto "${exp.concept}" y todo su historial?`)) return;
    setDeleting(exp.id);
    try {
      await api.deleteExpense(exp.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('¿Eliminar este registro de pago?')) return;
    try {
      await api.deleteExpensePayment(paymentId);
      if (historyExpense) {
        const data = await api.getExpensePayments(historyExpense.id);
        setPayments(data);
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getFreqLabel = (freq: string) => FREQ_LABELS[freq] || freq;

  const getDueStatus = (exp: Expense) => {
    if (exp.is_overdue) return <span className="badge-danger">Vencido</span>;
    if (!exp.next_due_date) return <span className="badge-gray">Sin fecha</span>;
    const days = Math.ceil((new Date(exp.next_due_date).getTime() - Date.now()) / 86400000);
    if (days <= 7) return <span className="badge-warning">Próximo ({days}d)</span>;
    return <span className="badge-success">Al día</span>;
  };

  const filtered = expenses.filter((e) => {
    const matchSearch = e.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.provider || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'overdue') return matchSearch && e.is_overdue;
    if (activeTab === 'upcoming') return matchSearch && !e.is_overdue && e.next_due_date;
    return matchSearch;
  });

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gastos Operativos</h1>
          <p className="text-sm text-gray-500 mt-1">Gastos recurrentes y fijos del negocio</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Gasto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Gasto Mensual</p>
              <p className="text-xl font-bold text-blue-600">{fmt(summary.total_monthly)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Gastos Activos</p>
              <p className="text-xl font-bold text-emerald-600">{summary.total_active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-50">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Vencidos</p>
              <p className="text-xl font-bold text-red-600">{summary.total_overdue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-50">
              <Receipt className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Pagado Año</p>
              <p className="text-xl font-bold text-purple-600">{fmt(summary.total_paid_year)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(summary.categories).length > 0 && (
        <div className="bg-white rounded-xl p-5 card-shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Distribución Mensual por Categoría</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(summary.categories).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 truncate">{cat.split(' (')[0]}</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {(['all', 'overdue', 'upcoming'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'all' ? 'Todos' : tab === 'overdue' ? 'Vencidos' : 'Próximos'}
              {tab === 'overdue' && summary.total_overdue > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-400 text-white text-xs rounded-full">{summary.total_overdue}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar gastos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 w-full"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Frecuencia</th>
                <th>Próximo Pago</th>
                <th>Estado</th>
                <th>Pagos</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className={e.is_overdue ? 'bg-red-50/50' : ''}>
                  <td className="font-medium text-gray-800">{e.concept}</td>
                  <td className="text-sm text-gray-500">{e.category?.split(' (')[0] || '—'}</td>
                  <td className="text-sm text-gray-500">{e.provider || '—'}</td>
                  <td className="font-semibold">{fmt(e.amount)}</td>
                  <td><span className="badge-info text-xs">{getFreqLabel(e.frequency)}</span></td>
                  <td className="text-sm">{e.next_due_date || '—'}</td>
                  <td>{getDueStatus(e)}</td>
                  <td className="text-sm text-gray-500">{e.payment_count} ({fmt(e.total_paid)})</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openPayModal(e)} className="btn-ghost text-xs text-emerald-600" title="Registrar pago">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openHistoryModal(e)} className="btn-ghost text-xs" title="Historial">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEditModal(e)} className="btn-ghost text-xs" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          disabled={deleting === e.id}
                          className="btn-ghost text-xs text-red-500"
                          title="Eliminar"
                        >
                          {deleting === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-gray-400">
                    <Wallet className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay gastos registrados</p>
                    <button onClick={openCreateModal} className="btn-primary mt-4">
                      Registrar primer gasto
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editing ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                <input type="text" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required className="w-full" placeholder="Ej: Pago luz eléctrica" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="w-full">
                    <option value="">Seleccionar...</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input type="text" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full" placeholder="Ej: CFE" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto por Pago ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required className="w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia *</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} required className="w-full">
                    {frequencies.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago</label>
                  <input type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: parseInt(e.target.value) || 1 })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editing ? 'Guardar Cambios' : 'Crear Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Registrar Pago</h2>
                <p className="text-sm text-gray-500">{paying.concept}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={payForm.amount || ''} onChange={(e) => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })} required className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="w-full">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input type="text" value={payForm.concept} onChange={(e) => setPayForm({ ...payForm, concept: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                Este pago se registrará automáticamente como egreso en Caja.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : <><Send className="w-4 h-4" /> Registrar Pago</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Historial de Pagos</h2>
                <p className="text-sm text-gray-500">{historyExpense.concept}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {payments.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay pagos registrados</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.concept || historyExpense.concept}</p>
                          <p className="text-xs text-gray-400">{p.date} · {METHOD_LABELS[p.method] || p.method}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-emerald-600">{fmt(p.amount)}</span>
                        {isAdmin && (
                          <button onClick={() => handleDeletePayment(p.id)} className="btn-ghost text-xs text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between text-sm">
                <span className="text-gray-500">Total pagado:</span>
                <span className="font-bold text-gray-800">{fmt(payments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
