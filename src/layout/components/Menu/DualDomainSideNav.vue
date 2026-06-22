<template>
  <div class="dual-domain-side-nav" :class="{ 'dual-domain-side-nav--collapsed': collapsed }">
    <section class="dual-domain-side-nav__block">
      <header class="dual-domain-side-nav__head">
        <MenuIcon icon="audit" class="dual-domain-side-nav__head-icon" />
        <span v-if="!collapsed" class="dual-domain-side-nav__head-label">阅卷中心</span>
      </header>
      <a-menu
        class="dual-domain-side-nav__menu"
        mode="inline"
        :inline-collapsed="collapsed"
        :selected-keys="activeMenuKeys"
        @click="onMenuClick"
      >
        <a-menu-item
          v-for="item in markingRoutes"
          :key="item.path"
          :disabled="item.meta?.disabled"
        >
          <template #icon>
            <MenuIcon :icon="(item.meta?.icon as string) || 'unordered-list'" />
          </template>
          <span>{{ item.meta?.title }}</span>
        </a-menu-item>
      </a-menu>
    </section>

    <section class="dual-domain-side-nav__block">
      <header class="dual-domain-side-nav__head">
        <MenuIcon icon="reconciliation" class="dual-domain-side-nav__head-icon" />
        <span v-if="!collapsed" class="dual-domain-side-nav__head-label">质量评价</span>
      </header>
      <a-menu
        class="dual-domain-side-nav__menu"
        mode="inline"
        :inline-collapsed="collapsed"
        :selected-keys="activeMenuKeys"
        @click="onMenuClick"
      >
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
        <template v-for="group in qualityGrouped.groups" :key="group.key">
          <a-sub-menu v-if="!collapsed" :key="group.key">
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
          <template v-else>
            <a-menu-item
              v-for="item in group.items"
              :key="item.path"
              :disabled="item.meta?.disabled"
            >
              <template #icon>
                <MenuIcon :icon="(item.meta?.icon as string) || 'folder'" />
              </template>
            </a-menu-item>
          </template>
        </template>
      </a-menu>
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { RouteRecordRaw } from 'vue-router'
import { message } from 'ant-design-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isExternal } from '@/utils/validate'
import MenuIcon from './MenuIcon.vue'

defineOptions({ name: 'DualDomainSideNav' })

const props = defineProps<{
  collapsed: boolean
  markingRoutes: RouteRecordRaw[]
  qualityGrouped: {
    ungrouped: RouteRecordRaw[]
    groups: Array<{
      key: string
      title: string
      icon: string
      order: number
      items: RouteRecordRaw[]
    }>
  }
}>()

const emit = defineEmits<{
  (e: 'menu-item-click-after'): void
}>()

const route = useRoute()
const router = useRouter()

const activeMenuKeys = computed<Key[]>(() => {
  const { meta, path } = route
  if (meta?.activeMenu) {
    return [meta.activeMenu as string]
  }
  return [path]
})

function onMenuClick({ key }: { key: Key }) {
  const keyStr = String(key)
  if (isExternal(keyStr)) {
    window.open(keyStr)
    return
  }
  const allRoutes = [
    ...props.markingRoutes,
    ...props.qualityGrouped.ungrouped,
    ...props.qualityGrouped.groups.flatMap((g) => g.items),
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
  border: none;
  background: transparent;

  &--collapsed {
    .dual-domain-side-nav__head {
      justify-content: center;
      padding: 8px 0;
    }
  }
}

.dual-domain-side-nav__block + .dual-domain-side-nav__block {
  margin-top: 4px;
}

.dual-domain-side-nav__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
  user-select: none;
}

.dual-domain-side-nav__head-icon {
  font-size: 16px;
  color: var(--ant-color-text-secondary);
}

.dual-domain-side-nav__head-label {
  line-height: 1.4;
}

.dual-domain-side-nav__menu {
  border-inline-end: none !important;
  background: transparent !important;

  :deep(.ant-menu-item-group-title) {
    padding-left: 44px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ant-color-text-tertiary);
  }
}
</style>
