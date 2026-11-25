mod db;
mod yt;
mod ytm;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(db::open(dir.join("freckle.db"))?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            yt::search,
            yt::resolve,
            ytm::search_songs,
            db::library_get,
            db::toggle_like,
            db::create_playlist,
            db::add_to_playlist,
            db::remove_from_playlist,
            db::delete_playlist
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}