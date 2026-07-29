<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementAuditVO } from '@/apis/quality/achievement-audit'
import type { AchievementDetailVO } from '@/apis/quality/achievement-detail'
import type { AchievementManualReviewVO } from '@/apis/quality/achievement-manual-review'
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import type { AchievementDetailTypeCode, AchievementStaleSourceTypeCode,
  AchievementStatusCode} from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type {
  AchievementAuditEventCode} from '@/types/enums/achievement-audit-event-enum';
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
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
  AchievementStaleSourceTypeDescription,
  AchievementStatusDescription,
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
  ManualReviewDecisionCode,
  ManualReviewDecisionDescription,
} from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiPagination from '@/components/ui-guide/ui/Pagination.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTimeline from '@/components/ui-guide/ui/UiTimeline.vue'
import UiTimelineItem from '@/components/ui-guide/ui/UiTimelineItem.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import {
  AchievementAuditEventDescription,
} from '@/types/enums/achievement-audit-event-enum'
import { AchievementComputeKindCode } from '@/types/enums/achievement-compute-kind-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
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
const relatedIndirectFormsLoadFailed = ref(false)
const details = ref<AchievementDetailVO[]>([])
const audits = ref<AchievementAuditVO[]>([])
const reviews = ref<AchievementManualReviewVO[]>([])
const loading = ref(false)
const resultLoadFailed = ref(false)
const detailsLoading = ref(false)
const detailsLoadFailed = ref(false)
const auditsLoading = ref(false)
const auditsLoadFailed = ref(false)
const reviewsLoading = ref(false)
const reviewsLoadFailed = ref(false)

/** 详情页请求代际：resultId + generation，旧响应不得落地 */
interface ResultLoadToken {
  resultId: string
  generation: number
}

const resultLoadGeneration = ref(0)
const detailLifecyclePrimed = ref(false)
const detailsRequestSeq = ref(0)
const auditsRequestSeq = ref(0)
const reviewsRequestSeq = ref(0)

function beginResultLoad(id: string): ResultLoadToken {
  resultLoadGeneration.value += 1
  return { resultId: id, generation: resultLoadGeneration.value }
}

function isResultLoadCurrent(token: ResultLoadToken): boolean {
  return token.resultId === resultId.value && token.generation === resultLoadGeneration.value
}

function resetSectionsForResultIdentityChange(): void {
  result.value = null
  courseGoalWeights.value = null
  relatedIndirectForms.value = []
  relatedIndirectFormsLoadFailed.value = false
  details.value = []
  audits.value = []
  reviews.value = []
  detailTotal.value = 0
  auditTotal.value = 0
  reviewTotal.value = 0
  resultLoadFailed.value = false
  detailsLoadFailed.value = false
  auditsLoadFailed.value = false
  reviewsLoadFailed.value = false
}
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

function staleSourceTypeLabel(value: AchievementStaleSourceTypeCode | undefined): string {
  return value
    ? strictEnumLabel(AchievementStaleSourceTypeDescription, value, '达成度过期来源类型')
    : '-'
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

function auditEventLabel(event: AchievementAuditEventCode | undefined): string {
  return event ? strictEnumLabel(AchievementAuditEventDescription, event, '审核事件') : '-'
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
  if (isResultStale(result.value)) return []
  const status = result.value?.auditStatus
  if (!status) return []
  return strictEnumValue(auditTransitMap, status, '达成审核状态')
})

/** ContextBar 动作：1 主 + ≤1 次 + 更多，避免流转按钮墙 */
interface AchievementToolbarAction {
  key: string
  label: string
  kind: 'recompute' | 'review' | 'transit'
  to?: AchievementAuditStatusCode
  danger?: boolean
}

