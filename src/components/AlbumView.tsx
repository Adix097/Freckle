import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Release, Song } from "../types";
import { usePlayer } from "../store";
import SongRow, { Cover } from "./SongRow";

type Props = { release: Release; onBack: () => void };

export default function AlbumView({ release, onBack }: Props) {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { queue, index, play } = usePlayer();
  const current = queue[index]?.id;

  useEffect(() => {
    let on = true;
    setSongs(null);
    setErr(null);
    invoke<Song[]>("album_tracks", {
      browseId: release.browseId,
      album: release.title,
      artist: release.artist,
      cover: release.cover,
    })
      .then((s) => on && setSongs(s))
      .catch((e) => on && setErr(String(e)));
    return () => {
      on = false;
    };
  }, [release.browseId]);

  return (
    <div className="pt-4">
      <button
        onClick={onBack}
        className="mb-3 text-sm text-smoke hover:text-bone"
      >
        ‹ Back
      </button>
      <div className="mb-5 flex items-end gap-5">
        <Cover src={release.cover} className="size-40 rounded-2xl" />
        <div className="min-w-0">
          <div className="text-xs text-smoke">{release.kind}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {release.title}
          </h1>
          <div className="text-sm text-smoke">
            {release.artist}
            {songs ? ` · ${songs.length} songs` : ""}
          </div>
          {songs && songs.length > 0 && (
            <button
              className="mt-3 rounded-full bg-bone px-6 py-2 font-bold text-ink"
              onClick={() => play(songs[0], songs)}
            >
              Play
            </button>
          )}
        </div>
      </div>
      {err && <p className="wrap-break-word text-smoke">{err}</p>}
      {!songs && !err && <p className="text-smoke">Loading…</p>}
      {songs?.length === 0 && (
        <p className="text-smoke">No playable tracks found.</p>
      )}
      {songs?.map((s) => (
        <SongRow
          key={s.id}
          song={s}
          actions
          active={s.id === current}
          onClick={() => play(s, songs)}
        />
      ))}
    </div>
  );
}
