'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Edit2, Trash2, CreditCard, X, AlertCircle, Loader2, Search,
  DollarSign, TrendingDown, CheckCircle, AlertTriangle,
} from 'lucide-react';

interface Liability {
  id: number;
  concept: string;
  creditor: string;
  total_amount: number;
  paid_amount: number;
  monthly_payment: number | null;
  due_date: string | null;
  interest_rate: number | null;
  status: string;
  notes: string;
  is_active: boolean;
}

interface Summary {
  total_debt: number;
  total_paid: number;
  total_remaining: number;
  active_count: number;
}

export default function LiabilitiesPage() {
  const { isAdmin } = useAuth();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_debt: 0, total_paid: 0, total_remaining: 0, active_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({
    concept: '',
    creditor: '',
    total_amount: 0,
    paid_amount: 0,
    monthly_payment: 0,
    due_date: '',
    interest_rate: 0,
    status: 'activo',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [liabilitiesData, summaryData] = await Promise.all([
        api.getLiabilities(),
        api.getLiabilitiesSummary(),
      ]);
      setLiabilities(liabilitiesData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      concept: '',
      creditor: '',
      total_amount: 0,
      paid_amount: 0,
      monthly_payment: 0,
      due_date: '',
      interest_rate: 0,
      status: 'activo',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (l: Liability) => {
    setEditing(l);
    setForm({
      concept: l.concept,
      creditor: l.creditor || '',
      total_amount: l.total_amount,
      paid_amount: l.paid_amount,
      monthly_payment: l.monthly_payment || 0,
      due_date: l.due_date || '',
      interest_rate: l.interest_rate || 0,
      status: l.status,
      notes: l.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateLiability(editing.id, form);
      } else {
        await api.createLiability(form);
      }
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (l: Liability) => {
    if (!confirm(`¿Eliminar pasivo "${l.concept}"?`)) return;
    setDeleting(l.id);
    try {
      await api.deleteLiability(l.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return <span className="badge-warning">Activo</span>;
      case 'pagado': return <span className="badge-success">Pagado</span>;
      case 'vencido': return <span className="badge-danger">Vencido</span>;
      default: return <span className="badge-gray">{status}</span>;
    }
  };

  const filtered = liabilities.filter((l) =>
    l.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.creditor || '').toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pasivos</h1>
          <p className="text-sm text-gray-500 mt-1">Deudas y obligaciones de la empresa</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Pasivo
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-50">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Deuda</p>
              <p className="text-xl font-bold text-red-600">{fmt(summary.total_debt)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Ya Pagado</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(summary.total_paid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Por Pagar</p>
              <p className="text-xl font-bold text-amber-600">{fmt(summary.total_remaining)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <CreditCard className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Activos</p>
              <p className="text-xl font-bold text-blue-600">{summary.active_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar pasivos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Acreedor</th>
                <th>Deuda Total</th>
                <th>Pagado</th>
                <th>Restante</th>
                <th>Pago Mensual</th>
                <th>Vence</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const remaining = l.total_amount - l.paid_amount;
                const pct = l.total_amount > 0 ? (l.paid_amount / l.total_amount) * 100 : 0;
                return (
                  <tr key={l.id}>
                    <td className="font-medium text-gray-800">{l.concept}</td>
                    <td className="text-gray-500">{l.creditor || '—'}</td>
                    <td className="font-medium">{fmt(l.total_amount)}</td>
                    <td className="text-emerald-600">{fmt(l.paid_amount)}</td>
                    <td className="font-semibold text-red-600">{fmt(remaining)}</td>
                    <td>{l.monthly_payment ? fmt(l.monthly_payment) : '—'}</td>
                    <td className="text-sm">{l.due_date || '—'}</td>
                    <td>{getStatusBadge(l.status)}</td>
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(l)} className="btn-ghost text-xs">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(l)}
                            disabled={deleting === l.id}
                            className="btn-ghost text-xs text-red-500"
                          >
                            {deleting === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay pasivos registrados</p>
                    <button onClick={openCreateModal} className="btn-primary mt-4">
                      Registrar primer pasivo
                    </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editing ? 'Editar Pasivo' : 'Nuevo Pasivo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                <input type="text" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required className="w-full" placeholder="Ej: Préstamo Banco BBVA" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor</label>
                <input type="text" value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} className="w-full" placeholder="Ej: BBVA, Telmex..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ya Pagado ($)</label>
                  <input type="number" step="0.01" min="0" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: parseFloat(e.target.value) || 0 })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pago Mensual ($)</label>
                  <input type="number" step="0.01" min="0" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: parseFloat(e.target.value) || 0 })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Límite</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interés Anual %</label>
                  <input type="number" step="0.1" min="0" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: parseFloat(e.target.value) || 0 })} className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                  <option value="activo">Activo</option>
                  <option value="pagado">Pagado</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editing ? 'Guardar Cambios' : 'Crear Pasivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
