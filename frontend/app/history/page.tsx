'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { History, Filter, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Circle } from 'lucide-react';

interface HistoryEntry {
  id: number;
  date: string;
  time: string;
  user: string;
  type: string;
  description: string;
  amount: number | null;
  balance_after: number | null;
}

const TYPE_ICONS: Record<string, { label: string; color: string }> = {
  ingreso: { label: 'Ingreso', color: 'text-emerald-600 bg-emerald-50' },
  egreso: { label: 'Egreso', color: 'text-red-600 bg-red-50' },
  pago_cliente: { label: 'Pago Cliente', color: 'text-blue-600 bg-blue-50' },
  compra_bien: { label: 'Compra Bien', color: 'text-violet-600 bg-violet-50' },
  alta_cliente: { label: 'Alta Cliente', color: 'text-indigo-600 bg-indigo-50' },
  edicion: { label: 'Edición', color: 'text-amber-600 bg-amber-50' },
  eliminacion: { label: 'Eliminación', color: 'text-red-600 bg-red-50' },
};

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchHistory = useCallback(async () => {
    try {
      const params: any = { limit: pageSize, offset: page * pageSize };
      if (typeFilter) params.type = typeFilter;
      const data = await api.getHistory(params);
      setEntries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await api.getHistoryTypes();
      setTypes(data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const getTypeInfo = (type: string) => {
    return TYPE_ICONS[type] || { label: type, color: 'text-gray-600 bg-gray-50' };
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '—';
    const isPositive = amount >= 0;
    return (
      <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}{amount.toFixed(2)}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-800">Historial</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de todas las actividades del sistema</p>
        </div>
        <button onClick={fetchHistory} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="w-full sm:w-56"
          >
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_ICONS[t]?.label || t}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-400">
          Mostrando {entries.length} registros
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {entries.map((entry) => {
          const info = getTypeInfo(entry.type);
          return (
            <div
              key={entry.id}
              className="bg-white rounded-xl card-shadow hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={`p-2.5 rounded-lg ${info.color} flex-shrink-0`}>
                    {entry.type === 'ingreso' || entry.type === 'pago_cliente' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : entry.type === 'egreso' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {entry.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.color}`}>
                            {info.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {entry.date} {entry.time}
                          </span>
                          <span className="text-xs text-gray-400">
                            por {entry.user}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {entry.amount !== null && (
                          <p className="text-sm font-semibold">
                            {formatAmount(entry.amount)}
                          </p>
                        )}
                        {entry.balance_after !== null && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Saldo: ${entry.balance_after.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm">No hay registros en el historial</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {entries.length === pageSize && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(page + 1)}
            className="btn-secondary"
          >
            Cargar más registros
          </button>
        </div>
      )}
      {page > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(page - 1)}
            className="btn-ghost"
          >
            Anteriores
          </button>
        </div>
      )}
    </div>
  );
}
