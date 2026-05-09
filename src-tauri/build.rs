fn main() {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/IM", "mpv.exe", "/T"])
            .output();
    }
    tauri_build::build()
}
