<script setup>
import { computed, ref, watch } from 'vue';
import { Music, Disc, SlidersHorizontal, X, Loader2 } from 'lucide-vue-next';
import YearRangeSlider from './YearRangeSlider.vue';
import { tokenize, checkProgress } from '../utils/textUtils';

const showSettings = ref(false);

const props = defineProps({
    song: Object,
    isRevealed: Boolean,
    isPlaying: Boolean,
    progress: Number,
    yearRange: Array,
    minYear: Number,
    maxYear: Number,
    selectedOrigin: String,
    selectedGenres: Array, // or Set if needed, but App passes Array logic
    isLoading: Boolean,
    genres: Array
});
const emit = defineEmits(['update-cover', 'update:yearRange', 'update:selectedOrigin', 'update:selectedGenres', 'found-all']);

// Guessing Logic
const userGuess = ref('');
const feedback = ref(null);
const guessInputRef = ref(null);
const artistFound = ref(false);
const titleFound = ref(false);

const foundTitleIndices = ref(new Set());
const foundArtistIndices = ref(new Set());

// Significant tokens
const tokenizedTitle = computed(() => props.song ? tokenize(props.song.title) : []);
const tokenizedArtist = computed(() => props.song ? tokenize(props.song.artist) : []);

const handleGuess = () => {
    if (!userGuess.value.trim()) return;
    
    const guess = userGuess.value;
    // Feedback & Win Condition
    let turnDiscovery = false;
    let progressMade = false;

    // 1. Check Title Progress
    if (!titleFound.value && tokenizedTitle.value.length > 0) {
        const found = checkProgress(guess, tokenizedTitle.value);
        if (found.length > 0) {
            let newFound = false;
            found.forEach(idx => {
                if (!foundTitleIndices.value.has(idx)) {
                    foundTitleIndices.value.add(idx);
                    newFound = true;
                }
            });
            if (newFound) progressMade = true;

            // Check completion
            if (foundTitleIndices.value.size === tokenizedTitle.value.length) {
                titleFound.value = true;
                turnDiscovery = true; 
                progressMade = true; 
            }
        }
    }

    // 2. Check Artist Progress
    if (!artistFound.value && tokenizedArtist.value.length > 0) {
        const found = checkProgress(guess, tokenizedArtist.value);
        if (found.length > 0) {
             let newFound = false;
            found.forEach(idx => {
                if (!foundArtistIndices.value.has(idx)) {
                    foundArtistIndices.value.add(idx);
                    newFound = true;
                }
            });
            if (newFound) progressMade = true;

             if (foundArtistIndices.value.size === tokenizedArtist.value.length) {
                artistFound.value = true;
                turnDiscovery = true;
                progressMade = true;
            }
        }
    }

    // Feedback Logic
    if (titleFound.value && artistFound.value) {
        feedback.value = { type: 'success' };
        emit('found-all');
    } 
    else if (turnDiscovery) {
        // Just found full Title or full Artist this turn
        feedback.value = { type: 'success' };
    }
    else if (progressMade) {
        // Only found partial words
        feedback.value = { type: 'warning' };
    } 
    else {
        feedback.value = { type: 'error' };
    }

    // Always clear input
    userGuess.value = '';

    // Clear feedback after delay
    setTimeout(() => {
        feedback.value = null;
    }, 1000); // Shorter feedback time since input clears
};

// Reset on new song
watch(() => props.song, () => {
    userGuess.value = '';
    feedback.value = null;
    artistFound.value = false;
    titleFound.value = false;
    foundTitleIndices.value.clear();
    foundArtistIndices.value.clear();
});

// Clear input when revealed (Timer end or Win)
watch(() => props.isRevealed, (newVal) => {
    if (newVal) userGuess.value = '';
});

const toggleGenre = (genre) => {
    const newGenres = [...props.selectedGenres];
    const index = newGenres.indexOf(genre);
    
    if (index === -1) {
        newGenres.push(genre);
    } else {
        newGenres.splice(index, 1);
    }
    
    emit('update:selectedGenres', newGenres);
};

// Reveal logic override UI
const showTitle = computed(() => props.isRevealed || titleFound.value);
const showArtist = computed(() => props.isRevealed || artistFound.value);
const showYear = computed(() => props.isRevealed); 

</script>

