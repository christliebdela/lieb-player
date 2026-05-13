#[tauri::command]
async fn generate_thumbnail(path: String, time: f64) -> Result<String, String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;

    let temp_dir = std::env::temp_dir();
    let thumb_name = format!("lieb_thumb_{}", (time * 10.0) as u64);
    let thumb_path = temp_dir.join(format!("{}.jpg", thumb_name));

    if thumb_path.exists() {
        return Ok(thumb_path.to_str().unwrap().to_string());
    }

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
                Ok(vec![json])
            }
        },
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn get_media_formats(url: String) -> Result<Vec<serde_json::Value>, String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;

    let output = Command::new("yt-dlp")
        .args(&[
            "-J",
            "--no-playlist",
            &url,
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let json: serde_json::Value = serde_json::from_slice(&out.stdout)
                .map_err(|e| e.to_string())?;
            
            if let Some(formats) = json.get("formats").and_then(|f| f.as_array()) {
                Ok(formats.clone())
            } else {
                Ok(vec![])
            }
        },
        Ok(out) => Err(String::from_utf8_lossy(&out.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn download_media(app: tauri::AppHandle, url: String, save_path: String, format_id: Option<String>) -> Result<(), String> {
    use std::process::{Command, Stdio};
    use std::io::{BufReader, BufRead};
    use std::os::windows::process::CommandExt;
    use tauri::Emitter;

    std::thread::spawn(move || {
        let mut args = vec![
            "-o".to_string(), 
            save_path.clone(),
            "--newline".to_string(),
            "--progress".to_string(),
        ];

        if let Some(fid) = format_id {
            args.push("-f".to_string());
            // If it's just a format id, we should usually append +bestaudio to ensure we get sound
            // especially for high-res youtube videos which are video-only by default.
            if fid.chars().all(|c| c.is_numeric()) {
                args.push(format!("{}+bestaudio/best", fid));
            } else {
                args.push(fid);
            }
        }

        args.push(url.clone());

        let output = Command::new("yt-dlp")
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();

        match output {
            Ok(mut child) => {
                let stdout = child.stdout.take().unwrap();
                let reader = BufReader::new(stdout);

                for line in reader.lines() {
                    if let Ok(line) = line {
                        // [download]  10.0% of 100.00MiB
                        if line.contains("[download]") && line.contains("%") {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            for part in parts {
                                if part.contains("%") {
                                    let progress = part.replace("%", "");
                                    let _ = app.emit("download-progress", serde_json::json!({
                                        "url": url,
                                        "progress": progress
                                    }));
                                    break;
                                }
                            }
                        }
                    }
                }

                let status = child.wait();
                match status {
                    Ok(s) if s.success() => {
                        let _ = app.emit("download-complete", serde_json::json!({ "url": url, "path": save_path }));
                    }
                    _ => {
                        let _ = app.emit("download-error", serde_json::json!({ "url": url, "error": "Process failed" }));
                    }
                }
            }
            Err(e) => {
                let _ = app.emit("download-error", serde_json::json!({ "url": url, "error": e.to_string() }));
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn write_log(_app: tauri::AppHandle, _message: String) -> Result<(), String> {
    /*
    use std::fs::OpenOptions;
    use std::io::Write;
    use tauri::Manager;
    use tauri::path::BaseDirectory;

    let desktop_path = app.path().resolve("lieb-player.log", BaseDirectory::Desktop)
        .map_err(|e| e.to_string())?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(desktop_path)
        .map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    writeln!(file, "[{}] {}", timestamp, message).map_err(|e| e.to_string())?;
    */

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Emitter;
    
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init());

    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
            if args.len() > 1 {
                let _ = app.emit("open-file", args[1].clone());
            }
        }));
    }
    
    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_mpv::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = args[1].clone();
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                    let _ = handle.emit("open-file", file_path);
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![generate_thumbnail, fetch_playlist_info, write_log, download_media, get_media_formats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
