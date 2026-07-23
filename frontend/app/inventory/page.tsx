'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Edit2, Trash2, Boxes, X, AlertCircle, Loader2, Search,
  ArrowUp, ArrowDown, AlertTriangle, Package, History,
} from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  category: string;
  sku: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit_cost: number;
  location: string;
  notes: string;
  is_active: boolean;
  is_low: boolean;
}

interface InventoryMovement {
  id: number;
  item_id: number;
  type: string;
  quantity: number;
  date: string;
  concept: string;
  reference: string;
  notes: string;
}

interface Summary {
  total_items: number;
  total_stock_value: number;
  low_stock_count: number;
  total_movements_today: number;
}

const CATEGORIES = [
  'Router', 'ONT', 'Switch', 'Antena', 'Cable',
  'Herramienta', 'Suministro', 'Accesorio', 'Otro',
];

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_items: 0, total_stock_value: 0, low_stock_count: 0, total_movements_today: 0 });
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', category: '', sku: '', unit: 'piezas',
    current_stock: 0, min_stock: 0, max_stock: 0, unit_cost: 0, location: '', notes: '',
  });

  const [movementForm, setMovementForm] = useState({
    type: 'entrada', quantity: 1, date: new Date().toISOString().split('T')[0],
    concept: '', reference: '', notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [itemsData, summ] = await Promise.all([
        api.getInventoryItems({ search: searchTerm || undefined, category: filterCategory || undefined, low_stock: showLowStock }),
        api.getInventorySummary(),
      ]);
      setItems(itemsData);
      setSummary(summ);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCategory, showLowStock]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setEditing(null);
    setForm({ name: '', description: '', category: '', sku: '', unit: 'piezas', current_stock: 0, min_stock: 0, max_stock: 0, unit_cost: 0, location: '', notes: '' });
    setShowFormModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name, description: item.description || '', category: item.category || '',
      sku: item.sku || '', unit: item.unit, current_stock: item.current_stock,
      min_stock: item.min_stock, max_stock: item.max_stock || 0, unit_cost: item.unit_cost,
      location: item.location || '', notes: item.notes || '',
    });
    setShowFormModal(true);
  };

  const openMovementModal = (item: InventoryItem, type: string) => {
    setSelectedItem(item);
    setMovementForm({ type, quantity: 1, date: new Date().toISOString().split('T')[0], concept: '', reference: '', notes: '' });
    setShowMovementModal(true);
  };

  const openHistoryModal = async (item: InventoryItem) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    try {
      const data = await api.getInventoryMovements(item.id);
      setMovements(data);
    } catch { setMovements([]); }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateInventoryItem(editing.id, form);
      } else {
        await api.createInventoryItem(form);
      }
      setShowFormModal(false);
      await fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    if (!selectedItem) return;
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createInventoryMovement({ ...movementForm, item_id: selectedItem.id });
      setShowMovementModal(false);
      await fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    try { await api.deleteInventoryItem(item.id); await fetchData(); } catch (err: any) { alert(err.message); }
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
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock, entradas y salidas</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4" /> Nuevo Item</button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50"><Package className="w-6 h-6 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Items</p>
              <p className="text-xl font-bold text-blue-600">{summary.total_items}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50"><Boxes className="w-6 h-6 text-emerald-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Valor Stock</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(summary.total_stock_value)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-50"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Stock Bajo</p>
              <p className="text-xl font-bold text-red-600">{summary.low_stock_count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-50"><History className="w-6 h-6 text-purple-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Mov. Hoy</p>
              <p className="text-xl font-bold text-purple-600">{summary.total_movements_today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 w-full" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowLowStock(!showLowStock)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showLowStock ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <AlertTriangle className="w-4 h-4 inline mr-1" /> Stock Bajo
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoría</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Mín</th>
                <th>Costo Unit.</th>
                <th>Valor</th>
                <th>Ubicación</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={item.is_low ? 'bg-red-50/50' : ''}>
                  <td className="font-medium text-gray-800">{item.name}</td>
                  <td className="text-sm text-gray-500">{item.category || '—'}</td>
                  <td className="text-sm text-gray-400">{item.sku || '—'}</td>
                  <td>
                    <span className={`font-semibold ${item.is_low ? 'text-red-600' : 'text-gray-800'}`}>
                      {item.current_stock} {item.unit}
                    </span>
                    {item.is_low && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                  </td>
                  <td className="text-sm text-gray-500">{item.min_stock}</td>
                  <td className="text-sm">{fmt(item.unit_cost)}</td>
                  <td className="text-sm font-medium">{fmt(item.current_stock * item.unit_cost)}</td>
                  <td className="text-sm text-gray-400">{item.location || '—'}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openMovementModal(item, 'entrada')} className="btn-ghost text-xs text-emerald-600" title="Entrada"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openMovementModal(item, 'salida')} className="btn-ghost text-xs text-red-600" title="Salida"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openHistoryModal(item)} className="btn-ghost text-xs" title="Historial"><History className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditModal(item)} className="btn-ghost text-xs" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(item)} className="btn-ghost text-xs text-red-500" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-gray-400">
                    <Boxes className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay items en inventario</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{editing ? 'Editar Item' : 'Nuevo Item'}</h2>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full"><option value="">Seleccionar...</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full" placeholder="Código interno" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full"><option value="piezas">Piezas</option><option value="unidades">Unidades</option><option value="metros">Metros</option><option value="cajas">Cajas</option><option value="carretes">Carretes</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo Unit. ($)</label><input type="number" step="0.01" min="0" value={form.unit_cost || ''} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} className="w-full" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label><input type="number" min="0" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: parseInt(e.target.value) || 0 })} className="w-full" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label><input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} className="w-full" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label><input type="number" min="0" value={form.max_stock || ''} onChange={(e) => setForm({ ...form, max_stock: parseInt(e.target.value) || 0 })} className="w-full" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full" placeholder="Ej: Bodega principal" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full" /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {movementForm.type === 'entrada' ? '📥 Entrada' : '📤 Salida'} de Stock
                </h2>
                <p className="text-sm text-gray-500">{selectedItem.name} — Stock actual: {selectedItem.current_stock}</p>
              </div>
              <button onClick={() => setShowMovementModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleMovementSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label><input type="date" value={movementForm.date} onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })} required className="w-full" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label><input type="number" min="1" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 1 })} required className="w-full" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label><input type="text" value={movementForm.concept} onChange={(e) => setMovementForm({ ...movementForm, concept: e.target.value })} className="w-full" placeholder="Ej: Compra a proveedor" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label><input type="text" value={movementForm.reference} onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })} className="w-full" placeholder="Ej: Factura #123" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMovementModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className={`btn-primary ${movementForm.type === 'salida' ? 'bg-red-500 hover:bg-red-600' : ''}`}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : movementForm.type === 'entrada' ? '📥 Registrar Entrada' : '📤 Registrar Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Historial de Movimientos</h2>
                <p className="text-sm text-gray-500">{selectedItem.name}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {movements.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay movimientos</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${m.type === 'entrada' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          {m.type === 'entrada' ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <ArrowDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{m.concept || (m.type === 'entrada' ? 'Entrada' : 'Salida')}</p>
                          <p className="text-xs text-gray-400">{m.date}{m.reference ? ` · Ref: ${m.reference}` : ''}</p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${m.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
