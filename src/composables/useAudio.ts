import { ref } from "vue";

const globalAudio = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const audioError = ref<string | null>(null);

export function useAudio() {
  const stopAudio = () => {
    if (globalAudio.value) {
      globalAudio.value.pause();
      globalAudio.value = null;
    }
    isPlaying.value = false;
  };

  const playAudio = async (url: string, fadeDuration = 1000) => {
    stopAudio(); // Ensure cleanup

    const audio = new Audio(url);
    globalAudio.value = audio;
    audio.volume = 0; // Start silent for fade-in

    try {
      await audio.play();
      isPlaying.value = true;

      // Fade In
      const stepTime = 50;
      const steps = fadeDuration / stepTime;
      const volStep = 0.8 / steps; // Target 0.8 volume max usually

      const fadeIn = setInterval(() => {
        if (!audio || audio !== globalAudio.value || audio.paused) {
          clearInterval(fadeIn);
          return;
        }

        if (audio.volume < 1) {
          const nextVol = Math.min(audio.volume + volStep, 1);
          audio.volume = nextVol;
          if (nextVol >= 1) clearInterval(fadeIn);
        }
      }, stepTime);
    } catch (e) {
      console.error("Audio Play Error:", e);
      audioError.value = "Erreur lecture audio";
      isPlaying.value = false;
    }
  };

  const fadeOutAudio = (duration = 1000): Promise<void> => {
    return new Promise((resolve) => {
      const audio = globalAudio.value;
      if (!audio) {
        resolve();
        return;
      }

      const startVol = audio.volume;
      const stepTime = 50;
      const steps = duration / stepTime;
      const volStep = startVol / steps;

      const fade = setInterval(() => {
        // If audio changed or stopped elsewhere
        if (audio !== globalAudio.value) {
          clearInterval(fade);
          resolve();
          return;
        }

        if (audio.volume > volStep) {
          audio.volume -= volStep;
        } else {
          audio.volume = 0;
          audio.pause();
          if (globalAudio.value === audio) {
            globalAudio.value = null;
            isPlaying.value = false;
          }
          clearInterval(fade);
          resolve();
        }
      }, stepTime);
    });
  };

  const pauseAudio = () => {
    if (globalAudio.value) {
      globalAudio.value.pause();
      isPlaying.value = false;
    }
  };

  const resumeAudio = async () => {
    if (globalAudio.value) {
      try {
        await globalAudio.value.play();
        isPlaying.value = true;
      } catch (e) {
        console.error("Resume Error:", e);
      }
    }
  };

  return {
    // State
    globalAudio,
    isPlaying,
    audioError,

    // Methods
    playAudio,
    fadeOutAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
  };
}
