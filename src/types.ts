export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  cover: string | null;
};

export type View = "home" | "dig" | "library" | "echo";
