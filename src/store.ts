import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Song } from "./types";
import { useDiscovery } from "./discovery";

const audio = new Audio();
audio.volume = 0.7;
let token = 0;

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
};

export const usePlayer = create<Player>((set, get) => {
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
    queue: [],
    index: 0,
    playing: false,
    loading: false,
    error: null,
    time: 0,
    duration: 0,
    volume: 0.7,
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
      if (audio.currentTime > 3 || index === 0) {
        audio.currentTime = 0;
      } else {
        load(index - 1);
      }
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
  };
});

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
