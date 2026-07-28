<template>
  <UiBreadcrumb v-if="!hideBreadcrumb" class="breadcrumb-wrapper">
    <UiBreadcrumbItem v-for="(item, index) in breadcrumbs" :key="index">
      <component :is="item.icon" v-if="item.icon" class="breadcrumb-icon" />
      <a
        v-if="item.path && index !== breadcrumbs.length - 1"
        class="breadcrumb-link"
        @click="handleNavigate(item.path)"
      >
        {{ item.title }}
      </a>
      <span v-else class="breadcrumb-current">{{ item.title }}</span>
    </UiBreadcrumbItem>
  </UiBreadcrumb>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import HomeOutlined from '@ant-design/icons-vue/HomeOutlined'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiBreadcrumb from '@/components/ui-guide/ui/UiBreadcrumb.vue'
import UiBreadcrumbItem from '@/components/ui-guide/ui/UiBreadcrumbItem.vue'

defineOptions({ name: 'Breadcrumb' })

const router = useRouter()
const route = useRoute()

/**
 * 是否隐藏面包屑（根据路由 meta.hideBreadcrumb 配置）
 */
const hideBreadcrumb = computed(() => route.meta?.hideBreadcrumb === true)

interface BreadcrumbItem {
  title: string
  path?: string
  icon?: Component
}

/**
 * 生成面包屑导航
 */
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const matched = route.matched.filter((item) => item.meta && item.meta.title)
  const breadcrumbList: BreadcrumbItem[] = []

  // 添加首页
  breadcrumbList.push({
    title: '首页',
    path: '/',
    icon: HomeOutlined,
  })

  // 添加路由匹配的层级
  matched.forEach((item, index) => {
    const title = typeof item.meta?.title === 'string' ? item.meta.title : ''
    const path = item.path

    if (path === '/' || !title || item.meta?.hideInBreadcrumb) {
      return
    }

    breadcrumbList.push({
      title,
      path: index === matched.length - 1 ? undefined : path, // 最后一级不可点击
    })
  })

  return breadcrumbList
})

/**
 * 处理导航点击
 */
function handleNavigate(path: string) {
  if (path && route.path !== path) {
    router.push(path)
  }
}
</script>

<style lang="scss" scoped>
.breadcrumb-wrapper {
  display: flex;
  align-items: center;
  height: 100%;

  .breadcrumb-icon {
    margin-right: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-md);
  }

  .breadcrumb-current {
    color: var(--dp-text-primary);
    font-weight: 500;
  }

  :deep(.ant-breadcrumb li) {
    display: flex;
    align-items: center;
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-muted);

    a,
    .breadcrumb-link {
      color: var(--dp-text-muted);
      transition: color var(--dp-duration-slow) var(--dp-ease-default);
      cursor: pointer;

      &:hover {
        color: var(--dp-color-primary);
      }
    }
  }

  :deep(.ant-breadcrumb-separator) {
    margin: 0 var(--dp-space-component-tight);
    color: var(--dp-text-quaternary);
  }
}
</style>
