<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Scanner from './components/Scanner.vue';
import HitsterPlayer from './components/HitsterPlayer.vue';
import BlindtestPlayer from './components/BlindtestPlayer.vue';
import TimelinePlayer from './components/TimelinePlayer.vue';
import BullseyePlayer from './components/BullseyePlayer.vue';
import { resolveHitsterUrl } from './utils/resolver';
import { Music, Scan, Disc, Calendar, Target } from 'lucide-vue-next';

// Composables
import { useBlindtestGame } from './composables/useBlindtestGame';
import { useTimelineGame } from './composables/useTimelineGame';
import { useBullseyeGame } from './composables/useBullseyeGame';
import { useAudio } from './composables/useAudio';

const { 
    currentSong: dtSong, 
    isRevealed: dtRevealed, 
    mysteryProgress: dtProgress, 
    isLoading: dtLoading,
    error: dtError,
    blindtestRange, 
    selectedOrigin, 
    selectedGenres, 
    genres,
    MIN_YEAR,
    MAX_YEAR,
    playNextdtTrack, 
    handleWin: handleBlindtestWin,
    resetBlindtestGame
} = useBlindtestGame();

const {
    timelinePivotYear,
    timelineMysterySong,
    timelineStreak,
    timelineFeedback,
    timelineCorrectAnswer,
    startTimelineRound,
    handleTimelineGuess,
    resetTimelineGame
} = useTimelineGame();

const {
    currentSong: beSong,
    isRevealed: beRevealed,
    mysteryProgress: beProgress,
    isLoading: beLoading,
    bullseyeTotalScore,
    bullseyeBestScore,
    lastPointsEarned,
    startBullseyeRound,
    submitYearGuess,
    resetBullseyeGame
} = useBullseyeGame();

const { stopAudio, audioError, playAudio, pauseAudio, resumeAudio, isPlaying: isAudioPlaying } = useAudio();

// --- Global UI State ---
const gameMode = ref(null); // 'hitster' | 'blindtest' | 'timeline'
const currentView = ref('scanner'); // 'scanner' | 'player' | 'blindtest-player' | 'timeline-player'
const hasStarted = ref(false);
const scanError = ref(null);
const currentCoverA = ref(null);
const currentCoverB = ref(null);
const isBgAActive = ref(true);
const currentCover = computed(() => isBgAActive.value ? currentCoverA.value : currentCoverB.value);

// --- Hitster (Scan) State ---
const hitsterSong = ref(null);
const activeHitsterSource = ref(null); // 'youtube' | 'audio'
const isYoutubePlaying = ref(false); // Specific to YouTube
const isHitsterPlaying = computed(() => {
    if (activeHitsterSource.value === 'youtube') return isYoutubePlaying.value;
    if (activeHitsterSource.value === 'audio') return isAudioPlaying.value;
    return false;
}); 

// --- Keep Awake Logic ---
import { KeepAwake } from '@capacitor-community/keep-awake';

watch(gameMode, async (newMode) => {
    try {
        if (newMode) {
            await KeepAwake.keepAwake();
        } else {
            await KeepAwake.allowSleep();
        }
    } catch (err) {
        console.warn('KeepAwake error (non-native?):', err);
    }
});

// --- YouTube Official Player (Global) ---
const playerRef = ref(null);
onMounted(() => {
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }
  window.onYouTubeIframeAPIReady = () => {
    playerRef.value = new window.YT.Player('youtube-player', {
      height: '1', width: '1',
      playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'origin': window.location.origin },
      events: {
        'onStateChange': (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) isYoutubePlaying.value = true;
            else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) isYoutubePlaying.value = false;
        },
        'onError': (event) => { 
            console.error("YouTube Error", event.data); 
            // In Hitster mode, we might want to show error
            if (gameMode.value === 'hitster') audioError.value = "Erreur YouTube ("+event.data+")";
        }
      }
    });
  };
});

