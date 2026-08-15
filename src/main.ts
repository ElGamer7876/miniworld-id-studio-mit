import './styles.css';
import './pointer-fix.css';
import './action-fields.css';
import { EVENTS, METHODS, eventById, methodByKey, methodDefaultTargets, methodDefaultValue, splitLuaArguments } from './catalog';
import { EDITION_LABEL, HAS_NETWORK, checkRemote, openHomepage } from './edition';
import { createAction, createCondition, createProject, createTrigger, createVariable, generateLua, importLua, scanLua, validateProject, type ActionType, type StudioAction, type StudioProject, type StudioTrigger } from './studio-core';
import { exportLua, exportProject, importProject, listProjects, persistProjects } from './persistence';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('No se encontró #app');
const app: HTMLDivElement = appElement;

let projects: StudioProject[] = [], project = createProject(), activeTriggerId = project.triggers[0].id;
let history: string[] = [], future: string[] = [], saveTimer = 0, draggedAction = '', mapDragging = false;

app.innerHTML = `
  <header class="app-bar">
    <strong>Mini World ID Studio</strong><button class="edition" data-home>${EDITION_LABEL}</button>
    <span class="separator"></span><button data-new>Nuevo</button><button data-import-project>Abrir</button><button data-save-file>Guardar</button><button data-export-lua>Exportar Lua</button>
    <span class="separator"></span><button data-undo>Deshacer</button><button data-redo>Rehacer</button>${HAS_NETWORK ? '<button data-api>Comprobar API</button>' : ''}<span data-status>Local</span>
  </header>
  <nav class="view-tabs" aria-label="Vistas del proyecto"><button data-view-tab="map">Mapa</button><button data-view-tab="editor">Editor</button><button data-view-tab="lua">Lua</button><button data-view-tab="config">Configuración</button></nav>
  <main class="studio-shell">
    <aside class="project-panel"><div class="panel-title"><strong>Proyectos</strong><button data-add-project title="Nuevo proyecto">+</button></div><div data-projects class="project-list"></div><div class="project-commands"><button data-duplicate-project>Duplicar</button><button data-delete-project>Eliminar</button></div><div class="panel-title"><strong>Activadores</strong><button data-add-trigger title="Nuevo activador">+</button></div><div data-triggers class="trigger-list"></div></aside>
    <section class="workspace"><div data-workspace class="workspace-content"></div></section>
    <aside class="inspector"><div class="panel-title"><strong>Inspector</strong><span data-selection></span></div><div data-inspector></div></aside>
  </main>
  <dialog data-lua-dialog><form method="dialog"><header><strong>Convertir Lua a activadores</strong><button value="cancel" aria-label="Cerrar">×</button></header><p>El código reconocido se convierte en bloques. Las instrucciones desconocidas se conservan como Lua libre.</p><textarea data-lua-source spellcheck="false"></textarea><footer><button value="cancel">Cancelar</button><button value="default" data-convert-lua>Convertir</button></footer></form></dialog>`;

const query = <T extends Element>(selector: string): T => { const node = app.querySelector<T>(selector); if (!node) throw new Error(`Falta ${selector}`); return node; };
const html = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
const snap = (): string => JSON.stringify(project);
const nextProjectId = (): number => Math.max(0, ...projects.map((item) => item.id)) + 1;
const activeTrigger = (): StudioTrigger => project.triggers.find((item) => item.id === activeTriggerId) || project.triggers[0];
const status = (message: string): void => { query<HTMLElement>('[data-status]').textContent = message; };

async function saveAll(): Promise<void> {
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = project; else projects.unshift(project);
  await persistProjects(projects); status('Guardado local');
}

function commit(previous: string, message = 'Cambio guardado'): void {
  if (previous !== snap()) { history.push(previous); history = history.slice(-150); future = []; }
  project.updatedAt = new Date().toISOString();
  window.clearTimeout(saveTimer); saveTimer = window.setTimeout(() => void saveAll(), 220);
  render(); status(message);
}

function switchView(view: StudioProject['activeView']): void { project.activeView = view; render(); void saveAll(); }

function renderProjects(): void {
  query<HTMLElement>('[data-projects]').innerHTML = projects.map((item) => `<button data-project-id="${item.id}" class="${item.id === project.id ? 'active' : ''}"><strong>${html(item.title)}</strong><small>Proyecto #${item.id} · ${item.triggers.length} activador(es)</small></button>`).join('');
  app.querySelectorAll<HTMLButtonElement>('[data-project-id]').forEach((button) => button.onclick = () => { const found = projects.find((item) => item.id === Number(button.dataset.projectId)); if (!found) return; project = found; activeTriggerId = project.triggers[0]?.id || ''; history = []; future = []; render(); });
}

