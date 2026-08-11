export type EventEntry = { id: string; name: string; group: string; fields: string[] };
export type MethodEntry = { key: string; name: string; group: string; params: string[] };

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

const method = (key: string, name: string, group: string, params: string[]): MethodEntry => ({ key, name, group, params });
export const METHODS: MethodEntry[] = [
  method('Chat:sendSystemMsg', 'Mostrar mensaje del sistema', 'Chat', ['contenido', 'jugador opcional']), method('Chat:sendChat', 'Enviar mensaje al chat', 'Chat', ['contenido', 'jugador']),
  method('Player:getNickname', 'Obtener nombre del jugador', 'Jugador', ['objid']), method('Player:setAttr', 'Cambiar atributo del jugador', 'Jugador', ['objid', 'atributo', 'valor']),
  method('Player:getAttr', 'Obtener atributo del jugador', 'Jugador', ['objid', 'atributo']), method('Player:gainItems', 'Entregar objetos', 'Jugador', ['objid', 'itemid', 'cantidad', 'prioridad']),
  method('Player:setPosition', 'Mover jugador', 'Jugador', ['objid', 'x', 'y', 'z']), method('Player:setGameWin', 'Marcar victoria', 'Jugador', ['objid']),
  method('Player:playMusic', 'Reproducir música', 'Jugador', ['objid', 'musicId', 'volumen', 'tono', 'repetir']), method('Player:stopMusic', 'Detener música', 'Jugador', ['objid']),
  method('World:getAllPlayers', 'Obtener todos los jugadores', 'Mundo', []), method('World:getPlayerTotal', 'Contar jugadores', 'Mundo', []),
  method('World:spawnCreature', 'Crear criatura', 'Mundo', ['x', 'y', 'z', 'actorid', 'cantidad']), method('World:spawnItem', 'Crear objeto', 'Mundo', ['x', 'y', 'z', 'itemid', 'cantidad']),
  method('World:spawnProjectileByDir', 'Crear proyectil por dirección', 'Mundo', ['jugador', 'itemid', 'x', 'y', 'z', 'dx', 'dy', 'dz', 'velocidad']), method('World:despawnActor', 'Eliminar actor', 'Mundo', ['objid']),
  method('World:setHours', 'Cambiar hora', 'Mundo', ['hora']), method('World:playSoundEffectOnPos', 'Reproducir sonido', 'Mundo', ['x', 'y', 'z', 'sonido', 'volumen', 'tono', 'repetir']),
  method('Actor:getPosition', 'Obtener posición de actor', 'Actor', ['objid']), method('Actor:addHP', 'Modificar vida', 'Actor', ['objid', 'cantidad']),
  method('Actor:changeCustomModel', 'Cambiar modelo', 'Actor', ['objid', 'modelo']), method('Actor:recoverinitialModel', 'Restaurar modelo', 'Actor', ['objid']),
  method('Actor:killSelf', 'Eliminar actor', 'Actor', ['objid']), method('Actor:tryMoveToPos', 'Mover actor a posición', 'Actor', ['objid', 'x', 'y', 'z', 'velocidad']),
  method('Block:getBlockID', 'Obtener ID de bloque', 'Bloques', ['x', 'y', 'z']), method('Block:setBlockAll', 'Colocar bloque', 'Bloques', ['x', 'y', 'z', 'blockid', 'datos']),
  method('Block:destroyBlock', 'Destruir bloque', 'Bloques', ['x', 'y', 'z', 'soltar']), method('Block:replaceBlock', 'Reemplazar bloque', 'Bloques', ['blockid', 'x', 'y', 'z', 'cara', 'color']),
  method('Backpack:addItem', 'Añadir al inventario', 'Inventario', ['jugador', 'itemid', 'cantidad']), method('Backpack:clearAllPack', 'Vaciar inventario', 'Inventario', ['jugador']),
  method('Customui:setText', 'Cambiar texto de interfaz', 'Interfaz', ['tabla']), method('Customui:showElement', 'Mostrar elemento', 'Interfaz', ['tabla']),
  method('Customui:hideElement', 'Ocultar elemento', 'Interfaz', ['tabla']), method('Customui:setColor', 'Cambiar color', 'Interfaz', ['tabla']),
  method('Game:doGameEnd', 'Terminar partida', 'Juego', []), method('Game:dispatchEvent', 'Enviar evento personalizado', 'Juego', ['evento', 'datos']),
  method('Trigger:wait', 'Esperar', 'Control', ['segundos']),
];

export const eventById = (id: string): EventEntry | undefined => EVENTS.find((entry) => entry.id === id);
export const methodByKey = (key: string): MethodEntry | undefined => METHODS.find((entry) => entry.key === key);
