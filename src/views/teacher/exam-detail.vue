<template>
  <StageWorkbenchShell>
    <UiLoadFailure
      v-if="loadError"
      title="考试概览加载失败"
      :description="loadError"
    />

    <a-skeleton v-else-if="pageLoading" active :paragraph="{ rows: 8 }" />

    <UiEmpty
      v-else-if="!detail"
      description="暂无考试数据"
      class="exam-overview__empty"
    />

    <a-row v-else :gutter="16">
      <a-col :xs="24" :lg="16">
        <UiCard class="exam-overview__card">
          <template #title>
            <ProfileOutlined />
            <span>考试信息</span>
          </template>
          <a-descriptions :column="descriptionColumn" :label-style="labelStyle">
            <a-descriptions-item label="考试名称">
              <span class="exam-overview__name-row">
                {{ detail.examName }}
                <UiTag
                  v-if="detail.examKind"
                  :tone="examKindTone(detail.examKind)"
                  size="sm"
                >
                  {{ examKindLabel(detail) }}
                </UiTag>
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="考务编号">{{ detail.examNo }}</a-descriptions-item>
            <a-descriptions-item v-if="detail.courseName" label="课程">
              {{ detail.courseName }}
            </a-descriptions-item>
            <a-descriptions-item v-if="detail.departmentName" label="院系">
              {{ detail.departmentName }}
            </a-descriptions-item>
            <a-descriptions-item label="学年学期">
              {{ formatAcademicTerm(detail) || '未设置' }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <UiTag :tone="examStatusTone(detail.status)" size="sm">
                {{ examStatusLabel(detail.status) }}
              </UiTag>
            </a-descriptions-item>
            <a-descriptions-item label="参考人数">
              {{ detail.candidateCount }} 人 · {{ detail.questionCount }} 题
            </a-descriptions-item>
            <a-descriptions-item v-if="detail.createUserNickName" label="创建人">
              {{ detail.createUserNickName }}
            </a-descriptions-item>
            <a-descriptions-item label="考试时间" :span="descriptionColumn">
              {{ formatDateTime(detail.examStartTime) }} — {{ formatDateTime(detail.examEndTime) }}
            </a-descriptions-item>
          </a-descriptions>
        </UiCard>

        <UiCard class="exam-overview__card">
          <template #title>
            <ContainerOutlined />
            <span>准备步骤</span>
          </template>
          <UiEmpty
            v-if="prepSteps.length === 0"
            description="暂无准备诊断步骤"
          >
            <template #action>
              <UiButton size="sm" @click="goPrepWorkbench">前往考试准备</UiButton>
            </template>
          </UiEmpty>
          <div v-else class="exam-overview__prep-list">
            <div
              v-for="step in prepSteps"
              :key="step.key"
              class="exam-overview__prep-item"
            >
              <div class="exam-overview__prep-head">
                <span class="exam-overview__prep-title">{{ step.title }}</span>
                <UiBadge :tone="prepStepTone(step.status)">{{ step.statusText }}</UiBadge>
              </div>
              <p class="exam-overview__prep-desc">{{ step.description }}</p>
              <UiButton
                size="sm"
                :variant="step.status === 'completed' ? 'outline' : 'primary'"
                @click="goPrepStep(step)"
              >
                {{ step.primaryAction }}
              </UiButton>
            </div>
          </div>
        </UiCard>
      </a-col>

      <a-col :xs="24" :lg="8">
        <UiCard class="exam-overview__card">
          <template #title>
            <DashboardOutlined />
            <span>批阅进度</span>
          </template>
          <UiEmpty v-if="!markingProgress" description="暂无批阅进度数据" />
          <template v-else>
            <MarkGaugeBlock v-bind="confirmedGaugeBlockProps">
              <div class="mark-gauge-block__formula">
                <strong>{{ markingProgress.confirmedQuestionGradeCount }}</strong>
                <span class="muted"> / {{ markingProgress.totalQuestionGradeCount }} 题次</span>
              </div>
            </MarkGaugeBlock>
            <ul v-if="reviewSummaryItems.length > 0" class="exam-overview__review-list">
              <li v-for="item in reviewSummaryItems" :key="item.key">
                <span>{{ item.label }}</span>
                <strong>{{ item.count }}</strong>
              </li>
            </ul>
          </template>
        </UiCard>

        <UiCard class="exam-overview__card">
          <template #title>
            <AppstoreOutlined />
            <span>快捷入口</span>
          </template>
          <div class="exam-overview__shortcuts">
            <UiButton
              v-if="suggestedStage"
              variant="primary"
              block
              @click="goSuggestedStage"
            >
              前往{{ suggestedStage.title }}
            </UiButton>
            <UiButton variant="outline" block @click="goPrepWorkbench">考试准备</UiButton>
            <UiButton variant="outline" block @click="goMarkingProgress">进度看板</UiButton>
            <UiButton variant="outline" block @click="goRoster">考生名册</UiButton>
          </div>
        </UiCard>
      </a-col>
    </a-row>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { EChartsCoreOption } from 'echarts/core'
import type { CSSProperties } from 'vue'
import type { ExamDetailVO, ExamStatusCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import { useBreakpoints } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_KIND_LABEL, EXAM_KIND_TONE, EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import { REVIEW_TASK_STATUS_LABEL } from '@/apis/mark/exam-review-task'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiLoadFailure from '@/components/ui-guide/ui/UiLoadFailure.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { formatSemester } from '@/types/enums/semester-enum'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import { formatDateTime } from '@/utils/format'
import { formatGaugeAriaLabel } from '@/utils/mark-chart-accessibility'
import { buildGaugeChartOption } from '@/utils/mark-echarts-options'
import { navigateToMarkStage } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

const router = useRouter()
const {
  examId,
  examDetail,
  examDetailLoading,
  examDetailError,
  markingProgress,
  snapshot,
  loading: snapshotLoading,
  refreshChrome,
} = useMarkWorkbenchContext()

const markStageStore = useMarkStageStore()
const { suggestedStageKey, orderedStages } = storeToRefs(markStageStore)

const detail = computed(() => examDetail?.value ?? null)
const loadError = computed(() => examDetailError?.value ?? null)
const pageLoading = computed(() =>
  (snapshotLoading.value && !snapshot.value)
  || (examDetailLoading?.value === true && !detail.value),
)

const breakpoints = useBreakpoints({ sm: 576 })
const descriptionColumn = computed(() => (breakpoints.greaterOrEqual('sm').value ? 2 : 1))
const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '88px' }

const suggestedStage = computed<WorkbenchStage | null>(() => {
  const key = suggestedStageKey.value
  if (!key) {
    return null
  }
  return orderedStages.value.find((stage) => stage.key === key) ?? null
})

const prepSteps = computed<PrepStepCard[]>(() => {
  const d = detail.value
  const backendSteps = snapshot.value?.prepSteps
  if (!d || !backendSteps?.length) {
    return []
  }
  return buildPrepStepCards(backendSteps, d)
})

const confirmedPercent = computed(() => {
  const progress = markingProgress?.value
  if (!progress || progress.totalQuestionGradeCount <= 0) {
    return 0
  }
  return Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
})

const confirmedRingColor = computed(() => (confirmedPercent.value >= 100 ? '#52c41a' : '#1677ff'))

const { chartOption: confirmedGaugeOption } = useChartOption(() =>
  buildGaugeChartOption(confirmedPercent.value, {
    label: '批阅完成率',
    color: confirmedRingColor.value,
    size: 'md',
  }),
)

const confirmedGaugeAriaLabel = computed(() => {
  const progress = markingProgress?.value
  const detail = progress
    ? `已确认 ${progress.confirmedQuestionGradeCount} / ${progress.totalQuestionGradeCount} 题次`
    : undefined
  return formatGaugeAriaLabel('批阅完成率', confirmedPercent.value, detail)
})

const confirmedGaugeBlockProps = computed((): {
  option: EChartsCoreOption
  ariaLabel: string
  layout: 'stacked'
} => ({
  option: confirmedGaugeOption.value,
  ariaLabel: confirmedGaugeAriaLabel.value,
  layout: 'stacked',
}))

const reviewSummaryItems = computed(() => {
  const list = markingProgress?.value?.reviewTaskStatusSummaryList
  if (!list?.length) {
    return []
  }
  return list
    .filter((item) => item.taskCount > 0)
    .map((item) => ({
      key: item.statusCode,
      label: strictEnumLabel(REVIEW_TASK_STATUS_LABEL, item.statusCode, '复核任务状态'),
      count: item.taskCount,
    }))
})

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function examKindTone(examKind: ExamDetailVO['examKind']): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, examKind, '考试性质')
}

