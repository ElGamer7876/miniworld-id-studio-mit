import {
  createAction,
  cloneTrigger,
  cloneAction,
  analyzeProjectMetrics,
  createProject,
  createTrigger,
  createVariable,
  generateLua,
  inspectProject,
  organizeMethodKeys,
  searchProject,
  scanLua,
  validateProject,
  importLua,
  parseProject,
  renameVariableReferences,
  replaceLuaIdentifier,
} from '../src/studio-core.ts';
import { EVENTS, METHODS, describeMethodCall, methodByKey, methodDefaultValue, splitLuaArguments } from '../src/catalog.ts';
import {filterStudioCommands} from '../src/command-palette.ts';
import {normalizePanelLayout,togglePanelLayout} from '../src/panel-layout.ts';
import {methodDefaultValueForContext,parameterPreset,valueSourceOptions} from '../src/parameter-options.ts';
import {simulateTrigger} from '../src/simulator.ts';
import {translateText} from '../src/i18n.ts';
import {createWorkspaceBackup,mergeWorkspaceProjects,parseWorkspaceBackup} from '../src/workspace-backup.ts';
import {actionAtPath,appendActionInside,findActionPath,insertActionAfter,moveActionBefore,moveActionByOffset,moveActionToRootEnd,removeActionAtPath} from '../src/action-tree.ts';

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
const openUi = methodByKey('Player:openUIView');
if (!openUi || !describeMethodCall(openUi, methodDefaultValue(openUi)).includes('[e.eventobjid]')) {
  throw new Error('La acción Abrir interfaz no contiene valores y cadena visual.');
}
if (METHODS.some((method) => method.params.some((param) => !param.label || !param.defaultValue))) {
  throw new Error('Existe una acción con parámetros sin etiqueta o valor inicial.');
}
for (const method of METHODS) {
  const probe = createProject(99), action = createAction('api');
  action.method = method.key; action.value = methodDefaultValue(method); action.targets = method.results.join(', ');
  probe.triggers[0].actions.push(action);
  if (!generateLua(probe).includes(`${method.key}(${action.value})`)) throw new Error(`No se generó Lua para ${method.key}.`);
}
const complexArgs = splitLuaArguments('e.eventobjid, {x=1, y=2}, "texto, con coma"');
if (complexArgs.length !== 3) throw new Error('El separador de argumentos Lua dañó tablas o cadenas.');

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

const modern=JSON.parse(JSON.stringify(project));modern.layoutVersion=1;modern.triggers=[createTrigger(1),createTrigger(2)];
modern.triggers[0].x=143.25;modern.triggers[0].y=287.75;modern.triggers[1].x=143.25;modern.triggers[1].y=287.75;modern.settings.zoom=1.6;
const restored=parseProject(JSON.stringify(modern));
const beforeZoom=restored.triggers.map(({x,y})=>({x,y}));restored.settings.zoom=.7;
if(JSON.stringify(restored.triggers.map(({x,y})=>({x,y})))!==JSON.stringify(beforeZoom)){throw new Error('El zoom modifico las coordenadas de los activadores.');}
if(restored.triggers.some((trigger)=>trigger.x!==143.25||trigger.y!==287.75)){throw new Error('La carga inicial no conservo las coordenadas modernas.');}
if(parseProject(JSON.stringify(restored)).triggers.some((trigger)=>trigger.x!==143.25||trigger.y!==287.75)){throw new Error('El segundo inicio no conservo las coordenadas.');}

