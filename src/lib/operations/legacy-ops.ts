/**
 * Ported from script.sh — groups, roles, file types, classes, customs, captions.
 */
import type { OperationHandler } from "./context";
import { makeResult } from "./context";
import { makeRowLogger, errorMessage } from "./logs";

function parseBool(v: string | undefined, fallback: boolean): boolean {
  const x = (v ?? String(fallback)).toLowerCase();
  return ["1", "true", "yes", "y"].includes(x);
}

function bit(flag: string | undefined, value: number): number {
  return flag === "1" ? value : 0;
}

export const runGroupsGlobal: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "groups", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id) {
      log.skip("Create group", "missing id");
      continue;
    }

    log.item(`Group: ${row.id}`);

    const payload = {
      id: row.id,
      full_name: row.full_name || "",
      enabled: parseBool(row.enabled, true),
      is_external: parseBool(row.is_external, false),
      group_nos: 2,
    };

    const res = await client.put(`/groups/${row.id}`, payload);
    if (res.ok) log.success("Create group", res.status);
    else log.failed("Create group", res.status, errorMessage(res.body));

    if (row.member) {
      for (const m of row.member.split(";").map((x) => x.trim()).filter(Boolean)) {
        const mRes = await client.put(`/groups/${row.id}/members`, {
          data_type: "users",
          data: [m],
          action: "add",
        });
        if (mRes.ok) log.success(`Add member ${m}`, mRes.status);
        else log.failed(`Add member ${m}`, mRes.status, errorMessage(mRes.body));
      }
    }
  }
  return makeResult("groups-global", log.logs);
};

export const runGroupsLibrary: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "groups", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id || !row.database) {
      log.skip("Create library group", "missing id/database");
      continue;
    }
    const payload: Record<string, unknown> = {
      id: row.id,
      full_name: row.full_name || "",
      enabled: parseBool(row.enabled, true),
      is_external: parseBool(row.is_external, false),
      database: row.database,
    };
    if (row.group_nos) payload.group_nos = Number(row.group_nos);

    const res = await client.post(`/libraries/${row.database}/groups`, payload);
    if (res.ok) log.success("Create library group", res.status);
    else log.failed("Create library group", res.status, errorMessage(res.body));

    if (row.member) {
      for (const m of row.member.split(";").map((x) => x.trim()).filter(Boolean)) {
        const mRes = await client.put(`/libraries/${row.database}/groups/${row.id}/members`, {
          data_type: "users",
          data: [m],
          action: "add",
        });
        if (mRes.ok) log.success(`Add member ${m}`, mRes.status);
        else log.failed(`Add member ${m}`, mRes.status, errorMessage(mRes.body));
      }
    }
  }
  return makeResult("groups-library", log.logs);
};

export const runRolesGlobal: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "roles", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id) {
      log.skip("Create role", "missing id");
      continue;
    }
    const payload = {
      id: row.id,
      description: row.description || "",
      app_management: row.app_management || "no_access",
      group_management: row.group_management || "no_access",
      role_management: row.role_management || "no_access",
      settings_management: row.settings_management || "no_access",
      user_management: row.user_management || "no_access",
      encryption_management: row.encryption_management || "no_access",
      feature_management: row.feature_management || "no_access",
    };
    const res = await client.post("/roles", payload);
    if (res.ok) log.success("Create role", res.status);
    else log.failed("Create role", res.status, errorMessage(res.body));

    if (row.member) {
      const include = row.member.split(";").filter(Boolean).map((m) => ({
        id: m.trim(),
        type: "user",
      }));
      const mRes = await client.patch(`/roles/${row.id}/members`, { include, exclude: [] });
      if (mRes.ok) log.success("Add role members", mRes.status);
      else log.failed("Add role members", mRes.status, errorMessage(mRes.body));
    }
  }
  return makeResult("roles-global", log.logs);
};

