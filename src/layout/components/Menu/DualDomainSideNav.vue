<template>
  <a-menu
    class="dual-domain-side-nav"
    :class="{ 'dual-domain-side-nav--collapsed': collapsed }"
    mode="inline"
    :inline-collapsed="collapsed"
    :selected-keys="activeMenuKeys"
    :open-keys="openMenuKeys"
    @click="onMenuClick"
    @open-change="onOpenChange"
  >
    <a-sub-menu key="domain-marking">
      <template #title>
        <span>考试阅卷</span>
      </template>
      <template #icon>
        <MenuIcon icon="audit" />
      </template>
      <a-menu-item
        v-for="item in markingGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuIcon :icon="(item.meta?.icon as string) || 'unordered-list'" />
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
      <a-sub-menu
        v-for="group in markingGrouped.groups"
        :key="group.key"
      >
        <template #title>
          <span>{{ group.title }}</span>
        </template>
        <template #icon>
          <MenuIcon :icon="group.icon" />
        </template>
        <a-menu-item
          v-for="item in group.items"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <template #icon>
            <MenuIcon :icon="(item.meta?.icon as string) || 'folder'" />
          </template>
          <span>{{ item.meta?.title }}</span>
        </a-menu-item>
      </a-sub-menu>
    </a-sub-menu>

    <a-sub-menu key="domain-quality">
      <template #title>
        <span>质量评价</span>
      </template>
      <template #icon>
        <MenuIcon icon="reconciliation" />
      </template>
      <a-menu-item
        v-for="item in qualityGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuIcon :icon="(item.meta?.icon as string) || 'dashboard'" />
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
      <a-sub-menu
        v-for="group in qualityGrouped.groups"
        :key="group.key"
      >
        <template #title>
          <span>{{ group.title }}</span>
        </template>
        <template #icon>
          <MenuIcon :icon="group.icon" />
        </template>
        <a-menu-item
          v-for="item in group.items"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <template #icon>
            <MenuIcon :icon="(item.meta?.icon as string) || 'folder'" />
          </template>
          <span>{{ item.meta?.title }}</span>
        </a-menu-item>
      </a-sub-menu>
    </a-sub-menu>

    <a-sub-menu key="domain-portfolio">
      <template #title>
        <span>教学档案袋</span>
      </template>
      <template #icon>
        <MenuIcon icon="folder" />
      </template>
      <a-menu-item
        v-for="item in portfolioGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuIcon :icon="(item.meta?.icon as string) || 'folder'" />
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
    </a-sub-menu>
  </a-menu>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { RouteRecordRaw } from 'vue-router'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isExternal } from '@/utils/validate'
import { PORTFOLIO_MENU_GROUP } from '@/router/routes/quality'
import MenuIcon from './MenuIcon.vue'

defineOptions({ name: 'DualDomainSideNav' })

const props = defineProps<{
  collapsed: boolean
  markingGrouped: {
    ungrouped: RouteRecordRaw[]
    groups: MenuGroup[]
  }
  qualityGrouped: {
    ungrouped: RouteRecordRaw[]
    groups: MenuGroup[]
  }
  portfolioGrouped: {
    ungrouped: RouteRecordRaw[]
    groups: MenuGroup[]
  }
}>()
const emit = defineEmits<{
  (e: 'menu-item-click-after'): void
}>()
const MARKING_DOMAIN_KEY = 'domain-marking'
const QUALITY_DOMAIN_KEY = 'domain-quality'
const PORTFOLIO_DOMAIN_KEY = 'domain-portfolio'

/** 超管租户级配置与 SaaS 监管分组，展示时归入考试阅卷域（不含考试内阅卷组织）。 */
const MARKING_DOMAIN_MENU_GROUPS = new Set([
  'marking-admin',
  'ai-analysis',
  'exam-delivery',
  'quality-admin',
])

interface MenuGroup {
  key: string
  title: string
  icon: string
  order: number
  items: RouteRecordRaw[]
}

const route = useRoute()
const router = useRouter()

const activeMenuKeys = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    return [meta.activeMenu as string]
  }
  return [path]
})

const openMenuKeys = ref<Key[]>([])

function collectGroupKeySet(grouped: { groups: MenuGroup[] }): Set<string> {
  return new Set(grouped.groups.map((group) => group.key))
}