function renderTriggers(): void {
  query<HTMLElement>('[data-triggers]').innerHTML = project.triggers.map((trigger, index) => `<article class="trigger-row ${trigger.id === activeTriggerId ? 'active' : ''} ${trigger.enabled ? '' : 'disabled'}" draggable="true" data-trigger-row="${trigger.id}"><span>${index + 1}</span><button data-trigger-id="${trigger.id}"><strong>${html(trigger.name)}</strong><small>${html(eventById(trigger.event)?.name || trigger.event)}</small></button><button data-remove-trigger="${trigger.id}" title="Eliminar">×</button></article>`).join('');
  app.querySelectorAll<HTMLButtonElement>('[data-trigger-id]').forEach((button) => button.onclick = () => { activeTriggerId = String(button.dataset.triggerId); render(); });
  app.querySelectorAll<HTMLButtonElement>('[data-remove-trigger]').forEach((button) => button.onclick = () => removeTrigger(String(button.dataset.removeTrigger)));
  let dragged = '';
  app.querySelectorAll<HTMLElement>('[data-trigger-row]').forEach((row) => { row.ondragstart = () => { dragged = String(row.dataset.triggerRow); }; row.ondragover = (event) => event.preventDefault(); row.ondrop = () => { const from = project.triggers.findIndex((item) => item.id === dragged), to = project.triggers.findIndex((item) => item.id === row.dataset.triggerRow); if (from < 0 || to < 0 || from === to) return; const before = snap(), [item] = project.triggers.splice(from, 1); project.triggers.splice(to, 0, item); commit(before, 'Activadores reordenados'); }; });
}

function eventOptions(selected: string): string {
  const groups = new Map<string, typeof EVENTS>(); EVENTS.forEach((entry) => groups.set(entry.group, [...(groups.get(entry.group) || []), entry]));
  return Array.from(groups).map(([group, entries]) => `<optgroup label="${html(group)}">${entries.map((entry) => `<option value="${html(entry.id)}" ${entry.id === selected ? 'selected' : ''}>${html(entry.name)}</option>`).join('')}</optgroup>`).join('');
}

