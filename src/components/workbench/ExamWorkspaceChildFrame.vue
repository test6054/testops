<template>
  <ExamWorkspacePageShell
    v-if="usePageShell"
    :page-title="pageTitle"
    :signal-metrics="pageSignalMetrics"
    @metric-click="handlePageMetricClick"
  >
    <keep-alive v-if="shouldCache">
      <component :is="childComponent" :key="routeKey" />
    </keep-alive>
    <component v-else :is="childComponent" :key="routeKey" />
  </ExamWorkspacePageShell>
  <template v-else>
    <keep-alive v-if="shouldCache">
      <component :is="childComponent" :key="routeKey" />
    </keep-alive>
    <component v-else :is="childComponent" :key="routeKey" />
  </template>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import { computed, inject } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import ExamWorkspacePageShell from '@/components/workbench/ExamWorkspacePageShell.vue'
import { useExamWorkspacePage } from '@/composables/useExamWorkspacePage'
import { useExamWorkspaceChromeContext } from '@/composables/useMarkWorkbenchContext'
import { EXAM_WORKSPACE_PAGE_METRICS_KEY } from '@/constants/exam-workspace-page-metrics'

const props = defineProps<{
  childRoute: RouteLocationNormalized
  childComponent: Component
  immersive: boolean
  shouldCache: boolean
  routeKey: string
}>()

const injectedMetrics = inject(EXAM_WORKSPACE_PAGE_METRICS_KEY, null)
const { navigateMetric } = useExamWorkspaceChromeContext()

const usePageShell = computed(() => {
  if (props.immersive) {
    return false
  }
  return props.childRoute.meta.hasWorkbenchShell !== true
})

const { pageTitle, pageSignalMetrics: defaultMetrics } = useExamWorkspacePage()

const pageSignalMetrics = computed(() => {
  if (injectedMetrics?.value?.length) {
    return injectedMetrics.value
  }
  return defaultMetrics.value
})

function handlePageMetricClick(key: string): void {
  navigateMetric(key)
}
</script>
