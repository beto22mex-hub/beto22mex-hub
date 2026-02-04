
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  password?: string;
}

export interface Operation {
  id: string;
  name: string;
  orderIndex: number;
  isInitial: boolean;
  isFinal: boolean;
  activeOperatorId?: string;
  activeOperatorName?: string;
}

export interface ProcessRouteStep {
  id: string;
  processRouteId: string;
  operationId: string;
  operationName?: string;
  stepOrder: number;
}

export interface ProcessRoute {
  id: string;
  name: string;
  description: string;
  steps: ProcessRouteStep[];
}

export enum SerialGenType {
  PCB_SERIAL = 'PCB_SERIAL',
  LOT_BASED = 'LOT_BASED',
  ACCESSORIES = 'ACCESSORIES'
}

export interface PartNumber {
  id: string;
  partNumber: string;
  revision: string;
  description: string;
  productCode: string;
  serialMask: string;
  serialGenType?: SerialGenType;
  processRouteId?: string;
  stdQty: number; 
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  sapOrderNumber?: string;
  partNumberId: string;
  quantity: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  mask: string;
}

export type LabelDataSource = 'SERIAL' | 'PART' | 'SKU' | 'DATE' | 'STATIC' | 'BOX_COUNT' | 'BOX_TOTAL' | 'ORDER' | 'QTY';

export interface LabelConfig {
  id: string;
  sku: string;
  labelName: string;
  formatPath: string;
  printerName: string;
  defaultQuantity: number;
  labelType: string;
}

export interface LabelField {
  id: number;
  labelConfigId: string;
  fieldName: string;
  dataSource: LabelDataSource;
  staticValue?: string;
}

export interface SerialUnit {
  serialNumber: string;
  orderNumber: string;
  partNumberId: string;
  currentOperationId: string;
  history: {
    operationId: string;
    operationName: string;
    operatorId: string;
    operatorName: string;
    timestamp: string;
  }[];
  isComplete: boolean;
  trayId?: string;
  printHistory: {
    timestamp: string;
    status?: string;
    message?: string;
    // Added missing properties to fix compilation errors
    labelType?: string;
    operatorId?: string;
  }[];
}
