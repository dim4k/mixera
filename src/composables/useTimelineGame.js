import { ref } from 'vue';
import hitsterDb from '../data/hitster-db.json';
import { fetchDeezerTrack } from '../services/deezerService';
import { useAudio } from './useAudio';

// Shared state (could be local if we don't need persistence across views, but keeping consistent with refactoring plan)
const timelineHistory = ref([]);
const timelinePivotYear = ref(0);
const timelineMysterySong = ref(null);
const timelineStreak = ref(0);
    const timelineFeedback = ref(null); // 'correct' | 'wrong' | 'timeout' | null
    const timelineCorrectAnswer = ref(null); // 'before' | 'after'
    const isLoading = ref(false);
    let timelineTimer = null;
    let gameSessionId = 0;

    // Initialize History from LocalStorage
    const loadTimelineHistory = () => {
        const saved = localStorage.getItem('mixera_timeline_history');
        if (saved) {
            try { timelineHistory.value = JSON.parse(saved); } catch (e) {}
        }
    };
    loadTimelineHistory();

    export function useTimelineGame() {
        const { playAudio, fadeOutAudio, stopAudio } = useAudio();

        const startTimelineRound = async () => {
            const sessionId = gameSessionId;
            // Prevent re-fetch if already loading
            if (isLoading.value) return; 
            
            if (timelineTimer) clearTimeout(timelineTimer);
            
            isLoading.value = true;
            stopAudio();

            // Pick Mystery Song
            let ids = Object.keys(hitsterDb);
            // Filter history
            let pool = ids.filter(id => !timelineHistory.value.includes(id));
            if (pool.length === 0) pool = ids;

            const mystId = pool[Math.floor(Math.random() * pool.length)];
            const rawMyst = hitsterDb[mystId];
            
            // Add to history
            if (!timelineHistory.value.includes(mystId)) {
                timelineHistory.value.push(mystId);
                if (timelineHistory.value.length > 100) timelineHistory.value.shift();
                localStorage.setItem('mixera_timeline_history', JSON.stringify(timelineHistory.value));
            }
            
            // Generate Pivot Year
            const actualYear = parseInt(rawMyst.year);
            let pivot = actualYear + (Math.floor(Math.random() * 21) - 10);
            if (pivot === actualYear) {
                pivot = actualYear + (Math.random() < 0.5 ? -1 : 1);
            }
            
            try {
                const track = await fetchDeezerTrack(rawMyst);
                if (sessionId !== gameSessionId) return;
                
                timelineFeedback.value = null; // Hide previous result
                timelineMysterySong.value = track; // Swap song data
                timelinePivotYear.value = pivot;
                timelineCorrectAnswer.value = actualYear < pivot ? 'before' : 'after';
                isLoading.value = false;
                
                // Audio
                playAudio(track.preview);
                
                // Start Timer
                timelineTimer = setTimeout(() => {
                    if (sessionId === gameSessionId) handleTimelineGuess(null);
                }, 20000);
                
            } catch (e) {
                 console.error("Timeline fetch error", e);
                 if (sessionId === gameSessionId) {
                    isLoading.value = false;
                    setTimeout(() => {
                        if (sessionId === gameSessionId) startTimelineRound();
                    }, 2000); // Retry with longer delay to avoid 429
                 }
            }
        };

        const handleTimelineGuess = (direction) => {
            const sessionId = gameSessionId;
            if (timelineTimer) clearTimeout(timelineTimer);
            
            const isTimeout = direction === null;
            const isCorrect = !isTimeout && direction === timelineCorrectAnswer.value;
                              
            if (isCorrect) {
                timelineFeedback.value = 'correct';
                timelineStreak.value++;
                
                // Wait 2s, then fade out and swap
                setTimeout(async () => {
                     if (sessionId !== gameSessionId) return;
                     await fadeOutAudio(1000); 
                     if (sessionId === gameSessionId) startTimelineRound();
                }, 2000); 
            } else {
                timelineFeedback.value = isTimeout ? 'timeout' : 'wrong';
                
                // Keep music for 5s, then fade out
                setTimeout(async () => {
                    if (sessionId !== gameSessionId) return;
                    await fadeOutAudio(2000);
                    if (sessionId === gameSessionId) {
                        if (timelineFeedback.value !== 'correct') timelineStreak.value = 0;
                        startTimelineRound();
                    }
                }, 5000);
            }
        };

        const resetTimelineGame = () => {
            gameSessionId++;
            stopAudio();
            if (timelineTimer) clearTimeout(timelineTimer);
            timelineStreak.value = 0;
            timelineMysterySong.value = null;
            isLoading.value = false;
        };

        return {
            // State
            timelinePivotYear,
            timelineMysterySong,
            timelineStreak,
            timelineFeedback,
            timelineCorrectAnswer,
            isLoading,
            
            // Methods
            startTimelineRound,
            handleTimelineGuess,
            resetTimelineGame
        };
    }
