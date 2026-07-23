'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Trash2, Receipt, X, AlertCircle, Loader2, Search,
  DollarSign, CheckCircle, CreditCard, Send,
} from 'lucide-react';

interface ProviderPayment {
  id: number;
  date: string;
  creditor: string;
  liability_id: number | null;
  amount: number;
  concept: string;
  method: string;
  status: string;
  notes: string;
  created_at: string;
}

interface LiabilityOption {
  id: number;
  concept: string;
  total_amount: number;
  paid_amount: number;
  remaining: number;
  monthly_payment: number | null;
  status: string;
}

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<ProviderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  // Creditor / Liability selectors
  const [creditors, setCreditors] = useState<string[]>([]);
  const [selectedCreditor, setSelectedCreditor] = useState('');
  const [liabilityOptions, setLiabilityOptions] = useState<LiabilityOption[]>([]);
  const [loadingLiabilities, setLoadingLiabilities] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    creditor: '',
    liability_id: null as number | null,
    amount: 0,
    concept: '',
    method: 'efectivo',
    status: 'pagado',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [paymentsData, creditorsData] = await Promise.all([
        api.getProviderPayments(),
        api.getPaymentCreditors(),
      ]);
      setPayments(paymentsData);
      setCreditors(creditorsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load liabilities when creditor changes
  useEffect(() => {
    if (!selectedCreditor) {
      setLiabilityOptions([]);
      return;
    }
    setLoadingLiabilities(true);
    api.getLiabilitiesByCreditor(selectedCreditor)
      .then(setLiabilityOptions)
      .catch(() => setLiabilityOptions([]))
      .finally(() => setLoadingLiabilities(false));
  }, [selectedCreditor]);

  const openCreateModal = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      creditor: '',
      liability_id: null,
      amount: 0,
      concept: '',
      method: 'efectivo',
      status: 'pagado',
      notes: '',
    });
    setSelectedCreditor('');
    setLiabilityOptions([]);
    setShowModal(true);
  };

  const handleCreditorChange = (creditor: string) => {
    setSelectedCreditor(creditor);
    setForm({ ...form, creditor, liability_id: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createProviderPayment(form);
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: ProviderPayment) => {
    if (!confirm(`¿Eliminar pago a "${p.creditor}" por $${p.amount}?`)) return;
    setDeleting(p.id);
    try {
      await api.deleteProviderPayment(p.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'efectivo': return <span className="badge-success">Efectivo</span>;
      case 'transferencia': return <span className="badge-info">Transferencia</span>;
      case 'tarjeta': return <span className="badge-warning">Tarjeta</span>;
      case 'cheque': return <span className="badge-gray">Cheque</span>;
      default: return <span className="badge-gray">{method}</span>;
    }
  };

  const filtered = payments.filter((p) =>
    p.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.concept || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPaid = filtered.reduce((sum, p) => sum + p.amount, 0);
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
          <h1 className="text-2xl font-bold text-gray-800">Pagos a Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">Registra pagos realizados a proveedores y acreedores</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Pago
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Pagado</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <Receipt className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Movimientos</p>
              <p className="text-xl font-bold text-blue-600">{filtered.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-50">
              <CreditCard className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Proveedores</p>
              <p className="text-xl font-bold text-purple-600">{creditors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar pagos..."
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
                <th>Fecha</th>
                <th>Acreedor</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Pasivo Vinculado</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="text-sm text-gray-600">{p.date}</td>
                  <td className="font-medium text-gray-800">{p.creditor}</td>
                  <td className="text-gray-500">{p.concept || '—'}</td>
                  <td className="font-semibold text-red-600">-{fmt(p.amount)}</td>
                  <td>{getMethodBadge(p.method)}</td>
                  <td className="text-sm">
                    {p.liability_id ? (
                      <span className="badge-info">#{p.liability_id}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    <span className="badge-success">Pagado</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                        className="btn-ghost text-xs text-red-500"
                      >
                        {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay pagos registrados</p>
                    <button onClick={openCreateModal} className="btn-primary mt-4">
                      Registrar primer pago
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
              <h2 className="text-lg font-semibold text-gray-800">Nuevo Pago a Proveedor</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor / Proveedor *</label>
                <select
                  value={selectedCreditor}
                  onChange={(e) => handleCreditorChange(e.target.value)}
                  required
                  className="w-full"
                >
                  <option value="">Seleccionar acreedor...</option>
                  {creditors.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Los acreedores provienen de los pasivos registrados
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vincular a Pasivo (opcional)
                </label>
                <select
                  value={form.liability_id || ''}
                  onChange={(e) => setForm({ ...form, liability_id: e.target.value ? Number(e.target.value) : null })}
                  disabled={!selectedCreditor || loadingLiabilities}
                  className="w-full"
                >
                  <option value="">Sin vincular</option>
                  {liabilityOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} — {l.concept} — Restante: ${l.remaining.toFixed(2)}
                    </option>
                  ))}
                </select>
                {loadingLiabilities && (
                  <p className="text-xs text-gray-400 mt-1">Cargando pasivos...</p>
                )}
                {selectedCreditor && !loadingLiabilities && liabilityOptions.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">No hay pasivos activos para este acreedor</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                  <input
                    type="text"
                    value={form.concept}
                    onChange={(e) => setForm({ ...form, concept: e.target.value })}
                    className="w-full"
                    placeholder="Ej: Pago mensual internet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Registrar Pago</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
