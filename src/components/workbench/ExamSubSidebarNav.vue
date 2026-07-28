<template>
  <nav class="exam-sub-sidebar-nav">
    <UiMenu
      :selected-keys="[activeMenuKey]"
      :inline-collapsed="collapsed"
      mode="inline"
      @click="onMenuClick"
    >
      <UiMenuItem v-for="item in flatMenuItems" :key="item.key">
        <template #icon>
          <ExamSubSidebarMenuIcon
            :icon="menuIconMap[item.key]"
            :label="item.label"
            :collapsed="collapsed"
          />
        </template>
        <template v-if="!collapsed">
          {{ item.label }}
          <span
            v-if="item.key === EXPERIENCE_ASSIST_MENU_KEY && experienceAssistPendingCount > 0"
            class="exam-sub-sidebar-nav__badge"
          >
            {{ experienceAssistPendingCount }}
          </span>
        </template>
      </UiMenuItem>
    </UiMenu>
  </nav>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { Component } from 'vue'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuItem, ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import { computed, inject } from 'vue'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import ExamSubSidebarMenuIcon from '@/components/workbench/ExamSubSidebarMenuIcon.vue'
import { useExperienceAssistTrialPendingCount } from '@/composables/useExperienceAssistTrialPendingCount'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { getMenuGroupsForJourney } from '@/constants/exam-workspace-menu'

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
const { pendingCount: experienceAssistPendingCount } = useExperienceAssistTrialPendingCount()

const flatMenuItems = computed((): ExamWorkspaceMenuItem[] => {
  const groups = getMenuGroupsForJourney(props.activeJourneyKey, {
    experienceAssistPendingCount: experienceAssistPendingCount.value,
    tenantExperienceAssistEnabled: workbenchContext?.snapshot.value?.tenantExperienceAssistEnabled,
    materialLayoutMode: workbenchContext?.examDetail?.value?.materialLayoutMode,
    printSourceMode: workbenchContext?.examDetail?.value?.printSourceMode,
  })
  return groups.flatMap((group) => group.items)
})

function onMenuClick(info: MenuInfo): void {
  emit('menu-click', String(info.key))
}
</script>

<style lang="scss" scoped>
.exam-sub-sidebar-nav {
  flex: 1;
  overflow: auto;
  padding: var(--dp-space-component-tight);

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
    padding-inline: calc(50% - var(--dp-space-block));
  }

  &__badge {
    margin-left: auto;
    min-width: 18px;
    padding: 0 var(--dp-space-component-tight);
    border-radius: 9px;
    background: var(--dp-warning-bg);
    color: var(--dp-warning);
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
}
</style>
