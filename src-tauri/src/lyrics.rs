use crate::db::Db;
use reqwest::Client;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct Line {
    t: f64,
    text: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Lyrics {
    synced: Option<Vec<Line>>,
    plain: Option<String>,
}

fn parse_lrc(s: &str) -> Vec<Line> {
    let mut out = Vec::new();
    for l in s.lines() {
        let mut rest = l.trim();
        let mut times = Vec::new();
        while rest.starts_with('[') {
            let Some(end) = rest.find(']') else { break };
            if let Some((m, sec)) = rest[1..end].split_once(':') {
                if let (Ok(m), Ok(sec)) = (m.parse::<f64>(), sec.parse::<f64>()) {
                    times.push(m * 60.0 + sec);
                }
            }
            rest = rest[end + 1..].trim_start();
        }
        for t in times {
            out.push(Line { t, text: rest.trim().to_string() });
        }
    }
    out.sort_by(|a, b| a.t.partial_cmp(&b.t).unwrap());
    out
}

fn clean(t: &str) -> String {
    let mut out = String::new();
    let mut depth = 0;
    for c in t.chars() {
        match c {
            '(' | '[' => depth += 1,
            ')' | ']' => {
                if depth > 0 {
                    depth -= 1;
                }
            }
            _ => {
                if depth == 0 {
                    out.push(c);
                }
            }
        }
    }
    let out = out.split(" - ").next().unwrap_or("").trim().to_string();
    if out.is_empty() {
        t.trim().to_string()
    } else {
        out
    }
}

fn to_lyrics(v: &Value) -> Option<Lyrics> {
    let synced = v["syncedLyrics"]
        .as_str()
        .map(parse_lrc)
        .filter(|l| !l.is_empty());
    let plain = v["plainLyrics"]
        .as_str()
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty());
    if synced.is_none() && plain.is_none() {
        None
    } else {
        Some(Lyrics { synced, plain })
    }
}

fn pick(arr: &[Value], dur: f64) -> Option<&Value> {
    arr.iter()
        .filter(|v| {
            !v["instrumental"].as_bool().unwrap_or(false)
                && (v["syncedLyrics"].is_string() || v["plainLyrics"].is_string())
        })
        .map(|v| {
            let d = v["duration"].as_f64().unwrap_or(0.0);
            let diff = if dur > 0.0 { (d - dur).abs() } else { 0.0 };
            let penalty = if v["syncedLyrics"].is_string() { 0.0 } else { 3.0 };
            (diff + penalty, diff, v)
        })
        .filter(|x| x.1 <= 6.0)
        .min_by(|a, b| a.0.partial_cmp(&b.0).unwrap())
        .map(|x| x.2)
}

async fn get_json(c: &Client, url: &str, q: &[(&str, String)]) -> Option<Value> {
    let u = reqwest::Url::parse_with_params(url, q).ok()?;
    let r = c.get(u).send().await.ok()?;
    if !r.status().is_success() {
        return None;
    }
    r.json().await.ok()
}

#[tauri::command]
pub async fn get_lyrics(
    db: State<'_, Db>,
    id: String,
    title: String,
    artist: String,
    duration: Option<f64>,
) -> Result<Option<Lyrics>, String> {
    {
        let c = db.0.lock().unwrap();
        c.execute(
            "CREATE TABLE IF NOT EXISTS lyrics(song_id TEXT PRIMARY KEY, data TEXT NOT NULL)",
            [],
        )
        .map_err(|e| e.to_string())?;
        let hit: Option<String> = c
            .query_row("SELECT data FROM lyrics WHERE song_id=?1", params![id], |r| r.get(0))
            .ok();
        if let Some(s) = hit {
            if let Ok(l) = serde_json::from_str::<Lyrics>(&s) {
                return Ok(Some(l));
            }
        }
    }

    let client = Client::builder()
        .user_agent("Freckle/0.1 (personal project)")
        .build()
        .map_err(|e| e.to_string())?;
    let t = clean(&title);
    let a = artist.split([',', '&']).next().unwrap_or("").trim().to_string();
    let dur = duration.unwrap_or(0.0);

    let mut exact = vec![("track_name", t.clone()), ("artist_name", a.clone())];
    if dur > 0.0 {
        exact.push(("duration", dur.round().to_string()));
    }
    let mut found = None;
    if let Some(v) = get_json(&client, "https://lrclib.net/api/get", &exact).await {
        found = to_lyrics(&v);
    }
    if found.is_none() {
        let searches = [
            vec![("track_name", t.clone()), ("artist_name", a.clone())],
            vec![("q", format!("{t} {a}"))],
        ];
        for q in &searches {
            if let Some(Value::Array(arr)) = get_json(&client, "https://lrclib.net/api/search", q).await {
                if let Some(v) = pick(&arr, dur) {
                    found = to_lyrics(v);
                }
            }
            if found.is_some() {
                break;
            }
        }
    }

    if let Some(l) = &found {
        let c = db.0.lock().unwrap();
        if let Ok(js) = serde_json::to_string(l) {
            let _ = c.execute(
                "INSERT OR REPLACE INTO lyrics(song_id,data) VALUES(?1,?2)",
                params![id, js],
            );
        }
    }
    Ok(found)
}