function renderMap(host: HTMLElement): void {
  const zoom = Math.min(1.8, Math.max(.45, project.settings.zoom));
  host.innerHTML = `<div class="workspace-tools"><button data-zoom-out>−</button><strong>${Math.round(zoom * 100)}%</strong><button data-zoom-in>+</button><button data-fit>Encajar</button><label class="check"><input data-free-move type="checkbox" ${project.settings.freeMapMovement ? 'checked' : ''}> Mover mapa</label><label class="check"><input data-move-triggers type="checkbox" ${project.settings.moveTriggers ? 'checked' : ''}> Mover activadores</label><span>Arrastra el fondo o la cabecera azul del activador.</span></div><div class="map-viewport ${project.settings.grid ? '' : 'no-grid'}" data-map><div class="map-world" data-map-world style="transform:translate(${project.settings.mapX}px,${project.settings.mapY}px) scale(${zoom})">${project.triggers.map((trigger) => { const actions = trigger.actions.slice(0, 6).map((action) => `<span class="flow-block ${action.type}">${html(action.label)}</span>`).join('') || '<span class="flow-block empty">Sin acciones</span>'; const preview = project.settings.showCodeOnMap ? `<pre>${html(generateLua({ ...project, preamble: '', triggers: [trigger] }).split('\n').slice(2, 11).join('\n'))}</pre>` : ''; return `<article class="trigger-card ${trigger.id === activeTriggerId ? 'active' : ''} ${trigger.enabled ? '' : 'disabled'}" data-map-trigger="${trigger.id}" style="left:${trigger.x}px;top:${trigger.y}px"><button class="event-block">${html(trigger.name)}<small>${html(eventById(trigger.event)?.name || trigger.event)}</small></button><div class="trigger-flow">${actions}${preview}</div></article>`; }).join('')}</div></div>`;
  const map = host.querySelector<HTMLElement>('[data-map]'), world = host.querySelector<HTMLElement>('[data-map-world]'); if (!map || !world) return;
  const applyTransform = (): void => { world.style.transform = `translate(${project.settings.mapX}px,${project.settings.mapY}px) scale(${project.settings.zoom})`; };
  map.onwheel = (event) => { event.preventDefault(); const before = snap(); project.settings.zoom = Math.min(1.8, Math.max(.45, project.settings.zoom + (event.deltaY < 0 ? .1 : -.1))); applyTransform(); commit(before, 'Zoom actualizado'); };
  let mapPointerId: number | null = null, mapBefore = '', mapLastX = 0, mapLastY = 0, mapOriginX = 0, mapOriginY = 0, mapDragBounds: DOMRect | null = null;
  map.onpointerdown = (event) => {
    if (!project.settings.freeMapMovement || (event.target as Element).closest('[data-map-trigger]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    mapDragging = true; mapPointerId = event.pointerId; mapBefore = snap(); mapLastX = event.clientX; mapLastY = event.clientY; mapOriginX = project.settings.mapX; mapOriginY = project.settings.mapY; mapDragBounds = map.getBoundingClientRect();
    map.setPointerCapture(event.pointerId);
  };
  map.onpointermove = (event) => {
    if (!mapDragging || event.pointerId !== mapPointerId || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    if (event.pointerType === 'mouse' && (event.buttons & 1) === 0) return;
    if (mapDragBounds && (event.clientX < mapDragBounds.left || event.clientX > mapDragBounds.right || event.clientY < mapDragBounds.top || event.clientY > mapDragBounds.bottom)) return;
    const stepX=event.clientX-mapLastX,stepY=event.clientY-mapLastY;
    if(Math.abs(stepX)>180||Math.abs(stepY)>180||(event.clientX===0&&event.clientY===0))return;
    project.settings.mapX += stepX; project.settings.mapY += stepY; mapLastX=event.clientX; mapLastY=event.clientY;
    applyTransform();
  };
  const finishMapDrag = (event: PointerEvent, cancelled: boolean): void => {
    if (event.pointerId !== mapPointerId) return;
    if (map.hasPointerCapture(event.pointerId)) map.releasePointerCapture(event.pointerId);
    mapDragging = false; mapPointerId = null; mapDragBounds = null;
    if (cancelled) { project.settings.mapX = mapOriginX; project.settings.mapY = mapOriginY; applyTransform(); return; }
    if(mapBefore!==snap()){history.push(mapBefore);history=history.slice(-150);future=[];project.updatedAt=new Date().toISOString();void saveAll();status('Mapa desplazado sin alterar activadores');}
  };
  map.onpointerup = (event) => finishMapDrag(event, false);
  map.onpointercancel = (event) => finishMapDrag(event, true);
  host.querySelectorAll<HTMLElement>('[data-map-trigger]').forEach((card) => {
    const trigger = project.triggers.find((item) => item.id === card.dataset.mapTrigger);
    const handle = card.querySelector<HTMLButtonElement>('.event-block');
    if (!trigger || !handle) return;
    let before = '', downX = 0, downY = 0, lastX = 0, lastY = 0, originX = 0, originY = 0, moved = false, suppressClick = false, dragging = false;
    handle.onclick = (event) => {
      if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
      activeTriggerId = trigger.id;
      host.querySelectorAll<HTMLElement>('[data-map-trigger]').forEach((item)=>item.classList.toggle('active',item.dataset.mapTrigger===trigger.id));
      query<HTMLElement>('[data-triggers]').querySelectorAll<HTMLElement>('[data-trigger-row]').forEach((item)=>item.classList.toggle('active',item.dataset.triggerRow===trigger.id));
      renderInspector();
    };
    if (!project.settings.moveTriggers) return;
    handle.onmousedown = (event) => {
      if (event.button !== 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || (event.clientX === 0 && event.clientY === 0)) return;
      event.preventDefault(); event.stopPropagation();
      before = snap(); downX = lastX = event.clientX; downY = lastY = event.clientY; originX = trigger.x; originY = trigger.y; moved = false; dragging = true;
      window.addEventListener('mousemove', moveTrigger, true);
      window.addEventListener('mouseup', finishTrigger, true);
      window.addEventListener('blur', finishTrigger, true);
    };
    const moveTrigger = (event: MouseEvent): void => {
      if (!dragging || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY) || (event.clientX === 0 && event.clientY === 0)) return;
      if ((event.buttons & 1) === 0) { finishTrigger(); return; }
      const bounds=map.getBoundingClientRect();if(event.clientX<bounds.left-80||event.clientX>bounds.right+80||event.clientY<bounds.top-80||event.clientY>bounds.bottom+80)return;
      if(Math.abs(event.clientX-lastX)>120||Math.abs(event.clientY-lastY)>120)return;
      const deltaX = event.clientX - downX, deltaY = event.clientY - downY;
      if (!moved && Math.hypot(event.clientX-downX,event.clientY-downY) < 3) return;
      event.preventDefault(); event.stopPropagation();
      moved = true;
      lastX=event.clientX;lastY=event.clientY;
      trigger.x = Math.max(0, originX + deltaX / zoom);
      trigger.y = Math.max(0, originY + deltaY / zoom);
      card.style.left = `${trigger.x}px`; card.style.top = `${trigger.y}px`;
    };
    const finishTrigger = (event?: MouseEvent | Event): void => {
      if (!dragging) return;
      event?.preventDefault(); event?.stopPropagation();
      dragging = false;
      window.removeEventListener('mousemove', moveTrigger, true);
      window.removeEventListener('mouseup', finishTrigger, true);
      window.removeEventListener('blur', finishTrigger, true);
      if (!moved) return;
      suppressClick = true;
      if (before !== snap()) { history.push(before); history = history.slice(-150); future = []; }
      project.updatedAt = new Date().toISOString();
      window.clearTimeout(saveTimer);
      void saveAll();
      status(`Activador guardado en X ${Math.round(trigger.x)}, Y ${Math.round(trigger.y)}`);
    };
  });
  host.querySelector<HTMLButtonElement>('[data-zoom-in]')!.onclick = () => { const before = snap(); project.settings.zoom = Math.min(1.8, project.settings.zoom + .1); commit(before); };
  host.querySelector<HTMLButtonElement>('[data-zoom-out]')!.onclick = () => { const before = snap(); project.settings.zoom = Math.max(.45, project.settings.zoom - .1); commit(before); };
  host.querySelector<HTMLButtonElement>('[data-fit]')!.onclick = () => { const before = snap(); project.settings.zoom = 1; project.settings.mapX = 0; project.settings.mapY = 0; commit(before, 'Mapa centrado'); };
  host.querySelector<HTMLInputElement>('[data-free-move]')!.onchange = (event) => { const before = snap(); project.settings.freeMapMovement = (event.currentTarget as HTMLInputElement).checked; commit(before); };
  host.querySelector<HTMLInputElement>('[data-move-triggers]')!.onchange = (event) => { const before = snap(); project.settings.moveTriggers = (event.currentTarget as HTMLInputElement).checked; commit(before); };
}

function renderAction(action: StudioAction, index: number): string {
  const method = action.type === 'api' ? methodByKey(action.method || '') : undefined;
  const args = splitLuaArguments(action.value);
  const phrase = method ? method.phrase.replace(/\{([^}]+)\}/g, (_, key: string) => { const paramIndex = method.params.findIndex((param) => param.key === key); const param = method.params[paramIndex]; if (!param) return `[${html(key)}]`; return `<label class="inline-param" title="${html(param.hint || param.label)}"><span>${html(param.label)}${param.optional ? ' (opcional)' : ''}</span><input data-action-param="${index}" data-param-index="${paramIndex}" value="${html(args[paramIndex] || param.defaultValue)}" spellcheck="false"></label>`; }) : '';
  const resultHint = method?.results.length ? `Sugeridos: ${method.results.join(', ')}` : 'Esta acción no necesita guardar resultados';
  const basicDetails: Record<Exclude<ActionType, 'api'>, string> = {
    message: `<div class="action-sentence">Mostrar mensaje <label class="inline-param"><span>texto</span><input data-action-value="${index}" value="${html(action.value)}"></label></div>`,
    wait: `<div class="action-sentence">Esperar <label class="inline-param"><span>segundos</span><input data-action-value="${index}" type="number" min="0" step="0.1" value="${html(action.value)}"></label> segundos</div>`,
    if: `<div class="action-sentence">Si <label class="inline-param"><span>condición Lua</span><input data-action-condition="${index}" value="${html(action.condition || action.value)}" spellcheck="false"></label> entonces</div>`,
    repeat: `<div class="action-sentence">Repetir <label class="inline-param"><span>veces</span><input data-action-value="${index}" type="number" min="1" max="1000" value="${html(action.value)}"></label> veces</div>`,
    set_variable: `<div class="action-sentence">Establecer <label class="inline-param"><span>asignación</span><input data-action-value="${index}" value="${html(action.value)}" spellcheck="false"></label></div>`,
    raw: `<label class="raw-action-field">Código Lua libre<textarea data-action-value="${index}" spellcheck="false">${html(action.value)}</textarea></label>`,
  };
  const details = method ? `<select data-action-method="${index}">${METHODS.map((entry) => `<option value="${entry.key}" ${entry.key === action.method ? 'selected' : ''}>${html(entry.name)} · ${entry.key}</option>`).join('')}</select><div class="action-sentence">${phrase}</div><label class="action-result">Resultados Lua<input data-action-targets="${index}" value="${html(action.targets || '')}" placeholder="${html(resultHint)}"><small>${html(resultHint)}</small></label><details class="advanced-arguments"><summary>Argumentos Lua avanzados</summary><textarea data-action-value="${index}" placeholder="Argumentos separados por coma">${html(action.value)}</textarea></details>` : action.type === 'api' ? `<select data-action-method="${index}">${METHODS.map((entry) => `<option value="${entry.key}">${html(entry.name)} · ${entry.key}</option>`).join('')}</select><textarea data-action-value="${index}">${html(action.value)}</textarea>` : basicDetails[action.type];
  const children = action.children ? `<div class="nested-actions">${action.children.map((child) => `<div class="mini-block ${child.type}">${html(child.label)}: ${html(child.value)}</div>`).join('')}<button data-add-child="${index}">+ acción interna</button></div>` : '';
  return `<article class="action-block ${action.type}" draggable="true" data-action-index="${index}"><header><span class="drag-handle">⠿</span><input data-action-label="${index}" value="${html(action.label)}"><button data-action-up="${index}" title="Subir">↑</button><button data-action-down="${index}" title="Bajar">↓</button><button data-remove-action="${index}" title="Eliminar">×</button></header>${details}${children}</article>`;
}

function renderEditor(host: HTMLElement): void {
  const trigger = activeTrigger();
  host.innerHTML = `<div class="editor-shell"><aside class="block-palette"><label>Buscar bloques<input data-palette-search placeholder="mensaje, mundo, jugador..."></label><section data-basic-palette><strong>Acciones</strong><button data-new-action="message">Mensaje</button><button data-new-action="wait">Esperar</button><button data-new-action="if">Condición Si</button><button data-new-action="repeat">Repetir</button><button data-new-action="set_variable">Variable</button><button data-new-action="raw">Lua libre</button></section><section class="api-palette"><strong>API Mini World</strong><div data-api-palette>${METHODS.map((method) => `<button data-api-method="${method.key}" data-search="${html(`${method.name} ${method.key} ${method.group}`.toLowerCase())}"><span>${html(method.name)}</span><small>${html(method.key)}</small></button>`).join('')}</div></section></aside><div class="block-editor"><div class="editor-event"><span>CUANDO</span><strong>${html(eventById(trigger.event)?.name || trigger.event)}</strong></div><div class="condition-summary">${trigger.conditions.length ? trigger.conditions.map((condition) => `<span>SI ${html(condition.field)} ${condition.operator} ${html(condition.value)}</span>`).join('') : '<span>Sin condiciones iniciales</span>'}</div><div class="action-stack" data-action-stack>${trigger.actions.map(renderAction).join('') || '<div class="empty-editor">Añade o arrastra una acción desde la paleta.</div>'}</div></div></div>`;
  host.querySelectorAll<HTMLButtonElement>('[data-new-action]').forEach((button) => button.onclick = () => addAction(button.dataset.newAction as ActionType));
  host.querySelectorAll<HTMLButtonElement>('[data-api-method]').forEach((button) => { button.draggable = true; button.onclick = () => addAction('api', String(button.dataset.apiMethod)); button.ondragstart = (event) => event.dataTransfer?.setData('application/x-mw-method', String(button.dataset.apiMethod)); });
  const search = host.querySelector<HTMLInputElement>('[data-palette-search]'); if (search) search.oninput = () => host.querySelectorAll<HTMLElement>('[data-api-method]').forEach((button) => button.hidden = !String(button.dataset.search).includes(search.value.trim().toLowerCase()));
  host.querySelectorAll<HTMLElement>('[data-action-index]').forEach((block) => { block.ondragstart = () => { draggedAction = String(block.dataset.actionIndex); }; block.ondragover = (event) => event.preventDefault(); block.ondrop = (event) => { event.preventDefault(); const method = event.dataTransfer?.getData('application/x-mw-method'); if (method) { addAction('api', method); return; } const from = Number(draggedAction), to = Number(block.dataset.actionIndex); if (!Number.isInteger(from) || from === to) return; const before = snap(), [item] = trigger.actions.splice(from, 1); trigger.actions.splice(to, 0, item); commit(before, 'Bloques reordenados'); }; });
  const stack = host.querySelector<HTMLElement>('[data-action-stack]'); if (stack) { stack.ondragover = (event) => event.preventDefault(); stack.ondrop = (event) => { const method = event.dataTransfer?.getData('application/x-mw-method'); if (method) addAction('api', method); }; }
  bindActionEditors(host, trigger);
}

function bindActionEditors(host: HTMLElement, trigger: StudioTrigger): void {
  const change = (selector: string, apply: (action: StudioAction, input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => void): void => host.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector).forEach((input) => input.onchange = () => { const action = trigger.actions[Number(input.dataset.actionLabel ?? input.dataset.actionValue ?? input.dataset.actionTargets ?? input.dataset.actionMethod ?? input.dataset.actionCondition)]; if (!action) return; const before = snap(); apply(action, input); commit(before); });
  change('[data-action-label]', (action, input) => action.label = input.value); change('[data-action-value]', (action, input) => action.value = input.value); change('[data-action-targets]', (action, input) => action.targets = input.value); change('[data-action-method]', (action, input) => { const method = methodByKey(input.value); action.method = input.value; action.value = method ? methodDefaultValue(method) : ''; action.targets = method ? methodDefaultTargets(method) : ''; if (project.settings.easyMode) action.label = method?.name || input.value; }); change('[data-action-condition]', (action, input) => { action.condition = input.value; action.value = input.value; });
  host.querySelectorAll<HTMLInputElement>('[data-action-param]').forEach((input) => input.onchange = () => { const action = trigger.actions[Number(input.dataset.actionParam)], method = action ? methodByKey(action.method || '') : undefined, paramIndex = Number(input.dataset.paramIndex); if (!action || !method || !Number.isInteger(paramIndex)) return; const before = snap(), args = splitLuaArguments(action.value); while (args.length < method.params.length) args.push(method.params[args.length].defaultValue); args[paramIndex] = input.value.trim() || method.params[paramIndex].defaultValue; action.value = args.join(', '); commit(before, 'Parámetro actualizado'); });
  host.querySelectorAll<HTMLButtonElement>('[data-remove-action]').forEach((button) => button.onclick = () => { const before = snap(); trigger.actions.splice(Number(button.dataset.removeAction), 1); commit(before); });
  host.querySelectorAll<HTMLButtonElement>('[data-action-up],[data-action-down]').forEach((button) => button.onclick = () => { const from = Number(button.dataset.actionUp ?? button.dataset.actionDown), delta = button.hasAttribute('data-action-up') ? -1 : 1, to = from + delta; if (to < 0 || to >= trigger.actions.length) return; const before = snap(), [item] = trigger.actions.splice(from, 1); trigger.actions.splice(to, 0, item); commit(before, 'Bloque movido'); });
  host.querySelectorAll<HTMLButtonElement>('[data-add-child]').forEach((button) => button.onclick = () => { const action = trigger.actions[Number(button.dataset.addChild)]; if (!action?.children) return; const before = snap(); action.children.push(createAction('message')); commit(before); });
}

function renderLua(host: HTMLElement): void {
  const lua = generateLua(project), result = scanLua(lua);
  host.innerHTML = `<div class="lua-workspace"><header><button data-copy-lua>Copiar código</button><button data-download-lua>Descargar .lua</button><button data-open-converter>Convertir Lua</button><span class="scan-${result.status}">Análisis: ${result.status}</span></header><pre data-code>${html(lua)}</pre><section class="console"><strong>Comprobación local, sin ejecutar Lua</strong><p>${result.blocked.join(', ') || result.warnings.join(', ') || 'No se detectaron patrones peligrosos.'}</p><small>APIs detectadas: ${html(result.calls.join(', ') || 'ninguna')}</small></section></div>`;
  host.querySelector<HTMLButtonElement>('[data-copy-lua]')!.onclick = async () => { await navigator.clipboard.writeText(lua); status('Lua copiado'); };
  host.querySelector<HTMLButtonElement>('[data-download-lua]')!.onclick = () => void exportLua(project, lua);
  host.querySelector<HTMLButtonElement>('[data-open-converter]')!.onclick = () => query<HTMLDialogElement>('[data-lua-dialog]').showModal();
}

function renderConfig(host: HTMLElement): void {
  host.innerHTML = `<div class="config-grid"><section><h2>Proyecto</h2><label>Título<input data-project-title value="${html(project.title)}"></label><label>Descripción<textarea data-project-description>${html(project.description)}</textarea></label><label>Lua global previo a los activadores<textarea data-preamble spellcheck="false">${html(project.preamble)}</textarea></label></section><section><h2>Comportamiento</h2><label class="check"><input data-setting="keepTabOnAdd" type="checkbox" ${project.settings.keepTabOnAdd ? 'checked' : ''}> Mantener la pestaña al añadir un activador</label><label class="check"><input data-setting="showCodeOnMap" type="checkbox" ${project.settings.showCodeOnMap ? 'checked' : ''}> Mostrar código en el mapa</label><label class="check"><input data-setting="freeMapMovement" type="checkbox" ${project.settings.freeMapMovement ? 'checked' : ''}> Permitir mover el mapa</label><label class="check"><input data-setting="moveTriggers" type="checkbox" ${project.settings.moveTriggers ? 'checked' : ''}> Permitir mover activadores</label><label class="check"><input data-setting="easyMode" type="checkbox" ${project.settings.easyMode ? 'checked' : ''}> Reemplazar llamadas por nombres fáciles</label><label class="check"><input data-setting="grid" type="checkbox" ${project.settings.grid ? 'checked' : ''}> Mostrar cuadrícula</label><button data-reset-map>Restablecer posición del mapa</button></section><section><h2>Seguridad</h2><p>Máximo 2.5 MB. El Studio no ejecuta Lua. Los bloques no reconocidos se mantienen visibles como Lua libre.</p><button data-run-scan>Analizar proyecto</button><pre data-config-result></pre></section></div>`;
  const bind = (selector: string, apply: (value: string) => void) => { const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector); if (input) input.onchange = () => { const before = snap(); apply(input.value); commit(before); }; };
  bind('[data-project-title]', (value) => project.title = value); bind('[data-project-description]', (value) => project.description = value); bind('[data-preamble]', (value) => project.preamble = value);
  host.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => input.onchange = () => { const before = snap(), key = input.dataset.setting as 'keepTabOnAdd' | 'showCodeOnMap' | 'freeMapMovement' | 'moveTriggers' | 'easyMode' | 'grid'; project.settings[key] = input.checked; commit(before); });
  host.querySelector<HTMLButtonElement>('[data-reset-map]')!.onclick = () => { const before = snap(); project.settings.mapX = 0; project.settings.mapY = 0; project.settings.zoom = 1; commit(before); };
  host.querySelector<HTMLButtonElement>('[data-run-scan]')!.onclick = () => { const result = scanLua(generateLua(project)); host.querySelector<HTMLElement>('[data-config-result]')!.textContent = JSON.stringify(result, null, 2); };
}

