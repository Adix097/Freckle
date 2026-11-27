import { create } from "zustand";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { Song } from "./types";

export type Playlist = { id: string; name: string; songs: Song[] };
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
  addTo: (pid: string, s: Song) => Promise<void>;
  removeFrom: (pid: string, songId: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  openAdd: (s: Song) => void;
  openNew: (s: Song | null) => void;
  closeSheet: () => void;
};

const uid = () => {
  const id = useAuth.getState().session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
};

const check = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};

const saveSongs = async (songs: Song[]) => {
  if (!songs.length) return;
  const uniq = [...new Map(songs.map((s) => [s.id, s])).values()];
  check(
    await supabase
      .from("songs")
      .upsert(uniq, { onConflict: "id", ignoreDuplicates: true }),
  );
};

let timer: number | undefined;

export const useLibrary = create<Lib>((set, get) => {
  const flash = (m: string) => {
    clearTimeout(timer);
    set({ toast: m });
    timer = window.setTimeout(() => set({ toast: null }), 1800);
  };
  const fail = (e: unknown) =>
    flash(e instanceof Error ? e.message : String(e));

  return {
    liked: [],
    likedIds: new Set(),
    playlists: [],
    sheet: null,
    toast: null,

    load: async () => {
      try {
        const [l, p, ps] = await Promise.all([
          supabase
            .from("likes")
            .select("created_at, songs(*)")
            .order("created_at", { ascending: false }),
          supabase.from("playlists").select("id, name").order("created_at"),
          supabase
            .from("playlist_songs")
            .select("playlist_id, position, songs(*)")
            .order("position"),
        ]);
        check(l);
        check(p);
        check(ps);
        const liked = (l.data as unknown as { songs: Song | null }[])
          .map((r) => r.songs)
          .filter((s): s is Song => !!s);
        const rows = ps.data as unknown as {
          playlist_id: string;
          songs: Song | null;
        }[];
        const playlists = (p.data ?? []).map((pl) => ({
          id: pl.id as string,
          name: pl.name as string,
          songs: rows
            .filter((r) => r.playlist_id === pl.id)
            .map((r) => r.songs)
            .filter((s): s is Song => !!s),
        }));
        set({ liked, likedIds: new Set(liked.map((s) => s.id)), playlists });
      } catch (e) {
        fail(e);
      }
    },

    toggleLike: async (song) => {
      const was = get().likedIds.has(song.id);
      set((s) => ({
        likedIds: new Set(
          was
            ? [...s.likedIds].filter((x) => x !== song.id)
            : [...s.likedIds, song.id],
        ),
        liked: was
          ? s.liked.filter((x) => x.id !== song.id)
          : [song, ...s.liked],
      }));
      flash(was ? "Removed from Liked Songs" : "Saved to Liked Songs");
      try {
        if (was) {
          check(await supabase.from("likes").delete().eq("song_id", song.id));
        } else {
          await saveSongs([song]);
          check(
            await supabase
              .from("likes")
              .insert({ user_id: uid(), song_id: song.id }),
          );
        }
      } catch (e) {
        fail(e);
        await get().load();
      }
    },

    createPlaylist: async (name, song) => {
      try {
        const r = await supabase
          .from("playlists")
          .insert({ user_id: uid(), name })
          .select("id")
          .single();
        check(r);
        if (song) {
          await saveSongs([song]);
          check(
            await supabase
              .from("playlist_songs")
              .insert({
                playlist_id: r.data!.id,
                song_id: song.id,
                position: 0,
              }),
          );
        }
        await get().load();
        flash(`Created ${name}`);
      } catch (e) {
        fail(e);
      }
    },

    addTo: async (pid, song) => {
      try {
        const pos =
          get().playlists.find((x) => x.id === pid)?.songs.length ?? 0;
        await saveSongs([song]);
        check(
          await supabase
            .from("playlist_songs")
            .upsert(
              { playlist_id: pid, song_id: song.id, position: pos },
              { onConflict: "playlist_id,song_id", ignoreDuplicates: true },
            ),
        );
        await get().load();
        flash(
          `Added to ${get().playlists.find((x) => x.id === pid)?.name ?? "playlist"}`,
        );
      } catch (e) {
        fail(e);
      }
    },

    removeFrom: async (pid, songId) => {
      try {
        check(
          await supabase
            .from("playlist_songs")
            .delete()
            .eq("playlist_id", pid)
            .eq("song_id", songId),
        );
        await get().load();
      } catch (e) {
        fail(e);
      }
    },

    deletePlaylist: async (id) => {
      try {
        check(await supabase.from("playlists").delete().eq("id", id));
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
