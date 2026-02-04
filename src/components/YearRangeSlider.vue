<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  modelValue: { type: Array, required: true }, // [start, end]
  minGap: { type: Number, default: 1 } // Allow practically adjacent years
});

const emit = defineEmits(['update:modelValue']);

// Local state for active interaction to show "Rappel"
const isDragging = ref(false);
const draggingValue = ref(null);

const minVal = computed({
  get: () => props.modelValue[0],
  set: (val) => {
    // Logical collision only (1 year gap)
    const limit = props.modelValue[1] - props.minGap;
    const newVal = Math.min(val, limit);
    emit('update:modelValue', [newVal, props.modelValue[1]]);
    updateDragState(newVal);
  }
});

const maxVal = computed({
  get: () => props.modelValue[1],
  set: (val) => {
    const limit = props.modelValue[0] + props.minGap;
    const newVal = Math.max(val, limit);
    emit('update:modelValue', [props.modelValue[0], newVal]);
    updateDragState(newVal);
  }
});

const updateDragState = (val) => {
    draggingValue.value = val;
    isDragging.value = true;
};

const stopDrag = () => {
    isDragging.value = false;
};

// --- Visual Logic ---
// We cannot fake the X position (user hates "stops sliding").
// We cannot Merge (user hates Fusion).
// We cannot Overlap (user hates superposable).
// Solution: Vertical Stagger.

const leftPercentNum = computed(() => ((props.modelValue[0] - props.min) / (props.max - props.min)) * 100);
const rightPercentNum = computed(() => ((props.modelValue[1] - props.min) / (props.max - props.min)) * 100);

const leftPercent = computed(() => `${leftPercentNum.value}%`);
const rightPercent = computed(() => `${rightPercentNum.value}%`);

// Threshold for vertical staggering
const COLLISION_THRESHOLD = 22; // Reduced threshold for smaller buttons

const isColliding = computed(() => {
    return (rightPercentNum.value - leftPercentNum.value) < COLLISION_THRESHOLD;
});


// Dynamic styles for handles
const leftStyle = computed(() => {
    return {
        left: leftPercent.value,
        transform: isColliding.value 
            ? 'translate(-50%, calc(-50% - 24px))' // Move Up
            : 'translate(-50%, -50%)',
        zIndex: isColliding.value ? 20 : 10
    };
});

const rightStyle = computed(() => {
    return {
        left: rightPercent.value,
        transform: isColliding.value 
            ? 'translate(-50%, calc(-50% + 24px))' // Move Down
            : 'translate(-50%, -50%)',
        zIndex: isColliding.value ? 21 : 10
    };
});

// Input Transforms (Interactability follows Visuals)
const leftInputStyle = computed(() => ({
    transform: isColliding.value 
        ? 'translateY(-24px)' 
        : 'translateY(0)',
    zIndex: isColliding.value ? 20 : 10
}));

const rightInputStyle = computed(() => ({
    transform: isColliding.value 
        ? 'translateY(24px)' 
        : 'translateY(0)',
    zIndex: isColliding.value ? 21 : 10
}));
</script>

<template>
  <div class="slider-container">
    <div class="slider-wrapper">
         <div class="track-bg"></div>
         <!-- Track fill is simple again, follows true centers -->
         <div class="track-fill" :style="{ left: leftPercent, right: `calc(100% - ${rightPercent})` }"></div>
         
         <!-- Visual Date Handles -->
         <div class="handle handle-left" :style="leftStyle">
            <span class="handle-text">{{ minVal }}</span>
         </div>
         <div class="handle handle-right" :style="rightStyle">
            <span class="handle-text">{{ maxVal }}</span>
         </div>

         <!-- Range Inputs (Invisible) - Bound to same transforms for Hit Area alignment -->
         <input 
            type="range" 
            :min="min" :max="max" 
            v-model.number="minVal" 
            class="thumb thumb-input"
            :style="leftInputStyle"
            @input="updateDragState(minVal)"
            @change="stopDrag"
            @touchend="stopDrag"
            @mouseup="stopDrag"
         />
         <input 
            type="range" 
            :min="min" :max="max" 
            v-model.number="maxVal" 
            class="thumb thumb-input"
            :style="rightInputStyle"
            @input="updateDragState(maxVal)"
            @change="stopDrag"
            @touchend="stopDrag"
            @mouseup="stopDrag"
         />
    </div>

    <!-- Mobile "Rappel" Overlay -->
    <Teleport to="body">
        <Transition name="pop">
            <div v-if="isDragging" class="drag-overlay">
                <span class="drag-year">{{ draggingValue }}</span>
            </div>
        </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slider-container {
    width: 100%;
    padding: 10px 18px;
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    user-select: none; /* Prevent text selection during interaction */
    -webkit-user-select: none;
}

