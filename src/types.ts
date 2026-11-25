export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  cover: string | null;
};

export type Release = {
  browseId: string;
  title: string;
  artist: string;
  kind: string;
  cover: string | null;
};

export type Lyrics = {
  synced: { t: number; text: string }[] | null;
  plain: string | null;
};

export type View = "home" | "dig" | "library" | "echo";