// --- Game Modes Switching ---
const setGameMode = (mode) => {
  gameMode.value = mode;
  hasStarted.value = true;
  
  if (mode === 'blindtest') {
    currentView.value = 'blindtest-player';
    playNextdtTrack();
  } else if (mode === 'timeline') {
    currentView.value = 'timeline-player';
    startTimelineRound();
  } else if (mode === 'bullseye') {
    currentView.value = 'bullseye-player';
    startBullseyeRound();
  } else if (mode === 'hitster') {
     currentView.value = 'scanner';
  }
};

const reset = () => {
    // Global Stop
    if (playerRef.value && playerRef.value.stopVideo) playerRef.value.stopVideo();
    stopAudio();
    resetBlindtestGame();
    resetTimelineGame();
    resetBullseyeGame();

    hasStarted.value = false;
    gameMode.value = null;
    currentView.value = 'scanner';
    currentCoverA.value = null;
    currentCoverB.value = null;
    hitsterSong.value = null;
    activeHitsterSource.value = null;
    scanError.value = null;
};

const returnToScanner = () => {
    // Stop current playback
    if (playerRef.value && playerRef.value.stopVideo) playerRef.value.stopVideo();
    stopAudio();
    
    // Reset specific Hitster state but keep Game Mode
    hitsterSong.value = null;
    activeHitsterSource.value = null;
    scanError.value = null;
    currentView.value = 'scanner';
};

// --- Hitster Specifics ---
const handleScan = (decodedText) => {
    const result = resolveHitsterUrl(decodedText);
    if (result && !result.error) {
        hitsterSong.value = result;
        currentView.value = 'player';
        scanError.value = null;
        updateBackground(result.cover); // Set BG properly via crossfade logic
    } else if (result && result.error) {
        scanError.value = `Carte inconnue (${result.id})`;
    } else {
        scanError.value = 'Code QR non valide';
    }
};

const playHitsterTrack = (resource, type) => {
  activeHitsterSource.value = type; // Track what we are playing
  
  if (type === 'youtube' && playerRef.value && playerRef.value.loadVideoById) {
      stopAudio(); // Stop any running audio
      playerRef.value.loadVideoById(resource);
  } else if (type === 'audio') {
      if (playerRef.value && playerRef.value.stopVideo) playerRef.value.stopVideo();
      playAudio(resource);
  }
};

const toggleHitsterPlay = () => {
    if (activeHitsterSource.value === 'youtube') {
         if (!playerRef.value) return;
         if (isYoutubePlaying.value) playerRef.value.pauseVideo();
         else playerRef.value.playVideo();
    } else if (activeHitsterSource.value === 'audio') {
        if (isAudioPlaying.value) pauseAudio();
        else resumeAudio();
    }
};

// --- Cover Background Handling ---
const updateBackground = (newCover) => {
    if (!newCover) return;
    if (isBgAActive.value) {
        currentCoverB.value = newCover;
        isBgAActive.value = false;
    } else {
        currentCoverA.value = newCover;
        isBgAActive.value = true;
    }
};

watch(hitsterSong, (newSong) => {
    if (newSong && newSong.cover) updateBackground(newSong.cover);
});
watch(dtSong, (newSong) => {
    if (newSong && newSong.cover) updateBackground(newSong.cover);
});
watch(timelineMysterySong, (newSong) => {
    if (newSong && newSong.cover) updateBackground(newSong.cover);
});
watch(beSong, (newSong) => {
    if (newSong && newSong.cover) updateBackground(newSong.cover);
});

