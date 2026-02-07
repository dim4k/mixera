export interface Song {
  id: string | number;
  title: string;
  artist: string;
  year: number;
  cover?: string;
  preview?: string;
  youtubeId?: string;
  genre?: string;
  lang?: string;
}

export interface HitsterResult extends Song {
  error?: boolean;
}

export interface HitsterEntry {
  id: string | number;
  title: string;
  artist: string;
  year: string | number;
  genre?: string;
  lang?: string;
}

export type GameMode =
  | "hitster"
  | "blindtest"
  | "timeline"
  | "bullseye"
  | "memory";
