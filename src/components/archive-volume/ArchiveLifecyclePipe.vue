<script lang="ts" setup>
import type { ArchiveLifecycleStep } from '@/utils/archive-volume-lifecycle'
import { computed } from 'vue'
import ArchiveLifecyclePipeTrack from '@/components/archive-volume/ArchiveLifecyclePipeTrack.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { countArchiveLifecycleDoneSteps } from '@/utils/archive-volume-lifecycle'

defineOptions({ name: 'ArchiveLifecyclePipe' })

const props = withDefaults(
  defineProps<{
    steps: ArchiveLifecycleStep[]
    title?: string
    /** 后端 completedLifecycleCount；卷主链须传入，子链/向导留空则由 steps 本地统计 */
    completedCount?: number
    /** 后端 totalLifecycleCount；与 completedCount 成对传入 */
    totalCount?: number
    /** 为 true 时步骤节点可点击并触发 step-click */
    clickable?: boolean
    /** 为 true 时不渲染外层 WorkbenchSurfaceCard，仅输出 pipe 行 */
    embedded?: boolean
  }>(),
  {
    title: '归档生命周期',
    clickable: false,
    embedded: false,
  },
)

const emit = defineEmits<{
  'step-click': [stepKey: string]
}>()

const doneCount = computed(() => {
  if (props.completedCount != null) {
    return props.completedCount
  }
  return countArchiveLifecycleDoneSteps(props.steps)
})

const stageTotal = computed(() => {
  if (props.totalCount != null) {
    return props.totalCount
  }
  return props.steps.length
})
</script>

<template>
  <WorkbenchSurfaceCard v-if="!embedded" flush class="archive-lifecycle-pipe-card">
    <template #head>
      <span class="archive-lifecycle-pipe-card__title">{{ title }}</span>
    </template>
    <template v-if="steps.length > 0" #toolbar>
      <span class="archive-lifecycle-pipe-card__progress">{{ doneCount }}/{{ stageTotal }} 阶段</span>
    </template>
    <ArchiveLifecyclePipeTrack
      :steps="steps"
      :clickable="clickable"
      @step-click="emit('step-click', $event)"
    />
  </WorkbenchSurfaceCard>
  <div v-else class="archive-lifecycle-pipe-card">
    <ArchiveLifecyclePipeTrack
      :steps="steps"
      :clickable="clickable"
      @step-click="emit('step-click', $event)"
    />
  </div>
</template>

<style lang="scss" scoped>
.archive-lifecycle-pipe-card {
  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__progress {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}
</style>
