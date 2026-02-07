import { ref, computed, watch } from "vue";
import hitsterDb from "../data/hitster-db.json";
import { fetchDeezerTrack } from "../services/deezerService";
import { useAudio } from "./useAudio";
import type { Song } from "../types";

// Shared Persistence
const blindtestHistory = ref<string[]>([]);
const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear();
const blindtestRange = ref<number[]>([MIN_YEAR, MAX_YEAR]);
const selectedOrigin = ref<string>("all");
const selectedGenres = ref<string[]>([]);

// Load State
const loadBlindtestState = () => {
  // History
  const savedBh = localStorage.getItem("mixera_blindtest_history");
  if (savedBh) {
    try {
      blindtestHistory.value = JSON.parse(savedBh);
    } catch {}
  }
  // Settings
  const savedSettings = localStorage.getItem("mixera_settings");
  if (savedSettings) {
    try {
      const s = JSON.parse(savedSettings);
      if (s.range) blindtestRange.value = s.range;
      if (s.origin) selectedOrigin.value = s.origin;
      if (s.genres) selectedGenres.value = s.genres;
    } catch {}
  }
};
loadBlindtestState();

// Save Settings Watcher
watch(
  [blindtestRange, selectedOrigin, selectedGenres],
  () => {
    localStorage.setItem(
      "mixera_settings",
      JSON.stringify({
        range: blindtestRange.value,
        origin: selectedOrigin.value,
        genres: selectedGenres.value,
      }),
    );
  },
  { deep: true },
);

