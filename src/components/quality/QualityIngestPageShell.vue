<script lang="ts" setup>
/**
 * 质量数据接入页外壳：hub 内嵌时省略 StageWorkbenchShell 与重复 ContextBar。
 */
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQualityPageScope } from '@/composables/useQualityPageScope'

defineOptions({ name: 'QualityIngestPageShell' })

const { useStandaloneShell } = useQualityPageScope()
</script>

<template>
  <StageWorkbenchShell v-if="useStandaloneShell">
    <template v-if="$slots.context" #context>
      <slot name="context" />
    </template>
    <slot />
  </StageWorkbenchShell>
  <div v-else class="quality-ingest-embedded">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.quality-ingest-embedded {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}
</style>
