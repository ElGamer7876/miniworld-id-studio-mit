import { AUTHOR_LINE } from './edition.ts';
import { eventById, methodByKey, methodDefaultValue, splitLuaArguments } from './catalog.ts';
export { AUTHOR_LINE } from './edition.ts';
export const MAX_PROJECT_BYTES = 2_621_440;
export const PROJECT_LAYOUT_VERSION = 2;

export type ActionType = 'message' | 'wait' | 'api' | 'raw' | 'if' | 'repeat' | 'set_variable';
export type StudioAction = { id: string; type: ActionType; label: string; value: string; method?: string; targets?: string; condition?: string; children?: StudioAction[] };
export type StudioCondition = { id: string; field: string; operator: '==' | '~=' | '>' | '>=' | '<' | '<='; value: string };
export type StudioVariable = { id: string; name: string; value: string; valueType: 'string' | 'number' | 'boolean'; scope: 'local' | 'global' };
export type StudioTrigger = { id: string; name: string; event: string; functionName: string; enabled: boolean; x: number; y: number; conditions: StudioCondition[]; variables: StudioVariable[]; actions: StudioAction[] };
export type EditorMode='basic'|'intermediate'|'advanced';
export type StudioSettings = { keepTabOnAdd: boolean; showCodeOnMap: boolean; freeMapMovement: boolean; moveTriggers: boolean; easyMode: boolean; grid: boolean; zoom: number; mapX: number; mapY: number; editorMode:EditorMode };
export type LocalMapLink={mapId:string;dataVersion:string;uiReferences:Array<{uiId:string;elementId?:string}>};
export type StudioView = 'map' | 'editor' | 'lua' | 'diagnostics' | 'config' | 'localmaps';
export type StudioProject = { format: 'miniworld-id-studio'; version: 2; layoutVersion: number; id: number; title: string; description: string; preamble: string; createdAt: string; updatedAt: string; activeView: StudioView; settings: StudioSettings; triggers: StudioTrigger[]; localMap?:LocalMapLink };
export type SecurityResult = { status: 'safe' | 'warning' | 'blocked'; blocked: string[]; warnings: string[]; calls: string[]; executed: false };
export type ProjectIssue = { id: string; severity: 'error' | 'warning' | 'info'; code: string; message: string; triggerId?: string; actionId?: string };
export type ProjectSearchResult = {id:string;kind:'activador'|'evento'|'variable'|'condición'|'acción';title:string;detail:string;triggerId:string;actionId?:string;score:number};
export type TriggerMetrics={triggerId:string;name:string;enabled:boolean;actions:number;apiCalls:number;rawBlocks:number;conditions:number;variables:number;maxDepth:number;complexity:number};
export type ProjectMetrics={triggers:number;enabledTriggers:number;actions:number;apiCalls:number;rawBlocks:number;conditions:number;variables:number;maxDepth:number;complexity:number;complexityLevel:'baja'|'media'|'alta';methods:Array<{name:string;count:number}>;events:Array<{name:string;count:number}>;byTrigger:TriggerMetrics[]};
export type VariableRenameResult={ok:boolean;references:number;oldName:string;newName:string;error?:string};

const uid = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const identifier = (value: string): string => value.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '') || 'activar';
const luaString = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
const settings = (): StudioSettings => ({ keepTabOnAdd: false, showCodeOnMap: true, freeMapMovement: true, moveTriggers: true, easyMode: true, grid: true, zoom: 1, mapX: 0, mapY: 0,editorMode:'basic' });

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