const unhealthy=createProject(101);
const duplicate=createTrigger(2);duplicate.functionName=unhealthy.triggers[0].functionName;duplicate.x=unhealthy.triggers[0].x;duplicate.y=unhealthy.triggers[0].y;
const incomplete=createAction('api');incomplete.method='Player:openUIView';incomplete.value='e.eventobjid';unhealthy.triggers[0].actions.push(incomplete);unhealthy.triggers.push(duplicate);
const issueCodes=new Set(inspectProject(unhealthy).map((issue)=>issue.code));
for(const expected of ['api-arguments-missing','function-duplicate','trigger-overlap']){if(!issueCodes.has(expected))throw new Error(`El centro de problemas no detecto ${expected}.`);}
const searchable=createProject(102),nested=createAction('if'),nestedMessage=createAction('message');nestedMessage.label='Tesoro secreto';nested.children.push(nestedMessage);searchable.triggers[0].actions.push(nested);searchable.triggers[0].variables.push({id:'var_search',name:'puntuacion',value:'0',valueType:'number',scope:'local'});
if(searchProject(searchable,'tesoro')[0]?.actionId!==nestedMessage.id||!searchProject(searchable,'puntuacion').some(result=>result.kind==='variable'))throw new Error('La busqueda global no indexo bloques anidados o variables.');
const cloned=cloneTrigger(searchable.triggers[0],2);if(cloned.id===searchable.triggers[0].id||cloned.actions[0].id===nested.id||cloned.actions[0].children[0].id===nestedMessage.id||cloned.functionName===searchable.triggers[0].functionName)throw new Error('La clonacion profunda reutilizo identificadores internos.');
const metricProject=createProject(103),metricApi=createAction('api'),metricIf=createAction('if'),metricRaw=createAction('raw');metricApi.method='World:getPlayerTotal';metricIf.children.push(metricRaw);metricProject.triggers[0].actions.push(metricApi,metricIf);const metrics=analyzeProjectMetrics(metricProject);if(metrics.actions!==3||metrics.apiCalls!==1||metrics.rawBlocks!==1||metrics.maxDepth!==2||metrics.methods[0]?.name!=='World:getPlayerTotal')throw new Error('Las metricas estructurales no contaron acciones anidadas o API.');
const organized=organizeMethodKeys(['A','B','C'],['B','B','X'],['B','C','C']);if(JSON.stringify(organized)!==JSON.stringify({favorites:['B'],recent:['C'],rest:['A']}))throw new Error('Favoritas y recientes duplicaron o conservaron API inexistentes.');
const commands=filterStudioCommands([{id:'map',label:'Abrir mapa',group:'Vista'},{id:'metrics',label:'Métricas del proyecto',group:'Problemas',keywords:'analisis'}],'metricas');if(commands[0]?.id!=='metrics'||filterStudioCommands(commands,'',1).length!==1)throw new Error('La paleta de comandos no priorizó texto normalizado o respetó el límite.');
const legacyPanels=normalizePanelLayout(),focusedPanels=togglePanelLayout(legacyPanels,'focus'),restoredPanels=togglePanelLayout(focusedPanels,'focus');if(!legacyPanels.projectPanelVisible||!legacyPanels.inspectorVisible||focusedPanels.projectPanelVisible||focusedPanels.inspectorVisible||!restoredPanels.projectPanelVisible||!restoredPanels.inspectorVisible)throw new Error('El diseño de paneles no migró o no restauró el modo enfoque.');

const legacyEditorMode=JSON.parse(JSON.stringify(project));delete legacyEditorMode.settings.editorMode;
if(parseProject(JSON.stringify(legacyEditorMode)).settings.editorMode!=='basic')throw new Error('Un proyecto anterior no migró al editor Básico.');
const advancedEditorMode=JSON.parse(JSON.stringify(project));advancedEditorMode.settings.editorMode='advanced';
if(parseProject(JSON.stringify(advancedEditorMode)).settings.editorMode!=='advanced')throw new Error('El proyecto no conservó el nivel Avanzado.');
const lexical=replaceLuaIdentifier('-- contador\ncontador = contador + contador_extra\nprint("contador", contador)','contador','puntos');
if(lexical.replacements!==3||!lexical.value.includes('-- contador')||!lexical.value.includes('"contador"')||!lexical.value.includes('contador_extra'))throw new Error('El renombrado Lua modificó comentarios, cadenas o identificadores parciales.');
const refactor=createProject(104),variable=createVariable(),raw=createAction('raw'),nestedCondition=createAction('if');variable.name='contador';refactor.triggers[0].variables.push(variable);raw.value='contador = contador + 1';nestedCondition.condition='contador > 2';nestedCondition.value=nestedCondition.condition;nestedCondition.children.push(raw);refactor.triggers[0].conditions.push({id:'condition_refactor',field:'contador',operator:'==',value:'0'});refactor.triggers[0].actions.push(nestedCondition);
const renamed=renameVariableReferences(refactor,refactor.triggers[0].id,variable.id,'puntos');
if(!renamed.ok||renamed.references!==4||variable.name!=='puntos'||!generateLua(refactor).includes('puntos = puntos + 1')||generateLua(refactor).includes('local contador'))throw new Error('El renombrado seguro no actualizó todas las referencias del activador.');
if(renameVariableReferences(refactor,refactor.triggers[0].id,variable.id,'2 puntos').ok||variable.name!=='puntos')throw new Error('El renombrado aceptó un identificador Lua inválido.');

