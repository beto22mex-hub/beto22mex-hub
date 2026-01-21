
import { User, Operation, PartNumber, WorkOrder, SerialUnit, LabelConfig, LabelField, ProcessRoute } from '../types';

const API_URL = 'http://localhost:3010/api';

async function apiCall<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || res.statusText || 'API Error');
    }
    return res.json();
  } catch (error: any) {
    console.error(`API Call Failed: ${endpoint}`, error);
    throw error;
  }
}

export const dbSystem = {
  checkConnection: async (): Promise<boolean> => {
    try { await apiCall('/health'); return true; } 
    catch (error) { throw new Error("No se pudo conectar al Backend."); }
  },
  initDatabase: async (): Promise<string[]> => {
    const res = await apiCall<{ success: boolean, logs: string[] }>('/setup', 'POST');
    return res.logs;
  }
};

export const db = {
  // Auth
  login: (username: string, password?: string) => apiCall<{ success: boolean, user: User }>('/auth/login', 'POST', { username, password }),

  // Users
  getUsers: () => apiCall<User[]>('/users'),
  addUser: (user: User) => apiCall('/users', 'POST', user),
  updateUser: (id: string, user: Partial<User>) => apiCall(`/users/${id}`, 'PUT', user),
  deleteUser: (id: string) => apiCall(`/users/${id}`, 'DELETE'),
  
  // Routes
  getRoutes: () => apiCall<ProcessRoute[]>('/routes'),
  addRoute: (route: any) => apiCall('/routes', 'POST', route),
  updateRoute: (id: string, route: any) => apiCall(`/routes/${id}`, 'PUT', route),
  deleteRoute: (id: string) => apiCall(`/routes/${id}`, 'DELETE'),

  // Operations
  getOperations: () => apiCall<Operation[]>('/operations'),
  addOperation: (op: Operation) => apiCall('/operations', 'POST', op),
  updateOperation: (id: string, op: Partial<Operation>) => apiCall(`/operations/${id}`, 'PUT', op),
  deleteOperation: (id: string) => apiCall(`/operations/${id}`, 'DELETE'),
  enterStation: (opId: string, userId: string) => apiCall(`/operations/${opId}/enter`, 'POST', { userId }),
  exitStation: (opId: string, userId: string) => apiCall(`/operations/${opId}/exit`, 'POST', { userId }),
  unlockStation: (opId: string) => apiCall(`/operations/${opId}/unlock`, 'POST'),

  // Parts
  getParts: () => apiCall<PartNumber[]>('/parts'),
  addPart: (part: PartNumber) => apiCall('/parts', 'POST', part),
  updatePart: (id: string, part: Partial<PartNumber>) => apiCall(`/parts/${id}`, 'PUT', part),
  deletePart: (id: string) => apiCall(`/parts/${id}`, 'DELETE'),
  
  // Orders
  getOrders: () => apiCall<WorkOrder[]>('/orders'),
  updateOrder: (id: string, updates: Partial<WorkOrder>) => apiCall(`/orders/${id}`, 'PUT', updates),
  deleteOrder: (id: string) => apiCall(`/orders/${id}`, 'DELETE'),
  getOrderByNumber: async (num: string): Promise<WorkOrder | undefined> => {
     const orders = await apiCall<WorkOrder[]>('/orders');
     return orders.find(o => (o.sapOrderNumber === num || o.orderNumber === num));
  },
  generateAutoOrder: (sapOrderNumber: string, productCode: string, quantity: number) => 
     apiCall<{ success: boolean, orderNumber: string, orderId: string }>('/orders/generate', 'POST', { sapOrderNumber, productCode, quantity }),

  // Serials & Trays
  getSerials: () => apiCall<SerialUnit[]>('/serials'),
  getSerialsByTray: (trayId: string) => apiCall<SerialUnit[]>(`/serials/tray/${encodeURIComponent(trayId)}`),
  saveSerial: (unit: SerialUnit) => apiCall('/serials', 'POST', unit),
  getSerial: async (serialNumber: string): Promise<SerialUnit | undefined> => {
    const serials = await apiCall<SerialUnit[]>('/serials');
    return serials.find(s => s.serialNumber === serialNumber);
  },
  deleteSerial: (serialNumber: string) => apiCall(`/serials/${encodeURIComponent(serialNumber)}`, 'DELETE'),

  // Batch Processing
  generateBatchSerials: (data: { orderNumber: string, partNumberId: string, currentOperationId: string, trayId?: string, operatorId: string, quantity: number, autoComplete?: boolean }) => 
    apiCall<{ success: boolean, serials: { serialNumber: string }[] }>('/serials/batch-generate', 'POST', data),
  
  updateBatchSerials: (data: { serials: string[], operationId: string, operatorId: string, isComplete?: boolean }) =>
    apiCall('/serials/batch-update', 'POST', data),

  // Labels
  getLabelConfigs: () => apiCall<LabelConfig[]>('/label-configs'),
  saveLabelConfig: (config: LabelConfig) => apiCall('/label-configs', 'POST', config),
  deleteLabelConfig: (id: string) => apiCall(`/label-configs/${id}`, 'DELETE'),
  getLabelFields: (configId: string) => apiCall<LabelField[]>(`/label-fields/${configId}`),
  addLabelField: (field: Omit<LabelField, 'id'>) => apiCall('/label-fields', 'POST', field),
  deleteLabelField: (id: number) => apiCall(`/label-fields/${id}`, 'DELETE'),

  // Printing
  printLabel: (serialNumber: string, partNumber: string, options?: any) => apiCall('/print-label', 'POST', { serialNumber, partNumber, ...options }),
  printMultiLabels: (serials: { serialNumber: string }[], sku: string, partNumber: string) => apiCall('/print-label/multi', 'POST', { serials, sku, partNumber })
};
