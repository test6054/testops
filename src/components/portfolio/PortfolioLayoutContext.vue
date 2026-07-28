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

// 不消费教师 scope 的页面（多教师队列 / 租户级配置）须显式隐藏，避免惰性选择器误导
const visible = computed(() => isPortfolioRoute(route.path) && route.meta.hidePortfolioScope !== true)
</script>

<template>
  <div v-if="visible" class="portfolio-layout-context">
    <PortfolioScopeHeader />
  </div>
</template>

<style lang="scss" scoped>
.portfolio-layout-context {
  padding: var(--dp-space-component) var(--dp-space-block) var(--dp-space-component);
  background: var(--dp-bg-muted);
  border-bottom: none;
  /* 单行 Scope 挂载层：禁扩 KPI/身份大卡/黄提示带 */
}
</style>
