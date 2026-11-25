use reqwest::Client;
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Serialize)]
pub struct Song {
    id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<u32>,
    cover: Option<String>,
}

fn walk<'a>(v: &'a Value, out: &mut Vec<&'a Value>) {
    match v {
        Value::Object(m) => {
            for (k, x) in m {
                if k == "musicResponsiveListItemRenderer" {
                    out.push(x);
                } else {
                    walk(x, out);
                }
            }
        }
        Value::Array(a) => a.iter().for_each(|x| walk(x, out)),
        _ => {}
    }
}

fn column(item: &Value, col: usize) -> String {
    item.pointer(&format!(
        "/flexColumns/{col}/musicResponsiveListItemFlexColumnRenderer/text/runs"
    ))
    .and_then(|r| r.as_array())
    .map(|r| r.iter().filter_map(|x| x["text"].as_str()).collect::<String>())
    .unwrap_or_default()
}

fn secs(s: &str) -> Option<u32> {
    let mut t = 0;
    for p in s.split(':') {
        t = t * 60 + p.trim().parse::<u32>().ok()?;
    }
    Some(t)
}

fn parse(item: &Value) -> Option<Song> {
    let id = item.pointer("/playlistItemData/videoId")?.as_str()?.to_string();
    let title = column(item, 0);
    if title.is_empty() {
        return None;
    }
    let meta = column(item, 1);
    let parts: Vec<&str> = meta.split(" • ").collect();
    let artist = parts.first()?.to_string();
    let album = if parts.len() >= 3 { Some(parts[1].to_string()) } else { None };
    let duration = parts.last().and_then(|d| secs(d));
    let cover = item
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|t| t.as_array())
        .and_then(|t| t.last())
        .and_then(|t| t["url"].as_str())
        .map(|u| {
            if u.contains("googleusercontent.com") || u.contains("ggpht.com") {
                match u.rfind('=') {
                    Some(i) => format!("{}=w300-h300-l90-rj", &u[..i]),
                    None => u.to_string(),
                }
            } else {
                u.to_string()
            }
        });
    Some(Song { id, title, artist, album, duration, cover })
}

#[tauri::command]
pub async fn search_songs(query: String) -> Result<Vec<Song>, String> {
    let body = json!({
        "context": {"client": {
            "clientName": "WEB_REMIX",
            "clientVersion": "1.20251110.03.00",
            "hl": "en", "gl": "US"
        }},
        "query": query,
        "params": "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"
    });
    let res: Value = Client::new()
        .post("https://music.youtube.com/youtubei/v1/search?prettyPrint=false")
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
        .map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    walk(&res, &mut items);
    Ok(items.into_iter().filter_map(parse).collect())
}