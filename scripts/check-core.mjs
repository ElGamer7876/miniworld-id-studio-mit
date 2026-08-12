import {
  createAction,
  createProject,
  createTrigger,
  generateLua,
  scanLua,
  validateProject,
  importLua,
  parseProject,
} from '../src/studio-core.ts';

const project = createProject(1);
project.triggers[0].actions.push(createAction('message'));
const lua = generateLua(project);

if (!lua.includes('MIT local') || !lua.includes('ScriptSupportEvent:registerEvent')) {
  throw new Error('El generador Lua local no produjo la estructura esperada.');
}
if (scanLua('os.execute("programa")').status !== 'blocked') {
  throw new Error('El analizador no bloqueó una operación peligrosa.');
}
if (validateProject(project).length !== 0) {
  throw new Error('Un proyecto nuevo no superó la validación.');
}

const imported = importLua(`local function alRetirar(e)
  World:despawnActor(e.eventobjid)
end
ScriptSupportEvent:registerEvent([[Block.Remove]], alRetirar)`, 2);
if (imported.triggers.length !== 1 || imported.triggers[0].event !== 'Block.Remove') {
  throw new Error('La conversión local de Lua a activadores falló.');
}
const legacy=JSON.parse(JSON.stringify(project));delete legacy.layoutVersion;legacy.triggers=[createTrigger(1),createTrigger(2)];legacy.triggers.forEach((trigger)=>{trigger.x=0;trigger.y=0;});
const repaired=parseProject(JSON.stringify(legacy));
if(repaired.triggers.some((trigger)=>trigger.x===0&&trigger.y===0)||new Set(repaired.triggers.map((trigger)=>`${trigger.x}:${trigger.y}`)).size!==2){throw new Error('La reparacion de coordenadas antiguas fallo.');}

console.log('Core MIT local: OK');
