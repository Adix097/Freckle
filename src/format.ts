export const fmt = (s: number | null | undefined) => {
  if (s == null || !isFinite(s)) return "0:00";
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
