export type EventEntry = { id: string; name: string; group: string; fields: string[] };
export type ParamType = 'player' | 'string' | 'number' | 'boolean' | 'id' | 'ui' | 'element' | 'expression';
export type ParamEntry = { key: string; label: string; type: ParamType; defaultValue: string; optional?: boolean; hint?: string };
export type MethodEntry = { key: string; name: string; group: string; params: ParamEntry[]; phrase: string; results: string[] };

const event = (id: string, name: string, group: string, fields: string[] = []): EventEntry => ({ id, name, group, fields });
export const EVENTS: EventEntry[] = [
  event('Game.Start', 'Cuando inicia el juego', 'Juego'), event('Game.End', 'Cuando termina el juego', 'Juego'),
  event('Game.AnyPlayer.EnterGame', 'Cuando entra un jugador', 'Jugador', ['eventobjid']), event('Game.AnyPlayer.LeaveGame', 'Cuando sale un jugador', 'Jugador', ['eventobjid']),
  event('Player.Die', 'Cuando muere un jugador', 'Jugador', ['eventobjid', 'toobjid']), event('Player.Revive', 'Cuando revive un jugador', 'Jugador', ['eventobjid']),
  event('Player.LevelModelUpgrade', 'Cuando sube de nivel', 'Jugador', ['eventobjid', 'level']), event('Player.SelectShortcut', 'Cuando cambia acceso rápido', 'Jugador', ['eventobjid', 'itemid']),
  event('Player.AddItem', 'Cuando obtiene un objeto', 'Inventario', ['eventobjid', 'itemid', 'itemnum']), event('Player.ConsumeItem', 'Cuando consume un objeto', 'Inventario', ['eventobjid', 'itemid', 'itemnum']),
  event('Block.PlaceBy', 'Cuando colocan un bloque', 'Bloques', ['eventobjid', 'blockid', 'x', 'y', 'z']), event('Block.DestroyBy', 'Cuando destruyen un bloque', 'Bloques', ['eventobjid', 'blockid', 'x', 'y', 'z']),
  event('Block.Remove', 'Cuando se retira un bloque', 'Bloques', ['blockid', 'x', 'y', 'z']), event('Block.Trigger', 'Cuando se activa un bloque', 'Bloques', ['eventobjid', 'blockid', 'x', 'y', 'z']),
  event('Actor.Create', 'Cuando se crea un actor', 'Actor', ['eventobjid', 'actorid', 'x', 'y', 'z']), event('Actor.Die', 'Cuando muere un actor', 'Actor', ['eventobjid', 'toobjid']),
  event('Actor.ChangeAttr', 'Cuando cambia un atributo', 'Actor', ['eventobjid', 'attrtype', 'value']), event('Actor.AreaIn', 'Cuando un actor entra en un área', 'Actor', ['eventobjid', 'areaid']),
  event('Item.Create', 'Cuando se crea un objeto', 'Objetos', ['eventobjid', 'itemid', 'x', 'y', 'z']), event('Item.Pickup', 'Cuando recogen un objeto', 'Objetos', ['eventobjid', 'toobjid', 'itemid', 'itemnum']),
  event('Missile.Create', 'Cuando se crea un proyectil', 'Proyectiles', ['eventobjid', 'itemid', 'toobjid', 'x', 'y', 'z']), event('Missile.AreaIn', 'Cuando un proyectil entra en un área', 'Proyectiles', ['eventobjid', 'areaid', 'itemid']),
  event('UI.Button.Click', 'Cuando se pulsa un botón', 'Interfaz', ['eventobjid', 'CustomUI', 'uielement']), event('UI.Show', 'Cuando aparece una interfaz', 'Interfaz', ['eventobjid', 'CustomUI']),
  event('UI.Hide', 'Cuando se oculta una interfaz', 'Interfaz', ['eventobjid', 'CustomUI']), event('UI.LostFocus', 'Cuando un campo pierde el foco', 'Interfaz', ['eventobjid', 'CustomUI', 'uielement', 'content']),
  event('minitimer.change', 'Cuando cambia un temporizador', 'Sistema', ['timerid', 'timername', 'timertime']), event('Craft.end', 'Cuando termina una receta', 'Sistema', ['eventobjid', 'craftid', 'itemid', 'itemnum']),
];

