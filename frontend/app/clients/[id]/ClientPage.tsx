'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft, Save, Loader2, AlertCircle,
  User, Phone, Mail, MapPin, FileText, Calendar,
  CreditCard, Plus, X, DollarSign,
} from 'lucide-react';
import Link from 'next/link';

interface Plan {
  id: number;
  name: string;
  speed: string;
  monthly_price: number;
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  method: string;
  status: string;
  notes: string;
}

interface Client {
  id: number;
  client_id: string;
  name: string;
  ine: string;
  address: string;
  phone: string;
  email: string;
  contract_date: string;
  service_start_date: string;
  cutoff_day: number;
  plan_id: number;
  monthly_cost: number;
  annual_cost: number;
  status: string;
  notes: string;
  plan: Plan;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [form, setForm] = useState({
    name: '', ine: '', address: '', phone: '', email: '',
    contract_date: '', service_start_date: '', cutoff_day: 15,
    plan_id: 0, status: 'activo', notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'efectivo',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [clientData, paymentsData, plansData] = await Promise.all([
        api.getClient(clientId),
        api.getClientPayments(clientId),
        api.getActivePlans(),
      ]);
      setClient(clientData);
      setPayments(paymentsData);
      setPlans(plansData);
      setForm({
        name: clientData.name,
        ine: clientData.ine || '',
        address: clientData.address || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        contract_date: clientData.contract_date,
        service_start_date: clientData.service_start_date || '',
        cutoff_day: clientData.cutoff_day,
        plan_id: clientData.plan_id,
        status: clientData.status,
        notes: clientData.notes || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateClient(clientId, form);
      setClient(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.recordPayment(clientId, paymentForm);
      setShowPaymentModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return <span className="badge-success">Activo</span>;
      case 'suspendido': return <span className="badge-warning">Suspendido</span>;
      case 'cancelado': return <span className="badge-danger">Cancelado</span>;
      default: return <span className="badge-gray">{status}</span>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'efectivo': return <span className="badge-success">Efectivo</span>;
      case 'transferencia': return <span className="badge-info">Transferencia</span>;
      case 'tarjeta': return <span className="badge-warning">Tarjeta</span>;
      default: return <span className="badge-gray">{method}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">Cliente no encontrado</p>
        <Link href="/clients" className="btn-primary mt-4 inline-flex">
          Volver a Clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
              {getStatusBadge(client.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">{client.client_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-success"
          >
            <DollarSign className="w-4 h-4" />
            Registrar Pago
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary"
          >
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Client Info */}
      <div className="bg-white rounded-xl card-shadow p-6">
        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">INE</label>
                <input type="text" value={form.ine} onChange={(e) => setForm({ ...form, ine: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: parseInt(e.target.value) })} className="w-full">
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ${p.monthly_price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Contratación</label>
                <input type="date" value={form.contract_date} onChange={(e) => setForm({ ...form, contract_date: e.target.value })} required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inicio Servicio</label>
                <input type="date" value={form.service_start_date} onChange={(e) => setForm({ ...form, service_start_date: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Día de Corte</label>
                <select value={form.cutoff_day} onChange={(e) => setForm({ ...form, cutoff_day: parseInt(e.target.value) })} className="w-full">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Nombre</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">INE</p>
                  <p className="font-medium">{client.ine || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="font-medium">{client.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-medium">{client.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Dirección</p>
                  <p className="font-medium">{client.address || '—'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Contratación</p>
                  <p className="font-medium">{client.contract_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Inicio Servicio</p>
                  <p className="font-medium">{client.service_start_date || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Plan / Corte</p>
                  <p className="font-medium">{client.plan?.name} — Día {client.cutoff_day}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Costos</p>
                  <p className="font-medium">${client.monthly_cost.toFixed(2)}/mes — ${(client.annual_cost || 0).toFixed(2)}/año</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl card-shadow">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Historial de Pagos</h2>
          <button onClick={() => setShowPaymentModal(true)} className="btn-success text-sm">
            <Plus className="w-4 h-4" />
            Nuevo Pago
          </button>
        </div>
        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <DollarSign className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.date}</td>
                      <td className="font-medium">${payment.amount.toFixed(2)}</td>
                      <td>{getPaymentMethodBadge(payment.method)}</td>
                      <td>
                        <span className={payment.status === 'pagado' ? 'badge-success' : payment.status === 'pendiente' ? 'badge-warning' : 'badge-danger'}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">{payment.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Registrar Pago</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-success">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
