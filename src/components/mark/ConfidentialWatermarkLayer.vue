<script lang="ts" setup>
import { computed } from 'vue'

defineOptions({ name: 'ConfidentialWatermarkLayer' })

const props = withDefaults(
  defineProps<{
    lines?: string[]
    density?: 'normal' | 'dense'
  }>(),
  {
    lines: () => [],
    density: 'normal',
  },
)

const watermarkText = computed(() => props.lines.filter(Boolean).join(' · '))

const tileCount = computed(() => (props.density === 'dense' ? 48 : 32))
</script>

<template>
  <div
    v-if="watermarkText"
    class="confidential-watermark"
    :class="`confidential-watermark--${props.density}`"
    aria-hidden="true"
  >
    <div class="confidential-watermark__grid">
      <span v-for="index in tileCount" :key="index" class="confidential-watermark__tile">
        {{ watermarkText }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.confidential-watermark {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
  overflow: hidden;

  &__grid {
    position: absolute;
    inset: -35%;
    display: grid;
    grid-template-columns: repeat(4, minmax(220px, 1fr));
    gap: 40px 56px;
    transform: rotate(-22deg);
    opacity: 0.14;
  }

  &--dense &__grid {
    grid-template-columns: repeat(5, minmax(200px, 1fr));
    gap: 28px 40px;
    opacity: 0.18;
  }

  &__tile {
    font-size: var(--dp-font-size-sm);
    line-height: 1.4;
    color: var(--dp-text-primary);
    white-space: nowrap;
    user-select: none;
  }
}
</style>
