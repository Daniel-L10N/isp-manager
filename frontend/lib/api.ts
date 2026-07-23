/**
 * API client for the ISP Manager backend.
 * Handles authentication, requests, and response parsing.
 */

const API_BASE = '/isp-manager';

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
    this.request<{ access_token: string; token_type: string; username: string; role: string }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });

  verifyToken = () =>
    this.request<{ valid: boolean; username: string; role: string }>('/api/auth/verify');

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

  deleteCashMovement = (id: number) =>
    this.request<{ message: string }>(`/api/cash/${id}`, { method: 'DELETE' });

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
  getWhatsAppQR = () =>
    this.request<{ qr: string | null; connected: boolean; message?: string }>("/api/whatsapp/qr");

  logoutWhatsApp = () =>
    this.request<{ success: boolean; message: string }>("/api/whatsapp/logout", { method: "POST" });


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

  // Liabilities
  getLiabilities = () =>
    this.request<any[]>("/api/liabilities/");

  getLiabilitiesSummary = () =>
    this.request<{ total_debt: number; total_paid: number; total_remaining: number; active_count: number }>("/api/liabilities/summary");

  createLiability = (data: any) =>
    this.request<any>("/api/liabilities/", { method: "POST", body: data });

  updateLiability = (id: number, data: any) =>
    this.request<any>("/api/liabilities/" + id, { method: "PUT", body: data });

  deleteLiability = (id: number) =>
    this.request<{ message: string }>("/api/liabilities/" + id, { method: "DELETE" });

  // Provider Payments (Pagos a Proveedores)
  getPaymentCreditors = () =>
    this.request<string[]>('/api/payments/creditors');

  getLiabilitiesByCreditor = (creditor: string) =>
    this.request<any[]>(`/api/payments/creditor/${encodeURIComponent(creditor)}/liabilities`);

  getExpensesByCreditor = (creditor: string) =>
    this.request<any[]>(`/api/payments/creditor/${encodeURIComponent(creditor)}/expenses`);

  getProviderPayments = () =>
    this.request<any[]>('/api/payments/');

  createProviderPayment = (data: any) =>
    this.request<any>('/api/payments/', { method: 'POST', body: data });

  deleteProviderPayment = (id: number) =>
    this.request<{ message: string }>(`/api/payments/${id}`, { method: 'DELETE' });

  // Expenses (Gastos Operativos)
  getExpenses = () =>
    this.request<any[]>('/api/expenses/');

  getExpensesSummary = () =>
    this.request<{ total_monthly: number; total_active: number; total_overdue: number; total_paid_year: number; categories: Record<string, number> }>('/api/expenses/summary');

  getExpenseCategories = () =>
    this.request<string[]>('/api/expenses/categories');

  getExpenseFrequencies = () =>
    this.request<any[]>('/api/expenses/frequencies');

  createExpense = (data: any) =>
    this.request<any>('/api/expenses/', { method: 'POST', body: data });

  updateExpense = (id: number, data: any) =>
    this.request<any>(`/api/expenses/${id}`, { method: 'PUT', body: data });

  deleteExpense = (id: number) =>
    this.request<{ message: string }>(`/api/expenses/${id}`, { method: 'DELETE' });

  recordExpensePayment = (expenseId: number, data: any) =>
    this.request<any>(`/api/expenses/${expenseId}/payments`, { method: 'POST', body: data });

  getExpensePayments = (expenseId: number) =>
    this.request<any[]>(`/api/expenses/${expenseId}/payments`);

  deleteExpensePayment = (paymentId: number) =>
    this.request<{ message: string }>(`/api/expenses/payments/${paymentId}`, { method: 'DELETE' });

  getUpcomingExpenses = (days: number = 30) =>
    this.request<any[]>(`/api/expenses/upcoming?days=${days}`);

  // Profit / Utilidad
  getProfit = (params?: { period?: string; start_date?: string; end_date?: string }) => {
    let query = '';
    if (params) {
      const qs = new URLSearchParams();
      if (params.period) qs.set('period', params.period);
      if (params.start_date) qs.set('start_date', params.start_date);
      if (params.end_date) qs.set('end_date', params.end_date);
      query = '?' + qs.toString();
    }
    return this.request<any>(`/api/profit/${query}`);
  };

  getMonthlyProfit = (year?: number) => {
    const q = year ? `?year=${year}` : '';
    return this.request<any[]>(`/api/profit/monthly${q}`);
  };

  // Incomes (Ingresos)
  getIncomes = (params?: { client_id?: number }) => {
    let q = '';
    if (params?.client_id) q = `?client_id=${params.client_id}`;
    return this.request<any[]>(`/api/incomes/${q}`);
  };

  getIncomeClients = () =>
    this.request<any[]>('/api/incomes/clients');

  getIncomeSummary = () =>
    this.request<{ month_total: number; year_total: number; total_all: number; total_records: number }>('/api/incomes/summary');

  createIncome = (data: any) =>
    this.request<any>('/api/incomes/', { method: 'POST', body: data });

  deleteIncome = (id: number) =>
    this.request<{ message: string }>(`/api/incomes/${id}`, { method: 'DELETE' });

  // Inventory (Inventario)
  getInventoryItems = (params?: { search?: string; category?: string; low_stock?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.low_stock) qs.set('low_stock', 'true');
    const q = qs.toString() ? '?' + qs.toString() : '';
    return this.request<any[]>(`/api/inventory/${q}`);
  };

  getInventorySummary = () =>
    this.request<{ total_items: number; total_stock_value: number; low_stock_count: number; total_movements_today: number }>('/api/inventory/summary');

  getInventoryCategories = () =>
    this.request<string[]>('/api/inventory/categories');

  getLowStockItems = () =>
    this.request<any[]>('/api/inventory/low-stock');

  createInventoryItem = (data: any) =>
    this.request<any>('/api/inventory/', { method: 'POST', body: data });

  updateInventoryItem = (id: number, data: any) =>
    this.request<any>(`/api/inventory/${id}`, { method: 'PUT', body: data });

  deleteInventoryItem = (id: number) =>
    this.request<{ message: string }>(`/api/inventory/${id}`, { method: 'DELETE' });

  getInventoryMovements = (itemId: number) =>
    this.request<any[]>(`/api/inventory/${itemId}/movements`);

  createInventoryMovement = (data: any) =>
    this.request<any>('/api/inventory/movements', { method: 'POST', body: data });

  deleteInventoryMovement = (id: number) =>
    this.request<{ message: string }>(`/api/inventory/movements/${id}`, { method: 'DELETE' });

  sendSMS = (phone: string, message: string) =>
    this.request<any>('/api/sms/send', { method: 'POST', body: { phone, message } });
}

const api = new ApiClient();
export default api;