export const runRolesLibrary: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "roles", "created");
  for (const row of rows) {
    log.tick();
    if (!row.database || !row.id) {
      log.skip("Create library role", "missing database/id");
      continue;
    }
    const m1 =
      row.read_only === "1"
        ? 16 +
          bit(row.view_public_folder, 512) +
          bit(row.view_public_search_folder, 1024) +
          bit(row.display_public_documents, 4096)
        : bit(row.import, 1) +
          bit(row.checkout, 2) +
          bit(row.unlock, 4) +
          bit(row.delete, 8) +
          bit(row.create_public_folder, 32) +
          bit(row.create_public_search_folder, 64) +
          bit(row.view_public_folder, 512) +
          bit(row.view_public_search_folder, 1024) +
          bit(row.allow_index_search, 2048) +
          bit(row.display_public_documents, 4096);

    const m2 =
      bit(row.use_import_tool, 1) +
      bit(row.use_monitor_tool, 2) +
      bit(row.use_admin_tool, 4) +
      bit(row.external, 16);
    const m3 =
      bit(row.browse_workspace, 1) +
      bit(row.search_workspace, 2) +
      bit(row.author_workspace, 4) +
      bit(row.share_workspace, 8) +
      bit(row.delete_workspace, 128);

    const payload = {
      database: row.database,
      id: row.id,
      description: row.description || "",
      nvps: [],
      profiles: [],
      m1,
      m2,
      m3,
      m4_bits: {
        tier: row.external === "1" ? 0 : Number(row.tier || 0),
        custom_metadata_management: row.custom_metadata_management === "1",
        govern_security_management: row.govern_security_management === "1",
      },
    };

    const res = await client.post(`/libraries/${row.database}/roles`, payload);
    if (res.ok) log.success("Create library role", res.status);
    else log.failed("Create library role", res.status, errorMessage(res.body));

    if (row.members) {
      for (const u of row.members.split(";").map((x) => x.trim()).filter(Boolean)) {
        const uRes = await client.post(
          `/libraries/${row.database}/roles/${row.id}/users/${u}`,
          { data_type: "users", data: u, action: "add", database: row.database }
        );
        if (uRes.ok) log.success(`Add user ${u}`, uRes.status);
        else log.failed(`Add user ${u}`, uRes.status, errorMessage(uRes.body));
      }
    }
  }
  return makeResult("roles-library", log.logs);
};

export const runFileTypes: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "file types", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id || !row.description || !row.app_extension || !row.dms_extension || !row.database) {
      log.skip("Create file type", "missing mandatory fields");
      continue;
    }
    const res = await client.post(`/libraries/${row.database}/types`, {
      id: row.id,
      description: row.description,
      app_extension: row.app_extension,
      dms_extension: row.dms_extension,
      hipaa: parseBool(row.hipaa, true),
      database: row.database,
    });
    if (res.ok) log.success("Create file type", res.status);
    else log.failed("Create file type", res.status, errorMessage(res.body));
  }
  return makeResult("file-types", log.logs);
};

export const runFileHandler: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "handlers", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id || !row.name || !row.location || !row.integration_mode || !row.database) {
      log.skip("Create file handler", "missing mandatory fields");
      continue;
    }
    const dde = parseBool(row.dde, false);
    const payload: Record<string, unknown> = {
      id: row.id,
      name: row.name,
      location: row.location,
      integration_mode: row.integration_mode,
      database: row.database,
      primary: parseBool(row.primary, false),
      dde,
    };
    if (dde) {
      Object.assign(payload, {
        dde_app_name: row.dde_app_name,
        dde_topic: row.dde_topic,
        dde_open: row.dde_open,
        dde_read_open: row.dde_read_open,
        dde_print: row.dde_print,
        dde_print_1: row.dde_print_1,
      });
    }
    const res = await client.post(`/libraries/${row.database}/appsetup`, payload);
    if (res.ok) log.success("Create file handler", res.status);
    else log.failed("Create file handler", res.status, errorMessage(res.body));
  }
  return makeResult("file-handler", log.logs);
};

