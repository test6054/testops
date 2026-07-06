<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'AiAnalysisConfigCollapse' })

const props = withDefaults(
  defineProps<{
    title?: string
    defaultExpanded?: boolean
  }>(),
  { title: '分析范围配置', defaultExpanded: false },
)

const expanded = ref(props.defaultExpanded)
</script>

<template>
  <div class="ai-analysis-config">
    <button
      type="button"
      class="ai-analysis-config__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="ai-analysis-config__toggle-label">{{ title }}</span>
      <span class="ai-analysis-config__toggle-hint">{{ expanded ? '收起' : '展开' }}</span>
    </button>
    <div v-if="expanded" class="ai-analysis-config-panel">
      <slot />
    </div>
  </div>
</template>