function renderInspector(): void {
  const trigger = activeTrigger(), host = query<HTMLElement>('[data-inspector]'); query<HTMLElement>('[data-selection]').textContent = trigger?.name || 'Proyecto';
  if (!trigger) { host.innerHTML = '<p class="empty-panel">No hay activadores.</p>'; return; }
  const event = eventById(trigger.event);
  host.innerHTML = `<label>Nombre del activador<input data-trigger-name value="${html(trigger.name)}"></label><label>Evento<select data-trigger-event>${eventOptions(trigger.event)}</select></label><p class="event-data"><strong>Datos del evento:</strong> ${html(event?.fields.map((field) => `e.${field}`).join(', ') || 'ninguno documentado')}</p><label>Nombre de función<input data-function-name value="${html(trigger.functionName)}"></label><label class="check"><input data-trigger-enabled type="checkbox" ${trigger.enabled ? 'checked' : ''}> Incluir al exportar</label><div class="inspector-heading"><strong>Condiciones</strong><button data-add-condition>+</button></div><div>${trigger.conditions.map((condition, index) => `<div class="condition-row"><input data-condition-field="${index}" value="${html(condition.field)}"><select data-condition-operator="${index}">${['==', '~=', '>', '>=', '<', '<='].map((op) => `<option ${condition.operator === op ? 'selected' : ''}>${op}</option>`).join('')}</select><input data-condition-value="${index}" value="${html(condition.value)}"><button data-remove-condition="${index}">×</button></div>`).join('')}</div><div class="inspector-heading"><strong>Variables</strong><button data-add-variable>+</button></div><div>${trigger.variables.map((variable, index) => `<div class="variable-row"><input data-variable-name="${index}" value="${html(variable.name)}"><select data-variable-type="${index}"><option ${variable.valueType === 'number' ? 'selected' : ''}>number</option><option ${variable.valueType === 'string' ? 'selected' : ''}>string</option><option ${variable.valueType === 'boolean' ? 'selected' : ''}>boolean</option></select><input data-variable-value="${index}" value="${html(variable.value)}"><button data-remove-variable="${index}">×</button></div>`).join('')}</div><div class="inspector-actions"><button data-duplicate-trigger>Duplicar activador</button><button data-convert-here>Importar Lua</button></div>`;
  const bind = (selector: string, apply: (value: string) => void) => { const input = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector); if (input) input.onchange = () => { const before = snap(); apply(input.value); commit(before); }; };
  bind('[data-trigger-name]', (value) => trigger.name = value); bind('[data-trigger-event]', (value) => trigger.event = value); bind('[data-function-name]', (value) => trigger.functionName = value);
  host.querySelector<HTMLInputElement>('[data-trigger-enabled]')!.onchange = (event) => { const before = snap(); trigger.enabled = (event.currentTarget as HTMLInputElement).checked; commit(before); };
  host.querySelector<HTMLButtonElement>('[data-add-condition]')!.onclick = () => { const before = snap(); trigger.conditions.push(createCondition()); commit(before); };
  host.querySelector<HTMLButtonElement>('[data-add-variable]')!.onclick = () => { const before = snap(); trigger.variables.push(createVariable()); commit(before); };
  trigger.conditions.forEach((condition, index) => { bind(`[data-condition-field="${index}"]`, (value) => condition.field = value); bind(`[data-condition-operator="${index}"]`, (value) => condition.operator = value as typeof condition.operator); bind(`[data-condition-value="${index}"]`, (value) => condition.value = value); });
  trigger.variables.forEach((variable, index) => { bind(`[data-variable-name="${index}"]`, (value) => variable.name = value); bind(`[data-variable-type="${index}"]`, (value) => variable.valueType = value as typeof variable.valueType); bind(`[data-variable-value="${index}"]`, (value) => variable.value = value); });
  host.querySelectorAll<HTMLButtonElement>('[data-remove-condition]').forEach((button) => button.onclick = () => { const before = snap(); trigger.conditions.splice(Number(button.dataset.removeCondition), 1); commit(before); });
  host.querySelectorAll<HTMLButtonElement>('[data-remove-variable]').forEach((button) => button.onclick = () => { const before = snap(); trigger.variables.splice(Number(button.dataset.removeVariable), 1); commit(before); });
  host.querySelector<HTMLButtonElement>('[data-duplicate-trigger]')!.onclick = () => { const before = snap(), copy = structuredClone(trigger); copy.id = createTrigger(project.triggers.length + 1).id; copy.name += ' copia'; copy.x += 40; copy.y += 40; project.triggers.push(copy); activeTriggerId = copy.id; commit(before); };
  host.querySelector<HTMLButtonElement>('[data-convert-here]')!.onclick = () => query<HTMLDialogElement>('[data-lua-dialog]').showModal();
}

