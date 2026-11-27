import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Release, Song } from "./types";

type Disc = {
  releases: Release[];
  recent: Song[];
  loadingReleases: boolean;
  releasesError: string | null;
  loadReleases: () => Promise<void>;
  loadRecent: () => Promise<void>;
  record: (song: Song) => Promise<void>;
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
    const { data, error } = await supabase
      .from("history")
      .select("played_at, songs(*)")
      .order("played_at", { ascending: false })
      .limit(12);
    if (error || !data) return;
    set({
      recent: (data as unknown as { songs: Song | null }[])
        .map((r) => r.songs)
        .filter((s): s is Song => !!s),
    });
  },
  record: async (song) => {
    const id = useAuth.getState().session?.user.id;
    if (!id) return;
    const a = await supabase
      .from("songs")
      .upsert(song, { onConflict: "id", ignoreDuplicates: true });
    if (a.error) return;
    await supabase
      .from("history")
      .upsert(
        { user_id: id, song_id: song.id, played_at: new Date().toISOString() },
        { onConflict: "user_id,song_id" },
      );
    await get().loadRecent();
  },
}));