export function cloneAction(source:StudioAction):StudioAction{const copy={...structuredClone(source),id:uid('action')};if(source.children)copy.children=source.children.map(cloneAction);return copy;}
export function cloneTrigger(source:StudioTrigger,index:number,options:{rename?:boolean;offset?:number}={}):StudioTrigger{const rename=options.rename??true,offset=options.offset??40,copy=structuredClone(source);copy.id=uid('trigger');copy.name=rename?`${source.name} copia`:source.name;copy.functionName=rename?`${identifier(source.functionName)}_copia`:identifier(source.functionName);copy.x=Math.max(0,source.x+offset);copy.y=Math.max(0,source.y+offset);copy.conditions=source.conditions.map(condition=>({...structuredClone(condition),id:uid('condition')}));copy.variables=source.variables.map(variable=>({...structuredClone(variable),id:uid('variable')}));copy.actions=source.actions.map(cloneAction);if(!copy.name.trim())copy.name=`Activador ${index}`;return copy;}

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
  const editorMode=['basic','intermediate','advanced'].includes(String(input.settings?.editorMode))?input.settings?.editorMode as EditorMode:'basic';
  return { ...base, ...input, version: 2, layoutVersion: PROJECT_LAYOUT_VERSION, preamble: String(input.preamble || ''), activeView: ['map', 'editor', 'lua', 'diagnostics', 'config', 'localmaps'].includes(String(input.activeView)) ? input.activeView as StudioProject['activeView'] : 'map', settings: { ...settings(), ...(input.settings || {}),editorMode }, triggers };
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

export function inspectProject(project: StudioProject): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const push = (severity: ProjectIssue['severity'], code: string, message: string, triggerId?: string, actionId?: string): void => {
    issues.push({ id: `${code}:${triggerId || 'project'}:${actionId || issues.length}`, severity, code, message, triggerId, actionId });
  };
  if (!project.title.trim()) push('error', 'project-title', 'El proyecto necesita un título.');
  if (!project.triggers.length) push('error', 'project-empty', 'El proyecto necesita al menos un activador.');
  if (new Blob([JSON.stringify(project)]).size > MAX_PROJECT_BYTES) push('error', 'project-size', 'El proyecto supera 2.5 MB.');
  const functionOwners = new Map<string, StudioTrigger>(), positions = new Map<string, StudioTrigger>();
  const inspectActions = (trigger: StudioTrigger, actions: StudioAction[]): void => actions.forEach((action) => {
    if (action.type === 'raw' && action.value.trim()) push('warning', 'raw-lua', `${trigger.name}: contiene Lua libre que requiere revisión manual.`, trigger.id, action.id);
    if (action.type === 'wait' && (!Number.isFinite(Number(action.value)) || Number(action.value) < 0)) push('error', 'wait-value', `${trigger.name}: el tiempo de espera debe ser un número mayor o igual a cero.`, trigger.id, action.id);
    if (action.type === 'repeat' && (!Number.isInteger(Number(action.value)) || Number(action.value) < 1 || Number(action.value) > 1000)) push('error', 'repeat-value', `${trigger.name}: las repeticiones deben ser un entero entre 1 y 1000.`, trigger.id, action.id);
    if (action.type === 'api') {
      const method = methodByKey(action.method || '');
      if (!method) push('error', 'api-unknown', `${trigger.name}: la llamada ${action.method || '(vacía)'} no está en el catálogo.`, trigger.id, action.id);
      else {
        const args = splitLuaArguments(action.value), required = method.params.filter((param) => !param.optional).length;
        if (args.length < required) push('error', 'api-arguments-missing', `${trigger.name}: ${method.name} necesita al menos ${required} valores; recibió ${args.length}.`, trigger.id, action.id);
        else if (args.length > method.params.length) push('error', 'api-arguments-extra', `${trigger.name}: ${method.name} admite como máximo ${method.params.length} valores; recibió ${args.length}.`, trigger.id, action.id);
        const targets = String(action.targets || '').split(',').map((value) => value.trim()).filter(Boolean);
        if (targets.length && targets.length !== method.results.length) push('warning', 'api-results', `${trigger.name}: ${method.name} devuelve ${method.results.length} valor(es), pero se asignan ${targets.length}.`, trigger.id, action.id);
      }
    }
    if ((action.type === 'if' || action.type === 'repeat') && !(action.children || []).length) push('info', 'container-empty', `${trigger.name}: “${action.label}” todavía no contiene acciones.`, trigger.id, action.id);
    if (action.children?.length) inspectActions(trigger, action.children);
  });
  project.triggers.forEach((trigger) => {
    const fn = identifier(trigger.functionName);
    if (!trigger.functionName.trim()) push('error', 'function-empty', `${trigger.name}: falta el nombre de la función.`, trigger.id);
    if (fn !== trigger.functionName) push('warning', 'function-normalized', `${trigger.name}: el nombre se exportará como ${fn}.`, trigger.id);
    const owner = functionOwners.get(fn); if (owner) push('error', 'function-duplicate', `${trigger.name}: comparte la función ${fn} con ${owner.name}.`, trigger.id); else functionOwners.set(fn, trigger);
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(trigger.event)) push('error', 'event-invalid', `${trigger.name}: el evento ${trigger.event || '(vacío)'} no es válido.`, trigger.id);
    else if (!eventById(trigger.event)) push('warning', 'event-custom', `${trigger.name}: ${trigger.event} no está documentado en el catálogo local.`, trigger.id);
    if (trigger.enabled && !trigger.actions.length) push('info', 'trigger-empty', `${trigger.name}: está habilitado pero no contiene acciones.`, trigger.id);
    const variableNames = new Set<string>();
    trigger.variables.forEach((variable) => { const name = identifier(variable.name); if (name !== variable.name) push('error', 'variable-name', `${trigger.name}: la variable “${variable.name || '(vacía)'}” no tiene un nombre Lua válido.`, trigger.id); if (variableNames.has(name)) push('error', 'variable-duplicate', `${trigger.name}: la variable ${name} está duplicada.`, trigger.id); variableNames.add(name); });
    const positionKey = `${Math.round(trigger.x)}:${Math.round(trigger.y)}`, positionOwner = positions.get(positionKey);
    if (positionOwner) push('warning', 'trigger-overlap', `${trigger.name} está superpuesto con ${positionOwner.name} en el mapa.`, trigger.id); else positions.set(positionKey, trigger);
    inspectActions(trigger, trigger.actions);
  });
  return issues;
}

