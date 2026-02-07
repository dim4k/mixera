<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Play,
  Pause,
  Loader2,
  Eye,
  EyeOff,
  ScanLine,
} from "lucide-vue-next";
import type { Song } from "../types";
import { fetchDeezerTrack } from "../services/deezerService";

// Props
const props = defineProps<{
  song: Song;
  isPlaying: boolean;
  audioError: string | null;
}>();

// Emits
const emit = defineEmits<{
  (e: "back"): void;
  (e: "play-request", resource: string, type: "youtube" | "audio"): void;
  (e: "toggle-play"): void;
  (e: "set-error", error: string | null): void;
  (e: "update-cover", cover: string): void;
}>();

// State
const isLoading = ref(true);
const isRevealed = ref(false);
const trackInfo = ref<Song | null>(null);

// Watch Song Change
watch(
  () => props.song,
  async (newSong) => {
    if (!newSong) return;

    // Reset State
    isLoading.value = true;
    isRevealed.value = false;
    trackInfo.value = null;
    emit("set-error", null);

    // If song has immediate info (e.g. from Scanner if enhanced), use it
    // But usually scanner gives basic info, need Deezer for cover/preview

    try {
      const data = await fetchDeezerTrack(newSong);
      trackInfo.value = data;

      if (data.cover) emit("update-cover", data.cover);

      if (data.preview) {
        emit("play-request", data.preview, "audio");
      } else {
        handleFallback();
      }
    } catch (e) {
      console.error("Deezer fetch failed", e);
      handleFallback();
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true },
);

const handleFallback = () => {
  if (props.song.youtubeId) {
    // Use props.song info for display since we failed to get enhanced info
    trackInfo.value = {
      ...props.song,
      cover: `https://img.youtube.com/vi/${props.song.youtubeId}/hqdefault.jpg`,
      preview: "",
    };
    emit("play-request", props.song.youtubeId, "youtube");
    if (trackInfo.value.cover) emit("update-cover", trackInfo.value.cover);
  } else {
    emit("set-error", "Extrait introuvable (Deezer & YouTube).");
  }
};

// Controls
const togglePlay = () => emit("toggle-play");
const toggleReveal = () => (isRevealed.value = !isRevealed.value);

// Error Handling Watcher
watch([() => props.audioError, trackInfo], ([err, info]) => {
  if (err && err.includes("YouTube") && info?.preview) {
    // If YouTube failed but we have preview, try it?
    // Logic collision: usually we try Deezer first.
    // But if we fell back to YouTube and then THAT failed, we are out of luck.
  }
});
</script>

<template>
  <div class="player-root">
    <div class="player-panel">
      <!-- Header Removed -->

      <!-- Main Player Content -->
      <div class="player-content-inner">
        <!-- Vinyl -->
        <div class="vinyl-container" @click="togglePlay">
          <div class="vinyl-record" :class="{ spinning: isPlaying }">
            <!-- Label Background -->
            <div class="vinyl-label">
              <div
                class="label-bg"
                :class="{ blurred: !isRevealed }"
                :style="
                  trackInfo?.cover
                    ? { backgroundImage: `url(${trackInfo.cover})` }
                    : {}
                "
              ></div>

              <!-- Overlay -->
              <div
                class="control-overlay"
                :class="{ 'show-overlay': !isPlaying }"
              >
                <Loader2
                  v-if="isLoading"
                  class="animate-spin"
                  color="white"
                  :size="32"
                />
                <component
                  v-else
                  :is="isPlaying ? Pause : Play"
                  fill="white"
                  color="white"
                  :size="32"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Song Info -->
        <div class="song-info">
          <div v-if="isLoading" class="loading-text">Recherche du titre...</div>
          <div v-else-if="audioError" class="error-text">{{ audioError }}</div>
          <div v-else class="info-content">
            <div class="hidden-info" :class="{ revealed: isRevealed }">
              <h2 class="track-title">{{ trackInfo?.title || song.title }}</h2>
              <p class="track-artist">{{ trackInfo?.artist || song.artist }}</p>
              <p v-if="trackInfo?.year" class="year">{{ trackInfo.year }}</p>
            </div>

            <button @click="toggleReveal" class="btn-reveal glass-button">
              <component :is="isRevealed ? EyeOff : Eye" :size="18" />
              <span>{{
                isRevealed ? "Cacher" : "Voir l'artiste / titre"
              }}</span>
            </button>
          </div>
        </div>

        <!-- Action Area -->
        <div class="action-area">
          <button @click="emit('back')" class="btn-next">
            <ScanLine :size="22" />
            <span>Carte Suivante</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Main Root */
.player-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  color: white;
}

/* Glass Panel similar to TimelinePlayer */
.player-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border-radius: 20px;

  width: 100%;
  max-width: 600px; /* Match TimelinePlayer max-width */
  height: auto;
  min-height: 500px; /* Ensure some height but let it grow */
  max-height: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly; /* Even spacing */
  padding: 1rem; /* Reduced padding */
  position: relative;
  overflow: hidden;
}

.player-content-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

/* Vinyl Styles - Fixed Size */
.vinyl-container {
  position: relative;
  width: 280px; /* Fixed robust size */
  height: 280px;
  cursor: pointer;
  flex-shrink: 0; /* Prevent shrinking */
}

.vinyl-record {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #333, #000);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.spinning {
  animation: spin 4s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.vinyl-label {
  width: 40%;
  height: 40%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  background: #222;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.label-bg {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: filter 0.5s;
}
.label-bg.blurred {
  filter: blur(8px);
}

.control-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}
.control-overlay.show-overlay {
  opacity: 1;
}

/* Info Styles */
.song-info {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-height: 100px; /* Prevent layout jump */
}

.info-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.hidden-info {
  filter: blur(12px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hidden-info.revealed {
  filter: blur(0);
  opacity: 1;
}

.track-title {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}
.track-artist {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0.2rem 0 0;
  font-weight: 600;
}
.year {
  font-size: 1.2rem;
  color: #fbbf24;
  font-weight: 900;
  margin-top: 0.5rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}

.btn-reveal {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.8rem 1.6rem;
  border-radius: 50px;
  color: white;
  font-weight: 600;
  display: flex;
  gap: 0.8rem;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}
.btn-reveal:active {
  transform: scale(0.96);
}

.action-area {
  width: 100%;
  display: flex;
  justify-content: center;
  flex-shrink: 0; /* Prevent shrinking */
  box-sizing: border-box;
}

.btn-next {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #000;
  font-weight: 900;
  padding: 16px 32px; /* Bigger button */
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-transform: uppercase;
  font-size: 1.1rem;
  width: 100%;
  max-width: 320px;
  justify-content: center;
  margin-inline: auto; /* Force centering */
}
.btn-next:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
}
.btn-next:active {
  transform: scale(0.96);
}

.loading-text {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}
.error-text {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
</style>
