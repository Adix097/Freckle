import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  cover: string | null;
};

const fmt = (s: number | null) =>
  s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function App() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Song[]>([]);
  const [msg, setMsg] = useState("");
  const [now, setNow] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  const search = async () => {
    setMsg("Searching…");
    try {
      setRes(await invoke<Song[]>("search_songs", { query: q }));
      setMsg("");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const play = async (s: Song) => {
    setMsg(`Resolving ${s.title}…`);
    try {
      const url = await invoke<string>("resolve", { id: s.id });
      if (audio.current) {
        audio.current.src = url;
        await audio.current.play();
      }
      setNow(s.id);
      setMsg("");
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-sans p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-6">
        Freckle
      </h1>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-graphite rounded-full px-4 py-2 outline-none"
          placeholder="Search songs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button
          className="bg-bone text-ink font-bold rounded-full px-5"
          onClick={search}
        >
          Search
        </button>
      </div>
      <p className="text-smoke text-sm mb-4 wrap-break-word">{msg}</p>
      <audio ref={audio} controls className="w-full mb-6" />
      <ul>
        {res.map((s) => (
          <li key={s.id}>
            <button
              className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg hover:bg-graphite ${now === s.id ? "bg-graphite" : ""}`}
              onClick={() => play(s)}
            >
              {s.cover ? (
                <img
                  src={s.cover}
                  alt=""
                  className="w-12 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-slate" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-smoke text-sm truncate">
                  {s.artist}
                  {s.album ? ` · ${s.album}` : ""}
                </div>
              </div>
              <span className="text-smoke text-sm">{fmt(s.duration)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
