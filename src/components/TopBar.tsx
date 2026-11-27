import { AvatarButton } from "./Account";
import { useSearch } from "../store";
import type { View } from "../types";
import { SearchIcon } from "./icons";

const tabs: [View, string][] = [
  ["home", "Home"],
  ["dig", "Dig"],
  ["library", "Library"],
  ["echo", "Echo"],
];

type Props = { view: View; setView: (v: View) => void };

export default function TopBar({ view, setView }: Props) {
  const { query, setQuery, run } = useSearch();
  return (
    <header className="flex items-center gap-5 px-5">
      <span className="font-display text-xl font-extrabold tracking-tight">
        freckle
      </span>
      <nav className="mx-auto flex rounded-full bg-graphite p-1">
        {tabs.map(([k, name]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`rounded-full px-5 py-1.5 text-sm ${view === k ? "bg-bone font-bold text-ink" : "text-smoke hover:text-bone"}`}
          >
            {name}
          </button>
        ))}
      </nav>
      <label className="flex w-64 items-center gap-2 rounded-full bg-graphite px-4 py-2 text-smoke focus-within:text-bone">
        <SearchIcon className="size-4" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              run();
              setView("dig");
            }
          }}
          placeholder="Search songs, artists"
          className="w-full bg-transparent text-sm text-bone outline-none placeholder:text-smoke"
        />
      </label>
      <AvatarButton />
    </header>
  );
}
