<script setup lang="ts">
/**
 * 持续改进与审核闭环工作台（4-in-1）
 */
import { nextTick, onActivated, onMounted, ref, watch } from 'vue'
import AuditIssueTab from '@/components/quality/improvement/AuditIssueTab.vue'
import AuditRectificationTab from '@/components/quality/improvement/AuditRectificationTab.vue'
import AuditSupervisionTab from '@/components/quality/improvement/AuditSupervisionTab.vue'
import ImprovementTaskTab from '@/components/quality/improvement/ImprovementTaskTab.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/UiErrorRetryPanel.vue'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { useImprovementWorkbenchSignalSources } from '@/composables/quality/useImprovementWorkbenchSignalSources'
import { useImprovementWorkbenchSignals } from '@/composables/quality/useImprovementWorkbenchSignals'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { toUserError } from '@/utils/error-handler'
import {
  assertQualityScopeFresh,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'

const qualityStore = useQualityStore()
const workbenchLoadError = ref<Error | null>(null)
const activeTab = ref<'improvement' | 'issue' | 'rectification' | 'supervision'>('improvement')
const skipFirstActivatedLoad = ref(true)
let scopeChangeSerial = 0

interface TabLoadExpose {
  loadList: () => Promise<void>
}

const improvementTaskTabRef = ref<TabLoadExpose | null>(null)
const auditIssueTabRef = ref<TabLoadExpose | null>(null)
const auditRectificationTabRef = ref<TabLoadExpose | null>(null)
const auditSupervisionTabRef = ref<TabLoadExpose | null>(null)

const {
  signalImprovementList,
  signalIssueList,
  signalRectList,
  signalSupList,
  loadSignalSources,
} = useImprovementWorkbenchSignalSources()

function clearWorkbenchLoadError(): void {
  workbenchLoadError.value = null
}

/** Tab 加载失败上报；忽略 onLoadError(null)，避免并行 load 冲掉其它 Tab 错误 */
function handleTabLoadError(error: Error | null): void {
  if (error !== null) {
    workbenchLoadError.value = error
  }
}

function resolveWorkbenchLoadError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : toUserError(error, fallback)
}

const { signals } = useImprovementWorkbenchSignals({
  improvementList: signalImprovementList,
  issueList: signalIssueList,
  rectList: signalRectList,
  supList: signalSupList,
})

/** 仅刷新 SignalBand 全量 VO；scope 已过期时不写入并返回 false */
async function refreshWorkbenchSignals(): Promise<boolean> {
  return loadSignalSources()
}

async function loadTabLists(): Promise<void> {
  await nextTick()
  const improvementTab = improvementTaskTabRef.value
  const issueTab = auditIssueTabRef.value
  const rectTab = auditRectificationTabRef.value
  const supTab = auditSupervisionTabRef.value
  if (!improvementTab || !issueTab || !rectTab || !supTab) {
    throw toUserError(null, '工作台 Tab 尚未就绪，请稍后重试')
  }
  await Promise.all([
    improvementTab.loadList(),
    issueTab.loadList(),
    rectTab.loadList(),
    supTab.loadList(),
  ])
}

async function handleScopeChange(): Promise<void> {
  const serial = ++scopeChangeSerial
  clearWorkbenchLoadError()
  try {
    await loadTabLists()
    if (serial !== scopeChangeSerial) {
      return
    }
    const signalsApplied = await loadSignalSources()
    if (serial !== scopeChangeSerial) {
      return
    }
    if (!signalsApplied) {
      throw toUserError(null, '工作台指标加载失败，请稍后重试')
    }
  } catch (error) {
    if (serial !== scopeChangeSerial) {
      return
    }
    if (isQualityScopeStaleError(error)) {
      return
    }
    if (!workbenchLoadError.value) {
      handleTabLoadError(resolveWorkbenchLoadError(error, '工作台数据加载失败'))
    }
  }
}

watch(activeTab, async (tab) => {
  try {
    if (tab === 'improvement') await improvementTaskTabRef.value?.loadList()
    else if (tab === 'issue') await auditIssueTabRef.value?.loadList()
    else if (tab === 'rectification') await auditRectificationTabRef.value?.loadList()
    else if (tab === 'supervision') await auditSupervisionTabRef.value?.loadList()
  } catch (error) {
    if (isQualityScopeStaleError(error)) {
      return
    }
    handleTabLoadError(resolveWorkbenchLoadError(error, '工作台数据加载失败'))
  }
})

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
      return
    }
  }
  await handleScopeChange()
})

onActivated(async () => {
  if (skipFirstActivatedLoad.value) {
    skipFirstActivatedLoad.value = false
    return
  }
  await handleScopeChange()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar />
    </template>

    <UiErrorRetryPanel
      v-if="workbenchLoadError"
      :error="workbenchLoadError"
      class="iwb__error"
      @retry="handleScopeChange"
    />

    <SignalBand v-else :metrics="signals" compact class="iwb__signals" />

    <a-tabs v-model:active-key="activeTab" class="iwb__tabs">
      <a-tab-pane key="improvement" tab="改进任务" force-render>
        <ImprovementTaskTab
          ref="improvementTaskTabRef"
          :on-load-error="handleTabLoadError"
          :on-workbench-refresh="refreshWorkbenchSignals"
        />
      </a-tab-pane>

      <a-tab-pane key="issue" tab="审核评估问题" force-render>
        <AuditIssueTab
          ref="auditIssueTabRef"
          :on-load-error="handleTabLoadError"
          :on-workbench-refresh="refreshWorkbenchSignals"
        />
      </a-tab-pane>

      <a-tab-pane key="rectification" tab="整改任务台账" force-render>
        <AuditRectificationTab
          ref="auditRectificationTabRef"
          :on-load-error="handleTabLoadError"
          :on-workbench-refresh="refreshWorkbenchSignals"
        />
      </a-tab-pane>

      <a-tab-pane key="supervision" tab="督导复查" force-render>
        <AuditSupervisionTab
          ref="auditSupervisionTabRef"
          :on-load-error="handleTabLoadError"
          :on-workbench-refresh="refreshWorkbenchSignals"
        />
      </a-tab-pane>
    </a-tabs>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.iwb {
  &__error {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 12px;
    }
  }
}
</style>
