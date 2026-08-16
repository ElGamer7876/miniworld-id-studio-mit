import { normalizePanelLayout } from './panel-layout.ts';
import { createProject, parseProject, type StudioProject, type StudioTrigger } from './studio-core.ts';

export const WORKSPACE_BACKUP_FORMAT='miniworld-id-studio-workspace';
export const WORKSPACE_BACKUP_VERSION=1;
export const WORKSPACE_BACKUP_MAX_BYTES=16*1024*1024;

export type WorkspacePreferences={favoriteMethods:string[];recentMethods:string[];projectPanelVisible:boolean;inspectorVisible:boolean;locale:'es'|'en'};
export type WorkspaceTriggerTemplate={id:string;name:string;createdAt:string;trigger:StudioTrigger};
export type WorkspaceBackup={
  format:typeof WORKSPACE_BACKUP_FORMAT;
  version:typeof WORKSPACE_BACKUP_VERSION;
  exportedAt:string;
  projects:StudioProject[];
  preferences:WorkspacePreferences;
  templates:WorkspaceTriggerTemplate[];
};

const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const normalizePreferences=(value:unknown):WorkspacePreferences=>{
  const input=object(value)?value:{},layout=normalizePanelLayout(input);
  const list=(key:string,limit:number):string[]=>Array.from(new Set((Array.isArray(input[key])?input[key] as unknown[]:[]).map(String))).slice(0,limit);
  return{favoriteMethods:list('favoriteMethods',50),recentMethods:list('recentMethods',20),locale:input.locale==='en'?'en':'es',...layout};
};
const normalizeTemplate=(value:unknown,index:number):WorkspaceTriggerTemplate=>{
  if(!object(value)||!object(value.trigger))throw new Error(`Plantilla inválida en la posición ${index+1}.`);
  const probe=createProject(1);probe.triggers=[value.trigger as unknown as StudioTrigger];
  const trigger=parseProject(JSON.stringify(probe)).triggers[0];
  const name=String(value.name||trigger.name).trim().slice(0,80)||trigger.name;
  return{id:String(value.id||`backup_template_${index+1}`),name,createdAt:String(value.createdAt||new Date(0).toISOString()),trigger};
};

export function createWorkspaceBackup(projects:StudioProject[],preferences:WorkspacePreferences,templates:WorkspaceTriggerTemplate[]):WorkspaceBackup{
  if(!projects.length)throw new Error('No hay proyectos para respaldar.');
  return{format:WORKSPACE_BACKUP_FORMAT,version:WORKSPACE_BACKUP_VERSION,exportedAt:new Date().toISOString(),projects:projects.map(project=>parseProject(JSON.stringify(project))).slice(0,250),preferences:normalizePreferences(preferences),templates:templates.slice(0,50).map(normalizeTemplate)};
}

export function parseWorkspaceBackup(raw:string):WorkspaceBackup{
  if(new Blob([raw]).size>WORKSPACE_BACKUP_MAX_BYTES)throw new Error('El respaldo supera el límite de 16 MB.');
  let value:unknown;try{value=JSON.parse(raw)}catch{throw new Error('El respaldo no contiene JSON válido.')}
  if(!object(value)||value.format!==WORKSPACE_BACKUP_FORMAT||value.version!==WORKSPACE_BACKUP_VERSION)throw new Error('El archivo no es un respaldo compatible de Mini World ID Studio.');
  if(!Array.isArray(value.projects)||value.projects.length<1||value.projects.length>250)throw new Error('El respaldo debe contener entre 1 y 250 proyectos.');
  if(value.templates!==undefined&&!Array.isArray(value.templates))throw new Error('La lista de plantillas del respaldo es inválida.');
  return{format:WORKSPACE_BACKUP_FORMAT,version:WORKSPACE_BACKUP_VERSION,exportedAt:String(value.exportedAt||new Date(0).toISOString()),projects:value.projects.map(project=>parseProject(JSON.stringify(project))),preferences:normalizePreferences(value.preferences),templates:(value.templates||[]).slice(0,50).map(normalizeTemplate)};
}

export function mergeWorkspaceProjects(current:StudioProject[],incoming:StudioProject[]):{projects:StudioProject[];imported:StudioProject[]}{
  const used=new Set(current.map(project=>project.id));let next=Math.max(0,...used)+1;
  const imported=incoming.map(source=>{const project=parseProject(JSON.stringify(source));if(used.has(project.id)){while(used.has(next))next+=1;project.id=next;next+=1}used.add(project.id);return project});
  return{projects:[...imported,...current],imported};
}