function examKindLabel(exam: ExamDetailVO): string {
  if (exam.examKindMessage?.trim()) {
    return exam.examKindMessage.trim()
  }
  return strictEnumLabel(EXAM_KIND_LABEL, exam.examKind, '考试性质')
}

function formatAcademicTerm(exam: ExamDetailVO): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

function prepStepTone(status: WorkbenchStageStatus): BadgeTone {
  const map: Record<WorkbenchStageStatus, BadgeTone> = {
    pending: 'gray',
    active: 'blue',
    completed: 'green',
    warning: 'orange',
    error: 'red',
    blocked: 'red',
  }
  return map[status]
}

function goPrepStep(step: PrepStepCard): void {
  void router.push({ name: step.routeName, params: { examId: examId.value } })
}

function goPrepWorkbench(): void {
  void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId: examId.value } })
}

function goMarkingProgress(): void {
  void router.push({ name: 'TeacherExamWorkspaceMarkingProgress', params: { examId: examId.value } })
}

function goRoster(): void {
  void router.push({ name: 'TeacherExamWorkspaceCandidateRoster', params: { examId: examId.value } })
}

function goSuggestedStage(): void {
  const key = suggestedStageKey.value
  if (!key || !examId.value) {
    return
  }
  navigateToMarkStage(router, key, examId.value, {
    scanAttentionCount: markingProgress?.value?.scanAttentionCount,
  })
}

onActivated(() => {
  if (examId.value && refreshChrome) {
    void refreshChrome()
  }
})
</script>

<style lang="scss" scoped>
.exam-overview {
  &__empty {
    padding: 48px 0;
  }

  &__name-row {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__card {
    margin-bottom: 16px;
  }

  &__prep-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__prep-item {
    padding: 12px;
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-panel, 8px);
  }

  &__prep-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__prep-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  &__prep-desc {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ant-color-text-secondary);
  }

  &__review-list {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--ant-color-border-secondary);

      &:last-child {
        border-bottom: none;
      }
    }
  }

  &__shortcuts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
