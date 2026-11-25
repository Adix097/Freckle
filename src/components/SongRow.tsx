import type { Song } from "../types";
import { fmt } from "../format";

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
};

export default function SongRow({
  song,
  active,
  onClick,
  showTime = true,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-graphite ${active ? "bg-graphite" : ""}`}
    >
      <Cover src={song.cover} className="size-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{song.title}</div>
        <div className="truncate text-xs text-smoke">
          {song.artist}
          {song.album ? ` · ${song.album}` : ""}
        </div>
      </div>
      {showTime && (
        <span className="text-xs text-smoke">{fmt(song.duration)}</span>
      )}
    </button>
  );
}
