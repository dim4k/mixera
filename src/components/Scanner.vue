<script setup lang="ts">
import { ref } from "vue";
import { QrcodeStream } from "vue-qrcode-reader";
import { Scan, AlertCircle } from "lucide-vue-next";

// Emits
const emit = defineEmits<{
  (e: "scan", result: string): void;
}>();

defineProps<{ error?: string | null }>();

const errorMessage = ref<string | null>(null);

// onInit removed as it was unused and empty

const onError = (error: { name: string; message: string }) => {
  if (error.name === "NotAllowedError") {
    errorMessage.value = "Accès caméra refusé. Vérifiez vos permissions.";
  } else if (error.name === "NotFoundError") {
    errorMessage.value = "Aucune caméra détectée.";
  } else if (error.name === "NotSupportedError") {
    errorMessage.value = "Connexion sécurisée (HTTPS) requise.";
  } else if (error.name === "NotReadableError") {
    errorMessage.value = "La caméra est déjà utilisée.";
  } else if (error.name === "OverconstrainedError") {
    errorMessage.value = "Caméra incompatible.";
  } else if (error.name === "StreamApiNotSupportedError") {
    errorMessage.value = "Stream API non supportée.";
  } else {
    errorMessage.value = `Erreur: ${error.message}`;
  }
};

const onDetect = (detectedCodes: { rawValue: string }[]) => {
  // types for detectedCodes can be imported usually, but it's an array of objects with 'rawValue'
  if (detectedCodes && detectedCodes.length > 0) {
    const firstCode = detectedCodes[0];
    if (firstCode && firstCode.rawValue) {
      emit("scan", firstCode.rawValue);
    }
  }
};
</script>

<template>
  <div class="scanner-container">
    <div class="scanner-wrapper">
      <div class="video-container">
        <QrcodeStream @detect="onDetect" @error="onError">
          <!-- Custom overlay slot -->
          <div class="overlay-slot">
            <div class="scan-line" v-if="!errorMessage && !error"></div>

            <p v-if="errorMessage || error" class="error-msg">
              <AlertCircle :size="20" />
              <span>{{ errorMessage || error }}</span>
            </p>
          </div>
        </QrcodeStream>
      </div>
    </div>

    <!-- Instruction sibling to wrapper -->
    <div v-if="!errorMessage && !error" class="instruction-pill">
      <Scan class="icon-pulse" :size="20" color="#fbbf24" />
      <span>Scannez le QR Code</span>
    </div>
  </div>
</template>

<style scoped>
.scanner-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column; /* Stack vertically */
  justify-content: center;
  align-items: center;
  gap: 32px;
}

.scanner-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  background: #000;
  /* Gradient Border Trick */
  border: 3px solid transparent;
  background:
    linear-gradient(#000, #000) padding-box,
    linear-gradient(135deg, #fbbf24, #d97706, #fff, #fbbf24) border-box;

  overflow: hidden;
  transform: translateZ(0); /* Hardware acceleration */
  isolation: isolate;
}

.video-container {
  width: 100%;
  height: 100%;
  border-radius: 20px; /* Match inner radius */
  overflow: hidden;
}

/* Force only the direct children (likely a wrapper div) to fill space, NOT recursive */
.video-container > :deep(div) {
  width: 100% !important;
  height: 100% !important;
}

.video-container :deep(.qrcode-stream-overlay) {
  position: absolute;
  inset: 0;
  z-index: 10;
}

.video-container :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 20px !important;
  display: block;
}

.overlay-slot {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 20;
}

/* Scanning Animation */
.scan-line {
  position: absolute;
  width: 100%;
  height: 2px !important; /* Force override just in case */
  background: #fbbf24;
  box-shadow:
    0 0 10px #fbbf24,
    0 0 20px #fbbf24;
  top: 0;
  left: 0;
  animation: scan 2.5s infinite ease-in-out;
  opacity: 0.8;
}

@keyframes scan {
  0% {
    top: 0%;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

.instruction-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 20, 20, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 12px 24px;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  color: white;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.instruction-pill span {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.icon-pulse {
  color: #fbbf24;
  animation: pulse-icon 2s infinite;
}

@keyframes pulse-icon {
  0% {
    opacity: 0.6;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.95);
  }
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 0;
  color: #fff;
  background: rgba(220, 38, 38, 0.85); /* Red background for errors */
  padding: 12px 20px;
  border-radius: 16px;
  max-width: 85%;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
