import { csvBoolJson } from "@/lib/csv/parse";
import type { CsvRow } from "@/types";
import type { OperationContext, OperationHandler } from "./context";
import { makeResult } from "./context";
import { createLogger, makeRowLogger, errorMessage } from "./logs";
import { getParentName, getSecuritySpec, TemplateResolver } from "./template-resolver";

async function applySecurity(
  client: OperationContext["client"],
  database: string,
  workspaceId: string,
  spec: string,
  log: ReturnType<typeof createLogger>
) {
  if (!spec) {
    log.skip("Apply security", "no users in CSV");
    return;
  }
  const include = spec.split(";").filter(Boolean).map((part) => {
    const [user, access = "full_access"] = part.split(":");
    return { id: user.trim(), type: "user", access_level: access.trim() };
  });
  const res = await client.post(`/libraries/${database}/workspaces/${workspaceId}/security`, {
    include,
    remove: [],
  });
  if (res.ok) log.success("Apply security", res.status);
  else log.failed("Apply security", res.status, errorMessage(res.body));
}

export const runTemplatesCreate: OperationHandler = async (ctx) => {
  const log = makeRowLogger(ctx, "templates", "created");
  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);

  for (const row of ctx.rows) {
    log.tick();
    if (!row.name || !row.database) {
      log.skip("Create template", "missing name or database");
      continue;
    }
    log.item(`Template: ${row.name} (${row.database})`);

    const existing = await resolver.exists(row.database, row.name);
    if (existing) {
      log.skip("Create template", `already exists: ${existing}`);
      continue;
    }

    const payload: Record<string, unknown> = {
      name: row.name,
      description: row.description || undefined,
      database: row.database,
      author: row.author || undefined,
      operator: row.operator || undefined,
      default_security: row.default_security || "public",
    };

    const res = await ctx.client.post(`/libraries/${row.database}/templates`, payload);
    if (!res.ok) {
      const msg = errorMessage(res.body);
      if (/exist|duplicate|already/i.test(msg)) {
        log.skip("Create template", "already exists");
      } else {
        log.failed("Create template", res.status, msg);
      }
      continue;
    }

    const body = res.body as Record<string, unknown>;
    const data = (body.data || body) as Record<string, string>;
    const workspaceId = data.id || (body.id as string);
    if (!workspaceId) {
      log.failed("Create template", res.status, "workspace ID missing");
      continue;
    }

    log.success("Create template", res.status);
    resolver.remember(row.database, row.name, workspaceId);
    await applySecurity(ctx.client, row.database, workspaceId, getSecuritySpec(row), log);
  }

  return makeResult("templates-create", log.logs);
};

async function runChildCreate(
  operationId: string,
  action: string,
  subpath: string,
  ctx: OperationContext,
  unit: string,
  buildPayload: (row: CsvRow, workspaceId: string) => Record<string, unknown>
) {
  const log = makeRowLogger(ctx, unit, "created");
  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);

  for (const row of ctx.rows) {
    log.tick();
    if (!row.database || !row.name) {
      log.skip(action, "missing database or name");
      continue;
    }
    const workspaceId = await resolver.resolve(row);
    if (!workspaceId) {
      log.skip(action, "set workspace_id or template_name");
      continue;
    }
    log.item(`${action}: ${row.name} (${workspaceId})`);
    const res = await ctx.client.post(
      `/libraries/${row.database}/workspaces/${workspaceId}/${subpath}`,
      buildPayload(row, workspaceId)
    );
    if (res.ok) log.success(action, res.status);
    else log.failed(action, res.status, errorMessage(res.body));
  }

  return makeResult(operationId, log.logs);
}

export const runTemplatesFolders: OperationHandler = (ctx) =>
  runChildCreate("templates-folders", "Create folder", "folders", ctx, "folders", (row) => ({
    name: row.name,
    description: row.description || "",
    database: row.database,
    default_security: "inherit",
  }));

