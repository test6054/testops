<template>
  <StageWorkbenchShell class="appeal-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="成绩复核"
        :subtitle="pendingCount != null
          ? `${pendingCount} 条待处理`
          : undefined"
      >
        <template #status>
          <UiTag tone="blue" size="sm">阶段 成绩复核</UiTag>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag
            v-if="windowPolicy?.policyStatus"
            :tone="windowStatusTone"
            size="sm"
          >
            {{ windowStatusLabel }}
          </UiTag>
          <UiTag v-if="(pendingCount ?? 0) > 0" tone="orange" size="sm">
            待处理 {{ pendingCount }} 条
          </UiTag>
          <UiTag v-else-if="pendingCount === null" tone="red" size="sm">
            待办数加载失败
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="currentExamId" #signal>
      <SignalBand layout="spotlight" compact variant="panel" :metrics="appealSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!currentExamId" class="appeal-page__empty" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiSectionTabs
        v-model="activeTab"
        :items="tabItems"
        compact
        divided
        class="appeal-page__tabs"
      />

      <ReviewWindowPolicyCard
        v-if="activeTab === 'policy'"
        :exam-id="currentExamId"
        :reload-token="windowReloadToken"
        @changed="onPolicyChanged"
      />

      <ReviewRequestsCard
        v-else-if="activeTab === 'requests'"
        :exam-id="currentExamId"
        :reload-token="requestReloadToken"
        @handled="onRequestHandled"
        @pending-change="pendingCount = $event"
      />

      <CorrectionsCard
        v-else-if="activeTab === 'corrections'"
        :exam-id="currentExamId"
        :score-policy="selectedExam?.scorePolicy"
        :reload-token="correctionReloadToken"
        @created="onCorrectionCreated"
      />

      <BatchCorrectionPlansCard
        v-else
        :exam-id="currentExamId"
        :score-policy="selectedExam?.scorePolicy"
        :reload-token="batchReloadToken"
        @changed="onBatchChanged"
      />
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamReviewWindowPolicy } from '@/apis/mark/grade-review'
import type { UiSectionTabItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  getReviewSummary,
  getReviewWindowPolicy,
  REVIEW_WINDOW_STATUS_TONE,
  ReviewWindowPolicyStatusDescription,
} from '@/apis/mark/grade-review'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

type AppealTabKey = 'policy' | 'requests' | 'corrections' | 'batch'

const { selectedExamId, selectedExam } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const { examStatusLabel, examStatusTone } = useExamJourneyContextBar('成绩复核')

const currentExamId = computed(() => selectedExamId.value || '')

const activeTab = ref<AppealTabKey>('policy')
/** null = 未就绪或加载失败，禁止当成 0 */
const pendingCount = ref<number | null>(null)
const windowPolicy = ref<ExamReviewWindowPolicy | null>(null)

const windowStatusLabel = computed(() => {
  const status = windowPolicy.value?.policyStatus
  if (!status) {
    return ''
  }
  return strictEnumLabel(ReviewWindowPolicyStatusDescription, status, '复核窗口状态')
})

const windowStatusTone = computed(() => {
  const status = windowPolicy.value?.policyStatus
  if (!status) {
    return undefined
  }
  return strictEnumTone(REVIEW_WINDOW_STATUS_TONE, status, '复核窗口状态')
})

const tabItems = computed((): UiSectionTabItem[] => [
  { key: 'policy', label: '复核窗口' },
  {
    key: 'requests',
    label: '复核申请',
    count: pendingCount.value != null && pendingCount.value > 0 ? pendingCount.value : undefined,
    badgeTone: pendingCount.value != null && pendingCount.value > 0 ? 'orange' : undefined,
  },
  { key: 'corrections', label: '成绩纠正' },
  { key: 'batch', label: '批量纠正' },
])

const appealSignalMetrics = computed((): SignalMetric[] => {
  const policy = windowPolicy.value
  // MVR-279：get 可能返回仅含能力位的壳，无 policyStatus 时按未配置展示
  const statusLabel = policy?.policyStatus
    ? strictEnumLabel(ReviewWindowPolicyStatusDescription, policy.policyStatus, '复核窗口状态')
    : '未配置'
  const statusTone = policy?.policyStatus
    ? strictEnumTone(REVIEW_WINDOW_STATUS_TONE, policy.policyStatus, '复核窗口状态')
    : 'gray'
  const pendingValue = pendingCount.value == null ? '—' : pendingCount.value
  const pendingTone
    = (pendingCount.value ?? 0) > 0
? 'orange' as const
      : pendingCount.value == null
? 'red' as const
        : 'green' as const
  const primary
    = (pendingCount.value ?? 0) > 0 || pendingCount.value == null
      ? {
          key: 'pending',
          label: '待办复核',
          value: pendingValue,
          unit: pendingCount.value == null ? undefined : '条',
          tone: pendingTone,
          emphasis: 'primary' as const,
          actionLabel: (pendingCount.value ?? 0) > 0 ? '处理待办' : undefined,
          helper: (pendingCount.value ?? 0) > 0 ? '学生复核申请待办' : '待办计数不可用',
        }
      : {
          key: 'window-status',
          label: '窗口状态',
          value: statusLabel,
          tone: statusTone,
          emphasis: 'primary' as const,
          helper: '复核窗口策略状态',
        }

  const secondaryPool: SignalMetric[] = [
    {
      key: 'window-status',
      label: '窗口状态',
      value: statusLabel,
      tone: statusTone,
      emphasis: 'secondary',
    },
    {
      key: 'open-time',
      label: '开放时间',
      value: policy?.openTime ? formatDateTimeWithSeconds(policy.openTime).split(' ')[0] : '—',
      tone: policy?.openTime ? 'blue' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'close-time',
      label: '截止时间',
      value: policy?.closeTime ? formatDateTimeWithSeconds(policy.closeTime).split(' ')[0] : '—',
      tone: policy?.closeTime ? 'orange' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'pending',
      label: '待办复核',
      value: pendingValue,
      unit: pendingCount.value == null ? undefined : '条',
      tone: pendingTone,
      emphasis: 'secondary',
    },
  ]
  return [primary, ...secondaryPool.filter((item) => item.key !== primary.key).slice(0, 3)]
})

