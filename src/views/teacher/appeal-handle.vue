<template>
  <StageWorkbenchShell class="appeal-page">
    <template #context>
      <ContextBar layout="workbench">
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
          <UiTag v-if="pendingCount > 0" tone="orange" size="sm">
            待处理 {{ pendingCount }} 条
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="currentExamId" #signal>
      <SignalBand variant="tiles" compact :metrics="appealSignalMetrics" />
    </template>

    <UiEmpty v-if="!currentExamId" description="请选择考试" class="appeal-page__empty" />

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
        @changed="onAppealFlowChanged"
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
        @changed="onAppealFlowChanged"
      />

      <ScorePublishRelatedLinksCard variant="appeal" />
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamReviewWindowPolicy } from '@/apis/mark/grade-review'
import type { UiSectionTabItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import {
  getReviewSummary,
  getReviewWindowPolicy,
  REVIEW_WINDOW_STATUS_TONE,
  ReviewWindowPolicyStatusDescription,
} from '@/apis/mark/grade-review'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScorePublishRelatedLinksCard from '@/components/workbench/ScorePublishRelatedLinksCard.vue'
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
const pendingCount = ref(0)
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
    count: pendingCount.value > 0 ? pendingCount.value : undefined,
    badgeTone: pendingCount.value > 0 ? 'orange' : undefined,
  },
  { key: 'corrections', label: '成绩纠正' },
  { key: 'batch', label: '批量纠正' },
])

const appealSignalMetrics = computed((): SignalMetric[] => {
  const policy = windowPolicy.value
  const statusLabel = policy
    ? strictEnumLabel(ReviewWindowPolicyStatusDescription, policy.policyStatus, '复核窗口状态')
    : '未配置'
  const statusTone = policy
    ? strictEnumTone(REVIEW_WINDOW_STATUS_TONE, policy.policyStatus, '复核窗口状态')
    : 'gray'
  return [
    {
      key: 'window-status',
      label: '窗口状态',
      value: statusLabel,
      tone: statusTone,
    },
    {
      key: 'open-time',
      label: '开放时间',
      value: policy?.openTime ? formatDateTimeWithSeconds(policy.openTime).split(' ')[0] : '—',
      tone: policy?.openTime ? 'blue' : 'gray',
    },
    {
      key: 'close-time',
      label: '截止时间',
      value: policy?.closeTime ? formatDateTimeWithSeconds(policy.closeTime).split(' ')[0] : '—',
      tone: policy?.closeTime ? 'orange' : 'gray',
    },
    {
      key: 'pending',
      label: '待办复核',
      value: pendingCount.value,
      unit: '条',
      tone: pendingCount.value > 0 ? 'orange' : 'green',
    },
  ]
})

const windowReloadToken = ref(0)
const requestReloadToken = ref(0)
const correctionReloadToken = ref(0)
const batchReloadToken = ref(0)


async function loadPendingSummary(): Promise<void> {
  if (!currentExamId.value) {
    pendingCount.value = 0
    return
  }
  try {
    const summary = await getReviewSummary(currentExamId.value)
    // PENDING + IN_REVIEW + APPROVED：已通过待更正必须计入待办，避免只在「复核申请」Tab 才可见
    pendingCount.value = summary.pendingRequestCount
      + summary.inReviewRequestCount
      + summary.approvedRequestCount
  }
  catch {
    pendingCount.value = 0
  }
}
async function loadWindowPolicy(): Promise<void> {
  if (!currentExamId.value) {
    windowPolicy.value = null
    return
  }
  try {
    windowPolicy.value = await getReviewWindowPolicy(currentExamId.value)
  } catch (error) {
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

async function onRequestHandled(): Promise<void> {
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  await refreshSnapshot()
  await loadWindowPolicy()
  await loadPendingSummary()
}

async function onCorrectionCreated(): Promise<void> {
  correctionReloadToken.value += 1
  requestReloadToken.value += 1
  await refreshSnapshot()
  await loadWindowPolicy()
  await loadPendingSummary()
}

async function onAppealFlowChanged(): Promise<void> {
  reloadAll()
  await refreshSnapshot()
}

watch(
  selectedExamId,
  (value) => {
    if (value) {
      reloadAll()
    } else {
      pendingCount.value = 0
      windowPolicy.value = null
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.appeal-page {
  &__empty {
    margin-top: 32px;
  }

  &__tabs {
    margin-bottom: 16px;
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
  gap: 12px;
}

:deep(.appeal-section__flow-hint) {
  margin-right: auto;
  font-size: 12px;
  color: var(--c-text-4);
  white-space: nowrap;
}

:deep(.appeal-section__toolbar) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

:deep(.appeal-section__count) {
  flex-shrink: 0;
  padding-top: 8px;
  font-size: 12px;
  color: var(--c-text-4);
  white-space: nowrap;
}
</style>
