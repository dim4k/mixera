
<script setup>
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  modelValue: { type: Number, required: true }
});

const emit = defineEmits(['update:modelValue', 'drag-start', 'drag-end']);

const isDragging = ref(false);

const percent = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100;
});

const handleInput = (e) => {
  const val = parseInt(e.target.value);
  emit('update:modelValue', val);
};

const startDrag = () => {
    isDragging.value = true;
    emit('drag-start');
};

const endDrag = () => {
    isDragging.value = false;
    emit('drag-end');
};
</script>

<template>
  <div class="single-slider-container">
    <div class="slider-wrapper">
      <div class="track-bg"></div>
      <div class="handle" :style="{ left: percent + '%' }">
        <span class="handle-text">{{ modelValue }}</span>
      </div>
      <input 
        type="range" 
        :min="min" :max="max" 
        :value="modelValue"
        @input="handleInput"
        @mousedown="startDrag"
        @touchstart="startDrag"
        @mouseup="endDrag"
        @touchend="endDrag"
        class="thumb-input"
      />
    </div>
  </div>
</template>

<style scoped>
.single-slider-container {
    width: 100%;
    padding: 20px 18px;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    box-sizing: border-box;
}

.slider-wrapper {
    position: relative;
    height: 40px;
    display: flex;
    align-items: center;
}

.track-bg {
    position: absolute;
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    z-index: 1;
}

.handle {
    position: absolute;
    transform: translate(-50%, -50%);
    top: 50%;
    background: linear-gradient(135deg, #fbbf24, #d97706);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    color: #000;
    padding: 6px 12px;
    border-radius: 12px;
    font-weight: 900;
    font-size: 1rem;
    min-width: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
}

.thumb-input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: grab;
    z-index: 20;
    margin: 0;
}

.thumb-input::-webkit-slider-thumb {
    appearance: none;
    width: 60px;
    height: 40px;
}
.thumb-input::-moz-range-thumb {
    width: 60px;
    height: 40px;
    border: none;
    background: transparent;
}
</style>
