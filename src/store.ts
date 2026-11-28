import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useDiscovery } from "./discovery";
import { recordMany, type Played } from "./history";
import type { Song } from "./types";

const isAndroid = /Android/i.test(navigator.userAgent);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const native = (cmd: string, args?: object) =>
  invoke<any>("plugin:player|call", { cmd, args });

type Player = {
  queue: Song[];
  index: number;
  playing: boolean;
  loading: boolean;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
  play: (song: Song, list?: Song[]) => void;
  jump: (i: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (frac: number) => void;
  setVolume: (v: number) => void;
  stop: () => void;
};

type Set = (p: Partial<Player> | ((s: Player) => Partial<Player>)) => void;
type Get = () => Player;
type Actions = Pick<
  Player,
  "play" | "jump" | "toggle" | "next" | "prev" | "seek" | "setVolume" | "stop"
>;

function desktop(set: Set, get: Get): Actions {
  const audio = new Audio();
  audio.volume = 0.7;
  let token = 0;

  const load = async (i: number) => {
    const song = get().queue[i];
    if (!song) return;
    const mine = ++token;
    set({
      index: i,
      loading: true,
      error: null,
      time: 0,
      duration: song.duration ?? 0,
    });
    try {
      const url = await invoke<string>("resolve", { id: song.id });
      if (mine !== token) return;
      audio.src = url;
      await audio.play();
      set({ loading: false });
      useDiscovery.getState().record(song);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album ?? "",
          artwork: song.cover ? [{ src: song.cover, sizes: "300x300" }] : [],
        });
      }
    } catch (e) {
      if (mine === token) set({ loading: false, error: String(e) });
    }
  };

  audio.addEventListener("timeupdate", () => set({ time: audio.currentTime }));
  audio.addEventListener("durationchange", () => {
    if (isFinite(audio.duration)) set({ duration: audio.duration });
  });
  audio.addEventListener("play", () => set({ playing: true }));
  audio.addEventListener("pause", () => set({ playing: false }));
  audio.addEventListener("ended", () => get().next());

  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => get().toggle());
    ms.setActionHandler("pause", () => get().toggle());
    ms.setActionHandler("nexttrack", () => get().next());
    ms.setActionHandler("previoustrack", () => get().prev());
  }

  return {
    play: (song, list) => {
      const q = list ?? [song];
      set({ queue: q });
      load(
        Math.max(
          0,
          q.findIndex((s) => s.id === song.id),
        ),
      );
    },
    jump: (i) => load(i),
    toggle: () => {
      if (!audio.src) return;
      if (audio.paused) audio.play();
      else audio.pause();
    },
    next: () => {
      const { index, queue } = get();
      if (index + 1 < queue.length) load(index + 1);
      else audio.pause();
    },
    prev: () => {
      const { index } = get();
      if (audio.currentTime > 3 || index === 0) audio.currentTime = 0;
      else load(index - 1);
    },
    seek: (frac) => {
      const d = get().duration || audio.duration || 0;
      audio.currentTime = frac * d;
      set({ time: audio.currentTime });
    },
    setVolume: (v) => {
      audio.volume = v;
      set({ volume: v });
    },
    stop: () => {
      token++;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      set({
        queue: [],
        index: 0,
        playing: false,
        loading: false,
        error: null,
        time: 0,
        duration: 0,
      });
    },
  };
}

function android(set: Set, get: Get): Actions {
  let hold = 0;
  let draining = false;
  const lock = (ms = 800) => {
    hold = Date.now() + ms;
  };
  const fail = (e: unknown) => set({ error: String(e), loading: false });
  const payload = (q: Song[]) =>
    JSON.stringify(
      q.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        cover: s.cover,
      })),
    );

  const poll = async () => {
    if (document.hidden) return;
    try {
      const s = await native("state");
      if (Date.now() < hold || !s.connected || !s.count) return;
      const { queue } = get();
      if (!queue.length) return;
      const index = Math.min(s.index, queue.length - 1);
      set({
        index,
        playing: !!s.playWhenReady && (s.state === 2 || s.state === 3),
        loading: s.state === 2,
        time: s.position / 1000,
        duration:
          s.duration > 0 ? s.duration / 1000 : (queue[index]?.duration ?? 0),
        error: s.error || null,
      });
    } catch {
      /* ignore */
    }
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      const r = await native("peekHistory");
      const list = JSON.parse(r.items) as Played[];
      if (list.length && (await recordMany(list))) {
        await native("ackHistory", { upTo: Math.max(...list.map((x) => x.t)) });
      }
    } catch {
      /* ignore */
    } finally {
      draining = false;
    }
  };

  (async () => {
    try {
      const snap = await native("snapshot");
      const list = JSON.parse(snap.items) as Song[];
      if (list.length) {
        set({
          queue: list,
          index: snap.index,
          time: snap.position / 1000,
          duration: list[snap.index]?.duration ?? 0,
          playing: !!snap.playing,
        });
      }
    } catch {
      /* ignore */
    }
    setInterval(poll, 500);
    setInterval(drain, 2000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        poll();
        drain();
      }
    });
  })();

  return {
    play: (song, list) => {
      const q = list ?? [song];
      const i = Math.max(
        0,
        q.findIndex((s) => s.id === song.id),
      );
      lock();
      set({
        queue: q,
        index: i,
        loading: true,
        error: null,
        time: 0,
        duration: song.duration ?? 0,
        playing: true,
      });
      native("setQueue", {
        items: payload(q),
        index: i,
        play: true,
        position: 0,
      }).catch(fail);
    },
    jump: (i) => {
      lock();
      set((s) => ({
        index: i,
        loading: true,
        error: null,
        time: 0,
        duration: s.queue[i]?.duration ?? 0,
        playing: true,
      }));
      native("jump", { index: i }).catch(fail);
    },
    toggle: () => {
      lock();
      set((s) => ({ playing: !s.playing }));
      native("toggle").catch(fail);
    },
    next: () => {
      lock();
      set((s) => ({
        index: Math.min(s.index + 1, s.queue.length - 1),
        time: 0,
        loading: true,
        playing: true,
      }));
      native("next").catch(fail);
    },
    prev: () => {
      lock();
      set((s) =>
        s.time > 3 || s.index === 0
          ? { time: 0 }
          : { index: s.index - 1, time: 0, loading: true },
      );
      native("prev").catch(fail);
    },
    seek: (frac) => {
      lock();
      const d = get().duration;
      set({ time: frac * d });
      native("seek", { ms: Math.round(frac * d * 1000) }).catch(fail);
    },
    setVolume: (v) => set({ volume: v }),
    stop: () => {
      lock();
      set({
        queue: [],
        index: 0,
        playing: false,
        loading: false,
        error: null,
        time: 0,
        duration: 0,
      });
      native("stop").catch(() => {});
    },
  };
}

export const usePlayer = create<Player>((set, get) => ({
  queue: [],
  index: 0,
  playing: false,
  loading: false,
  error: null,
  time: 0,
  duration: 0,
  volume: 0.7,
  ...(isAndroid ? android(set, get) : desktop(set, get)),
}));

type Search = {
  query: string;
  results: Song[];
  loading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  run: () => Promise<void>;
};

export const useSearch = create<Search>((set, get) => ({
  query: "",
  results: [],
  loading: false,
  error: null,
  setQuery: (query) => set({ query }),
  run: async () => {
    const q = get().query.trim();
    if (!q) return;
    set({ loading: true, error: null });
    try {
      set({
        results: await invoke<Song[]>("search_songs", { query: q }),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },
}));
