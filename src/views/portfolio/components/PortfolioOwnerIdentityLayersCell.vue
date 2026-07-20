<script setup lang="ts">
/**
 * 台账/列表「身份层」单元格：并列展示 ACTIVE 多身份（§8.50 / US-MI-01）。
 * 外聘身份用橙色标签，校内身份用蓝色；无层时显示 —。
 */
import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'

withDefaults(
  defineProps<{
    layers?: PortfolioMultiIdentityLayerVO[] | null
    /** 多身份贡献说明；层数 >1 时后端通常非空 */
    note?: string | null
    /** 用于 tag :key 前缀，避免列表复用冲突 */
    rowKey?: string | number | null
    showNote?: boolean
  }>(),
  {
    layers: () => [],
    note: '',
    rowKey: '',
    showNote: false,
  },
)
</script>

<template>
  <div class="portfolio-owner-identity-layers-cell">
    <div v-if="layers?.length" class="flex flex-wrap gap-1">
      <UiTag
        v-for="(layer, idx) in layers"
        :key="`${rowKey || 'row'}-${layer.identityType}-${idx}`"
        size="sm"
        :tone="layer.externalIdentity ? 'orange' : 'blue'"
      >
        {{ layer.identityTypeLabel || layer.displayName || layer.identityType }}
      </UiTag>
    </div>
    <span v-else>—</span>
    <p
      v-if="showNote && note"
      class="portfolio-owner-identity-layers-cell__note"
    >
      {{ note }}
    </p>
  </div>
</template>

<style scoped>
.portfolio-owner-identity-layers-cell__note {
  margin: 4px 0 0;
  color: var(--dp-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}
</style>
