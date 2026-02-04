
import { ref, computed, watch } from 'vue';
import hitsterDb from '../data/hitster-db.json';
import { fetchDeezerTrack } from '../services/deezerService';
import { useAudio } from './useAudio';

const bullseyeHistory = ref([]);
const bullseyeBestScore = ref(0);
const bullseyeTotalScore = ref(0);

// Load State
const loadBullseyeState = () => {
    const savedHistory = localStorage.getItem('mixera_bullseye_history');
    if (savedHistory) {
         try { bullseyeHistory.value = JSON.parse(savedHistory); } catch (e) {}
    }
    const savedBest = localStorage.getItem('mixera_bullseye_best');
    if (savedBest) bullseyeBestScore.value = parseInt(savedBest) || 0;
};
loadBullseyeState();

export function useBullseyeGame() {
    const { playAudio, fadeOutAudio, stopAudio } = useAudio();

    const currentSong = ref(null);
    const isRevealed = ref(false);
    const mysteryProgress = ref(0);
    const isLoading = ref(false);
    const error = ref(null);
    const lastPointsEarned = ref(0);

    let bullseyeTimer = null;
    let autoNextTimeout = null;

    const fetchRandomSong = async (retryCount = 0) => {
        const uniqueSongs = Object.values(hitsterDb).reduce((acc, song) => {
            if (!acc[song.id]) acc[song.id] = song;
            return acc;
        }, {});

        const candidates = Object.values(uniqueSongs);
        if (candidates.length === 0) throw new Error("EMPTY_DB");

        let pool = candidates.filter(song => !bullseyeHistory.value.includes(song.id));
        if (pool.length === 0) pool = candidates;

        const chosenSong = pool[Math.floor(Math.random() * pool.length)];
        
        if (!bullseyeHistory.value.includes(chosenSong.id)) {
            bullseyeHistory.value.push(chosenSong.id);
            if (bullseyeHistory.value.length > 50) bullseyeHistory.value.shift();
            localStorage.setItem('mixera_bullseye_history', JSON.stringify(bullseyeHistory.value));
        }

        try {
            return await fetchDeezerTrack(chosenSong);
        } catch (e) {
            if (retryCount > 5) throw new Error("Max retries");
            return fetchRandomSong(retryCount + 1);
        }
    };

    const startBullseyeRound = async () => {
        if (bullseyeTimer) clearInterval(bullseyeTimer);
        if (autoNextTimeout) clearTimeout(autoNextTimeout);

        isLoading.value = true;
        isRevealed.value = false;
        mysteryProgress.value = 0;
        lastPointsEarned.value = 0;
        stopAudio();

        try {
            const next = await fetchRandomSong();
            currentSong.value = next;
            isLoading.value = false;

            await playAudio(next.preview);

            const TOTAL_DURATION = 20000;
            const startTime = Date.now();
            let isFadingOut = false;

            bullseyeTimer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                
                // Progress bar now covers the full 20s
                mysteryProgress.value = Math.min((elapsed / TOTAL_DURATION) * 100, 100);

                if (elapsed >= TOTAL_DURATION - 2500 && !isFadingOut) {
                    isFadingOut = true;
                    fadeOutAudio(2500);
                }

                if (elapsed >= TOTAL_DURATION) {
                    clearInterval(bullseyeTimer);
                    // On timeout, reveal automatically
                    if (!isRevealed.value) submitYearGuess(null);
                }
            }, 100);

        } catch (e) {
            error.value = "Erreur de chargement";
            isLoading.value = false;
        }
    };

    const submitYearGuess = (guessedYear) => {
        if (isRevealed.value) return; // Prevent double submit
        if (bullseyeTimer) clearInterval(bullseyeTimer);

        isRevealed.value = true;
        mysteryProgress.value = 100;

        if (guessedYear === null) {
            lastPointsEarned.value = 0;
        } else {
            const actual = currentSong.value.year;
            const diff = Math.abs(guessedYear - actual);

            let points = 0;
            if (diff === 0) points = 100;
            else if (diff <= 1) points = 50;
            else if (diff <= 3) points = 20;

            lastPointsEarned.value = points;
            bullseyeTotalScore.value += points;

            if (bullseyeTotalScore.value > bullseyeBestScore.value) {
                bullseyeBestScore.value = bullseyeTotalScore.value;
                localStorage.setItem('mixera_bullseye_best', bullseyeBestScore.value.toString());
            }
        }

        // Auto next after 8 seconds
        autoNextTimeout = setTimeout(async () => {
            await fadeOutAudio(2000);
            startBullseyeRound();
        }, 8000);
    };

    const resetBullseyeGame = () => {
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
        resetBullseyeGame
    };
}
