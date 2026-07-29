<template>
  <nav class="exam-sub-sidebar-nav" aria-label="本步任务">
    <UiMenu
      :selected-keys="[activeMenuKey]"
      :inline-collapsed="collapsed"
      mode="inline"
      @click="onMenuClick"
    >
      <UiMenuItem v-for="item in primaryMenuItems" :key="item.key">
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

    <div v-if="!collapsed && secondaryMenuItems.length > 0" class="exam-sub-sidebar-nav__more">
      <button
        type="button"
        class="exam-sub-sidebar-nav__more-toggle"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        <span>{{ moreOpen ? '收起本步更多' : `本步更多（${secondaryMenuItems.length}）` }}</span>
      </button>
      <UiMenu
        v-if="moreOpen"
        :selected-keys="[activeMenuKey]"
        mode="inline"
        class="exam-sub-sidebar-nav__more-menu"
        @click="onMenuClick"
      >
        <UiMenuItem v-for="item in secondaryMenuItems" :key="item.key">
          <template #icon>
            <ExamSubSidebarMenuIcon
              :icon="menuIconMap[item.key]"
              :label="item.label"
              :collapsed="false"
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
      </UiMenu>
    </div>
  </nav>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { Component } from 'vue'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuItem, ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import { computed, inject, ref, watch } from 'vue'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import ExamSubSidebarMenuIcon from '@/components/workbench/ExamSubSidebarMenuIcon.vue'
import { useExperienceAssistTrialPendingCount } from '@/composables/useExperienceAssistTrialPendingCount'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import {
  getMenuGroupsForJourney,
  visiblePrimaryExamMenuItems,
  visibleSecondaryExamMenuItems,
} from '@/constants/exam-workspace-menu'

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
const moreOpen = ref(false)

const allMenuItems = computed((): ExamWorkspaceMenuItem[] => {
  const groups = getMenuGroupsForJourney(props.activeJourneyKey, {
    experienceAssistPendingCount: experienceAssistPendingCount.value,
    tenantExperienceAssistEnabled: workbenchContext?.snapshot.value?.tenantExperienceAssistEnabled,
    materialLayoutMode: workbenchContext?.examDetail?.value?.materialLayoutMode,
    printSourceMode: workbenchContext?.examDetail?.value?.printSourceMode,
  })
  return groups.flatMap((group) => group.items)
})

const primaryMenuItems = computed((): ExamWorkspaceMenuItem[] =>
  visiblePrimaryExamMenuItems(allMenuItems.value, props.activeMenuKey),
)

const secondaryMenuItems = computed((): ExamWorkspaceMenuItem[] =>
  visibleSecondaryExamMenuItems(allMenuItems.value, props.activeMenuKey),
)

watch(
  () => [props.activeJourneyKey, props.activeMenuKey] as const,
  () => {
    // 切换旅程或激活项后默认收起，避免次要入口长期占高
    moreOpen.value = false
  },
)

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

  &__more {
    margin-top: var(--dp-space-component-tight);
    padding-top: var(--dp-space-component-tight);
    border-top: 1px solid var(--dp-border-subtle, var(--dp-border));
  }

  &__more-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: none;
    border-radius: var(--dp-radius-panel);
    background: transparent;
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    cursor: pointer;
    text-align: left;

    &:hover {
      background: var(--dp-fill-tertiary);
      color: var(--dp-text-secondary);
    }
  }

  &__more-menu {
    margin-top: var(--dp-space-component-xs);
  }
}
</style>
