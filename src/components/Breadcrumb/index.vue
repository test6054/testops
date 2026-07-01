<template>
  <a-breadcrumb>
    <transition-group name="breadcrumb">
      <a-breadcrumb-item
        v-for="(item, index) in breadcrumbList"
        :key="`${item.path}-${item.meta.title}`"
        v-bind="attrs"
      >
        <span
          v-if="
            item.redirect === 'noRedirect' ||
            item.redirect === '' ||
            index === breadcrumbList.length - 1
          "
          class="gi_line_1"
          >{{ item.meta.title }}</span
        >
        <span v-else class="gi_line_1 breadcrumb-item-title" @click="handleLink(item)">{{
          item.meta.title
        }}</span>
        <RightOutlined v-if="index !== breadcrumbList.length - 1" />
      </a-breadcrumb-item>
    </transition-group>
  </a-breadcrumb>
</template>

<script lang="ts" setup>
import type { RouteLocationMatched } from 'vue-router'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import XEUtils from 'xe-utils'
import { useRouteStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const { routes } = useRouteStore()
const attrs = useAttrs()

let home: RouteLocationMatched | null = null
const getHome = () => {
  if (!home) {
    const cloneRoutes = JSON.parse(JSON.stringify(routes)) as RouteLocationMatched[]
    // 查找首页路由，优先查找管理员工作台
    const obj = XEUtils.findTree(
      cloneRoutes,
      (i) =>
        i.path === '/teacher/dashboard' ||
        i.path === '/teacher/exam-list' ||
        i.path === '/student/score',
    )
    home = obj?.item || null
  }
}

const breadcrumbList = ref<RouteLocationMatched[]>([])

function getBreadcrumbList() {
  getHome()
  const cloneRoutes = JSON.parse(JSON.stringify(routes)) as RouteLocationMatched[]
  const obj = XEUtils.findTree(cloneRoutes, (i) => i.path === route.path)
  // 获取当前节点的所有上级节点集合，包含当前节点
  const arr = obj
    ? obj.nodes.filter((item) => item.meta && item.meta.title && item.meta.breadcrumb !== false)
    : []
  if (home) {
    breadcrumbList.value = [home, ...arr]
  }
}

getBreadcrumbList()

watchEffect(() => {
  if (route.path.startsWith('/redirect/')) return
  getBreadcrumbList()
})

// 路由跳转
function handleLink(item: RouteLocationMatched) {
  const { redirect, path } = item
  if (redirect) {
    return router.push(redirect as string)
  }
  router.push(path)
}
</script>

<style lang="scss" scoped>
/** breadcrumb-transform 面包屑动画 */
.breadcrumb-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.breadcrumb-enter-from,
.breadcrumb-leave-active {
  opacity: 0;
  transform: translateX(10px);
}

@media (prefers-reduced-motion: reduce) {
  .breadcrumb-enter-active {
    transition: none !important;
  }

  .breadcrumb-item-title {
    transition: none !important;
  }
}

:deep(.ant-breadcrumb-item) {
  padding: 0;
  display: flex;
  align-items: center;

  .anticon-right {
    margin: 0 4px;
  }
}

.breadcrumb-item-title {
  transition: color 0.3s ease;
  cursor: pointer;

  &:hover {
    color: var(--ant-color-primary);
    font-weight: 600;
  }
}
</style>
