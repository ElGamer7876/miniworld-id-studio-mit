use regex::Regex;
use serde::Serialize;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
};

const MAX_FILES: usize = 25_000;
const MAX_FILE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 64 * 1024 * 1024;
const MAX_DEPTH: usize = 9;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedSymbol {
    name: String,
    occurrences: usize,
    sources: Vec<String>,
    confidence: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedId {
    id: String,
    label: Option<String>,
    kind: &'static str,
    source: String,
    confidence: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameDataScan {
    display_root: String,
    detected_version: Option<String>,
    files_seen: usize,
    files_read: usize,
    files_skipped: usize,
    bytes_read: u64,
    methods: Vec<ObservedSymbol>,
    events: Vec<ObservedSymbol>,
    ids: Vec<ObservedId>,
    warnings: Vec<String>,
    privacy: &'static str,
}

fn supported_extension(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_ascii_lowercase()
            .as_str(),
        "lua" | "csv" | "json" | "xml" | "txt" | "ini" | "cfg"
    )
}

fn collect_files(root: &Path, out: &mut Vec<PathBuf>, depth: usize) {
    if depth > MAX_DEPTH || out.len() >= MAX_FILES {
        return;
    }
    let Ok(entries) = fs::read_dir(root) else { return };
    for entry in entries.flatten() {
        if out.len() >= MAX_FILES {
            break;
        }
        let Ok(kind) = entry.file_type() else { continue };
        if kind.is_symlink() {
            continue;
        }
        if kind.is_dir() {
            collect_files(&entry.path(), out, depth + 1);
        } else if kind.is_file() {
            out.push(entry.path());
        }
    }
}

fn read_text(path: &Path, remaining: u64) -> Option<(String, u64)> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.file_type().is_file()
        || metadata.len() > MAX_FILE_BYTES
        || metadata.len() > remaining
    {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    if bytes.iter().take(4096).any(|byte| *byte == 0) {
        return None;
    }
    let length = bytes.len() as u64;
    String::from_utf8(bytes).ok().map(|text| (text, length))
}

fn relative(path: &Path, root: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
        .chars()
        .take(240)
        .collect()
}

fn observe(
    values: impl Iterator<Item = String>,
    source: &str,
    target: &mut BTreeMap<String, (usize, BTreeSet<String>)>,
) {
    for value in values {
        let entry = target.entry(value).or_default();
        entry.0 += 1;
        if entry.1.len() < 5 {
            entry.1.insert(source.to_string());
        }
    }
}

fn symbols(values: BTreeMap<String, (usize, BTreeSet<String>)>) -> Vec<ObservedSymbol> {
    let mut output: Vec<_> = values
        .into_iter()
        .map(|(name, (occurrences, sources))| ObservedSymbol {
            name,
            occurrences,
            sources: sources.into_iter().collect(),
            confidence: "observed",
        })
        .collect();
    output.sort_by(|a, b| {
        b.occurrences
            .cmp(&a.occurrences)
            .then_with(|| a.name.cmp(&b.name))
    });
    output
}

fn csv_fields(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut field = String::new();
    let mut quoted = false;
    let mut chars = line.chars().peekable();
    while let Some(character) = chars.next() {
        match character {
            '"' if quoted && chars.peek() == Some(&'"') => {
                field.push('"');
                chars.next();
            }
            '"' => quoted = !quoted,
            ',' if !quoted => {
                fields.push(field.trim().to_string());
                field.clear();
            }
            _ => field.push(character),
        }
    }
    fields.push(field.trim().to_string());
    fields
}

fn ids_from_csv(body: &str, source: &str, output: &mut Vec<ObservedId>) {
    let mut lines = body.lines().filter(|line| !line.trim().is_empty());
    let Some(header_line) = lines.next() else { return };
    let headers: Vec<String> = csv_fields(header_line)
        .into_iter()
        .map(|value| value.to_ascii_lowercase())
        .collect();
    let id_index = headers.iter().position(|header| {
        matches!(
            header.trim_matches(|c: char| !c.is_ascii_alphanumeric()),
            "id" | "itemid" | "blockid" | "actorid" | "skillid" | "statusid" | "uiid"
        )
    });
    let Some(id_index) = id_index else { return };
    let name_index = headers.iter().position(|header| {
        matches!(
            header.trim_matches(|c: char| !c.is_ascii_alphanumeric()),
            "name" | "displayname" | "title" | "label"
        )
    });
    let kind = if source.to_ascii_lowercase().contains("block") {
        "block"
    } else if source.to_ascii_lowercase().contains("actor")
        || source.to_ascii_lowercase().contains("monster")
    {
        "actor"
    } else if source.to_ascii_lowercase().contains("ui") {
        "ui"
    } else if source.to_ascii_lowercase().contains("skill") {
        "skill"
    } else {
        "item"
    };
    for line in lines.take(20_000) {
        if output.len() >= 20_000 {
            break;
        }
        let fields = csv_fields(line);
        let Some(id) = fields.get(id_index).map(|value| value.trim()) else { continue };
        if id.is_empty() || id.len() > 64 || !id.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.')) {
            continue;
        }
        let label = name_index
            .and_then(|index| fields.get(index))
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(|value| value.chars().take(160).collect());
        output.push(ObservedId {
            id: id.to_string(),
            label,
            kind,
            source: source.to_string(),
            confidence: "heuristic",
        });
    }
}

