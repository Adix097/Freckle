import { useState } from "react";
import { useLibrary } from "../library";
import type { Song } from "../types";
import { Cover } from "./SongRow";
import { PlusIcon } from "./icons";

function NewForm({ song }: { song: Song | null }) {
  const { createPlaylist, closeSheet } = useLibrary();
  const [name, setName] = useState("");
  const submit = () => {
    createPlaylist(name.trim() || "New playlist", song);
    closeSheet();
  };
  return (
    <>
      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
        New playlist
      </h2>
      <input
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") closeSheet();
        }}
        placeholder="Playlist name"
        className="mb-4 w-full rounded-xl border border-slate bg-ink px-3 py-2.5 outline-none focus:border-ash"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="rounded-full bg-bone px-5 py-2 font-bold text-ink"
        >
          Create
        </button>
        <button
          onClick={closeSheet}
          className="rounded-full border border-slate px-5 py-2 text-ash"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

export default function Overlay() {
  const { sheet, closeSheet, playlists, addTo, openNew, toast } = useLibrary();
  return (
    <>
      {sheet && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70"
          onClick={(e) => e.target === e.currentTarget && closeSheet()}
        >
          <div className="max-h-[80vh] w-95 overflow-y-auto rounded-3xl bg-graphite p-5">
            {sheet.kind === "new" ? (
              <NewForm song={sheet.song} />
            ) : (
              <>
                <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
                  Add to playlist
                </h2>
                {playlists.map((p) => {
                  const has = p.songs.some((s) => s.id === sheet.song!.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        addTo(p.id, sheet.song!);
                        closeSheet();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate"
                    >
                      <Cover
                        src={p.songs[0]?.cover ?? null}
                        className="size-9 rounded-md"
                      />
                      <span className="flex-1 truncate text-sm">{p.name}</span>
                      {has && <span className="text-xs text-smoke">Added</span>}
                    </button>
                  );
                })}
                <button
                  onClick={() => openNew(sheet.song)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate"
                >
                  <span className="grid size-9 place-items-center rounded-md border border-dashed border-smoke">
                    <PlusIcon className="size-4" />
                  </span>
                  <span className="text-sm">New playlist</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-16 z-60 -translate-x-1/2 rounded-full bg-bone px-5 py-2 text-sm font-bold text-ink"
        >
          {toast}
        </div>
      )}
    </>
  );
}
