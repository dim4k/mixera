<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Music, SlidersHorizontal, X, Loader2 } from "lucide-vue-next";
import YearRangeSlider from "./YearRangeSlider.vue";
import { tokenize, checkProgress } from "../utils/textUtils";
import type { Song } from "../types";

const showSettings = ref(false);

const props = defineProps<{
  song: Song | null;
  isRevealed: boolean;
  isPlaying: boolean;
  progress: number;
  yearRange: number[]; // [min, max]
  minYear: number;
  maxYear: number;
  selectedOrigin: string;
  selectedGenres: string[];
  isLoading: boolean;
  genres: string[];
}>();

const emit = defineEmits<{
  (e: "update-cover", cover: string): void;
  (e: "update:yearRange", range: number[]): void;
  (e: "update:selectedOrigin", origin: string): void;
  (e: "update:selectedGenres", genres: string[]): void;
  (e: "found-all"): void;
}>();

// Guessing Logic
const userGuess = ref("");
const feedback = ref<{ type: "success" | "warning" | "error" } | null>(null);
const guessInputRef = ref<HTMLInputElement | null>(null);
const artistFound = ref(false);
const titleFound = ref(false);

const foundTitleIndices = ref(new Set<number>());
const foundArtistIndices = ref(new Set<number>());

// Significant tokens
const tokenizedTitle = computed(() =>
  props.song ? tokenize(props.song.title) : [],
);
const tokenizedArtist = computed(() =>
  props.song ? tokenize(props.song.artist) : [],
);

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
      found.forEach((idx) => {
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
      found.forEach((idx) => {
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
    feedback.value = { type: "success" };
    emit("found-all");
  } else if (turnDiscovery) {
    // Just found full Title or full Artist this turn
    feedback.value = { type: "success" };
  } else if (progressMade) {
    // Only found partial words
    feedback.value = { type: "warning" };
  } else {
    feedback.value = { type: "error" };
  }

  // Always clear input
  userGuess.value = "";

  // Clear feedback after delay
  setTimeout(() => {
    feedback.value = null;
  }, 1000); // Shorter feedback time since input clears
};

// Reset on new song
watch(
  () => props.song,
  () => {
    userGuess.value = "";
    feedback.value = null;
    artistFound.value = false;
    titleFound.value = false;
    foundTitleIndices.value.clear();
    foundArtistIndices.value.clear();
  },
);

// Clear input when revealed (Timer end or Win)
watch(
  () => props.isRevealed,
  (newVal) => {
    if (newVal) userGuess.value = "";
  },
);

const toggleGenre = (genre: string) => {
  const newGenres = [...props.selectedGenres];
  const index = newGenres.indexOf(genre);

  if (index === -1) {
    newGenres.push(genre);
  } else {
    newGenres.splice(index, 1);
  }

  emit("update:selectedGenres", newGenres);
};

// Reveal logic override UI
const showTitle = computed(() => props.isRevealed || titleFound.value);
const showArtist = computed(() => props.isRevealed || artistFound.value);
const showYear = computed(() => props.isRevealed);
</script>

<template>
  <div class="player-root">
    <div
      class="player-panel blindtest-player"
      :class="{ 'is-revealed': isRevealed }"
    >
      <!-- Settings Toggle Button (Top Right) -->
      <button
        class="settings-toggle"
        @click="showSettings = !showSettings"
        aria-label="Réglages"
      >
        <SlidersHorizontal :size="24" :color="showSettings ? '#000' : '#fff'" />
      </button>

      <!-- Year Badge (Top Left) -->
      <Transition name="fade">
        <div v-if="showYear && song" class="year-badge">
          {{ song.year }}
        </div>
      </Transition>

      <!-- Settings Panel (Collapsible/Modal) -->
      <Transition name="slide-up">
        <div v-if="showSettings" class="settings-panel glass-panel">
          <div class="panel-header">
            <h3>Réglages</h3>
            <button class="close-btn" @click="showSettings = false">
              <X :size="24" />
            </button>
          </div>

          <div class="panel-content">
            <!-- Origin Toggle -->
            <div class="setting-group">
              <label>Origine</label>
              <div class="origin-toggle">
                <button
                  v-for="opt in [
                    { id: 'all', label: 'Tout' },
                    { id: 'fr', label: '🇫🇷' },
                    { id: 'int', label: '🌍' },
                  ]"
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

      <!-- Main Player Content -->
      <div class="player-content-inner">
        <!-- Vinyl -->
        <div class="vinyl-container">
          <div
            class="vinyl-record"
            :class="{ spinning: isPlaying && !isLoading }"
          >
            <div class="vinyl-label">
              <Transition name="label-reveal" mode="out-in">
                <div v-if="isLoading" key="loading" class="loader-container">
                  <Loader2 class="animate-spin" :size="48" color="white" />
                </div>
                <img
                  v-else-if="song?.cover && isRevealed"
                  :src="song.cover"
                  class="cover-img"
                  key="cover"
                />
                <Music
                  v-else
                  :size="48"
                  color="rgba(255,255,255,0.8)"
                  key="icon"
                />
              </Transition>
              <!-- Inner Hole -->
              <div class="center-hole"></div>
            </div>
          </div>
        </div>

        <!-- Song Info Block -->
        <div class="song-info">
          <div class="text-wrapper title-wrapper">
            <Transition name="fade" mode="out-in">
              <h2
                v-if="showTitle"
                class="track-title"
                :class="{ found: titleFound }"
                key="title"
              >
                {{ song?.title }}
              </h2>
              <h2 v-else class="mystery-title" key="mystery">? ? ?</h2>
            </Transition>
          </div>
          <div class="text-wrapper artist-wrapper">
            <Transition name="fade" mode="out-in">
              <p
                v-if="showArtist"
                class="track-artist"
                :class="{ found: artistFound }"
                key="artist"
              >
                {{ song?.artist }}
              </p>
              <p
                v-else
                class="track-artist mystery-artist"
                key="mystery-artist"
              >
                ???
              </p>
            </Transition>
          </div>
        </div>

        <!-- Action Area (Fixed Height like Bullseye) -->
        <div class="action-area">
          <!-- Timer Bar -->
          <div class="timer-bar" :class="{ 'timer-hidden': isRevealed }">
            <div class="timer-fill" :style="{ width: progress + '%' }"></div>
          </div>

          <!-- Guess Input -->
          <div
            class="guess-controls"
            :class="{
              shake: feedback?.type === 'error',
              nudge: feedback?.type === 'warning',
            }"
          >
            <div class="input-wrapper" :class="feedback?.type">
              <input
                ref="guessInputRef"
                v-model="userGuess"
                @keyup.enter="handleGuess"
                type="text"
                placeholder="Devinez le titre ou l'artiste..."
                :disabled="isRevealed"
              />
              <button
                @click="handleGuess"
                :disabled="isRevealed || !userGuess"
                class="btn-submit"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Only Blindtest-specific styles */

