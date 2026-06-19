<script setup lang="ts">
import type { WorkbenchStage } from '@/types/workbench'
import { useRouter } from 'vue-router'
import { StageRail } from '@/components/workbench'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkExamStageRail } from '@/composables/useMarkExamStageRail'
import { navigateToMarkStage } from '@/utils/mark-stage-navigation'

defineOptions({ name: 'MarkExamStageRail' })

const router = useRouter()
const { selectedExamId } = useMarkExamContext()
const { orderedStages } = useMarkExamStageRail(selectedExamId)

function onStageSelect(stage: WorkbenchStage): void {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  navigateToMarkStage(router, stage.key, examId)
}
</script>

<template>
  <StageRail
    v-if="selectedExamId && orderedStages.length > 0"
    :stages="orderedStages"
    compact
    @select="onStageSelect"
  />
</template>