export function replaceLuaIdentifier(source:string,from:string,to:string):{value:string;replacements:number}{if(!from||from===to)return{value:source,replacements:0};let output='',index=0,replacements=0;const identifierStart=(value:string):boolean=>/[A-Za-z_]/.test(value),identifierPart=(value:string):boolean=>/[A-Za-z0-9_]/.test(value);while(index<source.length){const char=source[index],next=source[index+1];if(char==='-'&&next==='-'){if(source.slice(index,index+4)==='--[['){const end=source.indexOf(']]',index+4),stop=end<0?source.length:end+2;output+=source.slice(index,stop);index=stop;continue}const end=source.indexOf('\n',index+2),stop=end<0?source.length:end;output+=source.slice(index,stop);index=stop;continue}if(char==='"'||char==="'"){const quote=char,start=index++;while(index<source.length){if(source[index]==='\\'){index+=2;continue}if(source[index++]===quote)break}output+=source.slice(start,index);continue}if(char==='['&&next==='['){const end=source.indexOf(']]',index+2),stop=end<0?source.length:end+2;output+=source.slice(index,stop);index=stop;continue}if(identifierStart(char)){const start=index++;while(index<source.length&&identifierPart(source[index]))index+=1;const token=source.slice(start,index);if(token===from){output+=to;replacements+=1}else output+=token;continue}output+=char;index+=1}return{value:output,replacements}}