<template>
  <div class="player-wrapper glass-panel" :class="{ 'is-revealed': isRevealed }">
    <!-- Ambient Glow Background -->
    <div class="ambient-glow"></div>

    <!-- Vinyl Spin -->
    <div class="vinyl-container">
      <div class="vinyl-record" :class="{ 'spinning': isPlaying && !isLoading }">
        <div class="vinyl-label">
           <Transition name="label-reveal" mode="out-in">
             <div v-if="isLoading" key="loading" class="loader-container">
                 <Loader2 class="animate-spin" size="48" color="white" />
             </div>
             <img v-else-if="song?.cover && isRevealed" :src="song.cover" class="cover-img" key="cover" />
             <Music v-else size="48" color="rgba(255,255,255,0.8)" key="icon" />
           </Transition>
           <!-- Inner Hole -->
           <div class="center-hole"></div>
        </div>
      </div>
    </div>

    <!-- Year Badge (Top Left) -->
    <Transition name="fade">
        <div v-if="showYear" class="year-badge">
            {{ song.year }}
        </div>
    </Transition>

    <!-- Settings Toggle Button (Top Right) -->
    <button class="settings-toggle" @click="showSettings = !showSettings" aria-label="Réglages">
        <SlidersHorizontal size="24" :color="showSettings ? '#000' : '#fff'" />
    </button>
    
    <!-- Settings Panel (Collapsible/Modal) -->
    <Transition name="slide-up">
        <div v-if="showSettings" class="settings-panel glass-panel">
            <div class="panel-header">
                <h3>Réglages</h3>
                <button class="close-btn" @click="showSettings = false">
                    <X size="24" />
                </button>
            </div>
            
            <div class="panel-content">
                <!-- Origin Toggle -->
                <div class="setting-group">
                    <label>Origine</label>
                    <div class="origin-toggle">
                        <button 
                            v-for="opt in [{id: 'all', label: 'Tout'}, {id: 'fr', label: '🇫🇷'}, {id: 'int', label: '🌍'}]"
                            :key="opt.id"
                            class="toggle-btn"
                            :class="{ active: selectedOrigin === opt.id }"
                            @click="emit('update:selectedOrigin', opt.id)"
                        >
                            {{ opt.label }}
                        </button>
                    </div>
                </div>

                <!-- Genre Chips -->
                <div class="setting-group">
                    <label>Genres</label>
                    <div class="genre-chips">
                        <button 
                            v-for="genre in genres" 
                            :key="genre"
                            class="genre-chip"
                            :class="{ active: selectedGenres.includes(genre) }"
                            @click="toggleGenre(genre)"
                        >
                            {{ genre }}
                        </button>
                    </div>
                </div>

                <!-- Year Slider -->
                <div class="setting-group">
                    <label>Période</label>
                    <YearRangeSlider 
                    :min="minYear" 
                    :max="maxYear" 
                    :modelValue="yearRange"
                    @update:modelValue="emit('update:yearRange', $event)"
                    />
                </div>
            </div>
        </div>
    </Transition>

    <!-- Song Info (Hidden or Revealed) -->
    <div class="song-info">
      
      <div class="info-container">
          <!-- Title -->
          <div class="text-wrapper title-wrapper">
              <Transition name="fade" mode="out-in">
                <h2 v-if="showTitle" class="track-title" :class="{ 'found': titleFound }" key="title">{{ song.title }}</h2>
                <h2 v-else class="mystery-title" key="mystery">? ? ?</h2>
              </Transition>
          </div>

          <!-- Artist -->
          <div class="text-wrapper artist-wrapper">
              <Transition name="fade" mode="out-in">
                <p v-if="showArtist" class="track-artist" :class="{ 'found': artistFound }" key="artist">{{ song.artist }}</p>
                <p v-else class="track-artist mystery-artist" key="mystery-artist">???</p>
              </Transition>
          </div>
          
          <div class="timer-spacer"></div>
      </div>
    </div>

    <!-- Timer Bar (Anchored at bottom of card) -->
    <Transition name="fade">
      <div v-if="!isRevealed" class="timer-wrapper anchored">
        <div class="timer-bar mini">
            <div class="timer-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </Transition>
  </div>
    
    <!-- Guess Input Block -->
    <div class="guess-container glass-panel" :class="{ 
        shake: feedback?.type === 'error',
        nudge: feedback?.type === 'warning'
    }">
        <div class="input-wrapper" :class="feedback?.type">
             <input 
                ref="guessInputRef"
                v-model="userGuess" 
                @keyup.enter="handleGuess"
                type="text" 
                placeholder="Devinez le titre ou l'artiste..." 
                :disabled="isRevealed"
             />
             <button @click="handleGuess" :disabled="isRevealed || !userGuess" class="btn-submit">
                OK
             </button>
        </div>
        <!-- Feedback text removed -->
    </div>
</template>

<style scoped>
/* ... existing styles ... */
/* Add Guess Styles */
.guess-container {
    width: 100%;
    max-width: 600px; /* Widened to match Timeline block */
    margin: 1.5rem auto 0 auto;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    /* Match Player Glassmorphism */
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 30px rgba(0,0,0,0.3); /* Subtle, premium shadow */
    border-radius: 20px;
    box-sizing: border-box; 
    /* removed overflow: hidden to allow shadow to bleed */
}

