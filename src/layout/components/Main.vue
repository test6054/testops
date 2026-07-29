<template>
  <UiLayout class="main" role="main">
    <div
      class="main-scroll-wrapper"
      :class="{
        'main-scroll-wrapper--wide': route.meta.layoutWide && !route.meta.layoutImmersive,
        'main-scroll-wrapper--immersive': route.meta.layoutImmersive,
        'main-scroll-wrapper--create-page': route.meta.layoutCreatePage,
        'mark-domain--quality': isQualityDomain,
        'mark-domain--portfolio': isPortfolioDomain,
      }"
    >
      <router-view v-slot="{ Component, route: childRoute }">
        <transition name="page-fade" mode="out-in">
          <keep-alive v-if="shouldCacheRoute(childRoute)">
            <component :is="Component" :key="getRouteKey(childRoute)" />
          </keep-alive>
          <component v-else :is="Component" :key="getRouteKey(childRoute)" />
        </transition>
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
  /* 纯白壳画布；业务卡/表自带描边，不再用灰底托白卡 */
  background: var(--dp-surface);
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
  padding: var(--dp-space-block);
  box-sizing: border-box;
  background: var(--dp-surface);

  /* 列表表体填满：外层不再滚动，表体吃剩余高度；仅含填满表的子树参与 flex 拉伸 */
  &:has(.ui-data-table--fill-remaining) {
    overflow: hidden;
    align-items: stretch;

    :deep(> *) {
      flex: 0 0 auto;
      width: 100%;
    }

    :deep(> *:has(.ui-data-table--fill-remaining)) {
      flex: 1 1 auto;
      min-height: 0;
      height: auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  }

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
    max-width: var(--dp-content-max-width);
    box-sizing: border-box;
  }

  /* 列表/表格页：横向宽模式，1366+ 利用剩余空间 */
  &--wide :deep(> *) {
    max-width: min(100%, var(--dp-content-max-width-wide));
  }

  /* 阅卷 Trust 沉浸：全宽，取消画布内边距 */
  &--immersive {
    padding: 0;
    align-items: stretch;

    :deep(> *) {
      max-width: 100%;
    }
  }

  /* 创建页由 CreatePageLayout / CreateFormPageShell 自管宽度 */
  &--create-page {
    padding: 0;
    align-items: stretch;

    :deep(> *) {
      max-width: 100%;
    }
  }

  // 移动端适配
  @media (max-width: bp.$layout-mobile-max) {
    padding: var(--dp-space-component);

    &--immersive,
    &--create-page {
      padding: 0;
    }

  }

  // 平板适配
  @media (min-width: bp.$shell-tablet-min) and (max-width: bp.$shell-tablet-max) {
    padding: var(--dp-space-component);

    &--immersive,
    &--create-page {
      padding: 0;
    }
  }
}

// 页面切换过渡：页面级时长淡入淡出
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--dp-duration-page) var(--dp-ease-default);
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

// 尊重用户减少动效偏好
@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}
</style>
