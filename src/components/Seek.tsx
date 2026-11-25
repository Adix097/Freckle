import { useRef, useState } from "react";

type Props = { value: number; onSeek: (frac: number) => void };

export default function Seek({ value, onSeek }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = drag !== null;
  const shown = drag ?? value;

  const frac = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      className="group relative flex h-4 flex-1 cursor-pointer touch-none items-center"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(frac(e));
      }}
      onPointerMove={(e) => dragging && setDrag(frac(e))}
      onPointerUp={(e) => {
        onSeek(frac(e));
        setDrag(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(1, value + 0.03));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, value - 0.03));
      }}
    >
      <div className="h-1 w-full rounded-full bg-slate">
        <div
          className={`relative h-full rounded-full group-hover:bg-bone ${dragging ? "bg-bone" : "bg-ash"}`}
          style={{ width: `${shown * 100}%` }}
        >
          <span
            className={`absolute -right-1.5 -top-1 size-3 rounded-full bg-bone transition group-hover:scale-100 group-hover:opacity-100 ${dragging ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          />
        </div>
      </div>
    </div>
  );
}
