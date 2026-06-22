<template>
  <nav class="exam-sub-sidebar-nav">
    <a-menu
      :selected-keys="[activeMenuKey]"
      :inline-collapsed="collapsed"
      mode="inline"
      @click="onMenuClick"
    >
      <template v-for="group in menuGroups" :key="group.key">
        <a-menu-item-group v-if="!collapsed" :title="groupMenuTitle(group)">
          <a-menu-item v-for="item in group.items" :key="item.key">
            <template #icon>
              <component :is="menuIconMap[item.key]" />
            </template>
            {{ item.label }}
          </a-menu-item>
        </a-menu-item-group>
        <template v-else>
          <a-menu-item v-for="item in group.items" :key="item.key">
            <template #icon>
              <component :is="menuIconMap[item.key]" />
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
import type { ExamWorkspaceMenuGroup, ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import { getMenuGroupsForJourney } from '@/constants/exam-workspace-menu'
import {
  resolveWorkspaceStage,
  WORKSPACE_STAGE_STATUS_LABEL,
} from '@/constants/mark-workspace-nav'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({
  name: 'ExamSubSidebarNav',
})

const props = defineProps<{
  activeJourneyKey: ExamWorkspaceJourneyKey
  activeMenuKey: string
  orderedStages: WorkbenchStage[]
  collapsed: boolean
  menuIconMap: Record<ExamWorkspaceMenuKey, Component>
}>()

const emit = defineEmits<{
  (e: 'menu-click', key: string): void
}>()

const menuGroups = computed(() => getMenuGroupsForJourney(props.activeJourneyKey))

/** 子组标题附带聚合阶段状态文案 */
function groupMenuTitle(group: ExamWorkspaceMenuGroup): string {
  const primaryStageKey = group.stageKeys[0]
  if (!primaryStageKey) {
    return group.title
  }
  const stage = resolveWorkspaceStage(props.orderedStages, primaryStageKey)
  if (!stage) {
    return group.title
  }
  const statusLabel = stage.statusText
    || strictEnumLabel(WORKSPACE_STAGE_STATUS_LABEL, stage.status, '工作台阶段状态')
  return `${group.title} · ${statusLabel}`
}

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
    border-radius: var(--dp-radius-md);
    font-weight: 500;
  }

  :deep(.ant-menu-item-selected) {
    background: var(--ant-color-primary-bg);
  }
}
</style>
