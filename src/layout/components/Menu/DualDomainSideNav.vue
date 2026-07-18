<template>
  <UiMenu
    class="dual-domain-side-nav"
    :class="{ 'dual-domain-side-nav--collapsed': collapsed }"
    mode="inline"
    :inline-collapsed="collapsed"
    :selected-keys="activeMenuKeys"
    :open-keys="openMenuKeys"
    @click="onMenuClick"
    @open-change="onOpenChange"
  >
    <UiSubMenu key="domain-marking">
      <template #title>
        <span>考试阅卷</span>
      </template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="collapsed" label="考试阅卷">
          <MenuIcon icon="audit" />
        </MenuCollapsedTooltip>
      </template>
      <UiMenuItem
        v-for="item in primaryGroupItems(markingGrouped.ungrouped)"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'unordered-list')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </UiMenuItem>
      <UiSubMenu
        v-if="secondaryGroupItems(markingGrouped.ungrouped).length > 0"
        :key="moreMenuKey(MARKING_DOMAIN_KEY)"
      >
        <template #title>
          <span>{{ moreMenuLabel('marking', markingGrouped.ungrouped) }}</span>
        </template>
        <UiMenuItem
          v-for="item in secondaryGroupItems(markingGrouped.ungrouped)"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <span>{{ item.meta?.title }}</span>
        </UiMenuItem>
      </UiSubMenu>
      <template v-for="group in markingGrouped.groups" :key="group.key">
        <UiMenuItem
          v-if="isFlattenedMenuGroup(group)"
          :key="flattenedMenuGroupItem(group).path"
          :disabled="flattenedMenuGroupItem(group).meta?.disabled"
        >
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ group.title }}</span>
        </UiMenuItem>
        <UiSubMenu v-else :key="group.key">
          <template #title>
            <span>{{ group.title }}</span>
          </template>
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <UiMenuItem
            v-for="item in primaryGroupItems(group.items)"
            :key="item.path"
            :disabled="item.meta?.disabled"
          >
            <template #icon>
              <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
                <MenuIcon :icon="routeIcon(item, 'folder')" />
              </MenuCollapsedTooltip>
            </template>
            <span>{{ item.meta?.title }}</span>
          </UiMenuItem>
          <UiSubMenu
            v-if="secondaryGroupItems(group.items).length > 0"
            :key="moreMenuKey(group.key)"
          >
            <template #title>
              <span>{{ moreMenuLabel('group', group.items, group.title) }}</span>
            </template>
            <UiMenuItem
              v-for="item in secondaryGroupItems(group.items)"
              :key="item.path"
              :disabled="item.meta?.disabled"
            >
              <span>{{ item.meta?.title }}</span>
            </UiMenuItem>
          </UiSubMenu>
        </UiSubMenu>
      </template>
    </UiSubMenu>

    <UiSubMenu key="domain-quality">
      <template #title>
        <span>质量评价</span>
      </template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="collapsed" label="质量评价">
          <MenuIcon icon="reconciliation" />
        </MenuCollapsedTooltip>
      </template>
      <UiMenuItem
        v-for="item in primaryGroupItems(qualityGrouped.ungrouped)"
        :key="item.path"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'dashboard')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ menuRouteLabel(item) }}</span>
      </UiMenuItem>
      <UiSubMenu
        v-if="secondaryGroupItems(qualityGrouped.ungrouped).length > 0"
        :key="moreMenuKey(QUALITY_DOMAIN_KEY)"
      >
        <template #title>
          <span>{{ moreMenuLabel('quality', qualityGrouped.ungrouped) }}</span>
        </template>
        <UiMenuItem
          v-for="item in secondaryGroupItems(qualityGrouped.ungrouped)"
          :key="item.path"
        >
          <span>{{ menuRouteLabel(item) }}</span>
        </UiMenuItem>
      </UiSubMenu>
      <template v-for="group in qualityGrouped.groups" :key="group.key">
        <UiMenuItem
          v-if="isFlattenedMenuGroup(group)"
          :key="flattenedMenuGroupItem(group).path"
        >
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ group.title }}</span>
        </UiMenuItem>
        <UiSubMenu v-else :key="group.key">
          <template #title>
            <span>{{ group.title }}</span>
          </template>
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <UiMenuItem
            v-for="item in primaryGroupItems(group.items)"
            :key="item.path"
          >
            <template #icon>
              <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
                <MenuIcon :icon="routeIcon(item, 'folder')" />
              </MenuCollapsedTooltip>
            </template>
            <span>{{ menuRouteLabel(item) }}</span>
          </UiMenuItem>
          <UiSubMenu
            v-if="secondaryGroupItems(group.items).length > 0"
            :key="moreMenuKey(group.key)"
          >
            <template #title>
              <span>{{ moreMenuLabel('group', group.items, group.title) }}</span>
            </template>
            <UiMenuItem
              v-for="item in secondaryGroupItems(group.items)"
              :key="item.path"
            >
              <span>{{ menuRouteLabel(item) }}</span>
            </UiMenuItem>
          </UiSubMenu>
        </UiSubMenu>
      </template>
    </UiSubMenu>

    <UiSubMenu key="domain-portfolio">
      <template #title>
        <span>教学档案袋</span>
      </template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="collapsed" label="教学档案袋">
          <MenuIcon icon="folder" />
        </MenuCollapsedTooltip>
      </template>
      <UiMenuItem
        v-for="item in primaryGroupItems(portfolioGrouped.ungrouped)"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'folder')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </UiMenuItem>
      <UiSubMenu
        v-if="secondaryGroupItems(portfolioGrouped.ungrouped).length > 0"
        :key="moreMenuKey(PORTFOLIO_DOMAIN_KEY)"
      >
        <template #title>
          <span>{{ moreMenuLabel('portfolio', portfolioGrouped.ungrouped) }}</span>
        </template>
        <UiMenuItem
          v-for="item in secondaryGroupItems(portfolioGrouped.ungrouped)"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <span>{{ item.meta?.title }}</span>
        </UiMenuItem>
      </UiSubMenu>
      <template v-for="group in portfolioGrouped.groups" :key="group.key">
        <UiMenuItem
          v-if="isFlattenedMenuGroup(group)"
          :key="flattenedMenuGroupItem(group).path"
          :disabled="flattenedMenuGroupItem(group).meta?.disabled"
        >
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ group.title }}</span>
        </UiMenuItem>
        <UiSubMenu v-else :key="group.key">
          <template #title>
            <span>{{ group.title }}</span>
          </template>
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="group.title">
              <MenuIcon :icon="group.icon" />
            </MenuCollapsedTooltip>
          </template>
          <UiMenuItem
            v-for="item in primaryGroupItems(group.items)"
            :key="item.path"
            :disabled="item.meta?.disabled"
          >
            <template #icon>
              <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
                <MenuIcon :icon="routeIcon(item, 'folder')" />
              </MenuCollapsedTooltip>
            </template>
            <span>{{ item.meta?.title }}</span>
          </UiMenuItem>
          <UiSubMenu
            v-if="secondaryGroupItems(group.items).length > 0"
            :key="moreMenuKey(group.key)"
          >
            <template #title>
              <span>{{ moreMenuLabel('group', group.items, group.title) }}</span>
            </template>
            <UiMenuItem
              v-for="item in secondaryGroupItems(group.items)"
              :key="item.path"
              :disabled="item.meta?.disabled"
            >
              <span>{{ item.meta?.title }}</span>
            </UiMenuItem>
          </UiSubMenu>
        </UiSubMenu>
      </template>
    </UiSubMenu>

    <UiSubMenu v-if="platformMenuItems.length > 0" key="domain-platform">
      <template #title>
        <span>系统管理</span>
      </template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="collapsed" label="系统管理">
          <MenuIcon icon="setting" />
        </MenuCollapsedTooltip>
      </template>
      <UiMenuItem
        v-for="item in primaryGroupItems(platformMenuItems)"
        :key="item.path"
        :disabled="item.meta?.disabled"
      >
        <template #icon>
          <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
            <MenuIcon :icon="routeIcon(item, 'setting')" />
          </MenuCollapsedTooltip>
        </template>
        <span>{{ item.meta?.title }}</span>
      </UiMenuItem>
      <UiSubMenu
        v-if="secondaryGroupItems(platformMenuItems).length > 0"
        :key="moreMenuKey(PLATFORM_DOMAIN_KEY)"
      >
        <template #title>
          <span>{{ moreMenuLabel('platform', platformMenuItems) }}</span>
        </template>
        <UiMenuItem
          v-for="item in secondaryGroupItems(platformMenuItems)"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <span>{{ item.meta?.title }}</span>
        </UiMenuItem>
      </UiSubMenu>
    </UiSubMenu>
  </UiMenu>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { RouteRecordRaw } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import UiSubMenu from '@/components/ui-guide/ui/UiSubMenu.vue'