const windowReloadToken = ref(0)
const requestReloadToken = ref(0)
const correctionReloadToken = ref(0)
const batchReloadToken = ref(0)
let pendingSummaryGeneration = 0
let windowPolicyGeneration = 0

async function loadPendingSummary(): Promise<void> {
  const examId = currentExamId.value
  if (!examId) {
    pendingCount.value = null
    return
  }
  const loadGeneration = ++pendingSummaryGeneration
  // 切场立刻清空，避免失败时顶栏残留上一场待办
  pendingCount.value = null
  try {
    const summary = await getReviewSummary(examId)
    if (loadGeneration !== pendingSummaryGeneration || currentExamId.value !== examId) {
      return
    }
    // PENDING + IN_REVIEW + APPROVED：已通过待更正必须计入待办，避免只在「复核申请」Tab 才可见
    pendingCount.value = summary.pendingRequestCount
      + summary.inReviewRequestCount
      + summary.approvedRequestCount
  }
  catch {
    // 失败保持 null；过期响应丢弃。子卡会通过 pending-change 回写成功值。
    if (loadGeneration === pendingSummaryGeneration && currentExamId.value === examId) {
      pendingCount.value = null
    }
  }
}

async function loadWindowPolicy(): Promise<void> {
  const examId = currentExamId.value
  if (!examId) {
    windowPolicy.value = null
    return
  }
  const loadGeneration = ++windowPolicyGeneration
  try {
    const data = await getReviewWindowPolicy(examId)
    if (loadGeneration !== windowPolicyGeneration || currentExamId.value !== examId) {
      return
    }
    // MVR-279：能力位壳（无 id/policyStatus）不当作已配置策略
    windowPolicy.value = data?.id || data?.policyStatus ? data : null
  } catch (error) {
    if (loadGeneration !== windowPolicyGeneration || currentExamId.value !== examId) {
      return
    }
    windowPolicy.value = null
    showUserError(error, '复核窗口策略加载失败')
  }
}

function reloadAll(): void {
  windowReloadToken.value += 1
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  batchReloadToken.value += 1
  void loadWindowPolicy()
  void loadPendingSummary()
}

/**
 * 子卡写入成功后的父级协调刷新：各表面独立捕获失败，禁止把刷新异常当成写入失败或未处理 Promise。
 */
async function refreshAppealAfterWrite(affected: {
  bumpPolicy?: boolean
  bumpRequests?: boolean
  bumpCorrections?: boolean
  bumpBatch?: boolean
}): Promise<void> {
  if (affected.bumpPolicy) {
    windowReloadToken.value += 1
  }
  if (affected.bumpRequests) {
    requestReloadToken.value += 1
  }
  if (affected.bumpCorrections) {
    correctionReloadToken.value += 1
  }
  if (affected.bumpBatch) {
    batchReloadToken.value += 1
  }

  const failedSurfaces: string[] = []
  try {
    await refreshSnapshot()
  } catch (error) {
    failedSurfaces.push('工作台摘要')
    showUserError(error, '工作台摘要刷新失败')
  }
  // loadWindowPolicy / loadPendingSummary 内部已隔离错误，不向上抛
  await loadWindowPolicy()
  await loadPendingSummary()
  if (failedSurfaces.length > 0) {
    void message.warning(`写入已成功，${failedSurfaces.join('、')}刷新失败，可手动刷新后查看最新状态`)
  }
}

async function onRequestHandled(): Promise<void> {
  await refreshAppealAfterWrite({ bumpRequests: true, bumpCorrections: true })
}

async function onCorrectionCreated(): Promise<void> {
  await refreshAppealAfterWrite({ bumpCorrections: true, bumpRequests: true })
}

async function onPolicyChanged(): Promise<void> {
  await refreshAppealAfterWrite({ bumpPolicy: true })
}

async function onBatchChanged(): Promise<void> {
  await refreshAppealAfterWrite({ bumpBatch: true, bumpCorrections: true })
}

watch(
  selectedExamId,
  (value) => {
    pendingSummaryGeneration += 1
    windowPolicyGeneration += 1
    if (value) {
      reloadAll()
    } else {
      pendingCount.value = null
      windowPolicy.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.appeal-page {
  &__empty {
    margin-top: var(--dp-space-component);
  }

  &__tabs {
    margin-bottom: var(--dp-space-block);
  }
}

:deep(.appeal-section) {
  min-width: 0;
  border: none;
  box-shadow: none;
}

:deep(.appeal-section__header) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--dp-space-component);
}

:deep(.appeal-section__flow-hint) {
  margin-right: auto;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

:deep(.appeal-section__toolbar) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
}

:deep(.appeal-section__count) {
  flex-shrink: 0;
  padding-top: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  white-space: nowrap;
}
</style>