const achievementToolbarActions = computed((): AchievementToolbarAction[] => {
  const list: AchievementToolbarAction[] = []
  for (const to of nextStatuses.value) {
    list.push({
      key: `transit-${to}`,
      label: `-> ${auditStatusLabel(to)}`,
      kind: 'transit',
      to,
      danger: to === AchievementAuditStatusCode.RETURNED,
    })
  }
  if (result.value && canRecomputeResult(result.value)) {
    list.push({ key: 'recompute', label: '重新计算', kind: 'recompute' })
  }
  if (result.value && canSubmitManualReview(result.value)) {
    list.push({ key: 'review', label: '人工复核', kind: 'review' })
  }
  return list
})

const achievementPrimaryAction = computed((): AchievementToolbarAction | null => {
  const actions = achievementToolbarActions.value
  return (
    actions.find((item) => item.kind === 'transit' && !item.danger)
    || actions.find((item) => item.kind === 'transit')
    || actions.find((item) => item.kind === 'recompute')
    || actions.find((item) => item.kind === 'review')
    || null
  )
})

const achievementSecondaryAction = computed((): AchievementToolbarAction | null => {
  const primary = achievementPrimaryAction.value
  const rest = achievementToolbarActions.value.filter((item) => item.key !== primary?.key)
  return rest.find((item) => !item.danger) || rest[0] || null
})

const achievementMoreActionItems = computed(() => {
  const primary = achievementPrimaryAction.value
  const secondary = achievementSecondaryAction.value
  return achievementToolbarActions.value
    .filter((item) => item.key !== primary?.key && item.key !== secondary?.key)
    .map((item) => ({
      key: item.key,
      label: item.label,
      danger: Boolean(item.danger),
    }))
})

function runAchievementToolbarAction(action: AchievementToolbarAction | null | undefined): void {
  if (!action) return
  if (action.kind === 'recompute') {
    void handleRecompute()
    return
  }
  if (action.kind === 'review') {
    openReviewDrawer()
    return
  }
  if (action.kind === 'transit' && action.to) {
    void handleTransit(action.to)
  }
}

function onAchievementMoreAction(key: string): void {
  const action = achievementToolbarActions.value.find((item) => item.key === key)
  runAchievementToolbarAction(action)
}

const targetTypeToComputeKind: Partial<Record<AchievementTargetTypeCode, AchievementComputeKindCode>> = {
  [AchievementTargetTypeCode.COURSE_GOAL]: AchievementComputeKindCode.COURSE_GOAL,
  [AchievementTargetTypeCode.REQUIREMENT_INDICATOR]: AchievementComputeKindCode.REQUIREMENT,
  [AchievementTargetTypeCode.GRADUATION_REQUIREMENT]: AchievementComputeKindCode.REQUIREMENT,
  [AchievementTargetTypeCode.TRAINING_OBJECTIVE]: AchievementComputeKindCode.TRAINING_OBJECTIVE,
  [AchievementTargetTypeCode.PROGRAM_SUMMARY]: AchievementComputeKindCode.PROGRAM,
  [AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE]: AchievementComputeKindCode.CIVIC_GOAL_AGGREGATE,
  [AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE]: AchievementComputeKindCode.COMPLEX_ENGINEERING,
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
  if (!value?.auditStatus || isResultStale(value)) return false
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
    void message.warning('当前目标类型不支持在此页重算')
    return
  }
  if (!record.trainingPlanId || !record.programId) {
    void message.warning('结果缺少培养方案或专业信息，无法重算')
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
    if (computeKind === AchievementComputeKindCode.COURSE_GOAL) {
      if (!record.qualityCourseId) {
        void message.warning('课程目标重算缺少关联课程')
        return
      }
      await achievementApi.computeCourseGoal({
        qualityCourseId: record.qualityCourseId,
        courseGoalId: record.targetId,
        schoolYear: base.schoolYear,
        semester: base.semester,
      })
    } else if (computeKind === AchievementComputeKindCode.REQUIREMENT) {
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
    } else if (computeKind === AchievementComputeKindCode.TRAINING_OBJECTIVE) {
      await achievementApi.computeTrainingObjective({
        ...base,
        trainingObjectiveId: record.targetId,
      })
    } else if (computeKind === AchievementComputeKindCode.PROGRAM) {
      await achievementApi.computeProgram(base)
    } else if (computeKind === AchievementComputeKindCode.CIVIC_GOAL_AGGREGATE) {
      await achievementApi.computeCivicGoalAggregate(base)
    } else if (computeKind === AchievementComputeKindCode.COMPLEX_ENGINEERING) {
      await achievementApi.computeComplexEngineeringAggregate(base)
    }
    void message.success('重新计算完成')
    await loadAll()
  } finally {
    recomputeLoading.value = false
  }
}

