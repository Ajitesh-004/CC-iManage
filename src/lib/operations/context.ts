import type { ImanageClient } from "@/lib/imanage/client";
import type { CsvRow, OperationLogEntry, OperationProgress, OperationResult } from "@/types";

export interface OperationContext {
  client: ImanageClient;
  rows: CsvRow[];
  params?: Record<string, string>;
  workspaceMap: Map<string, string>;
  reportProgress?: (progress: OperationProgress) => void;
  onLog?: (entry: OperationLogEntry) => void;
}

export type OperationHandler = (ctx: OperationContext) => Promise<OperationResult>;

export function makeResult(
  operationId: string,
  logs: OperationLogEntry[],
  extra?: Partial<OperationResult>
): OperationResult {
  return { operationId, logs, ...extra };
}

export function workspaceMapKey(db: string, name: string) {
  return `${db.toUpperCase()}::${name.toLowerCase()}`;
}
