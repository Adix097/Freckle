import { useState } from "react";
import { useLibrary } from "../library";
import { usePlayer } from "../store";
import SongRow, { Cover } from "./SongRow";
import { HeartIcon, PlusIcon } from "./icons";

function LikedArt({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-2xl bg-linear-to-br from-bone to-smoke text-ink ${className}`}
    >
      <HeartIcon className="size-1/3" filled />
    </div>
  );
}

function Tile({
  art,
  name,
  count,
  onClick,
}: {
  art: React.ReactNode;
  name: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left">
      {art}
      <div className="mt-2 text-sm font-medium">{name}</div>
      <div className="text-xs text-smoke">{count} songs</div>
    </button>
  );
}

export default function LibraryView() {
  const { liked, playlists, openNew, deletePlaylist, removeFrom } =
    useLibrary();
  const { queue, index, play } = usePlayer();
  const [open, setOpen] = useState<"liked" | number | null>(null);
  const current = queue[index]?.id;

  if (open !== null) {
    const pl = open === "liked" ? null : playlists.find((p) => p.id === open);
    const songs = open === "liked" ? liked : (pl?.songs ?? []);
    const name = open === "liked" ? "Liked Songs" : (pl?.name ?? "Playlist");
    return (
      <div className="pt-4">
        <button
          onClick={() => setOpen(null)}
          className="mb-3 text-sm text-smoke hover:text-bone"
        >
          ‹ Library
        </button>
        <div className="mb-5 flex items-end gap-5">
          {open === "liked" ? (
            <LikedArt className="size-36" />
          ) : (
            <Cover
              src={songs[0]?.cover ?? null}
              className="size-36 rounded-2xl"
            />
          )}
          <div>
            <div className="text-xs text-smoke">Playlist</div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {name}
            </h1>
            <div className="text-sm text-smoke">{songs.length} songs</div>
            <div className="mt-3 flex gap-2">
              {songs.length > 0 && (
                <button
                  className="rounded-full bg-bone px-6 py-2 font-bold text-ink"
                  onClick={() => play(songs[0], songs)}
                >
                  Play
                </button>
              )}
              {pl && (
                <button
                  className="rounded-full border border-slate px-4 py-2 text-sm text-ash hover:text-bone"
                  onClick={() => {
                    if (confirm(`Delete “${pl.name}”?`)) {
                      deletePlaylist(pl.id);
                      setOpen(null);
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
        {songs.length === 0 ? (
          <p className="text-smoke">
            {open === "liked"
              ? "Press the heart on any song to save it here."
              : "No songs yet. Press + on any song to add it."}
          </p>
        ) : (
          songs.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              actions
              active={s.id === current}
              onClick={() => play(s, songs)}
              onRemove={pl ? () => removeFrom(pl.id, s.id) : undefined}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Your library
        </h1>
        <button
          onClick={() => openNew(null)}
          className="ml-auto rounded-full bg-bone px-4 py-1.5 text-sm font-bold text-ink"
        >
          New playlist
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        <Tile
          name="Liked Songs"
          count={liked.length}
          onClick={() => setOpen("liked")}
          art={<LikedArt className="aspect-square w-full" />}
        />
        {playlists.map((p) => (
          <Tile
            key={p.id}
            name={p.name}
            count={p.songs.length}
            onClick={() => setOpen(p.id)}
            art={
              <Cover
                src={p.songs[0]?.cover ?? null}
                className="aspect-square w-full rounded-2xl"
              />
            }
          />
        ))}
        <button onClick={() => openNew(null)} className="text-left">
          <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-smoke text-smoke">
            <PlusIcon />
          </div>
          <div className="mt-2 text-sm font-medium">Create playlist</div>
        </button>
      </div>
    </div>
  );
}
