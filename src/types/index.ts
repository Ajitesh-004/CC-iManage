export interface SessionData {
  authToken: string;
  tenant: string;
  custId: string;
  baseUrl: string;
  username: string;
  isLoggedIn: boolean;
}

export interface OperationLogEntry {
  level: "success" | "failed" | "skip" | "info";
  action: string;
  http?: number;
  message?: string;
  detail?: string;
}

export interface OperationProgress {
  current: number;
  total: number;
  unit: string;
  verb: string;
  label?: string;
  percent: number;
}

export type OperationStreamEvent =
  | { type: "progress"; current: number; total: number; unit: string; verb: string; label?: string; percent: number }
  | { type: "log"; entry: OperationLogEntry }
  | { type: "done"; result: OperationResult }
  | { type: "error"; error: string };

export interface OperationResult {
  operationId: string;
  logs: OperationLogEntry[];
  exportCsv?: string;
  exportFilename?: string;
}

export type OperationId =
  | "users"
  | "groups-global"
  | "groups-library"
  | "roles-global"
  | "roles-library"
  | "file-types"
  | "file-handler"
  | "classes"
  | "subclasses"
  | "customs"
  | "captions"
  | "templates-create"
  | "templates-folders"
  | "templates-search-folders"
  | "templates-tabs"
  | "templates-prefix-suffix"
  | "templates-delete"
  | "templates-bulk"
  | "templates-export";

export interface CsvRow {
  [key: string]: string;
}
