import { load } from '@tauri-apps/plugin-store';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export type StoreLike={get<T>(key:string):Promise<T|undefined>;set(key:string,value:unknown):Promise<void>;save():Promise<void>};
export const IS_TAURI_RUNTIME=typeof window!=='undefined'&&'__TAURI_INTERNALS__' in window;

class BrowserStore implements StoreLike{
  private readonly name:string;
  private data:Record<string,unknown>;
  constructor(name:string){this.name=name;try{this.data=JSON.parse(localStorage.getItem(name)||'{}') as Record<string,unknown>}catch{this.data={}}}
  async get<T>(key:string):Promise<T|undefined>{return this.data[key] as T|undefined}
  async set(key:string,value:unknown):Promise<void>{this.data[key]=structuredClone(value)}
  async save():Promise<void>{localStorage.setItem(this.name,JSON.stringify(this.data))}
}

export function createPlatformStore(name:string):Promise<StoreLike>{return IS_TAURI_RUNTIME?load(name,{autoSave:250}) as Promise<StoreLike>:Promise.resolve(new BrowserStore(`miniworld-id-studio:${name}`))}
export function safeFileName(value:string,fallback:string):string{return value.replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||fallback}
export async function saveText(title:string,defaultName:string,extensions:string[],content:string,mime='text/plain'):Promise<boolean>{if(IS_TAURI_RUNTIME){const path=await save({title,defaultPath:defaultName,filters:[{name:title,extensions}]});if(!path)return false;await writeTextFile(path,content);return true}const blob=new Blob([content],{type:`${mime};charset=utf-8`}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=defaultName;link.hidden=true;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
export async function openText(title:string,extensions:string[]):Promise<string|null>{if(IS_TAURI_RUNTIME){const path=await open({title,multiple:false,filters:[{name:title,extensions}]});if(!path||Array.isArray(path))return null;return readTextFile(path)}return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept=extensions.map(extension=>`.${extension}`).join(',');input.hidden=true;let settled=false;const finish=(value:string|null):void=>{if(settled)return;settled=true;input.remove();resolve(value)};input.addEventListener('cancel',()=>finish(null));input.onchange=async()=>{const file=input.files?.[0];if(!file){finish(null);return}try{finish(await file.text())}catch(error){input.remove();reject(error)}};document.body.append(input);input.click()})}
