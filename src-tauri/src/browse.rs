use reqwest::Client;
use serde::Serialize;
use serde_json::{json, Value};
use std::collections::HashSet;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    browse_id: String,
    title: String,
    artist: String,
    kind: String,
    cover: Option<String>,
}

#[derive(Serialize)]
pub struct Song {
    id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<u32>,
    cover: Option<String>,
}

async fn browse(id: &str) -> Result<Value, String> {
    let body = json!({
        "context": {"client": {
            "clientName": "WEB_REMIX",
            "clientVersion": "1.20251110.03.00",
            "hl": "en", "gl": "IN"
        }},
        "browseId": id
    });
    Client::new()
        .post("https://music.youtube.com/youtubei/v1/browse?prettyPrint=false")
        .header("Origin", "https://music.youtube.com")
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

fn walk<'a>(v: &'a Value, key: &str, out: &mut Vec<&'a Value>) {
    match v {
        Value::Object(m) => {
            for (k, x) in m {
                if k == key {
                    out.push(x);
                } else {
                    walk(x, key, out);
                }
            }
        }
        Value::Array(a) => a.iter().for_each(|x| walk(x, key, out)),
        _ => {}
    }
}

fn runs(v: &Value) -> String {
    v.as_array()
        .map(|r| r.iter().filter_map(|x| x["text"].as_str()).collect::<String>())
        .unwrap_or_default()
}

fn col(item: &Value, i: usize) -> String {
    runs(
        item.pointer(&format!("/flexColumns/{i}/musicResponsiveListItemFlexColumnRenderer/text/runs"))
            .unwrap_or(&Value::Null),
    )
}

fn secs(s: &str) -> Option<u32> {
    let mut t = 0;
    for p in s.split(':') {
        t = t * 60 + p.trim().parse::<u32>().ok()?;
    }
    Some(t)
}

fn big(u: &str) -> String {
    if u.contains("googleusercontent.com") || u.contains("ggpht.com") {
        if let Some(i) = u.rfind('=') {
            return format!("{}=w400-h400-l90-rj", &u[..i]);
        }
    }
    u.to_string()
}

#[tauri::command]
pub async fn new_releases() -> Result<Vec<Release>, String> {
    let res = browse("FEmusic_new_releases_albums").await?;
    let mut items = Vec::new();
    walk(&res, "musicTwoRowItemRenderer", &mut items);
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for it in items {
        let id = match it.pointer("/navigationEndpoint/browseEndpoint/browseId").and_then(|x| x.as_str()) {
            Some(x) if x.starts_with("MPRE") => x,
            _ => continue,
        };
        if !seen.insert(id.to_string()) {
            continue;
        }
        let sub = runs(&it["subtitle"]["runs"]);
        let parts: Vec<&str> = sub.split(" • ").collect();
        let cover = it
            .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|t| t.as_array())
            .and_then(|t| t.last())
            .and_then(|t| t["url"].as_str())
            .map(big);
        out.push(Release {
            browse_id: id.to_string(),
            title: runs(&it["title"]["runs"]),
            artist: if parts.len() > 1 { parts[1..].join(" • ") } else { String::new() },
            kind: parts[0].to_string(),
            cover,
        });
        if out.len() >= 18 {
            break;
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn album_tracks(
    browse_id: String,
    album: String,
    artist: String,
    cover: Option<String>,
) -> Result<Vec<Song>, String> {
    let res = browse(&browse_id).await?;
    let mut items = Vec::new();
    walk(&res, "musicResponsiveListItemRenderer", &mut items);
    let mut out = Vec::new();
    for it in items {
        let id = match it.pointer("/playlistItemData/videoId").and_then(|x| x.as_str()) {
            Some(x) => x.to_string(),
            None => continue,
        };
        let title = col(it, 0);
        if title.is_empty() {
            continue;
        }
        let a = col(it, 1);
        let duration = it
            .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs")
            .and_then(|r| r.as_array())
            .and_then(|r| r.first())
            .and_then(|r| r["text"].as_str())
            .and_then(secs);
        out.push(Song {
            id,
            title,
            artist: if a.is_empty() { artist.clone() } else { a },
            album: Some(album.clone()),
            duration,
            cover: cover.clone(),
        });
    }
    Ok(out)
}