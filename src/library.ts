import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Song } from "./types";

export type Playlist = { id: number; name: string; songs: Song[] };
type Sheet = { kind: "add" | "new"; song: Song | null } | null;

type Lib = {
  liked: Song[];
  likedIds: Set<string>;
  playlists: Playlist[];
  sheet: Sheet;
  toast: string | null;
  load: () => Promise<void>;
  toggleLike: (s: Song) => Promise<void>;
  createPlaylist: (name: string, s: Song | null) => Promise<void>;
  addTo: (pid: number, s: Song) => Promise<void>;
  removeFrom: (pid: number, songId: string) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  openAdd: (s: Song) => void;
  openNew: (s: Song | null) => void;
  closeSheet: () => void;
};

let timer: number | undefined;

export const useLibrary = create<Lib>((set, get) => {
  const flash = (m: string) => {
    clearTimeout(timer);
    set({ toast: m });
    timer = window.setTimeout(() => set({ toast: null }), 1800);
  };
  const fail = (e: unknown) => flash(String(e));

  return {
    liked: [],
    likedIds: new Set(),
    playlists: [],
    sheet: null,
    toast: null,
    load: async () => {
      try {
        const lib = await invoke<{ liked: Song[]; playlists: Playlist[] }>(
          "library_get",
        );
        set({
          liked: lib.liked,
          likedIds: new Set(lib.liked.map((s) => s.id)),
          playlists: lib.playlists,
        });
      } catch (e) {
        fail(e);
      }
    },
    toggleLike: async (song) => {
      try {
        const on = await invoke<boolean>("toggle_like", { song });
        await get().load();
        flash(on ? "Saved to Liked Songs" : "Removed from Liked Songs");
      } catch (e) {
        fail(e);
      }
    },
    createPlaylist: async (name, song) => {
      try {
        await invoke("create_playlist", { name, song });
        await get().load();
        flash(`Created ${name}`);
      } catch (e) {
        fail(e);
      }
    },
    addTo: async (pid, song) => {
      try {
        await invoke("add_to_playlist", { playlistId: pid, song });
        await get().load();
        const p = get().playlists.find((x) => x.id === pid);
        flash(`Added to ${p?.name ?? "playlist"}`);
      } catch (e) {
        fail(e);
      }
    },
    removeFrom: async (pid, songId) => {
      try {
        await invoke("remove_from_playlist", { playlistId: pid, songId });
        await get().load();
      } catch (e) {
        fail(e);
      }
    },
    deletePlaylist: async (id) => {
      try {
        await invoke("delete_playlist", { id });
        await get().load();
      } catch (e) {
        fail(e);
      }
    },
    openAdd: (song) => set({ sheet: { kind: "add", song } }),
    openNew: (song) => set({ sheet: { kind: "new", song } }),
    closeSheet: () => set({ sheet: null }),
  };
});
