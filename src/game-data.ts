import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export type ObservedSymbol={name:string;occurrences:number;sources:string[];confidence:'observed'};
export type ObservedId={id:string;label?:string;kind:'item'|'block'|'actor'|'ui'|'skill';source:string;confidence:'heuristic'};
export type GameDataScan={displayRoot:string;detectedVersion?:string;filesSeen:number;filesRead:number;filesSkipped:number;bytesRead:number;methods:ObservedSymbol[];events:ObservedSymbol[];ids:ObservedId[];warnings:string[];privacy:string};
export type CatalogCompatibility={knownMethods:number;unknownMethods:number;knownEvents:number;unknownEvents:number};

export async function chooseAndScanGameData():Promise<GameDataScan|null>{
  const selected=await open({directory:true,multiple:false,title:'Seleccionar datos locales de Mini World'});
  if(!selected||Array.isArray(selected))return null;
  return invoke<GameDataScan>('scan_miniworld_game_data',{root:selected});
}

export function filterGameData(scan:GameDataScan,query:string):GameDataScan{
  const needle=query.trim().toLocaleLowerCase();
  if(!needle)return scan;
  const matches=(...values:Array<string|undefined>):boolean=>values.some(value=>String(value||'').toLocaleLowerCase().includes(needle));
  return {...scan,
    methods:scan.methods.filter(item=>matches(item.name,...item.sources)),
    events:scan.events.filter(item=>matches(item.name,...item.sources)),
    ids:scan.ids.filter(item=>matches(item.id,item.label,item.kind,item.source))};
}

export function catalogCompatibility(scan:GameDataScan,knownMethods:Iterable<string>,knownEvents:Iterable<string>):CatalogCompatibility{
  const methods=new Set(knownMethods),events=new Set(knownEvents);
  return {
    knownMethods:scan.methods.filter(item=>methods.has(item.name)).length,
    unknownMethods:scan.methods.filter(item=>!methods.has(item.name)).length,
    knownEvents:scan.events.filter(item=>events.has(item.name)).length,
    unknownEvents:scan.events.filter(item=>!events.has(item.name)).length,
  };
}

export function safeCatalogReport(scan:GameDataScan):string{
  return JSON.stringify({
    format:'miniworld-id-studio-observed-catalog',version:1,generatedAt:new Date().toISOString(),
    detectedVersion:scan.detectedVersion,summary:{filesSeen:scan.filesSeen,filesRead:scan.filesRead,filesSkipped:scan.filesSkipped,bytesRead:scan.bytesRead},
    methods:scan.methods,events:scan.events,ids:scan.ids,warnings:scan.warnings,
  },null,2);
}
