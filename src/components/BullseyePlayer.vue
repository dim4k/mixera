<script setup>
import { ref, computed, watch } from 'vue';
import { Music, Target, Loader2, Trophy, ArrowRight } from 'lucide-vue-next';
import SingleYearSlider from './SingleYearSlider.vue';

const props = defineProps({
    song: Object,
    isRevealed: Boolean,
    progress: Number,
    isLoading: Boolean,
    totalScore: Number,
    bestScore: Number,
    lastPoints: Number
});

const emit = defineEmits(['submit-guess', 'next-song']);

const scoreColor = computed(() => {
    if (props.lastPoints === 100) return '#4ade80';
    if (props.lastPoints === 50) return '#fbbf24';
    if (props.lastPoints === 20) return '#60a5fa';
    return '#ef4444';
});

const guessedYear = ref(1990);
const isDraggingYear = ref(false);

const handleConfirm = () => {
    emit('submit-guess', guessedYear.value);
};

// watch(() => props.song, () => {
//     guessedYear.value = 1990;
// });
</script>

<template>
  <div class="bullseye-player glass-panel" :class="{ 'is-revealed': isRevealed }">
    <!-- Header Scores -->
    <div class="score-header">
        <div class="score-item best">
            <Trophy size="16" />
            <span>Best: {{ bestScore }}</span>
        </div>
        <div class="score-item current">
            <Target size="16" />
            <span>Score: {{ totalScore }}</span>
        </div>
    </div>

    <!-- Main Player Content with Keyed Transition -->
    <Transition name="song-change" mode="out-in">
      <div :key="song?.id || 'empty'" class="player-content-inner">
        <!-- Vinyl -->
        <div class="vinyl-container">
          <div class="vinyl-record" :class="{ 'spinning': !isLoading && !isRevealed }">
            <div class="vinyl-label">
               <Transition name="label-reveal" mode="out-in">
                 <div v-if="isLoading" key="loading" class="loader-container">
                     <Loader2 class="animate-spin" size="48" color="white" />
                 </div>
                 <img v-else-if="song?.cover" :src="song.cover" class="cover-img" key="cover" />
                 <Music v-else size="48" color="rgba(255,255,255,0.8)" key="icon" />
               </Transition>
               <div class="center-hole"></div>
            </div>
          </div>
        </div>

        <!-- Info Block -->
        <div class="song-info">
          <div class="text-wrapper title-wrapper">
              <h2 class="track-title">{{ song?.title || 'Chargement...' }}</h2>
          </div>
          <div class="text-wrapper artist-wrapper">
              <p class="track-artist">{{ song?.artist || '...' }}</p>
          </div>
        </div>

        <!-- Action Area with fixed height -->
        <div class="action-area">
            <Transition name="fade" mode="out-in">
                <div v-if="!isRevealed" class="guess-phase" key="guess">
                    <div class="timer-bar">
                        <div class="timer-fill" :style="{ width: progress + '%' }"></div>
                    </div>
                    
                    <div class="interactive-controls">
                        <div class="year-selector-block">
                            <label>Choisissez l'année :</label>
                            <SingleYearSlider 
                                v-model="guessedYear" 
                                :min="1950" :max="2025"
                                @drag-start="isDraggingYear = true"
                                @drag-end="isDraggingYear = false"
                            />
                            <button @click="handleConfirm" class="btn-confirm-year">
                                 VALIDER L'ANNÉE
                            </button>
                        </div>
                    </div>
                </div>

                <div v-else class="result-phase" key="result">
                    <div class="result-points" :style="{ color: scoreColor }">
                        <span v-if="lastPoints > 0">+{{ lastPoints }} PTS</span>
                        <span v-else>PAS DE POINTS</span>
                    </div>
                    <div class="actual-year">
                        Année réelle : <strong>{{ song?.year }}</strong>
                    </div>
                    <button @click="$emit('next-song')" class="btn-next">
                        SUIVANT <ArrowRight size="20" />
                    </button>
                </div>
            </Transition>
        </div>
      </div>
    </Transition>

    <!-- Drag Overlay Teleport -->
    <Teleport to="body">
        <Transition name="pop">
            <div v-if="isDraggingYear" class="drag-overlay">
                <span class="drag-year">{{ guessedYear }}</span>
            </div>
        </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.bullseye-player {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
}

.score-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 0.5rem;
}

.score-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255,255,255,0.1);
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 800;
    font-size: 0.9rem;
}
.score-item.best { border: 1px solid rgba(251, 191, 36, 0.4); color: #fbbf24; }
.score-item.current { border: 1px solid rgba(255,255,255,0.2); }

.vinyl-container {
    width: 220px;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.vinyl-record {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: repeating-radial-gradient(#111 0, #111 2px, #222 3px, #111 4px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.vinyl-record.spinning { animation: spin 4s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.vinyl-label {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--color-primary);
    position: relative;
    overflow: hidden;
    border: 3px solid #111;
    display: flex;
    align-items: center;
    justify-content: center;
}
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.center-hole { position: absolute; width: 10px; height: 10px; background: #000; border-radius: 50%; }

.song-info {
    text-align: center;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.track-title { 
    font-size: 1.6rem; 
    font-weight: 800; 
    color: #fff; 
    margin: 0;
    
    /* Truncate after 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}
.track-title.found { color: #4ade80; }
.track-artist { font-size: 1.1rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; margin: 0.5rem 0 0 0; }
.track-artist.found { color: #4ade80; }
.mystery-title { font-size: 2rem; color: rgba(255,255,255,0.3); letter-spacing: 0.5rem; }
.mystery-artist { opacity: 0.4; }

.action-area { width: 100%; height: 240px; display: flex; flex-direction: column; justify-content: flex-start; }

.guess-phase, .result-phase { 
    display: flex; 
    flex-direction: column; 
    gap: 1.5rem; 
    width: 100%;
}

.player-content-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
}

.timer-bar { 
    width: 100%; 
    height: 14px; 
    background: rgba(0, 0, 0, 0.3); 
    border-radius: 7px; 
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
    margin-bottom: 0.5rem;
}
.timer-fill { 
    height: 100%; 
    background: linear-gradient(90deg, #f59e0b, #ef4444); 
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
    transition: width 0.1s linear; 
}


.year-selector-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}
.year-selector-block label { font-size: 0.9rem; font-weight: 700; color: #fbbf24; }

.btn-confirm-year {
    width: 100%;
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #000;
    font-weight: 900;
    padding: 14px;
    border-radius: 12px;
    border: none;
    box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
}

.result-phase {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding-top: 0.5rem;

}
.result-points { font-size: 2rem; font-weight: 900; filter: drop-shadow(0 0 20px currentColor); display: flex; flex-direction: column; align-items: center; text-align: center; }

.actual-year { font-size: 1.2rem; }
.actual-year strong { color: #fbbf24; font-size: 1.8rem; }

.btn-next {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 12px 30px;
    border-radius: 30px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-weight: 800;
}

/* Drag Overlay */
.drag-overlay {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    padding: 1.5rem 2.5rem;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 10000;
}
.drag-year { font-size: 4rem; font-weight: 900; color: #fbbf24; }

.pop-enter-active, .pop-leave-active { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Song Change Transition */
.song-change-enter-active,
.song-change-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.song-change-enter-from {
  opacity: 0;
  transform: translateY(10px);
  filter: blur(5px);
}

.song-change-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  filter: blur(5px);
}
</style>
