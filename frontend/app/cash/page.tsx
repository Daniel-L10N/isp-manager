'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Wallet, Plus, X, AlertCircle, Loader2,
  ArrowUpRight, ArrowDownRight, Calendar, Search,
} from 'lucide-react';

interface Movement {
  id: number;
  date: string;
  type: string;
  concept: string;
  amount: number;
  notes: string;
}

export default function CashPage() {
  const [currentFunds, setCurrentFunds] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    concept: '',
    amount: 0,
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getCashStatus();
      setCurrentFunds(data.current_funds);
      setMovements(data.movements);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (type: 'ingreso' | 'egreso') => {
    setModalType(type);
    setForm({
      date: new Date().toISOString().split('T')[0],
      concept: '',
      amount: 0,
      notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (modalType === 'ingreso') {
        await api.registerIncome(form);
      } else {
        await api.registerExpense(form);
      }
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredMovements = movements.filter((m) =>
    m.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-800">Caja</h1>
          <p className="text-sm text-gray-500 mt-1">Control de ingresos y egresos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal('ingreso')} className="btn-success">
            <Plus className="w-4 h-4" />
            Registrar Ingreso
          </button>
          <button onClick={() => openModal('egreso')} className="btn-danger">
            <Plus className="w-4 h-4" />
            Registrar Egreso
          </button>
        </div>
      </div>

      {/* Current Funds Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl card-shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary-200" />
              <p className="text-primary-200 text-sm font-medium uppercase tracking-wider">
                Fondos en Caja
              </p>
            </div>
            <p className="text-4xl font-bold">${currentFunds.toFixed(2)}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-300">
                ${movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0).toFixed(2)}
              </p>
              <p className="text-xs text-primary-200">Total Ingresos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-300">
                ${movements.filter((m) => m.type === 'egreso').reduce((s, m) => s + m.amount, 0).toFixed(2)}
              </p>
              <p className="text-xs text-primary-200">Total Egresos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Movements */}
      <div className="bg-white rounded-xl card-shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Movimientos</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 w-full"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Wallet className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {movement.date}
                        </span>
                      </td>
                      <td>
                        <span className={movement.type === 'ingreso' ? 'badge-success' : 'badge-danger'}>
                          {movement.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="font-medium text-gray-800">{movement.concept}</td>
                      <td>
                        <span className={`font-semibold ${movement.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {movement.type === 'ingreso' ? '+' : '-'}${movement.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{movement.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {modalType === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                <input
                  type="text"
                  value={form.concept}
                  onChange={(e) => setForm({ ...form, concept: e.target.value })}
                  required
                  placeholder="Descripción del movimiento"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={modalType === 'ingreso' ? 'btn-success' : 'btn-danger'}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    modalType === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso'
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
