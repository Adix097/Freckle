import Heart from "./Heart";
import { usePlayer } from "../store";
import { fmt } from "../format";
import Seek from "./Seek";
import { Cover } from "./SongRow";
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from "./icons";

export default function Deck() {
  const p = usePlayer();
  const song = p.queue[p.index];
  const frac = p.duration ? p.time / p.duration : 0;

  return (
    <footer className="grid grid-cols-[1fr_1.5fr_1fr] items-center gap-5 border-t border-graphite bg-graphite/40 px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-14 shrink-0">
          <Cover
            src={song?.cover ?? null}
            className={`size-14 animate-[spin_8s_linear_infinite] rounded-full ${p.playing ? "" : "[animation-play-state:paused]"}`}
          />
          <span className="absolute inset-[42%] rounded-full bg-ink" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {song?.title ?? "Nothing playing"}
          </div>
          <div className="truncate text-xs text-smoke">
            {p.error
              ? p.error
              : p.loading
                ? "Loading…"
                : (song?.artist ?? "Search for a song to start")}
          </div>
        </div>
        {song && <Heart song={song} />}
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-5">
          <button
            onClick={p.prev}
            aria-label="Previous"
            className="text-ash hover:text-bone"
          >
            <PrevIcon />
          </button>
          <button
            onClick={p.toggle}
            aria-label={p.playing ? "Pause" : "Play"}
            className="grid size-11 place-items-center rounded-full bg-bone text-ink hover:scale-105"
          >
            {p.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            onClick={p.next}
            aria-label="Next"
            className="text-ash hover:text-bone"
          >
            <NextIcon />
          </button>
        </div>
        <div className="flex w-full items-center gap-2 text-[11px] text-smoke">
          <span className="w-9 text-right">{fmt(p.time)}</span>
          <Seek value={frac} onSeek={p.seek} />
          <span className="w-9">{fmt(p.duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-ash">
        <VolumeIcon />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p.volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="w-28 accent-bone"
        />
      </div>
    </footer>
  );
}
