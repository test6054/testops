<template>
  <StageRail
    v-if="orderedStages.length > 0"
    :stages="orderedStages"
    :active-key="activeStageKey"
    compact
    allow-pending-select
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import type { WorkbenchStage } from '@/types/workbench'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import StageRail from '@/components/workbench/StageRail.vue'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { navigateToMarkStage } from '@/utils/mark-stage-navigation'

defineOptions({ name: 'MarkExamStageRail' })

const router = useRouter()
const route = useRoute()
const { snapshot, examId } = useMarkWorkbenchContext()
const markStageStore = useMarkStageStore()
const { orderedStages } = storeToRefs(markStageStore)

const activeStageKey = computed(() => {
  const metaKey = route.meta.markStageKey
  return typeof metaKey === 'string' && metaKey ? metaKey : 'ARCHIVE'
})

function handleSelect(stage: WorkbenchStage) {
  navigateToMarkStage(router, stage.key, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
  })
}
</script>
