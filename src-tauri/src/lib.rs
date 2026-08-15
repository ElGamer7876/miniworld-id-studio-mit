mod map_index;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![map_index::scan_miniworld_maps])
        .run(tauri::generate_context!())
        .expect("error al ejecutar Mini World ID Studio");
}
