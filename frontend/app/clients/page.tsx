'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, Search, AlertCircle, UserCheck, UserX, Ban } from 'lucide-react';

interface Client {
  id: number;
  client_id: string;
  name: string;
  phone: string;
  plan_name: string;
  monthly_cost: number;
  status: string;
  cutoff_day: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const data = await api.getClients(params);
      setClients(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (client: Client) => {
    if (!confirm(`¿Eliminar al cliente ${client.name} (${client.client_id})?`)) return;
    try {
      await api.deleteClient(client.id);
      await fetchClients();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return <span className="badge-success">Activo</span>;
      case 'suspendido': return <span className="badge-warning">Suspendido</span>;
      case 'cancelado': return <span className="badge-danger">Cancelado</span>;
      default: return <span className="badge-gray">{status}</span>;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Administra tus clientes</p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, ID o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl card-shadow overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Costo Mensual</th>
                <th>Día de Corte</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-mono text-sm font-medium text-gray-800">
                    {client.client_id}
                  </td>
                  <td>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="text-gray-500">{client.phone || '—'}</td>
                  <td>{client.plan_name}</td>
                  <td className="font-medium">${client.monthly_cost.toFixed(2)}</td>
                  <td>Día {client.cutoff_day}</td>
                  <td>{getStatusBadge(client.status)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="btn-ghost text-xs"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/clients/${client.id}`}
                        className="btn-ghost text-xs text-primary-600"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(client)}
                        className="btn-ghost text-xs text-red-500 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">No hay clientes registrados</p>
                    <Link href="/clients/new" className="btn-primary mt-4 inline-flex">
                      Registrar primer cliente
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
