'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  ArrowUpRight, ArrowDownRight, ChevronDown,
  Printer, User, Tag, CreditCard,
} from 'lucide-react';

interface ProfitDetailItem {
  date: string;
  concept: string;
  amount: number;
  notes: string;
  client_name: string;
  category: string;
  method: string;
}

interface ProfitData {
  period: string;
  start_date: string;
  end_date: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  margin_percent: number;
  income_count: number;
  expense_count: number;
  income_items: ProfitDetailItem[];
  expense_items: ProfitDetailItem[];
}

interface MonthlyData {
  month: number;
  month_name: string;
  income: number;
  expenses: number;
  profit: number;
}

const PERIODS = [
  { value: 'mes', label: 'Este Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
  { value: 'todos', label: 'Todos' },
  { value: 'custom', label: 'Personalizado' },
];

const MONTHS_ES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const PERIOD_LABELS: Record<string, string> = {
  mes: 'Este Mes',
  trimestre: 'Trimestre',
  semestre: 'Semestre',
  ano: 'Ano',
  todos: 'Todos los tiempos',
  custom: 'Personalizado',
};

function getPrintCSS(): string {
  return [
    '@media print {',
    '@page { margin: 12mm 15mm; size: A4 portrait; }',
    '.screen-only { display: none !important; }',
    '.print-only { display: block !important; }',
    '.print-area { display: block !important; visibility: visible !important; position: relative; width: 100%; font-family: Segoe UI, Arial, sans-serif; color: #111; background: #fff; padding: 0; }',
    '.print-area * { visibility: visible !important; }',
    '.print-header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 16px; }',
    '.print-header h1 { font-size: 20px; margin: 0 0 4px 0; }',
    '.print-header p { font-size: 11px; color: #555; margin: 2px 0; }',
    '.print-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }',
    '.print-box { border: 1px solid #ccc; border-radius: 4px; padding: 8px; text-align: center; }',
    '.print-box .lbl { font-size: 9px; text-transform: uppercase; color: #666; }',
    '.print-box .val { font-size: 16px; font-weight: 700; margin: 2px 0; }',
    '.print-box .sub { font-size: 9px; color: #888; }',
    '.c-green { color: #059669; }',
    '.c-red { color: #dc2626; }',
    '.c-blue { color: #2563eb; }',
    '.print-section { font-size: 13px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 14px 0 6px 0; color: #333; }',
    '.print-tbl { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; }',
    '.print-tbl th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 5px 6px; border: 1px solid #ddd; font-size: 9px; text-transform: uppercase; color: #555; }',
    '.print-tbl td { padding: 4px 6px; border: 1px solid #eee; vertical-align: top; }',
    '.print-tbl tbody tr:nth-child(even) { background: #fafafa; }',
    '.print-tbl tfoot td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #ccc; }',
    '.print-tbl .tr { text-align: right; }',
    '.a-pos { color: #059669; font-weight: 600; }',
    '.a-neg { color: #dc2626; font-weight: 600; }',
    '.print-groups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }',
    '.print-gbox { border: 1px solid #e5e7eb; border-radius: 3px; padding: 5px 7px; font-size: 9px; }',
    '.print-gbox .gl { font-weight: 600; text-transform: uppercase; color: #555; }',
    '.print-gbox .gv { font-size: 12px; font-weight: 700; }',
    '.print-gbox .gc { color: #999; }',
    '.print-footer { border-top: 1px solid #ddd; margin-top: 16px; padding-top: 6px; text-align: center; font-size: 9px; color: #999; }',
    '.avoid-break { page-break-inside: avoid; }',
    '.print-break { page-break-before: always; }',
    '}',
  ].join('\n');
}

export default function ProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showIncome, setShowIncome] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);

  useEffect(() => {
    const el = document.getElementById('print-css-inject');
    if (el) el.remove();
    const style = document.createElement('style');
    style.id = 'print-css-inject';
    style.textContent = getPrintCSS();
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const fetchData = useCallback(async (period: string, start?: string, end?: string) => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && start && end) {
        params.start_date = start;
        params.end_date = end;
      }
      const [profitData, monthly] = await Promise.all([
        api.getProfit(params),
        api.getMonthlyProfit(new Date().getFullYear()),
      ]);
      setData(profitData);
      setMonthlyData(monthly);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPeriod === 'custom') {
      if (customStart && customEnd) {
        fetchData('custom', customStart, customEnd);
      }
    } else {
      fetchData(selectedPeriod);
    }
  }, [selectedPeriod, customStart, customEnd, fetchData]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  const isProfit = (data?.net_profit || 0) >= 0;
  const handlePrint = () => { window.print(); };

  const expensesByCategory = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, { items: ProfitDetailItem[]; total: number }> = {};
    for (const item of data.expense_items) {
      const cat = item.category || 'Sin categoria';
      if (!groups[cat]) groups[cat] = { items: [], total: 0 };
      groups[cat].items.push(item);
      groups[cat].total += item.amount;
    }
    return groups;
  }, [data?.expense_items]);

  const incomesByClient = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, { items: ProfitDetailItem[]; total: number }> = {};
    for (const item of data.income_items) {
      const client = item.client_name || 'Otro';
      if (!groups[client]) groups[client] = { items: [], total: 0 };
      groups[client].items.push(item);
      groups[client].total += item.amount;
    }
    return groups;
  }, [data?.income_items]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6 screen-only">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Utilidad Neta</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresos vs Gastos en el periodo seleccionado</p>
          </div>
          <button onClick={handlePrint} className="btn-secondary text-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>

        <div className="bg-white rounded-xl card-shadow p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-500">Periodo:</span>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === p.value
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2 ml-4">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <span className="text-gray-400">a</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            )}
          </div>
          {data && <p className="text-xs text-gray-400 mt-2">{data.start_date} &mdash; {data.end_date}</p>}
        </div>
      </div>

      {data && (
        <div className="print-area">
          {data && (
            <div className="print-only" style={{ display: 'none' }}>
              <div className="print-header">
                <h1>Reporte de Utilidad Neta</h1>
                <p><strong>Periodo:</strong> {PERIOD_LABELS[data.period] || data.period} | {data.start_date} &mdash; {data.end_date}</p>
                <p>Generado: {new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX')}</p>
              </div>
              <div className="print-summary">
                <div className="print-box"><div className="lbl">Ingresos</div><div className="val c-green">{fmt(data.total_income)}</div><div className="sub">{data.income_count} registros</div></div>
                <div className="print-box"><div className="lbl">Gastos</div><div className="val c-red">{fmt(data.total_expenses)}</div><div className="sub">{data.expense_count} registros</div></div>
                <div className="print-box"><div className="lbl">Utilidad Neta</div><div className={`val ${isProfit ? 'c-green' : 'c-red'}`}>{fmt(data.net_profit)}</div><div className="sub">{isProfit ? 'Ganancia' : 'Perdida'}</div></div>
                <div className="print-box"><div className="lbl">Margen</div><div className="val c-blue">{data.margin_percent}%</div><div className="sub">sobre ingresos</div></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 screen-only">
            <div className="bg-white rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-50"><ArrowUpRight className="w-6 h-6 text-emerald-500" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Ingresos</p>
                  <p className="text-xl font-bold text-emerald-600">{fmt(data.total_income)}</p>
                  <p className="text-xs text-gray-400">{data.income_count} movimientos</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-50"><ArrowDownRight className="w-6 h-6 text-red-500" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Gastos</p>
                  <p className="text-xl font-bold text-red-600">{fmt(data.total_expenses)}</p>
                  <p className="text-xs text-gray-400">{data.expense_count} movimientos</p>
                </div>
              </div>
            </div>
            <div className={`bg-white rounded-xl p-5 card-shadow border-l-4 ${isProfit ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {isProfit ? <TrendingUp className="w-6 h-6 text-emerald-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Utilidad Neta</p>
                  <p className={`text-xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(data.net_profit)}</p>
                  <p className={`text-xs ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>{isProfit ? 'Ganancia' : 'Perdida'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-50"><Percent className="w-6 h-6 text-blue-500" /></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Margen</p>
                  <p className="text-xl font-bold text-blue-600">{data.margin_percent}%</p>
                  <p className="text-xs text-gray-400">de utilidad sobre ingresos</p>
                </div>
              </div>
            </div>
          </div>

          {Object.keys(expensesByCategory).length > 0 && (
            <div className="avoid-break">
              <div className="print-section">Gastos por Categoria</div>
              <div className="print-groups">
                {Object.entries(expensesByCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, info]) => (
                  <div key={cat} className="print-gbox">
                    <div className="gl">{cat}</div>
                    <div className="gv c-red">{fmt(info.total)}</div>
                    <div className="gc">{info.items.length} registro{info.items.length > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(incomesByClient).length > 0 && (
            <div className="avoid-break">
              <div className="print-section">Ingresos por Cliente</div>
              <div className="print-groups">
                {Object.entries(incomesByClient).sort((a, b) => b[1].total - a[1].total).map(([client, info]) => (
                  <div key={client} className="print-gbox">
                    <div className="gl">{client}</div>
                    <div className="gv c-green">{fmt(info.total)}</div>
                    <div className="gc">{info.items.length} pago{info.items.length > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="avoid-break">
            <div className="print-section">Detalle de Ingresos &mdash; {fmt(data.total_income)}</div>
            <table className="print-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Cliente</th>
                  <th>Metodo</th>
                  <th className="tr">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.income_items.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: '12px' }}>No hay ingresos en este periodo</td></tr>
                ) : data.income_items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.date}</td>
                    <td>{item.concept}</td>
                    <td>{item.client_name || '\u2014'}</td>
                    <td>{item.method || '\u2014'}</td>
                    <td className="tr a-pos">+{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              {data.income_items.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total Ingresos ({data.income_count} registros)</td>
                    <td className="tr a-pos">+{fmt(data.total_income)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="avoid-break">
            <div className="print-section">Detalle de Gastos &mdash; {fmt(data.total_expenses)}</div>
            <table className="print-tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoria</th>
                  <th>Metodo</th>
                  <th className="tr">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.expense_items.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: '12px' }}>No hay gastos en este periodo</td></tr>
                ) : data.expense_items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.date}</td>
                    <td>{item.concept}</td>
                    <td>{item.category || '\u2014'}</td>
                    <td>{item.method || '\u2014'}</td>
                    <td className="tr a-neg">-{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              {data.expense_items.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total Gastos ({data.expense_count} registros)</td>
                    <td className="tr a-neg">-{fmt(data.total_expenses)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div style={{ borderTop: '2px solid #222', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>UTILIDAD NETA DEL PERIODO</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: isProfit ? '#059669' : '#dc2626' }}>
              {fmt(data.net_profit)} ({data.margin_percent}%)
            </span>
          </div>

          {monthlyData.length > 0 && (
            <div className="print-break avoid-break">
              <div className="print-section">Resumen Mensual {new Date().getFullYear()}</div>
              <table className="print-tbl">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="tr">Ingresos</th>
                    <th className="tr">Gastos</th>
                    <th className="tr">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 600 }}>{m.month_name}</td>
                      <td className="tr a-pos">{fmt(m.income)}</td>
                      <td className="tr a-neg">{fmt(m.expenses)}</td>
                      <td className={`tr ${m.profit >= 0 ? 'a-pos' : 'a-neg'}`}>{fmt(m.profit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total Anual</td>
                    <td className="tr a-pos">{fmt(monthlyData.reduce((s, m) => s + m.income, 0))}</td>
                    <td className="tr a-neg">{fmt(monthlyData.reduce((s, m) => s + m.expenses, 0))}</td>
                    <td className={`tr ${monthlyData.reduce((s, m) => s + m.profit, 0) >= 0 ? 'a-pos' : 'a-neg'}`}>
                      {fmt(monthlyData.reduce((s, m) => s + m.profit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="print-footer">Fibraya ISP &mdash; Sistema de Gestion | Generado {new Date().toLocaleDateString('es-MX')}</div>
        </div>
      )}

      {data && (
        <>
          <div className="space-y-6 screen-only" style={{ marginTop: '24px' }}>
            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <button onClick={() => setShowIncome(!showIncome)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50"><ArrowUpRight className="w-5 h-5 text-emerald-500" /></div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">Detalle de Ingresos</h3>
                    <p className="text-sm text-emerald-600 font-bold">{fmt(data.total_income)} &mdash; {data.income_count} registros</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showIncome ? 'rotate-180' : ''}`} />
              </button>
              {showIncome && (
                <div className="border-t border-gray-100 max-h-96 overflow-y-auto">
                  {data.income_items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No hay ingresos en este periodo</p>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Fecha</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Concepto</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Cliente</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Metodo</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.income_items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm text-gray-500">{item.date}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{item.concept}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">
                              {item.client_name ? <span className="flex items-center gap-1"><User className="w-3 h-3 text-emerald-400" />{item.client_name}</span> : <span className="text-gray-300">&mdash;</span>}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-500">
                              {item.method ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs"><CreditCard className="w-3 h-3" />{item.method}</span> : <span className="text-gray-300">&mdash;</span>}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-emerald-600 text-right">+{fmt(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50 font-bold">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-sm text-emerald-700">Total Ingresos</td>
                          <td className="px-4 py-2 text-sm text-emerald-700 text-right">+{fmt(data.total_income)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl card-shadow overflow-hidden">
              <button onClick={() => setShowExpenses(!showExpenses)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50"><ArrowDownRight className="w-5 h-5 text-red-500" /></div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">Detalle de Gastos</h3>
                    <p className="text-sm text-red-600 font-bold">{fmt(data.total_expenses)} &mdash; {data.expense_count} registros</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showExpenses ? 'rotate-180' : ''}`} />
              </button>
              {showExpenses && (
                <div className="border-t border-gray-100 max-h-96 overflow-y-auto">
                  {data.expense_items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No hay gastos en este periodo</p>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Fecha</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Concepto</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Categoria</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Metodo</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expense_items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm text-gray-500">{item.date}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-800">{item.concept}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">
                              {item.category ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-xs text-red-600"><Tag className="w-3 h-3" />{item.category}</span> : <span className="text-gray-300">&mdash;</span>}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-500">
                              {item.method ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs"><CreditCard className="w-3 h-3" />{item.method}</span> : <span className="text-gray-300">&mdash;</span>}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-red-600 text-right">-{fmt(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-red-50 font-bold">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-sm text-red-700">Total Gastos</td>
                          <td className="px-4 py-2 text-sm text-red-700 text-right">-{fmt(data.total_expenses)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>

            {monthlyData.length > 0 && (
              <div className="bg-white rounded-xl card-shadow overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Resumen Mensual {new Date().getFullYear()}</h3>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th className="text-right">Ingresos</th>
                        <th className="text-right">Gastos</th>
                        <th className="text-right">Utilidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((m) => (
                        <tr key={m.month}>
                          <td className="font-medium text-gray-800">{m.month_name}</td>
                          <td className="text-right text-emerald-600">{fmt(m.income)}</td>
                          <td className="text-right text-red-600">{fmt(m.expenses)}</td>
                          <td className={`text-right font-semibold ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(m.profit)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td>Total Anual</td>
                        <td className="text-right text-emerald-600">{fmt(monthlyData.reduce((s, m) => s + m.income, 0))}</td>
                        <td className="text-right text-red-600">{fmt(monthlyData.reduce((s, m) => s + m.expenses, 0))}</td>
                        <td className={`text-right ${monthlyData.reduce((s, m) => s + m.profit, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmt(monthlyData.reduce((s, m) => s + m.profit, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
