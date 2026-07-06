<script setup lang="ts">
import type { AiAnalysisRecordMetaSource } from '@/composables/useAiAnalysisRecordMeta'
import { computed, ref } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useAiAnalysisRecordMeta } from '@/composables/useAiAnalysisRecordMeta'

defineOptions({ name: 'AiAnalysisMetaCollapse' })

const props = defineProps<{
  record: AiAnalysisRecordMetaSource
  failureFallback: string
  extraItems?: Array<{ label: string, value: string }>
}>()

const expanded = ref(false)
const meta = useAiAnalysisRecordMeta(props.failureFallback)

const hasError = computed(() => Boolean(props.record.errorMessage?.trim()))
</script>

<template>
  <div class="ai-analysis-meta">
    <button
      type="button"
      class="ai-analysis-meta__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <UiTag :tone="meta.statusTone(record.analysisStatus)" size="sm">
        {{ meta.statusLabel(record.analysisStatus) }}
      </UiTag>
      <span class="ai-analysis-meta__toggle-label">诊断信息</span>
      <span class="ai-analysis-meta__toggle-hint">{{ expanded ? '收起' : '展开' }}</span>
    </button>
    <div v-if="expanded" class="ai-analysis-meta__panel">
      <dl class="ai-analysis-meta__grid">
        <div v-for="item in extraItems" :key="item.label" class="ai-analysis-meta__item">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
        <div class="ai-analysis-meta__item">
          <dt>生成时间</dt>
          <dd>{{ meta.createTimeText(record) }}</dd>
        </div>
        <div class="ai-analysis-meta__item">
          <dt>生成耗时</dt>
          <dd>{{ meta.latencyText(record) }}</dd>
        </div>
        <div class="ai-analysis-meta__item ai-analysis-meta__item--wide">
          <dt>处理追踪编号</dt>
          <dd>
            <a-typography-text
              v-if="meta.traceId(record)"
              :content="meta.traceId(record)"
              copyable
            />
            <span v-else>{{ meta.traceText(record) }}</span>
          </dd>
        </div>
      </dl>
      <p v-if="hasError" class="ai-analysis-meta__error">
        {{ meta.failureMessage(record.errorMessage) }}
      </p>
    </div>
  </div>
</template>
