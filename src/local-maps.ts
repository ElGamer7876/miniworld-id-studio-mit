import { invoke } from '@tauri-apps/api/core';
export type LocalUiReference={uiId:string;elementId?:string;source:string;confidence:'heuristic'};
export type LocalMap={mapId:string;dataVersion:string;sceneNames:string[];gameVersion?:string;pluginApiVersion?:string;customUiFiles:number;uiReferences:LocalUiReference[];warnings:string[]};
export type LocalMapScan={roots:Array<{dataVersion:string;available:boolean;mapCount:number;warning?:string}>;maps:LocalMap[];privacy:string};
export const scanLocalMaps=():Promise<LocalMapScan>=>invoke<LocalMapScan>('scan_miniworld_maps');