.input-wrapper {
    display: flex;
    gap: 0.5rem;
    width: 100%;
}

.input-wrapper input {
    flex: 1;
    background: rgba(255,255,255,0.2); /* Increased opacity from 0.1 */
    border: 2px solid rgba(255,255,255,0.2); 
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 1rem;
    font-weight: 500; /* Bolder text */
    outline: none;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-wrapper input:disabled {
    background: rgba(0, 0, 0, 0.4);
    opacity: 0.6;
    border-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
}

.input-wrapper input::placeholder {
    color: rgba(255, 235, 205, 0.5); /* Warmer, more transparent (BlanchedAlmond tint) */
    font-weight: 400; /* Lighter weight for placeholder */
}

.input-wrapper input:focus {
    background: rgba(255,255,255,0.25);
    border-color: var(--color-primary);
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}

/* Feedback States on Input */
.input-wrapper.success input {
    border-color: #22c55e;
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
    background: rgba(34, 197, 94, 0.2);
}

.input-wrapper.warning input {
    border-color: #f59e0b;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
    background: rgba(245, 158, 11, 0.2);
}

.input-wrapper.error input {
    border-color: #ef4444;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
    background: rgba(239, 68, 68, 0.2);
}

.btn-submit {
    background: var(--color-primary);
    color: #000;
    font-weight: 800;
    border: none;
    padding: 0 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3); /* Pop out */
}

.btn-submit:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
}

.btn-submit:active { transform: scale(0.95); }
.btn-submit:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
    filter: grayscale(0.8) brightness(0.8); /* Less dull grey */
    transform: none;
    box-shadow: none;
}

.feedback-msg {
    font-size: 0.9rem;
    font-weight: 800;
    text-align: center;
    padding: 4px;
    border-radius: 8px;
    margin-top: 4px;
}

.feedback-msg.success { color: #22c55e; }
.feedback-msg.warning { color: #f59e0b; }
.feedback-msg.error { color: #ef4444; }

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

.nudge {
  animation: nudge 0.3s ease-out both;
}

@keyframes nudge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Fix Info Container layout */
.info-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    min-height: 100px;
    width: 100%; /* Force full width for timer bar */
}
/* Re-use existing styling but adapt margins */
/* Timer Bar Anchored to Bottom */
.timer-wrapper.anchored {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 0;
    margin: 0;
    z-index: 5;
    background: rgba(0,0,0,0.2);
    border-radius: 0 0 24px 24px; /* Manual rounding since parent has no overflow:hidden */
    overflow: hidden; /* Keep fill clipped to wrapper rounding */
}

.timer-spacer {
    height: 10px; /* Space above the mini timer bar to prevent text overlap */
}

.timer-bar.mini { 
    width: 100%; 
    height: 14px; /* Increased from 10px */
    background: rgba(255,255,255,0.1); 
    border-radius: 2px 2px 0 0; /* Slight rounding on top only */
    overflow: hidden;
    box-shadow: none;
    border: none;
}

.timer-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), #fbbf24);
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.6); /* Even stronger glow */
    transition: width 0.1s linear;
}

/* ... existing styles ... */
.player-wrapper {
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2rem 0.5rem 2rem;
  text-align: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden; /* Restored: This handles the internal settings animation */
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  width: 100%;
  box-sizing: border-box;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 24px;
  box-shadow: 0 4px 40px rgba(0,0,0,0.3);
  transition: padding-bottom 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
}

/* Removed faulty .player-content-clip */

.year-badge {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 6px 12px;
    border-radius: 12px;
    font-weight: 800;
    color: #fff;
    font-size: 1rem;
    z-index: 20;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

/* Settings Toggle */
.settings-toggle {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    transition: all 0.2s;
}
.settings-toggle:active { transform: scale(0.9); }

/* Settings Panel Overlay */
.settings-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%; /* Full cover */
    max-height: 100%; 
    background: rgba(10, 10, 10, 0.98); /* Almost fully opaque */
    border-radius: 20px; /* Match wrapper radius */
    z-index: 30;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.05);
    overflow: hidden;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
}

.panel-header h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
    font-family: 'Righteous', sans-serif; /* Match Title Font */
    letter-spacing: 0.05em;
}

.close-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.6);
    padding: 4px;
}

.panel-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    /* Hide Scrollbar */
    scrollbar-width: none; 
    -ms-overflow-style: none;
}
.panel-content::-webkit-scrollbar { 
    display: none; 
}

.setting-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
    width: 100%;
}

.setting-group label {
    font-size: 0.9rem;
    color: var(--color-primary);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Reusing existing styles but scoped to panel */
.origin-toggle {
    display: flex;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 4px; 
    gap: 4px;
    width: 100%;
    justify-content: space-between;
}

.toggle-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.6);
    padding: 8px; 
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s;
    user-select: none;
    -webkit-user-select: none;
}

