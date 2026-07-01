<script setup lang="ts">
import type {
  ArchiveVolumeSubmitChecklistItemVO,
  ArchiveVolumeSubmitProgressVO,
} from '@/apis/mark/archive-volume'
import { computed, ref } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ArchiveVolumeSubmitTaskList from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitTaskList.vue'

defineOptions({ name: 'ArchiveVolumeSubmitProgressBand' })

const props = defineProps<{
  progress?: ArchiveVolumeSubmitProgressVO | null
  blockingItems?: ArchiveVolumeSubmitChecklistItemVO[]
}>()

const emit = defineEmits<{
  navigate: [item: ArchiveVolumeSubmitChecklistItemVO]
}>()

const expanded = ref(false)

const pendingCount = computed(() => {
  if (props.progress?.pendingBlockingCount != null) {
    return props.progress.pendingBlockingCount
  }
  return props.blockingItems?.filter((item) => item.passed !== true).length ?? 0
})

const currentLabel = computed(() => props.progress?.currentStepLabel ?? '材料收齐')
const submitReady = computed(() => props.progress?.submitReady === true)
</script>

<template>
  <section class="archive-volume-submit-progress-band">
    <div class="archive-volume-submit-progress-band__head">
      <div class="archive-volume-submit-progress-band__main">
        <span class="archive-volume-submit-progress-band__label">当前步骤</span>
        <strong class="archive-volume-submit-progress-band__step">{{ currentLabel }}</strong>
        <UiTag v-if="submitReady" tone="green" size="sm">可提交</UiTag>
        <UiTag v-else-if="pendingCount > 0" tone="orange" size="sm"
          >还有 {{ pendingCount }} 项</UiTag
        >
      </div>
      <UiTextAction v-if="pendingCount > 0" @click="expanded = !expanded">
        {{ expanded ? '收起待办' : '展开待办' }}
      </UiTextAction>
    </div>
    <ArchiveVolumeSubmitTaskList
      v-if="expanded && blockingItems?.length"
      :items="blockingItems"
      class="archive-volume-submit-progress-band__tasks"
      @navigate="emit('navigate', $event)"
    />
  </section>
</template>

<style scoped>
.archive-volume-submit-progress-band {
  margin-bottom: var(--dp-space-4, 16px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.archive-volume-submit-progress-band__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
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
