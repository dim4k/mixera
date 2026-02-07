import { ref, watch } from 'vue';
import hitsterDb from '../data/hitster-db.json';
import { fetchDeezerTrack } from '../services/deezerService';
import { useAudio } from './useAudio';

const memoryHistory = ref([]);
const memoryBestScore = ref(0); // Lower moves is better, or solved count? Let's say pairs solved.

// Global State (Singleton)
const cards = ref([]); 
const gameState = ref('idle'); // 'idle', 'loading', 'playing', 'won'
const moves = ref(0);
const matchedPairs = ref(0);
const isLoading = ref(false);
const error = ref(null);
const currentPlayingTrack = ref(null);

// Internal Global
const flippedCards = ref([]); // [cardIndex1, cardIndex2]
let lockBoard = false;
let gameSessionId = 0;

export function useMemoryGame() {
    const { playAudio, stopAudio, fadeOutAudio } = useAudio();

    // --- Helpers ---

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    /**
     * Gets 6 unique random songs from 6 DIFFERENT artists
     */
    const getGamePairs = async () => {
        // Group by artist
        const byArtist = {};
        Object.values(hitsterDb).forEach(song => {
            if (!byArtist[song.artist]) byArtist[song.artist] = [];
            byArtist[song.artist].push(song);
        });

        // Filter artists with valid songs and shuffle artists
        const artists = Object.keys(byArtist).filter(a => byArtist[a].length > 0);
        const shuffledArtists = shuffleArray(artists);

        // Pick top 6 artists
        const selectedArtists = shuffledArtists.slice(0, 6);
        const selection = [];

        for (const artist of selectedArtists) {
            // Pick rand song for this artist
            const songs = byArtist[artist];
            const song = songs[Math.floor(Math.random() * songs.length)];
            
            // We need Deezer data (preview url + cover)
            try {
                const trackData = await fetchDeezerTrack(song);
                selection.push(trackData);
            } catch (e) {
                console.warn(`Failed to load track for ${artist}, skipping.`);
            }
        }

        return selection;
    };

    // --- Actions ---

    const initMemoryGame = async () => {
        gameSessionId++;
        const currentSession = gameSessionId;
        
        isLoading.value = true;
        gameState.value = 'loading';
        error.value = null;
        cards.value = [];
        moves.value = 0;
        matchedPairs.value = 0;
        flippedCards.value = [];
        lockBoard = false;
        stopAudio();

        try {
            const tracks = await getGamePairs();
            
            if (currentSession !== gameSessionId) return;

            if (tracks.length < 6) {
                // Should not happen with large DB, but fallback logic could be added
                throw new Error("Pas assez de morceaux trouvés. Réessayez.");
            }

            // Pair Colors Palette
            const PAIR_COLORS = [
                '#e74c3c', // Red
                '#3498db', // Blue
                '#2ecc71', // Green
                '#9b59b6', // Purple
                '#f1c40f', // Yellow
                '#e67e22', // Orange
                '#1abc9c', // Teal
                '#e91e63'  // Pink
            ];

            // Create Pair Cards
            const deck = [];
            tracks.forEach((track, index) => {
                const pairColor = PAIR_COLORS[index % PAIR_COLORS.length];

                // Card 1: Artist
                deck.push({
                    id: `artist-${index}`,
                    pairId: index, 
                    type: 'artist',
                    content: track.artist.name || track.artist,
                    color: pairColor,
                    isFlipped: false,
                    isMatched: false
                });

                // Card 2: Song
                deck.push({
                    id: `song-${index}`,
                    pairId: index,
                    type: 'song',
                    content: track,
                    color: pairColor,
                    isFlipped: false,
                    isMatched: false
                });
            });

            cards.value = shuffleArray(deck);
            isLoading.value = false;
            gameState.value = 'playing';

        } catch (e) {
            console.error("Memory Init Error", e);
            error.value = "Erreur de chargement du jeu.";
            isLoading.value = false;
        }
    };

    const flipCard = (index) => {
        if (lockBoard) return;
        if (gameState.value !== 'playing') return;
        
        const card = cards.value[index];
        if (card.isFlipped || card.isMatched) return;

        // Visual Flip
        card.isFlipped = true;
        flippedCards.value.push(index);

        // Audio Logic
        if (card.type === 'song') {
            currentPlayingTrack.value = card.content; // Expose for Background
            playAudio(card.content.preview, 500); // 500ms fade in
        } else if (flippedCards.value.length === 2) {
             // If we just flipped an artist as the 2nd card, 
             // and the 1st was a song, keep audio. 
             // IF the 1st was also artist, no audio needed.
        }

        // Check Match
        if (flippedCards.value.length === 2) {
            checkForMatch();
        }
    };

    const checkForMatch = () => {
        lockBoard = true;
        const [idx1, idx2] = flippedCards.value;
        const card1 = cards.value[idx1];
        const card2 = cards.value[idx2];
        
        moves.value++;

        const isMatch = card1.pairId === card2.pairId;

        if (isMatch) {
            disableCards(idx1, idx2);
        } else {
            unflipCards(idx1, idx2);
        }
    };

    const disableCards = (idx1, idx2) => {
        cards.value[idx1].isMatched = true;
        cards.value[idx1].isFlipped = true; // Ensure visual state remains flipped
        cards.value[idx2].isMatched = true;
        cards.value[idx2].isFlipped = true; // Ensure visual state remains flipped
        matchedPairs.value++;
        
        flippedCards.value = [];
        lockBoard = false;

        // Keep audio playing for a bit if a song was involved? 
        // Or cut it? Let's let it play for reward.
        // Actually, logic says if 12 cards, 6 pairs.
        if (matchedPairs.value === 6) {
            handleWin();
        } else {
            // Fade out audio after 10s if not won immediately
            setTimeout(() => {
                 fadeOutAudio(2000);
            }, 10000);
        }
    };

    const unflipCards = (idx1, idx2) => {
        // Wait user to see
        setTimeout(() => {
            cards.value[idx1].isFlipped = false;
            cards.value[idx2].isFlipped = false;
            
            flippedCards.value = [];
            lockBoard = false;
            
            // Cut Audio on mismatch
            fadeOutAudio(500);
        }, 1200);
    };

    const handleWin = () => {
        gameState.value = 'won';
        // Confetti logic could go here in UI
        stopAudio();
    };

    const resetMemoryGame = () => {
        stopAudio();
        gameState.value = 'idle'; // Reset state to idle
    };

    return {
        cards,
        gameState,
        moves,
        isLoading,
        error,
        currentPlayingTrack,
        initMemoryGame,
        flipCard,
        resetMemoryGame
    };
}
