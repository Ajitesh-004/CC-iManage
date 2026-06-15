import { NextRequest } from "next/server";
import { parseCsv } from "@/lib/csv/parse";
import { ImanageClient } from "@/lib/imanage/client";
import { getOperationHandler, getProgressMeta } from "@/lib/operations";
import { getSession } from "@/lib/session";
import type { OperationId, OperationLogEntry, OperationProgress, OperationStreamEvent } from "@/types";

export const maxDuration = 60;

function ndjsonLine(event: OperationStreamEvent): string {
  return JSON.stringify(event) + "\n";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return new Response(ndjsonLine({ type: "error", error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const body = await req.json();
  const operationId = body.operationId as OperationId;
  const csvContent = body.csvContent as string | undefined;
  const params = body.params as Record<string, string> | undefined;

  const handler = getOperationHandler(operationId);
  if (!handler) {
    return new Response(ndjsonLine({ type: "error", error: "Unknown operation" }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const rows = csvContent ? parseCsv(csvContent).rows : [];
  const client = new ImanageClient(session);
  const workspaceMap = new Map<string, string>();
  const progressMeta = getProgressMeta(operationId);
  const total = operationId === "templates-export" ? 1 : rows.length;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: OperationStreamEvent) => {
        controller.enqueue(encoder.encode(ndjsonLine(event)));
      };

      send({
        type: "progress",
        current: 0,
        total,
        unit: progressMeta.unit,
        verb: progressMeta.verb,
        percent: 0,
      });

      const reportProgress = (p: OperationProgress) => {
        send({ type: "progress", ...p });
      };

      const onLog = (entry: OperationLogEntry) => {
        send({ type: "log", entry });
      };

      try {
        const result = await handler({
          client,
          rows,
          params,
          workspaceMap,
          reportProgress,
          onLog,
        });
        send({ type: "done", result });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Operation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