const playerAttrMethod=methodByKey('Player:setAttr'),playerPreset=parameterPreset(playerAttrMethod.key,playerAttrMethod.params[0]),attributePreset=parameterPreset(playerAttrMethod.key,playerAttrMethod.params[1]);
if(!playerPreset?.options.some(option=>option.value==='e.eventobjid')||!playerPreset.allowCustom)throw new Error('El jugador no ofrece opciones y valor personalizado.');
if(!attributePreset?.options.some(option=>option.value==='PLAYERATTR.CUR_HP')||!attributePreset.allowCustom)throw new Error('El atributo no ofrece constantes oficiales y valor personalizado.');
if(methodDefaultValue(playerAttrMethod)!=='e.eventobjid, PLAYERATTR.CUR_HP, 100')throw new Error('El atributo predeterminado no usa la constante oficial.');
if(parameterPreset(playerAttrMethod.key,playerAttrMethod.params[2]))throw new Error('Un valor numérico libre se convirtió en menú cerrado.');
const contextualVariable=createVariable();contextualVariable.name='jugadorElegido';contextualVariable.valueType='number';
const contextualPlayer=parameterPreset(playerAttrMethod.key,playerAttrMethod.params[0],{eventFields:['eventobjid','x'],variables:[contextualVariable]});
if(!contextualPlayer?.options.some(option=>option.value==='e.eventobjid')||contextualPlayer.options.some(option=>option.value==='e.toobjid')||!contextualPlayer.options.some(option=>option.value==='jugadorElegido'))throw new Error('Las opciones de jugador no respetan el evento y sus variables.');
const prefixedPlayer=parameterPreset(playerAttrMethod.key,playerAttrMethod.params[0],{eventFields:['e.eventobjid','e.toobjid'],variables:[]});
if(!prefixedPlayer?.options.some(option=>option.value==='e.eventobjid')||!prefixedPlayer.options.some(option=>option.value==='e.toobjid')||methodDefaultValueForContext(playerAttrMethod,['e.eventobjid'])!=='e.eventobjid, PLAYERATTR.CUR_HP, 100')throw new Error('El jugador volvió a nil al recibir campos de evento con prefijo e.');
if(!valueSourceOptions({eventFields:['x'],variables:[contextualVariable]}).some(option=>option.value==='e.x'))throw new Error('No se sugieren los datos disponibles del evento.');
if(methodDefaultValueForContext(playerAttrMethod,[])!=='nil, PLAYERATTR.CUR_HP, 100'||methodDefaultValueForContext(playerAttrMethod,['eventobjid'])!=='e.eventobjid, PLAYERATTR.CUR_HP, 100')throw new Error('Los valores iniciales no se adaptan al evento activo.');
const musicMethod=methodByKey('Player:playMusic'),booleanPreset=parameterPreset(musicMethod.key,musicMethod.params.find(param=>param.key==='repetir'));
if(JSON.stringify(booleanPreset?.options.map(option=>option.value))!==JSON.stringify(['true','false']))throw new Error('El booleano no ofrece las opciones Sí/No.');
const simulated=createTrigger(1),simVariable=createVariable(),simRepeat=createAction('repeat'),simIncrement=createAction('set_variable'),simApi=createAction('api');simVariable.name='contador';simulated.variables.push(simVariable);simulated.conditions.push({id:'sim_condition',field:'e.level',operator:'>=',value:'2'});simRepeat.value='3';simIncrement.value='contador = contador + 1';simRepeat.children.push(simIncrement);simApi.method='Player:getNickname';simApi.value='e.eventobjid';simulated.actions.push(simRepeat,simApi);
const simulation=simulateTrigger(simulated,{level:2,eventobjid:7});if(!simulation.passed||simulation.halted||simulation.variables.contador!==3||simulation.apiCalls!==1)throw new Error('El simulador no recorrió condiciones, variables, repeticiones y API.');
if(simulateTrigger(simulated,{level:1,eventobjid:7}).passed)throw new Error('El simulador ejecutó un activador cuya condición inicial era falsa.');
const limited=simulateTrigger(simulated,{level:2,eventobjid:7},{maxSteps:4});if(!limited.halted||!limited.steps.some(step=>step.label==='Prueba detenida'))throw new Error('El simulador no respetó el límite de pasos.');
const treeIf=createAction('if'),treeA=createAction('message'),treeB=createAction('wait'),treeRoot=createAction('api');treeIf.children.push(treeA,treeB);const tree=[treeIf,treeRoot];
if(actionAtPath(tree,'0.1')!==treeB||findActionPath(tree,treeA.id)!=='0.0')throw new Error('Las rutas anidadas no resolvieron acciones profundas.');
if(!moveActionBefore(tree,'0.1','1')||tree[1]!==treeB||treeIf.children.length!==1)throw new Error('No se pudo sacar un bloque de un contenedor anidado.');
if(!moveActionBefore(tree,'2','0.0')||treeIf.children[0]!==treeRoot)throw new Error('No se pudo mover un bloque principal dentro de una lista anidada.');
if(moveActionBefore(tree,'0','0.0')||!moveActionByOffset(treeIf.children,'0',1)||treeIf.children[1]!==treeRoot)throw new Error('El árbol permitió ciclos o no reordenó hermanos.');
const treeRootPath=findActionPath(tree,treeRoot.id);if(!treeRootPath||!moveActionToRootEnd(tree,treeRootPath)||tree.at(-1)!==treeRoot)throw new Error('No se pudo devolver una acción anidada al nivel principal.');
const removablePath=findActionPath(tree,treeA.id);if(!removablePath||removeActionAtPath(tree,removablePath)!==treeA)throw new Error('No se pudo eliminar una acción mediante su ruta.');
const clipboardSource=createAction('if'),clipboardChild=createAction('repeat'),clipboardLeaf=createAction('message');clipboardChild.children.push(clipboardLeaf);clipboardSource.children.push(clipboardChild);const clipboardCopy=cloneAction(clipboardSource);
if(clipboardCopy.id===clipboardSource.id||clipboardCopy.children[0].id===clipboardChild.id||clipboardCopy.children[0].children[0].id===clipboardLeaf.id)throw new Error('La copia de un bloque reutilizó IDs internos.');
const clipboardTree=[createAction('wait')];if(!insertActionAfter(clipboardTree,'0',clipboardCopy)||clipboardTree[1]!==clipboardCopy||!appendActionInside(clipboardTree,'1',cloneAction(clipboardLeaf))||clipboardTree[1].children.length!==2)throw new Error('Copiar y pegar no insertó el árbol en la posición solicitada.');
for(const method of METHODS){const name=translateText(method.name,'en'),phrase=translateText(method.phrase,'en');if(name===method.name||phrase===method.phrase)throw new Error(`Falta traducción inglesa de ${method.key}.`)}
for(const event of EVENTS)if(translateText(event.name,'en')===event.name)throw new Error(`Falta traducción inglesa del evento ${event.id}.`);
if(translateText('Proyecto #12 · 3 activador(es)','en')!=='Project #12 · 3 trigger(s)'||translateText('Project #12 · 3 trigger(s)','es')!=='Proyecto #12 · 3 activador(es)')throw new Error('Los textos dinámicos no cambian de idioma de forma reversible.');
if(translateText('Mapa épico del usuario','en')!=='Mapa épico del usuario')throw new Error('La traducción modificó contenido libre del usuario.');
if(translateText('Problemas del proyecto','en')!=='Project issues'||translateText('Mantener la pestaña al añadir un activador','en')!=='Keep the tab open after adding a trigger')throw new Error('Faltan traducciones inglesas de vistas completas.');
if(translateText('Activador del usuario: está habilitado pero no contiene acciones.','en')!=='Activador del usuario: is enabled but contains no actions.')throw new Error('La traducción dinámica de diagnósticos no preserva el nombre del activador.');
const backup=createWorkspaceBackup([project],{favoriteMethods:['Chat:sendChat'],recentMethods:[],projectPanelVisible:true,inspectorVisible:false,locale:'en'},[]),parsedBackup=parseWorkspaceBackup(JSON.stringify(backup));
if(parsedBackup.projects.length!==1||parsedBackup.preferences.locale!=='en'||parsedBackup.preferences.inspectorVisible!==false)throw new Error('El respaldo no conservó proyectos o preferencias.');
const backupMerge=mergeWorkspaceProjects([project],parsedBackup.projects);if(backupMerge.projects.length!==2||backupMerge.imported[0].id===project.id||backupMerge.projects[1].id!==project.id)throw new Error('Restaurar un respaldo reemplazó o colisionó con un proyecto actual.');
let invalidBackupAccepted=false;try{parseWorkspaceBackup('{"format":"incorrecto","version":1,"projects":[]}');invalidBackupAccepted=true}catch{}if(invalidBackupAccepted)throw new Error('Se aceptó un respaldo con formato inválido.');

console.log('Core MIT local: OK');
