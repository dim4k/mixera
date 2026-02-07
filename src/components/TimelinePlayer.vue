<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Flame,
} from "lucide-vue-next";
import type { Song } from "../types";

defineProps<{
  pivotYear: number;
  mysterySong: Song;
  streak: number;
  feedback: "correct" | "timeout" | "wrong" | null;
  isPlaying: boolean;
  correctAnswer: "before" | "after" | null;
}>();

defineEmits<{
  (e: "guess", direction: "before" | "after"): void;
}>();
</script>

<template>
  <div class="timeline-wrapper glass-panel">
    <!-- Header: Streak -->
    <!-- Header: Streak -->
    <div class="streak-badge glass-panel">
      <Flame :size="16" class="streak-icon" />
      <span class="streak-text">SÉRIE : {{ streak }}</span>
    </div>

    <div class="cards-container single-card">
      <!-- Mystery Card (CENTER) -->
      <div class="card mystery-card">
        <div class="card-cover">
          <!-- Show cover ALWAYS -->
          <img :src="mysterySong.cover" class="cover-img" />

          <!-- Reveal Year ONLY if feedback -->
          <div
            v-if="feedback"
            class="year-badge"
            :class="feedback === 'correct' ? 'success' : 'error'"
          >
            {{ mysterySong.year }}
          </div>
        </div>

        <div class="card-info">
          <h3>{{ mysterySong.title }}</h3>
          <p>{{ mysterySong.artist }}</p>
        </div>
      </div>
    </div>

    <!-- Controls (Only if no feedback yet) -->
    <div v-if="!feedback" class="controls">
      <button class="btn-action btn-before" @click="$emit('guess', 'before')">
        <ArrowLeft :size="20" />
        <span>Avant {{ pivotYear }}</span>
      </button>

      <button class="btn-action btn-after" @click="$emit('guess', 'after')">
        <span>Après {{ pivotYear }}</span>
        <ArrowRight :size="20" />
      </button>
    </div>

    <!-- Feedback Overlay -->
    <div v-else class="feedback-message">
      <div v-if="feedback === 'correct'" class="msg success">
        <CheckCircle :size="28" />
        <span>Bien joué !</span>
      </div>
      <div v-else class="msg error">
        <XCircle :size="28" />
        <span>{{ feedback === "timeout" ? "Trop tard !" : "Perdu !" }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrapper {
  flex: 0 1 auto; /* Allow shrink but don't force grow */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  width: 100%;
  max-width: 600px; /* Limit width */
  margin: 0 auto; /* Center horizontally */
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border-radius: 16px; /* Rounded corners */
}

.streak-badge {
  align-self: center;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-primary);
  padding: 6px 16px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.streak-icon {
  filter: drop-shadow(0 0 5px var(--color-primary));
}

.streak-text {
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.cards-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 2rem;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 320px; /* Wider single card */
}

/* Larger Cover for Single Card */
.card-cover {
  width: 220px;
  height: 220px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vinyl-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, #333 0%, #111 60%);
  border-radius: 12px;
}

/* Year Badge */
.year-badge {
  position: absolute;
  bottom: 0;
  width: 100%;
  text-align: center;
  background: rgba(0, 0, 0, 0.9); /* More opaque */
  color: #fff;
  font-weight: 900;
  padding: 5px 0;
  font-size: 1.2rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5); /* Shadow on top edge */
}

.year-badge.success {
  background: #22c55e;
}
.year-badge.error {
  background: #ef4444;
}

.card-info {
  text-align: center;
}

.card-info h3 {
  font-size: 1.8rem; /* Much larger title */
  color: #fff;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.card-info p {
  font-size: 1.2rem; /* Larger artist */
  color: var(--color-primary); /* Use primary color */
  font-weight: 700;
  margin: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Controls */
.controls {
  display: flex;
  gap: 1rem;
  width: 100%;
  justify-content: center;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.1s;
  color: white;
}

.btn-action:active {
  transform: scale(0.95);
}

.btn-before {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-after {
  background: var(--color-primary);
  color: #000;
}

.feedback-message {
  width: 100%;
  min-height: 56px; /* Match button height approx */
  display: flex;
  align-items: center;
  justify-content: center;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.msg {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  font-size: 1.2rem;
  font-weight: 800;

  /* Better Visibility */
  background: rgba(255, 255, 255, 0.1); /* Lighter background */
  padding: 8px 16px;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  width: 100%; /* Fill the container space like buttons */
  box-sizing: border-box;
}

/* Removed msg-col and sub-msg */

.msg.success {
  color: #22c55e;
}
.msg.error {
  color: #ef4444;
}

@keyframes popIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.pivot-cover {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pivot-badge {
  background: #fff;
  color: #000;
  bottom: auto;
  top: 50%;
  transform: translateY(-50%);
  width: auto;
  padding: 5px 15px;
  border-radius: 8px;
  font-size: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}
</style>
