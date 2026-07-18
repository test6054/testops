<script setup lang="ts">
/**
 * 教学档案袋域 Layout 级上下文：全局教师范围选择。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PortfolioScopeHeader from '@/components/portfolio/PortfolioScopeHeader.vue'
import { isPortfolioRoute } from '@/utils/portfolio-route'

defineOptions({ name: 'PortfolioLayoutContext' })

const route = useRoute()

const visible = computed(() => isPortfolioRoute(route.path))
</script>

<template>
  <div v-if="visible" class="portfolio-layout-context">
    <PortfolioScopeHeader />
  </div>
</template>

<style lang="scss" scoped>
.portfolio-layout-context {
  padding: var(--dp-space-3) var(--dp-space-4, 16px) var(--dp-space-3);
  background: var(--dp-bg-layout);
  border-bottom: none;
  /* 单行 Scope 挂载层：禁扩 KPI/身份大卡/黄提示带 */
}
</style>
