import {
  createAction,
  createProject,
  generateLua,
  scanLua,
  validateProject,
  importLua,
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

console.log('Core MIT local: OK');
