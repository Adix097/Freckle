use serde::Serialize;
use tokio::process::Command;

#[derive(Serialize)]
pub struct Track {
    id: String,
    title: String,
    artist: String,
    duration: Option<f64>,
}

async fn ytdlp(args: &[&str]) -> Result<String, String> {
    let out = Command::new("yt-dlp")
        .args(["--js-runtimes", "node", "--no-warnings"])
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).into());
    }
    Ok(String::from_utf8_lossy(&out.stdout).into())
}

#[tauri::command]
pub async fn search(query: String) -> Result<Vec<Track>, String> {
    let s = ytdlp(&[
        "--flat-playlist",
        "--print",
        "%(id)s\t%(title)s\t%(uploader)s\t%(duration)s",
        &format!("ytsearch10:{query}"),
    ])
    .await?;
    
    Ok(s.lines()
        .filter_map(|l| {
            let p: Vec<&str> = l.split('\t').collect();
            if p.len() < 4 {
                return None;
            }
            Some(Track {
                id: p[0].into(),
                title: p[1].into(),
                artist: p[2].into(),
                duration: p[3].parse().ok(),
            })
        })
        .collect())
}

#[tauri::command]
pub async fn resolve(id: String) -> Result<String, String> {
    let s = ytdlp(&["-f", "bestaudio", "-g", &format!("https://www.youtube.com/watch?v={id}")]).await?;
    Ok(s.lines().next().unwrap_or("").to_string())
}