import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useDiscovery } from "./discovery";
import type { Song } from "./types";

export type Played = Song & { t: number };

export async function recordMany(list: Played[]): Promise<boolean> {
  const user = useAuth.getState().session?.user.id;
  if (!user || !list.length) return false;
  const latest = new Map<string, Played>();
  for (const s of list) {
    const p = latest.get(s.id);
    if (!p || s.t > p.t) latest.set(s.id, s);
  }
  const rows = [...latest.values()];
  const songs = rows.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    cover: s.cover,
  }));
  const a = await supabase
    .from("songs")
    .upsert(songs, { onConflict: "id", ignoreDuplicates: true });
  if (a.error) return false;
  const b = await supabase.from("history").upsert(
    rows.map((s) => ({
      user_id: user,
      song_id: s.id,
      played_at: new Date(s.t).toISOString(),
    })),
    { onConflict: "user_id,song_id" },
  );
  if (b.error) return false;
  await useDiscovery.getState().loadRecent();
  return true;
}
