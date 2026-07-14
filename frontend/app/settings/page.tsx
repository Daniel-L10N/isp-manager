'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Save, Loader2, AlertCircle, Building2, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    company_name: '',
    company_logo: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    currency: 'MXN',
  });

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setForm(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateSettings(form);
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary-50">
          <SettingsIcon className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">Configura los datos de tu empresa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl card-shadow p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg">
            {success}
          </div>
        )}

        {/* Company Information */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Información de la Empresa
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full"
                placeholder="Mi ISP"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={form.company_address}
                onChange={(e) => setForm({ ...form, company_address: e.target.value })}
                className="w-full"
                placeholder="Dirección de la empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={form.company_phone}
                onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                className="w-full"
                placeholder="Número de contacto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={form.company_email}
                onChange={(e) => setForm({ ...form, company_email: e.target.value })}
                className="w-full"
                placeholder="correo@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full"
              >
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="USD">USD - Dólar Americano</option>
                <option value="EUR">EUR - Euro</option>
                <option value="COP">COP - Peso Colombiano</option>
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="CLP">CLP - Peso Chileno</option>
                <option value="PEN">PEN - Sol Peruano</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL del Logotipo
              </label>
              <input
                type="text"
                value={form.company_logo}
                onChange={(e) => setForm({ ...form, company_logo: e.target.value })}
                className="w-full"
                placeholder="URL de la imagen (opcional)"
              />
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Información del Sistema
          </h3>
          <div className="space-y-1 text-sm text-gray-500">
            <p>Versión: 1.0.0</p>
            <p>Base de datos: SQLite (local)</p>
            <p>Los datos se almacenan localmente en el servidor</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="w-4 h-4" /> Guardar Configuración</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
