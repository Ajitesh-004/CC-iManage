import type { OperationLogEntry, OperationProgress } from "@/types";
import type { OperationContext } from "./context";

export interface LoggerOptions {
  total?: number;
  unit?: string;
  verb?: string;
  reportProgress?: (p: OperationProgress) => void;
  onLog?: (entry: OperationLogEntry) => void;
}

export function createLogger(options: LoggerOptions = {}) {
  const logs: OperationLogEntry[] = [];
  let total = options.total ?? 0;
  let current = 0;
  const unit = options.unit ?? "items";
  const verb = options.verb ?? "processed";

  function push(entry: OperationLogEntry) {
    logs.push(entry);
    options.onLog?.(entry);
  }

  function emitProgress(label?: string) {
    options.reportProgress?.({
      current,
      total,
      unit,
      verb,
      label,
      percent: total > 0 ? Math.round((current / total) * 100) : 0,
    });
  }

  return {
    logs,
    setTotal(n: number) {
      total = n;
      emitProgress();
    },
    tick(label?: string) {
      if (current < total) current += 1;
      emitProgress(label);
    },
    info(action: string, message?: string) {
      push({ level: "info", action, message });
    },
    skip(action: string, message?: string) {
      push({ level: "skip", action, message });
    },
    success(action: string, http: number, message?: string) {
      push({ level: "success", action, http, message });
    },
    failed(action: string, http: number, message?: string, detail?: string) {
      push({ level: "failed", action, http, message, detail });
    },
    item(label: string) {
      push({ level: "info", action: "item", message: label });
      emitProgress(label);
    },
  };
}

export function makeRowLogger(ctx: OperationContext, unit: string, verb?: string) {
  return createLogger({
    total: ctx.rows.length,
    unit,
    verb,
    reportProgress: ctx.reportProgress,
    onLog: ctx.onLog,
  });
}

export function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  const msg = b.message ?? b.error_message ?? b.error;
  return typeof msg === "string" ? msg.slice(0, 120) : "";
}
