'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: number;
  name: string;
  speed: string;
  monthly_price: number;
}

export default function NewClientPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    ine: '',
    address: '',
    phone: '',
    email: '',
    contract_date: '',
    service_start_date: '',
    cutoff_day: 15,
    plan_id: 0,
    status: 'activo',
    notes: '',
  });

  useEffect(() => {
    api.getActivePlans().then(setPlans).catch(() => {});
  }, []);

  const calculateAnnualCost = (contractDate: string, monthlyCost: number): number => {
    if (!contractDate) return 0;
    const month = new Date(contractDate).getMonth() + 1;
    const remainingMonths = 12 - month + 1;
    return remainingMonths * monthlyCost;
  };

  const selectedPlan = plans.find((p) => p.id === form.plan_id);
  const monthlyCost = selectedPlan?.monthly_price || 0;
  const annualCost = calculateAnnualCost(form.contract_date, monthlyCost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plan_id) {
      setError('Selecciona un plan');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await api.createClient({
        ...form,
        contract_date: form.contract_date,
        service_start_date: form.service_start_date || form.contract_date,
      });
      router.push('/clients');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nuevo Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">Registra un nuevo cliente en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl card-shadow p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Nombre del cliente"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">INE</label>
              <input
                type="text"
                value={form.ine}
                onChange={(e) => setForm({ ...form, ine: e.target.value })}
                placeholder="Número de identificación"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Número de contacto"
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Dirección completa"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Service Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Información del Servicio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Contratación *</label>
              <input
                type="date"
                value={form.contract_date}
                onChange={(e) => setForm({ ...form, contract_date: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inicio del Servicio</label>
              <input
                type="date"
                value={form.service_start_date}
                onChange={(e) => setForm({ ...form, service_start_date: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día de Corte</label>
              <select
                value={form.cutoff_day}
                onChange={(e) => setForm({ ...form, cutoff_day: parseInt(e.target.value) })}
                className="w-full"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>Día {day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Contratado *</label>
              <select
                value={form.plan_id}
                onChange={(e) => setForm({ ...form, plan_id: parseInt(e.target.value) })}
                required
                className="w-full"
              >
                <option value={0}>Seleccionar plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.speed} - ${plan.monthly_price.toFixed(2)}/mes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full"
              >
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        {selectedPlan && (
          <div className="bg-primary-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wider mb-3">
              Resumen de Costos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-primary-600">Plan</p>
                <p className="font-semibold text-primary-800">{selectedPlan.name} ({selectedPlan.speed})</p>
              </div>
              <div>
                <p className="text-xs text-primary-600">Costo Mensual</p>
                <p className="font-semibold text-primary-800 text-lg">${monthlyCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-primary-600">Pago Anual Estimado</p>
                <p className="font-semibold text-primary-800 text-lg">${annualCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales..."
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/clients" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar Cliente</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
