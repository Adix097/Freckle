import type { ReactNode } from "react";

type P = { className?: string };
const mk =
  (d: ReactNode, solid = false) =>
  ({ className = "size-5" }: P) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d}
    </svg>
  );

export const PlayIcon = mk(<path d="M7 4l13 8-13 8z" />, true);
export const PauseIcon = mk(<path d="M6 4h4v16H6zM14 4h4v16h-4z" />, true);
export const NextIcon = mk(<path d="M5 4l10 8-10 8zM17 4h3v16h-3z" />, true);
export const PrevIcon = mk(<path d="M19 4L9 12l10 8zM7 4H4v16h3z" />, true);
export const SearchIcon = mk(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-5-5" />
  </>,
);
export const VolumeIcon = mk(
  <path d="M11 5L6 9H2v6h4l5 4zM16 8a5 5 0 0 1 0 8" />,
);
export const PlusIcon = mk(<path d="M12 5v14M5 12h14" />);
export const HeartIcon = ({
  className = "size-5",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" />
  </svg>
);
