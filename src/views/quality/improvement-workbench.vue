<script setup lang="ts">
/**
 * 持续改进与审核闭环工作台（4-in-1）
 */
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import AuditIssueTab from '@/components/quality/improvement/AuditIssueTab.vue'
import AuditRectificationTab from '@/components/quality/improvement/AuditRectificationTab.vue'
import AuditSupervisionTab from '@/components/quality/improvement/AuditSupervisionTab.vue'
import ImprovementTaskTab from '@/components/quality/improvement/ImprovementTaskTab.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useImprovementWorkbenchSignals } from '@/composables/quality/useImprovementWorkbenchSignals'
import { useImprovementWorkbenchSignalSources } from '@/composables/quality/useImprovementWorkbenchSignalSources'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { isQualityScopeStaleError } from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError, toUserError } from '@/utils/error-handler'

const qualityStore = useQualityStore()
const route = useRoute()
const activeTab = ref<'improvement' | 'issue' | 'rectification' | 'supervision'>('improvement')
const iwbTabItems = [
  { key: 'improvement', label: '改进任务' },
  { key: 'issue', label: '审核评估问题' },
  { key: 'rectification', label: '整改任务台账' },
  { key: 'supervision', label: '督导复查' },
]
const loading = ref(false)
const skipFirstActivatedLoad = ref(true)
let scopeChangeSerial = 0

interface TabLoadExpose {
  loadList: () => Promise<void>
  openByDeepLink?: (payload: { improvementTaskId: string, aiTaskId?: string }) => Promise<void>
}

const improvementTaskTabRef = ref<TabLoadExpose | null>(null)
const auditIssueTabRef = ref<TabLoadExpose | null>(null)
const auditRectificationTabRef = ref<TabLoadExpose | null>(null)
const auditSupervisionTabRef = ref<TabLoadExpose | null>(null)

const { signalSummary, loadSignalSources } = useImprovementWorkbenchSignalSources()

/** Tab 加载失败时仅 toast 提示；忽略 onLoadError(null)，避免并行 load 互相覆盖。 */
function handleTabLoadError(error: Error | null): void {
  if (error !== null) {
    showUserError(error, error.message || '数据加载失败')
  }
}

function resolveWorkbenchLoadError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : toUserError(error, fallback)
}

const { signals } = useImprovementWorkbenchSignals({
  signalSummary,
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
    throw toUserError(null, '工作台页签尚未就绪')
  }
  await Promise.all([
    improvementTab.loadList(),
    issueTab.loadList(),
    rectTab.loadList(),
    supTab.loadList(),
  ])
}

async function consumeImprovementDeepLink(): Promise<void> {
  const improvementTaskId
    = typeof route.query.improvementTaskId === 'string' ? route.query.improvementTaskId.trim() : ''
  if (!improvementTaskId) {
    return
  }
  activeTab.value = 'improvement'
  await nextTick()
  const aiTaskId
    = typeof route.query.aiTaskId === 'string' ? route.query.aiTaskId.trim() : undefined
  await improvementTaskTabRef.value?.openByDeepLink?.({ improvementTaskId, aiTaskId })
}


const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

async function handleScopeChange(): Promise<void> {
  const serial = ++scopeChangeSerial
  loading.value = true
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
      handleTabLoadError(toUserError(null, '工作台指标加载失败'))
    }
    await consumeImprovementDeepLink()
  } catch (error) {
    if (serial !== scopeChangeSerial) {
      return
    }
    if (isQualityScopeStaleError(error)) {
      return
    }
    handleTabLoadError(resolveWorkbenchLoadError(error, '工作台数据加载失败'))
  } finally {
    if (serial === scopeChangeSerial) {
      loading.value = false
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

watch(
  () => [route.query.improvementTaskId, route.query.aiTaskId],
  () => {
    void consumeImprovementDeepLink()
  },
)

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

onMounted(async () => {
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

    <QualityPlanGateStrip
      v-if="planGateMode"
      :mode="planGateMode"
      class="iwb__empty"
    />

    <template v-else>
      <SignalBand :metrics="signals" compact class="iwb__signals" />

      <UiEmpty
        v-if="
          !loading
            && activeTab === 'improvement'
            && !signalSummary?.improvementTotal
        "
        size="sm"
        description="当前范围无改进任务"
        class="iwb__empty"
      />

      <UiSectionTabs
        v-model="activeTab"
        :items="iwbTabItems"
        compact
        divided
        class="iwb__tabs"
      />
      <ImprovementTaskTab
        v-if="activeTab === 'improvement'"
        ref="improvementTaskTabRef"
        :on-load-error="handleTabLoadError"
        :on-workbench-refresh="refreshWorkbenchSignals"
      />
      <AuditIssueTab
        v-else-if="activeTab === 'issue'"
        ref="auditIssueTabRef"
        :on-load-error="handleTabLoadError"
        :on-workbench-refresh="refreshWorkbenchSignals"
      />
      <AuditRectificationTab
        v-else-if="activeTab === 'rectification'"
        ref="auditRectificationTabRef"
        :on-load-error="handleTabLoadError"
        :on-workbench-refresh="refreshWorkbenchSignals"
      />
      <AuditSupervisionTab
        v-else
        ref="auditSupervisionTabRef"
        :on-load-error="handleTabLoadError"
        :on-workbench-refresh="refreshWorkbenchSignals"
      />
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.iwb {
  &__error {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__empty {
    margin-bottom: 12px;
  }

  &__tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 12px;
    }
  }
}
</style>
