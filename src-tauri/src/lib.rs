#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Emitter;
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_mpv::init())
        .setup(|app| {
            // Safety: Clean up any zombie MPV processes from previous runs
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let _ = std::process::Command::new("taskkill")
                    .args(&["/F", "/IM", "mpv.exe", "/T"])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .output();
            }

            // Handle file opened via "Open With" or file association
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                // The first arg is the exe path, subsequent args are file paths
                let file_path = args[1].clone();
                let handle = app.handle().clone();
                // Emit the file path to the frontend after a short delay
                // to ensure the webview is ready
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    let _ = handle.emit("open-file", file_path);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
