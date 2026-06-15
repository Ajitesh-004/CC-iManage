import type { OperationId } from "@/types";
import type { OperationHandler } from "./context";
import { runUsers } from "./users";
import {
  runTemplatesCreate,
  runTemplatesFolders,
  runTemplatesSearchFolders,
  runTemplatesTabs,
  runTemplatesPrefixSuffix,
  runTemplatesDelete,
  runTemplatesBulk,
  runTemplatesExport,
} from "./templates";
import {
  runGroupsGlobal,
  runGroupsLibrary,
  runRolesGlobal,
  runRolesLibrary,
  runFileTypes,
  runFileHandler,
  runClasses,
  runSubclasses,
  runCustoms,
  runCaptions,
} from "./legacy-ops";

const handlers: Record<OperationId, OperationHandler> = {
  users: runUsers,
  "groups-global": runGroupsGlobal,
  "groups-library": runGroupsLibrary,
  "roles-global": runRolesGlobal,
  "roles-library": runRolesLibrary,
  "file-types": runFileTypes,
  "file-handler": runFileHandler,
  classes: runClasses,
  subclasses: runSubclasses,
  customs: runCustoms,
  captions: runCaptions,
  "templates-create": runTemplatesCreate,
  "templates-folders": runTemplatesFolders,
  "templates-search-folders": runTemplatesSearchFolders,
  "templates-tabs": runTemplatesTabs,
  "templates-prefix-suffix": runTemplatesPrefixSuffix,
  "templates-delete": runTemplatesDelete,
  "templates-bulk": runTemplatesBulk,
  "templates-export": runTemplatesExport,
};

export function getOperationHandler(id: OperationId): OperationHandler | undefined {
  return handlers[id];
}

const PROGRESS_META: Record<OperationId, { unit: string; verb: string }> = {
  users: { unit: "users", verb: "created" },
  "groups-global": { unit: "groups", verb: "created" },
  "groups-library": { unit: "groups", verb: "created" },
  "roles-global": { unit: "roles", verb: "created" },
  "roles-library": { unit: "roles", verb: "created" },
  "file-types": { unit: "file types", verb: "created" },
  "file-handler": { unit: "handlers", verb: "created" },
  classes: { unit: "classes", verb: "created" },
  subclasses: { unit: "subclasses", verb: "created" },
  customs: { unit: "custom fields", verb: "created" },
  captions: { unit: "captions", verb: "updated" },
  "templates-create": { unit: "templates", verb: "created" },
  "templates-folders": { unit: "folders", verb: "created" },
  "templates-search-folders": { unit: "search folders", verb: "created" },
  "templates-tabs": { unit: "tabs", verb: "created" },
  "templates-prefix-suffix": { unit: "items", verb: "updated" },
  "templates-delete": { unit: "items", verb: "deleted" },
  "templates-bulk": { unit: "rows", verb: "processed" },
  "templates-export": { unit: "template", verb: "exported" },
};

export function getProgressMeta(id: OperationId) {
  return PROGRESS_META[id] ?? { unit: "items", verb: "processed" };
}

export const OPERATION_META: {
  id: OperationId;
  label: string;
  category: "main" | "template";
  needsCsv: boolean;
  description: string;
}[] = [
  { id: "users", label: "Create Users", category: "main", needsCsv: true, description: "Upload users.csv" },
  { id: "groups-global", label: "Groups (Global)", category: "main", needsCsv: true, description: "Global groups CSV" },
  { id: "groups-library", label: "Groups (Library)", category: "main", needsCsv: true, description: "Library groups CSV" },
  { id: "roles-global", label: "Roles (Global)", category: "main", needsCsv: true, description: "Global roles CSV" },
  { id: "roles-library", label: "Roles (Library)", category: "main", needsCsv: true, description: "Library roles CSV" },
  { id: "file-types", label: "Create File Type", category: "main", needsCsv: true, description: "types.csv" },
  { id: "file-handler", label: "Create File Handler", category: "main", needsCsv: true, description: "handlers.csv" },
  { id: "classes", label: "Create Class", category: "main", needsCsv: true, description: "class.csv" },
  { id: "subclasses", label: "Create Subclass", category: "main", needsCsv: true, description: "subclass.csv" },
  { id: "customs", label: "Add Custom", category: "main", needsCsv: true, description: "custom.csv" },
  { id: "captions", label: "Edit Captions", category: "main", needsCsv: true, description: "captions.csv" },
  { id: "templates-create", label: "Create Templates", category: "template", needsCsv: true, description: "template.csv" },
  { id: "templates-folders", label: "Create Folders", category: "template", needsCsv: true, description: "template_folder.csv" },
  { id: "templates-search-folders", label: "Create Search Folders", category: "template", needsCsv: true, description: "template_sfolder.csv" },
  { id: "templates-tabs", label: "Create Tabs", category: "template", needsCsv: true, description: "template_tab.csv" },
  { id: "templates-prefix-suffix", label: "Prefix/Suffix", category: "template", needsCsv: true, description: "ps.csv" },
  { id: "templates-delete", label: "Delete Template Items", category: "template", needsCsv: true, description: "template_delete.csv" },
  { id: "templates-bulk", label: "Bulk Template Ops", category: "template", needsCsv: true, description: "master.csv" },
  { id: "templates-export", label: "Export Template", category: "template", needsCsv: false, description: "Enter template name" },
];