export const runTemplatesTabs: OperationHandler = (ctx) =>
  runChildCreate("templates-tabs", "Create tab", "tabs", ctx, "tabs", (row) => ({
    name: row.name,
    description: row.description || "",
    owner: row.owner || "ADMIN",
  }));

export const runTemplatesSearchFolders: OperationHandler = (ctx) =>
  runChildCreate("templates-search-folders", "Create search folder", "search-folders", ctx, "search folders", (row) => {
    const sp: Record<string, unknown> = {};
    if (row.sp_custom1) sp.custom1 = row.sp_custom1;
    if (row.sp_custom2) sp.custom2 = row.sp_custom2;
    if (row.sp_custom13) sp.custom13 = row.sp_custom13;
    if (row.sp_custom14) sp.custom14 = row.sp_custom14;
    if (row.sp_custom15) sp.custom15 = row.sp_custom15;
    if (row.sp_custom16) sp.custom16 = row.sp_custom16;
    if (row.sp_databases) sp.databases = row.sp_databases;
    if (row.sp_description) sp.description = row.sp_description;
    sp.documents_only = csvBoolJson(row.sp_documents_only, "true") === "true";

    return {
      name: row.name,
      description: row.description || "",
      database: row.database,
      owner: row.owner || "ADMIN",
      default_security: (row.default_security || "inherit").toLowerCase(),
      searchprofile: sp,
    };
  });

export const runTemplatesPrefixSuffix: OperationHandler = async (ctx) => {
  const log = makeRowLogger(ctx, "items", "updated");
  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);

  const wrap = (v: string) => (v ? `<pre>${v}<pre>` : "");

  for (const row of ctx.rows) {
    log.tick();
    if (!row.database) {
      log.skip("Update prefix/suffix", "missing database");
      continue;
    }
    const workspaceId = await resolver.resolve(row);
    if (!workspaceId) {
      log.skip("Update prefix/suffix", "missing workspace id");
      continue;
    }
    if (row.workspace_type !== "0" && row.workspace_type !== "1") {
      log.skip("Update prefix/suffix", "workspace_type must be 0 or 1");
      continue;
    }
    if (row.folder_type !== "0" && row.folder_type !== "1") {
      log.skip("Update prefix/suffix", "folder_type must be 0 or 1");
      continue;
    }

    log.item(`Prefix/Suffix: ${workspaceId} (${row.database})`);
    const res = await ctx.client.patch(
      `/libraries/${row.database}/workspaces/${workspaceId}/name-value-pairs`,
      {
        IMCC_Default_Security: row.default_security || "public",
        IMCC_Template_PrefixSufix_Value: wrap(row.workspace || ""),
        IMCC_Template_Allow_Prefix: row.workspace_type,
        IMCC_Name_Prefix: wrap(row.folder || ""),
        IMCC_Allow_Prefix: row.folder_type,
      }
    );
    if (res.ok) log.success("Update prefix/suffix", res.status);
    else log.failed("Update prefix/suffix", res.status, errorMessage(res.body));
  }

  return makeResult("templates-prefix-suffix", log.logs);
};

function normalizeDeleteType(type: string): string {
  const t = type.toLowerCase().trim();
  if (["template", "templates"].includes(t)) return "template";
  if (["folder", "folders"].includes(t)) return "folder";
  if (["search_folder", "searchfolder", "search"].includes(t)) return "search_folder";
  if (["tab", "tabs"].includes(t)) return "tab";
  return "unknown";
}

