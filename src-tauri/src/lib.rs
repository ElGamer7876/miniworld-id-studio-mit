mod map_index;
mod game_data;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![map_index::scan_miniworld_maps, game_data::scan_miniworld_game_data])
        .run(tauri::generate_context!())
        .expect("error al ejecutar Mini World ID Studio");
}
