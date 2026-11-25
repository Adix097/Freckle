import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePlayer } from "../store";
import type { Lyrics } from "../types";

const cache = new Map<string, Lyrics | null>();

export default function LyricsPanel() {
  const song = usePlayer((s) => s.queue[s.index]);
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const [lyr, setLyr] = useState<Lyrics | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!song) return;
    setErr(null);
    if (cache.has(song.id)) {
      setLyr(cache.get(song.id) ?? null);
      return;
    }
    setLyr(undefined);
    let on = true;
    invoke<Lyrics | null>("get_lyrics", {
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
    })
      .then((l) => {
        cache.set(song.id, l);
        if (on) setLyr(l);
      })
      .catch((e) => on && setErr(String(e)));
    return () => {
      on = false;
    };
  }, [song?.id]);

  const synced = lyr?.synced ?? null;
  let idx = -1;
  if (synced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].t <= time + 0.25) idx = i;
      else break;
    }
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [idx, song?.id]);

  if (!song)
    return (
      <p className="p-3 text-sm text-smoke">Play a song to see its lyrics.</p>
    );
  if (err)
    return <p className="wrap-break-word p-3 text-sm text-smoke">{err}</p>;
  if (lyr === undefined)
    return <p className="p-3 text-sm text-smoke">Searching lyrics…</p>;
  if (lyr === null)
    return (
      <p className="p-3 text-sm text-smoke">No lyrics found for this song.</p>
    );

  if (synced) {
    return (
      <div className="flex flex-col gap-1 px-1 py-16">
        {synced.map((l, i) => (
          <button
            key={i}
            ref={i === idx ? activeRef : undefined}
            onClick={() => duration > 0 && seek(l.t / duration)}
            className={`text-left text-lg font-bold leading-snug transition-colors ${i === idx ? "text-bone" : "text-smoke hover:text-ash"}`}
          >
            {l.text || "♪"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap px-2 py-2 text-sm leading-relaxed text-ash">
      {lyr.plain}
    </p>
  );
}
