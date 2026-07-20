/**
 * API client for the ISP Manager backend.
 * Handles authentication, requests, and response parsing.
 */

const API_BASE = '';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: 'no-cache',
        credentials: 'same-origin',
      });
    } catch (err: any) {
      throw new Error('Error de conexión con el servidor');
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
      }
      try {
        const error = await response.json();
        throw new Error(error.detail || `Error ${response.status}`);
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Error ')) throw e;
        throw new Error(`Error ${response.status}`);
      }
    }

    return response.json();
  }

  // Auth
  login = (username: string, password: string) =>
    this.request<{ access_token: string; token_type: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });

  verifyToken = () =>
    this.request<{ valid: boolean; username: string }>('/api/auth/verify');

  // Dashboard
  getDashboard = () =>
    this.request<{
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
    }>('/api/dashboard/');

  // Plans
  getPlans = () =>
    this.request<any[]>('/api/plans/');

  getActivePlans = () =>
    this.request<any[]>('/api/plans/active');

  getPlan = (id: number) =>
    this.request<any>(`/api/plans/${id}`);

  createPlan = (data: any) =>
    this.request<any>('/api/plans/', { method: 'POST', body: data });

  updatePlan = (id: number, data: any) =>
    this.request<any>(`/api/plans/${id}`, { method: 'PUT', body: data });

  deletePlan = (id: number) =>
    this.request<{ message: string }>(`/api/plans/${id}`, { method: 'DELETE' });

  // Clients
  getClients = (params?: { search?: string; status?: string }) => {
    let query = '';
    if (params) {
      const qs = new URLSearchParams();
      if (params.search) qs.set('search', params.search);
      if (params.status) qs.set('status', params.status);
      query = '?' + qs.toString();
    }
    return this.request<any[]>(`/api/clients/${query}`);
  };

  getClient = (id: number) =>
    this.request<any>(`/api/clients/${id}`);

  createClient = (data: any) =>
    this.request<any>('/api/clients/', { method: 'POST', body: data });

  updateClient = (id: number, data: any) =>
    this.request<any>(`/api/clients/${id}`, { method: 'PUT', body: data });

  deleteClient = (id: number) =>
    this.request<{ message: string }>(`/api/clients/${id}`, { method: 'DELETE' });

  // Payments
  getClientPayments = (clientId: number) =>
    this.request<any[]>(`/api/clients/${clientId}/payments`);

  recordPayment = (clientId: number, data: any) =>
    this.request<any>(`/api/clients/${clientId}/payments`, { method: 'POST', body: data });

  // Assets
  getAssets = () =>
    this.request<any[]>('/api/assets/');

  getAsset = (id: number) =>
    this.request<any>(`/api/assets/${id}`);

  createAsset = (data: any) =>
    this.request<any>('/api/assets/', { method: 'POST', body: data });

  updateAsset = (id: number, data: any) =>
    this.request<any>(`/api/assets/${id}`, { method: 'PUT', body: data });

  deleteAsset = (id: number) =>
    this.request<{ message: string }>(`/api/assets/${id}`, { method: 'DELETE' });

  // Cash
  getCashStatus = () =>
    this.request<{ current_funds: number; movements: any[] }>('/api/cash/');

  registerIncome = (data: any) =>
    this.request<any>('/api/cash/income', { method: 'POST', body: data });

  registerExpense = (data: any) =>
    this.request<any>('/api/cash/expense', { method: 'POST', body: data });

  // History
  getHistory = (params?: { limit?: number; offset?: number; type?: string }) => {
    let query = '';
    if (params) {
      const qs = new URLSearchParams();
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.offset) qs.set('offset', String(params.offset));
      if (params.type) qs.set('type', params.type);
      query = '?' + qs.toString();
    }
    return this.request<any[]>(`/api/history/${query}`);
  };

  getHistoryTypes = () =>
    this.request<string[]>('/api/history/types');

  // Settings
  getSettings = () =>
    this.request<{
      company_name: string;
      company_logo: string;
      company_address: string;
      company_phone: string;
      company_email: string;
      currency: string;
    }>('/api/settings/');

  updateSettings = (data: any) =>
    this.request<any>('/api/settings/', { method: 'PUT', body: data });

  // WhatsApp
  getWhatsAppStatus = () =>
    this.request<{ connected: boolean; phone?: string; name?: string }>('/api/whatsapp/status');

  sendWhatsAppMessage = (data: { phone: string; message: string }) =>
    this.request<any>('/api/whatsapp/send', { method: 'POST', body: data });

  sendWhatsAppReminder = (data: { client_id: number; override_phone?: string }) =>
    this.request<any>('/api/whatsapp/send-reminder', { method: 'POST', body: data });

  sendBulkReminders = (data: { days_before: number }) =>
    this.request<any>('/api/whatsapp/send-bulk-reminders', { method: 'POST', body: data });

  getPendingReminders = (days_before: number = 3) =>
    this.request<any[]>(`/api/whatsapp/reminders/pending?days_before=${days_before}`);

  getAutomationSettings = () =>
    this.request<{
      reminder_days_before: number;
      reminder_enabled: boolean;
      isp_whatsapp_number: string;
    }>('/api/whatsapp/automation-settings');

  updateAutomationSettings = (data: {
    reminder_days_before: number;
    reminder_enabled: boolean;
    isp_whatsapp_number: string;
  }) =>
    this.request<any>('/api/whatsapp/automation-settings', { method: 'PUT', body: data });

  // SMS
  getSMSConfig = () =>
    this.request<any>('/api/sms/config');

  updateSMSConfig = (config: Record<string, any>) =>
    this.request<any>('/api/sms/config', { method: 'PUT', body: config });

  testSMSConnection = () =>
    this.request<any>('/api/sms/test', { method: 'POST' });

  sendSMS = (phone: string, message: string) =>
    this.request<any>('/api/sms/send', { method: 'POST', body: { phone, message } });
}

const api = new ApiClient();
export default api;
