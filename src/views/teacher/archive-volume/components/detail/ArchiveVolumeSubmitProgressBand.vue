<script setup lang="ts">
import type {
  ArchiveVolumeSubmitChecklistItemVO,
  ArchiveVolumeSubmitProgressVO,
} from '@/apis/mark/archive-volume'
import { computed, ref, watch } from 'vue'
import {
  ArchiveVolumeSubmitChecklistPhaseDescription,
} from '@/apis/mark/archive-volume'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveVolumeSubmitTaskList from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitTaskList.vue'

defineOptions({ name: 'ArchiveVolumeSubmitProgressBand' })

const props = defineProps<{
  progress?: ArchiveVolumeSubmitProgressVO | null
  /** 卷级 submitReady，与列表/提交门禁同源，优先于 progress 缓存 */
  volumeSubmitReady?: boolean
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[]
}>()

const emit = defineEmits<{
  navigate: [item: ArchiveVolumeSubmitChecklistItemVO]
}>()

const expanded = ref(false)

watch(
  () => props.blockingItems,
  (items) => {
    const pending = items?.filter((item) => item.passed !== true).length ?? 0
    if (pending > 0) {
      expanded.value = true
    }
  },
  { immediate: true },
)

const pendingCount = computed(() => {
  const fromItems = props.blockingItems?.filter((item) => item.passed !== true).length ?? 0
  if (props.volumeSubmitReady === false && fromItems > 0) {
    return fromItems
  }
  if (props.progress?.pendingBlockingCount != null) {
    return props.progress.pendingBlockingCount
  }
  return fromItems
})

const currentLabel = computed(() => {
  if (!props.progress) return ''
  return strictEnumLabel(
    ArchiveVolumeSubmitChecklistPhaseDescription,
    props.progress.checklistPhaseKey,
    'checklistPhaseKey',
  )
})
const submitReady = computed(() => props.volumeSubmitReady === true)
</script>

<template>
  <WorkbenchSurfaceCard class="archive-volume-submit-progress-band">
    <template #head>
      <div class="archive-volume-submit-progress-band__head">
        <div class="archive-volume-submit-progress-band__main">
          <span class="archive-volume-submit-progress-band__label">当前阶段</span>
          <strong class="archive-volume-submit-progress-band__step">{{ currentLabel }}</strong>
          <UiTag v-if="submitReady" tone="green" size="sm">可提交</UiTag>
          <UiTag v-else-if="pendingCount > 0" tone="orange" size="sm">
            还有 {{ pendingCount }} 项
          </UiTag>
        </div>
        <UiTextAction v-if="pendingCount > 0" @click="expanded = !expanded">
          {{ expanded ? '收起待办' : '展开待办' }}
        </UiTextAction>
      </div>
    </template>
    <ArchiveVolumeSubmitTaskList
      v-if="expanded && blockingItems?.length"
      :items="blockingItems"
      class="archive-volume-submit-progress-band__tasks"
      @navigate="emit('navigate', $event)"
    />
  </WorkbenchSurfaceCard>
</template>

<style scoped>
.archive-volume-submit-progress-band {
  margin-bottom: var(--dp-space-4, 16px);
}

.archive-volume-submit-progress-band__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  width: 100%;
}

.archive-volume-submit-progress-band__main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-submit-progress-band__label {
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.archive-volume-submit-progress-band__step {
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.archive-volume-submit-progress-band__tasks {
  margin-top: var(--dp-space-3, 12px);
}
</style>
