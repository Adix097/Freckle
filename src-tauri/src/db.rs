use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

pub struct Db(pub Mutex<Connection>);

#[derive(Serialize, Deserialize)]
pub struct Song {
    id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<u32>,
    cover: Option<String>,
}

#[derive(Serialize)]
pub struct Playlist {
    id: i64,
    name: String,
    songs: Vec<Song>,
}

#[derive(Serialize)]
pub struct Library {
    liked: Vec<Song>,
    playlists: Vec<Playlist>,
}

pub fn open(path: std::path::PathBuf) -> rusqlite::Result<Db> {
    let c = Connection::open(path)?;
    c.execute_batch(
        "PRAGMA foreign_keys=ON;
         CREATE TABLE IF NOT EXISTS songs(
           id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL,
           album TEXT, duration INTEGER, cover TEXT);
         CREATE TABLE IF NOT EXISTS likes(
           song_id TEXT PRIMARY KEY REFERENCES songs(id),
           at INTEGER NOT NULL DEFAULT (strftime('%s','now')));
         CREATE TABLE IF NOT EXISTS playlists(
           id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS playlist_songs(
           playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
           song_id TEXT NOT NULL REFERENCES songs(id),
           pos INTEGER NOT NULL,
           PRIMARY KEY(playlist_id, song_id));
         CREATE TABLE IF NOT EXISTS history(
           song_id TEXT PRIMARY KEY REFERENCES songs(id), at INTEGER NOT NULL);",
    )?;
    Ok(Db(Mutex::new(c)))
}

fn upsert(c: &Connection, s: &Song) -> rusqlite::Result<()> {
    c.execute(
        "INSERT INTO songs(id,title,artist,album,duration,cover) VALUES(?1,?2,?3,?4,?5,?6)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist,
           album=excluded.album, duration=excluded.duration, cover=excluded.cover",
        params![s.id, s.title, s.artist, s.album, s.duration, s.cover],
    )?;
    Ok(())
}

fn row(r: &rusqlite::Row) -> rusqlite::Result<Song> {
    Ok(Song {
        id: r.get(0)?,
        title: r.get(1)?,
        artist: r.get(2)?,
        album: r.get(3)?,
        duration: r.get(4)?,
        cover: r.get(5)?,
    })
}

const COLS: &str = "s.id,s.title,s.artist,s.album,s.duration,s.cover";

#[tauri::command]
pub fn library_get(db: State<Db>) -> Result<Library, String> {
    let c = db.0.lock().unwrap();
    (|| -> rusqlite::Result<Library> {
        let mut st = c.prepare(&format!(
            "SELECT {COLS} FROM likes l JOIN songs s ON s.id=l.song_id ORDER BY l.at DESC, l.rowid DESC"
        ))?;
        let liked = st.query_map([], row)?.collect::<Result<Vec<_>, _>>()?;
        let mut pst = c.prepare("SELECT id,name FROM playlists ORDER BY id")?;
        let heads = pst
            .query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        let mut sst = c.prepare(&format!(
            "SELECT {COLS} FROM playlist_songs p JOIN songs s ON s.id=p.song_id WHERE p.playlist_id=?1 ORDER BY p.pos"
        ))?;
        let mut playlists = Vec::new();
        for (id, name) in heads {
            let songs = sst.query_map(params![id], row)?.collect::<Result<Vec<_>, _>>()?;
            playlists.push(Playlist { id, name, songs });
        }
        Ok(Library { liked, playlists })
    })()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_like(db: State<Db>, song: Song) -> Result<bool, String> {
    let c = db.0.lock().unwrap();
    (|| -> rusqlite::Result<bool> {
        upsert(&c, &song)?;
        let n = c.execute("DELETE FROM likes WHERE song_id=?1", params![song.id])?;
        if n == 0 {
            c.execute("INSERT INTO likes(song_id) VALUES(?1)", params![song.id])?;
            Ok(true)
        } else {
            Ok(false)
        }
    })()
    .map_err(|e| e.to_string())
}

fn add(c: &Connection, pid: i64, song: &Song) -> rusqlite::Result<()> {
    upsert(c, song)?;
    c.execute(
        "INSERT OR IGNORE INTO playlist_songs(playlist_id,song_id,pos)
         SELECT ?1, ?2, COALESCE(MAX(pos),-1)+1 FROM playlist_songs WHERE playlist_id=?1",
        params![pid, song.id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn create_playlist(db: State<Db>, name: String, song: Option<Song>) -> Result<i64, String> {
    let c = db.0.lock().unwrap();
    (|| -> rusqlite::Result<i64> {
        c.execute("INSERT INTO playlists(name) VALUES(?1)", params![name])?;
        let id = c.last_insert_rowid();
        if let Some(s) = song {
            add(&c, id, &s)?;
        }
        Ok(id)
    })()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_to_playlist(db: State<Db>, playlist_id: i64, song: Song) -> Result<(), String> {
    let c = db.0.lock().unwrap();
    add(&c, playlist_id, &song).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_from_playlist(db: State<Db>, playlist_id: i64, song_id: String) -> Result<(), String> {
    let c = db.0.lock().unwrap();
    c.execute(
        "DELETE FROM playlist_songs WHERE playlist_id=?1 AND song_id=?2",
        params![playlist_id, song_id],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_playlist(db: State<Db>, id: i64) -> Result<(), String> {
    let c = db.0.lock().unwrap();
    c.execute("DELETE FROM playlists WHERE id=?1", params![id])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn history_add(db: State<Db>, song: Song) -> Result<(), String> {
    let c = db.0.lock().unwrap();
    (|| -> rusqlite::Result<()> {
        upsert(&c, &song)?;
        c.execute(
            "INSERT INTO history(song_id,at) VALUES(?1,strftime('%s','now'))
             ON CONFLICT(song_id) DO UPDATE SET at=excluded.at",
            params![song.id],
        )?;
        Ok(())
    })()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn history_get(db: State<Db>, limit: u32) -> Result<Vec<Song>, String> {
    let c = db.0.lock().unwrap();
    (|| -> rusqlite::Result<Vec<Song>> {
        let mut st = c.prepare(&format!(
            "SELECT {COLS} FROM history h JOIN songs s ON s.id=h.song_id
             ORDER BY h.at DESC, h.rowid DESC LIMIT ?1"
        ))?;
        let v = st.query_map(params![limit], row)?.collect::<Result<Vec<_>, _>>()?;
        Ok(v)
    })()
    .map_err(|e| e.to_string())
}