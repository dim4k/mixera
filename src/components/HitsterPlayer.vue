<script setup>
import { computed, onMounted, ref, onUnmounted, watch } from 'vue';
import { ArrowLeft, Play, Pause, Loader2, Eye, EyeOff, ScanLine } from 'lucide-vue-next';

// Receive global audio state from parent
const props = defineProps(['song', 'isPlaying', 'audioError']);
const emit = defineEmits(['back', 'play-request', 'toggle-play', 'set-error', 'update-cover']);

// Local proxy for Deezer API
import { fetchDeezerTrack } from '../services/deezerService';

const isLoading = ref(true);

// Blind Test Mode
const isRevealed = ref(false);
const trackInfo = ref(null); // Will hold Deezer data (cover, etc.)

onMounted(async () => {
  await loadAudio();
});

const loadAudio = async () => {
  isLoading.value = true;
  emit('set-error', null);
  trackInfo.value = null;

  // Check for YouTube ID first (Full Track)
  if (props.song.youtubeId) {
    emit('play-request', props.song.youtubeId, 'youtube');
    // Still load metadata from Deezer for the cover art?
    // Yes, we want the cover art. But we shouldn't play the preview.
    // So we continue to fetch Deezer info but skipping the emit('play-request', preview)
  }
  
  try {
    // Use centralized service that handles Native/Proxy logic
    const track = await fetchDeezerTrack(props.song);
    
    // Store track info for UI (Cover, etc.)
    trackInfo.value = track;
    
    const previewUrl = track.preview;
    
    // Emit cover to parent for global background
    if (trackInfo.value.cover) {
      emit('update-cover', trackInfo.value.cover);
    }

    if (!previewUrl) throw new Error("Aucun extrait audio disponible.");

    // Only play Deezer preview if we didn't start YouTube
    if (!props.song.youtubeId) {
       emit('play-request', previewUrl, 'audio');
    }

  } catch (err) {
    console.error("Deezer load error:", err);
    emit('set-error', "Impossible de charger l'extrait (Deezer).");
  } finally {
    isLoading.value = false;
  }
};

const togglePlay = () => {
  emit('toggle-play');
};

const toggleReveal = () => {
  isRevealed.value = !isRevealed.value;
};

// Fallback: If YouTube fails, try Deezer preview
// Fallback: If YouTube fails, try Deezer preview (Watching both dependencies)
watch([() => props.audioError, trackInfo], ([err, info]) => {
    if (err && err.includes('YouTube') && info?.preview) {
        console.warn("YouTube failed, falling back to Deezer preview...");
        emit('set-error', null); // Clear error
        emit('play-request', info.preview, 'audio');
    }
});
</script>

<template>
  <div class="player-root">
    <div class="player-panel">
        <!-- Main Player Content -->
        <div class="player-content-inner">
            <!-- Vinyl that spins when playing -->
            <div class="vinyl-container" @click="togglePlay">
              <div class="vinyl-record" :class="{ 'spinning': isPlaying }">
                <!-- Main Label Container -->
                <div class="vinyl-label">
                  <!-- Separate Background Layer for Blur Effect -->
                  <div class="label-bg" 
                       :class="{ 'blurred': !isRevealed }"
                       :style="trackInfo?.cover ? { backgroundImage: `url(${trackInfo.cover})` } : {}">
                  </div>
                  
                  <!-- Play/Pause Overlay (Stays Sharp) -->
                  <div class="control-overlay" :class="{ 'show-overlay': !isPlaying }">
                     <Loader2 v-if="isLoading" class="animate-spin" color="white" size="32" />
                     <component v-else :is="isPlaying ? Pause : Play" fill="white" color="white" size="32" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Song Info Block -->
            <div class="song-info">
              <div v-if="isLoading" class="loading-text">Recherche du titre...</div>
              <div v-else-if="audioError" class="error-text">{{ audioError }}</div>
              <div v-else class="info-content">
                <div class="hidden-info" :class="{ 'revealed': isRevealed }">
                  <h2 class="track-title">{{ trackInfo?.title || song.title }}</h2>
                  <p class="track-artist">{{ trackInfo?.artist || song.artist }}</p>
                </div>
                
                <button @click="toggleReveal" class="btn-reveal glass-button">
                  <component :is="isRevealed ? EyeOff : Eye" size="18" />
                  <span>{{ isRevealed ? 'Cacher' : "Voir l'artiste / titre" }}</span>
                </button>
              </div>
            </div>

            <!-- Action Area -->
            <div class="action-area">
               <button @click="$emit('back')" class="btn-next">
                <ScanLine size="22" />
                <span>Carte Suivante</span>
              </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Only Hitster-specific styles */

.info-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.hidden-info {
    filter: blur(15px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.6;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.hidden-info.revealed { filter: blur(0); opacity: 1; }

.btn-reveal {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1.5rem;
    border-radius: 50px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.95rem;
    display: flex;
    gap: 0.6rem;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}
.btn-reveal:hover { 
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.btn-next {
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #000;
    font-weight: 900;
    padding: 14px 24px;
    border-radius: 12px;
    border: none;
    box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    text-transform: uppercase;
    font-size: 1rem;
    width: 100%;
    max-width: 320px;
    justify-content: center;
}
.btn-next:hover { filter: brightness(1.1); transform: translateY(-2px); }
.btn-next:active { transform: scale(0.95); }

.loading-text { color: rgba(255,255,255,0.6); font-style: italic; }
.error-text { color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 0.5rem 1rem; border-radius: 8px; }
</style>
