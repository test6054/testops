<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementAuditVO } from '@/apis/quality/achievement-audit'
import type { AchievementDetailVO } from '@/apis/quality/achievement-detail'
import type { AchievementManualReviewVO } from '@/apis/quality/achievement-manual-review'
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import type { AchievementDetailTypeCode, AchievementStatusCode } from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { achievementApi } from '@/apis/quality/achievement'
import { achievementAuditApi } from '@/apis/quality/achievement-audit'
import { achievementDetailApi } from '@/apis/quality/achievement-detail'
import { achievementManualReviewApi } from '@/apis/quality/achievement-manual-review'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import { courseGoalApi } from '@/apis/quality/course-goal'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import { indirectItemApi } from '@/apis/quality/indirect-item'
import { requirementIndicatorApi } from '@/apis/quality/requirement-indicator'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_COLOR,
  AchievementAuditStatusCode,
  AchievementAuditStatusDescription,
  AchievementDetailTypeDescription,
  AchievementStatusDescription,
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
  ManualReviewDecisionCode,
  ManualReviewDecisionDescription,
} from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { formatSemester } from '@/types/enums/semester-enum'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

const detailColumns: ColumnsType = [
  { title: '明细类型', dataIndex: 'detailType', key: 'detailType', width: 140 },
  { title: '对象', dataIndex: 'referenceName', key: 'referenceName' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 90 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 90 },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  { title: '达成值', dataIndex: 'achievementValue', key: 'achievementValue', width: 100 },
  { title: '样本', dataIndex: 'sampleValid', key: 'sampleValid', width: 110 },
]

const route = useRoute()
const router = useRouter()

/** 全局 scope 切换时返回列表，避免详情与当前培养方案/课程错位 */
useQualityScopedLoader(
  () => {
    void router.push({ name: 'QualityAchievement' })
  },
  { watchScope: true, immediate: false, reloadOnActivated: false },
)

const resultId = computed(() => String(route.params.resultId || ''))

const result = ref<AchievementResultVO | null>(null)
const courseGoalWeights = ref<{ directWeight?: number, indirectWeight?: number } | null>(null)

interface RelatedIndirectFormLink {
  id: string
  formCode: string
  formName: string
}

const relatedIndirectForms = ref<RelatedIndirectFormLink[]>([])
const relatedIndirectFormsLoading = ref(false)
const details = ref<AchievementDetailVO[]>([])
const audits = ref<AchievementAuditVO[]>([])
const reviews = ref<AchievementManualReviewVO[]>([])
const loading = ref(false)
const detailsLoading = ref(false)
const auditsLoading = ref(false)
const reviewsLoading = ref(false)
const detailPageNum = ref(1)
const detailPageSize = ref(10)
const detailTotal = ref(0)
const auditPageNum = ref(1)
const auditPageSize = ref(10)
const auditTotal = ref(0)
const reviewPageNum = ref(1)
const reviewPageSize = ref(10)
const reviewTotal = ref(0)
const reviewForm = reactive<{ decision: ManualReviewDecisionCode, reviewRemark: string }>({
  decision: ManualReviewDecisionCode.CONFIRMED,
  reviewRemark: '',
})

