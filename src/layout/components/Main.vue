<template>
  <UiLayout class="main" role="main">
    <div
      class="main-scroll-wrapper"
      :class="{
        'main-scroll-wrapper--wide': route.meta.layoutWide,
        'main-scroll-wrapper--create-page': route.meta.layoutCreatePage,
        'mark-domain--quality': isQualityDomain,
        'mark-domain--portfolio': isPortfolioDomain,
      }"
    >
      <router-view v-slot="{ Component, route: childRoute }">
        <template v-if="Component">
          <keep-alive v-if="shouldCacheRoute(childRoute)">
            <component :is="Component" :key="getRouteKey(childRoute)" />
          </keep-alive>
          <component v-else :is="Component" :key="getRouteKey(childRoute)" />
        </template>
      </router-view>
    </div>
  </UiLayout>
</template>

<script lang="ts" setup>
import type { RouteLocationNormalized } from 'vue-router'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiLayout from '@/components/ui-guide/ui/UiLayout.vue'
import { isPortfolioRoute, isQualityEvaluationRoute } from '@/utils/portfolio-route'

defineOptions({ name: 'LayoutMain' })

const route = useRoute()
const isQualityDomain = computed(() => isQualityEvaluationRoute(route.path))
const isPortfolioDomain = computed(() => isPortfolioRoute(route.path))

/**
 * 获取路由缓存 key。
 * 部分路由需按业务主键区分缓存实例。
 */
const getRouteKey = (route: RouteLocationNormalized) => {
  // 课程内容视图根据课程ID区分，忽略sectionId变化
  if (route.name === 'CourseContentView') {
    return `CourseContentView_${route.params.id}`
  }
  // 学生端课程内容视图也使用相同逻辑
  if (route.name === 'StudentCourseContentView') {
    return `StudentCourseContentView_${route.params.id}`
  }
  // 学生任务工作台根据任务ID区分
  if (route.name === 'TaskWorkspace') {
    return `${route.path}_${route.params.id || route.query.taskId || ''}`
  }
  // 用户详情页按用户 ID 区分缓存，ID 变化时重新加载
  if (route.name === 'AdminUserDetail') {
    return `AdminUserDetail_${route.params.id}`
  }
  // 默认使用路径
  return route.path
}

/** 与路由 meta.keepAlive 对齐：仅显式 true 时缓存（quality / teacher 列表页） */
function shouldCacheRoute(childRoute: RouteLocationNormalized): boolean {
  if (childRoute.meta.noCache === true) {
    return false
  }
  return childRoute.meta.keepAlive === true
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.main {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  /* 页面 canvas 用布局灰；白 panel 由 WorkbenchSurfaceCard / Shell 承载 */
  background: var(--dp-bg-layout);
}

// 滚动包装层：负责滚动，覆盖整个宽度
.main-scroll-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--dp-space-4, 16px);
  box-sizing: border-box;
  background: var(--dp-bg-layout);

  // 自定义细滚动条样式（替代完全隐藏，保持可操作性）
  scrollbar-width: thin; // Firefox
  scrollbar-color: var(--dp-fill) transparent; // Firefox

  &::-webkit-scrollbar {
    width: 4px; // Chrome/Safari/Opera
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--dp-fill);
    border-radius: var(--dp-radius-xs);
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--dp-text-quaternary);
  }

  :deep(> *) {
    width: 100%;
    max-width: 1400px;
    box-sizing: border-box;
  }

  &--wide :deep(> *) {
    max-width: min(100%, 1680px);
  }

  // 移动端适配
  @media (max-width: bp.$layout-mobile-max) {
    padding: var(--dp-space-3, 12px);

    // 为底部TabBar留出空间
    &.with-tabbar {
      padding-bottom: 68px;
    }
  }

  // 平板适配
  @media (min-width: bp.$shell-tablet-min) and (max-width: bp.$shell-tablet-max) {
    padding: var(--dp-space-3, 12px);
  }
}
</style>