export const runClasses: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "classes", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id || !row.description || !row.database) {
      log.skip("Create class", "missing mandatory fields");
      continue;
    }
    const rf = row.required_fields
      ? row.required_fields.split(";").filter(Boolean)
      : [];
    const res = await client.post(`/libraries/${row.database}/classes`, {
      retain: Number(row.retain),
      hipaa: parseBool(row.hipaa, true),
      indexable: parseBool(row.indexable, true),
      shadow: parseBool(row.shadow, false),
      default_security: row.default_security,
      id: row.id,
      description: row.description,
      subclass_required: parseBool(row.subclass_required, false),
      required_fields: rf,
      database: row.database,
    });
    if (res.ok) log.success("Create class", res.status);
    else log.failed("Create class", res.status, errorMessage(res.body));
  }
  return makeResult("classes", log.logs);
};

export const runSubclasses: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "subclasses", "created");
  for (const row of rows) {
    log.tick();
    if (!row.retain || !row.default_security || !row.id || !row.description || !row.database || !row.class) {
      log.skip("Create subclass", "missing mandatory fields");
      continue;
    }
    const rf = row.required_fields ? row.required_fields.split(";").filter(Boolean) : [];
    const res = await client.post(`/libraries/${row.database}/classes/${row.class}/subclasses`, {
      retain: Number(row.retain),
      hipaa: parseBool(row.hipaa, true),
      shadow: parseBool(row.shadow, false),
      default_security: row.default_security,
      id: row.id,
      description: row.description,
      required_fields: rf,
      database: row.database,
    });
    if (res.ok) log.success("Create subclass", res.status);
    else log.failed("Create subclass", res.status, errorMessage(res.body));
  }
  return makeResult("subclasses", log.logs);
};

export const runCustoms: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "custom fields", "created");
  for (const row of rows) {
    log.tick();
    if (!row.id || !row.description || !row.enabled || !row.database || !row.custom_type) {
      log.skip("Create custom", "missing mandatory fields");
      continue;
    }
    if (!/^custom([1-9]|[12][0-9]|30)$/.test(row.custom_type)) {
      log.skip("Create custom", `invalid custom_type: ${row.custom_type}`);
      continue;
    }
    const payload: Record<string, unknown> = {
      id: row.id,
      description: row.description,
      enabled: parseBool(row.enabled, true),
    };
    if (row.custom_type === "custom2" || row.custom_type === "custom30") {
      if (!row.parent) {
        log.skip("Create custom", "parent required");
        continue;
      }
      payload.parent = { id: row.parent };
    } else if (row.parent) {
      log.skip("Create custom", "parent must be empty");
      continue;
    }
    const res = await client.post(`/libraries/${row.database}/customs/${row.custom_type}`, payload);
    if (res.ok) log.success(`Create ${row.custom_type}`, res.status);
    else log.failed(`Create ${row.custom_type}`, res.status, errorMessage(res.body));
  }
  return makeResult("customs", log.logs);
};

function mapLocaleToCode(input: string): number | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "_");
  const LOCALE_MAP: Record<string, number> = {
    french: 1036,
    chinese: 2052,
    spanish: 1034,
    "french(canadian)": 3084,
    "french-canadian": 3084,
    french_canadian: 3084,
    english: 1033,
    japanese: 1041,
    portugese: 1046,
    portuguese: 1046,
    german: 1031,
  };
  if (LOCALE_MAP[normalized] != null) return LOCALE_MAP[normalized];
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return null;
}

export const runCaptions: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "captions", "updated");
  for (const row of rows) {
    log.tick();
    const id = row.id;
    const label = row.label;
    const database = row.database;
    const localeRaw = row.locale || row.language || "";

    if (!id || !label || !database || !localeRaw) {
      log.skip("Edit caption", "missing id, label, database, or locale");
      continue;
    }

    const localeCode = mapLocaleToCode(localeRaw);
    if (localeCode == null) {
      log.skip("Edit caption", `unsupported locale: ${localeRaw}`);
      continue;
    }

    log.item(`Caption: ${id} (${database}, locale ${localeCode})`);

    const res = await client.put(`/libraries/${database}/captions/${id}`, {
      database,
      label,
      id,
      locale: localeCode,
    });

    if (res.ok) log.success("Edit caption", res.status);
    else log.failed("Edit caption", res.status, errorMessage(res.body));
  }
  return makeResult("captions", log.logs);
};
