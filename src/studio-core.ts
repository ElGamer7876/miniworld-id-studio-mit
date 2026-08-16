import { AUTHOR_LINE } from './edition.ts';
import { methodByKey, methodDefaultValue } from './catalog.ts';
export { AUTHOR_LINE } from './edition.ts';
export const MAX_PROJECT_BYTES = 2_621_440;
export const PROJECT_LAYOUT_VERSION = 2;

export type ActionType = 'message' | 'wait' | 'api' | 'raw' | 'if' | 'repeat' | 'set_variable';
export type StudioAction = { id: string; type: ActionType; label: string; value: string; method?: string; targets?: string; condition?: string; children?: StudioAction[] };
export type StudioCondition = { id: string; field: string; operator: '==' | '~=' | '>' | '>=' | '<' | '<='; value: string };
export type StudioVariable = { id: string; name: string; value: string; valueType: 'string' | 'number' | 'boolean'; scope: 'local' | 'global' };
export type StudioTrigger = { id: string; name: string; event: string; functionName: string; enabled: boolean; x: number; y: number; conditions: StudioCondition[]; variables: StudioVariable[]; actions: StudioAction[] };
export type StudioSettings = { keepTabOnAdd: boolean; showCodeOnMap: boolean; freeMapMovement: boolean; moveTriggers: boolean; easyMode: boolean; grid: boolean; zoom: number; mapX: number; mapY: number };
export type LocalMapLink={mapId:string;dataVersion:string;uiReferences:Array<{uiId:string;elementId?:string}>};
export type StudioProject = { format: 'miniworld-id-studio'; version: 2; layoutVersion: number; id: number; title: string; description: string; preamble: string; createdAt: string; updatedAt: string; activeView: 'map' | 'editor' | 'lua' | 'config' | 'localmaps'; settings: StudioSettings; triggers: StudioTrigger[]; localMap?:LocalMapLink };
export type SecurityResult = { status: 'safe' | 'warning' | 'blocked'; blocked: string[]; warnings: string[]; calls: string[]; executed: false };

const uid = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const identifier = (value: string): string => value.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '') || 'activar';
const luaString = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
const settings = (): StudioSettings => ({ keepTabOnAdd: false, showCodeOnMap: true, freeMapMovement: true, moveTriggers: true, easyMode: true, grid: true, zoom: 1, mapX: 0, mapY: 0 });

export function createProject(projectId = 1): StudioProject {
  const now = new Date().toISOString();
  return { format: 'miniworld-id-studio', version: 2, layoutVersion: PROJECT_LAYOUT_VERSION, id: projectId, title: 'Mi proyecto de Mini World', description: '', preamble: '', createdAt: now, updatedAt: now, activeView: 'map', settings: settings(), triggers: [createTrigger(1)] };
}

export function createTrigger(index: number): StudioTrigger {
  return { id: uid('trigger'), name: `Activador ${index}`, event: 'Game.Start', functionName: `activador${index}`, enabled: true, x: 70 + (index % 3) * 330, y: 70 + Math.floor(index / 3) * 260, conditions: [], variables: [], actions: [] };
}

export function createAction(type: ActionType): StudioAction {
  const values: Record<ActionType, [string, string]> = {
    message: ['Enviar mensaje', '¡Hola, Mini World!'], wait: ['Esperar', '1'], api: ['Llamar API', methodDefaultValue(methodByKey('Chat:sendSystemMsg')!)], raw: ['Lua libre', '-- Instrucción conservada'], if: ['Si se cumple', 'e.eventobjid ~= nil'], repeat: ['Repetir', '3'], set_variable: ['Cambiar variable', 'valor = 1'],
  };
  return { id: uid('action'), type, label: values[type][0], value: values[type][1], method: type === 'api' ? 'Chat:sendSystemMsg' : undefined, condition: type === 'if' ? values[type][1] : undefined, children: type === 'if' || type === 'repeat' ? [] : undefined };
}

export function createCondition(): StudioCondition { return { id: uid('condition'), field: 'e.eventobjid', operator: '==', value: 'nil' }; }
export function createVariable(): StudioVariable { return { id: uid('variable'), name: 'contador', value: '0', valueType: 'number', scope: 'local' }; }

function valueCode(variable: StudioVariable): string {
  if (variable.valueType === 'number') return String(Number(variable.value) || 0);
  if (variable.valueType === 'boolean') return variable.value === 'true' ? 'true' : 'false';
  return luaString(variable.value);
}

