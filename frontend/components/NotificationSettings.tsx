'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Phone, Save, Loader2, Send, ChevronDown, ChevronUp,
} from 'lucide-react';

interface SMSConfig {
  sms_enabled: boolean;
  sms_url: string;
  sms_api_key: string;
  sms_reminders_enabled: boolean;
  sms_cutoff_enabled: boolean;
  sms_suspension_enabled: boolean;
  sms_payment_enabled: boolean;
  sms_reminder_days: number;
  sms_message_reminder: string;
  sms_message_cutoff: string;
  sms_message_suspension: string;
  sms_message_payment: string;
}

export default function NotificationSettings() {
  const [config, setConfig] = useState<SMSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE = '';

const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sms/config`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (err) {
      console.error('Failed to load SMS config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = (key: keyof SMSConfig, value: any) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/sms/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Configuración guardada correctamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión al guardar');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/sms/test`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const data = await res.json();
      setTestResult(data.success ? '✅ Conectado' : `❌ ${data.error || data.message}`);
    } catch {
      setTestResult('❌ Error de conexión');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Configuración SMS
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-xl card-shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Configuración SMS
          </h3>
        </div>
        <p className="text-red-500 text-sm text-center py-4">
          Error al cargar la configuración
        </p>
      </div>
    );
  }

  const notificationToggles = [
    {
      key: 'sms_reminders_enabled' as const,
      label: 'Recordatorios de Pago',
      desc: 'Envía SMS antes del vencimiento',
    },
    {
      key: 'sms_cutoff_enabled' as const,
      label: 'Aviso de Corte',
      desc: 'Envía SMS el día anterior al corte',
    },
    {
      key: 'sms_suspension_enabled' as const,
      label: 'Aviso de Suspensión',
      desc: 'Envía SMS al suspender servicio',
    },
    {
      key: 'sms_payment_enabled' as const,
      label: 'Confirmación de Pago',
      desc: 'Envía SMS al registrar pago',
    },
  ];

  const messageTemplates = [
    { key: 'sms_message_reminder' as const, label: 'Recordatorio de pago' },
    { key: 'sms_message_cutoff' as const, label: 'Aviso de corte' },
    { key: 'sms_message_suspension' as const, label: 'Aviso de suspensión' },
    { key: 'sms_message_payment' as const, label: 'Confirmación de pago' },
  ];

  return (
    <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Configuración SMS
        </h3>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-700">Habilitar SMS</p>
          <p className="text-sm text-gray-500">Activa el envío de mensajes vía SMS Manager</p>
        </div>
        <button
          type="button"
          onClick={() => updateConfig('sms_enabled', !config.sms_enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.sms_enabled ? 'bg-primary-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.sms_enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Config fields (shown when enabled) */}
      {config.sms_enabled && (
        <>
          {/* Connection Settings */}
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700">Conexión</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL SMS Manager
              </label>
              <input
                type="text"
                value={config.sms_url}
                onChange={(e) => updateConfig('sms_url', e.target.value)}
                className="w-full"
                placeholder="http://localhost:3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={config.sms_api_key}
                  onChange={(e) => updateConfig('sms_api_key', e.target.value)}
                  className="flex-1"
                  placeholder="sms_..."
                />
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testing}
                  className="btn-primary whitespace-nowrap"
                >
                  {testing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Probando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Probar conexión</>
                  )}
                </button>
              </div>
              {testResult && (
                <p
                  className={`mt-1 text-sm ${
                    testResult.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {testResult}
                </p>
              )}
            </div>
          </div>

          {/* Notification Toggles */}
          <div className="space-y-3 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700">Tipos de notificación</h4>

            {notificationToggles.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig(key, !config[key])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config[key] ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Reminder Days */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días antes del corte (recordatorio)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.sms_reminder_days}
              onChange={(e) =>
                updateConfig('sms_reminder_days', parseInt(e.target.value) || 3)
              }
              className="w-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se enviará un recordatorio {config.sms_reminder_days}{' '}
              {config.sms_reminder_days === 1 ? 'día' : 'días'} antes del corte
            </p>
          </div>

          {/* Message Templates (Collapsible) */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowMessages(!showMessages)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                Personalizar mensajes
              </span>
              {showMessages ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showMessages && (
              <div className="p-4 space-y-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Variables: {'{nombre}'} {'{monto}'} {'{fecha_corte}'} {'{dias_restantes}'}{' '}
                  {'{plan}'} {'{velocidad}'}
                </p>

                {messageTemplates.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <textarea
                      value={config[key] as string}
                      onChange={(e) => updateConfig(key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar configuración</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