import { useQualityStore } from '@/stores/modules/quality'
import { isPortfolioRoute, QUALITY_ADMIN_MENU_GROUP } from '@/utils/portfolio-route'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_NO_PLAN,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'
import {
  primarySideMenuRoutes,
  secondarySideMenuRoutes,
  visiblePrimarySideMenuRoutes,
  visibleSecondarySideMenuRoutes,
} from '@/utils/side-menu-tier'
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

/** 门控未通过时旁注「待确认」，避免灰禁用被误读为无权限 */
function menuRouteLabel(item: RouteRecordRaw): string {
  const title = routeTitle(item)
  if (item.meta?.qualityGateBlocked) {
    return `${title} · 待确认`
  }
  return title
}

/**
 * 主任务一级化：secondary ≤8 时全部提升到主列表（消「更多」藏主路径）；
 * 仅更长配置尾部保留语义折叠入口，禁止裸「更多」。
 */
const SECONDARY_PROMOTE_MAX = 8

function shouldPromoteSecondary(items: RouteRecordRaw[]): boolean {
  return secondarySideMenuRoutes(items).length <= SECONDARY_PROMOTE_MAX
}

/** primary 入口；短 secondary 全量提升到一级 */
function primaryGroupItems(items: RouteRecordRaw[]): RouteRecordRaw[] {
  if (shouldPromoteSecondary(items)) {
    return items
  }
  return visiblePrimarySideMenuRoutes(items, route.path)
}

