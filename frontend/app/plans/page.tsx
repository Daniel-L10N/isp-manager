'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Wifi, X, AlertCircle, Loader2, Search } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  speed: string;
  monthly_price: number;
  description: string;
  is_active: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    speed: '',
    monthly_price: 0,
    description: '',
    is_active: true,
  });

  const fetchPlans = useCallback(async () => {
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.speed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingPlan(null);
    setForm({ name: '', speed: '', monthly_price: 0, description: '', is_active: true });
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      speed: plan.speed,
      monthly_price: plan.monthly_price,
      description: plan.description || '',
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, form);
      } else {
        await api.createPlan(form);
      }
      setShowModal(false);
      await fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    try {
      await api.deletePlan(plan.id);
      await fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-800">Planes de Internet</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los planes de servicio</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar planes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 w-full"
        />
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl card-shadow hover:shadow-lg transition-all duration-300 ${
              !plan.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary-50">
                    <Wifi className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.speed}</p>
                  </div>
                </div>
                <span className={plan.is_active ? 'badge-success' : 'badge-gray'}>
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-3xl font-bold text-primary-600">
                  ${plan.monthly_price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">por mes</p>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {plan.description}
                </p>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(plan)}
                  className="btn-secondary flex-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(plan)}
                  className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPlans.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Wifi className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm">No hay planes registrados</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              Crear primer plan
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ej: Plan Básico"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Velocidad</label>
                  <input
                    type="text"
                    value={form.speed}
                    onChange={(e) => setForm({ ...form, speed: e.target.value })}
                    required
                    placeholder="Ej: 50 Mbps"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Mensual ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthly_price}
                  onChange={(e) => setForm({ ...form, monthly_price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Detalles del plan..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Plan activo</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  ) : (
                    editingPlan ? 'Guardar Cambios' : 'Crear Plan'
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
