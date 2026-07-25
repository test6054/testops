<script setup lang="ts">
import AiAnalysisScopeFilterBar from '@/components/mark/analysis/AiAnalysisScopeFilterBar.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'

defineOptions({ name: 'AiAnalysisExamScopePanel' })

const { examLocked } = useAiAnalysisScopeContext()
</script>

<template>
  <AiAnalysisScopeFilterBar v-if="examLocked !== true" mode="exam" />
</template>