function formatAchievementDecimal(value?: number | null): string {
  return value == null ? '-' : value.toFixed(6)
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

async function loadRelatedIndirectForms(record: AchievementResultVO, token: ResultLoadToken) {
  relatedIndirectFormsLoading.value = true
  try {
    const page = await indirectItemApi.page({
      targetType: AchievementTargetTypeCode.COURSE_GOAL,
      targetId: record.targetId,
      pageNum: 1,
      pageSize: 200,
    })
    if (!isResultLoadCurrent(token)) {
      return
    }
    const formIds = [...new Set(page.list.map((item) => item.formId))]
    if (!formIds.length) {
      relatedIndirectForms.value = []
      relatedIndirectFormsLoadFailed.value = false
      return
    }
    const settled = await Promise.allSettled(formIds.map((id) => indirectFormApi.detail(id)))
    if (!isResultLoadCurrent(token)) {
      return
    }
    const forms = []
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        forms.push(item.value)
      }
    }
    if (settled.some((item) => item.status === 'rejected')) {
      showUserError(null, '部分间接评价表单详情加载失败')
    }
    relatedIndirectForms.value = forms
      .filter((form) => !record.programId || form.programId === record.programId)
      .map((form) => ({
        id: form.id,
        formCode: form.formCode,
        formName: form.formName,
      }))
    relatedIndirectFormsLoadFailed.value = false
  } catch (error) {
    if (!isResultLoadCurrent(token)) {
      return
    }
    relatedIndirectFormsLoadFailed.value = true
    showUserError(error, '关联间接评价表单加载失败')
  } finally {
    if (isResultLoadCurrent(token)) {
      relatedIndirectFormsLoading.value = false
    }
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

async function loadResult(token: ResultLoadToken) {
  loading.value = true
  try {
    const next = await achievementResultApi.detail(token.resultId)
    if (!isResultLoadCurrent(token)) {
      return
    }
    result.value = next
    resultLoadFailed.value = false
    courseGoalWeights.value = null
    relatedIndirectForms.value = []
    relatedIndirectFormsLoadFailed.value = false
    if (
      next?.targetType === AchievementTargetTypeCode.COURSE_GOAL
      && next.targetId
    ) {
      try {
        const goal = await courseGoalApi.detail(next.targetId)
        if (!isResultLoadCurrent(token)) {
          return
        }
        courseGoalWeights.value = {
          directWeight: goal.directWeight,
          indirectWeight: goal.indirectWeight,
        }
      } catch (error) {
        if (!isResultLoadCurrent(token)) {
          return
        }
        courseGoalWeights.value = null
        showUserError(error, '课程目标权重加载失败')
      }
      await loadRelatedIndirectForms(next, token)
    }
  } catch (error) {
    if (!isResultLoadCurrent(token)) {
      return
    }
    resultLoadFailed.value = true
    showUserError(error, '达成结果详情加载失败')
  } finally {
    if (isResultLoadCurrent(token)) {
      loading.value = false
    }
  }
}

async function loadDetails(token: ResultLoadToken) {
  const seq = ++detailsRequestSeq.value
  detailsLoading.value = true
  try {
    const page = await achievementDetailApi.page({
      achievementResultId: token.resultId,
      pageNum: detailPageNum.value,
      pageSize: detailPageSize.value,
    })
    if (!isResultLoadCurrent(token) || seq !== detailsRequestSeq.value) {
      return
    }
    details.value = page.list
    detailTotal.value = page.total
    detailsLoadFailed.value = false
  } catch (error) {
    if (!isResultLoadCurrent(token) || seq !== detailsRequestSeq.value) {
      return
    }
    detailsLoadFailed.value = true
    showUserError(error, '达成明细加载失败')
  } finally {
    if (isResultLoadCurrent(token) && seq === detailsRequestSeq.value) {
      detailsLoading.value = false
    }
  }
}

async function loadAudits(token: ResultLoadToken) {
  const seq = ++auditsRequestSeq.value
  auditsLoading.value = true
  try {
    const page = await achievementAuditApi.page({
      achievementResultId: token.resultId,
      pageNum: auditPageNum.value,
      pageSize: auditPageSize.value,
    })
    if (!isResultLoadCurrent(token) || seq !== auditsRequestSeq.value) {
      return
    }
    audits.value = page.list
    auditTotal.value = page.total
    auditsLoadFailed.value = false
  } catch (error) {
    if (!isResultLoadCurrent(token) || seq !== auditsRequestSeq.value) {
      return
    }
    auditsLoadFailed.value = true
    showUserError(error, '达成审核记录加载失败')
  } finally {
    if (isResultLoadCurrent(token) && seq === auditsRequestSeq.value) {
      auditsLoading.value = false
    }
  }
}

async function loadReviews(token: ResultLoadToken) {
  const seq = ++reviewsRequestSeq.value
  reviewsLoading.value = true
  try {
    const page = await achievementManualReviewApi.page({
      achievementResultId: token.resultId,
      pageNum: reviewPageNum.value,
      pageSize: reviewPageSize.value,
    })
    if (!isResultLoadCurrent(token) || seq !== reviewsRequestSeq.value) {
      return
    }
    reviews.value = page.list
    reviewTotal.value = page.total
    reviewsLoadFailed.value = false
  } catch (error) {
    if (!isResultLoadCurrent(token) || seq !== reviewsRequestSeq.value) {
      return
    }
    reviewsLoadFailed.value = true
    showUserError(error, '达成人工复核加载失败')
  } finally {
    if (isResultLoadCurrent(token) && seq === reviewsRequestSeq.value) {
      reviewsLoading.value = false
    }
  }
}

async function loadAll() {
  const id = resultId.value
  if (!id) {
    return
  }
  const token = beginResultLoad(id)
  // 主结果与附属列表隔离：任一失败不拖垮其他区块；共享同一 generation
  await loadResult(token)
  if (!isResultLoadCurrent(token)) {
    return
  }
  await Promise.all([loadDetails(token), loadAudits(token), loadReviews(token)])
}

function handleDetailPageChange(page: { current: number, pageSize: number }) {
  detailPageNum.value = page.current
  detailPageSize.value = page.pageSize
  const id = resultId.value
  if (!id) {
    return
  }
  void loadDetails({ resultId: id, generation: resultLoadGeneration.value })
}

function handleAuditPageChange(page: number, pageSize: number) {
  auditPageNum.value = page
  auditPageSize.value = pageSize
  const id = resultId.value
  if (!id) {
    return
  }
  void loadAudits({ resultId: id, generation: resultLoadGeneration.value })
}

function handleReviewPageChange(page: number, pageSize: number) {
  reviewPageNum.value = page
  reviewPageSize.value = pageSize
  const id = resultId.value
  if (!id) {
    return
  }
  void loadReviews({ resultId: id, generation: resultLoadGeneration.value })
}

async function handleTransit(to: AchievementAuditStatusCode) {
  if (!result.value) return
  if (isResultStale(result.value)) {
    void message.warning('结果已过期，请先按最新成绩或配置重新计算')
    return
  }
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
  void message.success('流转成功')
  await loadAll()
}

async function submitReview() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    void message.warning('当前审核状态不允许记录人工复核')
    return
  }
  if (!reviewForm.decision.trim()) {
    void message.error('请选择复核决定')
    return
  }
  await achievementManualReviewApi.create({
    achievementResultId: result.value.id,
    decision: reviewForm.decision,
    reviewRemark: reviewForm.reviewRemark.trim() || undefined,
  })
  void message.success('已记录人工复核')
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
      value: detailsLoadFailed.value ? '加载失败' : detailTotal.value,
      tone: detailsLoadFailed.value ? 'red' : 'blue',
    },
    {
      key: 'audits',
      label: '审核流水',
      value: auditsLoadFailed.value ? '加载失败' : auditTotal.value,
      tone: auditsLoadFailed.value ? 'red' : auditTotal.value > 0 ? 'blue' : 'gray',
    },
    {
      key: 'reviews',
      label: '复核记录',
      value: reviewsLoadFailed.value ? '加载失败' : reviewTotal.value,
      tone: reviewsLoadFailed.value ? 'red' : reviewTotal.value > 0 ? 'green' : 'gray',
    },
  )
  return applySpotlightEmphasis(metrics)
})

