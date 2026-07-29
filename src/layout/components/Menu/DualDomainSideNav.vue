<template>
  <div
    class="dual-domain-side-nav-shell"
    :class="{ 'dual-domain-side-nav-shell--collapsed': collapsed }"
  >
    <div
      v-if="!collapsed"
      class="dual-domain-side-nav__caption"
      aria-hidden="true"
    >
      {{ activeDomainCaption }}
    </div>
    <UiMenu
      :key="activeSideNavDomain"
      class="dual-domain-side-nav dual-domain-side-nav--single-domain"
      :class="{
        'dual-domain-side-nav--collapsed': collapsed,
        'dual-domain-side-nav--with-platform-footer': showPlatformFooter,
      }"
      mode="inline"
      :inline-collapsed="collapsed"
      :selected-keys="activeMenuKeys"
      :open-keys="openMenuKeys"
      @click="onMenuClick"
      @open-change="onOpenChange"
    >
      <!-- 当前产品域 / 系统管理域：顶栏切域后侧栏只渲染本域任务，不再叠三个一级域 SubMenu -->
      <template v-if="isPlatformActive">
        <UiMenuItem :key="LEAVE_PLATFORM_MENU_KEY">
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="leavePlatformLabel">
              <MenuIcon icon="home" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ leavePlatformLabel }}</span>
        </UiMenuItem>
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
      </template>

      <template v-else>
        <UiMenuItem
          v-for="item in primaryGroupItems(activeGrouped.ungrouped)"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="routeTitle(item)">
              <MenuIcon :icon="routeIcon(item, activeDomainFallbackIcon)" />
            </MenuCollapsedTooltip>
          </template>
          <span>{{ menuRouteLabel(item) }}</span>
        </UiMenuItem>

        <UiSubMenu
          v-if="secondaryGroupItems(activeGrouped.ungrouped).length > 0"
          :key="moreMenuKey(activeSideNavDomain)"
        >
          <template #title>
            <span>{{ moreMenuLabel(activeMoreScope, activeGrouped.ungrouped) }}</span>
          </template>
          <UiMenuItem
            v-for="item in secondaryGroupItems(activeGrouped.ungrouped)"
            :key="item.path"
            :disabled="item.meta?.disabled"
          >
            <span>{{ menuRouteLabel(item) }}</span>
          </UiMenuItem>
        </UiSubMenu>

        <template v-for="group in primaryTaskGroups" :key="group.key">
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
                :disabled="item.meta?.disabled"
              >
                <span>{{ menuRouteLabel(item) }}</span>
              </UiMenuItem>
            </UiSubMenu>
          </UiSubMenu>
        </template>

        <!-- 本域低频分组：收进一个折叠，避免单域仍呈「全功能清单」 -->
        <UiSubMenu
          v-if="deferredTaskGroups.length > 0"
          :key="DOMAIN_MORE_GROUPS_KEY"
        >
          <template #title>
            <span>{{ domainMoreGroupsLabel }}</span>
          </template>
          <template #icon>
            <MenuCollapsedTooltip :collapsed="collapsed" :label="domainMoreGroupsLabel">
              <MenuIcon icon="appstore" />
            </MenuCollapsedTooltip>
          </template>
          <template v-for="group in deferredTaskGroups" :key="group.key">
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
                  :disabled="item.meta?.disabled"
                >
                  <span>{{ menuRouteLabel(item) }}</span>
                </UiMenuItem>
              </UiSubMenu>
            </UiSubMenu>
          </template>
        </UiSubMenu>

        <!-- 系统管理：非产品域，收在当前域侧栏底部弱化脚，避免与本域任务一级并列 -->
        <UiSubMenu
          v-if="showPlatformFooter"
          :key="PLATFORM_DOMAIN_KEY"
        >
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
      </template>
    </UiMenu>
  </div>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { RouteRecordRaw } from 'vue-router'
