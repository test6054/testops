<template>
  <section class="archive-next-steps" data-component="next-steps">
    <header class="archive-next-steps__head">
      <span class="archive-next-steps__head-icon" aria-hidden="true">⏱</span>
      <h3 class="archive-next-steps__title">下一步行动</h3>
    </header>
    <div class="archive-next-steps__grid">
      <button
        v-for="(action, index) in displayedActions"
        :key="`${action.label}-${index}`"
        type="button"
        class="archive-next-steps__item"
        :class="{ 'archive-next-steps__item--primary': index === 0 }"
        @click="handleAction(action)"
      >
        <div class="archive-next-steps__item-head">
          <span v-if="action.icon" class="archive-next-steps__item-icon">{{ action.icon }}</span>
          <span class="archive-next-steps__item-label">{{ action.label }}</span>
        </div>
        <p class="archive-next-steps__item-desc">{{ action.description }}</p>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ArchiveVolumeNextStepActionVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  isArchiveVolumeNextStepExternalRouteKey,
  resolveArchiveNextStepRouteLocation,
} from '@/utils/archive-next-step-navigation'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ArchiveVolumeNextStepsPanel' })

const props = defineProps<{
  actions: ArchiveVolumeNextStepActionVO[]
  examId?: string
  volumeId?: string
}>()

const emit = defineEmits<{
  'tab-change': [tabKey: string]
}>()

const router = useRouter()

/** 与原型 nextStepsPanel 一致，最多展示 3 项。 */
const displayedActions = computed(() => props.actions.slice(0, 3))

function handleAction(action: ArchiveVolumeNextStepActionVO): void {
  if (action.targetTabKey) {
    emit('tab-change', action.targetTabKey)
    return
  }
  if (!action.externalRouteKey) {
    showUserError(new Error('下一步行动缺少跳转目标'))
    return
  }
  if (!isArchiveVolumeNextStepExternalRouteKey(action.externalRouteKey)) {
    showUserError(new Error(`未知卷外路由键：${action.externalRouteKey}`))
    return
  }
  void router.push(resolveArchiveNextStepRouteLocation(action.externalRouteKey, {
    examId: props.examId,
    volumeId: props.volumeId,
  }))
}
</script>

<style scoped>
.archive-next-steps__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-next-steps__head-icon {
  font-size: 14px;
  line-height: 1;
  color: var(--dp-primary, #2d7ff9);
}

.archive-next-steps__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.archive-next-steps__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
}

.archive-next-steps__item {
  flex: 1 1 160px;
  min-width: 0;
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border-light, #eef0f3);
  border-radius: var(--dp-radius-sm, 4px);
  background: var(--dp-surface, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.archive-next-steps__item:hover {
  border-color: var(--dp-primary, #2d7ff9);
  box-shadow: 0 2px 8px rgba(45, 127, 249, 0.08);
}

.archive-next-steps__item--primary {
  border-left: 3px solid var(--dp-orange-500, #f59e0b);
  background: color-mix(in srgb, var(--dp-orange-500, #f59e0b) 6%, var(--dp-surface, #fff));
}

.archive-next-steps__item-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin-bottom: 4px;
}

.archive-next-steps__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--dp-radius-xs, 2px);
  background: color-mix(in srgb, var(--dp-primary, #2d7ff9) 10%, transparent);
  color: var(--dp-primary, #2d7ff9);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.archive-next-steps__item-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.archive-next-steps__item-desc {
  margin: 0;
  padding-left: 30px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-4, #8b919a);
}
</style>
