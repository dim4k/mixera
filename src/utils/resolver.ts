import db from "../data/hitster-db.json";
import type { HitsterResult } from "../types";

/**
 * Extracts the Hitster ID from a URL and returns the song data.
 * @param {string} url - The scanned URL (e.g., http://www.hitstergame.com/de/00268)
 * @returns {HitsterResult | null} - The song object or null if not found/invalid.
 */
export function resolveHitsterUrl(url: string): HitsterResult | null {
  try {
    // Regex to find 1 to 5 digits at the end of the URL or path
    // Matches: .../fr/00232, .../232, 00232
    const match = url.match(/(?:\/|^)(\d{1,5})\b/);
    if (!match) return null;

    // Pad ID to 3 digits for consistent lookup if possible,
    // but trust the extracted string key first (e.g. "00232")
    const id = match[1]!;
    const song = (db as Record<string, import("../types").HitsterEntry>)[id];

    if (song) {
      return {
        ...song,
        id,
        year: parseInt(String(song.year), 10),
      } as HitsterResult;
    }
    return { error: true, id } as unknown as HitsterResult; // Return error object
  } catch (e) {
    console.error("Error resolving Hitster URL", e);
    return null;
  }
}
