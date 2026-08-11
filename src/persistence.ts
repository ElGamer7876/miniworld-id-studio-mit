import { load } from '@tauri-apps/plugin-store';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { StudioProject } from './studio-core';
import { parseProject } from './studio-core';

const storePromise = load('studio-projects.json', {autoSave: 250});

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
  const path = await save({title: 'Guardar proyecto de Mini World ID Studio', defaultPath: `${project.title.replace(/[^A-Za-z0-9_-]+/g, '-') || 'proyecto'}.mwstudio`, filters: [{name: 'Proyecto Mini World ID Studio', extensions: ['mwstudio', 'json']}]});
  if (!path) return false;
  await writeTextFile(path, JSON.stringify(project, null, 2));
  return true;
}

export async function importProject(): Promise<StudioProject | null> {
  const path = await open({title: 'Abrir proyecto de Mini World ID Studio', multiple: false, filters: [{name: 'Proyecto Mini World ID Studio', extensions: ['mwstudio', 'json']}]});
  if (!path || Array.isArray(path)) return null;
  return parseProject(await readTextFile(path));
}

export async function exportLua(project: StudioProject, lua: string): Promise<boolean> {
  const path = await save({title: 'Exportar Lua', defaultPath: `${project.title.replace(/[^A-Za-z0-9_-]+/g, '-') || 'script'}.lua`, filters: [{name: 'Script Lua', extensions: ['lua']}]});
  if (!path) return false;
  await writeTextFile(path, lua);
  return true;
}