function actionLines(action: StudioAction, depth = 1): string[] {
  const pad = '    '.repeat(depth);
  if (action.type === 'message') return [`${pad}Chat:sendSystemMsg(${luaString(action.value)})`];
  if (action.type === 'wait') return [`${pad}Trigger:wait(${Math.max(0, Number(action.value) || 0)})`];
  if (action.type === 'api') { const targets = String(action.targets || '').split(',').map((value) => identifier(value.trim())).filter(Boolean).join(', '); return [`${pad}${targets ? `local ${targets} = ` : ''}${action.method || 'Chat:sendSystemMsg'}(${action.value})`]; }
  if (action.type === 'set_variable') return [`${pad}${action.value || 'valor = 1'}`];
  if (action.type === 'raw') return action.value.split(/\r?\n/).map((line) => `${pad}${line}`);
  if (action.type === 'if') return [`${pad}if ${action.condition || action.value || 'true'} then`, ...(action.children || []).flatMap((child) => actionLines(child, depth + 1)), `${pad}end`];
  const count = Math.min(1000, Math.max(1, Math.floor(Number(action.value) || 1)));
  return [`${pad}for _ = 1, ${count} do`, ...(action.children || []).flatMap((child) => actionLines(child, depth + 1)), `${pad}end`];
}

export function generateLua(project: StudioProject): string {
  const chunks = [AUTHOR_LINE, '-- Generado localmente por Mini World ID Studio.'];
  if (project.preamble.trim()) chunks.push('', project.preamble.trim());
  project.triggers.forEach((trigger, index) => {
    if (!trigger.enabled) { chunks.push('', `-- Activador deshabilitado: ${trigger.name}`); return; }
    const fn = identifier(trigger.functionName);
    const body: string[] = [];
    trigger.variables.forEach((variable) => body.push(`    ${variable.scope === 'local' ? 'local ' : ''}${identifier(variable.name)} = ${valueCode(variable)}`));
    if (trigger.conditions.length) {
      const expression = trigger.conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(' and ');
      body.push(`    if not (${expression}) then return end`);
    }
    trigger.actions.forEach((action) => body.push(...actionLines(action)));
    chunks.push('', '-- ==================================================', `-- Activador ${index + 1}: ${trigger.name}`, `local function ${fn}(e)`, ...(body.length ? body : ['    -- Sin acciones']), 'end', '', `ScriptSupportEvent:registerEvent([[${trigger.event}]], ${fn})`);
  });
  return chunks.join('\n');
}

function normalizeAction(input: Partial<StudioAction>): StudioAction {
  const allowed: ActionType[] = ['message', 'wait', 'api', 'raw', 'if', 'repeat', 'set_variable'];
  const type = allowed.includes(input.type as ActionType) ? input.type as ActionType : 'raw';
  const base = createAction(type);
  return { ...base, ...input, id: String(input.id || uid('action')), type, label: String(input.label || base.label).slice(0, 100), value: String(input.value ?? base.value), children: Array.isArray(input.children) ? input.children.map(normalizeAction) : base.children };
}

function normalizeTrigger(input: Partial<StudioTrigger>, index: number): StudioTrigger {
  const base = createTrigger(index + 1);
  const parsedX=Number(input.x),parsedY=Number(input.y);
  return { ...base, ...input, id: String(input.id || base.id), name: String(input.name || base.name).slice(0, 80), event: String(input.event || base.event), functionName: identifier(String(input.functionName || base.functionName)), x: Number.isFinite(parsedX) ? Math.max(0,parsedX) : base.x, y: Number.isFinite(parsedY) ? Math.max(0,parsedY) : base.y, conditions: Array.isArray(input.conditions) ? input.conditions.map((item) => ({ ...createCondition(), ...item, id: String(item.id || uid('condition')) })) : [], variables: Array.isArray(input.variables) ? input.variables.map((item) => ({ ...createVariable(), ...item, id: String(item.id || uid('variable')) })) : [], actions: Array.isArray(input.actions) ? input.actions.map(normalizeAction) : [] };
}

export function parseProject(text: string): StudioProject {
  if (new Blob([text]).size > MAX_PROJECT_BYTES) throw new Error('El archivo supera 2.5 MB.');
  const input = JSON.parse(text) as Partial<StudioProject>;
  if (input.format !== 'miniworld-id-studio' || !Array.isArray(input.triggers)) throw new Error('Proyecto no compatible.');
  const base = createProject(Math.max(1, Number(input.id) || 1));
  const legacyLayout=Number(input.layoutVersion||0)<1;
  const triggers=input.triggers.map(normalizeTrigger);
  if(legacyLayout){
    const occupied=new Set<string>();
    triggers.forEach((trigger,index)=>{
      let key=`${Math.round(trigger.x)}:${Math.round(trigger.y)}`;
      if((trigger.x===0&&trigger.y===0)||occupied.has(key)){
        const repaired=createTrigger(index+1);trigger.x=repaired.x;trigger.y=repaired.y;key=`${Math.round(trigger.x)}:${Math.round(trigger.y)}`;
      }
      occupied.add(key);
    });
  }
  return { ...base, ...input, version: 2, layoutVersion: PROJECT_LAYOUT_VERSION, preamble: String(input.preamble || ''), activeView: ['map', 'editor', 'lua', 'config', 'localmaps'].includes(String(input.activeView)) ? input.activeView as StudioProject['activeView'] : 'map', settings: { ...settings(), ...(input.settings || {}) }, triggers };
}

