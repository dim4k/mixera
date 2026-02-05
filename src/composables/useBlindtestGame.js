import { ref, computed, watch } from 'vue';
import hitsterDb from '../data/hitster-db.json';
import { fetchDeezerTrack } from '../services/deezerService';
import { useAudio } from './useAudio';

// Shared Persistence
const blindtestHistory = ref([]);
const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear();
const blindtestRange = ref([MIN_YEAR, MAX_YEAR]);
const selectedOrigin = ref('all');
const selectedGenres = ref([]); 

// Load State
const loadBlindtestState = () => {
    // History
    const savedBh = localStorage.getItem('mixera_blindtest_history');
    if (savedBh) {
        try { blindtestHistory.value = JSON.parse(savedBh); } catch (e) {}
    }
    // Settings
    const savedSettings = localStorage.getItem('mixera_settings');
    if (savedSettings) {
        try {
            const s = JSON.parse(savedSettings);
            if (s.range) blindtestRange.value = s.range;
            if (s.origin) selectedOrigin.value = s.origin;
            if (s.genres) selectedGenres.value = s.genres;
        } catch (e) {}
    }
};
loadBlindtestState();

// Save Settings Watcher
watch([blindtestRange, selectedOrigin, selectedGenres], () => {
    localStorage.setItem('mixera_settings', JSON.stringify({
        range: blindtestRange.value,
        origin: selectedOrigin.value,
        genres: selectedGenres.value
    }));
}, { deep: true });

export function useBlindtestGame() {
    const { playAudio, fadeOutAudio, stopAudio } = useAudio();

    // Game State
    const currentSong = ref(null);
    const isRevealed = ref(false);
    const mysteryProgress = ref(0);
    const isLoading = ref(false);
    const error = ref(null);
    
    // Internal
    const nextBlindtestSong = ref(null);
    let blindtestTimer = null;
    let winTimeout = null;
    let gameSessionId = 0;

    // Genres Computed
    const genres = computed(() => {
        const s = new Set();
        Object.values(hitsterDb).forEach(track => {
            if (track.genre) s.add(track.genre);
        });
        return Array.from(s).sort();
    });

    // Validates filters match at least one song
    const fetchRandomSong = async (retryCount = 0) => {
        // 1. Get unique songs from DB
        const uniqueSongs = Object.values(hitsterDb).reduce((acc, song) => {
            if (!acc[song.id]) acc[song.id] = song;
            return acc;
        }, {});

        // 2. Filter by criteria
        const candidates = Object.values(uniqueSongs).filter(song => {
            const year = parseInt(song.year);
            if (year < blindtestRange.value[0] || year > blindtestRange.value[1]) return false;
            
            if (selectedOrigin.value !== 'all') {
                const songLang = song.lang || 'int'; 
                if (selectedOrigin.value === 'fr' && songLang !== 'fr') return false;
                if (selectedOrigin.value === 'int' && songLang === 'fr') return false;
            }

            if (selectedGenres.value.length > 0) {
                if (!selectedGenres.value.includes(song.genre)) return false;
            }
            return true;
        });

        if (candidates.length === 0) throw new Error("EMPTY_FILTER");

        // 3. Filter by history (using song.id)
        let pool = candidates.filter(song => !blindtestHistory.value.includes(song.id));
        
        if (pool.length === 0) {
            console.warn("History full, recycling oldest entries...");
            // If all candidates are in history, we pick the oldest one from the candidates
            // Or just pick randomly from candidates to break the loop
            pool = candidates;
        }

        const chosenSong = pool[Math.floor(Math.random() * pool.length)];
        
        // 4. Add to history (using canonical song.id)
        if (!blindtestHistory.value.includes(chosenSong.id)) {
            blindtestHistory.value.push(chosenSong.id);
            // Limit history size to 50 or as requested
            if (blindtestHistory.value.length > 50) blindtestHistory.value.shift();
            localStorage.setItem('mixera_blindtest_history', JSON.stringify(blindtestHistory.value));
        }

        try {
             return await fetchDeezerTrack(chosenSong);
        } catch (e) {
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
        } catch (e) { /* Filters issue or network */ }
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
            } catch (e) {
                if (sessionId !== gameSessionId) return;

                if (e.message === 'EMPTY_FILTER') {
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
        // We pass a callback or manage timer here?
        // Let's manage timer here because it updates mysteryProgress
        
        await playAudio(next.preview);
        if (sessionId !== gameSessionId) return;

        // Start Reveal Timer
        const REVEAL_TIME = 20000;
        const TOTAL_DURATION = 30000;
        const startTime = Date.now();
        let isFadingOut = false;
        
        blindtestTimer = setInterval(async () => {
             if (sessionId !== gameSessionId) {
                 clearInterval(blindtestTimer);
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
                 clearInterval(blindtestTimer);
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
        resetBlindtestGame
    };
}