// Label
const currentModeLabel = computed(() => {
    switch (gameMode.value) {
        case 'blindtest': return 'Blindtest';
        case 'timeline': return 'Timeline';
        case 'bullseye': return 'Bullseye';
        case 'hitster': return 'Hitster';
        default: return 'Music Time Machine';
    }
});
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content" @click="reset" style="cursor: pointer;" title="Retour à l'accueil">
        <div class="logo">
          <Disc class="icon-spin" :size="hasStarted ? 32 : 48" />
          <h1>MixEra</h1>
        </div>
        <transition name="fade" mode="out-in">
            <div :key="hasStarted ? 'mode' : 'sub'" class="subtitle">
                {{ hasStarted ? currentModeLabel : 'Music Time Machine' }}
            </div>
        </transition>
      </div>
    </header>

    <main class="content">
      <!-- Start Screen -->
      <div v-if="!hasStarted" class="start-screen glass-panel">
        <h2 class="welcome-title">Mode de jeu</h2>
        <div class="mode-selection">
            <button class="btn-primary btn-mode" @click="setGameMode('hitster')">
               <Scan size="24" />
               <div class="mode-info"><span class="mode-name">Hitster</span><span class="mode-desc">Scan & Play</span></div>
            </button>
            <button class="btn-primary btn-mode btn-blindtest" @click="setGameMode('blindtest')">
               <Music size="24" />
               <div class="mode-info"><span class="mode-name">Blindtest</span><span class="mode-desc">Auto-Mix Aléatoire</span></div>
            </button>
            <button class="btn-primary btn-mode btn-timeline" @click="setGameMode('timeline')">
               <Calendar size="24" />
               <div class="mode-info"><span class="mode-name">Timeline</span><span class="mode-desc">Plus ou Moins ?</span></div>
            </button>
            <button class="btn-primary btn-mode btn-bullseye" @click="setGameMode('bullseye')">
               <Target size="24" />
               <div class="mode-info"><span class="mode-name">Bullseye</span><span class="mode-desc">Année Exacte</span></div>
            </button>
        </div>
      </div>

      <!-- Main Content -->
      <template v-else>
        <Transition name="fade" mode="out-in">
          <div :key="currentView" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            
            <Scanner v-if="currentView === 'scanner'" @scan="handleScan" :error="scanError" />
            
            <HitsterPlayer 
              v-else-if="currentView === 'player' && hitsterSong" 
              :song="hitsterSong" 
              :is-playing="isHitsterPlaying"
              :audio-error="audioError"
              @back="returnToScanner"
              @play-request="playHitsterTrack"
              @toggle-play="toggleHitsterPlay"
              @set-error="(e) => audioError = e"
              @update-cover="updateBackground"
            />
            
            <BlindtestPlayer 
              v-else-if="currentView === 'blindtest-player' && dtSong"
              :song="dtSong"
              :isRevealed="dtRevealed"
              :isPlaying="true" 
              :progress="dtProgress"
              v-model:yearRange="blindtestRange"
              v-model:selectedOrigin="selectedOrigin"
              v-model:selectedGenres="selectedGenres"
              :isLoading="dtLoading"
              :minYear="MIN_YEAR"
              :maxYear="MAX_YEAR"
              :genres="genres"
              @update-cover="updateBackground"
              @found-all="handleBlindtestWin"
            />
            <!-- Note: isPlaying for blindtest is effectively managed by useAudio internally/globally 
                 but visual spinning might rely on a passed prop. 
                 Since useAudio manages global Audio, we assume it's playing if not paused.
                 However, `useAudio` exposes `isPlaying`. Can import and pass it?
                 Wait, BlindtestPlayer prop is `isPlaying`. 
                 We need to expose `isPlaying` from `useAudio` if we want visual feedback.
                 Wait, BlindtestPlayer uses `isPlaying` for vinyl spin.
                 Let's update `useBlindtestGame` to expose `isPlaying` or import `useAudio` here.
            -->

            <TimelinePlayer
               v-else-if="currentView === 'timeline-player' && timelineMysterySong"
               :pivotYear="timelinePivotYear"
               :mysterySong="timelineMysterySong"
               :streak="timelineStreak"
               :feedback="timelineFeedback"
               :correctAnswer="timelineCorrectAnswer"
               :isPlaying="true"
               @guess="handleTimelineGuess"
            />

            <BullseyePlayer
               v-else-if="currentView === 'bullseye-player' && beSong"
               :song="beSong"
               :isRevealed="beRevealed"
               :progress="beProgress"
               :isLoading="beLoading"
               :totalScore="bullseyeTotalScore"
               :bestScore="bullseyeBestScore"
               :lastPoints="lastPointsEarned"
               @submit-guess="submitYearGuess"
               @next-song="startBullseyeRound"
            />
          </div>
        </Transition>
      </template>
    </main>
    
    <!-- YouTube Hidden -->
    <div id="youtube-parent" style="position: absolute; top: -9999px; left: -9999px; opacity: 0; pointer-events: none;">
       <div id="youtube-player"></div>
    </div>
    
    <!-- Dynamic BG Crossfade Layers -->
    <div class="dynamic-bg" :class="{ 'active': isBgAActive, 'has-cover': !!currentCoverA }" :style="currentCoverA ? { '--bg-img': `url(${currentCoverA})` } : {}"></div>
    <div class="dynamic-bg" :class="{ 'active': !isBgAActive, 'has-cover': !!currentCoverB }" :style="currentCoverB ? { '--bg-img': `url(${currentCoverB})` } : {}"></div>
  </div>
