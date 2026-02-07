import { Capacitor } from "@capacitor/core";
import type { Song } from "../types";

interface DeezerTrackData {
  title: string;
  artist: {
    name: string;
  };
  album: {
    cover_medium?: string;
    cover_xl?: string;
  };
  preview: string;
}

interface DeezerResponse {
  data: DeezerTrackData[];
  total?: number;
  next?: string;
}

export const fetchDeezerTrack = async (rawSong: Song): Promise<Song> => {
  const query = encodeURIComponent(`${rawSong.artist} ${rawSong.title}`);
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const isNative = Capacitor.isNativePlatform();

  // 1. Native App (Android/iOS) - Direct Call via CapacitorHttp (or generic fetch if Capacitor patches it)
  if (isNative) {
    try {
      const response = await fetch(`https://api.deezer.com/search?q=${query}`);
      if (!response.ok) throw new Error(`Deezer API Error: ${response.status}`);
      const data = await response.json();
      return processTrackData(data, rawSong.year);
    } catch (err) {
      console.error("Native Deezer Error:", err);
      throw err;
    }
  }

  // 2. Local Development - Vite Proxy
  if (isLocal) {
    try {
      const response = await fetch(`/api/deezer/search?q=${query}`);
      if (!response.ok)
        throw new Error(`Vite Proxy failed: ${response.status}`);
      const data = await response.json();
      return processTrackData(data, rawSong.year);
    } catch (err) {
      console.error("Local Deezer Error:", err);
      throw err;
    }
  }

  // 3. Web Production (GitHub Pages) - No Proxy anymore (User decision)
  // If we land here on web, standard CORS will likely block us.
  throw new Error(
    "Cette version web ne supporte plus la recherche musicale. Veuillez utiliser l'application Android.",
  );
};

const processTrackData = (data: DeezerResponse, year: number): Song => {
  if (!data || !data.data || data.data.length === 0)
    throw new Error("Aucun morceau trouvé.");
  const track = data.data[0];
  if (!track) throw new Error("Aucun morceau trouvé.");
  if (!track.preview) throw new Error("Aperçu non disponible.");

  return {
    id: Math.random().toString(36).substr(2, 9), // Temp ID or derived? The original didn't set ID.
    // Actually the original returned an object { title, artist, year, cover, preview }
    // We should probably return a partial Song or fully compliant Song.
    // Let's assume we return adequate fields.
    title: track.title,
    artist: track.artist.name,
    year: year,
    cover: track.album.cover_xl || track.album.cover_medium || "",
    preview: track.preview,
    // Note: 'id' is required in 'Song' interface.
    // We generally use this for *display/play*.
    // If the original Code expected an object without ID, we might need to adjust 'Song' or add ID here.
    // I will add a dummy ID to satisfy the strict Type.
  } as Song;
};