/* Override for settings button positioning */
.blindtest-player {
  overflow: hidden;
} /* Clip settings panel animation */

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.center-hole {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #000;
  border-radius: 50%;
}

.text-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.title-wrapper {
  min-height: 4rem;
}
.artist-wrapper {
  min-height: 2rem;
}

.track-title.found {
  color: #4ade80;
}
.track-artist.found {
  color: #4ade80;
}

.mystery-title {
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5rem;
  margin: 0;
}
.mystery-artist {
  opacity: 0.4;
  letter-spacing: 0.3rem;
}

/* Timer Bar - Blindtest specific styling */
.timer-bar {
  width: 100%;
  height: 14px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transition: opacity 0.3s ease;
}
.timer-bar.timer-hidden {
  opacity: 0;
}
.timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
  transition: width 0.1s linear;
}

/* Guess Controls */
.guess-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.input-wrapper {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.input-wrapper input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s ease;
}
.input-wrapper input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}
.input-wrapper input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
}
.input-wrapper input:disabled {
  background: rgba(0, 0, 0, 0.3);
  opacity: 0.5;
  cursor: not-allowed;
}

/* Feedback States */
.input-wrapper.success input {
  border-color: #22c55e;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
}
.input-wrapper.warning input {
  border-color: #f59e0b;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
}
.input-wrapper.error input {
  border-color: #ef4444;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
}

.btn-submit {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #000;
  font-weight: 900;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-submit:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}
.btn-submit:active {
  transform: scale(0.95);
}
.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
  transform: none;
}

/* Shake/Nudge Animations */
.shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
.nudge {
  animation: nudge 0.3s ease-out both;
}
@keyframes nudge {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}
@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}

/* Year Badge */
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
}

/* Settings Toggle */
.settings-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: all 0.2s;
}
.settings-toggle:active {
  transform: scale(0.9);
}

/* Settings Panel */
.settings-panel {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 10, 0.98);
  border-radius: 20px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
}
.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 4px;
}
.panel-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
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
}

/* Settings Controls */
.origin-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  width: 100%;
}
.toggle-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}
.toggle-btn.active {
  background: var(--color-primary);
  color: #000;
}

.genre-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
.genre-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}
.genre-chip.active {
  background: var(--color-primary);
  color: #000;
  border-color: var(--color-primary);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
