<script setup>
import { ref } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';
import { AlertCircle } from 'lucide-vue-next';

const emit = defineEmits(['scan']);
defineProps(['error']);

const scanError = ref(null);

const onDetect = (detectedCodes) => {
  if (detectedCodes && detectedCodes.length > 0) {
    const result = detectedCodes[0].rawValue;
    console.log("Scanner detected:", result);
    emit('scan', result);
  }
};

const onInit = async (promise) => {
  try {
    const { capabilities } = await promise;
    // Successfully initialized
    scanError.value = null;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      scanError.value = "Accès caméra refusé. Vérifiez vos permissions.";
    } else if (error.name === 'NotFoundError') {
      scanError.value = "Aucune caméra détectée.";
    } else {
      scanError.value = `Erreur caméra: ${error.name}`;
    }
    console.error(error);
  }
};
</script>

<template>
  <div class="scanner-wrapper glass-panel">
    
    <div class="scanner-box">
      <QrcodeStream 
        @detect="onDetect" 
        @init="onInit"
        :formats="['qr_code']"
      >
        <!-- Overlay for visual guidance -->
        <div class="overlay-frame"></div>
      </QrcodeStream>
    </div>

    <div v-if="scanError || error" class="error-message">
      <AlertCircle size="20" />
      <span>{{ scanError || error }}</span>
    </div>

    <div class="instructions">
      <p>Scannez une carte Hitster pour jouer</p>
    </div>
  </div>
</template>

<style scoped>
.scanner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  gap: 1.5rem;
  flex: 0 1 auto; /* Don't stretch */
}

.scanner-box {
  width: 100%;
  max-width: 250px; /* Much smaller */
  aspect-ratio: 1/1; /* Square */
  margin: 0 auto; /* Ensure centering */
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  border: 4px solid var(--color-primary);
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.overlay-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  width: 100%;
  font-size: 0.9rem;
  text-align: center;
}

.instructions {
  color: var(--color-text-muted);
  text-align: center;
}
</style>
