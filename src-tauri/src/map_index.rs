use regex::Regex;
use serde::Serialize;
use std::{collections::BTreeSet, env, fs, path::{Path, PathBuf}};

const ROOTS: [(&str, &str); 4] = [("4.10", "miniworddata410\\data"), ("4.02", "miniworddata402\\data"), ("1.x", "miniworddata1\\data"), ("1.10", "miniworddata110\\data")];
const MAX_FILE: u64 = 2 * 1024 * 1024;
const MAX_FILES: usize = 10_000;

#[derive(Serialize)] #[serde(rename_all="camelCase")]
struct UiRef { ui_id:String, element_id:Option<String>, source:String, confidence:&'static str }
#[derive(Serialize)] #[serde(rename_all="camelCase")]
struct LocalMap { map_id:String, data_version:String, scene_names:Vec<String>, game_version:Option<String>, plugin_api_version:Option<String>, custom_ui_files:usize, ui_references:Vec<UiRef>, warnings:Vec<String> }
#[derive(Serialize)] #[serde(rename_all="camelCase")]
struct ScanRoot { data_version:String, available:bool, map_count:usize, warning:Option<String> }
#[derive(Serialize)] #[serde(rename_all="camelCase")]
pub struct LocalMapScan { roots:Vec<ScanRoot>, maps:Vec<LocalMap>, privacy:&'static str }

fn map_id(name:&str)->Option<&str>{name.strip_prefix('w').filter(|id|!id.is_empty()&&id.chars().all(|c|c.is_ascii_digit()))}
fn text(path:&Path)->Option<String>{let m=fs::symlink_metadata(path).ok()?;if !m.file_type().is_file()||m.len()>MAX_FILE{return None}let b=fs::read(path).ok()?;if b.iter().take(4096).any(|v|*v==0){return None}String::from_utf8(b).ok()}
fn printable(path:&Path)->String{let Ok(bytes)=fs::read(path) else{return String::new()};let(mut out,mut current)=(String::new(),String::new());for byte in bytes.into_iter().take(MAX_FILE as usize){if byte.is_ascii_graphic()||byte==b' '{current.push(byte as char)}else{if current.len()>=4{out.push_str(&current);out.push('\n')}current.clear()}}out}
fn version(value:&str)->Option<String>{Regex::new(r"(?:^|[^0-9])(\d{1,3}\.\d{1,3}\.\d{1,4})(?:[^0-9]|$)").ok()?.captures(value).and_then(|c|c.get(1)).map(|m|m.as_str().into())}
fn files(root:&Path,out:&mut Vec<PathBuf>,depth:usize){if depth>6||out.len()>=MAX_FILES{return}let Ok(entries)=fs::read_dir(root)else{return};for entry in entries.flatten(){if out.len()>=MAX_FILES{break}let Ok(kind)=entry.file_type()else{continue};if kind.is_symlink(){continue}if kind.is_dir(){files(&entry.path(),out,depth+1)}else if kind.is_file(){out.push(entry.path())}}}
fn ui_refs(paths:&[PathBuf],root:&Path)->Vec<UiRef>{let re=Regex::new(r#"(?i)[\"']?(ui_?id|element_?id)[\"']?\s*[:=]\s*[\"']?([A-Za-z0-9_.:-]{1,128})"#).unwrap();let mut found=BTreeSet::new();for path in paths{let ext=path.extension().and_then(|v|v.to_str()).unwrap_or("").to_ascii_lowercase();if !matches!(ext.as_str(),"json"|"lua"|"txt"|"xml"|"cfg"|"ini"){continue}let Some(body)=text(path)else{continue};let source=path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\',"/");let(mut ui,mut elements)=(Vec::new(),Vec::new());for c in re.captures_iter(&body){let key=c[1].to_ascii_lowercase();if key.starts_with("ui"){ui.push(c[2].to_string())}else{elements.push(c[2].to_string())}}for id in ui{if elements.is_empty(){found.insert((id,None,source.clone()));}else{for e in &elements{found.insert((id.clone(),Some(e.clone()),source.clone()));}}}}found.into_iter().map(|(ui_id,element_id,source)|UiRef{ui_id,element_id,source,confidence:"heuristic"}).collect()}
fn inspect(root:&Path,id:&str,data_version:&str)->LocalMap{let mut scenes=Vec::new();if let Ok(entries)=fs::read_dir(root.join("scenetree").join("scene")){for entry in entries.flatten(){if entry.file_type().map(|k|k.is_file()&&!k.is_symlink()).unwrap_or(false){if let Some(name)=entry.file_name().to_str(){scenes.push(name.into())}}}}scenes.sort();let game_version=version(&printable(&root.join("wdesc.fb")));let manifest=root.join("mods").join("miniworld").join("pluginPack").join("pack_manifest.json");let plugin_api_version=text(&manifest).and_then(|body|Regex::new(r#"(?i)[\"']api_version[\"']\s*:\s*[\"']([^\"']+)"#).unwrap().captures(&body).and_then(|c|c.get(1)).map(|m|m.as_str().into()));let mut paths=Vec::new();let custom=root.join("customui");if custom.is_dir(){files(&custom,&mut paths,0)}let refs=ui_refs(&paths,root);let mut warnings=Vec::new();if paths.is_empty(){warnings.push("Este mapa no contiene archivos en customui; no hay IDs de interfaz que indexar.".into())}else if refs.is_empty(){warnings.push("Los archivos de interfaz no exponen IDs en texto reconocido.".into())}LocalMap{map_id:id.into(),data_version:data_version.into(),scene_names:scenes,game_version,plugin_api_version,custom_ui_files:paths.len(),ui_references:refs,warnings}}

#[tauri::command]
pub fn scan_miniworld_maps()->Result<LocalMapScan,String>{let appdata=env::var_os("APPDATA").map(PathBuf::from).ok_or("Windows no proporcionó APPDATA.")?;let(mut roots,mut maps)=(Vec::new(),Vec::new());for(data_version,relative)in ROOTS{let root=appdata.join(relative);let mut count=0;let mut warning=None;if root.is_dir(){match fs::read_dir(&root){Ok(entries)=>for entry in entries.flatten(){let Ok(kind)=entry.file_type()else{continue};if !kind.is_dir()||kind.is_symlink(){continue}let name=entry.file_name();let Some(name)=name.to_str()else{continue};let Some(id)=map_id(name)else{continue};maps.push(inspect(&entry.path(),id,data_version));count+=1},Err(e)=>warning=Some(format!("No se pudo leer: {e}"))}}roots.push(ScanRoot{data_version:data_version.into(),available:root.is_dir(),map_count:count,warning})}maps.sort_by(|a,b|a.map_id.cmp(&b.map_id));Ok(LocalMapScan{roots,maps,privacy:"Escaneo local, manual y de solo lectura. No se suben mapas, rutas ni IDs."})}

#[cfg(test)] mod tests{use super::*;#[test]fn strict_map_names(){assert_eq!(map_id("w1"),Some("1"));assert_eq!(map_id("www"),None);assert_eq!(map_id("W12"),None);assert_eq!(map_id("w12x"),None)}}
