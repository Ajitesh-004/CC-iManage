import type { OperationId } from "@/types";

/**
 * Sample CSV templates for each operation: header row + 2 example data rows.
 * Column names match what the operation handlers expect. Example rows show how
 * to fill values, including where to use semicolons (;) for multiple values.
 */
export const SAMPLE_CSV_HEADERS: Partial<Record<OperationId, string>> = {
  users: [
    "name,id,email,preferred_library,role_alias,is_external,user_password,pwd_never,force_pass,allow_logon,database,location",
    "user1,user1,user1@example.com,BLRJP,DEFAULT,FALSE,Password!234,FALSE,FALSE,TRUE,BLRJP,India",
    "user2,user2,user2@example.com,BLRUS,DEFAULT,FALSE,Password!234,FALSE,TRUE,TRUE,BLRJP;BLRUS,India",
  ].join("\n"),

  "groups-global": [
    "id,full_name,enabled,is_external,member",
    "group1,group1,TRUE,FALSE,user1",
    "group2,group2,TRUE,FALSE,user1;user2",
  ].join("\n"),

  "groups-library": [
    "id,database,full_name,enabled,is_external,member",
    "group1,BLRJP,group1,TRUE,FALSE,user1",
    "group2,BLRJP,group2,TRUE,FALSE,user1;user2",
  ].join("\n"),

  "roles-global": [
    "id,description,app_management,group_management,role_management,settings_management,user_management,encryption_management,feature_management,member",
    "role1,role1,no_access,admin,no_access,admin,no_access,admin,no_access,user1",
    "role2,role2,admin,no_access,admin,no_access,admin,no_access,admin,user1;user2",
  ].join("\n"),

  "roles-library": [
    "database,id,description,members,tier,read_only,external,custom_metadata_management,govern_security_management,import,checkout,unlock,delete,create_public_folder,create_public_search_folder,view_public_folder,view_public_search_folder,allow_index_search,display_public_documents,use_import_tool,use_monitor_tool,use_admin_tool,browse_workspace,search_workspace,author_workspace,share_workspace,delete_workspace",
    "BLRJP,role1,role1,user1,0,0,0,1,1,1,1,1,0,0,0,1,1,0,1,0,1,0,0,0,1,0,1",
    "BLRJP,role2,role2,user1;user2,0,0,1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,1,1,1,0,1,0",
  ].join("\n"),

  "file-types": [
    "id,description,app_extension,dms_extension,hipaa,database",
    "CSV01,Comma Separated Values,CSV01,%V,FALSE,BLRJP",
    "GIF01,GIF Image,GIF01,%V,TRUE,BLRUS",
  ].join("\n"),

  "file-handler": [
    "database,id,integration_mode,location,name,primary,dde,dde_app_name,dde_open,dde_read_open,dde_topic,dde_print,dde_print_1",
    "BLRJP,BMP,N,C:\\Program Files\\Notepad++,Notepad1,TRUE,FALSE,,,,,,",
    "BLRJP,CSV,T,C:\\Program Files\\Notepad++,Notepad2,FALSE,TRUE,appname,appname,appname,appname,appname,appname",
  ].join("\n"),

  classes: [
    "database,id,description,retain,default_security,shadow,hipaa,indexable,subclass_required,required_fields",
    "BLRJP,class1,name class 1,365,public,TRUE,FALSE,TRUE,FALSE,custom1;custom2",
    "BLRJP,class2,name class 2,365,private,FALSE,TRUE,FALSE,TRUE,custom3",
  ].join("\n"),

  subclasses: [
    "database,id,description,class,retain,default_security,shadow,hipaa,required_fields",
    "BLRJP,subclass1,sub class 1,CLASS1,365,private,TRUE,FALSE,custom1;custom2;custom4",
    "BLRJP,subclass2,sub class 2,CLASS2,365,public,FALSE,FALSE,custom3",
  ].join("\n"),

  customs: [
    "database,custom_type,id,description,enabled,parent",
    "BLRJP,custom3,Sample1,Sample description 1,TRUE,",
    "BLRJP,custom2,Sample2,Sample description 2,TRUE,Sample1",
  ].join("\n"),

  captions: [
    "id,label,database,locale",
    "description,Descripción,BLRJP,Spanish",
    "description,詳細,BLRJP,Japanese",
  ].join("\n"),

  "templates-create": [
    "name,description,database,author,operator,default_security,security_user,security_access",
    "Template1,Template1,BLRJP,ADMIN,ADMIN,private,user1;user2,full_access;read_write",
    "Template2,Template2,BLRJP,ADMIN,ADMIN,view,user1,full_access",
  ].join("\n"),

  "templates-folders": [
    "database,template_name,name,description",
    "BLRJP,Template1,Folder1,Folder 1 description",
    "BLRJP,Template2,Folder2,Folder 2 description",
  ].join("\n"),

  "templates-search-folders": [
    "database,template_name,name,description,owner,default_security,sp_custom1,sp_custom2,sp_custom13,sp_custom14,sp_custom15,sp_custom16,sp_databases,sp_documents_only,sp_description",
    "BLRJP,Template1,SFolder1,Search folder 1,ADMIN,Public,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,BLRJP,TRUE,Description sample",
    "BLRJP,Template2,SFolder2,Search folder 2,ADMIN,Private,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,BLRUS,TRUE,Description sample",
  ].join("\n"),

  "templates-tabs": [
    "database,template_name,name,description,owner",
    "BLRJP,Template1,Tab1,Tab 1 description,ADMIN",
    "BLRJP,Template2,Tab2,Tab 2 description,ADMIN",
  ].join("\n"),

  "templates-prefix-suffix": [
    "database,template_name,workspace,workspace_type,folder,folder_type,default_security",
    "BLRJP,Template1,Qwerty,0,Qwerty1,1,Public",
    "BLRJP,Template2,Qwerty,1,Qwerty2,0,Public",
  ].join("\n"),

  "templates-delete": [
    "type,database,template_name,folder_name,search_folder_name,tab_name",
    "folder,BLRJP,Template1,Folder1,,",
    "search_folder,BLRJP,Template1,,SFolder1,",
  ].join("\n"),

  "templates-bulk": [
    "operation,name,description,database,template_name,author,operator,default_security,security_user,security_access,owner,workspace,workspace_type,folder_type,sp_custom1,sp_custom2,sp_custom13,sp_custom14,sp_custom15,sp_custom16,sp_databases,sp_description",
    "Template,Template1,Template1,BLRJP,,ADMIN,,view,user1;user2,full_access;read_write,,,,,,,,,,,,",
    "Folder,Folder1,Folder 1 description,BLRJP,Template1,,,,,,,,,,,,,,,,,",
    "Tab,Tab1,Tab 1 description,BLRJP,Template1,,,,,,ADMIN,,,,,,,,,,,",
    "Search_Folder,SFolder1,Search folder 1,BLRJP,Template1,,,public,,,ADMIN,,,,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,%WORKSPACE_VALUE%,,,,BLRJP,Description sample",
  ].join("\n"),
};

export function getSampleCsv(id: OperationId): string | null {
  const content = SAMPLE_CSV_HEADERS[id];
  return content ? `${content}\n` : null;
}

export function getSampleCsvFilename(id: OperationId): string {
  return `${id}_sample.csv`;
}
