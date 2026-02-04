
import { User, Operation, PartNumber, WorkOrder, SerialUnit, LabelConfig, LabelField, ProcessRoute } from '../types';

// Al usar el proxy en vite.config.ts, podemos usar simplemente '/api'
// Esto funciona tanto en desarrollo (redirigido a 8080) como en producción.
const API_URL = '/api';

async function apiCall<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_URL}${cleanPath}`;
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-cache'
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Error desconocido');
      let errorMessage = `Error ${res.status}: ${res.statusText}`;
      try {
          const json = JSON.parse(errorText);
          errorMessage = json.error || json.message || errorMessage;
      } catch (e) {
          if (errorText.length < 100) errorMessage += ` - ${errorText}`;
      }
      throw new Error(errorMessage);
    }
    return res.json();
  } catch (error: any) {
    console.error(`[API FAIL] ${fullUrl}:`, error.message);
    throw error;
  }
}

export const dbSystem = {
  getApiBaseUrl: () => API_URL,
  checkConnection: async (): Promise<boolean> => {
    try {
      const health = await apiCall<{success: boolean}>('/health'); 
      return !!health;
    } catch (e) {
      console.error("Health check failed:", e);
      throw e;
    }
  },
  initDatabase: async (): Promise<string[]> => {
    const res = await apiCall<{ success: boolean, message: string }>('/setup', 'POST');
    return [res.message || "Azure SQL Inicializado."];
  },
  resetDatabase: async (): Promise<boolean> => {
    const res = await apiCall<{ success: boolean }>('/admin/db-reset', 'POST');
    return res.success;
  }
};

export const db = {
  login: (username: string, password?: string) => apiCall<{ success: boolean, user: User }>('/auth/login', 'POST', { username, password }),
  getUsers: () => apiCall<User[]>('/users'),
  addUser: (user: User) => apiCall('/users', 'POST', user),
  updateUser: (id: string, user: Partial<User>) => apiCall(`/users/${id}`, 'PUT', user),
  deleteUser: (id: string) => apiCall(`/users/${id}`, 'DELETE'),
  getRoutes: () => apiCall<ProcessRoute[]>('/routes'),
  addRoute: (route: ProcessRoute) => apiCall('/routes', 'POST', route),
  updateRoute: (id: string, route: Partial<ProcessRoute>) => apiCall(`/routes/${id}`, 'PUT', route),
  deleteRoute: (id: string) => apiCall(`/routes/${id}`, 'DELETE'),
  getOperations: () => apiCall<Operation[]>('/operations'),
  addOperation: (op: Operation) => apiCall('/operations', 'POST', op),
  updateOperation: (id: string, op: Partial<Operation>) => apiCall(`/operations/${id}`, 'PUT', op),
  deleteOperation: (id: string) => apiCall(`/operations/${id}`, 'DELETE'),
  enterStation: (opId: string, userId: string) => apiCall(`/operations/${opId}/enter`, 'POST', { userId }),
  exitStation: (opId: string, userId: string) => apiCall(`/operations/${opId}/exit`, 'POST', { userId }),
  unlockStation: (opId: string) => apiCall(`/operations/${opId}/unlock`, 'POST'),
  getParts: () => apiCall<PartNumber[]>('/parts'),
  addPart: (part: PartNumber) => apiCall('/parts', 'POST', part),
  updatePart: (id: string, part: Partial<PartNumber>) => apiCall(`/parts/${id}`, 'PUT', part),
  deletePart: (id: string) => apiCall(`/parts/${id}`, 'DELETE'),
  getOrders: () => apiCall<WorkOrder[]>('/orders'),
  updateOrder: (id: string, updates: Partial<WorkOrder>) => apiCall(`/orders/${id}`, 'PUT', updates),
  deleteOrder: (id: string) => apiCall(`/orders/${id}`, 'DELETE'),
  getOrderByNumber: async (num: string): Promise<WorkOrder | undefined> => {
     const orders = await apiCall<WorkOrder[]>('/orders');
     return orders.find(o => (o.sapOrderNumber === num || o.orderNumber === num));
  },
  generateAutoOrder: (sapOrderNumber: string, productCode: string, quantity: number) => 
     apiCall<{ success: boolean, orderNumber: string, orderId: string }>('/orders/generate', 'POST', { sapOrderNumber, productCode, quantity }),
  getSerials: () => apiCall<SerialUnit[]>('/serials'),
  getSerial: (serialNumber: string) => apiCall<SerialUnit>(`/serials/${encodeURIComponent(serialNumber)}`),
  getSerialsByTray: (trayId: string) => apiCall<SerialUnit[]>(`/serials/tray/${encodeURIComponent(trayId)}`),
  saveSerial: (unit: any) => apiCall('/serials', 'POST', unit),
  unassignSerial: (serialNumber: string) => apiCall(`/serials/${encodeURIComponent(serialNumber)}/unassign`, 'POST'),
  deleteSerial: (serialNumber: string) => apiCall(`/serials/${encodeURIComponent(serialNumber)}`, 'DELETE'),
  generateBatchSerials: (data: any) => apiCall<{ success: boolean, serials: any[] }>('/serials/batch-generate', 'POST', data),
  updateBatchSerials: (data: any) => apiCall('/serials/batch-update', 'POST', data),
  getLabelConfigs: () => apiCall<LabelConfig[]>('/label-configs'),
  saveLabelConfig: (config: LabelConfig) => apiCall('/label-configs', 'POST', config),
  deleteLabelConfig: (id: string) => apiCall(`/label-configs/${id}`, 'DELETE'),
  getLabelFields: (configId: string) => apiCall<LabelField[]>(`/label-fields/${configId}`),
  addLabelField: (field: any) => apiCall('/label-fields', 'POST', field),
  deleteLabelField: (id: number) => apiCall(`/label-fields/${id}`, 'DELETE'),
  printLabel: (serialNumber: string, partNumber: string, options?: any) => apiCall('/print-label', 'POST', { serialNumber, partNumber, ...options }),
  printMultiLabels: (serials: any[], sku: string, partNumber: string, operatorId?: string) => apiCall('/print-label/multi', 'POST', { serials, sku, partNumber, operatorId })
};
