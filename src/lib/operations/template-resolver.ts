import type { ImanageClient } from "@/lib/imanage/client";
import type { CsvRow } from "@/types";
import { workspaceMapKey } from "./context";

export function getParentName(row: CsvRow): string {
  return (
    row.template_name ||
    row.template ||
    row.parent_template ||
    row.parent_name ||
    ""
  );
}

export function getSecuritySpec(row: CsvRow): string {
  if (row.security_user) {
    if (row.security_user.includes(";")) {
      const users = row.security_user.split(";");
      const access = (row.security_access || "full_access").split(";");
      return users
        .map((u, i) => `${u.trim()}:${(access[i] || "full_access").trim()}`)
        .filter((s) => s.startsWith(":") === false && s.length > 1)
        .join(";");
    }
    return `${row.security_user.trim()}:${(row.security_access || "full_access").trim()}`;
  }
  return row.security_users || "";
}

export class TemplateResolver {
  constructor(
    private client: ImanageClient,
    private map: Map<string, string>
  ) {}

  remember(db: string, name: string, workspaceId: string) {
    this.map.set(workspaceMapKey(db, name), workspaceId);
  }

  async exists(db: string, name: string): Promise<string | null> {
    const cached = this.map.get(workspaceMapKey(db, name));
    if (cached) return cached;
    const fromList = await this.findInTemplatesList(db, name);
    return fromList;
  }

  async resolve(row: CsvRow): Promise<string | null> {
    const db = row.database;
    if (!db) return null;

    if (row.workspace_id) {
      const res = await this.client.get(`/libraries/${db}/workspaces/${row.workspace_id}`);
      if (res.ok) return row.workspace_id;
      return null;
    }

    const tname = getParentName(row);
    if (!tname) return row.id || null;

    const cached = this.map.get(workspaceMapKey(db, tname));
    if (cached) {
      const res = await this.client.get(`/libraries/${db}/workspaces/${cached}`);
      if (res.ok) return cached;
    }

    const fromList = await this.findInTemplatesList(db, tname);
    if (!fromList) return null;

    const res = await this.client.get(`/libraries/${db}/workspaces/${fromList}`);
    if (res.ok) {
      this.remember(db, tname, fromList);
      return fromList;
    }
    return null;
  }

  private async findInTemplatesList(db: string, name: string): Promise<string | null> {
    const res = await this.client.get<{ data?: unknown }>(`/libraries/${db}/templates`);
    if (!res.ok) return null;

    const items = normalizeArray(res.body);
    const lower = name.toLowerCase();
    for (const item of items) {
      const obj = item as Record<string, string>;
      const n = (obj.name || obj.template_name || obj.workspace_name || "").toLowerCase();
      if (n === lower) return obj.id || obj.workspace_id || null;
    }
    return null;
  }
}

function normalizeArray(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  const data = b.data ?? b;
  if (Array.isArray(data)) return data;
  const nested = (data as Record<string, unknown>).templates ?? (data as Record<string, unknown>).results;
  return Array.isArray(nested) ? nested : [];
}