.slider-wrapper {
    position: relative;
    height: 40px; /* Taller track area */
    display: flex;
    align-items: center;
}

.track-bg {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 6px; 
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    z-index: 1;
}

.track-fill {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 6px;
    background: var(--color-primary);
    z-index: 2;
    border-radius: 4px;
    opacity: 0.8;
}

/* Visual Handles */
.handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%); /* Center on the value point */
    
    /* Glassy Gold Look */
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.6), rgba(217, 119, 6, 0.4));
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 
        0 4px 15px rgba(0,0,0,0.3),
        inset 0 1px 0 rgba(255,255,255,0.2);
    
    color: #fff;
    padding: 5px 5px; /* Further reduced */
    border-radius: 10px; /* Slightly tighter radius */
    font-weight: 800;
    font-size: 0.85rem; /* Slightly smaller font */
    text-shadow: 0 1px 2px rgba(0,0,0,0.5); /* Readable text */
    min-width: 44px; /* Reduced min width */
    display: flex;
    align-items: center;
    justify-content: center;
    
    pointer-events: none; /* Let clicks pass to input */
    z-index: 10;
    white-space: nowrap;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.1s linear; /* Bouncy vertical move, linear horizontal */
}



/* Inputs */
input[type=range] {
    position: absolute;
    pointer-events: none;
    appearance: none;
    -webkit-appearance: none;
    z-index: 20; /* On top of handles */
    height: 100%;
    width: 100%;
    opacity: 0;
    background: transparent;
    top: 0;
    margin: 0;
}

/* The actual clickable area */
input[type=range]::-webkit-slider-thumb {
    pointer-events: auto;
    appearance: none;
    -webkit-appearance: none;
    width: 60px; /* Wide touch target matching the visual handle width approx */
    height: 40px;
    border-radius: 20px;
    background: red; /* Invisible but needs fill for hit testing? actually opacity 0 on input handles this usually. But wait, input is opacity 0. Thumb needs to be "visible" to hit test in some browsers? No, opacity 0 on input usually kills it. But here we have opacity 0 on INPUT. */
    cursor: grab;
}

/* Chrome/Safari requires opacity 0 input to still have working thumbs. 
   Actually if input is opacity 0, thumbs are too. 
   Correct trick: Input opacity 0, but maybe z-index high.
   Let's keep input opacity 0. It works in most modern browsers.
*/

input[type=range]::-moz-range-thumb {
    pointer-events: auto;
    width: 60px;
    height: 40px;
    border: none;
    background: transparent;
    cursor: grab;
}

/* Large Drag Overlay */
.drag-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85); /* Slightly darker */
    backdrop-filter: blur(20px);
    padding: 1.5rem 2.5rem; /* Reduced from 3rem 5rem */
    border-radius: 20px; /* Reduced from 30px */
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    user-select: none;
    -webkit-user-select: none;
}

.drag-year {
    font-size: 3rem; /* Reduced from 5rem */
    font-weight: 900;
    color: var(--color-primary);
    text-shadow: 0 0 20px var(--color-primary-glow);
}

/* Pop Transition */
.pop-enter-active,
.pop-leave-active {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
}
</style>
