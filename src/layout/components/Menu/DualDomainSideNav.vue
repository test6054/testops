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
        <MenuCollapsedTooltip :collapsed="collapsed" label="考试阅卷">
          <MenuIcon icon="audit" />
        </MenuCollapsedTooltip>
      </template>
      <a-menu-item
        v-for="item in markingGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'unordered-list')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
      <a-sub-menu v-for="group in markingGrouped.groups" :key="group.key">
        <template #title>
          <span>{{ group.title }}</span>
        </template>
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
            <MenuIcon :icon="group.icon" />
          </MenuCollapsedTooltip>
        </template>
        <a-menu-item v-for="item in group.items" :key="item.path" :disabled="item.meta?.disabled">
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
              <MenuIcon :icon="routeIcon(item, 'folder')" />
            </MenuCollapsedTooltip>
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
        <MenuCollapsedTooltip :collapsed="collapsed" label="质量评价">
          <MenuIcon icon="reconciliation" />
        </MenuCollapsedTooltip>
      </template>
      <a-menu-item
        v-for="item in qualityGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'dashboard')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
      <a-sub-menu v-for="group in qualityGrouped.groups" :key="group.key">
        <template #title>
          <span>{{ group.title }}</span>
        </template>
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
            <MenuIcon :icon="group.icon" />
          </MenuCollapsedTooltip>
        </template>
        <a-menu-item v-for="item in group.items" :key="item.path" :disabled="item.meta?.disabled">
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
              <MenuIcon :icon="routeIcon(item, 'folder')" />
            </MenuCollapsedTooltip>
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
        <MenuCollapsedTooltip :collapsed="collapsed" label="教学档案袋">
          <MenuIcon icon="folder" />
        </MenuCollapsedTooltip>
      </template>
      <a-menu-item
        v-for="item in portfolioGrouped.ungrouped"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'folder')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
      <a-sub-menu v-for="group in portfolioGrouped.groups" :key="group.key">
        <template #title>
          <span>{{ group.title }}</span>
        </template>
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
            <MenuIcon :icon="group.icon" />
          </MenuCollapsedTooltip>
        </template>
        <a-menu-item v-for="item in group.items" :key="item.path" :disabled="item.meta?.disabled">
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
              <MenuIcon :icon="routeIcon(item, 'folder')" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ item.meta?.title }}</span>
        </a-menu-item>
      </a-sub-menu>
    </a-sub-menu>

    <a-sub-menu v-if="platformMenuItems.length > 0" key="domain-platform">
      <template #title>
        <span>系统管理</span>
      </template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="collapsed" label="系统管理">
          <MenuIcon icon="setting" />
        </MenuCollapsedTooltip>
      </template>
      <a-menu-item
        v-for="item in platformMenuItems"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'setting')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </a-menu-item>
    </a-sub-menu>
  </a-menu>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { RouteRecordRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { isPortfolioRoute, QUALITY_ADMIN_MENU_GROUP } from '@/utils/portfolio-route'
import { isExternal } from '@/utils/validate'
import MenuCollapsedTooltip from './MenuCollapsedTooltip.vue'
import MenuIcon from './MenuIcon.vue'

defineOptions({ name: 'DualDomainSideNav' })

const props = defineProps<{
  collapsed: boolean
  markingGrouped: {
    ungrouped: RouteRecordRaw[]
    groups: MenuGroup[]
  }
  platformGrouped: {
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
const PLATFORM_DOMAIN_KEY = 'domain-platform'
const QUALITY_DOMAIN_KEY = 'domain-quality'
const PORTFOLIO_DOMAIN_KEY = 'domain-portfolio'

interface MenuGroup {
  key: string
  title: string
  icon: string
  order: number
  items: RouteRecordRaw[]
}

const route = useRoute()
const router = useRouter()

function stringMetaValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError('四域侧栏路由 meta 字符串契约异常')
  }
  return value
}

function routeIcon(item: RouteRecordRaw, fallback: string): string {
  return stringMetaValue(item.meta?.icon) || fallback
}

function routeTitle(item: RouteRecordRaw): string {
  return stringMetaValue(item.meta?.title) ?? ''
}

const activeMenuKeys = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    const activeMenu = stringMetaValue(meta.activeMenu)
    return activeMenu ? [activeMenu] : [path]
  }
  return [path]
})

const openMenuKeys = ref<Key[]>([])

const platformMenuItems = computed(() => collectGroupedRoutes(props.platformGrouped))

function collectGroupKeySet(grouped: { groups: MenuGroup[] }): Set<string> {
  return new Set(grouped.groups.map((group) => group.key))
}

function onOpenChange(keys: Key[]) {
  openMenuKeys.value = normalizeOpenKeys(keys)
}

