import { usePlayer, useSearch } from "./store";
import SongRow from "./components/SongRow";

export function Home() {
  return (
    <div className="pt-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Good evening
      </h1>
      <p className="mt-3 max-w-md text-smoke">
        New releases, your playlists and recently played will live here. For
        now, search for a song above.
      </p>
    </div>
  );
}

export function Dig() {
  const { results, loading, error, query } = useSearch();
  const { queue, index, play } = usePlayer();
  const current = queue[index]?.id;
  return (
    <div className="pt-4">
      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
        Results
      </h2>
      {loading && <p className="text-smoke">Searching…</p>}
      {error && <p className="wrap-break-word text-smoke">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="text-smoke">
          {query
            ? "No matches. Try another artist or song."
            : "Type something in the search bar and press Enter."}
        </p>
      )}
      {results.map((s) => (
        <SongRow
          key={s.id}
          song={s}
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
