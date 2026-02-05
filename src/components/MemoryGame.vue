<template>
  <div class="memory-game" v-if="gameState !== 'idle'">
    
    <!-- Header / Stats -->
    <div class="game-header" v-if="!isLoading">
      <div class="stat-badge">
        <span class="label">COUPS</span>
        <span class="value">{{ moves }}</span>
      </div>
      <button class="btn-reset" @click="resetGame">
        <RotateCcw :size="16" />
        Rejouer
      </button>
    </div>

    <!-- Loading / Error -->
    <div v-if="isLoading || error" class="loading-state">
      <div v-if="error" class="error-container">
        <p class="error-msg">😕 Oups ! {{ error }}</p>
        <button class="btn-primary" @click="retryGame">
            <RotateCcw :size="18" style="margin-right: 8px" />
            Réessayer
        </button>
      </div>
      <div v-else class="loading-content">
          <div class="spinner"></div>
          <p class="loading-text">Préparation du plateau...</p>
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="cards-grid" :class="{ 'won': gameState === 'won' }">
      <div 
        v-for="(card, index) in cards" 
        :key="card.id"
        class="card-container"
        :class="{ 'flipped': card.isFlipped || card.isMatched, 'matched': card.isMatched }"
        @click="handleCardClick(index)"
      >
        <div class="card-inner">
          
          <!-- FACE CACHÉE (Back) -->
          <div class="card-back">
            <div class="card-type-indicator">
                <span v-if="card.type === 'artist'">🎤</span>
                <span v-else>🎵</span>
            </div>
            <div class="logo-small">MixEra</div>
          </div>

          <!-- FACE VISIBLE (Front) -->
          <div 
            class="card-front" 
            :class="[card.type, { 'has-color': !!card.color }]"
            :style="card.isMatched ? { 
                border: `4px solid ${card.color}`,
                backgroundColor: `${card.color}40`,
                boxShadow: `0 0 20px ${card.color}60`
            } : {}"
          >
            
            <!-- CONTENU ARTISTE -->
            <div 
                v-if="card.type === 'artist'" 
                class="content-artist"
                :style="{ color: card.color }"
            >
              <span class="icon">🎤</span>
              <span class="text">{{ card.content }}</span>
            </div>

            <!-- CONTENU CHANSON -->
            <div v-if="card.type === 'song'" class="content-song">
              <div class="cover-wrapper">
                 <img :src="card.content.cover" alt="Cover" class="cover-img" />
                 <div class="play-overlay">▶</div>
              </div>
              <!-- On cache le titre pour la difficulté, ou on le met ? 
                   Le but est d'associer Artiste <-> Son. Si on met le titre, c'est trop facile si on connait le titre.
                   Mais visuellement c'est joli. On va laisser juste la cover pour l'instant. -->
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Win Screen overlay -->
    <div v-if="gameState === 'won'" class="win-overlay">
      <h2>🎉 BRAVO !</h2>
      <p>Tu as terminé en {{ moves }} coups.</p>
      <button class="btn-primary" @click="resetGame">Rejouer</button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useMemoryGame } from '../composables/useMemoryGame';
import { RotateCcw } from 'lucide-vue-next';

const { 
  cards, 
  gameState, 
  moves, 
  isLoading,
  error, 
  initMemoryGame, 
  flipCard,
  resetMemoryGame 
} = useMemoryGame();

const handleCardClick = (index) => {
  flipCard(index);
};

const resetGame = () => {
    initMemoryGame();
};

const retryGame = () => {
    initMemoryGame();
};

onMounted(() => {
    initMemoryGame();
});

onUnmounted(() => {
    resetMemoryGame(); // Cleanup audio
});
</script>

