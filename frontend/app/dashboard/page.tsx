'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Wallet,
  TrendingUp,
  Calendar,
  Package,
  Building2,
  Users,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DashboardData {
  cash_funds: number;
  monthly_income: number;
  yearly_income: number;
  expected_monthly_income: number;
  expected_yearly_income: number;
  total_assets: number;
  total_capital: number;
  active_clients: number;
  suspended_clients: number;
  delinquent_clients: number;
  total_clients: number;
  upcoming_payments: Array<{
    client_id: string;
    client_name: string;
    cutoff_day: number;
    amount: number;
    days_remaining: number;
  }>;
}

function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('MXN');

  const fetchData = useCallback(async () => {
    try {
      const [dashboardData, settings] = await Promise.all([
        api.getDashboard(),
        api.getSettings().catch(() => ({ currency: 'MXN' })),
      ]);
      setData(dashboardData);
      setCurrency(settings.currency || 'MXN');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchData} className="btn-primary mt-4">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const financialCards = [
    {
      title: 'Fondos en Caja',
      value: formatCurrency(data.cash_funds, currency),
      icon: Wallet,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Ingreso Esperado (Mes)',
      value: formatCurrency(data.expected_monthly_income, currency),
      subtitle: formatCurrency(data.monthly_income, currency) + ' cobrado',
      icon: TrendingUp,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Ingreso Esperado (Año)',
      value: formatCurrency(data.expected_yearly_income, currency),
      subtitle: formatCurrency(data.yearly_income, currency) + ' cobrado',
      icon: Calendar,
      color: 'bg-violet-500',
      bg: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
    {
      title: 'Valor de Bienes',
      value: formatCurrency(data.total_assets, currency),
      icon: Package,
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Capital Total',
      value: formatCurrency(data.total_capital, currency),
      icon: Building2,
      color: 'bg-indigo-500',
      bg: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
  ];

  const clientCards = [
    {
      title: 'Clientes Activos',
      value: data.active_clients,
      icon: Users,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Clientes Suspendidos',
      value: data.suspended_clients,
      icon: Users,
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Clientes Morosos',
      value: data.delinquent_clients,
      icon: AlertCircle,
      color: 'bg-red-500',
      bg: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      title: 'Total Clientes',
      value: data.total_clients,
      icon: Users,
      color: 'bg-primary-500',
      bg: 'bg-primary-50',
      textColor: 'text-primary-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen general de tu empresa
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-sm">
          Actualizar
        </button>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl p-5 card-shadow hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {card.title}
              </p>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {card.value}
              </p>
              {(card as any).subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {(card as any).subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clientCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl p-5 card-shadow hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Payments */}
      <div className="bg-white rounded-xl card-shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Próximos Pagos (5 días)
            </h2>
          </div>
        </div>
        <div className="p-6">
          {data.upcoming_payments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No hay pagos próximos</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>ID</th>
                    <th>Día de Corte</th>
                    <th>Monto</th>
                    <th>Días Restantes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming_payments.map((payment) => (
                    <tr key={payment.client_id}>
                      <td className="font-medium text-gray-800">
                        {payment.client_name}
                      </td>
                      <td className="text-gray-500">{payment.client_id}</td>
                      <td>Día {payment.cutoff_day}</td>
                      <td className="font-medium">
                        {formatCurrency(payment.amount, currency)}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.days_remaining <= 1
                              ? 'bg-red-100 text-red-700'
                              : payment.days_remaining <= 3
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {payment.days_remaining === 0
                            ? 'Hoy'
                            : `${payment.days_remaining} día${payment.days_remaining > 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td>
                        <span className="badge-warning">Pendiente</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