export function renameVariableReferences(project:StudioProject,triggerId:string,variableId:string,newName:string):VariableRenameResult{const owner=project.triggers.find(trigger=>trigger.id===triggerId),variable=owner?.variables.find(item=>item.id===variableId),next=newName.trim();if(!owner||!variable)return{ok:false,references:0,oldName:'',newName:next,error:'No se encontró la variable.'};const oldName=variable.name;if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(next))return{ok:false,references:0,oldName,newName:next,error:'Usa un identificador Lua válido: letras, números y guion bajo, sin iniciar con número.'};const duplicate=variable.scope==='global'?project.triggers.some(trigger=>trigger.variables.some(item=>item.id!==variable.id&&item.scope==='global'&&item.name===next)):owner.variables.some(item=>item.id!==variable.id&&item.name===next);if(duplicate)return{ok:false,references:0,oldName,newName:next,error:`Ya existe una variable ${variable.scope} llamada ${next}.`};if(oldName===next)return{ok:true,references:0,oldName,newName:next};variable.name=next;let references=0;const replace=(value:string):string=>{const result=replaceLuaIdentifier(value,oldName,next);references+=result.replacements;return result.value};const walk=(actions:StudioAction[]):void=>actions.forEach(action=>{if(action.type==='api'){action.value=replace(action.value);if(action.targets)action.targets=replace(action.targets)}else if(action.type==='set_variable'||action.type==='raw'){action.value=replace(action.value)}else if(action.type==='if'){const expression=action.condition||action.value,updated=replace(expression);action.condition=updated;action.value=updated}if(action.children?.length)walk(action.children)});const targets=variable.scope==='local'?[owner]:project.triggers.filter(trigger=>trigger===owner||!trigger.variables.some(item=>item.scope==='local'&&item.name===oldName));targets.forEach(trigger=>{trigger.conditions.forEach(condition=>{condition.field=replace(condition.field);condition.value=replace(condition.value)});walk(trigger.actions)});if(variable.scope==='global')project.preamble=replace(project.preamble);return{ok:true,references,oldName,newName:next}}

export function searchProject(project:StudioProject,query:string,limit=80):ProjectSearchResult[]{const needle=query.trim().toLocaleLowerCase();if(!needle)return[];const results:ProjectSearchResult[]=[];const add=(kind:ProjectSearchResult['kind'],title:string,detail:string,triggerId:string,actionId?:string):void=>{const text=`${title} ${detail}`.toLocaleLowerCase(),index=text.indexOf(needle);if(index<0)return;const score=text===needle?100:text.startsWith(needle)?70:index===0?60:Math.max(1,40-index);results.push({id:`${kind}:${triggerId}:${actionId||results.length}`,kind,title,detail,triggerId,actionId,score})};const walk=(trigger:StudioTrigger,actions:StudioAction[]):void=>actions.forEach(action=>{add('acción',action.label,`${action.method||action.type} · ${action.value}`,trigger.id,action.id);if(action.children?.length)walk(trigger,action.children)});project.triggers.forEach(trigger=>{add('activador',trigger.name,trigger.functionName,trigger.id);add('evento',eventById(trigger.event)?.name||trigger.event,`${trigger.name} · ${trigger.event}`,trigger.id);trigger.variables.forEach(variable=>add('variable',variable.name,`${trigger.name} · ${variable.scope} ${variable.valueType} = ${variable.value}`,trigger.id));trigger.conditions.forEach(condition=>add('condición',`${condition.field} ${condition.operator} ${condition.value}`,trigger.name,trigger.id));walk(trigger,trigger.actions)});return results.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,Math.max(1,limit))}