function targetTypeLabel(value: AchievementTargetTypeCode): string {
  return strictEnumLabel(AchievementTargetTypeDescription, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatusCode): string {
  return strictEnumLabel(AchievementStatusDescription, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function achievementStatusLabelMaybe(value: AchievementStatusCode | undefined): string {
  return value ? achievementStatusLabel(value) : '-'
}

function achievementStatusColorMaybe(value: AchievementStatusCode | undefined): BadgeTone {
  return value ? achievementStatusColor(value) : 'gray'
}

function auditStatusLabel(value: AchievementAuditStatusCode): string {
  return strictEnumLabel(AchievementAuditStatusDescription, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function auditStatusLabelMaybe(value: AchievementAuditStatusCode | undefined): string {
  return value ? auditStatusLabel(value) : '-'
}

function auditStatusColorMaybe(value: AchievementAuditStatusCode | undefined): BadgeTone {
  return value ? auditStatusColor(value) : 'gray'
}

function isResultStale(value: AchievementResultVO | null): boolean {
  return value?.staleFlag === true
}

function resultValidityLabel(value: AchievementResultVO | null): string {
  return isResultStale(value) ? '已过期' : '有效'
}

function resultValidityColor(value: AchievementResultVO | null): BadgeTone {
  return isResultStale(value) ? 'red' : 'green'
}

function detailTypeLabel(value: AchievementDetailTypeCode): string {
  return strictEnumLabel(AchievementDetailTypeDescription, value, '达成明细类型')
}

function manualReviewDecisionLabel(value: ManualReviewDecisionCode): string {
  return strictEnumLabel(ManualReviewDecisionDescription, value, '人工复核决定')
}

function auditEventLabel(event: AchievementAuditStatusCode | undefined): string {
  if (!event) return '-'
  if (event === AchievementAuditStatusCode.CALCULATED) return '达成度计算'
  return auditStatusLabel(event)
}

const auditTransitMap: Record<AchievementAuditStatusCode, AchievementAuditStatusCode[]> = {
  [AchievementAuditStatusCode.DRAFT]: [AchievementAuditStatusCode.CALCULATED],
  [AchievementAuditStatusCode.CALCULATED]: [
    AchievementAuditStatusCode.DRAFT,
    AchievementAuditStatusCode.SUBMITTED,
  ],
  [AchievementAuditStatusCode.SUBMITTED]: [
    AchievementAuditStatusCode.CONFIRMED,
    AchievementAuditStatusCode.RETURNED,
  ],
  [AchievementAuditStatusCode.CONFIRMED]: [
    AchievementAuditStatusCode.ARCHIVED,
    AchievementAuditStatusCode.RETURNED,
  ],
  [AchievementAuditStatusCode.RETURNED]: [],
  [AchievementAuditStatusCode.ARCHIVED]: [],
}

const nextStatuses = computed<AchievementAuditStatusCode[]>(() => {
  const status = result.value?.auditStatus
  if (!status) return []
  return strictEnumValue(auditTransitMap, status, '达成审核状态')
})

const targetTypeToComputeKind: Partial<Record<AchievementTargetTypeCode, string>> = {
  [AchievementTargetTypeCode.COURSE_GOAL]: 'COURSE_GOAL',
  [AchievementTargetTypeCode.REQUIREMENT_INDICATOR]: 'REQUIREMENT',
  [AchievementTargetTypeCode.GRADUATION_REQUIREMENT]: 'REQUIREMENT',
  [AchievementTargetTypeCode.TRAINING_OBJECTIVE]: 'TRAINING_OBJECTIVE',
  [AchievementTargetTypeCode.PROGRAM_SUMMARY]: 'PROGRAM',
  [AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE]: 'CIVIC_GOAL_AGGREGATE',
  [AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE]: 'COMPLEX_ENGINEERING',
}

function canRecomputeResult(value: AchievementResultVO | null): boolean {
  if (!value) return false
  return (
    value.auditStatus === AchievementAuditStatusCode.RETURNED
    || isResultStale(value)
    || value.auditStatus === AchievementAuditStatusCode.DRAFT
    || value.auditStatus === AchievementAuditStatusCode.CALCULATED
  )
}

function canSubmitManualReview(value: AchievementResultVO | null): boolean {
  if (!value?.auditStatus) return false
  return (
    value.auditStatus === AchievementAuditStatusCode.SUBMITTED
    || value.auditStatus === AchievementAuditStatusCode.CONFIRMED
  )
}

const recomputeLoading = ref(false)

async function handleRecompute() {
  const record = result.value
  if (!record) return
  const computeKind = targetTypeToComputeKind[record.targetType]
  if (!computeKind) {
    message.warning('当前目标类型不支持在此页重算')
    return
  }
  if (!record.trainingPlanId || !record.programId) {
    message.warning('结果缺少培养方案或专业信息，无法重算')
    return
  }
  recomputeLoading.value = true
  try {
    const base = {
      programId: record.programId,
      trainingPlanId: record.trainingPlanId,
      schoolYear: record.schoolYear || undefined,
      semester: record.semester || undefined,
    }
    if (computeKind === 'COURSE_GOAL') {
      if (!record.qualityCourseId) {
        message.warning('课程目标重算缺少关联课程')
        return
      }
      await achievementApi.computeCourseGoal({
        qualityCourseId: record.qualityCourseId,
        courseGoalId: record.targetId,
        schoolYear: base.schoolYear,
        semester: base.semester,
      })
    } else if (computeKind === 'REQUIREMENT') {
      let requirementId: string | undefined
      if (record.targetType === AchievementTargetTypeCode.GRADUATION_REQUIREMENT) {
        requirementId = record.targetId
      } else if (record.targetType === AchievementTargetTypeCode.REQUIREMENT_INDICATOR) {
        requirementId = (await requirementIndicatorApi.detail(record.targetId)).requirementId
      }
      await achievementApi.computeRequirement({
        ...base,
        requirementId,
      })
    } else if (computeKind === 'TRAINING_OBJECTIVE') {
      await achievementApi.computeTrainingObjective({
        ...base,
        trainingObjectiveId: record.targetId,
      })
    } else if (computeKind === 'PROGRAM') {
      await achievementApi.computeProgram(base)
    } else if (computeKind === 'CIVIC_GOAL_AGGREGATE') {
      await achievementApi.computeCivicGoalAggregate(base)
    } else if (computeKind === 'COMPLEX_ENGINEERING') {
      await achievementApi.computeComplexEngineeringAggregate(base)
    }
    message.success('重新计算完成')
    await loadAll()
  } finally {
    recomputeLoading.value = false
  }
}

function formatAchievementDecimal(value?: number | null): string {
  return value == null ? '-' : value.toFixed(3)
}

function formatDirectIndirectWeights(
  directWeight?: number,
  indirectWeight?: number,
): string | null {
  if (directWeight == null && indirectWeight == null) return null
  const direct = directWeight == null ? '-' : String(directWeight)
  const indirect = indirectWeight == null ? '-' : String(indirectWeight)
  return `${direct} / ${indirect}`
}

function hasDirectIndirectSynthesis(value: AchievementResultVO | null): boolean {
  if (!value) return false
  return value.directValue != null || value.indirectValue != null || value.finalValue != null
}

const showDirectIndirectSynthesisPanel = computed(
  () => result.value?.targetType === AchievementTargetTypeCode.COURSE_GOAL,
)

async function loadRelatedIndirectForms(record: AchievementResultVO) {
  relatedIndirectFormsLoading.value = true
  relatedIndirectForms.value = []
  try {
    const page = await indirectItemApi.page({
      targetType: AchievementTargetTypeCode.COURSE_GOAL,
      targetId: record.targetId,
      pageNum: 1,
      pageSize: 200,
    })
    const formIds = [...new Set(page.list.map((item) => item.formId))]
    if (!formIds.length) {
      return
    }
    const forms = await Promise.all(formIds.map((id) => indirectFormApi.detail(id)))
    relatedIndirectForms.value = forms
      .filter((form) => !record.programId || form.programId === record.programId)
      .map((form) => ({
        id: form.id,
        formCode: form.formCode,
        formName: form.formName,
      }))
  } finally {
    relatedIndirectFormsLoading.value = false
  }
}

function openIndirectStatistics(formId: string) {
  void router.push({
    name: 'QualityIngestIndirectEvaluation',
    query: { formId, openStatistics: '1' },
  })
}

function openIndirectWeightedHelp(formId?: string) {
  void router.push({
    name: 'QualityHelpIndirectWeightedAttainment',
    query: {
      ...(formId ? { formId } : {}),
      from: 'achievement',
      resultId: resultId.value,
    },
  })
}

async function loadResult() {
  if (!resultId.value) return
  loading.value = true
  try {
    result.value = await achievementResultApi.detail(resultId.value)
    courseGoalWeights.value = null
    relatedIndirectForms.value = []
    if (
      result.value?.targetType === AchievementTargetTypeCode.COURSE_GOAL
      && result.value.targetId
    ) {
      const goal = await courseGoalApi.detail(result.value.targetId)
      courseGoalWeights.value = {
        directWeight: goal.directWeight,
        indirectWeight: goal.indirectWeight,
      }
      await loadRelatedIndirectForms(result.value)
    }
  } finally {
    loading.value = false
  }
}

async function loadDetails() {
  if (!resultId.value) {
    details.value = []
    detailTotal.value = 0
    return
  }
  detailsLoading.value = true
  try {
    const page = await achievementDetailApi.page({
      achievementResultId: resultId.value,
      pageNum: detailPageNum.value,
      pageSize: detailPageSize.value,
    })
    details.value = page.list
    detailTotal.value = page.total
  } finally {
    detailsLoading.value = false
  }
}

async function loadAudits() {
  if (!resultId.value) {
    audits.value = []
    auditTotal.value = 0
    return
  }
  auditsLoading.value = true
  try {
    const page = await achievementAuditApi.page({
      achievementResultId: resultId.value,
      pageNum: auditPageNum.value,
      pageSize: auditPageSize.value,
    })
    audits.value = page.list
    auditTotal.value = page.total
  } finally {
    auditsLoading.value = false
  }
}

async function loadReviews() {
  if (!resultId.value) {
    reviews.value = []
    reviewTotal.value = 0
    return
  }
  reviewsLoading.value = true
  try {
    const page = await achievementManualReviewApi.page({
      achievementResultId: resultId.value,
      pageNum: reviewPageNum.value,
      pageSize: reviewPageSize.value,
    })
    reviews.value = page.list
    reviewTotal.value = page.total
  } finally {
    reviewsLoading.value = false
  }
}

async function loadAll() {
  if (!resultId.value) return
  await Promise.all([loadResult(), loadDetails(), loadAudits(), loadReviews()])
}

function handleDetailPageChange(page: { current: number, pageSize: number }) {
  detailPageNum.value = page.current
  detailPageSize.value = page.pageSize
  void loadDetails()
}

function handleAuditPageChange(page: number, pageSize: number) {
  auditPageNum.value = page
  auditPageSize.value = pageSize
  void loadAudits()
}

function handleReviewPageChange(page: number, pageSize: number) {
  reviewPageNum.value = page
  reviewPageSize.value = pageSize
  void loadReviews()
}

async function handleTransit(to: AchievementAuditStatusCode) {
  if (!result.value) return
  const fromStatus = result.value.auditStatus
  if (!fromStatus) return
  const remark = await promptInputAsync({
    title: `${auditStatusLabel(fromStatus)} → ${auditStatusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === AchievementAuditStatusCode.RETURNED,
    okType: to === AchievementAuditStatusCode.RETURNED ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === AchievementAuditStatusCode.RETURNED && !remark) return
  await achievementResultApi.updateAuditStatus({
    id: result.value.id,
    auditStatus: to,
    auditRemark: remark || undefined,
  })
  message.success('流转成功')
  await loadAll()
}

async function submitReview() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    message.warning('当前审核状态不允许记录人工复核')
    return
  }
  if (!reviewForm.decision.trim()) {
    message.error('请选择复核决定')
    return
  }
  await achievementManualReviewApi.create({
    achievementResultId: result.value.id,
    decision: reviewForm.decision,
    reviewRemark: reviewForm.reviewRemark.trim() || undefined,
  })
  message.success('已记录人工复核')
  reviewForm.reviewRemark = ''
  await loadAll()
}

/* ========== 信号指标带 ========== */

const signals = computed<SignalMetric[]>(() => {
  const r = result.value
  if (!r) return []
  const finalValue = r.finalValue
  const threshold = r.thresholdValue
  const isBelow = threshold != null && finalValue != null && Number(finalValue) < Number(threshold)
  const weightLabel = formatDirectIndirectWeights(
    courseGoalWeights.value?.directWeight,
    courseGoalWeights.value?.indirectWeight,
  )
  const metrics: SignalMetric[] = [
    {
      key: 'final',
      label: '达成值 C',
      value: finalValue == null ? '-' : finalValue.toFixed(3),
      tone: isBelow ? 'red' : finalValue == null ? 'gray' : 'green',
    },
  ]
  if (hasDirectIndirectSynthesis(r)) {
    metrics.push(
      {
        key: 'direct',
        label: '直接 D',
        value: formatAchievementDecimal(r.directValue),
        tone: r.directValue == null ? 'gray' : 'blue',
      },
      {
        key: 'indirect',
        label: '间接 I',
        value: formatAchievementDecimal(r.indirectValue),
        tone: r.indirectValue == null ? 'gray' : 'blue',
      },
    )
    if (weightLabel) {
      metrics.push({
        key: 'weights',
        label: '权重 w',
        value: weightLabel,
        tone: 'gray',
      })
    }
  }
  metrics.push(
    {
      key: 'threshold',
      label: '阈值',
      value: threshold == null ? '-' : threshold.toFixed(3),
      tone: 'blue',
    },
    {
      key: 'sample',
      label: '有效 / 总量',
      value: `${r.sampleValid} / ${r.sampleTotal}`,
      tone: 'gray',
    },
    {
      key: 'validity',
      label: '结果有效性',
      value: resultValidityLabel(r),
      tone: isResultStale(r) ? 'red' : 'green',
    },
    {
      key: 'detail-rows',
      label: '明细行数',
      value: detailTotal.value,
      tone: 'blue',
    },
    {
      key: 'audits',
      label: '审核流水',
      value: auditTotal.value,
      tone: auditTotal.value > 0 ? 'blue' : 'gray',
    },
    {
      key: 'reviews',
      label: '复核记录',
      value: reviewTotal.value,
      tone: reviewTotal.value > 0 ? 'green' : 'gray',
    },
  )
  return metrics
})

const reviewVisible = ref(false)

function openReviewDrawer() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    message.warning('当前审核状态不允许记录人工复核')
    return
  }
  reviewVisible.value = true
}

async function submitReviewAndClose() {
  await submitReview()
  reviewVisible.value = false
}

watch(
  resultId,
  () => {
    detailPageNum.value = 1
    auditPageNum.value = 1
    reviewPageNum.value = 1
    void loadAll()
  },
  { immediate: true },
)

onActivated(() => {
  if (resultId.value) {
    void loadAll()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar :title="result?.targetLabel || '达成度结果详情'">
        <template #status>
          <UiButton variant="outline" size="sm" @click="router.back()">返回</UiButton>
          <UiTag v-if="result" :tone="auditStatusColor(result.auditStatus)" size="sm">
            {{ auditStatusLabel(result.auditStatus) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="result && canRecomputeResult(result)"
            variant="primary"
            size="sm"
            :loading="recomputeLoading"
            @click="handleRecompute"
          >
            重新计算
          </UiButton>
          <UiButton
            v-if="result && canSubmitManualReview(result)"
            variant="outline"
            size="sm"
            @click="openReviewDrawer"
          >
            人工复核
          </UiButton>
          <UiButton
            v-for="to in nextStatuses"
            :key="to"
            :variant="to === AchievementAuditStatusCode.RETURNED ? 'ghost' : 'primary'"
            :status="to === AchievementAuditStatusCode.RETURNED ? 'danger' : 'normal'"
            size="sm"
            @click="handleTransit(to)"
          >
            -> {{ auditStatusLabel(to) }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!result && !loading"
      description="当前没有可展示的内容"
      class="achievement-detail__empty"
    />

    <template v-else-if="result">
      <SignalBand :metrics="signals" compact class="achievement-detail__signals" />

      <UiCard v-if="showDirectIndirectSynthesisPanel" class="achievement-detail__synthesis-card">
        <template #title>直间接合成</template>
        <template #extra>
          <UiButton
            variant="ghost"
            size="sm"
            @click="openIndirectWeightedHelp(relatedIndirectForms[0]?.id)"
          >
            题项加权说明
          </UiButton>
        </template>
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="直接 D">
            {{ formatAchievementDecimal(result.directValue) }}
          </a-descriptions-item>
          <a-descriptions-item label="间接 I">
            {{ formatAchievementDecimal(result.indirectValue) }}
          </a-descriptions-item>
          <a-descriptions-item label="权重 w">
            {{
              formatDirectIndirectWeights(
                courseGoalWeights?.directWeight,
                courseGoalWeights?.indirectWeight,
              ) || '-'
            }}
          </a-descriptions-item>
          <a-descriptions-item label="综合 C">
            {{ formatAchievementDecimal(result.finalValue) }}
            <UiTag v-if="isResultStale(result)" tone="red" size="sm">已过期</UiTag>
          </a-descriptions-item>
        </a-descriptions>
        <div class="achievement-detail__synthesis-links">
          <p class="achievement-detail__synthesis-links-title">关联间接问卷</p>
          <UiEmpty
            v-if="!relatedIndirectFormsLoading && !relatedIndirectForms.length"
            size="sm"
            description="暂无含本课程目标的间接评价问卷"
          />
          <ul v-else class="achievement-detail__synthesis-form-list">
            <li
              v-for="form in relatedIndirectForms"
              :key="form.id"
              class="achievement-detail__synthesis-form-row"
            >
              <span>{{ form.formName }}（{{ form.formCode }}）</span>
              <UiButton variant="outline" size="sm" @click="openIndirectStatistics(form.id)">
                查看问卷统计
              </UiButton>
            </li>
          </ul>
        </div>
      </UiCard>

      <UiCard class="achievement-detail__meta-card">
        <template #title>结果元数据</template>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="目标类型">
            {{ targetTypeLabel(result.targetType) }}
          </a-descriptions-item>
          <a-descriptions-item label="目标对象">
            {{ result.targetLabel }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.programId" label="所属专业">
            {{ result.programName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.trainingPlanId" label="培养方案">
            {{ result.trainingPlanCode }} {{ result.trainingPlanName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.qualityCourseId" label="关联课程">
            {{ result.qualityCourseCode }} {{ result.qualityCourseName }}
          </a-descriptions-item>
          <a-descriptions-item label="学年 / 学期">
            {{ result.schoolYear
            }}<span v-if="result.semester"> / {{ formatSemester(result.semester) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="达成结论">
            <UiTag :tone="achievementStatusColorMaybe(result.achievementStatus)" size="sm">
              {{ achievementStatusLabelMaybe(result.achievementStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="计算时间">
            {{ result.calculatedTime }}
          </a-descriptions-item>
          <a-descriptions-item label="审核状态">
            <UiTag :tone="auditStatusColor(result.auditStatus)" size="sm">
              {{ auditStatusLabel(result.auditStatus) }}
            </UiTag>
          </a-descriptions-item>
        </a-descriptions>
      </UiCard>

      <UiCard class="achievement-detail__panel">
        <template #title>结果有效性</template>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="有效性状态">
            <UiTag :tone="resultValidityColor(result)" size="sm">
              {{ resultValidityLabel(result) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ result.staleTime || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="过期原因">
            {{ result.staleReason || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="来源类型">
            {{ result.staleSourceType || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="来源 ID">
            {{ result.staleSourceId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="说明">
            {{
              isResultStale(result)
                ? '当前结果已过期，需按最新成绩或配置重新计算'
                : '当前结果与最新成绩、配置保持一致'
            }}
          </a-descriptions-item>
        </a-descriptions>
      </UiCard>

      <div class="achievement-detail__layout">
        <UiCard class="achievement-detail__detail-card">
          <template #title>计算明细</template>
          <UiEmpty
            v-if="!details.length && !detailsLoading"
            description="当前没有可展示的内容"
            size="sm"
          />
          <UiDataTable
            pagination-mode="server"
            v-else
            v-model:current="detailPageNum"
            v-model:page-size="detailPageSize"
            :columns="detailColumns"
            :data-source="details"
            row-key="id"
            size="small"
            :loading="detailsLoading"
            flat
            :total="detailTotal"
            @page-change="handleDetailPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'detailType'">
                {{ detailTypeLabel(record.detailType) }}
              </template>
              <template v-else-if="column.key === 'referenceName'">
                <span v-if="record.referenceCode" class="achievement-detail__ref-code">
                  {{ record.referenceCode }}
                </span>
                {{ record.referenceName }}
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ typeof record.weight === 'number' ? record.weight : '未配置权重' }}
              </template>
              <template v-else-if="column.key === 'fullScore'">
                {{ typeof record.fullScore === 'number' ? record.fullScore : '未配置满分' }}
              </template>
              <template v-else-if="column.key === 'averageScore'">
                {{ typeof record.averageScore === 'number' ? record.averageScore : '未生成平均分' }}
              </template>
              <template v-else-if="column.key === 'achievementValue'">
                {{
                  typeof record.achievementValue === 'number'
                    ? record.achievementValue
                    : '未生成达成值'
                }}
              </template>
              <template v-else-if="column.key === 'sampleValid'">
                <div>{{ record.sampleValid }} / {{ record.sampleTotal }}</div>
                <p v-if="record.excludedSampleReason" class="achievement-detail__evidence-gap">
                  {{ record.excludedSampleReason }}
                </p>
              </template>
            </template>
          </UiDataTable>
        </UiCard>

        <UiCard class="achievement-detail__audit-card">
          <template #title>审核责任链流水</template>
          <UiEmpty
            v-if="!audits.length && !auditsLoading"
            description="当前没有可展示的内容"
            size="sm"
          />
          <template v-else>
            <a-spin :spinning="auditsLoading">
              <a-timeline class="achievement-detail__timeline">
                <a-timeline-item
                  v-for="audit in audits"
                  :key="audit.id"
                  :color="auditStatusColorMaybe(audit.auditStatusTo) === 'red' ? 'red' : 'blue'"
                >
                  <p class="achievement-detail__audit-line">
                    <UiTag tone="gray" size="sm">{{ auditEventLabel(audit.auditEvent) }}</UiTag>
                    <strong v-if="audit.auditStatusFrom">
                      {{ auditStatusLabelMaybe(audit.auditStatusFrom) }}
                    </strong>
                    <span v-if="audit.auditStatusFrom && audit.auditStatusTo"> -> </span>
                    <strong v-if="audit.auditStatusTo">
                      {{ auditStatusLabelMaybe(audit.auditStatusTo) }}
                    </strong>
                  </p>
                  <p class="achievement-detail__audit-meta">
                    {{ audit.auditorNickName }} · {{ audit.auditedTime }}
                  </p>
                  <p v-if="audit.auditOpinion" class="achievement-detail__audit-opinion">
                    意见：{{ audit.auditOpinion }}
                  </p>
                  <p v-if="audit.returnReason" class="achievement-detail__audit-return">
                    退回原因：{{ audit.returnReason }}
                  </p>
                </a-timeline-item>
              </a-timeline>
            </a-spin>
            <a-pagination
              v-if="auditTotal > auditPageSize"
              class="achievement-detail__pager"
              size="small"
              :current="auditPageNum"
              :page-size="auditPageSize"
              :total="auditTotal"
              show-size-changer
              @change="handleAuditPageChange"
            />
          </template>
        </UiCard>
      </div>

      <UiCard class="achievement-detail__review-card">
        <template #title>人工复核记录</template>
        <UiEmpty
          v-if="!reviews.length && !reviewsLoading"
          description="当前没有可展示的内容"
          size="sm"
        />
        <template v-else>
          <a-spin :spinning="reviewsLoading">
            <a-list :data-source="reviews" item-layout="horizontal">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="`${manualReviewDecisionLabel(item.decision)} · ${item.reviewerNickName}`"
                    :description="item.reviewRemark"
                  />
                  <template #actions>
                    <span class="achievement-detail__review-time">{{ item.reviewedTime }}</span>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-spin>
          <a-pagination
            v-if="reviewTotal > reviewPageSize"
            class="achievement-detail__pager"
            size="small"
            :current="reviewPageNum"
            :page-size="reviewPageSize"
            :total="reviewTotal"
            show-size-changer
            @change="handleReviewPageChange"
          />
        </template>
      </UiCard>
    </template>

    <UiDrawer
      v-model:open="reviewVisible"
      title="人工复核"
      :width="560"
      :hide-footer="false"
      ok-text="提交复核"
      @ok="submitReviewAndClose"
    >
      <a-form layout="vertical" :model="reviewForm">
        <a-form-item label="复核决定" required>
          <a-radio-group v-model:value="reviewForm.decision">
            <a-radio value="CONFIRMED"> 确认 </a-radio>
            <a-radio value="RETURNED"> 退回 </a-radio>
            <a-radio value="ARCHIVED"> 归档 </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="复核备注">
          <a-textarea v-model:value="reviewForm.reviewRemark" :rows="4" placeholder="复核备注" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.achievement-detail {
  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__synthesis-card {
    margin-bottom: 16px;
  }

  &__synthesis-links {
    margin-top: 16px;
  }

  &__synthesis-links-title {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: var(--dp-font-weight-title);
    color: var(--dp-text-primary);
  }

  &__synthesis-form-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__synthesis-form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--dp-border-subtle);
    font-size: 14px;
    color: var(--dp-text-secondary);

    &:first-child {
      border-top: none;
      padding-top: 0;
    }
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  &__ref-code {
    color: var(--dp-text-muted);
    font-size: 12px;
    margin-right: 4px;
  }

  &__evidence-gap {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dp-warning);
    line-height: 1.4;
  }

  &__timeline {
    margin-top: 4px;
  }

  &__audit-line {
    margin: 0 0 4px;
    color: var(--dp-text-primary);
  }

  &__audit-meta {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__audit-opinion {
    margin: 4px 0 0;
    color: var(--dp-text-secondary);
  }

  &__audit-return {
    margin: 4px 0 0;
    color: var(--ant-color-error);
  }

  &__review-time {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__pager {
    margin-top: 12px;
    text-align: right;
  }
}

@media (max-width: #{bp.$shell-tablet-max - 1px}) {
  .achievement-detail__layout {
    grid-template-columns: 1fr;
  }
}
</style>
