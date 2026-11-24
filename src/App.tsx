import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
};

export default function App() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Track[]>([]);
  const [msg, setMsg] = useState("");
  const audio = useRef<HTMLAudioElement>(null);

  const search = async () => {
    setMsg("Searching…");
    try {
      setRes(await invoke<Track[]>("search", { query: q }));
      setMsg("");
    } catch (e) {
      setMsg(String(e));
    }
  };

  const play = async (t: Track) => {
    setMsg(`Resolving ${t.title}…`);
    try {
      const url = await invoke<string>("resolve", { id: t.id });
      if (audio.current) {
        audio.current.src = url;
        await audio.current.play();
      }
      setMsg(`Playing ${t.title}`);
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
        {res.map((t) => (
          <li key={t.id}>
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite"
              onClick={() => play(t)}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-smoke text-sm">{t.artist}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
