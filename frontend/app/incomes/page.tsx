'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Trash2, DollarSign, X, AlertCircle, Loader2, Search,
  TrendingUp, Calendar, User,
} from 'lucide-react';

interface Income {
  id: number;
  date: string;
  client_id: number | null;
  client_name: string;
  amount: number;
  concept: string;
  method: string;
  cash_movement_id: number | null;
  notes: string;
}

interface ClientOption {
  id: number;
  name: string;
  monthly_cost: number;
}

interface Summary {
  month_total: number;
  year_total: number;
  total_all: number;
  total_records: number;
}

export default function IncomesPage() {
  const { isAdmin } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [summary, setSummary] = useState<Summary>({ month_total: 0, year_total: 0, total_all: 0, total_records: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    client_id: null as number | null,
    amount: 0,
    concept: '',
    method: 'efectivo',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [inc, cli, summ] = await Promise.all([
        api.getIncomes(),
        api.getIncomeClients(),
        api.getIncomeSummary(),
      ]);
      setIncomes(inc);
      setClients(cli);
      setSummary(summ);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      client_id: null,
      amount: 0,
      concept: '',
      method: 'efectivo',
      notes: '',
    });
    setShowModal(true);
  };

  const handleClientSelect = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    setForm({
      ...form,
      client_id: clientId,
      amount: client?.monthly_cost || 0,
      concept: `Pago mensual ${client?.name || ''}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createIncome(form);
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inc: Income) => {
    if (!confirm(`¿Eliminar ingreso de "${inc.client_name}" por $${inc.amount}?`)) return;
    setDeleting(inc.id);
    try {
      await api.deleteIncome(inc.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = incomes.filter((i) =>
    (i.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.concept || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de pagos de clientes</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" /> Registrar Ingreso
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50">
              <Calendar className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Este Mes</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(summary.month_total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Este Año</p>
              <p className="text-xl font-bold text-blue-600">{fmt(summary.year_total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-50">
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Histórico</p>
              <p className="text-xl font-bold text-purple-600">{fmt(summary.total_all)}</p>
              <p className="text-xs text-gray-400">{summary.total_records} registros</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por cliente o concepto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 w-full" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Caja</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="text-sm text-gray-600">{i.date}</td>
                  <td className="font-medium text-gray-800">{i.client_name || '—'}</td>
                  <td className="text-gray-500">{i.concept || '—'}</td>
                  <td className="font-semibold text-emerald-600">+{fmt(i.amount)}</td>
                  <td className="text-sm">{i.method}</td>
                  <td>
                    {i.cash_movement_id ? (
                      <span className="badge-success text-xs">#{i.cash_movement_id}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => handleDelete(i)} disabled={deleting === i.id} className="btn-ghost text-xs text-red-500">
                        {deleting === i.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay ingresos registrados</p>
                    <button onClick={openCreateModal} className="btn-primary mt-4">Registrar primer ingreso</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Registrar Ingreso</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={form.client_id || ''} onChange={(e) => e.target.value ? handleClientSelect(Number(e.target.value)) : setForm({ ...form, client_id: null })} className="w-full">
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — ${c.monthly_cost}/mes</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input type="text" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} className="w-full" placeholder="Ej: Pago mensual internet" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                Este ingreso se registrará automáticamente en Caja.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : 'Registrar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
