import type { StudioProject, StudioTrigger } from './studio-core';
import { createProject, parseProject } from './studio-core';
import { normalizePanelLayout } from './panel-layout';
import { createPlatformStore, openText, safeFileName, saveText } from './platform-storage';

const storePromise = createPlatformStore('studio-projects.json');
const recoveryStorePromise = createPlatformStore('studio-recovery.json');
const triggerTemplateStorePromise = createPlatformStore('studio-trigger-templates.json');
const preferenceStorePromise = createPlatformStore('studio-preferences.json');
const recoveryThrottle = new Map<number, number>();
const RECOVERY_LIMIT_PER_PROJECT = 20;
const RECOVERY_BYTE_BUDGET = 16 * 1024 * 1024;

export type RecoveryPoint = {id:string;projectId:number;title:string;at:string;reason:string;project:StudioProject};
export type TriggerTemplate = {id:string;name:string;createdAt:string;trigger:StudioTrigger};
export type StudioPreferences={favoriteMethods:string[];recentMethods:string[];projectPanelVisible:boolean;inspectorVisible:boolean;locale:'es'|'en'};
const normalizePreferences=(input?:Partial<StudioPreferences>):StudioPreferences=>({favoriteMethods:Array.from(new Set((input?.favoriteMethods||[]).map(String))).slice(0,50),recentMethods:Array.from(new Set((input?.recentMethods||[]).map(String))).slice(0,20),locale:input?.locale==='en'?'en':'es',...normalizePanelLayout(input)});
export async function loadStudioPreferences():Promise<StudioPreferences>{const store=await preferenceStorePromise;return normalizePreferences((await store.get<StudioPreferences>('preferences'))||undefined)}
export async function persistStudioPreferences(preferences:StudioPreferences):Promise<void>{const store=await preferenceStorePromise;await store.set('preferences',normalizePreferences(preferences));await store.save()}

export async function listTriggerTemplates():Promise<TriggerTemplate[]>{const store=await triggerTemplateStorePromise,items=(await store.get<TriggerTemplate[]>('templates'))||[];return items.flatMap(item=>{try{const probe=createProject(1);probe.triggers=[item.trigger];const trigger=parseProject(JSON.stringify(probe)).triggers[0];return [{...item,name:String(item.name||trigger.name).slice(0,80),trigger}]}catch{return []}})}
export async function saveTriggerTemplate(trigger:StudioTrigger,name:string):Promise<TriggerTemplate>{const store=await triggerTemplateStorePromise,items=await listTriggerTemplates(),now=Date.now(),item={id:`trigger_template_${now}`,name:(name.trim()||trigger.name).slice(0,80),createdAt:new Date(now).toISOString(),trigger:structuredClone(trigger)};const filtered=items.filter(existing=>existing.name.toLocaleLowerCase()!==item.name.toLocaleLowerCase());filtered.unshift(item);while(filtered.length>50||new Blob([JSON.stringify(filtered)]).size>4*1024*1024)filtered.pop();await store.set('templates',filtered);await store.save();return item}
export async function removeTriggerTemplate(id:string):Promise<void>{const store=await triggerTemplateStorePromise,items=(await store.get<TriggerTemplate[]>('templates'))||[];await store.set('templates',items.filter(item=>item.id!==id));await store.save()}

export async function createRecoveryPoint(project: StudioProject, reason: string, force = false): Promise<boolean> {
  const now=Date.now(),previousAt=recoveryThrottle.get(project.id)||0;if(!force&&now-previousAt<60_000)return false;
  const normalized=parseProject(JSON.stringify(project)),serialized=JSON.stringify(normalized),store=await recoveryStorePromise;let points=(await store.get<RecoveryPoint[]>('points'))||[];
  if(points.some(point=>point.projectId===project.id&&JSON.stringify(point.project)===serialized)){recoveryThrottle.set(project.id,now);return false;}
  points.unshift({id:`recovery_${project.id}_${now}`,projectId:project.id,title:project.title,at:new Date(now).toISOString(),reason:reason.slice(0,120),project:normalized});
  const perProject=new Map<number,number>();points=points.filter(point=>{const count=(perProject.get(point.projectId)||0)+1;perProject.set(point.projectId,count);return count<=RECOVERY_LIMIT_PER_PROJECT;});
  while(points.length&&new Blob([JSON.stringify(points)]).size>RECOVERY_BYTE_BUDGET)points.pop();
  await store.set('points',points);await store.save();recoveryThrottle.set(project.id,now);return true;
}

export async function listRecoveryPoints(projectId:number):Promise<RecoveryPoint[]>{const store=await recoveryStorePromise,points=(await store.get<RecoveryPoint[]>('points'))||[];return points.filter(point=>point.projectId===projectId).flatMap(point=>{try{return [{...point,project:parseProject(JSON.stringify(point.project))}]}catch{return []}})}
export async function clearRecoveryPoints(projectId:number):Promise<void>{const store=await recoveryStorePromise,points=(await store.get<RecoveryPoint[]>('points'))||[];await store.set('points',points.filter(point=>point.projectId!==projectId));await store.save();recoveryThrottle.delete(projectId)}

export async function listProjects(): Promise<StudioProject[]> {
  const store = await storePromise;
  const projects = (await store.get<StudioProject[]>('projects')) || [];
  return projects.flatMap((project) => {
    try { return [parseProject(JSON.stringify(project))]; } catch { return []; }
  });
}

export async function persistProjects(projects: StudioProject[]): Promise<void> {
  const store = await storePromise;
  await store.set('projects', projects);
  await store.save();
}

export async function exportProject(project: StudioProject): Promise<boolean> {
  return saveText('Guardar proyecto de Mini World ID Studio',`${safeFileName(project.title,'proyecto')}.mwstudio`,['mwstudio','json'],JSON.stringify(project,null,2),'application/json');
}

export async function importProject(): Promise<StudioProject | null> {
  const raw=await openText('Abrir proyecto de Mini World ID Studio',['mwstudio','json']);return raw===null?null:parseProject(raw);
}

export async function exportLua(project: StudioProject, lua: string): Promise<boolean> {
  return saveText('Exportar Lua',`${safeFileName(project.title,'script')}.lua`,['lua'],lua,'text/x-lua');
}