fn detected_version(path: &Path) -> Option<String> {
    let text = path.to_string_lossy();
    let data = Regex::new(r"(?i)miniworddata(\d{1,4})")
        .ok()?
        .captures(&text)
        .and_then(|capture| capture.get(1))
        .map(|value| value.as_str().to_string());
    data.or_else(|| {
        Regex::new(r"(?i)(?:version|data)[_ -]?(\d+(?:\.\d+){1,3})")
            .ok()?
            .captures(&text)
            .and_then(|capture| capture.get(1))
            .map(|value| value.as_str().to_string())
    })
}

#[tauri::command]
pub fn scan_miniworld_game_data(root: String) -> Result<GameDataScan, String> {
    let requested = PathBuf::from(root);
    let root = requested
        .canonicalize()
        .map_err(|_| "La carpeta seleccionada no existe o no es accesible.".to_string())?;
    if !root.is_dir() {
        return Err("Selecciona una carpeta, no un archivo.".into());
    }
    if root.parent().is_none() || root.components().count() < 3 {
        return Err("Por seguridad no se puede analizar una unidad o carpeta demasiado amplia.".into());
    }

    let mut all_files = Vec::new();
    collect_files(&root, &mut all_files, 0);
    let files_seen = all_files.len();
    let mut files_read = 0;
    let mut files_skipped = 0;
    let mut bytes_read = 0;
    let mut methods = BTreeMap::new();
    let mut events = BTreeMap::new();
    let mut ids = Vec::new();
    let method_re = Regex::new(r"\b([A-Z][A-Za-z0-9_]{1,48}:[A-Za-z_][A-Za-z0-9_]{1,64})\s*\(").unwrap();
    let event_re = Regex::new(r#"registerEvent\s*\(\s*(?:\[=*\[|[\"'])([A-Za-z][A-Za-z0-9_.:-]{1,127})"#).unwrap();

    for path in all_files {
        if !supported_extension(&path) {
            files_skipped += 1;
            continue;
        }
        let Some((body, length)) = read_text(&path, MAX_TOTAL_BYTES.saturating_sub(bytes_read)) else {
            files_skipped += 1;
            continue;
        };
        files_read += 1;
        bytes_read += length;
        let source = relative(&path, &root);
        observe(
            method_re.captures_iter(&body).map(|capture| capture[1].to_string()),
            &source,
            &mut methods,
        );
        observe(
            event_re.captures_iter(&body).map(|capture| capture[1].to_string()),
            &source,
            &mut events,
        );
        if path.extension().and_then(|value| value.to_str()).map(|value| value.eq_ignore_ascii_case("csv")).unwrap_or(false) {
            ids_from_csv(&body, &source, &mut ids);
        }
        if bytes_read >= MAX_TOTAL_BYTES {
            break;
        }
    }

    ids.sort_by(|a, b| a.kind.cmp(b.kind).then_with(|| a.id.cmp(&b.id)));
    ids.dedup_by(|a, b| a.kind == b.kind && a.id == b.id);
    let mut warnings = vec![
        "Los símbolos observados no se consideran API oficial hasta contrastarlos con documentación pública.".to_string(),
        "No se copiaron scripts, DLL, recursos, mapas, credenciales ni contenido binario.".to_string(),
    ];
    if files_seen >= MAX_FILES {
        warnings.push(format!("Se alcanzó el límite de {MAX_FILES} archivos."));
    }
    if bytes_read >= MAX_TOTAL_BYTES {
        warnings.push("Se alcanzó el límite de lectura de 64 MB.".into());
    }
    if files_read == 0 {
        warnings.push("No se encontraron archivos de texto compatibles.".into());
    }

    Ok(GameDataScan {
        display_root: root.file_name().and_then(|value| value.to_str()).unwrap_or("Mini World").to_string(),
        detected_version: detected_version(&root),
        files_seen,
        files_read,
        files_skipped,
        bytes_read,
        methods: symbols(methods),
        events: symbols(events),
        ids,
        warnings,
        privacy: "Análisis manual, local y de solo lectura. El informe contiene únicamente nombres técnicos, IDs, conteos y rutas relativas.",
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_symbols_without_code() {
        let method = Regex::new(r"\b([A-Z][A-Za-z0-9_]{1,48}:[A-Za-z_][A-Za-z0-9_]{1,64})\s*\(").unwrap();
        let values: Vec<_> = method
            .captures_iter("World:spawnItem(1,2,3)\nlocal x = Actor:getPosition(id)")
            .map(|capture| capture[1].to_string())
            .collect();
        assert_eq!(values, vec!["World:spawnItem", "Actor:getPosition"]);
    }

    #[test]
    fn parses_quoted_csv_fields() {
        assert_eq!(csv_fields("1001,\"Objeto, especial\",x"), vec!["1001", "Objeto, especial", "x"]);
    }

    #[test]
    fn rejects_binary_extensions() {
        assert!(!supported_extension(Path::new("client.dll")));
        assert!(!supported_extension(Path::new("audio.ogg")));
        assert!(supported_extension(Path::new("itemdef.csv")));
    }
}