export function analyzeProjectMetrics(project:StudioProject):ProjectMetrics{const methodCounts=new Map<string,number>(),eventCounts=new Map<string,number>();let actions=0,apiCalls=0,rawBlocks=0,maxDepth=0,complexity=0;const byTrigger=project.triggers.map(trigger=>{let triggerActions=0,triggerApi=0,triggerRaw=0,triggerDepth=0;const walk=(items:StudioAction[],depth:number):void=>items.forEach(action=>{actions+=1;triggerActions+=1;maxDepth=Math.max(maxDepth,depth);triggerDepth=Math.max(triggerDepth,depth);complexity+=1;if(action.type==='api'){apiCalls+=1;triggerApi+=1;const name=action.method||'(sin método)';methodCounts.set(name,(methodCounts.get(name)||0)+1)}if(action.type==='raw'){rawBlocks+=1;triggerRaw+=1;complexity+=3}if(action.type==='repeat')complexity+=2;if(action.children?.length)walk(action.children,depth+1)});walk(trigger.actions,1);eventCounts.set(trigger.event,(eventCounts.get(trigger.event)||0)+1);const triggerComplexity=triggerActions+trigger.conditions.length*2+trigger.variables.length+(triggerRaw*3)+Math.max(0,triggerDepth-1)*2;return{triggerId:trigger.id,name:trigger.name,enabled:trigger.enabled,actions:triggerActions,apiCalls:triggerApi,rawBlocks:triggerRaw,conditions:trigger.conditions.length,variables:trigger.variables.length,maxDepth:triggerDepth,complexity:triggerComplexity}});const conditions=project.triggers.reduce((sum,trigger)=>sum+trigger.conditions.length,0),variables=project.triggers.reduce((sum,trigger)=>sum+trigger.variables.length,0);complexity+=conditions*2+variables+project.triggers.length*2+Math.max(0,maxDepth-1)*2;const ranked=(source:Map<string,number>)=>Array.from(source,([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));return{triggers:project.triggers.length,enabledTriggers:project.triggers.filter(trigger=>trigger.enabled).length,actions,apiCalls,rawBlocks,conditions,variables,maxDepth,complexity,complexityLevel:complexity<=25?'baja':complexity<=80?'media':'alta',methods:ranked(methodCounts),events:ranked(eventCounts),byTrigger}}

export function organizeMethodKeys(all:string[],favorites:string[],recents:string[]):{favorites:string[];recent:string[];rest:string[]}{
  const allowed=new Set(all);
  const unique=(items:string[]):string[]=>Array.from(new Set(items.filter((item)=>allowed.has(item))));
  const favorite=unique(favorites),favoriteSet=new Set(favorite);
  const recent=unique(recents).filter((item)=>!favoriteSet.has(item)),used=new Set([...favorite,...recent]);
  return {favorites:favorite,recent,rest:all.filter((item)=>!used.has(item))};
}

export function scanLua(source: string): SecurityResult {
  const clean = source.replace(/--\[\[[\s\S]*?\]\]/g, '').replace(/--[^\r\n]*/g, '');
  const blockedRules: Array<[string, RegExp]> = [['Carga dinámica', /\b(?:require|dofile|loadfile|loadstring|load)\s*\(/i], ['Sistema operativo o archivos', /\b(?:os|io|package|debug|ffi)\s*\./i], ['Red externa', /\b(?:socket|http|https|curl|wget)\s*[.:]/i], ['Ejecución de procesos', /\b(?:execute|popen|spawn|shell|cmd)\s*\(/i]];
  const warningRules: Array<[string, RegExp]> = [['Bucle infinito literal', /\bwhile\s+true\s+do\b|\brepeat\b[\s\S]{0,300}\buntil\s+false\b/i], ['Bucle extremadamente grande', /\bfor\s+\w+\s*=\s*\d+\s*,\s*[1-9]\d{7,}\s+do\b/i]];
  const blocked = blockedRules.filter(([, regex]) => regex.test(clean)).map(([label]) => label), warnings = warningRules.filter(([, regex]) => regex.test(clean)).map(([label]) => label);
  const calls = Array.from(new Set(Array.from(source.matchAll(/\b([A-Z][A-Za-z0-9_]*:[A-Za-z_][A-Za-z0-9_]*)\s*\(/g)).map((match) => match[1])));
  return { status: blocked.length ? 'blocked' : warnings.length ? 'warning' : 'safe', blocked, warnings, calls, executed: false };
}