async function findFolderIdByName(
  client: OperationContext["client"],
  db: string,
  name: string,
  dtype: string,
  parentWs?: string
): Promise<string | null> {
  const tryPick = (body: unknown) => {
    const items = normalizeItems(body);
    const lower = name.toLowerCase();
    for (const item of items) {
      const o = item as Record<string, unknown>;
      if ((o.name as string || "").toLowerCase() !== lower) continue;
      if (parentWs) {
        const p = String(o.workspace_id || o.parent_id || "").toLowerCase();
        if (p && p !== parentWs.toLowerCase()) continue;
      }
      if (dtype === "folder" && (o.is_content_saved_search || o.is_container_saved_search)) continue;
      if (dtype === "search_folder" && !o.is_content_saved_search && !o.is_container_saved_search) {
        const ft = String(o.folder_type || o.wstype || "").toLowerCase();
        if (!ft.includes("search")) continue;
      }
      if (dtype === "tab") {
        const ws = String(o.wstype || "").toLowerCase();
        const ft = String(o.folder_type || "").toLowerCase();
        if (ws !== "tab" && ft !== "tab") continue;
      }
      return String(o.id || "");
    }
    return null;
  };

  let res = await client.get(`/libraries/${db}/folders?name=${encodeURIComponent(name)}`);
  if (res.ok) {
    const id = tryPick(res.body);
    if (id) return id;
  }
  res = await client.get(`/libraries/${db}/folders`);
  if (res.ok) return tryPick(res.body);

  if (parentWs) {
    const sub =
      dtype === "folder" ? "folders" : dtype === "search_folder" ? "search-folders" : "tabs";
    const childRes = await client.get(`/libraries/${db}/workspaces/${parentWs}/${sub}`);
    if (childRes.ok) return tryPick(childRes.body);
  }
  return null;
}

function normalizeItems(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  const data = b.data ?? b;
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  return (d.results || d.folders || d.tabs || d.children || []) as unknown[];
}

export const runTemplatesDelete: OperationHandler = async (ctx) => {
  const log = makeRowLogger(ctx, "items", "deleted");
  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);

  for (const row of ctx.rows) {
    log.tick();
    const dtype = normalizeDeleteType(row.type || "");
    if (!row.database) {
      log.skip("Delete", "missing database");
      continue;
    }

    if (dtype === "template") {
      const tname = getParentName(row);
      if (!tname) {
        log.skip("Delete template", "missing template_name");
        continue;
      }
      const ws = await resolver.resolve({ ...row, template_name: tname });
      if (!ws) {
        log.skip("Delete template", `could not resolve ${tname}`);
        continue;
      }
      log.item(`Delete template: ${tname} (${ws})`);
      const res = await ctx.client.delete(`/libraries/${row.database}/workspaces/${ws}`);
      if (res.ok) log.success("Delete template", res.status);
      else log.failed("Delete template", res.status, errorMessage(res.body));
      continue;
    }

    const childName =
      dtype === "folder"
        ? row.folder_name
        : dtype === "search_folder"
          ? row.search_folder_name
          : row.tab_name;

    if (!childName) {
      log.skip(`Delete ${dtype}`, "missing item name");
      continue;
    }

    let childId = await findFolderIdByName(ctx.client, row.database, childName, dtype);
    const tname = getParentName(row);
    if (!childId && tname) {
      const ws = await resolver.resolve({ ...row, template_name: tname });
      if (ws) childId = await findFolderIdByName(ctx.client, row.database, childName, dtype, ws);
    }

    if (!childId) {
      log.failed(`Find ${dtype}`, 0, `'${childName}' not found`);
      continue;
    }

    log.item(`Delete ${dtype}: ${childName} (${childId})`);
    const res = await ctx.client.delete(`/libraries/${row.database}/folders/${childId}`);
    if (res.ok) log.success(`Delete ${dtype}`, res.status);
    else log.failed(`Delete ${dtype}`, res.status, errorMessage(res.body));
  }

  return makeResult("templates-delete", log.logs);
};

function normalizeBulkOp(op: string): string {
  const t = op.toLowerCase().trim();
  if (["template", "templates"].includes(t)) return "template";
  if (["folder", "folders"].includes(t)) return "folder";
  if (["search_folder", "searchfolder", "search"].includes(t)) return "search_folder";
  if (["tab", "tabs"].includes(t)) return "tab";
  if (["prefix", "prefix_suffix", "prefix/suffix"].includes(t)) return "prefix_suffix";
  return "unknown";
}