.toggle-btn.active {
    background: var(--color-primary);
    color: #000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.genre-chips {
    display: flex;
    flex-wrap: wrap; /* Wrap for panel */
    justify-content: flex-start;
    gap: 8px;
    width: 100%;
    /* Remove scrollbar styles and mask as it's now wrapped */
    padding-bottom: 0;
    -webkit-overflow-scrolling: auto;
    mask-image: none;
    -webkit-mask-image: none;
    scrollbar-width: auto;
    -ms-overflow-style: auto;
    padding-left: 0;
    padding-right: 0;
}
.genre-chips::-webkit-scrollbar { 
    display: auto;
}

.genre-chip {
    flex: 0 0 auto; 
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s;
    user-select: none;
    -webkit-user-select: none;
}

.genre-chip.active {
    background: var(--color-primary);
    color: #000;
    border-color: var(--color-primary);
    box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.divider {
    height: 1px;
    background: rgba(255,255,255,0.1);
    width: 100%;
    margin: 0.25rem 0; /* Reduced margins */
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%);
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
  transition: opacity 2s ease, transform 2s ease;
}

.player-wrapper.is-revealed .ambient-glow {
  opacity: 0.4;
  transform: translate(-50%, -50%) scale(1.5);
}

.vinyl-container {
  position: relative;
  z-index: 2;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1.5rem; /* Reduced from 2rem to save space top-side */
}

.vinyl-record {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: 
    repeating-radial-gradient(
      #111 0, 
      #111 2px, 
      #222 3px, 
      #111 4px
    );
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: none;
}

.vinyl-record.spinning {
  animation: spin 3s linear infinite;
}

.vinyl-label {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 4px solid #111;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px); /* Initially blurred cover in label too? Or keep it clean but hidden context? User said "Music Time Machine"... usually you hide cover too in blind tests or use a generic one? The user request said "affiche le nom artiste / son pendant 5sec". It implies visuals are hidden. Let's hide cover or blur heavily until reveal. */
}
/* User requested "Blindtest", usually you don't show cover. 
   But for "Ambiance", maybe we show a generic disc or the blurred cover?
   Let's assume we show the cover ONLY when revealed. Before that, generic icon.
*/
.cover-img {
    filter: none; /* Reset */
}

.center-hole {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #000;
  border-radius: 50%;
  z-index: 10;
}

.song-info {
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
  width: 100%;
  height: 160px; /* Slightly reduced height to keep everything tight */
  justify-content: center; 
  padding-top: 0;
}

/* Fixed Height Wrappers to prevent layout jump during transition */
.text-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.title-wrapper {
    min-height: 4.4rem; /* Tightened for 2 lines */
    margin-bottom: 0;
}

.artist-wrapper {
    min-height: 1.8rem; 
}

.mystery-title {
    font-size: 2.2rem; /* Slightly larger */
    font-weight: 900;
    color: rgba(255,255,255,1); /* Pure white for max visibility */
    letter-spacing: 0.6rem;
    text-shadow: 0 0 30px rgba(0,0,0,1);
    margin: 0; 
    line-height: 1;
}

/* Ensure mystery artist matches track-artist exactly but distinct if needed */
.mystery-artist {
    /* Inherits track-artist but ensure no extra quirks */
    letter-spacing: 0.3rem;
    opacity: 0.9;
    color: #fbbf24; /* Keep it gold but brighter/higher opacity */
    font-size: 1.4rem; /* Larger */
}

.blind-state {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}


/* Text Styles matching Player.vue */
.track-title {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.5rem 0;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8); /* Stronger shadow */
  
  /* Truncation */
  display: -webkit-box;
  -webkit-line-clamp: 2; /* Max 2 lines */
  line-clamp: 2;         /* Standard property */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.track-title.found {
    color: #4ade80; /* Brighter Green */
    text-shadow: 0 0 15px rgba(74, 222, 128, 0.5);
}

.track-artist {
  font-size: 1.2rem;
  color: var(--color-primary); /* Gold */
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}

.track-artist.found {
    color: #4ade80; /* Same Green */
    text-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
}

.track-year {
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255,255,255,0.95); /* More opaque */
  background: rgba(0, 0, 0, 0.4); /* Darker background */
  border: 1px solid rgba(255,255,255,0.2);
  padding: 6px 14px;
  border-radius: 20px;
  display: inline-block;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6); /* Added shadow */
}

/* Consolidated timer styles above */

@keyframes spin-blind {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-record.spinning {
  animation: spin-blind 6s linear infinite;
}

/* Consolidated timer-fill above */

/* Transitions */
.label-reveal-enter-active,
.label-reveal-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.label-reveal-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.label-reveal-leave-to {
  opacity: 0;
  transform: scale(1.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Slide Up Transition for Panel */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
