<script setup lang="ts">
import type { AiAnalysisHistoryRow } from '@/utils/ai-analysis-history'
import { computed } from 'vue'
import { formatAiAnalysisHistoryLabel } from '@/utils/ai-analysis-history'

defineOptions({ name: 'AiAnalysisHistorySelect' })

const selectedId = defineModel<string | undefined>()

const props = defineProps<{
  rows: AiAnalysisHistoryRow[]
  loading?: boolean
}>()

const options = computed(() =>
  props.rows.map((row) => ({
    value: row.id,
    label: formatAiAnalysisHistoryLabel(row),
  })),
)
</script>

<template>
  <a-select
    v-if="rows.length > 0"
    v-model:value="selectedId"
    :options="options"
    :loading="loading"
    placeholder="历史记录"
    show-search
    option-filter-prop="label"
    size="small"
    class="ai-analysis-history-select"
  />
</template>

<style scoped lang="scss">
.ai-analysis-history-select {
  min-width: 280px;
  max-width: 420px;
}
</style>