export const runTemplatesBulk: OperationHandler = async (ctx) => {
  const log = makeRowLogger(ctx, "rows", "processed");
  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);
  const bulkCtx = { ...ctx, workspaceMap: ctx.workspaceMap };

  for (let i = 0; i < ctx.rows.length; i++) {
    log.tick(`Row ${i + 2}`);
    const row = ctx.rows[i];
    const op = row.operation || row.Operation || "";
    if (!op) {
      log.skip(`Row ${i + 2}`, "missing Operation");
      continue;
    }
    log.item(`Row ${i + 2}: ${op}`);
    const kind = normalizeBulkOp(op);
    const singleRowCtx = { ...bulkCtx, rows: [row] };

    let result;
    switch (kind) {
      case "template":
        result = await runTemplatesCreate(singleRowCtx);
        break;
      case "folder":
        result = await runTemplatesFolders(singleRowCtx);
        break;
      case "search_folder":
        result = await runTemplatesSearchFolders(singleRowCtx);
        break;
      case "tab":
        result = await runTemplatesTabs(singleRowCtx);
        break;
      case "prefix_suffix":
        result = await runTemplatesPrefixSuffix(singleRowCtx);
        break;
      default:
        log.skip("Bulk", `unknown operation: ${op}`);
        continue;
    }
    log.logs.push(...result.logs);
  }

  return makeResult("templates-bulk", log.logs);
};

const EXPORT_HEADERS = [
  "operation", "name", "description", "database", "template_name", "author", "operator",
  "default_security", "security_user", "security_access", "owner", "workspace", "folder",
  "workspace_type", "folder_type", "sp_custom1", "sp_custom2", "sp_custom13", "sp_custom14",
  "sp_custom15", "sp_custom16", "sp_databases", "sp_documents_only", "sp_description",
  "has_subfolders", "id", "inherited_default_security", "is_content_saved_search",
  "is_external", "owner_description", "parent_id", "workspace_id", "workspace_name", "wstype",
];