/** 低频 secondary 收进语义折叠；已提升时返回空 */
function secondaryGroupItems(items: RouteRecordRaw[]): RouteRecordRaw[] {
  if (shouldPromoteSecondary(items)) {
    return []
  }
  return visibleSecondarySideMenuRoutes(items, route.path)
}

function moreMenuLabel(
  scope: 'marking' | 'quality' | 'portfolio' | 'platform' | 'group',
  items: RouteRecordRaw[],
  groupTitle?: string,
): string {
  const count = secondaryGroupItems(items).length
  const suffix = count > 0 ? `（${count}）` : ''
  switch (scope) {
    case 'marking':
      return `阅卷辅助与配置${suffix}`
    case 'quality':
      return `质量配置与台账${suffix}`
    case 'portfolio':
      return `档案袋管理入口${suffix}`
    case 'platform':
      return `平台管理入口${suffix}`
    case 'group':
      return `${groupTitle ?? '本组'}·配置入口${suffix}`
  }
}

function moreMenuKey(parentKey: string): string {
  return `${parentKey}__more`
}

/** 仅含一个 primary 且无 secondary 时展平，避免误藏「更多」。 */
function isFlattenedMenuGroup(group: MenuGroup): boolean {
  return (
    primarySideMenuRoutes(group.items).length === 1
    && secondarySideMenuRoutes(group.items).length === 0
  )
}

function shouldOpenMoreSubmenu(items: RouteRecordRaw[]): boolean {
  return secondarySideMenuRoutes(items).some((item) => {
    if (!item.path) {
      return false
    }
    return route.path === item.path || route.path.startsWith(`${item.path}/`)
  })
}

function flattenedMenuGroupItem(group: MenuGroup): RouteRecordRaw {
  return group.items[0]
}