import type { ShellSideNavDomainKey } from '@/utils/shell-domain'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import UiSubMenu from '@/components/ui-guide/ui/UiSubMenu.vue'
import { useQualityStore } from '@/stores/modules/quality'
import { QUALITY_ADMIN_MENU_GROUP } from '@/utils/portfolio-route'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_NO_PLAN,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'
import {
  resolveShellPlatformExitDomain,
  resolveShellPlatformExitTarget,
  resolveShellSideNavDomainKey,
  SHELL_LEAVE_PLATFORM_MENU_KEY,
  SHELL_PRODUCT_DOMAIN_LABEL,
} from '@/utils/shell-domain'
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
const LEAVE_PLATFORM_MENU_KEY = SHELL_LEAVE_PLATFORM_MENU_KEY
/** 本域低频分组折叠入口（非真实路由） */
const DOMAIN_MORE_GROUPS_KEY = 'domain-more-groups'
/**
 * 主任务分组上限：order ≤ 此值的 menuGroup 一级展示；更大 order 收进「本域更多」。
 * 当前路由所在分组始终提升，避免选中项被折叠藏住。
 */
const PRIMARY_GROUP_ORDER_MAX = 4

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

/** 侧栏只展示正式路由标题；培养方案门控用点击拦截引导，禁止在菜单文案旁注状态 */
function menuRouteLabel(item: RouteRecordRaw): string {
  return routeTitle(item)
}

/**
 * 侧栏主/次分层：始终尊重 meta.menuTier。
 * secondary 收进语义折叠；当前激活 secondary 由 visiblePrimary 提升，避免选中项被藏。
 * 禁止「secondary≤N 全量提升」——否则本域短任务标注在落地前一直无效。
 */
function primaryGroupItems(items: RouteRecordRaw[]): RouteRecordRaw[] {
  return visiblePrimarySideMenuRoutes(items, route.path)
}