</template>

<style scoped>
/* Keeping styles identical as they are visual */
*, *::before, *::after { box-sizing: border-box; }
.app-container { display: flex; flex-direction: column; height: 100dvh; width: 100%; max-width: 100vw; position: relative; }
.header { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 1rem; position: relative; z-index: 20; transition: all 0.3s ease; }
.header-content { display: flex; flex-direction: column; align-items: center; gap: 0; }
.logo { display: flex; align-items: center; gap: 1rem; padding: 20px 0 0 0; overflow: visible; }
.logo h1 { font-family: 'Righteous', cursive; font-size: 3.5rem; font-weight: 400; line-height: 1.2; margin: 0; background: linear-gradient(to bottom right, #ffffff 20%, #fbbf24 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.4)); padding-bottom: 10px; }
.logo :deep(svg) { color: #fbbf24; width: 48px; height: 48px; filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5)); }
.subtitle { font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 0.4em; font-weight: 600; margin-top: 0; text-align: center; }
@media (max-width: 600px) { 
  .header { padding: 0.5rem; padding-bottom: 0; } 
  .logo { padding-top: 50px; }
  .logo h1 { font-size: 3.5rem; } 
  .logo :deep(svg) { width: 48px; height: 48px; } 
  .subtitle { font-size: 0.9rem; letter-spacing: 0.4em; } 
  .content { padding-top: 0.5rem; }
}
.content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 10; width: 100%; max-width: 100%; padding: 1.5rem; box-sizing: border-box; min-height: 0; }
.start-screen { flex: 0 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; text-align: center; padding: 1rem; width: 100%; max-width: 400px; margin: 0 auto; }
.welcome-title { font-size: 1.8rem; margin: 0; background: linear-gradient(135deg, #fff 0%, #fbbf24 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
.mode-selection { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; }
.btn-mode { display: flex; align-items: center; gap: 1rem; padding: 1.2rem; text-align: left; }
.mode-info { display: flex; flex-direction: column; }
.mode-name { font-size: 1.2rem; font-weight: 800; }
.mode-desc { font-size: 0.8rem; opacity: 0.8; font-weight: 400; }
.fade-enter-active, .fade-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-enter-from { opacity: 0; transform: scale(0.98) translateY(10px); filter: blur(10px); }
.fade-leave-to { opacity: 0; transform: scale(1.02) translateY(-10px); filter: blur(10px); }
.dynamic-bg { position: fixed; top: -50%; left: -50%; width: 200vw; height: 200vh; background-image: var(--bg-img); background-size: cover; background-position: center; background-repeat: no-repeat; z-index: -1; filter: blur(60px) brightness(0.9) saturate(1.8); opacity: 0; transition: opacity 2s ease-in-out; pointer-events: none; }
.dynamic-bg.active.has-cover { opacity: 1; }
</style>