const p = (key: string, label: string, type: ParamType, defaultValue: string, optional = false, hint = ''): ParamEntry => ({ key, label, type, defaultValue, optional, hint });
const player = (key = 'jugador', label = 'jugador'): ParamEntry => p(key, label, 'player', 'e.eventobjid', false, 'Jugador que originó el evento');
const method = (key: string, name: string, group: string, phrase: string, params: ParamEntry[] = [], results: string[] = ['code']): MethodEntry => ({ key, name, group, phrase, params, results });

// Firmas contrastadas con las wikis oficiales de Mini World. Se conservan los
// nombres legacy en minúsculas porque siguen siendo los usados por los scripts
// existentes y por el importador del Studio.
export const METHODS: MethodEntry[] = [
  method('Chat:sendSystemMsg', 'Mostrar mensaje del sistema', 'Chat', 'Mostrar {contenido} a {jugador}', [p('contenido', 'mensaje', 'string', '"Hola, Mini World"'), { ...player(), optional: true }], []),
  method('Chat:sendChat', 'Enviar mensaje al chat', 'Chat', 'Enviar {contenido} al chat de {jugador}', [p('contenido', 'mensaje', 'string', '"Hola"'), { ...player(), optional: true }], []),

  method('Player:getNickname', 'Obtener nombre del jugador', 'Jugador', 'Obtener el nombre de {jugador}', [player()], ['code', 'nombre']),
  method('Player:setAttr', 'Cambiar atributo del jugador', 'Jugador', 'Cambiar {atributo} de {jugador} a {valor}', [player(), p('atributo', 'atributo', 'expression', 'PlayerAttr.CUR_HP'), p('valor', 'valor', 'number', '100')]),
  method('Player:getAttr', 'Obtener atributo del jugador', 'Jugador', 'Obtener {atributo} de {jugador}', [player(), p('atributo', 'atributo', 'expression', 'PlayerAttr.CUR_HP')], ['code', 'valor']),
  method('Player:gainItems', 'Entregar objetos', 'Jugador', 'Entregar {cantidad} del objeto {itemid} a {jugador}', [player(), p('itemid', 'ID de objeto', 'id', '1001'), p('cantidad', 'cantidad', 'number', '1'), p('prioridad', 'prioridad', 'number', '1', true)]),
  method('Player:setPosition', 'Mover jugador', 'Jugador', 'Mover {jugador} a X {x}, Y {y}, Z {z}', [player(), p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z')]),
  method('Player:setGameWin', 'Marcar victoria', 'Jugador', 'Dar la victoria a {jugador}', [player()]),
  method('Player:playMusic', 'Reproducir música', 'Jugador', 'Reproducir música {musicId} para {jugador} con volumen {volumen}', [player(), p('musicId', 'ID de música', 'id', '10962'), p('volumen', 'volumen', 'number', '100'), p('tono', 'tono', 'number', '1'), p('repetir', 'repetir', 'boolean', 'false')]),
  method('Player:stopMusic', 'Detener música', 'Jugador', 'Detener la música de {jugador}', [player()]),
  method('Player:openUIView', 'Abrir interfaz', 'Interfaz', 'Abrir interfaz {uiid} en {jugador}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('efecto', 'efecto', 'number', '0', true), p('tiempo', 'duración', 'number', '0', true)]),
  method('Player:hideUIView', 'Cerrar interfaz', 'Interfaz', 'Cerrar interfaz {uiid} en {jugador}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('efecto', 'efecto', 'number', '0', true), p('tiempo', 'duración', 'number', '0', true)]),

  method('World:getAllPlayers', 'Obtener todos los jugadores', 'Mundo', 'Obtener jugadores con estado {estado}', [p('estado', 'estado (-1 todos, 0 muertos, 1 vivos)', 'number', '-1')], ['code', 'cantidad', 'jugadores']),
  method('World:getPlayerTotal', 'Contar jugadores', 'Mundo', 'Contar los jugadores actuales', [], ['code', 'cantidad']),
  method('World:spawnCreature', 'Crear criatura', 'Mundo', 'Crear {cantidad} criatura(s) {actorid} en X {x}, Y {y}, Z {z}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('actorid', 'ID de criatura', 'id', '3400'), p('cantidad', 'cantidad', 'number', '1')], ['code', 'actores']),
  method('World:spawnItem', 'Crear objeto', 'Mundo', 'Crear {cantidad} del objeto {itemid} en X {x}, Y {y}, Z {z}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('itemid', 'ID de objeto', 'id', '1001'), p('cantidad', 'cantidad', 'number', '1')]),
  method('World:spawnProjectileByDir', 'Crear proyectil por dirección', 'Mundo', 'Lanzar proyectil {itemid} desde X {x}, Y {y}, Z {z} hacia {dx}, {dy}, {dz}', [p('jugador', 'jugador o nil', 'player', 'e.eventobjid'), p('itemid', 'ID de proyectil', 'id', '15506'), p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('dx', 'dirección X', 'number', '0'), p('dy', 'dirección Y', 'number', '1'), p('dz', 'dirección Z', 'number', '0'), p('velocidad', 'velocidad', 'number', '1')], ['code', 'objid']),
  method('World:despawnActor', 'Eliminar actor', 'Mundo', 'Eliminar el actor {objid}', [p('objid', 'ID de actor', 'id', 'e.eventobjid')]),
  method('World:setHours', 'Cambiar hora', 'Mundo', 'Cambiar la hora del mundo a {hora}', [p('hora', 'hora (0-24)', 'number', '12')]),
  method('World:playSoundEffectOnPos', 'Reproducir sonido', 'Mundo', 'Reproducir sonido {sonido} en X {x}, Y {y}, Z {z}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('sonido', 'ID de sonido', 'id', '1001'), p('volumen', 'volumen', 'number', '100'), p('tono', 'tono', 'number', '1'), p('repetir', 'repetir', 'boolean', 'false')]),

  method('Actor:getPosition', 'Obtener posición de actor', 'Actor', 'Obtener la posición del actor {objid}', [p('objid', 'ID de actor', 'id', 'e.eventobjid')], ['code', 'x', 'y', 'z']),
  method('Actor:addHP', 'Modificar vida', 'Actor', 'Añadir {cantidad} de vida al actor {objid}', [p('objid', 'ID de actor', 'id', 'e.eventobjid'), p('cantidad', 'vida', 'number', '10')]),
  method('Actor:changeCustomModel', 'Cambiar modelo', 'Actor', 'Cambiar el modelo de {objid} por {modelo}', [p('objid', 'ID de actor', 'id', 'e.eventobjid'), p('modelo', 'modelo', 'string', '"block_1"')]),
  method('Actor:recoverinitialModel', 'Restaurar modelo', 'Actor', 'Restaurar el modelo inicial de {objid}', [p('objid', 'ID de actor', 'id', 'e.eventobjid')]),
  method('Actor:killSelf', 'Eliminar actor', 'Actor', 'Eliminar al actor {objid}', [p('objid', 'ID de actor', 'id', 'e.eventobjid')]),
  method('Actor:tryMoveToPos', 'Mover actor a posición', 'Actor', 'Mover actor {objid} a X {x}, Y {y}, Z {z} con velocidad {velocidad}', [p('objid', 'ID de actor', 'id', 'e.eventobjid'), p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('velocidad', 'velocidad', 'number', '1')]),

  method('Block:getBlockID', 'Obtener ID de bloque', 'Bloques', 'Obtener el bloque en X {x}, Y {y}, Z {z}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z')], ['code', 'blockid']),
  method('Block:setBlockAll', 'Colocar bloque', 'Bloques', 'Colocar bloque {blockid} en X {x}, Y {y}, Z {z}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('blockid', 'ID de bloque', 'id', '1'), p('datos', 'datos', 'number', '0', true)]),
  method('Block:destroyBlock', 'Destruir bloque', 'Bloques', 'Destruir bloque en X {x}, Y {y}, Z {z} y soltar objetos {soltar}', [p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('soltar', 'soltar objetos', 'boolean', 'true')]),
  method('Block:replaceBlock', 'Reemplazar bloque', 'Bloques', 'Reemplazar por bloque {blockid} en X {x}, Y {y}, Z {z}', [p('blockid', 'ID de bloque', 'id', '1'), p('x', 'X', 'number', 'e.x'), p('y', 'Y', 'number', 'e.y'), p('z', 'Z', 'number', 'e.z'), p('cara', 'cara', 'number', '0', true), p('color', 'color', 'number', '0', true)]),

  method('Backpack:addItem', 'Añadir al inventario', 'Inventario', 'Añadir {cantidad} del objeto {itemid} al inventario de {jugador}', [player(), p('itemid', 'ID de objeto', 'id', '1001'), p('cantidad', 'cantidad', 'number', '1')], ['code', 'cantidadAñadida']),
  method('Backpack:clearAllPack', 'Vaciar inventario', 'Inventario', 'Vaciar todo el inventario de {jugador}', [player()]),

  method('Customui:setText', 'Cambiar texto de interfaz', 'Interfaz', 'En {jugador}, establecer texto de {elementid} en interfaz {uiid} a {texto}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('texto', 'texto', 'string', '"Hola"'), p('animacion', 'animación', 'number', '0', true), p('tiempo', 'duración', 'number', '0', true)]),
  method('Customui:showElement', 'Mostrar elemento', 'Interfaz', 'Mostrar elemento {elementid} de interfaz {uiid} a {jugador}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('efecto', 'efecto', 'number', '0', true), p('tiempo', 'duración', 'number', '0', true)]),
  method('Customui:hideElement', 'Ocultar elemento', 'Interfaz', 'Ocultar elemento {elementid} de interfaz {uiid} a {jugador}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('efecto', 'efecto', 'number', '0', true), p('tiempo', 'duración', 'number', '0', true)]),
  method('Customui:setColor', 'Cambiar color', 'Interfaz', 'Cambiar color de {elementid} en interfaz {uiid} para {jugador} a {color}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('color', 'color hexadecimal', 'string', '"0xFFFFFFFF"')]),
  method('Customui:setTexture', 'Cambiar imagen o textura', 'Interfaz', 'Cambiar imagen de {elementid} en interfaz {uiid} para {jugador} a {textura}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('textura', 'ID de textura', 'id', '10010')]),
  method('Customui:setSize', 'Cambiar tamaño de elemento', 'Interfaz', 'Cambiar tamaño de {elementid} en interfaz {uiid} para {jugador} a ancho {ancho} y alto {alto}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('ancho', 'ancho', 'number', '100'), p('alto', 'alto', 'number', '40')]),
  method('Customui:setFontSize', 'Cambiar tamaño de texto', 'Interfaz', 'Cambiar tamaño del texto de {elementid} a {tamano} para {jugador}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('tamano', 'tamaño', 'number', '20')]),
  method('Customui:rotateElement', 'Girar elemento', 'Interfaz', 'Girar {elementid} de interfaz {uiid} para {jugador} a {grados} grados', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('grados', 'grados', 'number', '90')]),
  method('Customui:setAlpha', 'Cambiar transparencia', 'Interfaz', 'Cambiar transparencia de {elementid} en interfaz {uiid} para {jugador} a {alpha}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('alpha', 'transparencia', 'number', '1')]),
  method('Customui:setState', 'Cambiar estado de interfaz', 'Interfaz', 'Cambiar estado de interfaz {uiid} para {jugador} a {estado}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('estado', 'estado', 'number', '1')]),
  method('Customui:setPosition', 'Mover elemento de interfaz', 'Interfaz', 'Mover {elementid} de interfaz {uiid} para {jugador} a X {x}, Y {y}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('x', 'X', 'number', '100'), p('y', 'Y', 'number', '100')]),
  method('Customui:setScale', 'Escalar elemento', 'Interfaz', 'Escalar {elementid} de interfaz {uiid} para {jugador} a X {x}, Y {y}', [player(), p('uiid', 'ID de interfaz', 'ui', '"ID_DE_INTERFAZ"'), p('elementid', 'ID de elemento', 'element', '"ID_DE_ELEMENTO"'), p('x', 'escala X', 'number', '1'), p('y', 'escala Y', 'number', '1')]),
  method('Customui:getItemIcon', 'Obtener icono de objeto', 'Interfaz', 'Obtener icono del objeto {itemid}', [p('itemid', 'ID de objeto', 'id', '1001')], ['code', 'iconid']),
  method('Customui:getMonsterObjIcon', 'Obtener icono de criatura', 'Interfaz', 'Obtener icono de la criatura {objid}', [p('objid', 'ID de criatura', 'id', 'e.eventobjid')], ['code', 'iconid']),
  method('Customui:getMonsterIcon', 'Obtener icono de tipo de criatura', 'Interfaz', 'Obtener icono del tipo de criatura {actorid}', [p('actorid', 'ID de criatura', 'id', '3400')], ['code', 'iconid']),
  method('Customui:getStatusIcon', 'Obtener icono de estado', 'Interfaz', 'Obtener icono del estado {statusid}', [p('statusid', 'ID de estado', 'id', '1')], ['code', 'iconid']),
  method('Customui:getBlockIcon', 'Obtener icono de bloque', 'Interfaz', 'Obtener icono del bloque {blockid}', [p('blockid', 'ID de bloque', 'id', '1')], ['code', 'iconid']),

  method('Game:doGameEnd', 'Terminar partida', 'Juego', 'Terminar la partida actual', []),
  method('Game:dispatchEvent', 'Enviar evento personalizado', 'Juego', 'Enviar evento {evento} con datos {datos}', [p('evento', 'nombre del evento', 'string', '"MiEvento"'), p('datos', 'datos', 'expression', '{}')]),
  method('Trigger:wait', 'Esperar', 'Control', 'Esperar {segundos} segundos', [p('segundos', 'segundos', 'number', '1')], []),
];

export function splitLuaArguments(source: string): string[] {
  if (!source.trim()) return [];
  const args: string[] = []; let current = ''; let quote = ''; let escaped = false; const stack: string[] = [];
  for (const char of source) {
    if (quote) { current += char; if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if ('({['.includes(char)) { stack.push(char); current += char; continue; }
    if (')}]'.includes(char)) { stack.pop(); current += char; continue; }
    if (char === ',' && !stack.length) { args.push(current.trim()); current = ''; continue; }
    current += char;
  }
  args.push(current.trim()); return args;
}

export const methodByKey = (key: string): MethodEntry | undefined => METHODS.find((entry) => entry.key === key);
export const eventById = (id: string): EventEntry | undefined => EVENTS.find((entry) => entry.id === id);
export const methodDefaultValue = (entry: MethodEntry): string => entry.params.map((param) => param.defaultValue).join(', ');
export const methodDefaultTargets = (entry: MethodEntry): string => entry.results.join(', ');
export function describeMethodCall(entry: MethodEntry, value: string): string {
  const args = splitLuaArguments(value);
  return entry.phrase.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const index = entry.params.findIndex((param) => param.key === key);
    return `[${args[index] || entry.params[index]?.defaultValue || key}]`;
  });
}
