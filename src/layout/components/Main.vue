<template>
  <a-layout class="main" role="main">
    <div class="main-scroll-wrapper">
      <router-view v-slot="{ Component, route }">
        <component v-if="Component" :is="Component" :key="getRouteKey(route)" />
      </router-view>
    </div>
  </a-layout>
</template>

<script lang="ts" setup>
import type { RouteLocationNormalized } from 'vue-router'

defineOptions({ name: 'LayoutMain' })

/**
 * 获取路由缓存key
 * 某些特殊路由需要根据参数区分实例
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
  // 用户详情页根据用户ID区分，确保每次ID变化都重新加载
  if (route.name === 'AdminUserDetail') {
    return `AdminUserDetail_${route.params.id}`
  }
  // 默认使用路径
  return route.path
}
</script>

<style lang="scss" scoped>
.main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; // 外层不滚动
  position: relative;
  background: var(--ant-color-bg-container);
}

// 滚动包装层 - 负责滚动，覆盖整个宽度
.main-scroll-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: var(--ant-color-bg-container);

  // 自定义细滚动条样式（替代完全隐藏，保持可操作性）
  scrollbar-width: thin; // Firefox
  scrollbar-color: var(--ant-color-fill) transparent; // Firefox

  &::-webkit-scrollbar {
    width: 4px; // Chrome/Safari/Opera
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--ant-color-fill);
    border-radius: var(--dp-radius-xs);
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--ant-color-text-quaternary);
  }

  :deep(> *) {
    width: 100%;
    box-sizing: border-box;
  }

  // 移动端适配
  @media (max-width: 768px) {
    padding: 12px;

    // 为底部TabBar留出空间
    &.with-tabbar {
      padding-bottom: 68px;
    }
  }

  // 平板适配
  @media (min-width: 769px) and (max-width: 1024px) {
    padding: 16px;
  }
}
</style>
