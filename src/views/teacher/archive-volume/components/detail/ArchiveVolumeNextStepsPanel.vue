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
    showUserError(new Error('未知卷外跳转目标'), '未知卷外跳转目标')
    return
  }
  void router.push(
    resolveArchiveNextStepRouteLocation(action.externalRouteKey, {
      examId: props.examId,
      volumeId: props.volumeId,
    }),
  )
}
</script>

<style scoped>
.archive-next-steps__head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-3);
}

.archive-next-steps__head-icon {
  font-size: var(--dp-font-size-md);
  line-height: 1;
  color: var(--dp-primary);
}

.archive-next-steps__title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text);
}

.archive-next-steps__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
}

.archive-next-steps__item {
  flex: 1 1 160px;
  min-width: 0;
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-sm);
  background: var(--dp-surface);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.archive-next-steps__item:hover {
  border-color: var(--dp-primary);
  box-shadow: var(--dp-shadow-sm);
  transform: translateY(-1px);
}

.archive-next-steps__item--primary {
  border-color: var(--dp-orange-500);
  background: color-mix(in srgb, var(--dp-orange-500) 6%, var(--dp-surface));
}

.archive-next-steps__item--primary:hover {
  border-color: var(--dp-orange-600, var(--dp-orange-500));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--dp-orange-500) 16%, transparent);
}

.archive-next-steps__item-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
  margin-bottom: 4px;
}

.archive-next-steps__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--dp-radius-xs);
  background: color-mix(in srgb, var(--dp-primary) 10%, transparent);
  color: var(--dp-primary);
  font-size: var(--dp-font-size-xxs);
  font-weight: 700;
  flex-shrink: 0;
}

.archive-next-steps__item-label {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text);
}

.archive-next-steps__item-desc {
  margin: 0;
  padding-left: 30px;
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-4);
}

@media (prefers-reduced-motion: reduce) {
  .archive-next-steps__item {
    transition: none;
  }

  .archive-next-steps__item:hover {
    transform: none;
  }
}
</style>
