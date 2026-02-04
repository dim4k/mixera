<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { ArrowLeft, Play, Pause, Loader2, Eye, EyeOff, ScanLine } from 'lucide-vue-next';

// Receive global audio state from parent
const props = defineProps(['song', 'isPlaying', 'audioError']);
const emit = defineEmits(['back', 'play-request', 'toggle-play', 'set-error', 'update-cover']);

// Local proxy for Deezer API
const DEEZER_PROXY = '/api/deezer';

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
    // Search on Deezer using Artist + Title
    const query = encodeURIComponent(`${props.song.artist} ${props.song.title}`);
    const response = await fetch(`${DEEZER_PROXY}/search?q=${query}`);
    
    if (!response.ok) throw new Error(`Erreur API Deezer (${response.status})`);
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("Titre non trouvé sur Deezer.");
    }

    // Take the first result
    const track = data.data[0];
    const previewUrl = track.preview;
    
    // Store track info for UI (Cover, etc.)
    trackInfo.value = {
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      cover: track.album.cover_xl || track.album.cover_medium,
      year: props.song.year
    };
    
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
</script>

<template>
  <div class="player-wrapper glass-panel">
    
    <!-- Ambient Glow Background -->
    <div class="ambient-glow"></div>

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

    <!-- Blind Test Info Area -->
    <div class="song-info">
      <div v-if="isLoading" class="loading-text">Recherche du titre...</div>
      <div v-else-if="audioError" class="error-text">{{ audioError }}</div>
      <div v-else class="info-content">
        <div class="hidden-info" :class="{ 'revealed': isRevealed }">
          <h2 class="title-text">{{ trackInfo?.title || song.title }}</h2>
          <p class="artist-text">{{ trackInfo?.artist || song.artist }}</p>
        </div>
        
        <button @click="toggleReveal" class="btn-reveal glass-button">
          <component :is="isRevealed ? EyeOff : Eye" size="18" />
          <span>{{ isRevealed ? 'Cacher' : "Voir l'artiste / titre" }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="footer-actions">
       <button @click="$emit('back')" class="btn-next">
        <ScanLine size="22" />
        <span>Carte Suivante</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.player-wrapper {
  display: flex;
  flex-direction: column;
  padding: 1.2rem 3rem;
  gap: 2rem;
  flex: 0 1 auto;
  text-align: center;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  /* Glassmorphism base override */
  background: rgba(0, 0, 0, 0.2); /* Almost transparent */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: none; /* Remove harsh shadow */
}

.ambient-glow {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, rgba(0,0,0,0) 70%); /* Adjusted to Gold */
  pointer-events: none;
  z-index: 0;
  animation: pulse-glow 4s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  from { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

/* Vinyl styles */
.vinyl-container {
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin-top: 1rem;
  z-index: 10;
}
.vinyl-container:active { transform: scale(0.95); }

.vinyl-record {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, #222 30%, #080808 70%);
  border: 2px solid #333;
  box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 8px rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Enhanced grooves */
.vinyl-record::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    #111 0, 
    #111 3px, 
    #1c1c1c 4px, 
    #1c1c1c 5px
  );
  opacity: 0.4;
  mask-image: radial-gradient(white 60%, transparent 100%);
}

.vinyl-label {
  width: 130px; 
  height: 130px;
  background-color: var(--color-primary);
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20; /* Above grooves */
  box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
  position: relative;
  overflow: hidden;
}

/* Background Layer for Blur */
.label-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: filter 0.5s ease;
  z-index: 1; /* Behind controls */
}

.label-bg.blurred {
  filter: blur(8px); /* slightly reduced blur for distinct colors */
}

.control-overlay {
  background: rgba(0, 0, 0, 0.3); /* Lighter overlay to see colors */
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 10; /* Above blurred bg */
}
.control-overlay.show-overlay,
.vinyl-container:hover .control-overlay {
  opacity: 1;
}

@media (max-width: 768px) {
  .control-overlay {
    opacity: 1;
  }
}

.spinning { animation: spin-record 8s linear infinite; }

/* Info Area */
.song-info {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  z-index: 10;
}

.hidden-info {
  filter: blur(15px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
}

.hidden-info.revealed {
  filter: blur(0);
  opacity: 1;
}

.title-text {
  font-size: 2rem;
  font-weight: 900;
  color: rgba(255,255,255,0.7); /* Slightly brighter */
  letter-spacing: 0.2rem;
  text-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.artist-text {
  font-size: 1.2rem;
  color: var(--color-primary); /* Gold */
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
}

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
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  margin: 0 auto;
}
.btn-reveal:hover { 
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

/* Footer Actions */
.footer-actions {
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 1rem;
  z-index: 10;
}

.btn-next {
  background: linear-gradient(135deg, var(--color-primary) 0%, #d97706 100%);
  color: #fff;
  border: none;
  padding: 1.1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 90%;
  max-width: 320px; 
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-next:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 25px rgba(245, 158, 11, 0.5), inset 0 1px 0 rgba(255,255,255,0.3);
}
.btn-next:active { transform: scale(0.98); }

.loading-text { color: var(--color-text-muted); font-style: italic; opacity: 0.7; }
.error-text { color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 0.5rem 1rem; border-radius: 8px; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes spin-record { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
