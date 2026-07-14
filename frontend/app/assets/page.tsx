'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Plus, Edit2, Trash2, Package, X, AlertCircle, Loader2, Search, Calendar,
} from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  description: string;
  acquisition_date: string;
  approximate_value: number;
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    acquisition_date: '',
    approximate_value: 0,
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

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = filteredAssets.reduce((sum, a) => sum + a.approximate_value, 0);

  const openCreateModal = () => {
    setEditingAsset(null);
    setForm({
      name: '',
      description: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      approximate_value: 0,
      status: 'bueno',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      description: asset.description || '',
      acquisition_date: asset.acquisition_date,
      approximate_value: asset.approximate_value,
      status: asset.status,
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
    if (!confirm(`¿Eliminar el bien "${asset.name}"?`)) return;
    try {
      await api.deleteAsset(asset.id);
      await fetchAssets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    if (!opt) return <span className="badge-gray">{status}</span>;
    return <span className={opt.color}>{opt.label}</span>;
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
          <h1 className="text-2xl font-bold text-gray-800">Bienes</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de activos de la empresa</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Bien
        </button>
      </div>

      {/* Summary & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="bg-primary-50 rounded-lg px-4 py-3">
          <p className="text-xs text-primary-600 uppercase tracking-wider font-medium">Valor Total de Bienes</p>
          <p className="text-2xl font-bold text-primary-700">${totalValue.toFixed(2)}</p>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar bienes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 w-full"
          />
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Fecha Adquisición</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-medium text-gray-800">{asset.name}</td>
                  <td className="text-gray-500 text-sm max-w-xs truncate">
                    {asset.description || '—'}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {asset.acquisition_date}
                    </span>
                  </td>
                  <td className="font-medium">${asset.approximate_value.toFixed(2)}</td>
                  <td>{getStatusBadge(asset.status)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(asset)} className="btn-ghost text-xs">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(asset)} className="btn-ghost text-xs text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay bienes registrados</p>
                    <button onClick={openCreateModal} className="btn-primary mt-4">
                      Registrar primer bien
                    </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingAsset ? 'Editar Bien' : 'Nuevo Bien'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Adquisición *</label>
                  <input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} required className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Aproximado ($) *</label>
                  <input type="number" step="0.01" min="0" value={form.approximate_value} onChange={(e) => setForm({ ...form, approximate_value: parseFloat(e.target.value) || 0 })} required className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editingAsset ? 'Guardar Cambios' : 'Crear Bien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
