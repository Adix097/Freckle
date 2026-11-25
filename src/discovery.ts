import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Release, Song } from "./types";

type Disc = {
  releases: Release[];
  recent: Song[];
  loadingReleases: boolean;
  releasesError: string | null;
  loadReleases: () => Promise<void>;
  loadRecent: () => Promise<void>;
};

export const useDiscovery = create<Disc>((set, get) => ({
  releases: [],
  recent: [],
  loadingReleases: false,
  releasesError: null,
  loadReleases: async () => {
    if (get().releases.length) return;
    set({ loadingReleases: true, releasesError: null });
    try {
      set({
        releases: await invoke<Release[]>("new_releases"),
        loadingReleases: false,
      });
    } catch (e) {
      set({ loadingReleases: false, releasesError: String(e) });
    }
  },
  loadRecent: async () => {
    try {
      set({ recent: await invoke<Song[]>("history_get", { limit: 12 }) });
    } catch {
      // ignore
    }
  },
}));