/** 域收起时同步清理其下二级分组 openKeys，并限制同时仅展开一个一级域。 */
function normalizeOpenKeys(keys: Key[]): Key[] {
  const next = new Set(keys.map(String))
  const markingGroupKeys = collectGroupKeySet(props.markingGrouped)
  const platformGroupKeys = collectGroupKeySet(props.platformGrouped)
  const qualityGroupKeys = collectGroupKeySet(props.qualityGrouped)
  const portfolioGroupKeys = collectGroupKeySet(props.portfolioGrouped)
  const domainKeys = [
    MARKING_DOMAIN_KEY,
    QUALITY_DOMAIN_KEY,
    PORTFOLIO_DOMAIN_KEY,
    PLATFORM_DOMAIN_KEY,
  ]

  if (!next.has(MARKING_DOMAIN_KEY)) {
    for (const groupKey of markingGroupKeys) {
      next.delete(groupKey)
    }
  }
  if (!next.has(PLATFORM_DOMAIN_KEY)) {
    for (const groupKey of platformGroupKeys) {
      next.delete(groupKey)
    }
  }
  if (!next.has(QUALITY_DOMAIN_KEY)) {
    for (const groupKey of qualityGroupKeys) {
      next.delete(groupKey)
    }
  }
  if (!next.has(PORTFOLIO_DOMAIN_KEY)) {
    for (const groupKey of portfolioGroupKeys) {
      next.delete(groupKey)
    }
  }
  for (const groupKey of markingGroupKeys) {
    if (next.has(groupKey)) {
      next.add(MARKING_DOMAIN_KEY)
    }
  }
  for (const groupKey of platformGroupKeys) {
    if (next.has(groupKey)) {
      next.add(PLATFORM_DOMAIN_KEY)
    }
  }
  for (const groupKey of qualityGroupKeys) {
    if (next.has(groupKey)) {
      next.add(QUALITY_DOMAIN_KEY)
    }
  }
  for (const groupKey of portfolioGroupKeys) {
    if (next.has(groupKey)) {
      next.add(PORTFOLIO_DOMAIN_KEY)
    }
  }

  const openDomains = domainKeys.filter((domainKey) => next.has(domainKey))
  if (openDomains.length > 1) {
    // 多域同时出现时保留用户最近点开的域（keys 末位），而不是锁死当前路由所属域
    const ordered = keys.map(String).filter((key) => domainKeys.includes(key))
    const keepDomain = ordered[ordered.length - 1] || openDomains[openDomains.length - 1]
    for (const domainKey of domainKeys) {
      if (domainKey === keepDomain) {
        continue
      }
      next.delete(domainKey)
      const groupKeys =
        domainKey === MARKING_DOMAIN_KEY
          ? markingGroupKeys
          : domainKey === PLATFORM_DOMAIN_KEY
            ? platformGroupKeys
            : domainKey === QUALITY_DOMAIN_KEY
              ? qualityGroupKeys
              : portfolioGroupKeys
      for (const groupKey of groupKeys) {
        next.delete(groupKey)
      }
    }
  }

  return [...next]
}

/** 按当前路由展开对应一级域；quality-admin 路由归属系统管理域。 */
function resolveDefaultOpenKeys(): Key[] {
  if (props.collapsed) {
    return []
  }
  const keys: Key[] = []
  const groupKey = stringMetaValue(route.meta?.menuGroup)

  if (groupKey === QUALITY_ADMIN_MENU_GROUP) {
    keys.push(PLATFORM_DOMAIN_KEY)
    return keys
  }

  if (route.path.startsWith('/teacher')) {
    keys.push(MARKING_DOMAIN_KEY)
    if (groupKey) {
      keys.push(groupKey)
    }
    return keys
  }

  if (isPortfolioRoute(route.path)) {
    keys.push(PORTFOLIO_DOMAIN_KEY)
    if (groupKey) {
      keys.push(groupKey)
    }
    return keys
  }

  if (route.path.startsWith('/quality')) {
    keys.push(QUALITY_DOMAIN_KEY)
    if (groupKey) {
      keys.push(groupKey)
    }
  }

  return keys
}

watch(
  () => [route.path, route.meta?.menuGroup, props.collapsed],
  () => {
    openMenuKeys.value = normalizeOpenKeys(resolveDefaultOpenKeys())
  },
  { immediate: true },
)

function collectGroupedRoutes(grouped: {
  ungrouped: RouteRecordRaw[]
  groups: MenuGroup[]
}): RouteRecordRaw[] {
  return [...grouped.ungrouped, ...grouped.groups.flatMap((group) => group.items)]
}

function onMenuClick({ key }: { key: Key }) {
  const keyStr = String(key)
  if (
    keyStr === MARKING_DOMAIN_KEY ||
    keyStr === PLATFORM_DOMAIN_KEY ||
    keyStr === QUALITY_DOMAIN_KEY ||
    keyStr === PORTFOLIO_DOMAIN_KEY
  ) {
    return
  }
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  const allRoutes = [
    ...collectGroupedRoutes(props.markingGrouped),
    ...collectGroupedRoutes(props.platformGrouped),
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
