import { useState } from "react";
import { usePlayer } from "../store";
import SongRow from "./SongRow";

export default function SidePanel() {
  const { queue, index, jump } = usePlayer();
  const [tab, setTab] = useState<"queue" | "lyrics">("queue");
  const now = queue[index];

  return (
    <aside className="min-h-0 overflow-y-auto rounded-3xl border border-graphite bg-graphite/40 p-3">
      <div className="mb-3 flex rounded-full bg-graphite p-1">
        {(["queue", "lyrics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-1 text-sm capitalize ${tab === t ? "bg-bone font-bold text-ink" : "text-smoke"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "lyrics" ? (
        <p className="p-3 text-sm text-smoke">
          Lyrics arrive in a later branch.
        </p>
      ) : !now ? (
        <p className="p-3 text-sm text-smoke">
          The queue is empty. Play a song to fill it.
        </p>
      ) : (
        <>
          <div className="px-2 pb-1 text-xs text-smoke">Now playing</div>
          <SongRow song={now} active onClick={() => {}} showTime={false} />
          <div className="px-2 pb-1 pt-3 text-xs text-smoke">Next up</div>
          {queue.map((s, i) =>
            i > index ? (
              <SongRow
                key={s.id}
                song={s}
                onClick={() => jump(i)}
                showTime={false}
              />
            ) : null,
          )}
        </>
      )}
    </aside>
  );
}
