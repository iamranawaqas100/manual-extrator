/**
 * TypeScript Type Definitions
 * Provides type safety without changing implementation
 */

// Data Models
export interface DataItem {
  id: number;
  url: string;
  title: string;
  description: string;
  image: string;
  price: string;
  category?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
  isBeingFilled?: boolean;
}

export interface AppState {
  extractedData: DataItem[];
  currentMode: 'manual' | 'template';
  selectedField: string | null;
  isSelecting: boolean;
  currentItemId: number | null;
  highlightsVisible: boolean;
}

export interface StoreActions {
  setExtractedData: (data: DataItem[]) => void;
  addExtractedItem: (item: DataItem) => void;
  updateExtractedItem: (id: number, updates: Partial<DataItem>) => void;
  removeExtractedItem: (id: number) => void;
  setCurrentMode: (mode: 'manual' | 'template') => void;
  setSelectedField: (field: string | null) => void;
  setIsSelecting: (isSelecting: boolean) => void;
  setCurrentItemId: (id: number | null) => void;
  setHighlightsVisible: (visible: boolean) => void;
}

export interface Store {
  getState: () => AppState;
  setState: (updates: Partial<AppState>) => void;
  subscribe: (callback: (state: AppState) => void) => () => void;
  actions: StoreActions;
}

// Service Interfaces
export interface DataService {
  getAllData(): Promise<DataItem[]>;
  saveData(data: Partial<DataItem>): Promise<DataItem>;
  updateData(id: number, data: Partial<DataItem>): Promise<DataItem>;
  deleteData(id: number): Promise<boolean>;
  exportData(format: 'json' | 'csv'): Promise<ExportResult>;
  getAppVersion(): Promise<string>;
}

export interface ExportResult {
  success: boolean;
  path?: string;
  count?: number;
  canceled?: boolean;
  error?: string;
}

export interface WebviewService {
  loadingCount: number;
  lastLoadTime: number;
  visibilityFixApplied: boolean;
  getWebview(): HTMLElement | null;
  isReady(): boolean;
  execute(script: string): Promise<any>;
  sendMessage(command: string, data?: Record<string, any>): Promise<any>;
  startSelection(field: string): Promise<any>;
  stopSelection(): Promise<any>;
  setMode(mode: string): Promise<any>;
  clearHighlights(): Promise<any>;
  forcePageVisibility(): Promise<void>;
  injectExtractionScript(): Promise<any>;
  waitForLoad(): Promise<void>;
}

export interface Notifications {
  updateStatus(message: string): void;
  showLoading(message?: string): void;
  hideLoading(): void;
  showModal(): void;
  hideModal(): void;
  showUpdateLog(message: string): void;
}

// Electron API
export interface ElectronAPI {
  getExtractedData(): Promise<DataItem[]>;
  saveExtractedData(data: Partial<DataItem>): Promise<DataItem>;
  updateExtractedData(id: number, data: Partial<DataItem>): Promise<DataItem>;
  deleteExtractedData(id: number): Promise<boolean>;
  exportData(format: 'json' | 'csv'): Promise<ExportResult>;
  getAppVersion(): Promise<string>;
  onMenuNewExtraction(callback: () => void): void;
  onMenuExportData(callback: () => void): void;
  onMenuClearData(callback: () => void): void;
  onMenuFindSimilar(callback: () => void): void;
  onProtocolExtract(callback: (event: any, data: ProtocolData) => void): void;
  onUpdateLog(callback: (event: any, message: string) => void): void;
}

export interface ProtocolData {
  action: string;
  url: string;
  bypassAuth?: boolean;
}

// Utility Types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
export type CleanupFunction = () => void;

// Global Window Extensions
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    app: {
      toggleVerification(id: number): Promise<void>;
      deleteItem(id: number): Promise<void>;
      editItem(id: number): void;
      saveEditedItem(id: number): Promise<void>;
      setCurrentItem(id: number): Promise<void>;
    };
  }
}

// Logger Types
export interface Logger {
  info(...args: any[]): void;
  success(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
  network(...args: any[]): void;
  update(...args: any[]): void;
  security(...args: any[]): void;
}

// Configuration
export interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  window: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  };
  security: {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    enableRemoteModule: boolean;
    webSecurity: boolean;
  };
  network: {
    debugPort: string;
    updateCheckInterval: string;
  };
  auth: {
    sessionDuration: number;
  };
  protocol: {
    scheme: string;
  };
  repository: {
    owner: string;
    repo: string;
  };
}