<style scoped>
.memory-game {
  width: 100%;
  max-width: 600px; /* Mobile first constraint limit */
  margin: 0 auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.stat-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 5px 15px;
  border-radius: 20px;
  font-weight: bold;
  display: flex;
  gap: 10px;
}
.stat-badge .label { color: #aaa; font-size: 0.8em; text-transform: uppercase; }
.stat-badge .value { color: #fff; }

.btn-reset {
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}
.btn-reset:hover {
    background: rgba(255,255,255,0.1);
}

/* GRID LAYOUT */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 colonnes fixes */
  gap: 10px;
  perspective: 1000px; /* For 3D Flip */
  flex-grow: 1; /* take remaining height */
  align-content: start;
}

/* CARD CONTAINER & FLIP LOGIC */
.card-container {
  aspect-ratio: 1/1; /* Square cards for album covers */
  cursor: pointer;
  position: relative;
  transition: transform 0.1s;
}
.card-container:active { transform: scale(0.95); }

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-container.flipped .card-inner,
.card-container.matched .card-inner {
  transform: rotateY(180deg);
}

.card-container.matched .card-inner {
    opacity: 0.6; /* Dim matched cards as requested */
    filter: grayscale(0.5); /* Optional: desaturate slightly to imply "done" */
}

/* Add border to matched cards fronts - Handled via inline style now for dynamic color */
/* Empty rule removed */

/* 3D Flip Core */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-front, .card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  -webkit-backface-visibility: hidden; /* Safari */
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

/* GLOBAL BOX SIZING FOR CARDS */
.card-inner, .card-front, .card-back {
    box-sizing: border-box;
}

/* FACE CACHÉE (Dos) - Glassmorphism */
.card-back {
  background: linear-gradient(135deg, rgba(30, 42, 58, 0.7) 0%, rgba(44, 62, 80, 0.7) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  color: #fff;
  flex-direction: column;
  transform: rotateY(0deg);
  /* "Real Card" feel: simple pattern or texture */
  background-image: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
}
.card-back::after {
    content: '';
    position: absolute;
    inset: 4px; /* Inner border */
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    pointer-events: none;
}
.card-back .logo-small {
    margin-top: 8px;
    font-size: 0.8em;
    font-weight: 600;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.8);
    background: -webkit-linear-gradient(45deg, #FFD700, #FDB931);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* FACE VISIBLE (Devant) - Hidden initially (180deg) */
.card-front {
  background: white;
  color: #222;
  transform: rotateY(180deg);
  overflow: hidden;
  /* Ensure border doesn't shift layout */
  border: 0px solid transparent; 
  transition: border-width 0.1s, background-color 0.2s;
}

/* NUCLEAR OPTION FOR MATCHED CARDS */
.card-container.matched .card-inner {
    transform: none !important;
}
.card-container.matched .card-back {
    display: none !important;
}
.card-container.matched .card-front {
    transform: none !important;
    z-index: 10 !important;
    opacity: 1 !important; /* Fully visible to show color */
    filter: none !important;
    /* We will use background tint for visibility via inline style */
}

/* ARTIST STYLE */
.card-front.artist {
  background: #fff; 
  /* Removing border that might bleed. Using box-shadow or inset border via :style */
}
.content-artist {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px;
}
.content-artist .icon { font-size: 1.5em; margin-bottom: 5px; opacity: 0.5; }
.content-artist .text { 
    font-weight: 900; 
    text-transform: uppercase; 
    line-height: 1.1; 
    font-size: 0.9rem; /* Adapt to small mobile cards */
    word-break: break-word;
}

/* SONG STYLE */
.card-front.song {
  background: #e74c3c;
  padding: 0;
  border: 0;
}
.content-song {
    width: 100%;
    height: 100%;
    position: relative;
}
.cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.play-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2em;
    color: white;
}

/* WIN/LOADING */
/* LOADING / WIN SCREEN */
.loading-state {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    text-align: center;
    min-height: 300px; /* Ensure space if empty */
}
/* Win Overlay stays absolute to cover grid */
.win-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(10, 15, 30, 0.95);
    z-index: 20;
    color: white;
    text-align: center;
    backdrop-filter: blur(10px);
}

.loading-content, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.5s ease-out;
}

.loading-text {
    font-family: 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: 1.2em;
    font-weight: 300;
    letter-spacing: 1px;
    margin-top: 15px;
    opacity: 0.8;
}

.error-msg {
    font-size: 1.1em;
    color: #ff6b6b;
    margin-bottom: 20px;
    background: rgba(0,0,0,0.3);
    padding: 10px 20px;
    border-radius: 12px;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.spinner {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #FFD700, #FDB931);
    -webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>') no-repeat center / contain;
    mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>') no-repeat center / contain;
    animation: pulse 1.5s ease-in-out infinite;
    margin-bottom: 20px;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

@keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px #FFD700); }
    100% { transform: scale(0.95); opacity: 0.8; }
}

/* FACE CACHÉE (Dos) - Textured Glass */
.card-back {
  /* Dark base + Texture + Gradient */
  background: 
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 60%), /* Top Gloss Light */
    repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px),
    linear-gradient(135deg, rgba(30, 42, 58, 0.95) 0%, rgba(44, 62, 80, 0.95) 100%);
  
  border: 1px solid rgba(255,255,255,0.2);
  /* Glossy Inset Shadow + Drop Shadow */
  box-shadow: 
    inset 0 1px 0 rgba(255,255,255,0.2), 
    inset 0 0 20px rgba(0,0,0,0.2),
    0 4px 8px rgba(0,0,0,0.4);
    
  color: #fff;
  flex-direction: column;
  transform: rotateY(0deg);
}

.btn-primary {
    background: #e74c3c;
    border: none;
    padding: 10px 25px;
    color: white;
    border-radius: 25px;
    font-size: 1.1em;
    margin-top: 15px;
    cursor: pointer;
}

/* Responsive Tweak for very small screens */
@media (max-width: 350px) {
    .cards-grid { gap: 5px; }
    .content-artist .text { font-size: 0.75rem; }
}
</style>
