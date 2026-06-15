import type { OperationContext, OperationHandler } from "./context";
import { makeResult } from "./context";
import { makeRowLogger, errorMessage } from "./logs";

function parseBool(v: string | undefined, fallback: boolean): boolean {
  const x = (v ?? String(fallback)).toLowerCase();
  return ["1", "true", "yes", "y"].includes(x);
}

export const runUsers: OperationHandler = async (ctx) => {
  const { client, rows } = ctx;
  const log = makeRowLogger(ctx, "users", "created");

  for (const row of rows) {
    log.tick();
    const id = row.id;
    const email = row.email;
    const database = row.database;

    if (!id || !email || !database) {
      log.skip("Create user", "missing id, email, or database");
      continue;
    }

    log.item(`User: ${id}`);
    const payload = {
      role_alias: row.role_alias || "",
      id,
      full_name: row.name || "",
      location: row.location || "",
      email,
      allow_logon: parseBool(row.allow_logon, true),
      pwd_never_expire: parseBool(row.pwd_never, false),
      is_external: parseBool(row.is_external, false),
      user_id_ex: id,
      user_nos: 2,
      preferred_library: row.preferred_library || "",
      ip_range_enabled: false,
      user_password: row.user_password || "",
      force_password_change: parseBool(row.force_pass, true),
    };

    const res = await client.post("/users", payload);
    if (res.ok) log.success("Create user", res.status);
    else log.failed("Create user", res.status, errorMessage(res.body));

    if (row.preferred_library) {
      await client.post(`/libraries/${row.preferred_library}/users`, payload);
    }

    for (const db of database.split(";").map((d) => d.trim()).filter(Boolean)) {
      const dbPayload = {
        allow_logon: payload.allow_logon,
        database: db,
        user_id: id,
        user_id_ex: id,
        user_nos: 2,
        id,
        full_name: row.name || "",
        email,
        role_alias: row.role_alias || "",
        preferred_library: row.preferred_library || "",
        is_external: payload.is_external,
      };
      const libRes = await client.post(`/libraries/${db}/users`, dbPayload);
      if (libRes.ok) log.success(`Assign library ${db}`, libRes.status);
      else log.failed(`Assign library ${db}`, libRes.status, errorMessage(libRes.body));
    }
  }

  return makeResult("users", log.logs);
};