/** 低频 secondary 收进语义折叠；无 secondary 时不渲染「更多」 */
function secondaryGroupItems(items: RouteRecordRaw[]): RouteRecordRaw[] {
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

function shouldOpenMenuGroup(groupKey: string, grouped: { groups: MenuGroup[] }): boolean {
  const group = grouped.groups.find((entry) => entry.key === groupKey)
  if (!group) {
    return false
  }
  return group.items.some((item) => {
    if (!item.path) {
      return false
    }
    return route.path === item.path || route.path.startsWith(`${item.path}/`)
  })
}

function collectGroupedRoutes(grouped: {
  ungrouped: RouteRecordRaw[]
  groups: MenuGroup[]
}): RouteRecordRaw[] {
  return [...grouped.ungrouped, ...grouped.groups.flatMap((group) => group.items)]
}

const platformMenuItems = computed(() => collectGroupedRoutes(props.platformGrouped))

/**
 * 当前侧栏域：与顶栏 DomainSwitch 共用 shell-domain 解析。
 * 非三域路径回落阅卷，避免空侧栏。
 */
const activeSideNavDomain = computed<ShellSideNavDomainKey>(() => {
  return resolveShellSideNavDomainKey(route.path, route.meta?.menuGroup) ?? MARKING_DOMAIN_KEY
})

const isPlatformActive = computed(() => activeSideNavDomain.value === PLATFORM_DOMAIN_KEY)

/** 系统管理顶栏返回：带归属域名，强化「离开平台、回到单域任务」 */
const leavePlatformLabel = computed(() => {
  const domain = resolveShellPlatformExitDomain(route.path)
  return `返回${SHELL_PRODUCT_DOMAIN_LABEL[domain]}`
})

/** 产品域侧栏底部是否展示系统管理折叠入口 */
const showPlatformFooter = computed(() => {
  return !isPlatformActive.value && platformMenuItems.value.length > 0
})

const activeGrouped = computed(() => {
  switch (activeSideNavDomain.value) {
    case QUALITY_DOMAIN_KEY:
      return props.qualityGrouped
    case PORTFOLIO_DOMAIN_KEY:
      return props.portfolioGrouped
    case PLATFORM_DOMAIN_KEY:
      return props.platformGrouped
    case MARKING_DOMAIN_KEY:
    default:
      return props.markingGrouped
  }
})

/**
 * 分组是否包含当前路由（meta.menuGroup 或 path 前缀）。
 */
function isMenuGroupActive(group: MenuGroup): boolean {
  const groupKey = stringMetaValue(route.meta?.menuGroup)
  if (groupKey && groupKey === group.key) {
    return true
  }
  return group.items.some((item) => {
    if (!item.path) {
      return false
    }
    return route.path === item.path || route.path.startsWith(`${item.path}/`)
  })
}

/**
 * 本域主任务分组：低 order 一级展示；激活中的尾部分组临时提升。
 */
const primaryTaskGroups = computed(() => {
  return activeGrouped.value.groups.filter((group) => {
    return group.order <= PRIMARY_GROUP_ORDER_MAX || isMenuGroupActive(group)
  })
})

/**
 * 本域低频分组：收进「本域更多」，缩短单域侧栏功能清单感。
 */
const deferredTaskGroups = computed(() => {
  const primaryKeys = new Set(primaryTaskGroups.value.map((group) => group.key))
  return activeGrouped.value.groups.filter((group) => !primaryKeys.has(group.key))
})

const activeMoreScope = computed<'marking' | 'quality' | 'portfolio' | 'platform'>(() => {
  switch (activeSideNavDomain.value) {
    case QUALITY_DOMAIN_KEY:
      return 'quality'
    case PORTFOLIO_DOMAIN_KEY:
      return 'portfolio'
    case PLATFORM_DOMAIN_KEY:
      return 'platform'
    default:
      return 'marking'
  }
})

const domainMoreGroupsLabel = computed(() => {
  const count = deferredTaskGroups.value.length
  const suffix = count > 0 ? `（${count}）` : ''
  switch (activeMoreScope.value) {
    case 'quality':
      return `质量更多入口${suffix}`
    case 'portfolio':
      return `档案袋更多入口${suffix}`
    case 'platform':
      return `平台更多入口${suffix}`
    case 'marking':
    default:
      return `阅卷更多入口${suffix}`
  }
})

const activeDomainFallbackIcon = computed(() => {
  switch (activeSideNavDomain.value) {
    case QUALITY_DOMAIN_KEY:
      return 'dashboard'
    case PORTFOLIO_DOMAIN_KEY:
      return 'folder'
    case PLATFORM_DOMAIN_KEY:
      return 'setting'
    default:
      return 'unordered-list'
  }
})

/** 侧栏域标识：与顶栏 DomainSwitch 文案对齐，强化「当前只在一个域」 */
const activeDomainCaption = computed(() => {
  switch (activeSideNavDomain.value) {
    case QUALITY_DOMAIN_KEY:
      return '质量评价'
    case PORTFOLIO_DOMAIN_KEY:
      return '教学档案袋'
    case PLATFORM_DOMAIN_KEY:
      return '系统管理'
    case MARKING_DOMAIN_KEY:
    default:
      return '阅卷工作台'
  }
})

const activeMenuKeys = computed<Key[]>(() => {
  const path = route.path
  const meta = route.meta
  if (meta?.activeMenu) {
    const activeMenu = stringMetaValue(meta.activeMenu)
    return activeMenu ? [activeMenu] : [path]
  }
  return [path]
})

const openMenuKeys = ref<Key[]>([])

function collectGroupKeySet(grouped: { groups: MenuGroup[] }): Set<string> {
  return new Set(grouped.groups.map((group) => group.key))
}

function onOpenChange(keys: Key[]) {
  openMenuKeys.value = normalizeOpenKeys(keys)
}

/**
 * 单域侧栏：只保留当前域分组 / 系统管理折叠的 open keys。
 */
function normalizeOpenKeys(keys: Key[]): Key[] {
  const productGroupKeys = collectGroupKeySet(activeGrouped.value)
  const allowed = new Set<string>([
    ...productGroupKeys,
    moreMenuKey(activeSideNavDomain.value),
    ...[...productGroupKeys].map((key) => moreMenuKey(key)),
    DOMAIN_MORE_GROUPS_KEY,
  ])

  if (!isPlatformActive.value && platformMenuItems.value.length > 0) {
    allowed.add(PLATFORM_DOMAIN_KEY)
    allowed.add(moreMenuKey(PLATFORM_DOMAIN_KEY))
  }

  return keys.map(String).filter((key) => allowed.has(key))
}

/** 按当前路由展开本域分组；系统管理页只展开平台「更多」。 */
function resolveDefaultOpenKeys(): Key[] {
  if (props.collapsed) {
    return []
  }
  const keys: Key[] = []
  const groupKey = stringMetaValue(route.meta?.menuGroup)

  if (isPlatformActive.value) {
    if (shouldOpenMoreSubmenu(platformMenuItems.value)) {
      keys.push(moreMenuKey(PLATFORM_DOMAIN_KEY))
    }
    return keys
  }

  const grouped = activeGrouped.value
  if (shouldOpenMoreSubmenu(grouped.ungrouped)) {
    keys.push(moreMenuKey(activeSideNavDomain.value))
  }
  if (groupKey && groupKey !== QUALITY_ADMIN_MENU_GROUP && shouldOpenMenuGroup(groupKey, grouped)) {
    const group = grouped.groups.find((entry) => entry.key === groupKey)
    if (group && deferredTaskGroups.value.some((entry) => entry.key === group.key)) {
      keys.push(DOMAIN_MORE_GROUPS_KEY)
    }
    keys.push(groupKey)
    if (group && shouldOpenMoreSubmenu(group.items)) {
      keys.push(moreMenuKey(groupKey))
    }
  }

  if (shouldOpenMoreSubmenu(platformMenuItems.value)) {
    keys.push(PLATFORM_DOMAIN_KEY)
    keys.push(moreMenuKey(PLATFORM_DOMAIN_KEY))
  }

  return keys
}

watch(
  () => [route.path, route.meta?.menuGroup, props.collapsed, activeSideNavDomain.value] as const,
  () => {
    openMenuKeys.value = normalizeOpenKeys(resolveDefaultOpenKeys())
  },
  { immediate: true },
)

function onMenuClick({ key }: { key: Key }) {
  const keyStr = String(key)
  if (keyStr === LEAVE_PLATFORM_MENU_KEY) {
    const target = resolveShellPlatformExitTarget(router, route.path)
    if (target !== route.fullPath) {
      void router.push(target)
    }
    emit('menu-item-click-after')
    return
  }
  if (
    keyStr === MARKING_DOMAIN_KEY
    || keyStr === PLATFORM_DOMAIN_KEY
    || keyStr === QUALITY_DOMAIN_KEY
    || keyStr === PORTFOLIO_DOMAIN_KEY
    || keyStr === DOMAIN_MORE_GROUPS_KEY
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
    void message.warning(
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
.dual-domain-side-nav-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.dual-domain-side-nav__caption {
  margin: 0 var(--dp-space-component-tight) var(--dp-space-component-tight);
  padding: 0 12px;
  color: var(--dp-text-tertiary);
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: none;
  user-select: none;
}

.dual-domain-side-nav {
  border-inline-end: none !important;
  background: transparent !important;

  :deep(.ant-menu-item-group-title) {
    padding-left: 44px;
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    color: var(--dp-text-tertiary);
  }

  /* 单域模式：一级即本域任务，缩进比「三域套娃」少一层 */
  &--single-domain {
    :deep(> .ant-menu-item) {
      padding-inline: 12px 12px !important;
    }

    :deep(> .ant-menu-submenu > .ant-menu-submenu-title) {
      padding-inline: 12px 12px !important;
    }

    :deep(> .ant-menu-submenu > .ant-menu-sub.ant-menu-inline) {
      background: transparent !important;

      > .ant-menu-item {
        padding: 0 12px 0 28px !important;
      }

      > .ant-menu-submenu > .ant-menu-submenu-title {
        padding: 0 12px 0 28px !important;
      }

      > .ant-menu-submenu > .ant-menu-sub.ant-menu-inline > .ant-menu-item {
        padding: 0 12px 0 44px !important;
      }
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

/* 本域更多：次于主任务分组，高于系统管理脚 */
.dual-domain-side-nav--single-domain {
  :deep(> .ant-menu-submenu > .ant-menu-submenu-title) {
    font-weight: 600;
  }
}

/* 系统管理脚：弱化为工具入口，避免与本域任务一级并列抢视线 */
.dual-domain-side-nav--with-platform-footer {
  :deep(> .ant-menu-submenu:last-child) {
    margin-top: var(--dp-space-component);
  }

  :deep(> .ant-menu-submenu:last-child > .ant-menu-submenu-title) {
    color: var(--dp-text-tertiary) !important;
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    border-top: 1px solid var(--dp-border);
    border-radius: 0 !important;
    margin-top: 0 !important;
    padding-top: 10px !important;
  }
}
</style>
