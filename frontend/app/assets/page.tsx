'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Edit2, Trash2, Package, X, AlertCircle, Loader2, Search,
  DollarSign, Clock, TrendingUp, TrendingDown,
} from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  description: string;
  acquisition_date: string;
  purchase_price: number;
  sale_price: number | null;
  useful_life_years: number | null;
  quantity: number;
  unit: string;
  category: string;
  status: string;
  notes: string;
  is_active: boolean;
}

const STATUS_OPTIONS = [
  { value: 'nuevo', label: 'Nuevo', color: 'badge-success' },
  { value: 'bueno', label: 'Bueno', color: 'badge-info' },
  { value: 'regular', label: 'Regular', color: 'badge-warning' },
  { value: 'malo', label: 'Malo', color: 'badge-danger' },
];

const UNIT_OPTIONS = [
  'piezas', 'unidades', 'metros', 'cajas', 'pares', 'juegos',
  'carretes', 'kilos', 'libras', 'litros', 'galones', 'bultos',
];

const CATEGORY_OPTIONS = [
  'Equipo de red', 'Herramienta', 'Vehiculo', 'Mobiliario',
  'Equipo de cómputo', 'Instalación', 'Otro',
];

export default function AssetsPage() {
  const { isAdmin } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    sale_price: 0,
    useful_life_years: 5,
    quantity: 1,
    unit: 'piezas',
    category: '',
    status: 'bueno',
    notes: '',
  });

  const fetchAssets = useCallback(async () => {
    try {
      const data = await api.getAssets();
      setAssets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPurchase = filteredAssets.reduce((sum, a) => sum + (a.purchase_price * (a.quantity || 1)), 0);
  const totalSale = filteredAssets.reduce((sum, a) => sum + ((a.sale_price || a.purchase_price) * (a.quantity || 1)), 0);

  const openCreateModal = () => {
    setEditingAsset(null);
    setForm({
      name: '', description: '', acquisition_date: new Date().toISOString().split('T')[0],
      purchase_price: 0, sale_price: 0, useful_life_years: 5,
      quantity: 1, unit: 'piezas', category: '', status: 'bueno', notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name, description: asset.description || '',
      acquisition_date: asset.acquisition_date,
      purchase_price: asset.purchase_price,
      sale_price: asset.sale_price || 0,
      useful_life_years: asset.useful_life_years || 5,
      quantity: asset.quantity || 1, unit: asset.unit || 'piezas',
      category: asset.category || '', status: asset.status || 'bueno',
      notes: asset.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingAsset) {
        await api.updateAsset(editingAsset.id, form);
      } else {
        await api.createAsset(form);
      }
      setShowModal(false);
      await fetchAssets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`¿Eliminar activo "${asset.name}"?`)) return;
    setDeleting(asset.id);
    try {
      await api.deleteAsset(asset.id);
      await fetchAssets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Activos</h1>
          <p className="text-sm text-gray-500 mt-1">Control de activos y bienes de la empresa</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Activo
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50"><Package className="w-6 h-6 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Activos</p>
              <p className="text-xl font-bold text-blue-600">{filteredAssets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-50"><DollarSign className="w-6 h-6 text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Valor de Compra</p>
              <p className="text-xl font-bold text-red-600">{fmt(totalPurchase)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50"><TrendingUp className="w-6 h-6 text-emerald-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Valor Aprox. Venta</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(totalSale)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar activos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 w-full" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Fecha Compra</th>
                <th>Precio Compra</th>
                <th>Precio Venta</th>
                <th>Vida Útil</th>
                <th>Cant.</th>
                <th>Valor Total</th>
                <th>Estado</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-gray-800">{a.name}</td>
                  <td className="text-sm text-gray-500">{a.category || '—'}</td>
                  <td className="text-sm text-gray-500">{a.acquisition_date}</td>
                  <td className="text-sm font-medium text-gray-700">{fmt(a.purchase_price)}</td>
                  <td className="text-sm font-medium text-emerald-600">{a.sale_price ? fmt(a.sale_price) : '—'}</td>
                  <td className="text-sm text-gray-500">{a.useful_life_years ? `${a.useful_life_years} años` : '—'}</td>
                  <td className="text-sm">{a.quantity}</td>
                  <td className="text-sm font-semibold text-gray-800">{fmt(a.purchase_price * (a.quantity || 1))}</td>
                  <td>
                    <span className={STATUS_OPTIONS.find(s => s.value === a.status)?.color || 'badge-gray'}>
                      {STATUS_OPTIONS.find(s => s.value === a.status)?.label || a.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(a)} className="btn-ghost text-xs"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(a)} disabled={deleting === a.id} className="btn-ghost text-xs text-red-500">
                          {deleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay activos registrados</p>
                    {isAdmin && <button onClick={openCreateModal} className="btn-primary mt-4">Registrar primer activo</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{editingAsset ? 'Editar Activo' : 'Nuevo Activo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" placeholder="Ej: Router MikroTik" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full">
                    <option value="">Seleccionar...</option>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra *</label>
                  <input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full">
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra ($) *</label>
                  <input type="number" step="0.01" min="0" value={form.purchase_price || ''} onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta Aprox. ($)</label>
                  <input type="number" step="0.01" min="0" value={form.sale_price || ''} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vida Útil (años)</label>
                  <input type="number" min="1" max="50" value={form.useful_life_years || ''} onChange={(e) => setForm({ ...form, useful_life_years: parseInt(e.target.value) || 0 })} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" placeholder="Descripción del activo" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              {form.quantity > 0 && form.purchase_price > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  Valor total: {fmt(form.quantity * form.purchase_price)}
                  {form.sale_price ? ` → Venta aprox: ${fmt(form.quantity * form.sale_price)}` : ''}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editingAsset ? 'Guardar Cambios' : 'Crear Activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