export function useBlindtestGame() {
  const { playAudio, fadeOutAudio, stopAudio } = useAudio();

  // Game State
  const currentSong = ref<Song | null>(null);
  const isRevealed = ref(false);
  const mysteryProgress = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Internal
  const nextBlindtestSong = ref<Song | null>(null);
  let blindtestTimer: ReturnType<typeof setInterval> | null = null;
  let winTimeout: ReturnType<typeof setTimeout> | null = null;
  let gameSessionId = 0;

  // Genres Computed
  const genres = computed(() => {
    const s = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(hitsterDb).forEach((track: any) => {
      if (track.genre) s.add(track.genre);
    });
    return Array.from(s).sort();
  });

  // Validates filters match at least one song
  const fetchRandomSong = async (retryCount = 0): Promise<Song> => {
    // 1. Get unique songs from DB
    const uniqueSongs = Object.values(hitsterDb).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, import("../types").HitsterEntry>, song: any) => {
        if (!acc[song.id]) acc[song.id] = song as import("../types").HitsterEntry;
        return acc;
      },
      {},
    );

    // 2. Filter by criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = Object.values(uniqueSongs).filter((song: any) => {
      // Cast to HitsterEntry for checking
      const s = song as import("../types").HitsterEntry;
      const year = parseInt(String(s.year));
      if (year < blindtestRange.value[0]! || year > blindtestRange.value[1]!)
        return false;

      if (selectedOrigin.value !== "all") {
        const songLang = s.lang || "int";
        if (selectedOrigin.value === "fr" && songLang !== "fr") return false;
        if (selectedOrigin.value === "int" && songLang === "fr") return false;
      }

      if (selectedGenres.value.length > 0) {
        if (s.genre && !selectedGenres.value.includes(s.genre)) return false;
      }
      return true;
    }) as import("../types").HitsterEntry[];

    if (candidates.length === 0) throw new Error("EMPTY_FILTER");

    // 3. Filter by history (using song.id)
    let pool = candidates.filter(
      (song) => !blindtestHistory.value.includes(String(song.id)),
    );

    if (pool.length === 0) {
      console.warn("History full, recycling oldest entries...");
      // If all candidates are in history, we pick the oldest one from the candidates
      // Or just pick randomly from candidates to break the loop
      pool = candidates;
    }

    const chosenSong = pool[Math.floor(Math.random() * pool.length)];

    // 4. Add to history (using canonical song.id)
    if (!blindtestHistory.value.includes(String(chosenSong.id))) {
      blindtestHistory.value.push(String(chosenSong.id));
      if (blindtestHistory.value.length > 50) blindtestHistory.value.shift();
      localStorage.setItem(
        "mixera_blindtest_history",
        JSON.stringify(blindtestHistory.value),
      );
    }

    try {
      // Create a clean Song object with parsed year
      const cleanSong: Song = {
        ...chosenSong,
        id: chosenSong.id,
        artist: chosenSong.artist,
        title: chosenSong.title,
        year: parseInt(String(chosenSong.year), 10) || 0,
        genre: chosenSong.genre,
        lang: chosenSong.lang,
      };
      return await fetchDeezerTrack(cleanSong);
    } catch {
      if (retryCount > 5) throw new Error("Max retries");
      return fetchRandomSong(retryCount + 1);
    }
  };

  const preloadNextTrack = async () => {
    const sessionId = gameSessionId;
    try {
      const track = await fetchRandomSong();
      if (sessionId === gameSessionId) {
        nextBlindtestSong.value = track;
      }
    } catch {
      /* Filters issue or network */
    }
  };

  // Watch filters change -> invalidate preload
  watch([blindtestRange, selectedOrigin, selectedGenres], () => {
    nextBlindtestSong.value = null;
  });

  const playNextdtTrack = async () => {
    const sessionId = gameSessionId;

    // Cleanup
    if (blindtestTimer) clearInterval(blindtestTimer);
    if (winTimeout) clearTimeout(winTimeout);

    let next = nextBlindtestSong.value;
    nextBlindtestSong.value = null;

    if (!next) {
      isLoading.value = true;
      stopAudio(); // Silence while loading
      try {
        next = await fetchRandomSong();
        if (sessionId !== gameSessionId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (sessionId !== gameSessionId) return;

        if (e.message === "EMPTY_FILTER") {
          error.value = "Aucun titre trouvé avec ces filtres !";
          isLoading.value = false;
          return;
        }
        setTimeout(() => {
          if (sessionId === gameSessionId) playNextdtTrack();
        }, 1000);
        return;
      }
    }

    // Apply State
    isLoading.value = false;
    error.value = null;
    isRevealed.value = false;
    mysteryProgress.value = 0;
    currentSong.value = next; // { title, artist, year, cover, preview }

    // Play Audio with Timer logic
    if (next && next.preview) {
      await playAudio(next.preview);
    }

    if (sessionId !== gameSessionId) return;

    // Start Reveal Timer
    const REVEAL_TIME = 20000;
    const TOTAL_DURATION = 30000;
    const startTime = Date.now();
    let isFadingOut = false;

    blindtestTimer = setInterval(async () => {
      if (sessionId !== gameSessionId) {
        if (blindtestTimer) clearInterval(blindtestTimer);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < REVEAL_TIME) {
        mysteryProgress.value = (elapsed / REVEAL_TIME) * 100;
      } else if (!isRevealed.value) {
        isRevealed.value = true;
        mysteryProgress.value = 100;
      }

      // Start fade-out slightly before the end
      if (elapsed >= TOTAL_DURATION - 2500 && !isFadingOut) {
        isFadingOut = true;
        fadeOutAudio(2500);
      }

      if (elapsed >= TOTAL_DURATION) {
        if (blindtestTimer) clearInterval(blindtestTimer);
        playNextdtTrack();
      }
    }, 100);

    preloadNextTrack();
  };

  const handleWin = () => {
    const sessionId = gameSessionId;
    if (blindtestTimer) clearInterval(blindtestTimer);
    isRevealed.value = true;
    mysteryProgress.value = 100;

    if (winTimeout) clearTimeout(winTimeout);

    winTimeout = setTimeout(async () => {
      if (sessionId !== gameSessionId) return;
      await fadeOutAudio(2000);
      if (sessionId === gameSessionId) playNextdtTrack();
    }, 8000);
  };

  const resetBlindtestGame = () => {
    gameSessionId++;
    if (blindtestTimer) clearInterval(blindtestTimer);
    if (winTimeout) clearTimeout(winTimeout);
    stopAudio();
    currentSong.value = null;
    nextBlindtestSong.value = null;
  };

  return {
    // State
    currentSong,
    isRevealed,
    mysteryProgress,
    isLoading,
    error,
    blindtestRange,
    selectedOrigin,
    selectedGenres,
    genres,
    MIN_YEAR,
    MAX_YEAR,

    // Actions
    playNextdtTrack,
    handleWin,
    resetBlindtestGame,
  };
}
