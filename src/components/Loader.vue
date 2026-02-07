<script setup lang="ts"></script>

<template>
  <div class="loader-container">
    <div class="loader-disc">
      <div class="disc-inner"></div>
      <div class="disc-grooves"></div>
    </div>
    <div class="loader-text">Chargement...</div>
  </div>
</template>

<style scoped>
.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100%;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

.loader-disc {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #222 0%, #111 100%);
  position: relative;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
  animation: spin 1.5s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(251, 191, 36, 0.4);
}

.disc-grooves {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: repeating-radial-gradient(#222 0, #222 2px, #333 3px, #333 4px);
  opacity: 0.5;
}

.disc-inner {
  width: 20px;
  height: 20px;
  background: #fbbf24;
  border-radius: 50%;
  position: relative;
  z-index: 10;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
}

.loader-text {
  font-family: "Righteous", cursive;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
  font-size: 1.1rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
