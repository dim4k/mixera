import { ref } from "vue";
import hitsterDb from "../data/hitster-db.json";
import { fetchDeezerTrack } from "../services/deezerService";
import { useAudio } from "./useAudio";
import type { Song } from "../types";

const bullseyeHistory = ref<string[]>([]);
const bullseyeBestScore = ref(0);
const bullseyeTotalScore = ref(0);

// Load State
const loadBullseyeState = () => {
  const savedHistory = localStorage.getItem("mixera_bullseye_history");
  if (savedHistory) {
    try {
      bullseyeHistory.value = JSON.parse(savedHistory);
    } catch {}
  }
  const savedBest = localStorage.getItem("mixera_bullseye_best");
  if (savedBest) bullseyeBestScore.value = parseInt(savedBest) || 0;
};
loadBullseyeState();

export function useBullseyeGame() {
  const { playAudio, fadeOutAudio, stopAudio } = useAudio();

  const currentSong = ref<Song | null>(null);
  const isRevealed = ref(false);
  const mysteryProgress = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastPointsEarned = ref(0);

  let bullseyeTimer: ReturnType<typeof setInterval> | null = null;
  let autoNextTimeout: ReturnType<typeof setTimeout> | null = null;
  let gameSessionId = 0;

  const fetchRandomSong = async (retryCount = 0): Promise<Song> => {
    const uniqueSongs = Object.values(hitsterDb).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, import("../types").HitsterEntry>, song: any) => {
        if (!acc[song.id]) acc[song.id] = song as import("../types").HitsterEntry;
        return acc;
      },
      {},
    );

    const candidates = Object.values(uniqueSongs);
    if (candidates.length === 0) throw new Error("EMPTY_DB");

    let pool = candidates.filter(
      (song) => !bullseyeHistory.value.includes(String(song.id)),
    );
    if (pool.length === 0) pool = candidates;

    const chosenSong = pool[Math.floor(Math.random() * pool.length)];

    if (!bullseyeHistory.value.includes(String(chosenSong.id))) {
      bullseyeHistory.value.push(String(chosenSong.id));
      if (bullseyeHistory.value.length > 50) bullseyeHistory.value.shift();
      localStorage.setItem(
        "mixera_bullseye_history",
        JSON.stringify(bullseyeHistory.value),
      );
    }

    try {
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

  const startBullseyeRound = async () => {
    const sessionId = gameSessionId;
    // Guard: Prevent starting if already loading/processing
    if (isLoading.value) return;

    if (bullseyeTimer) {
      clearInterval(bullseyeTimer);
      bullseyeTimer = null;
    }
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout);
      autoNextTimeout = null;
    }

    isLoading.value = true;
    isRevealed.value = false;
    mysteryProgress.value = 0;
    lastPointsEarned.value = 0;
    stopAudio();

    try {
      const next = await fetchRandomSong();
      if (sessionId !== gameSessionId) return;

      currentSong.value = next;
      isLoading.value = false;

      if (next.preview) {
        await playAudio(next.preview);
      }
      if (sessionId !== gameSessionId) return;

      const TOTAL_DURATION = 20000;
      const startTime = Date.now();
      let isFadingOut = false;

      // Ensure no rogue interval if state changed rapidly
      if (bullseyeTimer) clearInterval(bullseyeTimer);

      bullseyeTimer = setInterval(() => {
        if (sessionId !== gameSessionId) {
          if (bullseyeTimer) clearInterval(bullseyeTimer);
          return;
        }

        const elapsed = Date.now() - startTime;

        // Progress bar now covers the full 20s
        mysteryProgress.value = Math.min((elapsed / TOTAL_DURATION) * 100, 100);

        if (elapsed >= TOTAL_DURATION - 2500 && !isFadingOut) {
          isFadingOut = true;
          fadeOutAudio(2500);
        }

        if (elapsed >= TOTAL_DURATION) {
          if (bullseyeTimer) clearInterval(bullseyeTimer);
          bullseyeTimer = null;
          // On timeout, reveal automatically
          if (!isRevealed.value) submitYearGuess(null);
        }
      }, 100);
    } catch (e) {
      if (sessionId !== gameSessionId) return;
      console.error("Bullseye Start Error:", e);
      error.value = "Erreur de chargement";
      isLoading.value = false;
    }
  };

  const submitYearGuess = (guessedYear: number | null) => {
    const sessionId = gameSessionId;
    if (isRevealed.value) return; // Prevent double submit
    if (bullseyeTimer) clearInterval(bullseyeTimer);

    isRevealed.value = true;
    mysteryProgress.value = 100;

    if (guessedYear === null) {
      lastPointsEarned.value = 0;
    } else {
      // currentSong can be null conceptually but here it should be set
      if (!currentSong.value) return;

      const actual = Number(currentSong.value.year);
      const diff = Math.abs(guessedYear - actual);

      let points = 0;
      if (diff === 0) points = 100;
      else if (diff <= 1) points = 50;
      else if (diff <= 3) points = 20;

      lastPointsEarned.value = points;
      bullseyeTotalScore.value += points;

      if (bullseyeTotalScore.value > bullseyeBestScore.value) {
        bullseyeBestScore.value = bullseyeTotalScore.value;
        localStorage.setItem(
          "mixera_bullseye_best",
          bullseyeBestScore.value.toString(),
        );
      }
    }

    // Auto next after 8 seconds
    autoNextTimeout = setTimeout(async () => {
      if (sessionId !== gameSessionId) return;
      await fadeOutAudio(2000);
      if (sessionId === gameSessionId) startBullseyeRound();
    }, 8000);
  };

  const resetBullseyeGame = () => {
    gameSessionId++;
    stopAudio();
    if (bullseyeTimer) clearInterval(bullseyeTimer);
    if (autoNextTimeout) clearTimeout(autoNextTimeout);
    currentSong.value = null;
    bullseyeTotalScore.value = 0;
  };

  return {
    currentSong,
    isRevealed,
    mysteryProgress,
    isLoading,
    error,
    bullseyeTotalScore,
    bullseyeBestScore,
    lastPointsEarned,
    startBullseyeRound,
    submitYearGuess,
    resetBullseyeGame,
  };
}