/** 域收起时同步清理其下二级分组 openKeys，避免 inline 嵌套子菜单被顶到根级。 */
function normalizeOpenKeys(keys: Key[]): Key[] {
  const next = new Set(keys.map(String))
  const markingGroupKeys = collectGroupKeySet(props.markingGrouped)
  const qualityGroupKeys = collectGroupKeySet(props.qualityGrouped)

  if (!next.has(MARKING_DOMAIN_KEY)) {
    for (const groupKey of markingGroupKeys) {
      next.delete(groupKey)
    }
  }
  if (!next.has(QUALITY_DOMAIN_KEY)) {
    for (const groupKey of qualityGroupKeys) {
      next.delete(groupKey)
    }
  }
  for (const groupKey of markingGroupKeys) {
    if (next.has(groupKey)) {
      next.add(MARKING_DOMAIN_KEY)
    }
  }
  for (const groupKey of qualityGroupKeys) {
    if (next.has(groupKey)) {
      next.add(QUALITY_DOMAIN_KEY)
    }
  }
  return [...next]
}

/** 按当前路由展开对应一级域；超管平台配置项归属考试阅卷域。 */
function resolveDefaultOpenKeys(): Key[] {
  if (props.collapsed) {
    return []
  }
  const keys: Key[] = []
  const groupKey = route.meta?.menuGroup as string | undefined

  if (route.path.startsWith('/teacher')) {
    keys.push(MARKING_DOMAIN_KEY)
    if (groupKey) {
      keys.push(groupKey)
    }
    return keys
  }

  if (route.path.startsWith('/quality')) {
    if (groupKey && MARKING_DOMAIN_MENU_GROUPS.has(groupKey)) {
      keys.push(MARKING_DOMAIN_KEY, groupKey)
    } else if (groupKey === PORTFOLIO_MENU_GROUP || route.path.startsWith('/quality/portfolio')) {
      keys.push(PORTFOLIO_DOMAIN_KEY)
    } else {
      keys.push(QUALITY_DOMAIN_KEY)
      if (groupKey) {
        keys.push(groupKey)
      }
    }
  }

  return keys
}

watch(
  () => [route.path, route.meta?.menuGroup, props.collapsed] as const,
  () => {
    openMenuKeys.value = resolveDefaultOpenKeys()
  },
  { immediate: true },
)

function onOpenChange(keys: Key[]) {
  openMenuKeys.value = normalizeOpenKeys(keys)
}

function collectGroupedRoutes(grouped: { ungrouped: RouteRecordRaw[], groups: MenuGroup[] }): RouteRecordRaw[] {
  return [
    ...grouped.ungrouped,
    ...grouped.groups.flatMap((group) => group.items),
  ]
}

function onMenuClick({ key }: { key: Key }) {
  const keyStr = String(key)
  if (
    keyStr === MARKING_DOMAIN_KEY
    || keyStr === QUALITY_DOMAIN_KEY
    || keyStr === PORTFOLIO_DOMAIN_KEY
  ) {
    return
  }
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  const allRoutes = [
    ...collectGroupedRoutes(props.markingGrouped),
    ...collectGroupedRoutes(props.qualityGrouped),
    ...collectGroupedRoutes(props.portfolioGrouped),
  ]
  const menuItem = allRoutes.find((item) => item.path === keyStr)
  if (menuItem?.meta?.disabled) {
    message.error('培养方案尚未确认，请先在「培养方案体系工作台」完成确认')
    return
  }
  if (route.path !== keyStr) {
    void router.push({ path: keyStr })
  }
  emit('menu-item-click-after')
}
</script>

<style lang="scss" scoped>
.dual-domain-side-nav {
  border-inline-end: none !important;
  background: transparent !important;

  :deep(.ant-menu-item-group-title) {
    padding-left: 44px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ant-color-text-tertiary);
  }

  :deep(.ant-menu-sub.ant-menu-inline) {
    background: transparent !important;

    // 一级域下页面项（如教学档案袋）
    > .ant-menu-item {
      padding: 0 12px 0 24px !important;
    }

    // 一级域下二级分组（如质量评价 > 工作台）
    > .ant-menu-submenu > .ant-menu-submenu-title {
      padding: 0 12px 0 24px !important;
    }

    // 二级分组下页面项
    .ant-menu-sub.ant-menu-inline > .ant-menu-item {
      padding: 0 12px 0 48px !important;
    }
  }
}

.dual-domain-side-nav--collapsed {
  :deep(> .ant-menu-submenu > .ant-menu-submenu-title) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding-inline: 0 !important;
  }
}
</style>