const reviewVisible = ref(false)

function openReviewDrawer() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    void message.warning('当前审核状态不允许记录人工复核')
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
  (id, prevId) => {
    if (id !== prevId) {
      detailPageNum.value = 1
      auditPageNum.value = 1
      reviewPageNum.value = 1
      resetSectionsForResultIdentityChange()
    }
    if (!id) {
      return
    }
    void loadAll()
  },
  { immediate: true },
)

onActivated(() => {
  if (!detailLifecyclePrimed.value) {
    detailLifecyclePrimed.value = true
    return
  }
  if (resultId.value) {
    void loadAll()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title :title="result?.targetLabel || '达成度结果详情'" :subtitle="result ? auditStatusLabel(result.auditStatus) : undefined">
        <template #status>
          <UiButton variant="outline" size="sm" @click="router.back()">返回</UiButton>
          <UiTag v-if="result" :tone="auditStatusColor(result.auditStatus)" size="sm">
            {{ auditStatusLabel(result.auditStatus) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="achievementPrimaryAction"
            size="sm"
            :variant="achievementPrimaryAction.danger ? 'ghost' : 'primary'"
            :status="achievementPrimaryAction.danger ? 'danger' : 'normal'"
            :loading="achievementPrimaryAction.kind === 'recompute' && recomputeLoading"
            @click="runAchievementToolbarAction(achievementPrimaryAction)"
          >
            {{ achievementPrimaryAction.label }}
          </UiButton>
          <UiButton
            v-if="achievementSecondaryAction"
            size="sm"
            :variant="achievementSecondaryAction.danger ? 'ghost' : 'outline'"
            :status="achievementSecondaryAction.danger ? 'danger' : 'normal'"
            :loading="achievementSecondaryAction.kind === 'recompute' && recomputeLoading"
            @click="runAchievementToolbarAction(achievementSecondaryAction)"
          >
            {{ achievementSecondaryAction.label }}
          </UiButton>
          <UiDropdownAction
            v-if="achievementMoreActionItems.length"
            trigger-style="button"
            button-text="更多"
            :items="achievementMoreActionItems"
            @select="onAchievementMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="resultLoadFailed && !result && !loading"
      size="sm"
      title="达成度结果加载失败"
      class="achievement-detail__empty"
    />

    <WorkbenchContextGateStrip
      v-else-if="!result && !loading"
      tag="缺少上下文"
      body="未找到达成度结果，请从达成度列表进入"
      cta-label="返回达成度列表"
      list-path="/quality/achievement"
      class="achievement-detail__empty"
    />

    <template v-else-if="result">
      <UiEmpty
        v-if="resultLoadFailed"
        size="sm"
        title="达成度结果刷新失败"
        class="achievement-detail__stale-banner"
      />
      <SignalBand layout="spotlight" :metrics="signals" variant="panel" compact class="achievement-detail__signals" />

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
        <UiDescriptions :column="2" size="small" bordered>
          <UiDescriptionsItem label="直接 D">
            {{ formatAchievementDecimal(result.directValue) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="间接 I">
            {{ formatAchievementDecimal(result.indirectValue) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="权重 w">
            {{
              formatDirectIndirectWeights(
                courseGoalWeights?.directWeight,
                courseGoalWeights?.indirectWeight,
              ) || '-'
            }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="综合 C">
            {{ formatAchievementDecimal(result.finalValue) }}
            <UiTag v-if="isResultStale(result)" tone="red" size="sm">已过期</UiTag>
          </UiDescriptionsItem>
        </UiDescriptions>
        <div class="achievement-detail__synthesis-links">
          <p class="achievement-detail__synthesis-links-title">关联间接问卷</p>
          <UiEmpty
            v-if="relatedIndirectFormsLoadFailed"
            size="sm"
            title="关联间接问卷加载失败"
          />
          <UiEmpty
            v-else-if="!relatedIndirectFormsLoading && !relatedIndirectForms.length"
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
        <UiDescriptions :column="3" size="small" bordered>
          <UiDescriptionsItem label="目标类型">
            {{ targetTypeLabel(result.targetType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="目标对象">
            {{ result.targetLabel }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="result.programId" label="所属专业">
            {{ result.programName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="result.trainingPlanId" label="培养方案">
            {{ result.trainingPlanCode }} {{ result.trainingPlanName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="result.qualityCourseId" label="关联课程">
            {{ result.qualityCourseCode }} {{ result.qualityCourseName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="学年 / 学期">
            {{ result.schoolYear
            }}<span v-if="result.semester"> / {{ formatSemester(result.semester) }}</span>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="达成结论">
            <UiTag :tone="achievementStatusColorMaybe(result.achievementStatus)" size="sm">
              {{ achievementStatusLabelMaybe(result.achievementStatus) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="计算时间">
            {{ result.calculatedTime }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="审核状态">
            <UiTag :tone="auditStatusColor(result.auditStatus)" size="sm">
              {{ auditStatusLabel(result.auditStatus) }}
            </UiTag>
          </UiDescriptionsItem>
        </UiDescriptions>
      </UiCard>

      <UiCard class="achievement-detail__panel">
        <template #title>结果有效性</template>
        <UiDescriptions :column="3" size="small" bordered>
          <UiDescriptionsItem label="有效性状态">
            <UiTag :tone="resultValidityColor(result)" size="sm">
              {{ resultValidityLabel(result) }}
            </UiTag>
          </UiDescriptionsItem>
          <UiDescriptionsItem label="过期时间">
            {{ result.staleTime || '-' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="过期原因">
            {{ result.staleReason || '-' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="来源类型">
            {{ staleSourceTypeLabel(result.staleSourceType) }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="来源 ID">
            {{ result.staleSourceId || '-' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="说明">
            {{
              isResultStale(result)
                ? '当前结果已过期，需按最新成绩或配置重新计算'
                : '当前结果与最新成绩、配置保持一致'
            }}
          </UiDescriptionsItem>
        </UiDescriptions>
      </UiCard>

      <div class="achievement-detail__layout">
        <UiCard class="achievement-detail__detail-card">
          <template #title>计算明细</template>
          <UiEmpty
            v-if="detailsLoadFailed"
            size="sm"
            title="计算明细加载失败"
          />
          <UiEmpty
            v-else-if="!details.length && !detailsLoading"
            size="sm"
            description="暂无计算明细，请先完成成绩录入与达成度计算"
          />
          <UiDataTable
            v-else
            pagination-mode="server"
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
            v-if="auditsLoadFailed"
            description="审核责任链加载失败"
            size="sm"
          />
          <UiEmpty
            v-else-if="!audits.length && !auditsLoading"
            description="暂无审核责任链流水"
            size="sm"
          />
          <template v-else>
            <UiSpin :spinning="auditsLoading">
              <UiTimeline class="achievement-detail__timeline">
                <UiTimelineItem
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
                </UiTimelineItem>
              </UiTimeline>
            </UiSpin>
            <UiPagination
              v-if="auditTotal > auditPageSize"
              class="achievement-detail__pager"
              size="small"
              v-model:current="auditPageNum"
              v-model:page-size="auditPageSize"
              :total="auditTotal"
              @change="handleAuditPageChange"
            />
          </template>
        </UiCard>
      </div>

      <UiCard class="achievement-detail__review-card">
        <template #title>人工复核记录</template>
        <UiEmpty
          v-if="reviewsLoadFailed"
          description="人工复核记录加载失败"
          size="sm"
        />
        <UiEmpty
          v-else-if="!reviews.length && !reviewsLoading"
          description="暂无人工复核记录"
          size="sm"
        />
        <template v-else>
          <UiSpin :spinning="reviewsLoading">
            <UiList :data-source="reviews" item-layout="horizontal">
              <template #renderItem="{ item }">
                <UiListItem>
                  <UiListItemMeta
                    :title="`${manualReviewDecisionLabel(item.decision)} · ${item.reviewerNickName}`"
                    :description="item.reviewRemark"
                  />
                  <template #actions>
                    <span class="achievement-detail__review-time">{{ item.reviewedTime }}</span>
                  </template>
                </UiListItem>
              </template>
            </UiList>
          </UiSpin>
          <UiPagination
            v-if="reviewTotal > reviewPageSize"
            class="achievement-detail__pager"
            size="small"
            v-model:current="reviewPageNum"
            v-model:page-size="reviewPageSize"
            :total="reviewTotal"
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
      <UiForm layout="vertical" :model="reviewForm">
        <UiFormItem label="复核决定" required>
          <UiRadioGroup
            v-model="reviewForm.decision"
            size="sm"
            :options="[
              { label: '确认', value: 'CONFIRMED' },
              { label: '退回', value: 'RETURNED' },
              { label: '归档', value: 'ARCHIVED' },
            ]"
          />
        </UiFormItem>
        <UiFormItem label="复核备注">
          <UiTextarea
            size="sm"
            v-model="reviewForm.reviewRemark"
            :rows="4"
            placeholder="复核备注"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;
.achievement-detail {
  &__empty {
    margin-top: var(--dp-space-component);
  }

  &__stale-banner {
    margin-bottom: var(--dp-space-component);
  }

  &__signals {
    margin-bottom: var(--dp-space-component);
  }

  &__synthesis-card {
    margin-bottom: var(--dp-space-block);
  }

  &__synthesis-links {
    margin-top: var(--dp-space-block);
  }

  &__synthesis-links-title {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
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
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) 0;
    border-top: 1px solid var(--dp-border-subtle);
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-secondary);

    &:first-child {
      border-top: none;
      padding-top: 0;
    }
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
  }

  &__ref-code {
    color: var(--dp-text-muted);
    font-size: var(--dp-font-size-xs);
    margin-right: var(--dp-space-component-xs);
  }

  &__evidence-gap {
    margin: var(--dp-space-component-xs) 0 0;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-warning);
    line-height: 1.4;
  }

  &__timeline {
    margin-top: var(--dp-space-component-xs);
  }

  &__audit-line {
    margin: 0 0 var(--dp-space-component-xs);
    color: var(--dp-text-primary);
  }

  &__audit-meta {
    margin: 0 0 var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__audit-opinion {
    margin: var(--dp-space-component-xs) 0 0;
    color: var(--dp-text-secondary);
  }

  &__audit-return {
    margin: var(--dp-space-component-xs) 0 0;
    color: var(--dp-error);
  }

  &__review-time {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__pager {
    margin-top: var(--dp-space-component);
    text-align: right;
  }
}

@media (max-width: #{bp.$shell-tablet-max - 1px}) {
  .achievement-detail__layout {
    grid-template-columns: 1fr;
  }
}
</style>
