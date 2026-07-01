<script lang="ts" setup>
/**
 * 质量数据接入页外壳：hub 内嵌时省略 StageWorkbenchShell。
 */
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'

defineOptions({ name: 'QualityIngestPageShell' })

defineProps<{
  embedded?: boolean
}>()
</script>

<template>
  <StageWorkbenchShell v-if="!embedded">
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
