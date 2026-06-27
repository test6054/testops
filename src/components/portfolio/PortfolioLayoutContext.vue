<script setup lang="ts">
/**
 * 教学档案袋域 Layout 级上下文：全局教师范围选择。
 */
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import PortfolioScopeHeader from '@/components/portfolio/PortfolioScopeHeader.vue'
import { portfolioLayoutScopeProvidedKey } from '@/composables/portfolio-layout-context'
import { isPortfolioRoute } from '@/utils/portfolio-route'

defineOptions({ name: 'PortfolioLayoutContext' })

const route = useRoute()

const layoutScopeProvided = ref(true)
provide(portfolioLayoutScopeProvidedKey, layoutScopeProvided)

const visible = computed(() => isPortfolioRoute(route.path))

function handleScopeChange() {
  // 子页面通过 portfolioStore.scopeChangeEpoch 监听刷新
}
</script>

<template>
  <div v-if="visible" class="portfolio-layout-context">
    <PortfolioScopeHeader @change="handleScopeChange" />
  </div>
</template>

<style lang="scss" scoped>
.portfolio-layout-context {
  padding: var(--dp-space-4, 16px) 24px 0;
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);
}
</style>