export const runTemplatesExport: OperationHandler = async (ctx) => {
  const log = createLogger({
    total: 1,
    unit: "template",
    verb: "exported",
    reportProgress: ctx.reportProgress,
    onLog: ctx.onLog,
  });
  const db = ctx.params?.database || "";
  const tname = ctx.params?.templateName || "";
  if (!db || !tname) {
    log.failed("Export", 0, "database and templateName required");
    return makeResult("templates-export", log.logs);
  }

  log.tick(`Exporting ${tname}`);

  const resolver = new TemplateResolver(ctx.client, ctx.workspaceMap);
  const ws = await resolver.resolve({ database: db, template_name: tname });
  if (!ws) {
    log.failed("Export", 0, `template '${tname}' not found`);
    return makeResult("templates-export", log.logs);
  }

  const wsRes = await ctx.client.get(`/libraries/${db}/workspaces/${ws}`);
  const secRes = await ctx.client.get(`/libraries/${db}/workspaces/${ws}/security`);
  const childRes = await ctx.client.get(
    `/libraries/${db}/workspaces/${ws}/children?offset=0&limit=200&total=true`
  );
  const nvpRes = await ctx.client.get(`/libraries/${db}/workspaces/${ws}/name-value-pairs`);

  const rows: CsvRow[] = [];
  const w = ((wsRes.body as Record<string, unknown>).data || wsRes.body) as Record<string, string>;
  const secUsers = normalizeItems(secRes.body) as Record<string, string>[];

  rows.push({
    operation: "Template",
    name: w.name || tname,
    description: w.description || "",
    database: w.database || db,
    default_security: w.default_security || "",
    security_user: secUsers.map((u) => u.id || u.user || "").filter(Boolean).join(";"),
    security_access: secUsers.map((u) => u.access_level || u.access || "full_access").join(";"),
    owner: w.owner || "",
    folder_type: w.folder_type || "",
    has_subfolders: String(w.has_subfolders ?? ""),
    id: w.id || ws,
    inherited_default_security: w.inherited_default_security || "",
    is_content_saved_search: String(w.is_content_saved_search ?? ""),
    is_external: String(w.is_external_as_normal ?? ""),
    owner_description: w.owner_description || "",
    parent_id: w.parent_id || "",
    workspace_id: w.workspace_id || ws,
    workspace_name: w.workspace_name || "",
    wstype: w.wstype || "",
  });

  for (const child of normalizeItems(childRes.body)) {
    const c = child as Record<string, unknown>;
    const isSearch = c.is_content_saved_search || c.is_container_saved_search;
    const wsType = String(c.wstype || "").toLowerCase();
    const folderType = String(c.folder_type || "").toLowerCase();
    const isTab = wsType === "tab" || folderType === "tab";
    const op = isSearch ? "Search_Folder" : isTab ? "Tab" : "Folder";
    const sp = (c.searchprofile || c.profile || {}) as Record<string, string>;
    rows.push({
      operation: op,
      name: String(c.name || ""),
      description: String(c.description || ""),
      database: String(c.database || db),
      template_name: tname,
      default_security: String(c.default_security || ""),
      owner: String(c.owner || "ADMIN"),
      folder_type: String(c.folder_type || ""),
      sp_custom1: sp.custom1 || "",
      sp_custom2: sp.custom2 || "",
      sp_custom13: sp.custom13 || "",
      sp_custom14: sp.custom14 || "",
      sp_custom15: sp.custom15 || "",
      sp_custom16: sp.custom16 || "",
      sp_databases: sp.databases || "",
      sp_documents_only: sp.documents_only != null ? String(sp.documents_only) : "",
      sp_description: sp.description || "",
      has_subfolders: String(c.has_subfolders ?? ""),
      id: String(c.id ?? ""),
      inherited_default_security: String(c.inherited_default_security ?? ""),
      is_content_saved_search: String(c.is_content_saved_search ?? ""),
      is_external: String(c.is_external_as_normal ?? ""),
      owner_description: String(c.owner_description ?? ""),
      parent_id: String(c.parent_id ?? ""),
      workspace_id: String(c.workspace_id ?? ""),
      workspace_name: String(c.workspace_name ?? ""),
      wstype: String(c.wstype ?? ""),
    });
  }

  const pairs = ((nvpRes.body as Record<string, unknown>).data || nvpRes.body) as Record<string, string>;
  if (pairs.IMCC_Default_Security || pairs.IMCC_Template_PrefixSufix_Value || pairs.IMCC_Name_Prefix) {
    const strip = (s: string) => (s || "").replace(/<pre>/g, "").replace(/<\/pre>/g, "");
    rows.push({
      operation: "Prefix_Suffix",
      database: w.database || db,
      template_name: tname,
      default_security: pairs.IMCC_Default_Security || "public",
      workspace: strip(pairs.IMCC_Template_PrefixSufix_Value),
      folder: strip(pairs.IMCC_Name_Prefix),
      workspace_type: String(pairs.IMCC_Template_Allow_Prefix ?? ""),
      folder_type: String(pairs.IMCC_Allow_Prefix ?? ""),
      id: ws,
      workspace_id: ws,
    });
  }

  const { rowsToCsv } = await import("@/lib/csv/parse");
  const csv = rowsToCsv(EXPORT_HEADERS, rows);
  log.success("Export template", 200, `${rows.length} row(s)`);

  return makeResult("templates-export", log.logs, {
    exportCsv: csv,
    exportFilename: `${tname.replace(/[^a-zA-Z0-9._-]/g, "_")}_export.csv`,
  });
};