function shouldOpenMenuGroup(
  groupKey: string,
  grouped: { groups: MenuGroup[] },
): boolean {
  const group = grouped.groups.find((entry) => entry.key === groupKey)
  return group !== undefined && !isFlattenedMenuGroup(group)
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
    const routeDomainKey = resolveRouteDomainKey()
    const ordered = keys.map(String).filter((key) => domainKeys.includes(key))
    const keepDomain
      = (routeDomainKey && next.has(routeDomainKey) ? routeDomainKey : null)
        || ordered[ordered.length - 1]
        || openDomains[openDomains.length - 1]
    for (const domainKey of domainKeys) {
      if (domainKey === keepDomain) {
        continue
      }
      next.delete(domainKey)
      const groupKeys
        = domainKey === MARKING_DOMAIN_KEY
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
function resolveRouteDomainKey(): string | null {
  const groupKey = stringMetaValue(route.meta?.menuGroup)
  if (groupKey === QUALITY_ADMIN_MENU_GROUP) {
    return PLATFORM_DOMAIN_KEY
  }
  if (route.path.startsWith('/teacher')) {
    return MARKING_DOMAIN_KEY
  }
  if (isPortfolioRoute(route.path)) {
    return PORTFOLIO_DOMAIN_KEY
  }
  if (route.path.startsWith('/quality')) {
    return QUALITY_DOMAIN_KEY
  }
  return null
}

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
    if (shouldOpenMoreSubmenu(props.markingGrouped.ungrouped)) {
      keys.push(moreMenuKey(MARKING_DOMAIN_KEY))
    }
    if (groupKey && shouldOpenMenuGroup(groupKey, props.markingGrouped)) {
      keys.push(groupKey)
      const group = props.markingGrouped.groups.find((entry) => entry.key === groupKey)
      if (group && shouldOpenMoreSubmenu(group.items)) {
        keys.push(moreMenuKey(groupKey))
      }
    }
    return keys
  }

  if (isPortfolioRoute(route.path)) {
    keys.push(PORTFOLIO_DOMAIN_KEY)
    if (shouldOpenMoreSubmenu(props.portfolioGrouped.ungrouped)) {
      keys.push(moreMenuKey(PORTFOLIO_DOMAIN_KEY))
    }
    if (groupKey && shouldOpenMenuGroup(groupKey, props.portfolioGrouped)) {
      keys.push(groupKey)
      const group = props.portfolioGrouped.groups.find((entry) => entry.key === groupKey)
      if (group && shouldOpenMoreSubmenu(group.items)) {
        keys.push(moreMenuKey(groupKey))
      }
    }
    return keys
  }

  if (route.path.startsWith('/quality')) {
    keys.push(QUALITY_DOMAIN_KEY)
    if (shouldOpenMoreSubmenu(props.qualityGrouped.ungrouped)) {
      keys.push(moreMenuKey(QUALITY_DOMAIN_KEY))
    }
    if (groupKey && shouldOpenMenuGroup(groupKey, props.qualityGrouped)) {
      keys.push(groupKey)
      const group = props.qualityGrouped.groups.find((entry) => entry.key === groupKey)
      if (group && shouldOpenMoreSubmenu(group.items)) {
        keys.push(moreMenuKey(groupKey))
      }
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
    keyStr === MARKING_DOMAIN_KEY
    || keyStr === PLATFORM_DOMAIN_KEY
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
    ...collectGroupedRoutes(props.platformGrouped),
    ...collectGroupedRoutes(props.qualityGrouped),
    ...collectGroupedRoutes(props.portfolioGrouped),
  ]
  const menuItem = allRoutes.find((item) => item.path === keyStr)
  if (menuItem?.meta?.qualityGateBlocked) {
    const qualityStore = useQualityStore()
    const reason = qualityStore.currentTrainingPlanId
      ? QUALITY_PLAN_GATE_REASON_UNCONFIRMED
      : QUALITY_PLAN_GATE_REASON_NO_PLAN
    message.warning(
      reason === QUALITY_PLAN_GATE_REASON_NO_PLAN
        ? '请先选择并确认培养方案，再进入达成度结果与质量报告'
        : '培养方案尚未确认。请先在培养方案体系工作台完成确认，再进入达成度与报告',
    )
    void router.push(buildQualityPlanWorkbenchLocation(reason))
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
    color: var(--dp-text-tertiary);
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

    // 「更多」三级入口
    .ant-menu-sub.ant-menu-inline > .ant-menu-submenu > .ant-menu-submenu-title {
      padding: 0 12px 0 48px !important;
    }

    .ant-menu-sub.ant-menu-inline
      > .ant-menu-submenu
      > .ant-menu-sub.ant-menu-inline
      > .ant-menu-item {
      padding: 0 12px 0 64px !important;
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