export function importLua(source: string, projectId: number): StudioProject {
  if (new Blob([source]).size > MAX_PROJECT_BYTES) throw new Error('El Lua supera 2.5 MB.');
  const project = createProject(projectId); project.title = 'Proyecto importado'; project.triggers = [];
  const registrations = Array.from(source.matchAll(/ScriptSupportEvent:registerEvent\s*\(\s*(?:\[=\[([\s\S]*?)\]=\]|\[\[([^\]]+)\]\]|["']([^"']+)["'])\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g));
  const firstFunction = source.search(/(?:local\s+)?function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/);
  project.preamble = (firstFunction > 0 ? source.slice(0, firstFunction) : '').replace(AUTHOR_LINE, '').trim();
  const functionBody = (callback: string): string => {
    const lines = source.split(/\r?\n/), start = lines.findIndex((line) => new RegExp(`(?:local\\s+)?function\\s+${callback}\\s*\\(`).test(line));
    if (start < 0) return '';
    const body: string[] = []; let depth = 1;
    for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex += 1) {
      const trimmed = lines[lineIndex].trim();
      if (/^(?:local\s+)?function\b|^(?:if|for|while)\b.*\bthen\b|^(?:if\b.*then|for\b.*do|while\b.*do|do)$/.test(trimmed)) depth += 1;
      if (/^end\s*;?$/.test(trimmed)) { depth -= 1; if (depth === 0) break; }
      body.push(lines[lineIndex]);
    }
    return body.join('\n');
  };
  registrations.forEach((registration, index) => {
    const event = registration[1] || registration[2] || registration[3] || 'Game.Start', callback = registration[4];
    const body = functionBody(callback);
    const trigger = createTrigger(index + 1); trigger.event = event; trigger.functionName = callback; trigger.name = `Cuando ${event}`; trigger.actions = [];
    body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      let match: RegExpMatchArray | null;
      if ((match = line.match(/^Trigger:wait\(([^)]*)\)/))) { const action = createAction('wait'); action.value = match[1]; trigger.actions.push(action); }
      else if ((match = line.match(/^Chat:sendSystemMsg\((.*)\)/))) { const action = createAction('message'); action.value = match[1].replace(/^["']|["']$/g, ''); trigger.actions.push(action); }
      else if ((match = line.match(/^(?:local\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)\s*=\s*)?([A-Za-z_][A-Za-z0-9_]*:[A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*;?$/))) { const action = createAction('api'); action.targets = match[1] || ''; action.method = match[2]; action.label = match[2]; action.value = match[3]; trigger.actions.push(action); }
      else { const last = trigger.actions.at(-1); if (last?.type === 'raw') last.value += `\n${line}`; else { const action = createAction('raw'); action.value = line; trigger.actions.push(action); } }
    });
    project.triggers.push(trigger);
  });
  if (!project.triggers.length) { const trigger = createTrigger(1); trigger.actions = [{ ...createAction('raw'), value: source.trim() }]; project.triggers.push(trigger); project.preamble = ''; }
  return project;
}

export function validateProject(project: StudioProject): string[] {
  const errors: string[] = [], names = new Set<string>();
  if (!project.title.trim()) errors.push('El proyecto necesita un título.');
  if (!project.triggers.length) errors.push('El proyecto necesita al menos un activador.');
  project.triggers.filter((trigger) => trigger.enabled).forEach((trigger) => { const fn = identifier(trigger.functionName); if (names.has(fn)) errors.push(`La función ${fn} está duplicada.`); names.add(fn); if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(trigger.event)) errors.push(`${trigger.name}: evento inválido.`); });
  if (new Blob([JSON.stringify(project)]).size > MAX_PROJECT_BYTES) errors.push('El proyecto supera 2.5 MB.');
  return errors;
}

export function scanLua(source: string): SecurityResult {
  const clean = source.replace(/--\[\[[\s\S]*?\]\]/g, '').replace(/--[^\r\n]*/g, '');
  const blockedRules: Array<[string, RegExp]> = [['Carga dinámica', /\b(?:require|dofile|loadfile|loadstring|load)\s*\(/i], ['Sistema operativo o archivos', /\b(?:os|io|package|debug|ffi)\s*\./i], ['Red externa', /\b(?:socket|http|https|curl|wget)\s*[.:]/i], ['Ejecución de procesos', /\b(?:execute|popen|spawn|shell|cmd)\s*\(/i]];
  const warningRules: Array<[string, RegExp]> = [['Bucle infinito literal', /\bwhile\s+true\s+do\b|\brepeat\b[\s\S]{0,300}\buntil\s+false\b/i], ['Bucle extremadamente grande', /\bfor\s+\w+\s*=\s*\d+\s*,\s*[1-9]\d{7,}\s+do\b/i]];
  const blocked = blockedRules.filter(([, regex]) => regex.test(clean)).map(([label]) => label), warnings = warningRules.filter(([, regex]) => regex.test(clean)).map(([label]) => label);
  const calls = Array.from(new Set(Array.from(source.matchAll(/\b([A-Z][A-Za-z0-9_]*:[A-Za-z_][A-Za-z0-9_]*)\s*\(/g)).map((match) => match[1])));
  return { status: blocked.length ? 'blocked' : warnings.length ? 'warning' : 'safe', blocked, warnings, calls, executed: false };
}
