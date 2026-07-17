<script setup lang="ts">
import type { AiAnalysisClusterSignalResponse } from '@/apis/mark/analysis-center'
import { computed } from 'vue'
import AiAnalysisExamScopePanel from '@/components/mark/analysis/AiAnalysisExamScopePanel.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'
import AiAnalysisClusterWorkbench from '@/views/teacher/ai-analysis/AiAnalysisClusterWorkbench.vue'

defineProps<{
  reloadToken: number
  clusterSignal?: AiAnalysisClusterSignalResponse | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const { examId, classId } = useAiAnalysisScopeContext()

const resolvedExamId = computed(() => examId.value)
</script>

<template>
  <div class="ai-analysis-cluster-tab">
    <AiAnalysisExamScopePanel />
    <AiAnalysisClusterWorkbench
      :exam-id="resolvedExamId"
      :reload-token="reloadToken"
      :class-id="classId"
      :cluster-signal="clusterSignal"
      @changed="emit('changed')"
    />
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-cluster-tab {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}
</style>
