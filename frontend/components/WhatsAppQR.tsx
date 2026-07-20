'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Loader2, RefreshCw, QrCode, CheckCircle, XCircle, LogOut } from 'lucide-react';

interface WhatsAppQRProps {
  onStatusChange?: (connected: boolean) => void;
}

export default function WhatsAppQR({ onStatusChange }: WhatsAppQRProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await api.getWhatsAppStatus();
      setConnected(status.connected);
      if (status.connected) {
        setPhone(status.phone || '');
        setName(status.name || '');
        setQrImage(null);
        setError('');
      }
      onStatusChange?.(status.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  const fetchQR = useCallback(async () => {
    if (connected) return;
    try {
      const data = await api.getWhatsAppQR();
      if (data.qr) {
        setQrImage(data.qr);
        setError('');
      } else if (data.connected) {
        setConnected(true);
        setQrImage(null);
      }
    } catch {
      setError('Error al obtener el código QR');
    }
  }, [connected]);

  useEffect(() => {
    checkStatus();
    intervalRef.current = setInterval(() => {
      checkStatus();
      if (!connected) {
        fetchQR();
      }
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkStatus, fetchQR, connected]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logoutWhatsApp();
      setConnected(false);
      setQrImage(null);
      setPhone('');
      setName('');
      checkStatus();
    } catch (err: any) {
      setError('Error al cerrar sesión: ' + err.message);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <span className="ml-2 text-sm text-gray-500">Verificando estado...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className={`p-4 rounded-lg border ${
        connected
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                connected ? 'text-emerald-800' : 'text-amber-800'
              }`}>
                {connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              </p>
              {connected && phone && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {name && `${name} - `}Número: {phone}
                </p>
              )}
            </div>
          </div>
          {connected && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* QR Code Display */}
      {!connected && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-700">Código QR de WhatsApp</h4>
          </div>

          {qrImage ? (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-4">
                <img
                  src={qrImage}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Escanea este código con tu celular
              </p>
              <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
                <p>1. Abre WhatsApp en tu celular</p>
                <p>2. Ve a <strong>Dispositivos vinculados</strong></p>
                <p>3. Toca <strong>Vincular dispositivo</strong></p>
                <p>4. Escanea el código QR de arriba</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
              <p className="text-sm text-gray-500">Generando código QR...</p>
              <button
                onClick={fetchQR}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions when connected */}
      {connected && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium mb-1">WhatsApp conectado y listo para usar.</p>
          <p className="text-xs text-gray-500">
            Puedes enviar mensajes de prueba desde la sección de abajo.
          </p>
        </div>
      )}
    </div>
  );
}
