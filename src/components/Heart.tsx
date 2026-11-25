import { useLibrary } from "../library";
import type { Song } from "../types";
import { HeartIcon } from "./icons";

export default function Heart({ song }: { song: Song }) {
  const liked = useLibrary((s) => s.likedIds.has(song.id));
  const toggle = useLibrary((s) => s.toggleLike);
  return (
    <button
      aria-label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        toggle(song);
      }}
      className={`grid size-9 shrink-0 place-items-center rounded-full ${liked ? "text-bone" : "text-smoke hover:text-bone"}`}
    >
      <HeartIcon className="size-5" filled={liked} />
    </button>
  );
}
