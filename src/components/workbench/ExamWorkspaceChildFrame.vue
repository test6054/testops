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
import type { Component, InjectionKey, Ref } from 'vue'
import type { SignalMetric } from '@/types/workbench'
import { computed, inject } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import ExamWorkspacePageShell from '@/components/workbench/ExamWorkspacePageShell.vue'
import { useExamWorkspaceChromeContext } from '@/composables/useMarkWorkbenchContext'
import { useExamWorkspacePage } from '@/composables/useExamWorkspacePage'

export const EXAM_WORKSPACE_PAGE_METRICS_KEY: InjectionKey<Ref<SignalMetric[]>> = Symbol('examWorkspacePageMetrics')

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
