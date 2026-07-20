'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Save, Loader2, AlertCircle, Building2, Settings as SettingsIcon,
  MessageSquare, Phone, Clock, Send, CheckCircle, XCircle, Wifi, WifiOff,
} from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Company settings
  const [form, setForm] = useState({
    company_name: '',
    company_logo: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    currency: 'MXN',
  });

  // WhatsApp settings
  const [whatsappStatus, setWhatsappStatus] = useState<{
    connected: boolean;
    phone?: string;
    name?: string;
  } | null>(null);
  const [automation, setAutomation] = useState({
    reminder_days_before: 3,
    reminder_enabled: true,
    isp_whatsapp_number: '',
  });
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState('');

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

  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      const status = await api.getWhatsAppStatus();
      setWhatsappStatus(status);
    } catch {
      setWhatsappStatus({ connected: false });
    }
  }, []);

  const fetchAutomation = useCallback(async () => {
    try {
      const data = await api.getAutomationSettings();
      setAutomation(data);
    } catch {
      // Use defaults
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchWhatsAppStatus();
    fetchAutomation();
  }, [fetchSettings, fetchWhatsAppStatus, fetchAutomation]);

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

  const handleSaveAutomation = async () => {
    setSavingAutomation(true);
    setError('');
    setSuccess('');

    try {
      await api.updateAutomationSettings(automation);
      setSuccess('Automatizaciones guardadas correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      setError('Ingresa un número de teléfono para la prueba');
      return;
    }

    setSendingTest(true);
    setTestResult('');
    setError('');

    try {
      const result = await api.sendWhatsAppMessage({
        phone: testPhone.trim(),
        message: `Hola! Este es un mensaje de prueba de ISP Manager.\n\nSi recibes esto, el servicio de WhatsApp está funcionando correctamente.`,
      });
      setTestResult('Mensaje enviado correctamente');
      setTimeout(() => setTestResult(''), 5000);
    } catch (err: any) {
      setError(`Error al enviar: ${err.message}`);
    } finally {
      setSendingTest(false);
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

      {/* Error/Success Messages */}
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

      {/* Company Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl card-shadow p-6 space-y-6">
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

      {/* WhatsApp / Automatizaciones Section */}
      <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Automatizaciones - WhatsApp
          </h3>
        </div>

        {/* Connection Status */}
        <div className={`p-4 rounded-lg border ${
          whatsappStatus?.connected
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {whatsappStatus?.connected ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                whatsappStatus?.connected ? 'text-emerald-800' : 'text-red-800'
              }`}>
                {whatsappStatus?.connected
                  ? 'WhatsApp Conectado'
                  : 'WhatsApp Desconectado'}
              </p>
              {whatsappStatus?.connected && whatsappStatus.phone && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Número: {whatsappStatus.phone} | Nombre: {whatsappStatus.name || 'N/A'}
                </p>
              )}
              {!whatsappStatus?.connected && (
                <p className="text-xs text-red-600 mt-0.5">
                  Escanea el código QR en http://10.0.25.2:8081 para conectar
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-700">Configuración de Recordatorios</h4>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Habilitar Recordatorios</p>
              <p className="text-xs text-gray-500">Enviar mensajes automáticos antes del corte</p>
            </div>
            <button
              type="button"
              onClick={() => setAutomation({ ...automation, reminder_enabled: !automation.reminder_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                automation.reminder_enabled ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                automation.reminder_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enviar recordatorio antes del corte
            </label>
            <div className="flex gap-2">
              {[3, 2, 1].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAutomation({ ...automation, reminder_days_before: days })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    automation.reminder_days_before === days
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {days} {days === 1 ? 'día' : 'días'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Se enviará un recordatorio {automation.reminder_days_before} {automation.reminder_days_before === 1 ? 'día' : 'días'} antes del día de corte de cada cliente
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número WhatsApp del ISP (para recibir respuestas)
            </label>
            <input
              type="tel"
              value={automation.isp_whatsapp_number}
              onChange={(e) => setAutomation({ ...automation, isp_whatsapp_number: e.target.value })}
              className="w-full"
              placeholder="521234567890 (código país + número)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este número se usará cuando el bot esté integrado para recibir mensajes
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveAutomation}
              disabled={savingAutomation}
              className="btn-primary"
            >
              {savingAutomation ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar Automatizaciones</>
              )}
            </button>
          </div>
        </div>

        {/* Test Message */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-700">Enviar Mensaje de Prueba</h4>
          </div>

          <div className="flex gap-2">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="flex-1"
              placeholder="5659341070"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest || !whatsappStatus?.connected}
              className="btn-primary"
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Enviar</>
              )}
            </button>
          </div>

          {testResult && (
            <p className="text-sm text-emerald-600 mt-2">{testResult}</p>
          )}

          {!whatsappStatus?.connected && (
            <p className="text-xs text-red-500 mt-2">
              Conecta WhatsApp primero para enviar mensajes de prueba
            </p>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSettings />

      {/* System Info */}
      <div className="bg-white rounded-xl card-shadow p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Información del Sistema
        </h3>
        <div className="space-y-1 text-sm text-gray-500">
          <p>Versión: 1.0.0</p>
          <p>Base de datos: SQLite (local)</p>
          <p>Los datos se almacenan localmente en el servidor</p>
          <p>WhatsApp Service: Puerto 3001 (localhost)</p>
          <p>QR Page: Puerto 8081 (nginx)</p>
        </div>
      </div>
    </div>
  );
}
