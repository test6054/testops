<template>
  <nav class="exam-sub-sidebar-nav">
    <a-menu
      :selected-keys="[activeMenuKey]"
      :inline-collapsed="collapsed"
      mode="inline"
      @click="onMenuClick"
    >
      <template v-for="group in menuGroups" :key="group.key">
        <a-menu-item-group v-if="!collapsed" :title="group.title">
          <a-menu-item
            v-for="item in group.items"
            :key="item.key"
          >
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
          </a-menu-item>
        </a-menu-item-group>
        <template v-else>
          <a-menu-item
            v-for="item in group.items"
            :key="item.key"
          >
            <template #icon>
              <ExamSubSidebarMenuIcon
                :icon="menuIconMap[item.key]"
                :label="item.label"
                :collapsed="collapsed"
              />
            </template>
          </a-menu-item>
        </template>
      </template>
    </a-menu>
  </nav>
</template>

<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { Component } from 'vue'
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import { computed } from 'vue'
import ExamSubSidebarMenuIcon from '@/components/workbench/ExamSubSidebarMenuIcon.vue'
import { useExperienceAssistTrialPendingCount } from '@/composables/useExperienceAssistTrialPendingCount'
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

const menuGroups = computed(() =>
  getMenuGroupsForJourney(props.activeJourneyKey, {
    experienceAssistPendingCount: experienceAssistPendingCount.value,
  }),
)
const { pendingCount: experienceAssistPendingCount } = useExperienceAssistTrialPendingCount()

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
    color: var(--ant-color-text-tertiary);
    padding-left: 12px;
  }

  :deep(.ant-menu-item) {
    border-radius: var(--dp-radius-panel);
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  :deep(.ant-menu-item-selected) {
    background: var(--ant-color-primary-bg);
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
    background: var(--ant-color-warning-bg);
    color: var(--ant-color-warning);
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
}
</style>