function addAction(type: ActionType, method = ''): void { const before = snap(), action = createAction(type); if (type === 'api' && method) { const entry = methodByKey(method); action.method = method; action.value = entry ? methodDefaultValue(entry) : ''; action.targets = entry ? methodDefaultTargets(entry) : ''; action.label = project.settings.easyMode ? entry?.name || method : method; } activeTrigger().actions.push(action); commit(before, 'Acción añadida'); }
function removeTrigger(id: string): void { if (project.triggers.length <= 1) { alert('El proyecto necesita al menos un activador.'); return; } const before = snap(), index = project.triggers.findIndex((item) => item.id === id); if (index < 0) return; project.triggers.splice(index, 1); activeTriggerId = project.triggers[Math.max(0, index - 1)].id; commit(before, 'Activador eliminado'); }

function render(): void {
  renderProjects(); renderTriggers(); renderInspector();
  app.querySelectorAll<HTMLButtonElement>('[data-view-tab]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.viewTab === project.activeView)));
  const host = query<HTMLElement>('[data-workspace]');
  if (project.activeView === 'map') renderMap(host); else if (project.activeView === 'editor') renderEditor(host); else if (project.activeView === 'lua') renderLua(host); else renderConfig(host);
  const errors = validateProject(project); if (errors.length) status(`${errors.length} error(es)`);
}

app.querySelectorAll<HTMLButtonElement>('[data-view-tab]').forEach((button) => button.onclick = () => switchView(button.dataset.viewTab as StudioProject['activeView']));
query<HTMLButtonElement>('[data-add-trigger]').onclick = () => { const before = snap(), trigger = createTrigger(project.triggers.length + 1); project.triggers.push(trigger); activeTriggerId = trigger.id; if (!project.settings.keepTabOnAdd) project.activeView = 'editor'; commit(before, 'Activador creado'); };
query<HTMLButtonElement>('[data-add-project]').onclick = query<HTMLButtonElement>('[data-new]').onclick = () => { project = createProject(nextProjectId()); projects.unshift(project); activeTriggerId = project.triggers[0].id; history = []; future = []; render(); void saveAll(); };
query<HTMLButtonElement>('[data-duplicate-project]').onclick = () => { const copy = structuredClone(project); copy.id = nextProjectId(); copy.title += ' copia'; copy.createdAt = copy.updatedAt = new Date().toISOString(); copy.triggers.forEach((trigger, index) => trigger.id = createTrigger(index + 1).id); projects.unshift(copy); project = copy; activeTriggerId = copy.triggers[0].id; history = []; future = []; render(); void saveAll(); };
query<HTMLButtonElement>('[data-delete-project]').onclick = () => { if (!confirm(`¿Eliminar “${project.title}” del almacenamiento local?`)) return; projects = projects.filter((item) => item.id !== project.id); if (!projects.length) projects = [createProject(1)]; project = projects[0]; activeTriggerId = project.triggers[0].id; history = []; future = []; render(); void saveAll(); };
query<HTMLButtonElement>('[data-import-project]').onclick = async () => { try { const imported = await importProject(); if (!imported) return; if (projects.some((item) => item.id === imported.id)) imported.id = nextProjectId(); projects.unshift(imported); project = imported; activeTriggerId = project.triggers[0].id; history = []; future = []; render(); void saveAll(); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo abrir el proyecto.'); } };
query<HTMLButtonElement>('[data-save-file]').onclick = () => void exportProject(project); query<HTMLButtonElement>('[data-export-lua]').onclick = () => void exportLua(project, generateLua(project));
query<HTMLButtonElement>('[data-undo]').onclick = () => { const previous = history.pop(); if (!previous) return; future.push(snap()); project = JSON.parse(previous) as StudioProject; activeTriggerId = project.triggers[0].id; render(); void saveAll(); };
query<HTMLButtonElement>('[data-redo]').onclick = () => { const next = future.pop(); if (!next) return; history.push(snap()); project = JSON.parse(next) as StudioProject; activeTriggerId = project.triggers[0].id; render(); void saveAll(); };
query<HTMLButtonElement>('[data-home]').onclick = () => void openHomepage();
const apiButton = app.querySelector<HTMLButtonElement>('[data-api]'); if (apiButton) apiButton.onclick = async () => { status('Consultando…'); try { status(await checkRemote()); } catch { status('API sin conexión'); } };
query<HTMLButtonElement>('[data-convert-lua]').onclick = (event) => { event.preventDefault(); try { const before = snap(), converted = importLua(query<HTMLTextAreaElement>('[data-lua-source]').value, project.id); converted.title = project.title; project = converted; activeTriggerId = project.triggers[0].id; query<HTMLDialogElement>('[data-lua-dialog]').close(); commit(before, 'Lua convertido a activadores'); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo convertir.'); } };
window.addEventListener('keydown', (event) => { if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === 's') { event.preventDefault(); void exportProject(project); } if (event.key.toLowerCase() === 'z') { event.preventDefault(); query<HTMLButtonElement>('[data-undo]').click(); } if (event.key.toLowerCase() === 'y') { event.preventDefault(); query<HTMLButtonElement>('[data-redo]').click(); } });

projects = await listProjects(); if (projects.length) project = projects[0]; else projects = [project]; activeTriggerId = project.triggers[0]?.id || ''; render(); void saveAll();
