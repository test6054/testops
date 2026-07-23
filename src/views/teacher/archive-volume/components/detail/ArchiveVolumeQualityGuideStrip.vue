<script setup lang="ts">
/**
 * 质检三 Tab 顶栏引导：只展示当前页的下一步主动作，替代「更多」垃圾抽屉承担引导。
 */
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'ArchiveVolumeQualityGuideStrip' })

defineProps<{
  title: string
  description?: string
  actionLabel?: string
  actionLoading?: boolean
  actionDisabled?: boolean
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="archive-quality-guide" role="status">
    <div class="archive-quality-guide__copy">
      <p class="archive-quality-guide__title">{{ title }}</p>
      <p v-if="description" class="archive-quality-guide__desc">{{ description }}</p>
    </div>
    <UiButton
      v-if="actionLabel"
      size="sm"
      variant="primary"
      :loading="actionLoading"
      :disabled="actionDisabled"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </UiButton>
  </div>
</template>

<style scoped lang="scss">
.archive-quality-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--ant-color-primary) 28%, var(--dp-border-subtle));
  border-radius: var(--dp-radius-panel);
  background: color-mix(in srgb, var(--ant-color-primary) 6%, var(--dp-surface));
}

.archive-quality-guide__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.archive-quality-guide__title {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  line-height: 1.4;
  color: var(--dp-text-primary);
}

.archive-quality-guide__desc {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
  color: var(--dp-text-secondary);
}
</style>
