import type { Song } from "../types";
import { fmt } from "../format";
import { useLibrary } from "../library";
import Heart from "./Heart";
import { PlusIcon } from "./icons";

export function Cover({
  src,
  className = "",
}: {
  src: string | null;
  className?: string;
}) {
  return src ? (
    <img src={src} alt="" className={`object-cover ${className}`} />
  ) : (
    <div className={`bg-slate ${className}`} />
  );
}

type Props = {
  song: Song;
  active?: boolean;
  onClick: () => void;
  showTime?: boolean;
  actions?: boolean;
  onRemove?: () => void;
};

export default function SongRow({
  song,
  active,
  onClick,
  showTime = true,
  actions = false,
  onRemove,
}: Props) {
  const openAdd = useLibrary((s) => s.openAdd);
  return (
    <div
      className={`flex items-center gap-1 rounded-xl pr-1 hover:bg-graphite ${active ? "bg-graphite" : ""}`}
    >
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
      >
        <Cover src={song.cover} className="size-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{song.title}</div>
          <div className="truncate text-xs text-smoke">
            {song.artist}
            {song.album ? ` · ${song.album}` : ""}
          </div>
        </div>
      </button>
      {actions && (
        <>
          <Heart song={song} />
          <button
            aria-label="Add to playlist"
            onClick={() => openAdd(song)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-smoke hover:text-bone"
          >
            <PlusIcon className="size-5" />
          </button>
        </>
      )}
      {onRemove && (
        <button
          aria-label="Remove from playlist"
          onClick={onRemove}
          className="grid size-9 shrink-0 place-items-center rounded-full text-smoke hover:text-bone"
        >
          ✕
        </button>
      )}
      {showTime && (
        <span className="w-10 text-right text-xs text-smoke">
          {fmt(song.duration)}
        </span>
      )}
    </div>
  );
}
