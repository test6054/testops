<template>
  <nav class="exam-sub-sidebar-nav">
    <UiMenu
      :selected-keys="[activeMenuKey]"
      :open-keys="openKeys"
      :inline-collapsed="collapsed"
      mode="inline"
      @click="onMenuClick"
      @open-change="onOpenChange"
    >
      <template v-for="group in menuGroups" :key="group.key">
        <UiMenuItemGroup v-if="!collapsed" :title="group.title">
          <UiMenuItem v-for="item in primaryItems(group)" :key="item.key">
            <template #icon>
              <ExamSubSidebarMenuIcon
                :icon="menuIconMap[item.key]"
                :label="item.label"
                :collapsed="collapsed"
              />
            </template>
            {{ item.label }}
            <span
              v-if="item.key === EXPERIENCE_ASSIST_MENU_KEY && experienceAssistPendingCount > 0"
              class="exam-sub-sidebar-nav__badge"
            >
              {{ experienceAssistPendingCount }}
            </span>
          </UiMenuItem>
          <UiSubMenu
            v-if="secondaryItems(group).length"
            :key="`${group.key}__tools`"
            class="exam-sub-sidebar-nav__tools"
          >
            <template #title>次要工具（{{ secondaryItems(group).length }}）</template>
            <UiMenuItem v-for="item in secondaryItems(group)" :key="item.key">
              <template #icon>
                <ExamSubSidebarMenuIcon
                  :icon="menuIconMap[item.key]"
                  :label="item.label"
                  :collapsed="collapsed"
                />
              </template>
              {{ item.label }}
              <span
                v-if="item.key === EXPERIENCE_ASSIST_MENU_KEY && experienceAssistPendingCount > 0"
                class="exam-sub-sidebar-nav__badge"
              >
                {{ experienceAssistPendingCount }}
              </span>
            </UiMenuItem>
          </UiSubMenu>
        </UiMenuItemGroup>
        <template v-else>
          <UiMenuItem v-for="item in group.items" :key="item.key">
            <template #icon>
              <ExamSubSidebarMenuIcon
                :icon="menuIconMap[item.key]"
                :label="item.label"
                :collapsed="collapsed"
              />
            </template>
          </UiMenuItem>
        </template>
      </template>
    </UiMenu>
  </nav>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { Component } from 'vue'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuGroup, ExamWorkspaceMenuItem, ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import { computed, inject, ref, watch } from 'vue'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import UiMenuItemGroup from '@/components/ui-guide/ui/UiMenuItemGroup.vue'
import UiSubMenu from '@/components/ui-guide/ui/UiSubMenu.vue'
import ExamSubSidebarMenuIcon from '@/components/workbench/ExamSubSidebarMenuIcon.vue'
import { useExperienceAssistTrialPendingCount } from '@/composables/useExperienceAssistTrialPendingCount'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { getMenuGroupsForJourney, isPrimaryMenuItem } from '@/constants/exam-workspace-menu'

defineOptions({
  name: 'ExamSubSidebarNav',
})

const props = defineProps<{
  activeJourneyKey: ExamWorkspaceJourneyKey
  activeMenuKey: string
  collapsed: boolean
  menuIconMap: Record<ExamWorkspaceMenuKey, Component>
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: string): void
}>()

const EXPERIENCE_ASSIST_MENU_KEY = 'marking-experience-assist'

const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

const menuGroups = computed(() =>
  getMenuGroupsForJourney(props.activeJourneyKey, {
    experienceAssistPendingCount: experienceAssistPendingCount.value,
    tenantExperienceAssistEnabled: workbenchContext?.snapshot.value?.tenantExperienceAssistEnabled,
    materialLayoutMode: workbenchContext?.examDetail?.value?.materialLayoutMode,
    printSourceMode: workbenchContext?.examDetail?.value?.printSourceMode,
  }),
)
const { pendingCount: experienceAssistPendingCount } = useExperienceAssistTrialPendingCount()

const openKeys = ref<string[]>([])

function primaryItems(group: ExamWorkspaceMenuGroup): ExamWorkspaceMenuItem[] {
  return group.items.filter((item) => isPrimaryMenuItem(item))
}

function secondaryItems(group: ExamWorkspaceMenuGroup): ExamWorkspaceMenuItem[] {
  return group.items.filter((item) => !isPrimaryMenuItem(item))
}

function onOpenChange(keys: (string | number)[]): void {
  openKeys.value = keys.map(String)
}

watch(
  () => [props.activeJourneyKey, props.activeMenuKey, menuGroups.value] as const,
  () => {
    const next: string[] = []
    for (const group of menuGroups.value) {
      const secondary = secondaryItems(group)
      if (secondary.some((item) => item.key === props.activeMenuKey)) {
        next.push(`${group.key}__tools`)
      }
    }
    openKeys.value = next
  },
  { immediate: true },
)

function onMenuClick(info: MenuInfo): void {
  emit('menu-click', String(info.key))
}
</script>

<style lang="scss" scoped>
.exam-sub-sidebar-nav {
  flex: 1;
  overflow: auto;
  padding: 8px;

  :deep(.ant-menu-item-group-title) {
    font-size: 12px;
    font-weight: 600;
    color: var(--dp-text-tertiary);
    padding-left: 12px;
  }

  :deep(.ant-menu-item) {
    border-radius: var(--dp-radius-panel);
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  :deep(.ant-menu-item-selected) {
    background: var(--dp-color-primary-bg);
  }

  :deep(.ant-menu-inline-collapsed) {
    width: 100%;
  }

  :deep(.ant-menu-inline-collapsed > .ant-menu-item) {
    padding-inline: calc(50% - 14px);
  }

  &__badge {
    margin-left: auto;
    min-width: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: var(--dp-warning-bg);
    color: var(--dp-warning);
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
}
</style>
