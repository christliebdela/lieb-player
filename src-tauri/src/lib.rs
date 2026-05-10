#[tauri::command]
async fn generate_thumbnail(path: String, time: f64) -> Result<String, String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;

    let temp_dir = std::env::temp_dir();
    let thumb_name = format!("lieb_thumb_{}", (time * 10.0) as u64);
    let thumb_path = temp_dir.join(format!("{}.jpg", thumb_name));

    // If it exists, return it immediately (caching)
    if thumb_path.exists() {
        return Ok(thumb_path.to_str().unwrap().to_string());
    }

    // Run MPV in "one-shot" mode to extract a frame
    let output = Command::new("mpv")
        .args(&[
            &path,
            "--no-audio",
            "--vo=image",
            "--frames=1",
            &format!("--start={}", time),
            "--image-format=jpg",
            "--image-jpg-quality=50",
            "--image-out=yes",
            &format!("--screenshot-template={}", thumb_name),
            &format!("--screenshot-directory={}", temp_dir.to_str().unwrap()),
            "--no-config",
            "--osc=no",
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    match output {
        Ok(out) if out.status.success() => Ok(thumb_path.to_str().unwrap().to_string()),
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn fetch_playlist_info(url: String) -> Result<Vec<serde_json::Value>, String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;

    let output = Command::new("yt-dlp")
        .args(&[
            "--flat-playlist",
            "-J",
            "--quiet",
            "--no-warnings",
            &url,
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let json: serde_json::Value = serde_json::from_slice(&out.stdout)
                .map_err(|e| e.to_string())?;
            
            if let Some(entries) = json.get("entries").and_then(|e| e.as_array()) {
                Ok(entries.clone())
            } else {
                // Single video fallback
                Ok(vec![json])
            }
        },
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Emitter;
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_mpv::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
        .invoke_handler(tauri::generate_handler![generate_thumbnail, fetch_playlist_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
