import { useEffect } from "react";
import { usePlayer, useSearch } from "./store";
import { useDiscovery } from "./discovery";
import type { Release } from "./types";
import SongRow, { Cover } from "./components/SongRow";

export function Home({ onOpen }: { onOpen: (r: Release) => void }) {
  const {
    releases,
    recent,
    loadingReleases,
    releasesError,
    loadReleases,
    loadRecent,
  } = useDiscovery();
  const { queue, index, play } = usePlayer();
  const current = queue[index]?.id;

  useEffect(() => {
    loadReleases();
    loadRecent();
  }, [loadReleases, loadRecent]);

  return (
    <div className="pt-4">
      <h2 className="mb-3 flex items-baseline gap-3 font-display text-lg font-semibold tracking-tight">
        New releases{" "}
        <span className="font-sans text-xs font-normal text-smoke">
          Fresh this week
        </span>
      </h2>
      {loadingReleases && <p className="text-smoke">Loading…</p>}
      {releasesError && (
        <p className="wrap-break-word text-smoke">{releasesError}</p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {releases.map((r) => (
          <button
            key={r.browseId}
            onClick={() => onOpen(r)}
            className="w-44 shrink-0 text-left"
          >
            <div className="relative">
              <Cover
                src={r.cover}
                className="aspect-square w-full rounded-xl"
              />
              <span className="absolute left-2 top-2 rounded-full bg-bone px-2 text-[10px] font-bold text-ink">
                NEW
              </span>
            </div>
            <div className="mt-2 truncate text-sm font-medium">{r.title}</div>
            <div className="truncate text-xs text-smoke">
              {r.artist} · {r.kind}
            </div>
          </button>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-display text-lg font-semibold tracking-tight">
        Recently played
      </h2>
      {recent.length === 0 ? (
        <p className="text-smoke">Songs you play will show up here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4">
          {recent.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              actions
              showTime={false}
              active={s.id === current}
              onClick={() => play(s, recent)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const GENRES = [
  "Bollywood",
  "Punjabi",
  "Hip-hop",
  "Lo-fi",
  "Indie",
  "Pop",
  "Rock",
  "Electronic",
  "Jazz",
  "Classical",
  "Tamil",
  "Ambient",
];

export function Dig() {
  const { results, loading, error, query, setQuery, run } = useSearch();
  const { queue, index, play } = usePlayer();
  const current = queue[index]?.id;
  const idle = !loading && !error && results.length === 0 && !query;

  return (
    <div className="pt-4">
      {idle ? (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Browse genres
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setQuery(`${g} songs`);
                  run();
                }}
                className="h-24 rounded-2xl bg-linear-to-br from-slate to-graphite p-3 text-left font-display text-sm font-semibold hover:from-smoke"
              >
                {g}
              </button>
            ))}
          </div>
        </>
      ) : (
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Results
        </h2>
      )}
      {loading && <p className="text-smoke">Searching…</p>}
      {error && <p className="wrap-break-word text-smoke">{error}</p>}
      {!loading && !error && !idle && results.length === 0 && (
        <p className="text-smoke">No matches. Try another artist or song.</p>
      )}
      {results.map((s) => (
        <SongRow
          key={s.id}
          song={s}
          actions
          active={s.id === current}
          onClick={() => play(s, results)}
        />
      ))}
    </div>
  );
}

export function Placeholder({
  name,
  branch,
}: {
  name: string;
  branch: string;
}) {
  return (
    <div className="pt-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {name}
      </h1>
      <p className="mt-3 text-smoke">Coming in {branch}.</p>
    </div>
  );
}
